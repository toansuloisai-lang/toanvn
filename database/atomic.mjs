// Snapshot only the collections touched by a synchronous domain command.
export function atomic(db,keys,command){
 return function(...args){
  const before=keys.map(key=>[key,Object.hasOwn(db,key),structuredClone(db[key])]);
  try{return command(...args);}catch(error){
   for(const [key,exists,value] of before){if(exists)db[key]=value;else delete db[key];}
   throw error;
  }
 };
}
