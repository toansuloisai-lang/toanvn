// Run only while the application is stopped. The source backup is never replaced.
import {loadEnvFile} from 'node:process';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {prepareBundle,readSource} from '../database/migration.mjs';
import {compactAttachments} from '../database/compact-attachments.mjs';
try{loadEnvFile();}catch(e){if(e.code!=='ENOENT')throw e;}
if(process.env.MATH_STORAGE&&process.env.MATH_STORAGE!=='json')throw Error('This offline command is for JSON storage only.');
const file=path.resolve(process.argv[2]||process.env.MATH_DB_PATH||'private/accounts.json');
const backup=path.join(path.dirname(file),'backups','before-attachment-compaction-'+Date.now());
await prepareBundle(file,backup);
const original=await readFile(file),db=JSON.parse(original),folder=path.join(path.dirname(file),'uploads');await mkdir(folder,{recursive:true});
const result=compactAttachments(db,(key,bytes)=>writeFileSync(path.join(folder,key),bytes,{mode:0o600,flag:'w'}));
if(!(await readFile(file)).equals(original))throw Error('Source changed. Stop the server before running this command.');
const next=Buffer.from(JSON.stringify(db));await writeFile(file+'.compact.tmp',next,{mode:0o600});
await rename(file+'.compact.tmp',file);
try{await readSource(file);}catch(error){await writeFile(file,original,{mode:0o600});throw error;}
console.log(JSON.stringify({backup,...result,beforeBytes:original.length,afterBytes:next.length}));
