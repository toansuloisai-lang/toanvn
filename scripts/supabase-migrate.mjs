import {loadEnvFile} from 'node:process';
import path from 'node:path';
import {prepareBundle,readBundle,latestBundle,summarize} from '../database/migration.mjs';
import {connectDatabase,importSnapshot,verifySnapshot} from '../database/postgres.mjs';

try{loadEnvFile();}catch(error){if(error.code!=='ENOENT')throw error;}
const [action,...args]=process.argv.slice(2);
let client;
try{
  if(action==='prepare'){
    const filename=path.resolve(args[0]||process.env.MATH_DB_PATH||'private/accounts.json');
    const destination=path.resolve('private',`supabase-export-${new Date().toISOString().replace(/[:.]/g,'-')}`);
    const manifest=await prepareBundle(filename,destination);
    console.log('Private migration bundle prepared:',destination);
    console.log(JSON.stringify(manifest.summary,null,2));
    console.log('Stop writes to the source before the final export/import. Never commit this directory.');
  }else if(['import','verify'].includes(action)){
    const folder=args[0]||await latestBundle();
    const {db,files}=await readBundle(folder);
    client=await connectDatabase();
    if(action==='import')await importSnapshot(client,db,files);
    else await verifySnapshot(client,db,files);
    console.log(action==='import'?'Import committed and verified. Existing IDs, passwords and all application collections are preserved.':'Database matches this export exactly.');
    console.log(JSON.stringify(summarize(db,files),null,2));
  }else throw Error('Use prepare [accounts.json], import [export-directory], or verify [export-directory].');
}catch(error){
  // Migration validation messages are safe. Driver errors may contain secrets.
  const safe=error.code?`Database/file operation failed (${String(error.code).replace(/[^a-zA-Z0-9_]/g,'')}). Check the connection, certificate and file paths.`:error.message;
  console.error(safe);process.exitCode=1;
}finally{await client?.end().catch(()=>{});}
