import test from 'node:test';
import assert from 'node:assert/strict';
import {createGmailMailer} from '../gmail-mailer.mjs';
const env={GMAIL_TRANSPORT:'api',GMAIL_USER:'sender@gmail.com',GMAIL_CLIENT_ID:'client',GMAIL_CLIENT_SECRET:'secret',GMAIL_REFRESH_TOKEN:'refresh'};
const message={email:'parent@example.com',subject:'Báo cáo',text:'Tiến bộ học tập',id:'report-1'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status});
test('Gmail API requires OAuth credentials and never falls back to app password',()=>{
 assert.equal(createGmailMailer({...env,GMAIL_REFRESH_TOKEN:'',GMAIL_APP_PASSWORD:'abcdefghijklmnop'}).status().configured,false);
 assert.equal(createGmailMailer({...env,GMAIL_TRANSPORT:'invalid'}).status().configured,false);
});
test('Gmail API submits MIME with exact PDF bytes and caches its access token',async()=>{
 const calls=[];const pdf=Buffer.from('%PDF-1.4\nApproved report\n%%EOF');
 const mailer=createGmailMailer(env,{fetchImpl:async(url,options)=>{calls.push({url,options});return reply(url.includes('/token')?{access_token:'access',expires_in:3600}:{id:'accepted'});}});
 await mailer.send({...message,attachments:[{filename:'report.pdf',content:pdf,contentType:'application/pdf'}]});
 await mailer.send({...message,id:'report-2'});
 assert.equal(calls.length,3);
 assert.equal(new URLSearchParams(calls[0].options.body).get('refresh_token'),'refresh');
 assert.equal(calls[1].options.headers.Authorization,'Bearer access');
 assert.match(calls[1].url,/users\/sender%40gmail.com\/messages\/send$/);
 const mime=Buffer.from(JSON.parse(calls[1].options.body).raw,'base64url').toString();
 assert.match(mime,/To: parent@example.com/);assert.match(mime,/Message-ID: <report-1@gmail.com>/i);
 assert.match(mime,/application\/pdf/);assert.ok(mime.includes(pdf.toString('base64')));
 assert.ok(!mime.includes('refresh'));
});
test('Rejected token never submits email and does not expose provider secrets',async()=>{
 let count=0;const mailer=createGmailMailer(env,{fetchImpl:async()=>{count++;return reply({error:'secret'},400);}});
 await assert.rejects(mailer.send(message),e=>e.code==='EAUTH'&&!e.message.includes('secret'));assert.equal(count,1);
});
for(const status of [401,403,429,500])test(`Gmail HTTP ${status} is not retried and has correct certainty`,async()=>{
 let count=0;const mailer=createGmailMailer(env,{fetchImpl:async url=>{count++;return url.includes('/token')?reply({access_token:'access'}):reply({},status);}});
 await assert.rejects(mailer.send(message),e=>status<500?e.responseCode===status:e.responseCode===undefined);
 assert.equal(count,2);
});
test('Lost send response stays uncertain without retry',async()=>{
 let count=0;const mailer=createGmailMailer(env,{fetchImpl:async url=>{count++;if(url.includes('/token'))return reply({access_token:'access'});throw Error('Network disconnected');}});
 await assert.rejects(mailer.send(message),e=>!e.code&&!e.responseCode);assert.equal(count,2);
});
test('Expired authorization is refreshed for next message after 401',async()=>{
 let tokens=0,sends=0;const mailer=createGmailMailer(env,{fetchImpl:async url=>url.includes('/token')?(tokens++,reply({access_token:'access'})):(sends++,reply({id:'ok'},sends===1?401:200))});
 await assert.rejects(mailer.send(message));await mailer.send({...message,id:'next'});assert.equal(tokens,2);assert.equal(sends,2);
});
