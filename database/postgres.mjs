import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';

export function connectionOptions(env=process.env){
  if(!env.SUPABASE_DB_URL)throw Error('Set SUPABASE_DB_URL to the Supabase PostgreSQL connection string.');
  let url;
  try{url=new URL(env.SUPABASE_DB_URL);}catch{throw Error('SUPABASE_DB_URL is not a valid PostgreSQL URL.');}
  if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Use the PostgreSQL connection string, not the Supabase project/API URL.');
  // pg URL SSL parameters can override the explicit verified TLS configuration.
  for(const key of [...url.searchParams.keys()])if(key.toLowerCase().startsWith('ssl'))url.searchParams.delete(key);
  return {connectionString:url.toString(),ssl:{rejectUnauthorized:true,...(env.SUPABASE_DB_CA?{ca:env.SUPABASE_DB_CA.replace(/\\n/g,'\n')}:{})},connectionTimeoutMillis:10000,query_timeout:15000,statement_timeout:12000,application_name:'math-thinking-lab'};
}

export async function connectDatabase(options=connectionOptions()){
  const client=new pg.Client(options);
  // Keep connection errors from becoming unhandled events. The worker also
  // marks its store unavailable; it never silently reconnects stale state.
  client.on('error',()=>{});
  await client.connect();
  return client;
}

export async function initializeSchema(client){
  await client.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
}

export async function loadSnapshot(client){
  const {rows}=await client.query('SELECT revision::text, payload FROM math_lab_private.state WHERE id = true');
  if(!rows.length)throw Error('Database is empty. Run npm run supabase:migrate before starting Render.');
  return rows[0];
}

export async function saveSnapshot(client,revision,payload,files=[]){
  await client.query('BEGIN');
  try{
    const result=await client.query('UPDATE math_lab_private.state SET payload=$1::jsonb, revision=revision+1, updated_at=now() WHERE id=true AND revision=$2::bigint RETURNING revision::text',[JSON.stringify(payload),revision]);
    if(result.rowCount!==1)throw Error('Another server changed the database. Restart this instance; run only one active server.');
    for(const [key,content] of files)await client.query('INSERT INTO math_lab_private.files(file_key,content) VALUES ($1,$2)',[key,Buffer.from(content)]);
    await client.query('COMMIT');
    return result.rows[0].revision;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}

export async function readAttachment(client,key){
  const {rows}=await client.query('SELECT content FROM math_lab_private.files WHERE file_key=$1',[key]);
  if(!rows.length)throw Error('Attachment is missing from the database.');
  return rows[0].content;
}

export async function verifySnapshot(client,payload,files){
  const snapshot=await loadSnapshot(client);
  if(!isDeepStrictEqual(snapshot.payload,payload))throw Error('Database verification failed: application data differs.');
  const {rows}=await client.query('SELECT file_key,content FROM math_lab_private.files');
  if(rows.length!==files.length)throw Error('Database verification failed: attachment count differs.');
  const expected=new Map(files);
  for(const row of rows)if(!expected.has(row.file_key)||!Buffer.from(expected.get(row.file_key)).equals(row.content))throw Error('Database verification failed: attachment content differs.');
}

export async function importSnapshot(client,payload,files){
  await client.query('BEGIN');
  try{
    await initializeSchema(client);
    // Serializes importers; the singleton primary key also prevents replacement.
    await client.query('LOCK TABLE math_lab_private.state, math_lab_private.files IN EXCLUSIVE MODE');
    const {rows}=await client.query('SELECT EXISTS(SELECT 1 FROM math_lab_private.state) OR EXISTS(SELECT 1 FROM math_lab_private.files) AS occupied');
    if(rows[0].occupied)throw Error('Destination already contains data. Import refused; nothing was overwritten.');
    await client.query('INSERT INTO math_lab_private.state(id,payload) VALUES(true,$1::jsonb)',[JSON.stringify(payload)]);
    for(const [key,content] of files)await client.query('INSERT INTO math_lab_private.files(file_key,content) VALUES($1,$2)',[key,Buffer.from(content)]);
    await verifySnapshot(client,payload,files);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}
