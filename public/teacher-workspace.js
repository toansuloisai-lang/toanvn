import {icon} from './ui.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function teacherQuickActions(){return `<div class="tw-quick-actions"><a href="#teacher-library/bank">${icon('book')}Kho câu hỏi DATATM</a><a href="#teacher-library/create">${icon('book')}Soạn bài tập</a><a href="#teacher-library/assign">${icon('clipboard')}Tạo đề & giao bài</a><a href="#teacher-library/documents">${icon('report')}Tải tài liệu</a></div>`;}
export function teacherWorkspace(view,title,description,content){
  return `<div class="teacher-workspace"><header class="tw-heading"><div><a class="tw-back" href="#home">Không gian giáo viên /</a><h1>${esc(title)}</h1><p>${esc(description)}</p></div><a class="btn secondary" href="#learning/assignments">${icon('chart')}Theo dõi bài đã giao</a></header>
    <nav class="tw-tabs" aria-label="Soạn và giao bài">${[['','Tổng quan'],['bank','Kho DATATM'],['create','Soạn bài tập'],['assign','Tạo đề & giao bài'],['documents','Tải tài liệu'],['lessons','Bài giảng có sẵn']].map(([route,label])=>`<a href="#teacher-library${route?'/'+route:''}" ${view===route?'aria-current="page"':''}>${label}</a>`).join('')}</nav>${content}</div>`;
}
export function mountTeacherWorkspace(root){
  const search=root.querySelector('#tw-library-search'),grade=root.querySelector('#tw-library-grade');
  if(!search)return;
  const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  function filter(){let count=0;root.querySelectorAll('[data-library-row]').forEach(row=>{row.hidden=!(normalize(row.dataset.search).includes(normalize(search.value))&&(!grade.value||row.dataset.grades.split(',').includes(grade.value)));if(!row.hidden)count++;});root.querySelector('#tw-library-empty').hidden=count>0;root.querySelector('#tw-library-count').textContent=`${count} nội dung`;}
  search.addEventListener('input',filter);grade.addEventListener('change',filter);filter();
}
