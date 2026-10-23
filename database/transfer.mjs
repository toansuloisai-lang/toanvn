import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {loadSnapshot,initializeSchema,verifySnapshot} from './postgres.mjs';
import {prepareBundle,readBundle} from './migration.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const known=['files','question_bank_assets','state'];
async function tables(client){
  const {rows}=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='math_lab_private'");
  if(rows.some(r=>!known.includes(r.tablename)))throw Error('Unknown application table; extend transfer before migrating.');
  return rows.map(r=>r.tablename);
}

// A repeatable-read snapshot keeps accounts, blobs and bank assets consistent
// even for a preliminary backup while the source application is still running.
export async function exportDatabase(client,destination){
  await mkdir(destination,{mode:0o700});
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  let snapshot,files,assets,stateUpdatedAt;
  try{
    const names=await tables(client);
    snapshot=await loadSnapshot(client);
    stateUpdatedAt=(await client.query('SELECT updated_at FROM math_lab_private.state WHERE id=true')).rows[0].updated_at;
    files=(await client.query('SELECT file_key,content FROM math_lab_private.files ORDER BY file_key')).rows;
    assets=names.includes('question_bank_assets')?(await client.query('SELECT name,payload,sha256,updated_at FROM math_lab_private.question_bank_assets ORDER BY name')).rows:[];
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  const raw=path.join(destination,'raw');
  await mkdir(path.join(raw,'uploads'),{recursive:true,mode:0o700});
  await writeFile(path.join(raw,'accounts.json'),JSON.stringify(snapshot.payload),{mode:0o600,flag:'wx'});
  for(const {file_key,content} of files){
    if(!file_key||file_key==='.'||file_key==='..'||/[\\/\x00-\x1f]/.test(file_key))throw Error('Unsafe attachment key.');
    await writeFile(path.join(raw,'uploads',file_key),content,{mode:0o600,flag:'wx'});
  }
  const manifest=await prepareBundle(path.join(raw,'accounts.json'),path.join(destination,'snapshot'));
  const assetText=JSON.stringify(assets);
  await writeFile(path.join(destination,'bank-assets.json'),assetText,{mode:0o600,flag:'wx'});
  const transfer={version:1,revision:snapshot.revision,stateUpdatedAt,createdAt:new Date().toISOString(),assetsSha256:hash(assetText),summary:manifest.summary,bankAssets:assets.length};
  // Written last: incomplete exports have no transfer manifest.
  await writeFile(path.join(destination,'transfer.json'),JSON.stringify(transfer,null,2),{mode:0o600,flag:'wx'});
  return transfer;
}

export async function readTransfer(folder){
  const transfer=JSON.parse(await readFile(path.join(folder,'transfer.json'),'utf8'));
  const text=await readFile(path.join(folder,'bank-assets.json'),'utf8');
  if(transfer.version!==1||hash(text)!==transfer.assetsSha256||!/^\d+$/.test(transfer.revision))throw Error('Transfer manifest mismatch.');
  const assets=JSON.parse(text);
  if(!Array.isArray(assets)||assets.length!==transfer.bankAssets||new Set(assets.map(a=>a.name)).size!==assets.length)throw Error('Invalid bank assets.');
  return {...await readBundle(path.join(folder,'snapshot')),assets,transfer};
}

export async function verifyTransfer(client,bundle){
  await verifySnapshot(client,bundle.db,bundle.files);
  const snapshot=await loadSnapshot(client);
  if(snapshot.revision!==bundle.transfer.revision)throw Error('Database revision differs.');
  const updated=(await client.query('SELECT updated_at FROM math_lab_private.state WHERE id=true')).rows[0].updated_at;
  if(updated.toISOString()!==bundle.transfer.stateUpdatedAt)throw Error('Database timestamp differs.');
  const assets=(await client.query('SELECT name,payload,sha256,updated_at FROM math_lab_private.question_bank_assets ORDER BY name')).rows;
  if(!isDeepStrictEqual(JSON.parse(JSON.stringify(assets)),bundle.assets))throw Error('Bank asset verification failed.');
}

export async function importDatabase(client,folder){
  const bundle=await readTransfer(folder);
  await client.query('BEGIN');
  try{
    await tables(client);
    await initializeSchema(client);
    await client.query('CREATE TABLE IF NOT EXISTS math_lab_private.question_bank_assets (name text PRIMARY KEY,payload jsonb NOT NULL,sha256 text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())');
    await client.query('ALTER TABLE math_lab_private.question_bank_assets ENABLE ROW LEVEL SECURITY');
    await client.query('REVOKE ALL ON math_lab_private.question_bank_assets FROM PUBLIC');
    // Also revoke any pre-existing explicit grants on the destination tables.
    await initializeSchema(client);
    await client.query('LOCK TABLE math_lab_private.state,math_lab_private.files,math_lab_private.question_bank_assets IN EXCLUSIVE MODE');
    const {rows}=await client.query('SELECT EXISTS(SELECT 1 FROM math_lab_private.state) OR EXISTS(SELECT 1 FROM math_lab_private.files) OR EXISTS(SELECT 1 FROM math_lab_private.question_bank_assets) AS occupied');
    if(rows[0].occupied)throw Error('Destination contains data; refusing to overwrite.');
    await client.query('INSERT INTO math_lab_private.state(id,revision,payload,updated_at) VALUES(true,$1,$2::jsonb,$3)',[bundle.transfer.revision,JSON.stringify(bundle.db),bundle.transfer.stateUpdatedAt]);
    for(const [key,content] of bundle.files)await client.query('INSERT INTO math_lab_private.files(file_key,content) VALUES($1,$2)',[key,content]);
    for(const a of bundle.assets)await client.query('INSERT INTO math_lab_private.question_bank_assets(name,payload,sha256,updated_at) VALUES($1,$2::jsonb,$3,$4)',[a.name,JSON.stringify(a.payload),a.sha256,a.updated_at]);
    await verifyTransfer(client,bundle);
    await client.query('COMMIT');
    return bundle.transfer;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}
