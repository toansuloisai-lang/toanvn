// Source app and destination app must both be stopped before --apply.
import {loadEnvFile} from 'node:process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {prepareBundle,readBundle,readSource,summarize} from '../database/migration.mjs';
import {connectDatabase,loadSnapshot,replaceSnapshot} from '../database/postgres.mjs';
try{loadEnvFile();}catch(e){if(e.code!=='ENOENT')throw e;}
let client;
try{
 const sourceFile=path.resolve(process.env.MATH_DB_PATH||'private/accounts.json'),stamp=String(Date.now()),root=path.resolve('private/backups/supabase-sync-'+stamp);
 await mkdir(root,{recursive:true});
 await prepareBundle(sourceFile,path.join(root,'source'));
 const source=await readBundle(path.join(root,'source'));
 client=await connectDatabase();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const current=await loadSnapshot(client),files=(await client.query('SELECT file_key,content FROM math_lab_private.files')).rows;
 await client.query('COMMIT');
 const raw=path.join(root,'destination-raw');await mkdir(path.join(raw,'uploads'),{recursive:true});
 await writeFile(path.join(raw,'accounts.json'),JSON.stringify(current.payload),{mode:0o600,flag:'wx'});
 for(const {file_key,content} of files){if(path.basename(file_key)!==file_key||/[\\/\x00-\x1f]/.test(file_key))throw Error('Unsafe destination attachment name.');await writeFile(path.join(raw,'uploads',file_key),content,{mode:0o600,flag:'wx'});}
 await prepareBundle(path.join(raw,'accounts.json'),path.join(root,'destination'));
 await readBundle(path.join(root,'destination'));
 await writeFile(path.join(root,'revision.json'),JSON.stringify({revision:current.revision}),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({backup:root,destinationRevision:current.revision,source:summarize(source.db,source.files),destination:summarize(current.payload,files.map(r=>[r.file_key,r.content]))}));
 if(process.argv.includes('--apply')){
  const fresh=await readSource(sourceFile);if(!fresh.raw.equals(source.raw))throw Error('Source changed after backup. Stop the app and try again.');
  await replaceSnapshot(client,current.revision,source.db,source.files);
  console.log('SYNC_COMMITTED_AND_VERIFIED');
 }else console.log('DRY_RUN_ONLY: no database writes. Use --apply only with both apps stopped.');
}catch(error){console.error(error.code?'Database/file operation failed ('+String(error.code).replace(/[^A-Z0-9_]/gi,'')+').':error.message);process.exitCode=1;}
finally{await client?.end().catch(()=>{});}
