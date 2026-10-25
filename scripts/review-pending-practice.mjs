import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const pending=await read('data/datatm-screened-pending.json'),supplement=await read('data/datatm-supplement-reviewed.json');
// Each answer below was reasoned independently, including corrections to source keys.
const specs=[
 ['source-c71acdf390af57f5b3-51','Số thập phân','35 USD','Mỗi bánh sau giảm giá: 10,25 − 1,5 = 8,75 USD. Bốn bánh hết 4 × 8,75 = 35 USD.'],
 ['source-5516aa6f56171432c2-3','Biểu đồ hình quạt tròn','Hình tròn được chia thành các hình quạt','Toàn bộ hình tròn biểu diễn tổng thể; mỗi hình quạt biểu diễn một bộ phận, có góc ở tâm tỉ lệ với tỉ lệ của bộ phận đó.'],
 ['source-f110b5b8994332e31e-2','Hai đường thẳng song song','Hai đường thẳng phân biệt trong cùng mặt phẳng không có điểm chung','Trong hình học phẳng, hai đường thẳng song song là hai đường thẳng phân biệt không có điểm chung.'],
 ['source-daecf9c05d6dc21b60-19','Hai tam giác bằng nhau','Các cạnh tương ứng bằng nhau và các góc tương ứng bằng nhau','Theo định nghĩa, hai tam giác bằng nhau có ba cạnh tương ứng bằng nhau và ba góc tương ứng bằng nhau.'],
 ['source-f110b5b8994332e31e-14','Hai đường thẳng song song','Có','Hai đường thẳng có cùng hệ số góc 2 và tung độ gốc khác nhau (3 và −5), nên là hai đường thẳng phân biệt song song.'],
 ['source-4397d0a514a68ef94b-6','Tia phân giác','Tia nằm trong góc và chia góc thành hai góc bằng nhau','Tia phân giác có gốc là đỉnh góc, nằm giữa hai cạnh và tạo với hai cạnh hai góc có số đo bằng nhau.'],
 ['source-d93c7124c5ba3f6de1-9','Đường trung trực của tam giác','Trên đường trung trực của cạnh đáy','Tâm đường tròn ngoại tiếp cách đều hai đầu mút cạnh đáy, do đó thuộc đường trung trực của cạnh đáy; đây cũng là trục đối xứng của tam giác cân.'],
 ['source-15c24724e98bb08b3b-2','Biểu đồ đoạn thẳng','Biểu diễn sự thay đổi của một đại lượng theo thời gian','Các điểm ghi giá trị theo từng thời điểm được nối bằng đoạn thẳng để thể hiện xu hướng thay đổi.'],
 ['source-ecf1ccec85724cd344-20','Thứ tự thực hiện phép tính','theo thứ tự từ trái sang phải.','Các phép cộng, trừ có cùng mức ưu tiên; các phép nhân, chia cũng có cùng mức ưu tiên. Với biểu thức chỉ chứa một trong hai nhóm này, tính lần lượt từ trái sang phải.'],
 ['source-daecf9c05d6dc21b60-20','Hai tam giác bằng nhau','Cạnh – cạnh – cạnh','Nếu ba cạnh của tam giác này bằng ba cạnh tương ứng của tam giác kia thì hai tam giác bằng nhau theo trường hợp cạnh – cạnh – cạnh.'],
 ['source-4397d0a514a68ef94b-5','Hai góc đối đỉnh','Mỗi cạnh của góc này là tia đối của một cạnh của góc kia','Hai góc đối đỉnh được tạo khi hai đường thẳng cắt nhau, mỗi cạnh của góc này đối với một cạnh của góc kia.'],
 ['source-f110b5b8994332e31e-4','Hai đường thẳng song song','Khi ba đường thẳng cùng nằm trong một mặt phẳng','Trong cùng mặt phẳng, hai đường thẳng phân biệt cùng vuông góc với đường thẳng thứ ba thì song song với nhau.'],
 ['source-c2b495871d3a2ece3c-11','Đường trung trực của tam giác','Tâm đường tròn ngoại tiếp tam giác ABC','O thuộc ba đường trung trực nên OA = OB = OC. Đường tròn tâm O bán kính OA đi qua cả ba đỉnh.'],
 ['source-f110b5b8994332e31e-8','Hai đường thẳng song song','Bằng nhau','Khi một đường thẳng cắt hai đường thẳng song song, mỗi cặp góc so le trong có số đo bằng nhau.'],
 ['source-7495ab4695a22a6cdc-15','Hai tam giác bằng nhau','Không thể kết luận','Góc B không xen giữa AB và AC. Điều kiện hai cạnh và một góc không xen giữa nói chung không đủ để suy ra hai tam giác bằng nhau.'],
 ['source-4397d0a514a68ef94b-7','Tia phân giác','Hai góc có số đo bằng nhau','Theo định nghĩa, tia phân giác chia góc thành hai góc bằng nhau, mỗi góc bằng một nửa góc ban đầu.'],
 ['source-5538816df4e737f5ad-20','Biến cố ngẫu nhiên','Gieo một con xúc xắc cân đối, xuất hiện mặt 3 chấm','Có thể xuất hiện mặt 3 chấm nhưng cũng có thể xuất hiện mặt khác. Xác suất là 1/6, lớn hơn 0 và nhỏ hơn 1, nên đây là biến cố ngẫu nhiên.'],
 ['source-f110b5b8994332e31e-10','Hai đường thẳng song song','Tổng số đo bằng 180°','Một góc trong cùng phía bù với góc so le trong của góc còn lại. Hai góc so le trong bằng nhau nên tổng cặp góc trong cùng phía bằng 180°.'],
 ['source-5538816df4e737f5ad-8','Biến cố chắc chắn','Tổng số chấm trên hai con xúc xắc là số chẵn','Theo điều kiện, cả hai số chấm đều chẵn. Tổng hai số chẵn luôn chẵn nên biến cố tổng chẵn là chắc chắn trong tình huống đã cho.'],
 ['source-5538816df4e737f5ad-10','Biến cố chắc chắn','Số đồng xu xuất hiện mặt sấp không vượt quá 2','Tung hai đồng xu chỉ có thể có 0, 1 hoặc 2 mặt sấp, nên đây là biến cố chắc chắn, không phải biến cố ngẫu nhiên.'],
 ['source-7da721722ed55d0342-7','Lăng trụ đứng','6 mặt, 8 đỉnh, 12 cạnh','Lăng trụ đáy tứ giác có 2 mặt đáy và 4 mặt bên, 2 × 4 = 8 đỉnh, 2 × 4 + 4 = 12 cạnh.'],
 ['source-1dd0b7a88b2001cb38-9','Bất đẳng thức tam giác','Không','Một tam giác phải có tổng độ dài hai cạnh lớn hơn cạnh còn lại. Ở đây 2 + 5 = 7, không lớn hơn 7, nên không tồn tại tam giác.'],
 ['source-5516aa6f56171432c2-2','Biểu đồ hình quạt tròn','Biểu diễn tỉ lệ các bộ phận trong một tổng thể','Toàn bộ hình tròn ứng với 100%; các hình quạt biểu diễn phần đóng góp của từng bộ phận vào tổng thể.'],
 ['source-5538816df4e737f5ad-14','Biến cố chắc chắn','Rút được thẻ ghi số lớn hơn 2','Cả bốn số 3, 7, 8, 10 đều lớn hơn 2. Do đó mọi kết quả có thể đều làm biến cố xảy ra.'],
];
const rejected=[
 ['source-f110b5b8994332e31e-7','Đề vừa giả thiết hai đường thẳng cắt nhau vừa hỏi chúng song song; lời giải nguồn mâu thuẫn giả thiết.'],
 ['source-4397d0a514a68ef94b-20','Thiếu số đo góc cần chia; nguồn tự thêm giả thiết 60°.'],
 ['source-24d518bee46005afed-4','Lời giải nói kiểm tra thể lực, không trả lời vấn đề đánh giá đề Toán.'],
 ['source-24d518bee46005afed-6','Thiếu các phương án cho câu hỏi “khẳng định nào sau đây”.'],
 ['source-f110b5b8994332e31e-9','Góc trong cùng phía bằng nhau không đủ suy ra song song; đề lại nói hai đường thẳng cắt nhau.'],
 ['source-b0e12eb674c5aa467d-7','Đề chưa nêu đại lượng cần so sánh; a < 0 < b không suy ra khoảng cách đến O bằng nhau.'],
 ['source-f110b5b8994332e31e-6','Không đặt tên các đường thẳng; lời giải nguồn lại kết luận chúng cắt nhau. Cần viết lại hình và giả thiết.'],
 ['source-4363245ec5b345bbac-5','Câu hỏi bị cắt ở “thì có”, không xác định yêu cầu.'],
 ['source-daecf9c05d6dc21b60-21','Mô tả tương ứng các cạnh không rõ; nếu hai cặp cạnh còn lại tương ứng bằng nhau thì cạnh chung đủ cho c-c-c, trái lời giải nguồn.'],
 ['source-24d518bee46005afed-3','Chưa nêu mẫu được chọn ngẫu nhiên và đại diện; không đủ cơ sở suy rộng cho toàn trường.'],
 ['source-24d518bee46005afed-2','Chưa rõ ghi độ cận/viễn bằng số hay chỉ ghi tình trạng; cần làm rõ biến dữ liệu trước khi chấm.'],
];
const decisions=[];
for(const [id,topic,answer,solution] of specs){
 const q=pending.questions.find(q=>q.id===id);if(!q)throw Error(id);
 const fullId='supplement-'+id;
 if(!supplement.questions.some(q=>q.id===fullId)){
  let prompt=q.prompt.replace(/^<TH>\s*/,'');
  const matches=[...prompt.matchAll(/(?:^|\n)\s*([ABCD])\.\s*([^]*?)(?=\n\s*[ABCD]\.\s*|$)/g)];
  const choices=matches.length===4?matches.map(m=>m[2].trim()):null;
  const correctIndex=choices?.findIndex(c=>c===answer)??-1;
  if(choices&&correctIndex<0)throw Error('Answer missing '+id);
  if(choices)prompt=prompt.slice(0,matches[0].index).trim();
  supplement.questions.push({id:fullId,grade:q.grade,topic,tags:[topic],level:'Cơ bản',prompt,answer,unit:'',solution,formats:choices?['mcq','essay']:['essay'],...(choices?{choices,correctIndex}:{}),rubric:[{id:'reason',points:7,description:solution},{id:'result',points:3,description:answer}],source:{...q.source,originalAnswer:q.sourceSolution},review:{status:'verified',method:'Đọc đề, lập luận độc lập và đối chiếu lời giải nguồn; sửa hoặc loại câu thiếu điều kiện'}});
 }
 decisions.push({id,status:'verified'});
}
for(const [id,reason] of rejected)decisions.push({id,status:'needs_source_correction',reason});
await writeFile('data/datatm-supplement-reviewed.json',JSON.stringify(supplement,null,2)+'\n');
await writeFile('baocao/datatm-practice-manual-review.json',JSON.stringify({decisions},null,2)+'\n');
console.log(JSON.stringify({verified:specs.length,needsCorrection:rejected.length}));
