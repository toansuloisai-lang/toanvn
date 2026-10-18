import {richMath} from './math.js';
import {mountPracticePhotoHistory} from './practice-photos.js';
export function practiceChoicesHTML(ex){
 return `<form data-practice-choice-form><fieldset><legend>Chọn một đáp án</legend>${ex.choices.map((choice,i)=>`<label class="option practice-choice"><input type="radio" name="choice" value="${i}" required> <strong>${'ABCD'[i]}.</strong> ${richMath(choice)}</label>`).join('')}</fieldset><p>Kết quả được đối chiếu với đáp án chuẩn, chưa phải điểm chính thức do giáo viên chốt.</p><button class="btn">Nộp đáp án</button><p role="status"></p></form><div data-practice-photo-history></div>`;
}
export function mountPracticeChoices(root,{request,exerciseId}){
 const form=root.querySelector('[data-practice-choice-form]');if(!form)return;
 const history=root.querySelector('[data-practice-photo-history]'),status=form.querySelector('[role=status]');
 let requestId=crypto.randomUUID(),busy=false;
 form.onchange=()=>{requestId=crypto.randomUUID();form.dataset.uploadDirty='true';};
 mountPracticePhotoHistory(history,{request,exerciseId});
 form.onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;const controls=[...form.querySelectorAll('input,button')],choiceIndex=Number(new FormData(form).get('choice'));controls.forEach(el=>el.disabled=true);status.textContent='Đang lưu đáp án…';
  try{const result=await request('/api/practice/choices/submit','POST',{exerciseId,choiceIndex,requestId});if(!form.isConnected)return;delete form.dataset.uploadDirty;status.textContent=result.correct?'Đúng đáp án. Xem giải thích bên dưới.':'Chưa đúng. Xem đáp án và giải thích bên dưới.';await mountPracticePhotoHistory(history,{request,exerciseId,first:result});}
  catch(error){status.textContent=error.message;}finally{busy=false;controls.forEach(el=>el.disabled=false);}
 };
}
