import sharp from 'sharp';
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export async function normalizeTutorImages(images=[]){
 if(!Array.isArray(images)||images.length>3)fail('Chọn tối đa 3 ảnh.');
 const result=[];
 for(const photo of images){
  if(typeof photo?.base64!=='string'||photo.base64.length>5600000)fail('Mỗi ảnh tối đa 4 MB.');
  const bytes=Buffer.from(photo.base64,'base64');
  if(!bytes.length||bytes.length>4*1024*1024||bytes.toString('base64')!==photo.base64)fail('Dữ liệu ảnh không hợp lệ.');
  try{
   const image=sharp(bytes,{limitInputPixels:25000000,animated:false}),meta=await image.metadata();
   if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)>1)throw Error();
   const normalized=await image.rotate().resize({width:2000,height:2500,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
   result.push({mimeType:'image/jpeg',base64:normalized.toString('base64')});
  }catch{fail('Ảnh phải là JPG, PNG hoặc WebP, tối đa 25 megapixel.');}
 }
 return result;
}
