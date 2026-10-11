const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const dayKey=time=>new Date(time+7*3600000).toISOString().slice(0,10);
export function createUsageService({db,persist,now=Date.now}){
  db.usage??={};
  const leases=new Map();
  function heartbeat(user,input,session=''){
    if(user.role!=='student')fail(403,'Chỉ ghi thời gian cho học sinh đang đăng nhập.');
    if(!input||!/^[a-f0-9-]{36}$/.test(input.tabId)||!Number.isSafeInteger(input.sequence)||input.sequence<0||typeof input.active!=='boolean')fail(400,'Thông tin phiên hoạt động không hợp lệ.');
    const time=now(),key=user.id+':'+session+':'+input.tabId;
    for(const [id,lease] of leases)if(time-lease.time>90000)leases.delete(id);
    const old=leases.get(key);
    if(old&&input.sequence<=old.sequence)return {ok:true};
    if(!old&&[...leases.values()].filter(l=>l.userId===user.id).length>=16)fail(429,'Có quá nhiều tab đang hoạt động.');
    const previous=db.usage[user.id];
    let usage=previous?structuredClone(previous):{startedAt:time,totalMs:0,days:{},lastCreditedAt:0};
    let changed=!previous&&input.active;
    // Only adjacent server-timed heartbeats count. Overlapping tabs/devices
    // share one timeline. Never accept a duration or timestamp from the client.
    if(old?.active&&time>=old.time&&time-old.time<=45000){
      let start=Math.max(old.time,usage.lastCreditedAt||0);
      while(start<time){
        const boundary=(Math.floor((start+7*3600000)/86400000)+1)*86400000-7*3600000;
        const end=Math.min(time,boundary),elapsed=end-start,day=dayKey(start);
        usage.days[day]=(usage.days[day]||0)+elapsed;usage.totalMs+=elapsed;start=end;
      }
      if(time>usage.lastCreditedAt){usage.lastCreditedAt=time;changed=true;}
    }
    if(changed){db.usage[user.id]=usage;try{persist();}catch(error){if(previous)db.usage[user.id]=previous;else delete db.usage[user.id];throw error;}}
    leases.set(key,{userId:user.id,time,active:input.active,sequence:input.sequence});
    return {ok:true};
  }
  return {heartbeat};
}
