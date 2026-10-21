import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='private/datatm-supplement';
const candidates=JSON.parse(await fs.readFile(`${root}/phase1-candidates.json`,'utf8'));
// Explicit independent calculations/reasoning; no wholesale approval of extracted source keys.
const specs=[
 ['source-b2ce43b24979e935ce-20','Tỉ lệ thức','a = 24; b = 42','Đặt a = 4k, b = 7k. Vì b − a = 18 nên 3k = 18, k = 6. Suy ra a = 24, b = 42.',['a = 24; b = 42','a = 18; b = 36','a = 12; b = 21','a = 42; b = 24']],
 ['source-73dcc71fba76f3d654-18','Tỉ lệ thức','42','Đặt ba số là 2k, 5k, 7k. Hiệu số lớn nhất và bé nhất là 5|k| = 30. Nếu k > 0 thì số lớn nhất là 42; nếu k < 0 thì số lớn nhất là −12. Đề thiếu điều kiện ba số dương.',null,'reject'],
 ['source-5ae80c98787a6fac91-4','Biểu thức đại số','2','Biểu thức 3x − 5 gồm hai hạng tử là 3x và −5.',['2','1','3','5']],
 ['source-5ae80c98787a6fac91-6','Biểu thức đại số','50t','Quãng đường bằng vận tốc nhân thời gian: s = 50 × t = 50t (km).',['50t','50 + t','50 − t','t/50']],
 ['source-5ae80c98787a6fac91-9','Giá trị biểu thức','-9','Thay m = −1, n = 2: P = 7 × (−1) + 2 × 2 − 6 = −7 + 4 − 6 = −9.',['-9','5','-17','9']],
 ['source-5ae80c98787a6fac91-12','Biểu thức đại số','m(m + 1)','Hai số tự nhiên liên tiếp có số nhỏ hơn là m thì số còn lại là m + 1. Tích là m(m + 1).',['m(m + 1)','m(m − 1)','2m','m + 1']],
 ['source-5ae80c98787a6fac91-13','Biểu thức đại số','75t','Hai xe đi ngược chiều nên tổng quãng đường đến lúc gặp là 40t + 35t = 75t (km).',['75t','5t','40t','35t']],
 ['source-5ae80c98787a6fac91-14','Giá trị biểu thức','1007','Từ 2x + 1 = 2015 suy ra 2x = 2014, nên x = 1007.',['1007','1008','2014','2016']],
 ['source-5ae80c98787a6fac91-16','Giá trị biểu thức','3','Vì |x − 2| ≥ 0 nên P ≥ 3. Dấu bằng đạt khi x = 2, vì vậy giá trị nhỏ nhất của P là 3.',['3','2','0','5']],
 ['source-5ae80c98787a6fac91-21','Biểu thức đại số','y','Nửa chu vi là x + y. Trừ chiều rộng x được chiều dài y.',['y','x','x + y','2y']],
 ['source-0255242dc403d4e74d-6','Đa thức một biến','0','Đa thức hằng khác 0 có bậc 0; ở đây S(x) = 5 khác 0.',['0','1','5','Không xác định']],
 ['source-0255242dc403d4e74d-11','Đa thức một biến','4x - 8','Chu vi là 2[x + (x − 4)] = 4x − 8 (m); kích thước có nghĩa khi x > 4.',['4x - 8','2x - 4','4x + 8','2x + 4']],
 ['source-0255242dc403d4e74d-16','Đa thức một biến','3x + 5','f(0) = b = 5. Từ f(−1) = −a + 5 = 2 suy ra a = 3. Vậy f(x) = 3x + 5.',['3x + 5','-3x + 5','3x - 5','2x + 5']],
 ['source-0255242dc403d4e74d-17','Đa thức một biến','Có','f(a) − f(b) = 2(a − b). Do a > b nên 2(a − b) > 0, suy ra f(a) > f(b).',['Có','Không','Chỉ khi a và b dương','Chỉ khi a và b nguyên']],
 ['source-282db0a0de7a1979e4-8','Cộng đa thức một biến','5','Đa thức bậc 3 không chứa hạng tử bậc 5 nên không thể triệt tiêu hạng tử bậc cao nhất của đa thức bậc 5. Tổng có bậc 5.',['5','3','8','2']],
 ['source-5538816df4e737f5ad-3','Biến cố','Biến cố chắc chắn','Các mặt của xúc xắc mang số chấm từ 1 đến 6, tất cả đều nhỏ hơn 7.',['Biến cố chắc chắn','Biến cố không thể','Biến cố ngẫu nhiên','Không đủ dữ kiện']],
 ['source-5538816df4e737f5ad-4','Biến cố','Biến cố không thể','Số chấm của một mặt xúc xắc không vượt quá 6, nên không thể xuất hiện số chấm lớn hơn 7.',['Biến cố không thể','Biến cố chắc chắn','Biến cố ngẫu nhiên','Không đủ dữ kiện']],
 ['source-5538816df4e737f5ad-16','Biến cố','Biến cố không thể','Chỉ lấy hai quả bóng thì nhiều nhất có hai màu, không thể có đủ ba màu.',['Biến cố không thể','Biến cố chắc chắn','Biến cố ngẫu nhiên','Không đủ dữ kiện']],
 ['source-58c271e8858928b7a6-17','Biểu thức đại số','3x - 7','Diện tích còn lại là (x + 3)(x − 2) − (x − 1)² = x² + x − 6 − (x² − 2x + 1) = 3x − 7. Tuy nhiên hình vuông cạnh x − 1 lớn hơn chiều rộng x − 2 nên không thể cắt nguyên hình vuông như mô tả.',null,'reject'],
 ['source-6e887794e19ba11cfa-4','Tỉ lệ nghịch','','Chiều dài:chiều rộng = 5:4. Nếu diện tích 200 thì dài = 5√10 cm, không phải 10 cm.',null,'reject'],
 ['source-6e887794e19ba11cfa-15','Tỉ lệ nghịch','','51 / 0,35 = 1020/7 mét, không phải 60 mét.',null,'reject'],
 ['source-5538816df4e737f5ad-9','Biến cố','','Tổng có thể chẵn hoặc lẻ, nên là biến cố ngẫu nhiên, không phải không thể.',null,'reject'],
 ['source-df5cf889c8f051ccc6-20','Tỉ lệ thuận','','Đề hỏi 10 kg dây nặng bao nhiêu kg nhưng đáp án 86 kg; đơn vị hoặc dữ kiện bị sai.',null,'reject'],
 ['source-73dcc71fba76f3d654-20','Tỉ lệ thức','','Thiếu điều kiện các số dương; hệ số chung có thể là 5 hoặc −5, nên số lớn nhất không duy nhất.',null,'reject'],
];
const original=JSON.parse(await fs.readFile('data/question-library.json','utf8')).questions;
const key=q=>q.grade+':'+q.prompt.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]+/gu,'');
const previous=JSON.parse(await fs.readFile('data/datatm-supplement-reviewed.json','utf8').catch(()=>'{"questions":[]}')).questions;
const ownIds=new Set(specs.map(s=>'supplement-'+s[0])),retained=previous.filter(q=>!ownIds.has(q.id));
const seen=new Set([...original,...retained].map(key)),questions=[],decisions=[];
for(const [id,topic,answer,solution,choices,status] of specs){
 const c=candidates.find(q=>q.id===id);if(!c)throw Error('Missing reviewed source '+id);
 const hash=createHash('sha256').update(await fs.readFile(c.source.file)).digest('hex');if(hash!==c.source.sha256||c.unsafe)throw Error('Changed/unsafe reviewed source '+id);
 if(status==='reject'){decisions.push({id,status:'rejected',reason:solution,source:c.source});continue;}
 if(seen.has(key(c))){decisions.push({id,status:'duplicate'});continue;}seen.add(key(c));
 if(!choices?.includes(answer)||new Set(choices).size!==4)throw Error('Invalid reviewed choices');
 const correctIndex=questions.length%4,rotated=[...choices];rotated.splice(rotated.indexOf(answer),1);rotated.splice(correctIndex,0,answer);
 questions.push({id:'supplement-'+id,grade:c.grade,topic,tags:[topic],level:'Cơ bản',prompt:c.prompt,answer,unit:'',solution,choices:rotated,correctIndex,formats:['mcq','essay'],rubric:[{id:'method',points:7,description:solution},{id:'result',points:3,description:'Kết luận đúng: '+answer}],source:{...c.source,originalAnswer:c.sourceSolution},review:{status:'verified',method:'Đọc câu gốc, kiểm tra độc lập đáp án và viết lời giải; lựa chọn trắc nghiệm do ứng dụng bổ sung.'},adaptation:'Giữ câu dẫn từ tài liệu, bổ sung lựa chọn trắc nghiệm và lời giải đã kiểm tra.'});
 decisions.push({id,status:'verified'});
}
await fs.writeFile('data/datatm-supplement-reviewed.json',JSON.stringify({version:1,questions:[...retained,...questions]},null,2));
await fs.writeFile(`${root}/phase1-review.json`,JSON.stringify({documents:'Original documents are teacher-only until content review.',decisions,pending:candidates.length-decisions.length},null,2));
console.log(JSON.stringify({verified:questions.length,rejected:decisions.filter(d=>d.status==='rejected').length,duplicates:decisions.filter(d=>d.status==='duplicate').length,pending:candidates.length-decisions.length}));
