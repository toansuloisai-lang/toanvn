import {pwaSettingsHTML} from './pwa.js';
import {mountTeacherWorkspace} from './teacher-workspace.js';
import {mountTeacherExam} from './teacher-exam.js';
import {parentNavigation,parentSidebarHTML,parentDashboardHTML,mountParentDashboard} from './parent-dashboard.js';
import {trackUsage} from './usage-tracker.js';
import {teacherNavigation,teacherDashboardHTML,mountTeacherDashboard} from './teacher-dashboard.js';
import {parentMailHTML,mountParentMail} from './parent-mail.js';
import {mountAccountMaintenance} from './account-maintenance.js';
import {learningPageHTML,mountLearning,workingHTML,diagnosisActionHTML,diagnosisHTML} from './learning-view.js';
import {bindContentEditor,customFormulasHTML} from './content-editor.js';
import {bindLessonUpload,uploadedLessonsHTML} from './lesson-upload.js';
import {normalizeGrade} from './grade-content.js';
import {learningStats} from './learning-stats.js';
import {demoLessons} from './demo-lessons.js';
import {teacherLibraryHTML,studentLessonsHTML} from './lesson-library.js';
import {auth,roleNames,canVisit,api,workspace,loginView,selectionHTML,adminHTML} from './auth-client.js';
import { exercises as baseExercises, skills as baseSkills, checkAnswer } from './data.js';
import { referenceHome, navigation, icon } from './ui.js';
import { math, formula, solutionHTML, richMath, promptHTML, attachMathPreviews } from './math.js';
import { formulaLibraryHTML, formulaLibrary, formulasForGrade } from './formula-library.js';
import { mountAtlas } from './formula-atlas.js';
let disposeAtlas = () => {};
import { exploreHTML } from './explore-view.js';
import { mountExplore } from './explore-lab.js';
let disposeExplore = () => {};

