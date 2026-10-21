import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='private/datatm-supplement';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const phases=await Promise.all([1,2].map(n=>read(`${root}/phase${n}-candidates.json`)));
const bank=await read('data/datatm-supplement-reviewed.json');
const base=await read('data/question-library.json');
const key=q=>q.grade+':'+q.prompt.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]+/gu,'');
const specs=[
 ['source-5538816df4e737f5ad-21','Biến cố chắc chắn','Mọi phần tử của tập {1; 3; 5; 7; 9} đều là số lẻ, nên chọn được số lẻ luôn xảy ra. Đáp án nguồn ngẫu nhiên là sai.',['Biến cố chắc chắn','Biến cố không thể','Biến cố ngẫu nhiên','Không đủ dữ kiện']],
 ...[
 [2,'1','Tất cả 20 thẻ đều ghi số không lớn hơn 20. Xác suất là 20/20 = 1.',['1','0','1/20','1/2']],
 [4,'1/10','Có 10 lá thăm đồng khả năng, chỉ một lá ghi số 9. Xác suất là 1/10.',['1/10','9/10','1/9','1']],
 [5,'Lớp 7B','Tổng có 13 học sinh. Xác suất chọn học sinh 7A, 7B, 7C lần lượt là 3/13, 6/13, 4/13. Lớp 7B có xác suất cao nhất.',['Lớp 7B','Lớp 7A','Lớp 7C','Ba lớp như nhau']],
 [6,'1/6','Xúc xắc cân đối có 6 mặt đồng khả năng; chỉ một mặt có 6 chấm. Xác suất là 1/6.',['1/6','1/3','1/2','1']],
 [8,'0','Hộp không có quả cầu trắng nên không thể lấy được hai quả cầu trắng. Xác suất bằng 0.',['0','1','1/14','2/14']],
 [9,'1/2','Các ước dương của 4 trên xúc xắc là 1, 2, 4. Có 3 kết quả thuận lợi trên 6 kết quả đồng khả năng: 3/6 = 1/2.',['1/2','1/3','2/3','1/6']],
 [10,'0','Mỗi con xúc xắc có ít nhất 1 chấm nên tổng ít nhất là 2. Tổng bằng 1 là không thể, xác suất bằng 0.',['0','1','1/6','1/36']],
 [11,'1','Tổng số chấm của hai xúc xắc luôn ít nhất là 2, nên luôn lớn hơn 1. Xác suất bằng 1.',['1','0','1/2','35/36']],
 [13,'0','Xúc xắc 6 mặt có tối đa 6 chấm. Không có mặt nào nhiều hơn 6 chấm nên xác suất bằng 0.',['0','1','1/6','5/6']],
 [18,'1/2','Đồng xu cân đối, đồng chất có hai mặt đồng khả năng. Mặt sấp là một trong hai kết quả nên xác suất là 1/2.',['1/2','0','1','1/4']],
 [19,'1/2','Hai mặt của đồng xu cân đối, đồng chất đồng khả năng. Xác suất xuất hiện mặt ngửa là 1/2.',['1/2','0','1','1/4']],
 [21,'1/2','Có 4 ngôi sao đồng khả năng, 2 ngôi sao màu tím hoặc đỏ. Xác suất là 2/4 = 1/2.',['1/2','1/4','3/4','1']],
 [22,'0','Theo định nghĩa, biến cố không thể có xác suất bằng 0.',['0','1','1/2','-1']],
 [23,'0','Xúc xắc 6 mặt không có mặt 7 chấm nên biến cố không thể xảy ra, xác suất bằng 0.',['0','1','1/6','1/7']],
 ].map(s=>[`source-4211edf5e950955c4f-${s[0]}`,...s.slice(1)]),
 ...[
 [4,'Góc C < góc B < góc A','Có B + C = 100° và B - C = 20°, suy ra B = 60°, C = 40°. Vì A = 80° nên C < B < A. Đáp án nguồn so sánh cạnh không trả lời đúng yêu cầu so sánh góc.',['Góc C < góc B < góc A','Góc A < góc B < góc C','Góc B < góc C < góc A','Góc C < góc A < góc B']],
 [8,'BD > CD','Do góc C > góc B nên AB > AC. Theo định lý phân giác, BD/CD = AB/AC > 1, suy ra BD > CD. Đáp án nguồn BC > CD không trả lời yêu cầu.',['BD > CD','BD < CD','BD = CD','Không thể so sánh']],
 [2,'Góc P < góc N < góc M','Cạnh MN đối diện góc P, MP đối diện góc N, NP đối diện góc M. Trong tam giác, cạnh lớn hơn đối diện góc lớn hơn.',['Góc P < góc N < góc M','Góc M < góc N < góc P','Góc N < góc P < góc M','Góc P = góc N = góc M']],
 [3,'Góc đối diện cạnh 9 cm','Trong tam giác, góc nhỏ nhất đối diện cạnh ngắn nhất. Cạnh ngắn nhất là 9 cm.',['Góc đối diện cạnh 9 cm','Góc đối diện cạnh 12 cm','Góc đối diện cạnh 15 cm','Ba góc bằng nhau']],
 [5,'BC < AC < AB','Các góc A, B, C tỉ lệ 3 : 5 : 7 nên A < B < C. Các cạnh đối diện tương ứng thỏa BC < AC < AB.',['BC < AC < AB','AB < AC < BC','AC < BC < AB','BC = AC = AB']],
 [6,'Góc C < góc B < góc A','Các cạnh AB, AC, BC đối diện lần lượt các góc C, B, A. Do AB < AC < BC nên góc C < góc B < góc A.',['Góc C < góc B < góc A','Góc A < góc B < góc C','Góc B < góc C < góc A','Ba góc bằng nhau']],
 [14,'BC < AB < AC','Góc C = 180° - 95° - 40° = 45°. Vậy A < C < B, suy ra BC < AB < AC.',['BC < AB < AC','AB < BC < AC','AC < AB < BC','BC < AC < AB']],
 [16,'BC < AB < AC','Góc C = 180° - 70° - 50° = 60°. Do A < C < B nên BC < AB < AC.',['BC < AB < AC','AB < BC < AC','AC < AB < BC','BC < AC < AB']],
 ].map(s=>[`source-cf19d396b7aec0cfd2-${s[0]}`,...s.slice(1)]),
 ['source-73dcc71fba76f3d654-7','x = -2; y = 5','Đặt x = 2k, y = -5k. Khi đó 7k = -7 nên k = -1, suy ra x = -2, y = 5.',['x = -2; y = 5','x = 2; y = -5','x = -5; y = 2','x = 2; y = 5']],
 ['source-73dcc71fba76f3d654-9','x = -12; y = -28','Từ 7x = 3y đặt x = 3k, y = 7k. Khi đó -4k = 16 nên k = -4; x = -12, y = -28.',['x = -12; y = -28','x = 12; y = 28','x = -28; y = -12','x = 12; y = -4']],
 ['source-73dcc71fba76f3d654-12','16','Số tờ từng loại tỉ lệ nghịch với mệnh giá nên có tỉ lệ 5 : 2 : 1. Tổng 8 phần là 64 tờ, mỗi phần 8 tờ. Loại 5000 đồng có 2 × 8 = 16 tờ.',['16','8','32','40']],
 ['source-73dcc71fba76f3d654-13','8','Từ giỏi : khá = 2 : 3 và khá : trung bình = 4 : 5, suy ra giỏi : khá : trung bình = 8 : 12 : 15. Tổng 35 phần ứng với 35 học sinh, nên có 8 học sinh giỏi.',['8','12','15','10']],
 ['source-73dcc71fba76f3d654-15','24','Đặt ba số là 2k, 3k, 4k. Có 9k = 54 nên k = 6 > 0. Số lớn nhất là 4k = 24.',['24','12','18','27']],
 ['source-73dcc71fba76f3d654-16','6','Khối lượng muối bằng 3/7 khối lượng nước: 14 × 3/7 = 6 kg.',['6','14','20','3']],
 ['source-73dcc71fba76f3d654-17','8','Công việc cần 4 × 12 = 48 người-ngày. Sáu người cùng năng suất làm trong 48 : 6 = 8 ngày.',['8','18','6','12']],
 ['source-73dcc71fba76f3d654-19','360','Năng suất mỗi công nhân mỗi ngày là 120 : (8 × 5) = 3 sản phẩm. Mười hai người làm 10 ngày được 3 × 12 × 10 = 360 sản phẩm.',['360','180','240','720']],
 ['source-df5cf889c8f051ccc6-9','15 và 25','Đặt hai số là 3k và 5k. Tổng 8k = 40 nên k = 5, hai số là 15 và 25. Đáp án nguồn 12 và 20 có tổng 32 nên sai.',['15 và 25','12 và 20','10 và 30','20 và 20']],
 ['source-6e887794e19ba11cfa-3','28','Gọi hai số là a, b, có 3a = 7b nên a : b = 7 : 3. Tổng 40 cho a = 28, b = 12; số lớn hơn là 28. Đáp án nguồn 30 không thỏa tỉ lệ.',['28','30','12','24']],
 ['source-6e887794e19ba11cfa-11','28','Tỉ lệ hai số là 7 : 5. Tổng 48 nên mỗi phần là 4, hai số là 28 và 20. Số lớn hơn là 28.',['28','20','24','35']],
 ['source-6e887794e19ba11cfa-17','300','Gọi quãng đường là s km. Có s/60 + s/50 = 11, tức 11s/300 = 11, suy ra s = 300 km.',['300','330','600','250']],
 ['source-6e887794e19ba11cfa-18','28','Công việc cần 56 × 21 = 1176 người-ngày. Làm trong 14 ngày cần 1176 : 14 = 84 người; cần tăng thêm 84 - 56 = 28 người.',['28','84','56','14']],
 ['source-6e887794e19ba11cfa-20','10','Vì diện tích và năng suất như nhau nên số máy nhân số ngày bằng nhau. Đặt số máy ba đội là 10k, 6k, 5k. Đội hai hơn đội ba 1 máy cho k = 1; đội một có 10 máy.',['10','6','5','15']],
 ['source-5538816df4e737f5ad-15','{1; 3; 5; 7; 9}','Các số chia 2 dư 1 là số lẻ. Trong các số từ 1 đến 10, đó là 1, 3, 5, 7, 9.',['{1; 3; 5; 7; 9}','{2; 4; 6; 8; 10}','{1; 2; 3; 4; 5}','{3; 6; 9}']],
 ['source-6e887794e19ba11cfa-6','81/13','Đặt ba số là k/2, k/3, k/4. Tổng là 13k/12 = 27 nên k = 324/13 > 0. Số nhỏ nhất là k/4 = 81/13. Đáp án 6 của nguồn sai vì 6 + 8 + 12 = 26, không phải 27.',['81/13','6','9','12']],
 ['source-282db0a0de7a1979e4-2','Đổi dấu rồi cộng','Trừ một đa thức là cộng với đa thức đối của nó. Vì vậy đổi dấu từng hạng tử của đa thức trừ rồi cộng với đa thức bị trừ.',['Đổi dấu rồi cộng','Giữ nguyên dấu rồi cộng','Chỉ đổi dấu hạng tử đầu','Đổi dấu đa thức bị trừ']],
 ['source-5538816df4e737f5ad-2','Biến cố không bao giờ xảy ra','Theo định nghĩa, biến cố không thể không xảy ra trong bất kỳ kết quả nào của phép thử đang xét.',['Biến cố không bao giờ xảy ra','Biến cố luôn xảy ra','Biến cố có thể xảy ra hoặc không','Biến cố có xác suất bằng 1']],
 ['source-5538816df4e737f5ad-6','Biến cố luôn xảy ra','Biến cố chắc chắn xảy ra với mọi kết quả có thể của phép thử đang xét.',['Biến cố luôn xảy ra','Biến cố không bao giờ xảy ra','Biến cố có thể xảy ra hoặc không','Biến cố chỉ xảy ra một lần']],
 [2,'10','Đặt x = 2k, y = 3k, z = 5k. Khi đó 10k = 50 nên k = 5, suy ra x = 10.',['10','15','25','5']],
 [8,'21','Khối lượng công việc là 18 × 14 = 252 máy-ngày. Trong 12 ngày cần 252 : 12 = 21 máy cùng năng suất.',['21','18','24','16']],
 [10,'28','Tỉ lệ xăng trên dầu là 7/2. Với 8 lít dầu cần 8 × 7/2 = 28 lít xăng.',['28','16','56','14']],
 [11,'2','Công việc cần 2 × 4 = 8 máy-ngày. Bốn máy cùng năng suất hoàn thành trong 8 : 4 = 2 ngày.',['2','4','8','1']],
 [13,'20','Gạo nếp bằng 2/3 lượng gạo tẻ, nên cần 30 × 2/3 = 20 kg gạo nếp.',['20','45','15','25']],
 [15,'18','Sơn đen bằng 3/2 lượng sơn trắng. Cần 12 × 3/2 = 18 lít sơn đen.',['18','8','24','30']],
 [16,'90','Quãng đường là 60 × 6 = 360 km. Đi trong 4 giờ cần vận tốc 360 : 4 = 90 km/h.',['90','40','80','120']],
 [17,'36','Đặt ba số là 2k, 3k, 4k. Từ 9k = 81 suy ra k = 9 > 0. Số lớn nhất là 4k = 36.',['36','18','27','9']],
 [19,'240','Nửa chu vi là 32 cm. Đặt chiều dài 5k, chiều rộng 3k thì 8k = 32 nên k = 4. Diện tích là 20 × 12 = 240 cm².',['240','120','480','64']],
 [21,'4','Hai vòi có cùng tốc độ nên lưu lượng tổng gấp đôi. Thời gian đầy thùng là 8 : 2 = 4 giờ.',['4','8','16','2']],
];
const seen=new Set([...base.questions,...bank.questions].map(key));
const verified=[];
for(const [ordinal,answer,solution,choices] of specs){
 const c=phases[0].find(q=>q.id===(typeof ordinal==='string'?ordinal:`source-b2ce43b24979e935ce-${ordinal}`));
 if(!c||c.unsafe)throw Error('Missing or unsafe source');
 if(createHash('sha256').update(await fs.readFile(c.source.file)).digest('hex')!==c.source.sha256)throw Error('Source changed');
 if(seen.has(key(c)))continue;
 const correctIndex=bank.questions.length%4,options=choices.filter(x=>x!==answer);options.splice(correctIndex,0,answer);
 const topic=c.id.includes('4211edf')?'Xác suất':c.id.includes('cf19d396')?'Quan hệ cạnh và góc trong tam giác':c.id.includes('5538816')?'Biến cố':c.id.includes('282db0')?'Trừ đa thức':'Tỉ lệ thức và đại lượng tỉ lệ';
 bank.questions.push({id:'supplement-'+c.id,grade:c.grade,topic,tags:[topic],level:'Cơ bản',prompt:c.prompt,answer,unit:'',solution,choices:options,correctIndex,formats:['mcq','essay'],rubric:[{id:'method',points:7,description:solution},{id:'result',points:3,description:'Kết luận đúng: '+answer}],source:{...c.source,originalAnswer:c.sourceSolution},review:{status:'verified',method:'Đọc câu nguồn và tính độc lập; kiểm tra bốn lựa chọn.'},adaptation:'Giữ câu dẫn, bổ sung lựa chọn và lời giải đã kiểm tra; đáp án nguồn được lưu riêng để đối chiếu.'});
 seen.add(key(c));verified.push(c.id);
}
await fs.writeFile('data/datatm-supplement-reviewed.json',JSON.stringify(bank,null,2));
const reviewed=new Map(bank.questions.filter(q=>q.source).map(q=>[q.id.replace(/^supplement-/,''),'verified']));
const existingKeys=new Set(base.questions.map(key));
for(const n of [1,2])for(const d of (await read(`${root}/phase${n}-review.json`)).decisions)if(d.status==='rejected')reviewed.set(d.id,'rejected');
const groups=new Map(),rows=[],counts={};
for(const [i,phase] of phases.entries())for(const c of phase){
 const k=key(c),canonical=groups.get(k);if(!canonical)groups.set(k,c.id);
 let status=reviewed.get(c.id);
 if(!status)status=!c.unsafe&&existingKeys.has(k)?'already_in_bank':canonical?'duplicate_candidate':c.unsafe?'needs_visual_review':c.prompt.trim().length<25?'short_or_heading_review':!c.sourceSolution?.trim()?'needs_solution_review':'needs_math_review';
 counts[status]=(counts[status]||0)+1;
 rows.push({id:c.id,phase:i+1,grade:c.grade,status,...(canonical?{duplicateOf:canonical}:{}),source:c.source});
}
const summary={total:rows.length,counts,addedThisRun:verified.length,totalSupplement:bank.questions.length,totalBank:base.questions.length+bank.questions.length,note:'Structural screening is not mathematical approval. Duplicate candidates require comparison of original formulas and figures. Originals retained; no production writes.'};
await fs.writeFile(`${root}/screening.json`,JSON.stringify({summary,rows},null,2));
await fs.writeFile(`${root}/screening-summary.json`,JSON.stringify(summary,null,2));
await fs.writeFile('baocao/Ket_qua_sang_loc_DATATM.md',`# Kết quả sàng lọc DATATM\n\nĐã phân luồng ${summary.total} mục. Sàng lọc cấu trúc không thay thế kiểm tra toán học.\n\n| Nhóm | Số mục |\n|---|---:|\n${Object.entries(counts).map(([k,v])=>`| ${k} | ${v} |`).join('\n')}\n\nKho bổ sung có ${bank.questions.length} câu đã kiểm tra độc lập. Tổng kho chung: ${summary.totalBank} câu.\n\nalready_in_bank: câu dẫn trùng kho gốc, không thêm lại; duplicate_candidate: nghi trùng trong phần trích xuất, cần đối chiếu hình/công thức gốc. Các mục needs_* và short_or_heading_review chưa duyệt.\n\nMột số đáp án nguồn sai đã được tính lại, giữ nguyên đáp án gốc trong xuất xứ. Ví dụ: ba số tỉ lệ nghịch 2, 3, 4 có tổng 27 cho số nhỏ nhất 81/13; hai số tỉ lệ 3 : 5 có tổng 40 là 15 và 25; chọn số lẻ trong tập toàn số lẻ là biến cố chắc chắn.\n\nKhông xóa bản gốc. Chưa push, chưa cập nhật web hoặc Supabase. Chi tiết từng mục: private/datatm-supplement/screening.json.\n`);
console.log(JSON.stringify(summary,null,2));
