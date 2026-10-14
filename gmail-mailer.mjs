import nodemailer from 'nodemailer';

import {schoolLogo} from './school-brand.mjs';
// API uses HTTPS on Render Free; SMTP remains available for local/paid hosts.
export function createGmailMailer(env=process.env,{fetchImpl=globalThis.fetch}={}){
  const address=(env.GMAIL_USER||'').trim(),password=(env.GMAIL_APP_PASSWORD||'').replace(/\s/g,''),name=(env.GMAIL_FROM_NAME||'Math Lab').trim();
  const mode=env.GMAIL_TRANSPORT||'smtp';
  const clientId=env.GMAIL_CLIENT_ID,clientSecret=env.GMAIL_CLIENT_SECRET,refreshToken=env.GMAIL_REFRESH_TOKEN;
  const configured=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)&&(mode==='api'?Boolean(clientId&&clientSecret&&refreshToken):mode==='smtp'&&password.length===16);
  const transport=configured?nodemailer.createTransport(mode==='api'?{streamTransport:true,buffer:true,newline:'windows',disableFileAccess:true,disableUrlAccess:true}:{host:'smtp.gmail.com',port:465,secure:true,auth:{user:address,pass:password},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000,disableFileAccess:true,disableUrlAccess:true}):null;
  let token='',expires=0;
  async function accessToken(){
    if(token&&Date.now()<expires)return token;
    let response;
    try{
      response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('Token rejected');
      const data=await response.json();
      if(!data.access_token)throw Error('Missing token');
      token=data.access_token;expires=Date.now()+Math.max(0,(Number(data.expires_in)||3600)-60)*1000;
      return token;
    }catch{throw Object.assign(Error('Gmail authorization unavailable; no email submitted.'),{code:'EAUTH'});}
  }
  return {
    status:()=>({configured,sender:configured?address:''}),
    async send({email,subject,text,html,id,attachments=[]}){
      if(!transport)throw Object.assign(new Error('Gmail chưa được cấu hình.'),{code:'EAUTH'});
      const authorization=mode==='api'?await accessToken():null;
      const logo=html?.includes('cid:school-logo')?schoolLogo():null;
      const result=await transport.sendMail({from:{name:html?'Trường THCS Lạc Đạo – Math Lab':name,address},to:{address:email},subject,text,html,attachments:[...attachments,...(logo?[{...logo,cid:'school-logo'}]:[])],messageId:`<${id}@${address.split('@')[1]}>`,disableFileAccess:true,disableUrlAccess:true});
      if(mode==='api'){
        // Never retry a submission: a lost response may mean Gmail accepted it.
        const response=await fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(address)}/messages/send`,{method:'POST',headers:{Authorization:`Bearer ${authorization}`,'Content-Type':'application/json'},body:JSON.stringify({raw:result.message.toString('base64url')}),signal:AbortSignal.timeout(30000)});
        if(!response.ok){
          if(response.status===401){token='';expires=0;}
          throw Object.assign(Error('Gmail API submission failed.'),response.status>=400&&response.status<500?{responseCode:response.status}:{});
        }
        const data=await response.json();
        if(!data.id)throw Error('Gmail acceptance could not be confirmed.');
      }else if(!result.accepted?.length)throw Object.assign(new Error('Recipient rejected'),{code:'EENVELOPE'});
    }
  };
}
