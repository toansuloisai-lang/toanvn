import {seedRender} from './seed-render.mjs';

// Supabase is imported explicitly by the migration CLI. Seed only legacy JSON.
if(process.env.MATH_STORAGE&&!['json','supabase'].includes(process.env.MATH_STORAGE))throw Error('MATH_STORAGE must be json or supabase.');
if(process.env.MATH_STORAGE==='supabase'){
  if(!process.env.SUPABASE_DB_URL)throw Error('SUPABASE_DB_URL is required. Import local data before starting Render.');
}else{
  if(!process.env.MATH_DB_PATH)throw Error('MATH_DB_PATH is required for JSON persistent storage.');
  seedRender(process.env.MATH_DB_PATH,process.env.INITIAL_ADMIN_PASSWORD);
}
const {server,accounts:store}=await import('../server.mjs');
if(!store.users().length){
  const password=process.env.INITIAL_ADMIN_PASSWORD;
  if(!password||password.length<12)throw Error('Set INITIAL_ADMIN_PASSWORD to at least 12 characters in Render Environment.');
  store.createUser({username:'quantri',name:'Quản trị hệ thống',role:'admin',password});
  console.log('Initial admin created: quantri. Password is supplied through Render Environment.');
}
server.listen(Number(process.env.PORT)||3000,process.env.HOST||'0.0.0.0',()=>console.log('Math Lab is ready.'));
process.on('SIGTERM',()=>{server.close(()=>{store.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
