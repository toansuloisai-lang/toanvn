import {randomInt} from 'node:crypto';

export function accountStem(name){
  return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,52)||'taikhoan';
}
export function namedCredentials({name,role,studentName,used}){
  const stem=role==='parent'?'ph.'+accountStem(studentName||name):accountStem(name);
  let username=stem,index=2;
  while(used.has(username))username=stem+index++;
  used.add(username);
  return {username,password:username+'@'+randomInt(1000,10000)};
}
