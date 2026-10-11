import './pwa.js';
import './app-shell.js';
// Detect an updated app even when a tab stays open across deployments.
async function version(){const response=await fetch('/api/version',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('version');return (await response.json()).version;}
let loadedVersion=null,checking=false;
try{loadedVersion=await version();}catch{}
await import('./app.js');
async function checkUpdate(){
 if(checking||document.hidden||!navigator.onLine||document.getElementById('app-update-banner'))return;
 checking=true;
 try{const next=await version();if(!loadedVersion){loadedVersion=next;return;}if(next===loadedVersion)return;
   const banner=document.createElement('div');banner.id='app-update-banner';banner.className='app-update-banner';banner.setAttribute('role','status');
   banner.innerHTML='<span>Đã có bản cập nhật. Hãy lưu phần đang làm rồi tải bản mới.</span><button type="button">Tải bản mới</button>';
   banner.querySelector('button').addEventListener('click',async()=>{window.dispatchEvent(new Event('app-before-update'));const saved=await window.mathLabPendingSave;if(saved===false){banner.querySelector('span').textContent=window.mathLabUpdateBlockedReason||'Chưa lưu được dữ liệu. Hãy kiểm tra kết nối và lưu lại trước khi cập nhật.';return;}location.reload();});document.body.append(banner);
 }catch{}finally{checking=false;}
}
setInterval(checkUpdate,60000);
window.addEventListener('focus',checkUpdate);
document.addEventListener('visibilitychange',checkUpdate);
navigator.serviceWorker?.addEventListener('controllerchange',checkUpdate);
