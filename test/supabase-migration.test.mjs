import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createStore} from '../auth-store.mjs';
import {prepareBundle,readBundle,readSource} from '../database/migration.mjs';
import {connectionOptions} from '../database/postgres.mjs';
import {pdfFixture} from '../scripts/document-fixtures.mjs';

test('migration preserves credentials, every collection and attachments; rejects modified or incomplete exports',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'math-migration-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const filename=path.join(dir,'accounts.json'),store=createStore(filename);
  const student=store.createUser({username:'student',name:'Học sinh',password:'Migration-password-123!',role:'student'});
  const teacher=store.createUser({username:'teacher',name:'Giáo viên',password:'Migration-password-123!',role:'teacher',studentIds:[student.id]});
  const upload=store.uploadLesson(teacher,{grade:7,title:'Tài liệu',filename:'bài.pdf',base64:pdfFixture().toString('base64')});
  const original=JSON.parse(await readFile(filename,'utf8'));
  original.futureCollection={preserve:['all',1,true]};
  await writeFile(filename,JSON.stringify(original));
  const bundle=path.join(dir,'export');
  await prepareBundle(filename,bundle);
  const imported=await readBundle(bundle);
  assert.deepEqual(imported.db,original);
  assert.equal(imported.files.length,1);
  assert.deepEqual(imported.files[0][1],pdfFixture());
  assert.equal(createStore(path.join(bundle,'accounts.json')).login('student','Migration-password-123!','test').user.id,student.id);
  await assert.rejects(prepareBundle(filename,bundle),{code:'EEXIST'});
  await writeFile(path.join(bundle,'accounts.json'),JSON.stringify({...original,changed:true}));
  await assert.rejects(readBundle(bundle),/manifest mismatch/);
  const key=original.uploadedLessons.find(l=>l.id===upload.lesson.id).fileKey;
  await writeFile(path.join(dir,'uploads',key),'damaged');
  await assert.rejects(readSource(filename),/missing or damaged/);
});

test('Supabase TLS stays verified even when URI contains SSL overrides',()=>{
  const options=connectionOptions({SUPABASE_DB_URL:'postgresql://postgres:fake@db.example.com:5432/postgres?sslmode=no-verify&sslcert=bad',SUPABASE_DB_CA:'line1\\nline2'});
  assert.equal(options.ssl.rejectUnauthorized,true);
  assert.equal(options.ssl.ca,'line1\nline2');
  assert.equal(new URL(options.connectionString).search,'');
  assert.throws(()=>connectionOptions({SUPABASE_DB_URL:'https://example.supabase.co'}),/PostgreSQL/);
  assert.throws(()=>connectionOptions({}),/SUPABASE_DB_URL/);
});

test('VPS PostgreSQL uses an explicit local Unix socket instead of the Supabase URI',()=>{
  const options=connectionOptions({MATH_STORAGE:'postgres',DATABASE_SOCKET_DIR:'/var/run/postgresql',SUPABASE_DB_URL:'postgresql://unused:unused@example.com/postgres'});
  assert.equal(options.host,'/var/run/postgresql');
  assert.equal(options.ssl,false);
  assert.equal(options.database,'mathlab');
  assert.equal(options.connectionString,undefined);
  for(const host of [undefined,'localhost','db.example.com'])assert.throws(()=>connectionOptions({MATH_STORAGE:'postgres',DATABASE_SOCKET_DIR:host}),/absolute Unix socket/);
});
