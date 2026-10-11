import nodemailer from 'nodemailer';

// Credentials stay on the server. A Gmail app password requires Google 2-step verification.
export function createGmailMailer(env=process.env){
  const address=(env.GMAIL_USER||'').trim(),password=(env.GMAIL_APP_PASSWORD||'').replace(/\s/g,''),name=(env.GMAIL_FROM_NAME||'Math Lab').trim();
  const configured=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)&&password.length===16;
  const transport=configured?nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:address,pass:password},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000,disableFileAccess:true,disableUrlAccess:true}):null;
  return {
    status:()=>({configured,sender:configured?address:''}),
    async send({email,subject,text,id,attachments=[]}){
      if(!transport)throw Object.assign(new Error('Gmail chưa được cấu hình.'),{code:'EAUTH'});
      const result=await transport.sendMail({from:{name,address},to:{address:email},subject,text,attachments,messageId:`<${id}@${address.split('@')[1]}>`,disableFileAccess:true,disableUrlAccess:true});
      if(!result.accepted?.length)throw Object.assign(new Error('Recipient rejected'),{code:'EENVELOPE'});
    }
  };
}