const $ = (q, root = document) => root.querySelector(q);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank = () => ({attempts:[],reviews:{},assignments:[],notes:{}});
let allExercises=[...baseExercises],allSkills=[...baseSkills];
let grade=7, exercises=allExercises.filter(e=>e.grades.includes(7)), skills=allSkills.filter(s=>s.grades.includes(7)), activeFormulas=formulasForGrade(7);
let state=blank(), saveQueue=Promise.resolve(), authReady=false, saveFailed=false, readTicket=0;
let ai = false, session = null, filter = 'all', busy = false;
const usageTracker=trackUsage({getUser:()=>authReady?auth.user:null,request:api});
function save() {
  if(auth.user?.role!=='student')return;
  const accountId=auth.user.id,payload=JSON.parse(JSON.stringify({attempts:state.attempts,reviews:state.reviews,profile:state.profile}));
  saveQueue=saveQueue.then(async()=>{if(auth.user?.id!==accountId)return false;await api('/api/student/state','PUT',payload);saveFailed=false;return true;}).catch(error=>{saveFailed=true;toast('Chưa lưu lên máy chủ: '+error.message);return false;});
  return saveQueue;
}
function toast(message) { $('#toast').textContent = message; $('#toast').classList.remove('hidden'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.add('hidden'), 4500); }
const skillName = id => id==='exercise-set'?'Bộ câu hỏi':allSkills.find(s => s.id === id)?.name || id;
const date = time => new Date(time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const summary = () => learningStats(state,exercises,skills);
const due = () => summary().due;
const mistakes = () => state.attempts.filter(a => !a.initialCorrect);
function stat(id) {return summary().bySkill[id]||{count:0,correct:0,percent:0,completed:0,total:0,label:'Chưa đủ dữ liệu'};}
function storedExercise(id){return allExercises.find(e=>e.id===id)||{id,skill:state.attempts.find(a=>a.exerciseId===id)?.skill||'',prompt:'Bài đã lưu: '+id,rule:'Nội dung bài này chưa có trong phiên bản hiện tại. Lịch sử và lời giải thích vẫn được giữ lại.'};}
function nav(page) {
  if(auth.user.role==='parent'){ $('#navigation').innerHTML=parentNavigation(); return; }
  if(auth.user.role==='teacher'){ $('#navigation').innerHTML=teacherNavigation(); return; }
  const items=[...navigation.slice(0,1),...(auth.user.role==='teacher'?[['teacher-library','Kho bài học','book']]:[]),...navigation.slice(1),...(auth.user.role==='admin'?[['admin','Tài khoản','people']]:[])].filter(([id])=>canVisit(id));
  $('#navigation').innerHTML=items.map(([id,name,symbol])=>`<a class="nav-item ${page===id?'active':''}" href="#${id}" ${page===id?'aria-current="page"':''}>${icon(symbol)}<span>${id==='learning'&&auth.user.role==='teacher'?'Bản đồ lỗi lớp':id==='home'&&auth.user.role!=='student'?'Tổng quan':name}</span></a>`).join('');
}
const intro = (eyebrow, title, text, action = '') => `<div class="intro"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${text}</p></div>${action}</div>`;
const empty = (text, icon = '✧') => `<div class="empty"><span class="empty-icon">${icon}</span>${text}</div>`;
const studentSelection = () => selectionHTML();
function metrics() { const totals=summary();return `<div class="metrics">${[[totals.discovered,'Bài đã khám phá','▧'],[totals.corrected,'Lượt lỗi đã tự sửa','↻'],[due().length,'Bài đến hẹn ôn lại','◷'],[totals.days,'Ngày có học tập','↗']].map(([n,label,icon])=>`<div class="metric"><span class="metric-icon">${icon}</span><div><strong>${n}</strong><small>${label}</small></div></div>`).join('')}</div>`; }
function skillRows() { return skills.map((s,i) => { const v=stat(s.id); return `<a href="#practice/${s.id}" class="skill-row"><span class="skill-symbol">${['±','( )','x','＝'][i%4]}</span><div class="skill-content"><div class="skill-title">${s.name}<span>${v.count ? `${v.percent}% đúng` : 'Chưa học'}</span></div><div class="track"><span style="width:${v.percent}%;background:${s.color}"></span></div></div></a>`; }).join(''); }
function home() {
  if(auth.user.role==='parent')return parentDashboardHTML();
  if(auth.user.role==='teacher')return teacherDashboardHTML();
  if(auth.user.role!=='student') return rolePage();
  return referenceHome({state:{...state,attempts:state.attempts.filter(a=>exercises.some(e=>e.id===a.exerciseId))},skills,stat,due,escape:esc,skillName,grade,exercises});
}
function practice(selected) { if(selected && skills.some(s=>s.id===selected)) filter=selected; const list=exercises.filter(e=>filter==='all'||e.skill===filter); return intro('THỬ · SAI · HIỂU · SỬA','Phòng luyện tập',`${exercises.length} bài khởi đầu · Toán lớp ${grade}. Chọn chủ đề để luyện tập.`) + `<div class="filters">${[{id:'all',name:'Tất cả chủ đề'},...skills].map(s=>`<button class="filter ${filter===s.id?'active':''}" data-filter="${s.id}">${s.name}</button>`).join('')}</div><div class="exercise-grid">${list.map(e=>`<article class="exercise-card"><span class="badge ${e.level==='Vận dụng'?'amber':''}">${e.level}</span><h3>${promptHTML(e)}</h3><p>${skillName(e.skill)} · ${state.attempts.filter(a=>a.exerciseId===e.id).length} lượt học</p><a class="btn secondary" href="#learn/${e.id}">Vào phòng thử →</a></article>`).join('')}</div>`; }
function learn(id, mode) {
  const ex=allExercises.find(e=>e.id===id); if(!ex) return empty('Không tìm thấy bài tập. <a href="#practice">Về phòng luyện tập</a>');
  const gradeNote=ex.grades.includes(grade)?'':`<p class="notice">Đang ôn bài thuộc lớp ${ex.grades.join(', ')}. Hồ sơ hiện tại: lớp ${grade}.</p>`;
  if(mode==='review' && (!state.reviews[id] || state.reviews[id].due>Date.now()) && !(session?.id===id&&session?.mode==='review')) mode='practice';
  if(!session || session.id!==id || session.routeMode!==(mode||'practice')) session={id,routeMode:mode||'practice',mode:mode||'practice',step:0,first:null,correction:'',explanation:'',message:'',feedback:null,diagnosed:false};
  if(!session.recordId){
    const pending=state.attempts.filter(a=>a.exerciseId===id&&!a.completed&&(session.routeMode==='practice'||a.mode===session.mode)).at(-1);
    if(pending)Object.assign(session,{mode:pending.mode,recordId:pending.id,first:{answer:pending.answer,correct:pending.initialCorrect},correction:pending.correction||pending.answer,explanation:pending.explanation||'',step:pending.corrected?3:pending.initialCorrect?1:2});
  }
  const s=session;
  const heading = ['Làm thử trước nhé','Cùng điều tra lời giải','Tự sửa bằng kiến thức của em','Em dạy lại cho máy','Kiểm chứng điều vừa học'][s.step];
  let content='';
  if(s.step===0) content=`<p class="muted">${s.mode==='review'?'Đây là lượt ôn lại. Thử tự làm trước khi xem bất kỳ gợi ý nào.':'Hãy tự làm bài trước. Em có thể nhập phép tính hoặc biểu thức.'}</p><form id="answer-form"><label class="field" for="answer">Đáp án của em</label><input class="input" id="answer" autocomplete="off" maxlength="100" required placeholder="Ví dụ: -4, 3x+6 hoặc 1/2"><p class="hint">Chỉ nhập kết quả; không nhập “x =”. Biểu thức dùng x, +, −, * và dấu ngoặc.</p>${workingHTML()}<button class="btn">Kiểm tra đáp án →</button></form>`;
  if(s.step===1) content=`${s.first.correct?'':diagnosisActionHTML()}<div class="feedback ${s.first.correct?'':'warn'}">${s.first.correct?'Đáp án đầu tiên của em đúng. Bây giờ thử tìm lỗi trong lời giải này.':'Đáp án đầu tiên chưa đúng. Cùng tìm hiểu quy tắc trước khi tự sửa nhé.'}</div><label class="field">Lời giải giả định của gia sư — có lỗi cần tìm</label><div class="wrong">${solutionHTML(ex.wrong)}</div><p>Quy tắc nào giúp phát hiện lỗi này?</p><div class="options">${diagnosisOptions(ex).map((r,i)=>`<button class="option" data-diagnosis="${i}">${richMath(r)}</button>`).join('')}</div>${s.message?`<div class="feedback warn" role="status">${esc(s.message)}</div>`:''}${s.diagnosed?'<button class="btn" data-next>Sang bước tự sửa →</button>':''}`;
  if(s.step===2) content=`<div class="notice">${richMath(ex.rule)}</div><form id="correction-form"><label class="field" for="revised-working">Tiếp tục sửa các bước làm</label><textarea id="revised-working" maxlength="4000">${esc(state.attempts.find(a=>a.id===s.recordId)?.revisedWorking??state.attempts.find(a=>a.id===s.recordId)?.working??'')}</textarea><label class="field" for="correction">Viết lại kết quả đúng</label><input id="correction" class="input" autocomplete="off" maxlength="100" required value="${esc(s.correction)}"><p class="hint">Em có thể thử một giá trị x để kiểm tra biểu thức, hoặc thế nghiệm vào phương trình.</p>${s.message?`<div class="feedback warn" role="status">${esc(s.message)}</div>`:''}<button class="btn">Kiểm tra cách sửa →</button></form>`;
  if(s.step===3) content=`<div class="notice">Kết quả em đã sửa: <strong>${formula(s.correction)}</strong>. Bây giờ hãy giải thích cho một bạn khác hiểu.</div><form id="explanation-form"><label class="field" for="explanation">${s.first.correct?'Vì sao lời giải của gia sư sai?':'Bài làm ban đầu của em sai ở đâu?'} Em sửa và kiểm chứng thế nào?</label><textarea id="explanation" minlength="15" maxlength="2000" required placeholder="Bước này sai vì… Quy tắc cần dùng là… Em sửa thành… Em kiểm tra bằng cách…">${esc(s.explanation)}</textarea><p class="hint">${ai?'Gemini sẽ đọc bài tập và lời giải thích khi em bấm gửi. Không nhập tên, số điện thoại hoặc thông tin riêng tư.':'Chế độ không AI: phản hồi bằng quy tắc; phần lập luận cần giáo viên xem lại.'}</p><div class="button-row"><button class="btn" ${busy?'disabled':''}>${busy?'Đang đọc lời giải thích…':ai?'Gửi Gemini phản hồi':'Nhận gợi ý theo quy tắc'}</button><button type="button" class="btn secondary" data-skip-ai>Lưu để giáo viên xem</button></div></form>${s.feedback?`<div class="feedback" role="status"><strong>${s.feedback.source==='gemini'?'Phản hồi Gemini · tham khảo':'Gợi ý theo quy tắc'}</strong><br>${richMath(s.feedback.feedback)}${s.feedback.unavailable?'<br>Gemini hiện chưa phản hồi; ứng dụng đã dùng gợi ý dự phòng.':''}</div><button class="btn" data-finish>Tiếp tục kiểm chứng →</button>`:''}`;
  if(s.first&&!s.first.correct&&s.step>=2&&s.step<=3){
    const attempt=state.attempts.find(a=>a.id===s.recordId);
    content=`<div class="feedback warn">Đáp án ban đầu chưa đúng. Em tiếp tục sửa bài này; các bước làm cũ được giữ lại.</div><p><strong>Đáp án ban đầu:</strong> ${formula(attempt.answer)}</p><div class="notice"><strong>Các bước ban đầu</strong><div>${attempt.working?solutionHTML(attempt.working):'Em chưa ghi các bước làm, nên chưa đủ căn cứ xác định bước sai.'}</div></div>${state.notes[attempt.id]?`<div class="feedback">Giáo viên: ${richMath(state.notes[attempt.id])}</div>`:''}${diagnosisActionHTML()}<div>${state.diagnoses?.[attempt.id]?diagnosisHTML(state.diagnoses[attempt.id]):'<p class="hint">Bấm phân tích để xem lỗi có dẫn chứng từ bài làm. Quy tắc bên dưới là gợi ý chung, chưa xác nhận bước sai của em.</p>'}</div>`+content;
  }
  if(s.step===4) { const next=allExercises.filter(e=>e.skill===ex.skill&&e.id!==ex.id); const transfer=next[0]; content=`<div class="feedback">Đã lưu hành trình của em. ${s.first.correct?'Lần trả lời đầu đúng.':'Em đã tự sửa đúng sau khi nhận gợi ý.'} Lập luận đang chờ giáo viên nhận xét.</div><h3>Đúng một lần chưa có nghĩa là nhớ lâu.</h3><p class="muted">Bài này được hẹn ôn vào ${date(state.reviews[ex.id].due)}. Tiếp theo, hãy thử một bài cùng kỹ năng để kiểm chứng độc lập.</p><div class="button-row">${transfer?`<a class="btn" href="#learn/${transfer.id}/transfer">Làm bài tương tự →</a>`:`<a class="btn" href="#practice">Chọn bài luyện khác</a>`}<a class="btn secondary" href="#notebook">Xem sổ tay</a></div>`; }
  return `<div class="lab-layout">${gradeNote}<a class="btn text" href="#practice">← Phòng luyện tập</a>${intro(skillName(ex.skill),heading,s.mode==='review'?'Ôn tập đến hẹn':s.mode==='transfer'?'Bài kiểm chứng cùng kỹ năng':'Một lần thử, một cơ hội để hiểu')}<div class="steps">${['Làm thử','Điều tra','Tự sửa','Giải thích','Kiểm chứng'].map((t,i)=>`<span class="step ${s.step===i?'current':''}"><b>${i+1}</b>${t}</span>`).join('')}</div><section class="card"><span class="badge">${ex.level}</span><div class="problem">${promptHTML(ex)}</div>${content}</section></div>`;
}
function persistAttemptDraft(){
  if(!session?.recordId)return;
  const attempt=state.attempts.find(a=>a.id===session.recordId);
  if(!attempt||attempt.completed)return;
  if($('#correction'))attempt.correction=session.correction=$('#correction').value;
  if($('#revised-working'))attempt.revisedWorking=$('#revised-working').value;
  if($('#explanation'))attempt.explanation=session.explanation=$('#explanation').value;
  save();
}
function diagnosisOptions(ex) { const others = skills.filter(s=>s.id!==ex.skill).slice(0,2).map(s=>exercises.find(e=>e.skill===s.id).rule); return [others[0], ex.rule, others[1]]; }
async function complete() {
  if(session.saved||session.saving) return;
  const active=session,accountId=auth.user.id;active.saving=true;
  const ex=allExercises.find(e=>e.id===session.id), now=Date.now();
  const record=state.attempts.find(a=>a.id===session.recordId);
  Object.assign(record,{corrected:true,explanation:session.explanation,feedback:session.feedback,correction:session.correction,completed:now});
  const previous=state.reviews[ex.id];
  const interval = session.mode==='review' && session.first.correct ? Math.min((previous?.interval||0)+1,2) : 0;
  state.reviews[ex.id]={due:now+[1,3,7][interval]*86400000,interval};
  const saved=await save();active.saving=false;
  if(auth.user?.id!==accountId||session!==active)return;
  if(!saved){active.feedback={source:'local',feedback:'Chưa lưu được lên máy chủ. Kiểm tra kết nối rồi bấm tiếp tục để thử lưu lại.',needsTeacher:true};render();return;}
  session.saved=true;session.step=4;render();
}
function notebook() { const ids=[...new Set(mistakes().map(a=>a.exerciseId))]; return intro('MỖI LỖI SAI LÀ MỘT DẤU MỐC','Sổ tay lỗi sai',`${ids.length} bài có lỗi đã ghi nhận · ${due().length} bài đến hẹn ôn.`)+`<section class="card"><div class="section-head"><h2>Lịch ôn của bạn</h2><span class="badge">1 → 3 → 7 ngày</span></div>${Object.keys(state.reviews).length?Object.entries(state.reviews).sort((a,b)=>a[1].due-b[1].due).map(([id,r])=>{const e=storedExercise(id);return `<div class="list-row"><div><h3>${promptHTML(e)}</h3><p>${skillName(e.skill)} · ${r.due<=Date.now()?'Đến hẹn ôn':`Ôn vào ${date(r.due)}`}</p></div><a class="btn secondary" href="#learn/${id}${r.due<=Date.now()?'/review':''}">${r.due<=Date.now()?'Ôn ngay':'Luyện thêm'} →</a></div>`;}).join(''):empty('Hoàn thành một hành trình để bắt đầu lịch ôn.')}<p class="hint">Luyện thêm trước hạn không được tính là bài kiểm tra trí nhớ sau khoảng nghỉ.</p></section><section class="card"><h2>Những điều đã học từ lỗi sai</h2>${ids.length?ids.map(id=>{const e=storedExercise(id),a=mistakes().filter(a=>a.exerciseId===id).at(-1);return `<div class="list-row"><div><span class="badge amber">${skillName(e.skill)}</span><h3 style="margin-top:12px">${promptHTML(e)}</h3><p>Đã trả lời: ${formula(a.answer)} · ${a.corrected?'Đã tự sửa':'Chưa hoàn thành sửa'}</p><p>${richMath(e.rule)}</p>${a.explanation?`<p><strong>Lời của em:</strong> ${richMath(a.explanation)}</p>`:''}${state.notes[a.id]?`<div class="feedback">Giáo viên: ${richMath(state.notes[a.id])}</div>`:''}</div><a class="btn text" href="#learn/${id}">Tiếp tục bài làm →</a></div>`;}).join(''):empty('Chưa có lỗi được ghi nhận. Cứ thử sức, không cần cố tình làm sai.','↻')}</section>`; }
function knowledge() { return intro('TOÁN LỚP '+grade,'Bản đồ kiến thức',`${skills.length} chủ đề khởi đầu cho lớp ${grade}.`)+`<div class="notice">Trạng thái được gợi ý từ lịch sử trả lời, không phải kết luận chẩn đoán. “Đang tiến bộ” cần ít nhất 3 lượt gần nhất đúng, trong đó có một lượt ôn đến hẹn.</div><div class="map">${skills.map((s,i)=>{const v=stat(s.id);return `<section class="map-node"><span class="eyebrow">BƯỚC 0${i+1}</span><h3>${s.name}</h3><span class="badge ${v.label==='Cần ôn'?'amber':v.label==='Chưa đủ dữ liệu'?'gray':''}">${v.label}</span><p>${v.count} lượt thử · ${v.correct} lượt đúng từ đầu</p><p>${s.prerequisite?'Nền tảng: '+skillName(s.prerequisite):'Kỹ năng nền tảng cho các chủ đề tiếp theo.'}</p><a class="btn text" href="#practice/${s.id}">Kiểm tra & luyện →</a></section>`;}).join('')}</div><section class="card"><h2>Tại sao các kỹ năng liên quan?</h2><p class="report-note">Các chủ đề lớp ${grade}: ${skills.map(s=>s.name).join(', ')}. Hãy luyện từ bài khởi động, giải thích cách sửa rồi kiểm chứng bằng một bài mới. Kho này chưa bao phủ toàn bộ chương trình.</p>${skillRows()}</section>`; }
function progress(parent=false) { const report=summary();return intro('BẰNG CHỨNG TỪ QUÁ TRÌNH HỌC',parent?'Cùng con nhìn lại tiến bộ':'Tiến bộ của tôi','Ghi nhận điều đã làm, điều đã sửa và kết quả khi gặp lại.', '<button class="btn secondary" data-print>↓ In / lưu PDF</button>')+metrics()+`<section class="card"><div class="section-head"><h2>Theo từng kỹ năng</h2><span class="badge">Dữ liệu học sinh được phép xem</span></div><div class="table-wrap"><table><thead><tr><th>Kỹ năng</th><th>Lần đầu sai / tổng</th><th>Ôn đến hẹn sai / tổng</th><th>Sửa sau gợi ý</th><th>Trạng thái</th></tr></thead><tbody>${skills.map(s=>{const a=report.attempts.filter(a=>a.skill===s.id),initial=a.filter(a=>a.mode!=='review'),review=a.filter(a=>a.mode==='review');return `<tr><td>${s.name}</td><td>${initial.length?`${initial.filter(a=>!a.initialCorrect).length} / ${initial.length}`:'—'}</td><td>${review.length?`${review.filter(a=>!a.initialCorrect).length} / ${review.length}`:'—'}</td><td>${a.filter(a=>!a.initialCorrect&&a.corrected).length}</td><td>${stat(s.id).label}</td></tr>`;}).join('')}</tbody></table></div><p class="hint">Lần đầu bao gồm luyện thêm và bài kiểm chứng. Các nhóm câu có thể khác độ khó; chưa đủ căn cứ để khẳng định hiệu quả can thiệp từ tỉ lệ này.</p></section><div class="split"><section class="card"><h2>Nhật ký gần đây</h2>${report.attempts.length?report.attempts.slice(-8).reverse().map(a=>`<div class="list-row"><div><h3>${skillName(a.skill)}</h3><p>${date(a.time)} · ${a.mode==='review'?'Ôn đến hẹn':a.mode==='transfer'?'Bài kiểm chứng':'Luyện tập'}</p></div><span class="badge ${a.initialCorrect?'':'amber'}">${a.initialCorrect?'Đúng từ đầu':a.corrected?'Đã sửa':'Cần sửa'}</span></div>`).join(''):empty('Chưa có lượt học. Báo cáo sẽ xuất hiện sau khi em làm bài.')}</section><section class="card"><h2>${parent?'Gợi ý đồng hành cùng con':'Bước tiếp theo'}</h2><p class="report-note">${due().length?`Có ${due().length} bài đến hẹn ôn lại. Hãy tự làm trước khi xem sổ tay.`:'Bắt đầu một bài luyện, tự giải thích và quay lại sau khoảng nghỉ để xem mình còn nhớ không.'}</p><div class="tip"><h3>Hỏi về cách nghĩ, không chỉ hỏi điểm</h3><p>“Con sai ở bước nào? Vì sao cách sửa này đúng? Con có thể dùng ví dụ khác để kiểm tra không?”</p></div><p class="hint">${ai?'Gemini đang được kết nối.':'Chưa cấu hình Gemini; gợi ý theo quy tắc vẫn hoạt động.'} Phần lập luận cần giáo viên nhận xét.</p>${parent?'':'<a class="btn secondary" href="#notebook">Mở lịch ôn →</a>'}</section></div>`; }
function rolePage(role=auth.user.role) {
  if(role==='parent') return studentSelection()+progress(true);
  if(role==='admin') return adminHTML();
  const assigned=state.assignments.filter(a=>a.teacherId===auth.user.id);
  return intro('QUAN SÁT CÁCH NGHĨ CỦA HỌC SINH','Góc giáo viên','Giao nhiệm vụ và nhận xét lập luận dựa trên quá trình học.')+studentSelection()+`<div class="split"><section class="card"><h2>Giao một nhiệm vụ</h2><form id="assignment-form"><label class="field" for="assignment-skill">Kỹ năng</label><select id="assignment-skill">${skills.filter(s=>baseSkills.some(b=>b.id===s.id)).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select><label class="field" for="assignment-title">Lời nhắn cho học sinh</label><input id="assignment-title" class="input" maxlength="200" required placeholder="Làm 3 bài và giải thích cách sửa"><label class="field" for="assignment-due">Hạn hoàn thành</label><input id="assignment-due" class="input" type="date" required><div class="button-row"><button class="btn">Lưu nhiệm vụ →</button></div></form></section><section class="card"><h2>Nhiệm vụ đã giao</h2>${assigned.length?assigned.map(a=>`<div class="list-row"><div><h3>${esc(a.title)}</h3><p>${skillName(a.skill)} · Hạn ${esc(a.due)}</p><p>${state.attempts.filter(t=>(a.exerciseIds?.length?a.exerciseIds.includes(t.exerciseId):t.skill===a.skill)&&t.time>=a.created&&t.completed).length} lượt hoàn thành từ lúc giao</p></div><a class="btn text" href="#learning/${auth.studentId}">Xem nhiệm vụ →</a></div>`).join(''):empty('Chưa có nhiệm vụ cho học sinh này.')}</section></div><section class="card"><h2>Lời giải thích cần nhận xét</h2>${state.attempts.some(a=>a.explanation)?state.attempts.filter(a=>a.explanation).slice().reverse().map(a=>`<article class="list-row" style="display:block"><span class="badge">${skillName(a.skill)} · ${date(a.time)}</span><p>${promptHTML(allExercises.find(e=>e.id===a.exerciseId))}</p><p><strong>Học sinh:</strong> ${richMath(a.explanation)}</p><form class="note-form" data-id="${a.id}"><label class="field" for="note-${a.id}">Nhận xét nguyên nhân, quy tắc và cách kiểm chứng</label><textarea id="note-${a.id}" maxlength="1500" required>${esc(state.notes[a.id]||'')}</textarea><div class="button-row"><button class="btn secondary">Lưu nhận xét</button></div></form></article>`).join(''):empty('Học sinh này chưa gửi lời giải thích.')}</section>`;
}
function extraPage(page,id) {
  if(page==='parent')return parentDashboardHTML();
  if(page==='teacher-profile')return intro('TÀI KHOẢN GIÁO VIÊN','Hồ sơ giáo viên','Thông tin theo tài khoản đăng nhập.')+`<section class="card"><h2>${esc(auth.user.name)}</h2><p>Tên đăng nhập: ${esc(auth.user.username)}</p><p>Vai trò: Giáo viên</p><p>${auth.students.length} học sinh được phân công.</p><a class="btn" href="#learning/classes">Quản lý lớp học</a></section>`;
  if(page==='lessons'&&auth.lessonPublications.some(p=>demoLessons.some(l=>l.id===p.id&&l.grade===grade)))return studentLessonsHTML(grade,auth.lessonPublications);
  if(page==='parent')return studentSelection()+progress(true);
  if(page==='teacher')return rolePage('teacher');
  if(page==='settings')return intro('TÀI KHOẢN CỦA BẠN','Cài đặt','Quyền truy cập được cấp theo tài khoản đăng nhập.')+`<section class="card"><h2>${esc(auth.user.name)}</h2><p>Tên đăng nhập: ${esc(auth.user.username)}</p><p>Vai trò: <strong>${roleNames[auth.user.role]}</strong></p><p class="hint">Liên hệ quản trị khi cần đổi quyền hoặc liên kết học sinh.</p><button class="btn secondary" data-logout>Đăng xuất</button></section>`+pwaSettingsHTML();
  if(page==='profile')return intro('THÔNG TIN CỦA BẠN','Hồ sơ học tập','Hồ sơ được lưu theo tài khoản học sinh.')+`<section class="card profile-form"><form id="profile-form"><label class="field" for="profile-name">Tên hiển thị</label><input class="input" id="profile-name" value="${esc(state.profile?.name||auth.user.name)}" required maxlength="80"><label class="field" for="profile-grade">Lớp</label><select id="profile-grade">${[6,7,8,9].map(n=>`<option ${String(n)===String(state.profile?.grade||7)?'selected':''}>${n}</option>`).join('')}</select><div class="button-row"><button class="btn">Lưu hồ sơ</button><a class="btn secondary" href="#settings">Cài đặt</a></div></form><p class="hint">Đổi lớp sẽ cập nhật bài học, bài luyện, lộ trình và công thức. Lịch sử học cũ vẫn được giữ lại; vai trò tài khoản không đổi.</p></section>`;
  if(page==='formulas')return `<p class="notice">${auth.user.role==='teacher'?'Thư viện công thức các lớp':'Toán lớp '+grade+' · Công thức theo hồ sơ'}</p>`+(auth.user.role==='teacher'?'<a class="btn" href="#teacher-library">Soạn công thức / nhờ AI →</a>':'')+customFormulasHTML((auth.teacherContents||[]).filter(c=>auth.user.role==='teacher'||c.grade===grade))+formulaLibraryHTML(activeFormulas);
  if(page==='lessons')return intro('HIỂU BÀI TRƯỚC KHI LUYỆN TẬP','Bài học tương tác',`Toán lớp ${grade} · Bộ chủ đề khởi đầu. Đọc ví dụ, mở quy tắc rồi tự kiểm tra.`)+`<div class="lesson-grid">${skills.map(s=>{const e=exercises.find(e=>e.skill===s.id);return `<section class="card"><span class="badge">${s.name}</span><h2 style="margin:20px 0">${promptHTML(e)}</h2><div class="wrong">Lời giải cần kiểm tra: ${formula(e.wrong)}</div><details><summary class="btn secondary">Mở quy tắc và ví dụ đúng</summary><div class="feedback">${richMath(e.rule)}<br>Kết quả: ${formula(e.answer)}</div></details><div class="button-row"><a class="btn" href="#learn/${e.id}">Tự kiểm tra hiểu bài →</a></div></section>`;}).join('')}</div>`;
  if(page==='challenges')return intro('THỬ MỘT CÁCH NGHĨ KHÁC','Thử thách tư duy','Tìm lỗi, bác bỏ nhận định và khám phá quy luật.')+`<div class="exercise-grid">${[['Bắt lỗi gia sư','Tìm lỗi trong lời giải mẫu, tự sửa và giải thích lại.','learn/'+exercises[0].id],['Thử thách phản ví dụ','Tìm hai hình chữ nhật bác bỏ một nhận định về chu vi và diện tích.','explore/counter'],['Truy tìm hộp đen','Chọn phép thử để tìm quy luật y = ax + b.','explore/blackbox'],['Toán quanh em','Thiết kế khu vườn với 24 m hàng rào.','explore/garden']].map(([t,d,h])=>`<article class="exercise-card"><h3>${t}</h3><p>${d}</p><a class="btn" href="#${h}">Tham gia →</a></article>`).join('')}</div>`;
  if(page==='notifications')return intro('CẬP NHẬT TỪ QUÁ TRÌNH HỌC','Tin nhắn từ hệ thống','Thông báo dựa trên dữ liệu của tài khoản này.')+`<section class="card"><div class="list-row"><div><h3>Báo cáo học tập</h3><p>${state.attempts.length} lượt trả lời đã được ghi nhận.</p></div><a class="btn secondary" href="#progress">Xem báo cáo</a></div><div class="list-row"><div><h3>Lịch ôn tập</h3><p>${due().length} bài đến hẹn ôn lại.</p></div><a class="btn secondary" href="#notebook">Mở sổ tay</a></div><div class="list-row"><div><h3>Nhiệm vụ từ giáo viên</h3><p>${state.assignments.length} nhiệm vụ được giao cho bạn.</p></div><a class="btn secondary" href="#practice">Luyện tập</a></div>${state.attempts.length?'':'<p class="hint">Các thông báo có thời gian cụ thể trên trang chủ là minh họa giao diện, không phải thông báo thật.</p>'}</section>`;
  if(page==='search'){let query='';try{query=decodeURIComponent(id||'');}catch{}const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');const found=exercises.filter(e=>norm(e.prompt+' '+e.rule+' '+skillName(e.skill)).includes(norm(query)));return intro('TÌM KIẾN THỨC CẦN HỌC','Kết quả tìm kiếm',`${found.length} bài phù hợp với “${esc(query)}”.`)+`<div class="exercise-grid">${found.map(e=>`<article class="exercise-card"><span class="badge">${skillName(e.skill)}</span><h3>${promptHTML(e)}</h3><a class="btn" href="#learn/${e.id}">Mở bài học →</a></article>`).join('')}</div>`+(found.length?'':empty('Thử từ khóa “phân phối”, “số âm” hoặc “phương trình”.'));}
}
const accountChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('math-lab-auth'):null;
function lockAccount(message=''){
  authReady=false;auth.user=null;auth.students=[];auth.studentId=null;auth.users=[];state=blank();session=null;busy=false;
  disposeExplore();disposeExplore=()=>{};disposeAtlas();disposeAtlas=()=>{};
  delete document.body.dataset.role;
  history.replaceState(null,'','#login');loginView(signedIn,message);
}
async function signedIn(){
  state=await workspace();authReady=true;history.replaceState(null,'','#home');render();accountChannel?.postMessage('changed');
}
async function initializeAuth(){
  try{state=await workspace();authReady=true;render();}catch{lockAccount(navigator.onLine?'':'Cần kết nối mạng để xác thực tài khoản.');}
}
async function logout(){
  await saveQueue;
  try{await api('/api/auth/logout','POST',{});lockAccount();accountChannel?.postMessage('changed');}catch(error){toast('Chưa đăng xuất được: '+error.message);}
}
function bindAccounts(){
  const editorAccount=auth.user?.id,editorHost=$('#content-editor');
  bindContentEditor($('#main'),{request:api,onPublished:async()=>{if(auth.user?.id!==editorAccount||!editorHost?.isConnected)return;state=await workspace(auth.studentId);if(auth.user?.id!==editorAccount||!editorHost.isConnected)return;render();toast('Đã đăng nội dung cho học sinh đúng lớp.');}});
  const uploaderId=auth.user?.id,uploadHost=$('#upload-lesson');
  bindLessonUpload($('#main'),{request:api,onPublished:async result=>{if(auth.user?.id!==uploaderId||!uploadHost?.isConnected)return;state=await workspace(auth.studentId);if(auth.user?.id!==uploaderId||!uploadHost.isConnected)return;render();toast(result.duplicate?'Bài này đã được đăng, không tạo trùng.':'Đã đăng bài cho học sinh đúng lớp.');}});
  $('[data-import-lessons]')?.addEventListener('click',async e=>{const button=e.currentTarget;button.disabled=true;try{const result=await api('/api/teacher/lessons/import-demo','POST',{});state=await workspace(auth.studentId);render();$('#lesson-import-status').textContent=`Đã nạp thêm ${result.added} bài. Tổng ${result.total} bài học, chia đều cho lớp 6–9.`;}catch(error){toast(error.message);button.disabled=false;}});
  $('[data-logout]')?.addEventListener('click',logout);
  $('[data-teacher-logout]')?.addEventListener('click',logout);
  $('#student-picker')?.addEventListener('change',async e=>{try{state=await workspace(e.target.value);render();}catch(error){toast(error.message);}});
  $('#create-user-form')?.addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{await api('/api/admin/users','POST',{name:$('#new-name').value.trim(),username:$('#new-username').value.trim(),password:$('#new-password').value,role:$('#new-role').value});state=await workspace();render();toast('Đã tạo tài khoản.');}catch(error){$('#admin-result').textContent=error.message;}finally{button.disabled=false;}});
  const refreshLinks=()=>{const user=auth.users.find(u=>u.id===$('#link-user')?.value);document.querySelectorAll('.link-students input').forEach(input=>input.checked=!!user?.studentIds.includes(input.value));};
  $('#link-user')?.addEventListener('change',refreshLinks);refreshLinks();
  $('#link-users-form')?.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/admin/links','PUT',{userId:$('#link-user').value,studentIds:[...document.querySelectorAll('.link-students input:checked')].map(i=>i.value)});state=await workspace();render();toast('Đã cập nhật phân công.');}catch(error){toast(error.message);}});
}
window.addEventListener('auth-expired',()=>lockAccount('Phiên đăng nhập đã hết hạn hoặc thay đổi.'));
accountChannel?.addEventListener('message',()=>lockAccount('Tài khoản đã thay đổi ở tab khác. Vui lòng đăng nhập lại.'));
document.addEventListener('visibilitychange',async()=>{if(!document.hidden&&authReady&&navigator.onLine){try{const result=await api('/api/auth/session');if(result.user.id!==auth.user?.id)lockAccount('Tài khoản đã thay đổi.');else refreshReadView();}catch{}}});
$('#logout').addEventListener('click',logout);
function render() {
  try{renderPage();}catch(error){
    console.error('Không dựng được trang',location.hash,error);
    $('#main').innerHTML='<section class="card" role="alert"><h1>Chưa mở được trang này</h1><p>Dữ liệu đã lưu vẫn được giữ lại. Hãy tải lại để nhận nội dung mới nhất.</p><button class="btn" id="retry-page">Tải lại trang</button></section>';
    $('#retry-page').onclick=()=>location.reload();
  }
}
function renderPage() {
  const custom=[...(auth.teacherContents||[]),...(auth.archivedContents||[]).map(c=>({...c,archived:true}))].filter(c=>c.kind==='exercise');
  allExercises=[...baseExercises,...custom.map(c=>({id:c.id,archived:c.archived,skill:'teacher-'+c.id,grades:[c.grade],prompt:c.prompt,wrong:c.wrong,answer:c.answer,rule:c.rule,errorTags:c.errorTags||[],keywords:[],level:'Luyện tập'}))];
  allSkills=[...baseSkills,...custom.map(c=>({id:'teacher-'+c.id,name:esc(c.topic),grades:[c.grade],color:'#68a7ff'}))];

  try{disposeExplore();}catch(error){console.error('Explore cleanup',error);}
  disposeExplore = () => {};
  try{disposeAtlas();}catch(error){console.error('Atlas cleanup',error);}
  disposeAtlas = () => {};
  if(!authReady||!auth.user){loginView(signedIn);return;}
  usageTracker.tick();
  let [page='home',id,mode]=(location.hash.slice(1)||'home').split('/');
  if(!canVisit(page)){page='home';history.replaceState(null,'','#home');toast('Trang này không thuộc quyền truy cập của tài khoản.');}
  $('#main').dataset.page=page;
  if(page!=='learn') session=null;
  const nextGrade=normalizeGrade(state.profile?.grade);if(nextGrade!==grade){grade=nextGrade;filter='all';}
  exercises=allExercises.filter(e=>!e.archived&&e.grades.includes(grade));skills=allSkills.filter(s=>s.grades.includes(grade)&&exercises.some(e=>e.skill===s.id));activeFormulas=auth.user.role==='teacher'?formulaLibrary:formulasForGrade(grade);
  const published=demoLessons.filter(l=>l.grade===grade&&auth.lessonPublications.some(p=>p.id===l.id));
  if(published.length){const ids=new Set(published.flatMap(l=>l.exerciseIds));exercises=exercises.filter(e=>ids.has(e.id)||custom.some(c=>c.id===e.id));skills=skills.filter(s=>exercises.some(e=>e.skill===s.id));}
  nav(page==='learn'?'practice':page);
  document.body.classList.toggle('is-dashboard',page==='home'&&auth.user.role==='student');
  const profile=auth.user.role==='student'?(state.profile||{name:auth.user.name,grade:'7'}):{name:auth.user.name};
  $('.header-profile strong').textContent=profile.name;
  $('.header-profile small').textContent=({student:'Học sinh - Lớp '+profile.grade,teacher:'Giáo viên',parent:'Phụ huynh',admin:'Quản trị'})[auth.user.role];
  document.body.dataset.role=auth.user.role;
  if(auth.user.role==='parent'&&!$('#parent-companion')){const panel=document.createElement('div');panel.id='parent-companion';panel.innerHTML=parentSidebarHTML();$('.sidebar-bottom').prepend(panel);}
  $('.header-profile img').src=['teacher','parent'].includes(auth.user.role)?'/assets/teacher.svg':'/assets/student.svg';
  $('#search-input').placeholder=auth.user.role==='parent'?'Tìm kiếm theo học sinh, chủ đề, báo cáo...':auth.user.role==='teacher'?'Tìm kiếm học sinh, lớp học, bài tập...':'Tìm bài học, chủ đề, dạng lỗi...';
  $('.notification-button').href=auth.user.role==='parent'?'#parent/notifications':auth.user.role==='teacher'?'#learning/errors':'#notifications';
  $('.notification-button').setAttribute('aria-label',auth.user.role==='teacher'?'Xem lỗi cần chú ý':'Xem thông báo');

  document.body.classList.remove('auth-screen');
  const html=page==='learning'?learningPageHTML():page==='practice'?practice(id):page==='learn'?learn(id,mode):page==='notebook'?notebook():page==='map'?knowledge():page==='progress'?progress():page==='explore'?exploreHTML(id):['lessons','challenges','formulas','profile','settings','notifications','search','parent','teacher','teacher-profile'].includes(page)?extraPage(page,id):home();
  $('#main').innerHTML=page==='teacher-notifications'?parentMailHTML():page==='teacher-library'?teacherLibraryHTML(auth.lessonPublications,id,auth.uploadedLessons,allExercises):html;
  if(auth.user.role==='teacher'&&!auth.studentId&&page==='teacher')$('#main').innerHTML=intro('KHÔNG GIAN CỦA BẠN','Chưa có học sinh được liên kết','Quản trị cần phân công học sinh cho tài khoản này.');
  if(page==='home'&&auth.user.role==='student'&&state.assignments.length) { const box=document.createElement('div'); box.className='card';box.innerHTML='<h2>Nhiệm vụ từ giáo viên</h2>'+state.assignments.map(a=>`<div class="list-row"><div><h3>${esc(a.title)}</h3><p>${skillName(a.skill)} · Hạn ${esc(a.due)}</p></div><a class="btn secondary" href="#learning">Làm bài →</a></div>`).join(''); $('#main').append(box); }
  if(page==='lessons'&&auth.user.role==='student')$('#main').insertAdjacentHTML('afterbegin',uploadedLessonsHTML(auth.uploadedLessons.filter(l=>l.grade===grade)));
  bind();
  if(auth.user.role==='admin'&&['home','admin'].includes(page))mountAccountMaintenance($('#main'),{auth,request:api});
  if(page==='teacher-notifications')mountParentMail($('#main'),{request:api});
  if(auth.user.role==='parent'&&['home','parent'].includes(page)){let query='';if(page==='home')try{query=decodeURIComponent(id||'');}catch{}mountParentDashboard($('#main'),{request:api,auth,view:page==='parent'?id||'progress':'',query,onChild:async id=>{state=await workspace(id);}});}
  if(page==='teacher-library'){mountTeacherWorkspace($('#main'));if(id==='assign')mountTeacherExam($('#main'),{request:api});}
  if(page==='home'&&auth.user.role==='teacher'){let query='';try{query=decodeURIComponent(id||'');}catch{}mountTeacherDashboard($('#main'),{request:api,auth,query});}
  if(page==='learning'){const hub=$('#learning-hub');saveQueue.then(()=>{if(hub?.isConnected){if(saveFailed)hub.textContent='Chưa lưu được bài làm. Kiểm tra kết nối rồi thử lại.';else mountLearning($('#main'),{request:api,auth,studentId:['classes','assignments','progress','errors'].includes(id)?undefined:id,view:['classes','assignments','progress','errors'].includes(id)?id:''});}});}
  attachMathPreviews($('#main'));
  if(page==='formulas') disposeAtlas=mountAtlas($('#main'),activeFormulas,{onRecord:activityRecorder(),practiceBase:auth.user.role==='teacher'?'#teacher-library/':'#practice/'});
  if(page==='explore') disposeExplore=mountExplore($('#main'),{onRecord:activityRecorder()});
}
function activityRecorder(){if(auth.user?.role!=='student')return undefined;const owner=auth.user.id;return input=>{if(auth.user?.id!==owner)throw Error('Tài khoản đã thay đổi.');return api('/api/student/activities','POST',input);};}
function bind() {
  bindAccounts();
  $('#profile-form')?.addEventListener('submit',async e=>{e.preventDefault();const name=$('#profile-name').value.trim();if(!name)return;const previous=state.profile,button=e.currentTarget.querySelector('button');button.disabled=true;state.profile={name,grade:$('#profile-grade').value};const saved=await save();if(!auth.user)return;if(!saved){state.profile=previous;render();return;}state=await workspace(auth.studentId);filter='all';session=null;render();toast('Đã chuyển nội dung học sang lớp '+normalizeGrade(state.profile.grade)+'.');});
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;location.hash='#practice';render();});
  for(const selector of ['#correction','#revised-working','#explanation'])$(selector)?.addEventListener('input',persistAttemptDraft);
  $('#answer-form')?.addEventListener('submit',e=>{e.preventDefault();const ex=allExercises.find(e=>e.id===session.id);const answer=$('#answer').value.trim();session.first={answer,correct:checkAnswer(answer,ex.answer)};session.recordId=crypto.randomUUID();state.attempts.push({id:session.recordId,exerciseId:ex.id,skill:ex.skill,time:Date.now(),mode:session.mode,answer,initialCorrect:session.first.correct,corrected:false,working:$('#working')?.value.trim()||''});save();session.correction=answer;session.step=session.first.correct?1:2;render();});
  document.querySelectorAll('[data-diagnosis]').forEach(b=>b.onclick=()=>{const ex=allExercises.find(e=>e.id===session.id);session.diagnosed=diagnosisOptions(ex)[Number(b.dataset.diagnosis)]===ex.rule;session.message=session.diagnosed?'Đúng quy tắc cần dùng. Bây giờ áp dụng để tự sửa nhé.':'Quy tắc này chưa giải thích đúng lỗi trong lời giải. Hãy xét phép tính đang được thực hiện.';render();});
  $('[data-next]')?.addEventListener('click',()=>{session.step++;session.message='';render();});
  $('#correction-form')?.addEventListener('submit',e=>{e.preventDefault();session.correction=$('#correction').value.trim();persistAttemptDraft();const ex=allExercises.find(e=>e.id===session.id);if(checkAnswer(session.correction,ex.answer)){state.attempts.find(a=>a.id===session.recordId).corrected=true;save();session.step=3;session.message='';}else session.message='Chưa khớp kết quả. Em hãy áp dụng quy tắc cho từng số hạng rồi kiểm tra lại.';render();});
  $('#explanation-form')?.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const current=session;current.explanation=$('#explanation').value.trim();persistAttemptDraft();if(current.explanation.length<15)return;busy=true;render();try{if(!await save())throw Error('Chưa lưu được bài làm.');current.feedback=await api('/api/explain','POST',{exerciseId:current.id,attemptId:current.recordId,explanation:current.explanation},30000);}catch(error){current.feedback={source:'rules',feedback:navigator.onLine?`Chưa nhận được phản hồi: ${error.message} Em vẫn có thể lưu để giáo viên xem.`:'Em đang ngoại tuyến. Hãy nêu nguyên nhân, quy tắc và cách kiểm chứng; lưu lời giải thích để giáo viên xem.',needsTeacher:true};}finally{busy=false;if(session===current)render();}});
  $('[data-skip-ai]')?.addEventListener('click',()=>{const field=$('#explanation');if(!field.reportValidity())return;session.explanation=field.value.trim();if(session.explanation.length<15){toast('Em hãy giải thích ít nhất 15 ký tự.');return;}session.feedback={source:'teacher',feedback:'Đã lưu để giáo viên nhận xét.',needsTeacher:true};complete();});
  $('#diagnose-attempt')?.addEventListener('click',async e=>{const button=e.currentTarget,current=session;button.disabled=true;try{const saved=await save();if(!saved)throw Error('Hãy lưu bài làm trước khi phân tích.');const result=await api('/api/learning/diagnose','POST',{attemptId:current.recordId},45000);if(session===current){state.diagnoses??={};state.diagnoses[current.recordId]=result;if($('#attempt-diagnosis'))$('#attempt-diagnosis').innerHTML=diagnosisHTML(result);}}catch(error){toast(error.message);}finally{button.disabled=false;}});
  $('[data-finish]')?.addEventListener('click',complete);
  $('[data-print]')?.addEventListener('click',()=>window.print());


  $('#assignment-form')?.addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{await api('/api/teacher/assignments','POST',{studentId:auth.studentId,skill:$('#assignment-skill').value,title:$('#assignment-title').value.trim(),due:$('#assignment-due').value});state=await workspace(auth.studentId);render();toast('Đã giao nhiệm vụ cho học sinh.');}catch(error){toast(error.message);}finally{button.disabled=false;}});
  document.querySelectorAll('.note-form').forEach(f=>f.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/teacher/notes','POST',{studentId:auth.studentId,attemptId:f.dataset.id,text:$('textarea',f).value.trim()});state=await workspace(auth.studentId);toast('Đã lưu nhận xét cho học sinh.');}catch(error){toast(error.message);}}));
}

