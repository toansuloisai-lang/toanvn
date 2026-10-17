// One shared scheduler for all Gemini features. Never expose keys in diagnostics.
export function createGeminiPool(keys,{fetcher=(...args)=>fetch(...args),now=Date.now}={}){
 const slots=[...new Set(keys.map(k=>k.trim()).filter(Boolean))].map(key=>({key,active:0,until:0,turn:0}));let turn=0;
 return async function request(url,options={}){
  const tried=new Set();let last;
  while(tried.size<Math.min(slots.length,4)){
   options.signal?.throwIfAborted();
   const slot=slots.filter(s=>!tried.has(s)&&s.until<=now()).sort((a,b)=>a.active-b.active||a.turn-b.turn)[0];
   if(!slot)break;
   tried.add(slot);slot.active++;slot.turn=++turn;
   try{
    const headers=new Headers(options.headers);headers.set('x-goog-api-key',slot.key);
    const response=await fetcher(url,{...options,headers});
    if(response.ok)return response;
    last=response;
    if(![429,500,502,503,504,401,403].includes(response.status))return response;
    const retry=response.headers?.get('retry-after');
    const delay=retry?(Number.isFinite(Number(retry))?Number(retry)*1000:Date.parse(retry)-now()):0;
    slot.until=now()+Math.max(1000,delay||([401,403].includes(response.status)?300000:response.status===429?60000:5000));
   }catch(error){
    if(options.signal?.aborted)throw error;
    slot.until=now()+5000;
   }finally{slot.active--;}
  }
  // No waiting queue: fail promptly when every eligible key is cooling down.
  if(last)return last;
  throw Object.assign(Error('Gemini đang bận hoặc tạm hết hạn mức. Vui lòng thử lại sau.'),{status:503});
 };
}
let shared;
export function configureGemini(keys){shared=createGeminiPool(keys);}
export function geminiFetch(url,options){return shared?shared(url,options):fetch(url,options);}
