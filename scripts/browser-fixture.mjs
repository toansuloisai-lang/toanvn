import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export async function createTestApp({grade=7}={}){
  const dir=await mkdtemp(path.join(os.tmpdir(),'math-browser-'));
  process.env.MATH_DB_PATH=path.join(dir,'accounts.json');
  process.env.MATH_STORAGE='json';
  process.env.GEMINI_API_KEY='test-key-never-use-for-live-api';
  const {server,accounts}=await import('../server.mjs');
  const password='Isolated-test-password-123!';
  const student=accounts.createUser({username:'student',password,name:'Nguyễn Minh',role:'student'});
  accounts.saveStudent(student,{attempts:[],reviews:{},profile:{name:'Nguyễn Minh',grade:String(grade)}});
  accounts.createUser({username:'teacher',password,name:'Giáo viên',role:'teacher',studentIds:[student.id]});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  return{base,async login(page,username='student'){const response=await page.context().request.post(base+'/api/auth/login',{data:{username,password}});if(!response.ok())throw Error('Fixture login failed');},async close(){await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}};
}