$('#global-search').addEventListener('submit',e=>{e.preventDefault();const q=$('#search-input').value.trim();if(q)location.hash=(['teacher','parent'].includes(auth.user?.role)?'#home/':'#search/')+encodeURIComponent(q);});
async function refreshReadView(){
  const hash=location.hash,page=(hash.slice(1)||'home').split('/')[0],ticket=++readTicket,accountId=auth.user?.id;
  if(!authReady||!navigator.onLine||!['home','lessons','practice','formulas','progress','notebook','parent','teacher','teacher-library','notifications'].includes(page))return;
  await saveQueue;if(saveFailed||ticket!==readTicket||accountId!==auth.user?.id)return;
  try{
    let data;try{data=await api('/api/workspace'+(auth.studentId?'?studentId='+encodeURIComponent(auth.studentId):''));}catch(error){if(error.status!==403)throw error;data=await api('/api/workspace');}
    if(ticket!==readTicket||location.hash!==hash||accountId!==auth.user?.id)return;
    // Do not replace an explanation or assignment while the user is editing it.
    if(document.activeElement?.matches('input,textarea,select')||$('#main [data-upload-dirty]'))return;
    state=data.state;auth.students=data.students;auth.studentId=data.studentId;auth.users=data.users||[];auth.lessonPublications=data.lessonPublications||[];auth.uploadedLessons=data.uploadedLessons||[];auth.teacherContents=data.teacherContents||[];auth.archivedContents=data.archivedContents||[];auth.user=data.user;render();
  }catch(error){if(auth.user)toast('Chưa cập nhật được báo cáo: '+error.message);}
}
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);refreshReadView();});
window.addEventListener('focus',refreshReadView);
window.addEventListener('app-before-update',()=>{
  const drafting=!!$('#main [data-upload-dirty]');
  window.mathLabUpdateBlockedReason=drafting?'Bạn đang soạn nội dung chưa đăng hoặc chưa giao. Hãy hoàn tất hoặc sao chép nội dung trước khi cập nhật.':'';
  window.mathLabPendingSave=drafting?Promise.resolve(false):saveQueue;
});
function connection(){ $('#connection').textContent=navigator.onLine?'● Trực tuyến':'○ Ngoại tuyến'; }
window.addEventListener('online',()=>{connection();if(auth.user?.role==='student')save();});window.addEventListener('offline',connection);
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
fetch('/api/status').then(r=>r.json()).then(s=>{ai=s.ai;}).catch(()=>{});
connection();initializeAuth();
