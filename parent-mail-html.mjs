const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parentMailHtml({text}){
 return '<!doctype html><html lang="vi"><body style="background:#ffffff;color:#202124;font-family:Arial,sans-serif;font-size:14px;text-align:left"><div style="line-height:1.6">'+String(text).split(/\n\s*\n/).map(p=>'<p style="margin:0 0 16px">'+esc(p).replace(/\n/g,'<br>')+'</p>').join('')+'</div></body></html>';
}
