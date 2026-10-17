import {isIP} from 'node:net';
export function clientAddress(req,trusted=(process.env.TRUSTED_PROXY_IPS||'').split(',').map(s=>s.trim()).filter(Boolean)){
 const address=req.socket.remoteAddress||'unknown';
 if(!trusted.includes(address))return address;
 // Walk from the trusted connection toward the client; never trust an
 // arbitrary leftmost address supplied by the browser.
 const chain=String(req.headers['x-forwarded-for']||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(!chain.length||chain.some(s=>!isIP(s)))return address;
 for(let i=chain.length-1;i>=0;i--)if(!trusted.includes(chain[i]))return chain[i];
 return chain[0];
}
