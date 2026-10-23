import {loadEnvFile} from 'node:process';
import path from 'node:path';
import {connectDatabase} from '../database/postgres.mjs';
import {exportDatabase,importDatabase,readTransfer,verifyTransfer} from '../database/transfer.mjs';
try{loadEnvFile();}catch(e){if(e.code!=='ENOENT')throw e;}
const [action,folder]=process.argv.slice(2);
let client;
try{
  if(!['export','import','verify'].includes(action)||!folder)throw Error('Usage: node scripts/transfer-database.mjs export|import|verify DIRECTORY');
  client=await connectDatabase();
  let result;
  if(action==='export')result=await exportDatabase(client,path.resolve(folder));
  else if(action==='import')result=await importDatabase(client,path.resolve(folder));
  else{
    const bundle=await readTransfer(path.resolve(folder));
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await verifyTransfer(client,bundle);await client.query('COMMIT');result=bundle.transfer;
  }
  console.log(JSON.stringify({action,folder:path.resolve(folder),...result},null,2));
}catch(e){
  console.error(e.code?'Database/file operation failed ('+String(e.code).replace(/[^a-z0-9_]/gi,'')+').':e.message);
  process.exitCode=1;
}finally{await client?.end().catch(()=>{});}
