import {connectDatabase} from '../database/postgres.mjs';
import {seedDemoDatabase} from '../database/demo-seed.mjs';
import {fileURLToPath} from 'node:url';

if(process.env.MATH_STORAGE!=='postgres')throw Error('VPS startup requires MATH_STORAGE=postgres.');
let client;
try{
  client=await connectDatabase();
  const imported=await seedDemoDatabase(client,fileURLToPath(new URL('../deploy/demo-database/',import.meta.url)));
  console.log(imported?'Demo database imported and verified.':'Existing VPS database retained.');
}catch(error){
  console.error('VPS database initialization failed ('+(error.code||'VALIDATION_FAILED')+').');
  process.exitCode=1;
}finally{await client?.end().catch(()=>{});}
if(process.exitCode)process.exit(process.exitCode);

const {server,accounts}=await import('../server.mjs');
server.listen(Number(process.env.PORT)||3000,process.env.HOST||'0.0.0.0',()=>console.log('Math Lab is ready with VPS PostgreSQL.'));
let stopping=false;
function shutdown(){
  if(stopping)return;stopping=true;
  server.close(()=>{accounts.close();process.exit(0);});
  setTimeout(()=>process.exit(1),45000).unref();
}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
