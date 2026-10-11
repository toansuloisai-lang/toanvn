import {readFile,mkdir,writeFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeKey=key=>typeof key==='string'&&key.length>0&&key!=='.'&&key!=='..'&&!/[\\/\x00-\x1f]/.test(key);

export function validateSnapshot(db){
  if(!db||!Array.isArray(db.users)||!db.states||typeof db.states!=='object'||Array.isArray(db.states))throw Error('Invalid accounts snapshot.');
  const ids=new Set(),names=new Set();
  for(const u of db.users){
    if(!u.id||ids.has(u.id)||!u.username||names.has(u.username)||!['admin','teacher','student','parent'].includes(u.role))throw Error('Invalid or duplicate account in snapshot.');
    if(!/^[a-f0-9]{32}$/i.test(u.salt||'')||!/^[a-f0-9]{128}$/i.test(u.hash||''))throw Error('Snapshot must contain original password hashes. Use private/accounts.json, not deploy-seed/accounts.json.');
    ids.add(u.id);names.add(u.username);
  }
  for(const u of db.users){
    if(!Array.isArray(u.studentIds)||u.studentIds.some(id=>!db.users.some(s=>s.id===id&&s.role==='student')))throw Error('Broken student account link.');
    if(u.role==='student'&&(!db.states[u.id]||!Array.isArray(db.states[u.id].attempts)))throw Error('Missing student learning state.');
  }
  for(const lesson of db.uploadedLessons||[])if(!safeKey(lesson.fileKey))throw Error('Unsafe attachment filename.');
}

export function summarize(db,files){
  return {users:db.users.length,roles:Object.fromEntries(['admin','teacher','student','parent'].map(role=>[role,db.users.filter(u=>u.role===role).length])),attempts:Object.values(db.states).reduce((n,s)=>n+(s.attempts?.length||0),0),collections:Object.keys(db).sort(),attachments:files.length,attachmentBytes:files.reduce((n,[,b])=>n+b.length,0)};
}

export async function readSource(filename){
  const raw=await readFile(filename),db=JSON.parse(raw.toString('utf8'));
  validateSnapshot(db);
  const folder=path.join(path.dirname(filename),'uploads');
  const entries=await readdir(folder,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  const files=[];
  for(const entry of entries){
    if(!entry.isFile()||!safeKey(entry.name))throw Error('Uploads must contain regular files only.');
    files.push([entry.name,await readFile(path.join(folder,entry.name))]);
  }
  const byKey=new Map(files);
  for(const lesson of db.uploadedLessons||[]){
    const content=byKey.get(lesson.fileKey);
    if(!content||content.length!==lesson.size||digest(content)!==lesson.sha256)throw Error('A referenced attachment is missing or damaged. Export stopped.');
  }
  if(!(await readFile(filename)).equals(raw))throw Error('Source changed during export. Stop the local server and try again.');
  return {raw,db,files};
}

export async function prepareBundle(filename,destination){
  const source=await readSource(filename);
  // Each export is a new directory; never replace a previous backup.
  await mkdir(path.dirname(destination),{recursive:true});
  await mkdir(destination);
  await writeFile(path.join(destination,'accounts.json'),source.raw,{mode:0o600,flag:'wx'});
  await mkdir(path.join(destination,'uploads'));
  for(const [key,content] of source.files)await writeFile(path.join(destination,'uploads',key),content,{mode:0o600,flag:'wx'});
  const manifest={version:1,createdAt:new Date().toISOString(),accountsSha256:digest(source.raw),files:source.files.map(([key,b])=>({key,size:b.length,sha256:digest(b)})),summary:summarize(source.db,source.files)};
  await writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});
  return manifest;
}

export async function readBundle(folder){
  const manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
  const source=await readSource(path.join(folder,'accounts.json'));
  if(manifest.version!==1||digest(source.raw)!==manifest.accountsSha256||!Array.isArray(manifest.files)||manifest.files.length!==source.files.length)throw Error('Export manifest mismatch. Prepare a new export.');
  const expected=new Map(manifest.files.map(f=>[f.key,f]));
  if(expected.size!==source.files.length)throw Error('Duplicate attachment in manifest.');
  for(const [key,b] of source.files){const f=expected.get(key);if(!f||f.size!==b.length||f.sha256!==digest(b))throw Error('Export attachment checksum mismatch.');}
  return source;
}

export async function latestBundle(root='private'){
  const names=(await readdir(root)).filter(name=>/^supabase-export-\d/.test(name)).sort().reverse();
  for(const name of names)if((await stat(path.join(root,name,'manifest.json')).catch(()=>null))?.isFile())return path.join(root,name);
  throw Error('No export found. Run npm run supabase:prepare first.');
}
