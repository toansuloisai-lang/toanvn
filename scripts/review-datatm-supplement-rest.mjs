import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='private/datatm-supplement',rows=JSON.parse(await fs.readFile(`${root}/phase2-candidates.json`,'utf8'));
const specs=[
 ['source-c1f511af3ffb887fe9-3','Phân số','-17/8','Phép chia a : b với b khác 0 được viết thành phân số a/b. Do đó (−17) : 8 = −17/8.',['-17/8','17/8','-8/17','8/17']],
 ['source-c1f511af3ffb887fe9-11','Phân số','-3/7','Tử số viết phía trên là −3, mẫu số viết phía dưới là 7 nên phân số là −3/7.',['-3/7','3/7','7/3','-7/3']],
 ['source-c1f511af3ffb887fe9-12','Phân số','6','A có một số âm là −2 và ba số dương là 1, 3, 4. Chọn tử âm, mẫu dương được 3 phân số; chọn tử dương, mẫu âm được 3 phân số. Tổng cộng 6.',['6','3','9','12']],
 ['source-c1f511af3ffb887fe9-18','Phân số bằng nhau','400/600','Nhân cả tử và mẫu của 2/3 với 200 được 400/600.',['400/600','200/600','300/600','500/600']],
 ['source-c1f511af3ffb887fe9-19','Phân số bằng nhau','50/100','Nhân cả tử và mẫu của 5/10 với 10 được 50/100.',['50/100','5/100','10/100','25/100']],
 ['source-c1f511af3ffb887fe9-20','Phân số bằng nhau','4/12','Ban đầu Lan ăn 2/6 chiếc bánh. Chia mỗi phần thành hai miếng làm tử và mẫu cùng gấp đôi, được 4/12.',['4/12','2/12','4/6','3/4']],
 ['source-075023a052fd855b02-8','So sánh phân số','Thứ Bảy','Vận tốc thứ Bảy là 31/2 km/h; Chủ nhật là 46/3 km/h. Vì 31 × 3 = 93 > 92 = 46 × 2 nên thứ Bảy nhanh hơn.',['Thứ Bảy','Chủ nhật','Hai ngày bằng nhau','Không so sánh được']],
 ['source-075023a052fd855b02-11','So sánh phân số','Tổ 1','Trung bình tổ 1 là 115/8 = 14,375 dm, tổ 2 là 138/10 = 13,8 dm. Vì 14,375 > 13,8 nên tổ 1 lớn hơn.',['Tổ 1','Tổ 2','Hai tổ bằng nhau','Không đủ dữ kiện']],
 ['source-075023a052fd855b02-14','So sánh phân số','Kéo co','Quy đồng về mẫu 20: bóng đá 10/20, bóng chuyền 8/20, kéo co 11/20, cầu lông 6/20. Lớn nhất là 11/20 nên kéo co được đăng kí nhiều nhất.',['Kéo co','Bóng đá','Bóng chuyền','Cầu lông']],
 ['source-579ead99a807283a16-4','Nhân phân số','7/25','Theo dữ kiện đề bài, diện tích rừng tự nhiên chiếm (2/5) × (7/10) = 14/50 = 7/25 diện tích đất.',['7/25','9/10','7/10','14/25']],
 ['source-579ead99a807283a16-13','Chia phân số','5625','Một giờ có 3600 giây. Số linh kiện kiểm tra được là 3600 : (16/25) = 3600 × 25/16 = 5625.',['5625','2304','2250','5760']],
 ['source-579ead99a807283a16-17','Bài toán phân số','144','Vận tốc dòng nước 50 m/phút = 3 km/h. Gọi quãng đường là s km, ta có s/6 − s/8 = 2 × 3, suy ra s/24 = 6, nên s = 144 km.',['144','72','48','288']],
 ['source-579ead99a807283a16-20','Bài toán phân số','Ngọc 40 000 đồng; Hà 36 000 đồng','Gọi số tiền của Ngọc là N, của Hà là H. Từ 3N/5 = 2H/3 suy ra 9N = 10H, nên N:H = 10:9. Một phần là 76000/19 = 4000 đồng, suy ra N = 40000 đồng và H = 36000 đồng.',['Ngọc 40 000 đồng; Hà 36 000 đồng','Ngọc 36 000 đồng; Hà 40 000 đồng','Mỗi bạn 38 000 đồng','Ngọc 30 000 đồng; Hà 46 000 đồng']],
 ['source-d26bb281c5ef2d111d-2','Số thập phân','0.025','25/1000 là hai mươi lăm phần nghìn, viết dưới dạng số thập phân là 0,025.',['0.025','0.25','2.5','0.0025']],
 ['source-d26bb281c5ef2d111d-3','Số thập phân','-0.256','Số đối của a là −a vì a + (−a) = 0. Do đó số đối của 0,256 là −0,256.',['-0.256','0.256','2.56','-2.56']],
 ['source-fea855ab85228a095a-4','Cộng đa thức','Giao hoán và kết hợp','Phép cộng đa thức có tính giao hoán A + B = B + A và kết hợp (A + B) + C = A + (B + C).',['Giao hoán và kết hợp','Chỉ giao hoán','Chỉ kết hợp','Không có tính chất nào']],
 ['source-fea855ab85228a095a-5','Cộng, trừ đa thức','A = B + C','Từ A − B = C, cộng B vào hai vế được A = C + B = B + C.',['A = B + C','A = B − C','A = C − B','A = −B − C']],
 ['source-fea855ab85228a095a-6','Cộng, trừ đa thức','C','Từ A = B + C suy ra A − B = (B + C) − B = C.',['C','B','A','-C']],
 ['source-fea855ab85228a095a-15','Cộng đa thức','Có','Với mọi đa thức A và B, A + B = B + A nên được phép dùng tính giao hoán.',['Có','Không','Chỉ với đa thức một biến','Chỉ với đa thức bậc nhất']],
 ['source-fea855ab85228a095a-21','Trừ đa thức','0','Mỗi hạng tử của đa thức cộng với hạng tử đối tương ứng đều bằng 0, vì vậy A − A = 0.',['0','1','A','2A']],
];
const rejected=[
 ['source-fea855ab85228a095a-3','Đề nói đa thức bị trừ nhưng đáp án lại đổi dấu toàn bộ; chỉ đổi dấu các hạng tử của đa thức trừ.'],
 ['source-6b5510601119bb302c-8','AC và BC giao tại C, nên M = C; tam giác MCD bị suy biến.'],
 ['source-bd38988b0a09c5fbc4-14','Thiếu dữ kiện xác định chu vi ADME; chỉ biết AC = 6 không suy ra chu vi 12.'],
 ['source-c132ac909c1cd37332-6','Đáp án 28 và 40 không thỏa đề: 28/7 − 40/5 = −4, không phải 4.'],
 ['source-579ead99a807283a16-15','Đáp án 24 sai: 24 : (17/12) = 288/17 không nguyên. Nếu bao gồm số tự nhiên 0 thì nhỏ nhất là 0; nếu yêu cầu dương thì là 136.'],
 ['source-d26bb281c5ef2d111d-4','Đề yêu cầu phân số thập phân, đáp án nguồn 1/4 không có mẫu là lũy thừa của 10; dạng phù hợp là 25/100.'],
];
const base=JSON.parse(await fs.readFile('data/question-library.json','utf8')).questions;
const supplement=JSON.parse(await fs.readFile('data/datatm-supplement-reviewed.json','utf8'));
const ownIds=new Set(specs.map(s=>'supplement-'+s[0]));supplement.questions=supplement.questions.filter(q=>!ownIds.has(q.id));
const key=q=>q.grade+':'+q.prompt.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]+/gu,'');
const seen=new Set([...base,...supplement.questions].map(key)),decisions=[];
for(const [id,topic,answer,solution,choices] of specs){
 const c=rows.find(r=>r.id===id);if(!c||c.unsafe)throw Error('Unsafe/missing source '+id);
 if(createHash('sha256').update(await fs.readFile(c.source.file)).digest('hex')!==c.source.sha256)throw Error('Changed source');
 if(seen.has(key(c))){decisions.push({id,status:supplement.questions.some(q=>q.id==='supplement-'+id)?'verified':'duplicate'});continue;}
 seen.add(key(c));const correctIndex=supplement.questions.length%4,options=[...choices];options.splice(options.indexOf(answer),1);options.splice(correctIndex,0,answer);
 supplement.questions.push({id:'supplement-'+id,grade:c.grade,topic,tags:[topic],level:'Cơ bản',prompt:c.prompt,answer,unit:'',solution,choices:options,correctIndex,formats:['mcq','essay'],rubric:[{id:'method',points:7,description:solution},{id:'result',points:3,description:'Kết luận đúng: '+answer}],source:{...c.source,originalAnswer:c.sourceSolution},review:{status:'verified',method:'Tính hoặc lập luận độc lập từ dữ kiện; giữ đáp án nguồn trong thông tin xuất xứ.'},adaptation:'Giữ câu dẫn, bổ sung lựa chọn trắc nghiệm và lời giải đã kiểm tra.'});
 decisions.push({id,status:'verified'});
}
for(const [id,reason] of rejected){const c=rows.find(r=>r.id===id);if(!c)throw Error('Missing rejected source');decisions.push({id,status:'rejected',reason,source:c.source});}
await fs.writeFile('data/datatm-supplement-reviewed.json',JSON.stringify(supplement,null,2));
await fs.writeFile(`${root}/phase2-review.json`,JSON.stringify({decisions,pending:rows.length-decisions.length},null,2));
console.log(JSON.stringify({added:decisions.filter(d=>d.status==='verified').length,rejected:rejected.length,totalSupplement:supplement.questions.length}));
