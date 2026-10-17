const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const axes=[['numbers','Số và phép tính'],['algebra','Biểu thức đại số'],['equations','Phương trình, hàm số'],['geometry','Hình học phẳng'],['solids','Hình học không gian'],['statistics','Thống kê, xác suất']];
function domain(value){const s=normal(value);if(/xac suat|thong ke|du lieu|statistics/.test(s))return 'statistics';if(/chop|the tich|khong gian/.test(s))return 'solids';if(/phuong trinh|ham so|equation|systems|quadratic/.test(s))return 'equations';if(/giac|hinh|goc|thales|pythag|angles|circle|area|trig/.test(s))return 'geometry';if(/thuc|hang dang|nhan tu|da thuc|don thuc|phan phoi|binh phuong|thu gon|hieu hai|distribute|combine|identity|roots/.test(s))return 'algebra';return 'numbers';}
export function studentAnalytics(report,usage=null,history=[]){
 const radar=axes.map(([id,label])=>({id,label,correct:0,total:0,percent:null}));
 for(const s of report.bySkill||[]){if(!s.attempts)continue;const axis=radar.find(a=>a.id===domain((s.name||'')+' '+(s.skill||'')));axis.correct+=s.correct;axis.total+=s.attempts;}
 for(const a of radar)if(a.total)a.percent=Math.round(a.correct/a.total*100);
 const graded=(report.assignments||[]).filter(a=>a.result.score!==null&&!a.result.provisional&&a.result.complete);
 const days=new Map();for(const a of history){if(!a.time)continue;const key=new Date(a.time+7*3600000).toISOString().slice(0,10),d=days.get(key)||{day:key,correct:0,total:0};d.total++;d.correct+=Number(!!a.initialCorrect);days.set(key,d);}
 return {radar,total:report.total,correct:report.correct,accuracy:report.total?Math.round(report.correct/report.total*100):null,average:graded.length?Math.round(graded.reduce((n,a)=>n+a.result.score,0)/graded.length*10)/10:null,graded:graded.length,assigned:report.assignments.length,completed:report.assignments.filter(a=>a.result.complete).length,minutes:usage?Math.round(usage.totalMs/60000):null,trend:[...days.values()].sort((a,b)=>a.day.localeCompare(b.day)).slice(-14).map(d=>({...d,percent:Math.round(d.correct/d.total*100)}))};
}
