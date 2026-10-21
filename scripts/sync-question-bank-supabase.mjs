// Synchronize shared bank assets only. Never replace account/class snapshots.
import {loadEnvFile} from 'node:process';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {connectDatabase} from '../database/postgres.mjs';
try{loadEnvFile();}catch(e){if(e.code!=='ENOENT')throw e;}
const assets=[];
for(const name of ['question-library.json','datatm-supplement-reviewed.json','datatm-screened-pending.json']){
 const text=await fs.readFile(`data/${name}`,'utf8'),payload=JSON.parse(text);
 if(!Array.isArray(payload.questions))throw Error('Invalid bank asset');
 assets.push({name,payload,sha256:createHash('sha256').update(JSON.stringify(payload)).digest('hex')});
}
let client;
try{
 client=await connectDatabase();
 if(!process.argv.includes('--apply')){console.log(JSON.stringify({mode:'dry-run',assets:assets.map(a=>({name:a.name,questions:a.payload.questions.length}))}));}
 else{
  await client.query('BEGIN');
  await client.query('CREATE TABLE IF NOT EXISTS math_lab_private.question_bank_assets (name text PRIMARY KEY, payload jsonb NOT NULL, sha256 text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  await client.query('ALTER TABLE math_lab_private.question_bank_assets ENABLE ROW LEVEL SECURITY');
  await client.query('REVOKE ALL ON math_lab_private.question_bank_assets FROM PUBLIC');
  const before=await client.query('SELECT name,payload,sha256 FROM math_lab_private.question_bank_assets');
  await fs.mkdir('private/backups',{recursive:true});
  await fs.writeFile(`private/backups/question-bank-${Date.now()}.json`,JSON.stringify(before.rows),{mode:0o600});
  for(const a of assets){
   await client.query('INSERT INTO math_lab_private.question_bank_assets(name,payload,sha256) VALUES($1,$2::jsonb,$3) ON CONFLICT(name) DO UPDATE SET payload=EXCLUDED.payload,sha256=EXCLUDED.sha256,updated_at=now()',[a.name,JSON.stringify(a.payload),a.sha256]);
   const {rows}=await client.query('SELECT payload FROM math_lab_private.question_bank_assets WHERE name=$1',[a.name]);
   const {isDeepStrictEqual}=await import('node:util');
   if(!isDeepStrictEqual(rows[0].payload,a.payload))throw Error('Bank readback mismatch');
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({synced:true,assets:assets.map(a=>({name:a.name,questions:a.payload.questions.length})),accountSnapshotUntouched:true}));
 }
}catch(e){await client?.query('ROLLBACK').catch(()=>{});console.error('Question bank sync failed: '+(e.code||e.message));process.exitCode=1;}
finally{await client?.end();}
