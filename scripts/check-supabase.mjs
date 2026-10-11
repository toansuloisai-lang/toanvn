// Integration tests use a disposable local PostgreSQL cluster, never .env.
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';
import {createStore} from '../auth-store.mjs';
import {readSource,prepareBundle,readBundle} from '../database/migration.mjs';
import {connectDatabase,importSnapshot,verifySnapshot,loadSnapshot,saveSnapshot} from '../database/postgres.mjs';
import {createPostgresStorage} from '../database/storage.mjs';
import {pdfFixture,docxFixture} from './document-fixtures.mjs';

const dir=await mkdtemp(path.join(os.tmpdir(),'math-pg-test-'));
const listener=net.createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
const database=new EmbeddedPostgres({databaseDir:path.join(dir,'pg'),user:'postgres',password:'Disposable-test-only-123!',port,persistent:true,initdbFlags:['--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
const options={host:'127.0.0.1',port,user:'postgres',password:'Disposable-test-only-123!',database:'postgres',ssl:false,connectionTimeoutMillis:3000,query_timeout:5000};
let client;const storages=[];
try{
  await database.initialise();await database.start();
  client=await connectDatabase(options);
  // Supabase-like API roles must not be able to query the private tables.
  await client.query('CREATE ROLE anon; CREATE ROLE authenticated');
  const file=path.join(dir,'source','accounts.json'),local=createStore(file),password='Migration-test-password-123!';
  const student=local.createUser({username:'student',name:'Học sinh',password,role:'student'});
  const teacher=local.createUser({username:'teacher',name:'Giáo viên',password,role:'teacher',studentIds:[student.id]});
  const parent=local.createUser({username:'parent',name:'Phụ huynh',password,role:'parent',studentIds:[student.id]});
  const admin=local.createUser({username:'admin',name:'Quản trị',password,role:'admin'});
  local.importLessons(teacher);
  const pdf=local.uploadLesson(teacher,{title:'PDF',grade:7,filename:'bài.pdf',base64:pdfFixture().toString('base64')});
  const source=await readSource(file);
  // Exercise every collection plus an unknown future field without losing it.
  source.db.migrationExtension={nested:['tiếng Việt',null,42]};
  const bundle=path.join(dir,'bundle');await prepareBundle(file,bundle);
  assert.deepEqual((await readBundle(bundle)).db,JSON.parse(await readFile(file,'utf8')));
  await importSnapshot(client,source.db,source.files);
  await verifySnapshot(client,source.db,source.files);
  await assert.rejects(importSnapshot(client,source.db,source.files),/already contains data/);
  await verifySnapshot(client,source.db,source.files);
  for(const role of ['anon','authenticated']){
    await client.query(`SET ROLE ${role}`);
    await assert.rejects(client.query('SELECT payload FROM math_lab_private.state'),{code:'42501'});
    await client.query('RESET ROLE');
  }
  function open(){const storage=createPostgresStorage({...options,application_name:'math-worker-test'});storages.push(storage);return createStore(path.join(dir,'must-not-write','accounts.json'),{storage});}
  const remote=open();
  assert.equal(remote.login('student',password,'one').user.id,student.id);
  assert.deepEqual(remote.uploadedFile(student,pdf.lesson.id).content,pdfFixture());
  const word=remote.uploadLesson(teacher,{title:'Word',grade:7,filename:'bài.docx',base64:docxFixture().toString('base64')});
  remote.saveStudent(student,{attempts:[],reviews:{},profile:{name:'Tên đã sửa',grade:'7'}});
  remote.close();
  const restarted=open();
  assert.equal(restarted.workspace(student).state.profile.name,'Tên đã sửa');
  assert.deepEqual(restarted.uploadedFile(student,word.lesson.id).content,docxFixture());
  assert.deepEqual((await loadSnapshot(client)).payload.migrationExtension,source.db.migrationExtension);
  restarted.learning.updateParentEmail(admin,{userId:parent.id,email:'parent@example.com'});
  restarted.learning.usage.heartbeat(student,{tabId:'11111111-1111-1111-1111-111111111111',sequence:1,active:true});
  const noMail={status:()=>({configured:false}),send:async()=>{throw Error('This test must never send mail');}};
  const reports=restarted.learning.enableParentMail(noMail);
  const draft=reports.preview(teacher,{studentId:student.id,subject:'PostgreSQL report',message:'No real email will be sent.',includeReport:true,teacherComment:'Nhận xét kiểm thử việc lưu báo cáo trong PostgreSQL.'});
  await reports.approve(teacher,draft.id,true);
  const approved=await reports.pdf(teacher,draft.id,draft.recipients[0].id);
  const archiveReader=open(),archived=archiveReader.learning.enableParentMail(noMail);
  assert.deepEqual((await archived.pdf(teacher,draft.id,draft.recipients[0].id)).content,approved.content);archiveReader.close();
  assert.ok((await loadSnapshot(client)).payload.usage[student.id].startedAt);
  // Conflicting writers fail closed, without silently overwriting progress.
  const stale=open();
  restarted.createUser({username:'newstudent',name:'New',password,role:'student'});
  assert.throws(()=>stale.createUser({username:'lostupdate',name:'Must not save',password,role:'student'}),{status:503});
  assert.throws(()=>stale.checkHealth(),{status:503});
  assert.ok(!(await loadSnapshot(client)).payload.users.some(u=>u.username==='lostupdate'));
  const before=await loadSnapshot(client);
  // A blob collision must roll back BOTH the document and the staged files.
  await assert.rejects(saveSnapshot(client,before.revision,{...before.payload,bad:true},[[source.files[0][0],Buffer.from('collision')]]),{code:'23505'});
  assert.deepEqual(await loadSnapshot(client),before);
  await assert.rejects(saveSnapshot(client,'0',{bad:true},[['must-not-exist',Buffer.from('x')]]),/Another server/);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM math_lab_private.files WHERE file_key='must-not-exist'")).rows[0].n,0);
  await client.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name='math-worker-test'");
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.throws(()=>restarted.checkHealth(),{status:503});
  for(const storage of storages)storage.close();
  await client.query('DROP SCHEMA math_lab_private CASCADE');
  await assert.rejects(importSnapshot(client,source.db,[...source.files,...source.files]),{code:'23505'});
  // DDL and data import roll back together; a retry can import cleanly.
  await importSnapshot(client,source.db,source.files);
  await verifySnapshot(client,source.db,source.files);
  console.log('PASS: PostgreSQL import, exact round trip, protected schema, passwords, attachments, activity time, approved PDF restart, conflict detection and transaction rollback.');
  if(process.argv[2]){
    const actual=await readSource(path.resolve(process.argv[2]));
    await client.query('DROP SCHEMA math_lab_private CASCADE');
    await importSnapshot(client,actual.db,actual.files);
    await verifySnapshot(client,actual.db,actual.files);
    console.log(`PASS: supplied local snapshot copied and verified in disposable PostgreSQL (${actual.db.users.length} users, ${actual.files.length} attachments). Source unchanged.`);
  }
}finally{
  for(const storage of storages)storage.close();
  await client?.end().catch(()=>{});
  await database.stop();
  // Only remove the exact temporary cluster directory created above.
  if(path.dirname(path.resolve(dir))===path.resolve(os.tmpdir())&&path.basename(dir).startsWith('math-pg-test-'))await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:200});
}
