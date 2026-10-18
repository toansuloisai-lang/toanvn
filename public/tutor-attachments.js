export function mountAttachments(form,{changed,status,requireTextWithoutPhotos=true}){
 let photos=[],loading=false,revision=0;
 const box=document.createElement('div');box.className='tutor-attachments';
 box.innerHTML='<div class="tutor-photo-preview"></div><label class="tutor-attach-button">＋ Thêm ảnh<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label><span class="tutor-photo-hint">Tối đa 3 ảnh · JPG, PNG, WebP</span>';
 form.prepend(box);const picker=box.querySelector('input'),preview=box.querySelector('.tutor-photo-preview');
 const trigger=box.querySelector('.tutor-attach-button');trigger.tabIndex=0;trigger.setAttribute('role','button');trigger.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!picker.disabled)picker.click();}};
 const render=()=>{preview.replaceChildren();photos.forEach((p,index)=>{const item=document.createElement('div'),img=document.createElement('img'),remove=document.createElement('button');img.src='data:image/jpeg;base64,'+p.base64;img.alt='Ảnh bài toán '+(index+1);remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Xóa ảnh '+(index+1));remove.disabled=picker.disabled;remove.onclick=()=>{photos.splice(index,1);changed();render();};item.append(img,remove);preview.append(item);});const text=form.querySelector('textarea');if(text)text.required=requireTextWithoutPhotos&&!photos.length;};
 picker.onchange=async()=>{
  if(loading)return;loading=true;const current=revision;changed();status.textContent='Đang xử lý ảnh…';
  try{
   const files=[...picker.files];if(files.length+photos.length>3)throw Error('Chọn tối đa 3 ảnh.');
   const added=[];
   for(const file of files){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 12 MB trước khi nén.');
    const bitmap=await createImageBitmap(file);
    try{
     if(bitmap.width*bitmap.height>25000000)throw Error('Ảnh tối đa 25 megapixel.');
     const scale=Math.min(1,2000/bitmap.width,2500/bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
     const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
     const base64=canvas.toDataURL('image/jpeg',.85).split(',')[1];if(base64.length>5500000)throw Error('Ảnh sau khi nén vẫn quá lớn. Hãy chụp riêng phần đề bài.');added.push({base64});
    }finally{bitmap.close();}
   }
   if(current===revision){photos.push(...added);status.textContent='';render();}
  }catch(error){if(current===revision)status.textContent=error.message;}finally{loading=false;picker.value='';}
 };
 return {get images(){return photos;},get loading(){return loading;},clear(){revision++;photos=[];render();},setBusy(value){picker.disabled=value;trigger.setAttribute('aria-disabled',String(value));render();}};
}
