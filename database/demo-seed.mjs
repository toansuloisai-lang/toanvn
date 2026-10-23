import {importDatabase} from './transfer.mjs';

// Import once into an empty database. Later deploys must preserve live changes.
// The session lock serializes first-start attempts, including across containers.
export async function seedDemoDatabase(client,folder){
  await client.query("SELECT pg_advisory_lock(846203517)");
  try{
    const exists=(await client.query("SELECT to_regclass('math_lab_private.state') IS NOT NULL AS present")).rows[0].present;
    if(exists&&(await client.query('SELECT EXISTS(SELECT 1 FROM math_lab_private.state) AS present')).rows[0].present)return false;
    await importDatabase(client,folder);
    return true;
  }finally{await client.query('SELECT pg_advisory_unlock(846203517)');}
}
