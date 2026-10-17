const sidebar=document.querySelector('.sidebar'),shell=document.querySelector('.shell');
const bar=document.createElement('header');bar.id='app-topbar';
bar.innerHTML='<a class="school-app-brand school-brand" href="#home"><img src="/assets/logo-truong.jpg" alt="Logo Trường THCS Lạc Đạo" width="56" height="56"><span>TRƯỜNG THCS<strong>LẠC ĐẠO</strong><small>HƯNG YÊN</small></span></a><button type="button" id="app-menu-open" aria-controls="app-side-menu" aria-expanded="false"><span aria-hidden="true">☰</span> Menu</button><strong id="app-page-title">Tư duy Toán</strong><a href="#settings" aria-label="Cài đặt tài khoản">Tài khoản</a>';
shell.before(bar);sidebar.id='app-side-menu';
const close=document.createElement('button');close.type='button';close.id='app-menu-close';close.textContent='Đóng menu ×';sidebar.prepend(close);
const backdrop=document.createElement('button');backdrop.id='app-menu-backdrop';backdrop.type='button';backdrop.tabIndex=-1;backdrop.setAttribute('aria-label','Đóng menu');sidebar.after(backdrop);
const opener=bar.querySelector('button'),compact=matchMedia('(max-width: 999px)');
let opened=false,lastMode='';
const active=()=>document.body.classList.contains('app-standalone')&&!document.body.classList.contains('auth-screen');
function sync(){
 const enabled=active(),drawer=enabled&&compact.matches;
 if(!drawer)opened=false;
 document.body.classList.toggle('app-menu-visible',opened&&drawer);
 opener.setAttribute('aria-expanded',String(opened&&drawer));
 sidebar.inert=drawer&&!opened;sidebar.removeAttribute('aria-hidden');
 shell.inert=drawer&&opened;bar.inert=drawer&&opened;
 if(drawer&&opened){sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');sidebar.setAttribute('aria-label','Menu chức năng');}
 else{sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');sidebar.removeAttribute('aria-label');}
 bar.querySelector('#app-page-title').textContent=document.querySelector('#navigation a[aria-current="page"] span')?.textContent||'Tư duy Toán';
}
function dismiss(focus=true){opened=false;sync();if(focus&&active()&&compact.matches)opener.focus();}
opener.onclick=()=>{opened=true;sync();requestAnimationFrame(()=>{if(opened)close.focus();});};close.onclick=()=>dismiss();backdrop.onclick=()=>dismiss();
sidebar.addEventListener('click',event=>{if(event.target.closest('a, [data-teacher-logout]'))dismiss(false);});
document.addEventListener('keydown',event=>{
 if(!opened)return;
 if(event.key==='Escape'){event.preventDefault();dismiss();return;}
 if(event.key==='Tab'){
  const controls=[...sidebar.querySelectorAll('a,button,input,select')].filter(el=>!el.disabled&&el.getClientRects().length),first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
});
window.addEventListener('hashchange',()=>{dismiss(false);requestAnimationFrame(sync);});compact.addEventListener('change',()=>dismiss(false));
new MutationObserver(()=>{const mode=active()+':'+document.body.dataset.role;if(mode!==lastMode){lastMode=mode;dismiss(false);}}).observe(document.body,{attributes:true,attributeFilter:['class','data-role']});
new MutationObserver(sync).observe(document.querySelector('#navigation'),{childList:true});sync();
