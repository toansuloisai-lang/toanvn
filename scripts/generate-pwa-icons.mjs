// Derive platform icons from the existing app artwork; no external images.
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const source=await readFile(new URL('../public/icon.svg',import.meta.url),'utf8');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
try{
 const page=await browser.newPage();
 for(const [name,size,inset] of [['icon-maskable-512.png',512,0.1],['apple-touch-icon.png',180,0]]){
  const data=await page.evaluate(async({source,size,inset})=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
   const context=canvas.getContext('2d');context.fillStyle='#0860ff';context.fillRect(0,0,size,size);
   const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);await image.decode();
   context.drawImage(image,size*inset,size*inset,size*(1-2*inset),size*(1-2*inset));return canvas.toDataURL('image/png').split(',')[1];
  },{source,size,inset});
  await writeFile(new URL('../public/'+name,import.meta.url),Buffer.from(data,'base64'));
 }
 console.log('Generated maskable 512px and Apple 180px icons.');
}finally{await browser.close();}
