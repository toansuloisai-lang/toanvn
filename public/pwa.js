const displayMode=matchMedia('(display-mode: standalone)');
const isStandalone=()=>displayMode.matches||navigator.standalone===true;
let installPrompt=null,installed=false,prompting=false;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let platform=ios?'ios':/Android/.test(navigator.userAgent)?'android':'desktop';
const guides={
 ios:['Mở địa chỉ trang này bằng Safari. Nếu đang ở Zalo hoặc Facebook, chọn mở bằng trình duyệt ngoài.','Chạm nút Chia sẻ, rồi chọn “Thêm vào Màn hình chính”.','Bật “Mở dưới dạng ứng dụng web” nếu có, rồi chạm “Thêm”. Mở Tư duy Toán từ biểu tượng mới.'],
 android:['Mở trang bằng Chrome trên điện thoại.','Mở menu ⋮, chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.','Xác nhận cài đặt, rồi mở Tư duy Toán từ biểu tượng ứng dụng.'],
 desktop:['Mở trang bằng Chrome hoặc Microsoft Edge.','Chọn biểu tượng cài đặt trên thanh địa chỉ, hoặc mở menu trình duyệt → “Cài đặt” / “Ứng dụng” → cài trang này.','Xác nhận cài đặt. Sau đó mở Tư duy Toán từ danh sách ứng dụng của máy.']
};
const host=document.createElement('div');host.id='pwa-controls';
host.innerHTML=`<button type="button" id="pwa-install-open" class="pwa-launcher" data-install-app aria-haspopup="dialog"><span aria-hidden="true">↓</span> Cài ứng dụng</button>
 <div id="pwa-network" class="pwa-network" role="status" hidden>Mất kết nối mạng. Giữ ứng dụng mở; dữ liệu chưa gửi cần có mạng để lưu.</div>
 <dialog id="pwa-install-dialog" class="pwa-dialog" aria-labelledby="pwa-title" aria-describedby="pwa-description"><div class="pwa-dialog-body">
 <button type="button" id="pwa-close" class="pwa-close" aria-label="Đóng hướng dẫn cài đặt">×</button>
 <img src="/icon-192.png" width="72" height="72" alt="" class="pwa-logo"><span class="pwa-eyebrow">HỌC TRÊN WEB · MỞ NHƯ ỨNG DỤNG</span>
 <h2 id="pwa-title">Tư duy Toán luôn ở gần bạn</h2><p id="pwa-description">Thêm biểu tượng lên màn hình chính để mở nhanh trong cửa sổ riêng. Dùng cùng tài khoản và dữ liệu như trên web.</p>
 <button type="button" id="pwa-install-native" class="btn pwa-primary" hidden>Cài Tư duy Toán</button><p id="pwa-install-status" role="status"></p>
 <div class="pwa-platforms" role="group" aria-label="Thiết bị cần cài">${[['android','Android'],['ios','iPhone / iPad'],['desktop','Máy tính']].map(([id,label])=>`<button type="button" data-pwa-platform="${id}" aria-pressed="false">${label}</button>`).join('')}</div>
 <ol id="pwa-instructions"></ol><p class="pwa-note">Cần mạng để đăng nhập, lưu bài, đồng bộ điểm và dùng AI. Khi mất mạng, giữ trang đang mở và chờ kết nối lại.</p>
 </div></dialog>`;
document.body.append(host);
const dialog=host.querySelector('dialog'),native=host.querySelector('#pwa-install-native'),status=host.querySelector('#pwa-install-status');
function guide(){host.querySelector('#pwa-instructions').innerHTML=guides[platform].map(line=>`<li>${line}</li>`).join('');host.querySelectorAll('[data-pwa-platform]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pwaPlatform===platform)));}
function sync(){
 const standalone=isStandalone();document.body.classList.toggle('app-standalone',standalone);document.body.classList.toggle('app-installed',installed);
 host.querySelector('#pwa-install-open').hidden=standalone||installed;
 native.hidden=!installPrompt||standalone||installed;native.disabled=prompting||!navigator.onLine;
}
function installStatus(){return isStandalone()?'Bạn đang dùng ứng dụng đã cài.':installed?'Đã cài ứng dụng. Mở Tư duy Toán từ biểu tượng trên thiết bị.':!isSecureContext?'Địa chỉ này chưa hỗ trợ cài ứng dụng. Hãy mở bản HTTPS của trang web.':!navigator.onLine?'Bạn đang ngoại tuyến. Hãy bật mạng và tải lại trang trước khi cài ứng dụng.':platform==='android'&&!installPrompt?'Chrome chưa cung cấp nút cài trực tiếp. Hãy dùng menu ⋮ → Cài đặt ứng dụng. Nếu chọn Thêm vào màn hình chính, chọn tiếp Cài đặt; Tạo lối tắt có thể chỉ mở lại trình duyệt.':'';}
function open(){sync();guide();status.textContent=installStatus();if(!dialog.open)dialog.showModal();}
document.addEventListener('click',event=>{if(event.target.closest('[data-install-app]'))open();});
host.querySelector('#pwa-close').onclick=()=>dialog.close();
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
host.querySelectorAll('[data-pwa-platform]').forEach(button=>button.onclick=()=>{platform=button.dataset.pwaPlatform;guide();status.textContent=installStatus();});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;sync();if(dialog.open)status.textContent=installStatus();});
native.onclick=async()=>{
 if(!installPrompt||prompting||!navigator.onLine)return;const event=installPrompt;installPrompt=null;prompting=true;native.disabled=true;status.textContent='Hãy xác nhận trong hộp thoại của trình duyệt.';
 try{await event.prompt();const choice=await event.userChoice;status.textContent=installed?'Đã cài ứng dụng. Bạn có thể mở từ biểu tượng trên thiết bị.':choice.outcome==='accepted'?'Đã chấp nhận cài đặt. Trình duyệt sẽ thêm biểu tượng ứng dụng.':'Bạn vẫn có thể dùng web và cài lại từ menu trình duyệt bất cứ lúc nào.';}
 catch{status.textContent='Chưa mở được hộp thoại cài đặt. Hãy làm theo hướng dẫn bên dưới.';}
 finally{prompting=false;sync();}
};
window.addEventListener('appinstalled',()=>{installed=true;installPrompt=null;status.textContent='Đã cài ứng dụng. Bạn có thể mở từ biểu tượng trên thiết bị.';sync();});
displayMode.addEventListener('change',sync);
function connection(){host.querySelector('#pwa-network').hidden=navigator.onLine;document.body.classList.toggle('app-offline',!navigator.onLine);sync();if(dialog.open)status.textContent=installStatus();}
window.addEventListener('online',connection);window.addEventListener('offline',connection);sync();connection();
export function pwaSettingsHTML(){return `<section class="card pwa-settings"><h2>Dùng như ứng dụng</h2><p>Cài Tư duy Toán để mở từ màn hình chính. Tài khoản và dữ liệu dùng chung với bản web.</p><p class="pwa-installed-label">Bạn đang mở ứng dụng đã cài.</p><button type="button" class="btn secondary" data-install-app>Cài đặt / xem hướng dẫn</button></section>`;}
