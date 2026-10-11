// Activity estimate, not surveillance: no keystrokes, URLs or screen content.
export function trackUsage({getUser,request}){
  let owner=null,tabId=crypto.randomUUID(),sequence=0,lastInput=Date.now(),busy=false;
  function interact(event){if(event.isTrusted)lastInput=Date.now();}
  for(const name of ['pointerdown','keydown','wheel','touchstart'])window.addEventListener(name,interact,{passive:true});
  async function tick(){
    const user=getUser();
    if(user?.role!=='student'){owner=null;return;}
    if(owner!==user.id){owner=user.id;tabId=crypto.randomUUID();sequence=0;lastInput=Date.now();}
    if(busy||!navigator.onLine)return;
    const active=!document.hidden&&document.hasFocus()&&Date.now()-lastInput<120000;
    busy=true;
    try{await request('/api/student/heartbeat','POST',{tabId,sequence:++sequence,active});}catch{}finally{busy=false;}
  }
  setInterval(tick,15000);
  document.addEventListener('visibilitychange',tick);
  window.addEventListener('focus',()=>{lastInput=Date.now();tick();});
  window.addEventListener('blur',tick);
  window.addEventListener('online',tick);
  return {tick};
}
