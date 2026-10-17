import {createHash} from 'node:crypto';
export function compactAttachments(db,writeFile){
 let count=0,bytes=0;
 function move(item,prefix,extension){
  if(!item.base64)return;
  const content=Buffer.from(item.base64,'base64'),sha256=createHash('sha256').update(content).digest('hex');
  if(content.toString('base64')!==item.base64||(item.sha256&&item.sha256!==sha256))throw Error('Attachment integrity check failed; original snapshot must be retained.');
  const fileKey=prefix+sha256+extension;writeFile(fileKey,content);item.fileKey=fileKey;item.sha256=sha256;item.size=content.length;delete item.base64;count++;bytes+=content.length;
 }
 for(const report of Object.values(db.parentReports||{}))for(const r of report.recipients||[])if(r.pdf)move(r.pdf,'report-','.pdf');
 for(const batch of db.parentMail||[])for(const r of batch.recipients||[])if(r.pdf)move(r.pdf,'report-','.pdf');
 for(const t of db.tutorThreads||[])for(const m of t.messages||[])for(const image of m.images||[])move(image,'chat-','.jpg');
 return {count,bytes};
}
