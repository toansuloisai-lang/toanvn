import {readFile,writeFile} from 'node:fs/promises';
import {verified as round2,corrections as round2Corrections} from './pending-practice-review-round2.mjs';
import {verified as round3,corrections as round3Corrections} from './pending-practice-review-round3.mjs';
import {verified as round4,corrections as round4Corrections} from './pending-practice-review-round4.mjs';
import {verified as round5,corrections as round5Corrections} from './pending-practice-review-round5.mjs';
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
specs.push(
 ['source-a06e5596f8fa282060-6','Hai đường thẳng song song','x song song với y','Một cặp góc đồng vị bằng nhau là dấu hiệu nhận biết hai đường thẳng song song.'],
 ['source-a15081d04265db8d6c-6','Lũy thừa','Giữ nguyên cơ số, cộng hai số mũ','Với số mũ tự nhiên m, n: a^m × a^n = a^(m+n), vì tích chứa tổng cộng m + n thừa số a.'],
 ['source-74662ef38c1e29c5b3-5','Hình hộp chữ nhật','6 mặt, 8 đỉnh, 12 cạnh, 4 đường chéo','Có hai mặt đáy và bốn mặt bên, mỗi đáy có bốn đỉnh và bốn cạnh, thêm bốn cạnh bên. Mỗi cặp đỉnh đối diện tạo một đường chéo nên có bốn đường chéo.'],
 ['source-c0e96c500f65f1a3c7-4','Giá trị tuyệt đối','Khoảng cách từ điểm biểu diễn a đến gốc 0 trên trục số','Giá trị tuyệt đối là khoảng cách nên không âm; bằng a nếu a không âm và bằng −a nếu a âm.'],
 ['source-cf19d396b7aec0cfd2-17','Quan hệ giữa góc và cạnh','Góc đối diện cạnh 8 cm','Trong tam giác, cạnh lớn hơn đối diện với góc lớn hơn. Cạnh 8 cm lớn nhất nên góc đối diện lớn nhất.'],
 ['source-4397d0a514a68ef94b-13','Hai đường thẳng vuông góc','Vuông góc với nhau','Hai đường thẳng cắt nhau tạo một góc vuông thì ba góc còn lại cũng vuông, theo tính chất góc kề bù và đối đỉnh.'],
 ['source-7495ab4695a22a6cdc-14','Hai tam giác bằng nhau','Có, theo cạnh – góc – cạnh','AB = DE, AC = DF và góc A bằng góc D là hai góc xen giữa các cặp cạnh đó, đủ cho trường hợp cạnh – góc – cạnh.'],
 ['source-4397d0a514a68ef94b-4','Hai góc đối đỉnh','Bằng nhau','Hai góc đối đỉnh cùng bù với một góc kề nên có số đo bằng nhau.'],
 ['source-593ef2e198552c8c75-12','Số thập phân tuần hoàn','Chữ số 8 lặp lại vô hạn','0,56(8) = 0,568888…; phần trong ngoặc là chu kì lặp.'],
 ['source-593ef2e198552c8c75-14','Số thập phân tuần hoàn','Chữ số 5 lặp lại vô hạn','4,1(5) = 4,15555…; chữ số 5 là chu kì.'],
 ['source-593ef2e198552c8c75-15','Số thập phân tuần hoàn','Chữ số 3 lặp lại vô hạn','0,36(3) = 0,363333…; chữ số trong ngoặc được lặp vô hạn.'],
 ['source-a06e5596f8fa282060-11','Tiên đề song song','Hai đường thẳng trùng nhau','Qua một điểm ngoài một đường thẳng chỉ có một đường thẳng song song với đường đó, nên hai đường đã vẽ phải trùng nhau.'],
 ['source-a06e5596f8fa282060-4','Tiên đề song song','Ba đường thẳng trùng nhau','Tính duy nhất trong tiên đề song song buộc cả ba đường qua M song song với a phải là cùng một đường thẳng.'],
 ['source-5538816df4e737f5ad-17','Biến cố chắc chắn','Số được chọn là số lẻ','Mọi phần tử của S là 1, 3, 5, 7, 9 đều lẻ, nên biến cố luôn xảy ra.'],
 ['source-7495ab4695a22a6cdc-6','Hai tam giác bằng nhau','Hai tam giác bằng nhau','Hai cạnh tương ứng và góc xen giữa tương ứng bằng nhau là trường hợp cạnh – góc – cạnh.'],
 ['source-4397d0a514a68ef94b-15','Tia phân giác','40° và 40°','Tia phân giác chia góc 80° thành hai góc bằng nhau, mỗi góc 80° : 2 = 40°.'],
 ['source-4397d0a514a68ef94b-8','Tia phân giác','40° và 40°','Mỗi góc sau khi chia bằng một nửa góc ban đầu: 80° : 2 = 40°.'],
 ['source-c0e96c500f65f1a3c7-2','Số thực','Số hữu tỉ và số vô tỉ','Tập số thực là hợp của tập số hữu tỉ và tập số vô tỉ; hai tập này không giao nhau.'],
 ['source-4397d0a514a68ef94b-10','Tia phân giác','45° và 45°','Mỗi góc bằng 90° : 2 = 45°.'],
 ['source-cf19d396b7aec0cfd2-21','Quan hệ giữa góc và cạnh','Góc đối diện cạnh 3 cm','Cạnh 3 cm nhỏ nhất; góc đối diện cạnh nhỏ nhất là góc nhỏ nhất.'],
 ['source-5538816df4e737f5ad-11','Biến cố chắc chắn','Gieo một xúc xắc sáu mặt ghi từ 1 đến 6, số chấm xuất hiện không vượt quá 6','Tập kết quả là {1; 2; 3; 4; 5; 6}; mọi kết quả đều không vượt quá 6 nên đây là biến cố chắc chắn.'],
 ['source-15c24724e98bb08b3b-4','Biểu đồ đoạn thẳng','Thời gian trong biểu đồ biểu diễn biến thiên theo thời gian','Với biểu đồ đoạn thẳng theo thời gian, trục ngang ghi các thời điểm; trục đứng ghi giá trị đại lượng.'],
 ['source-1dd0b7a88b2001cb38-4','Bất đẳng thức tam giác','Tam giác cân tại A','Bất đẳng thức tam giác cho 8 − 1 < AB < 8 + 1, tức 7 < AB < 9. AB nguyên nên AB = 8 = AC; tam giác cân tại A.'],
 ['source-1dd0b7a88b2001cb38-6','Bất đẳng thức tam giác','Tam giác cân tại B','5 − 1 < AB < 5 + 1 nên 4 < AB < 6. AB nguyên nên AB = 5 = BC; tam giác cân tại B.'],
 ['source-24d518bee46005afed-16','Phân loại dữ liệu','Dữ liệu định tính','Dữ liệu không là số diễn tả tính chất, loại hoặc nhóm đối tượng nên được gọi là dữ liệu định tính.'],
 ['source-593ef2e198552c8c75-5','Số thập phân tuần hoàn','14,86(3) và −3,(1)','14,86(3) và −3,(1) có chu kì lặp vô hạn; 1,24 và −3,1 là các số thập phân hữu hạn.'],
 ['source-c0e96c500f65f1a3c7-12','Số thực','Số vô tỉ, đồng thời là số thực','3 không phải số chính phương nên căn bậc hai của 3 vô tỉ. Số đối của một số vô tỉ vẫn vô tỉ và thuộc tập số thực.'],
 ['source-c0e96c500f65f1a3c7-18','Số thực','Không có số nào','Số vô tỉ được định nghĩa là số thực không hữu tỉ, nên không số nào đồng thời thuộc hai loại.'],
 ['source-c1333b6c8e4405d840-13','Phân loại tam giác','Tam giác vuông','Theo định nghĩa, tam giác có một góc 90° là tam giác vuông.'],
 ['source-5ae80c98787a6fac91-3','Biểu thức đại số','Biến số hoặc đại lượng được biểu diễn bằng chữ','Chữ dùng để biểu diễn giá trị số của đại lượng; khi thay giá trị cho chữ ta tính được giá trị biểu thức.'],
 ['source-7925be4793ef96cd0c-41','Hai tam giác bằng nhau','15 cm','Theo thứ tự đỉnh tương ứng, AC = DF = 6 cm và BC = EF = HI = 5 cm. Chu vi ABC là 4 + 6 + 5 = 15 cm.'],
 ['source-c1333b6c8e4405d840-12','Phân loại tam giác','Tam giác nhọn','Tam giác có cả ba góc nhỏ hơn 90° là tam giác nhọn.'],
 ['source-4363245ec5b345bbac-10','Định lí','Nếu … thì …','Phần sau “Nếu” nêu giả thiết, phần sau “thì” nêu kết luận.'],
 ['source-b0e12eb674c5aa467d-14','Số hữu tỉ','Tử và mẫu là số nguyên, mẫu khác 0','Số hữu tỉ biểu diễn được dưới dạng a/b với a, b nguyên và b khác 0; chỉ yêu cầu mẫu khác 0 mà bỏ điều kiện số nguyên là chưa đủ.'],
 ['source-c0e96c500f65f1a3c7-14','Tỉ lệ và căn bậc hai','3,39 m và 5,09 m','Tổng số phần là 2 + 3 = 5. Hai đoạn bằng 2√72/5 và 3√72/5 mét, xấp xỉ 3,3941 và 5,0912 mét. Làm tròn hai chữ số thập phân: 3,39 m và 5,09 m. Đáp án nguồn sai.'],
 ['source-c0e96c500f65f1a3c7-17','Phương trình','2 số: 0 và 2','x² = 2x tương đương x(x − 2) = 0, nên x = 0 hoặc x = 2.'],
 ['source-c1333b6c8e4405d840-10','Phân loại tam giác','Tam giác đều','Ba góc bằng nhau và có tổng 180° nên mỗi góc 60°. Các góc bằng nhau đối diện các cạnh bằng nhau, nên tam giác đều.'],
 ['source-c1333b6c8e4405d840-14','Phân loại tam giác','Tam giác cân','Hai góc bằng nhau đối diện hai cạnh bằng nhau, nên tam giác cân.'],
 ['source-c1333b6c8e4405d840-19','Phân loại tam giác','Tam giác đều','Hai góc còn lại bằng nhau và có tổng 180° − 60° = 120°, nên mỗi góc 60°. Cả ba góc 60° nên tam giác đều; nguồn chỉ ghi cân là chưa đầy đủ.'],
 ['source-c8f62b61d243913850-6','Hai đường thẳng vuông góc','OM = ON = 4 cm','OMAN là hình chữ nhật do có ba góc vuông. Các cạnh đối bằng nhau nên OM = AN = 4 cm và ON = AM = 4 cm.'],
 ['source-74662ef38c1e29c5b3-20','Hình hộp chữ nhật','V = a × b × c','Thể tích bằng diện tích đáy nhân chiều cao: V = (a × b) × c.'],
 ['source-7da721722ed55d0342-8','Lăng trụ đứng','Hình chữ nhật','Lăng trụ đứng có các cạnh bên vuông góc với đáy, do đó các mặt bên là hình chữ nhật.'],
 ['source-c1333b6c8e4405d840-11','Phân loại tam giác','Tam giác tù','Theo định nghĩa, tam giác có một góc lớn hơn 90° là tam giác tù.'],
 ['source-7495ab4695a22a6cdc-8','Hai tam giác bằng nhau','Tam giác OBC','OA = OB, OD = OC và góc AOD bằng góc BOC vì đều là góc xOy. Suy ra OAD bằng OBC theo cạnh – góc – cạnh.'],
 ['source-7495ab4695a22a6cdc-9','Hai tam giác bằng nhau','Tam giác EKF','BA = EK, AC = KF và góc A = góc K là góc xen giữa. Đỉnh tương ứng B ↔ E, A ↔ K, C ↔ F, nên BAC bằng EKF.'],
 ['source-a06e5596f8fa282060-3','Hai đường thẳng song song','0','Hai đường thẳng song song không có điểm chung theo định nghĩa.'],
 ['source-c2b495871d3a2ece3c-12','Đường cao của tam giác','Ba đường cao','Trực tâm là giao điểm của ba đường cao hoặc đường thẳng chứa các đường cao của tam giác.'],
 ['source-c2b495871d3a2ece3c-4','Tam giác cân','Tam giác cân tại A','Hai tam giác vuông AMB và AMC có cạnh AM chung và góc BAM = MAC vì AM là phân giác. Chúng bằng nhau nên AB = AC.'],
 ['source-28c75bd9db2ea7312d-5','Đường vuông góc và đường xiên','BD + CE < AB + AC','Khoảng cách từ B tới đường AC là BD ≤ AB, dấu bằng chỉ khi AB vuông góc AC. Tương tự CE ≤ AC. Hai dấu bằng không đồng thời xảy ra trong tam giác không suy biến, nên cộng được bất đẳng thức nghiêm.'],
 ['source-ef3d2dbefc4ece07a8-11','Hai tam giác vuông bằng nhau','Tam giác KHI','Góc A = góc K = 90°, BC = HI là cạnh huyền và AB = KH là cặp cạnh góc vuông tương ứng. Suy ra ABC bằng KHI theo cạnh huyền – cạnh góc vuông.'],
 ['source-ef3d2dbefc4ece07a8-12','Hai tam giác vuông bằng nhau','Tam giác FED','AC = DF là cạnh huyền và góc A = góc F là cặp góc nhọn tương ứng. Đỉnh B ↔ E là đỉnh góc vuông, nên ABC bằng FED.'],
 ['source-74662ef38c1e29c5b3-6','Hình lập phương','Hình vuông','Hình lập phương có sáu mặt đều là các hình vuông bằng nhau.'],
 ['source-b0e12eb674c5aa467d-2','Số hữu tỉ','Q','Tập hợp số hữu tỉ được kí hiệu là Q (chữ Q kiểu bảng đen).'],
 ['source-f2044ae70d4d4e105c-10','Tốc độ trung bình','8,9 km/h','30 phút = 0,5 giờ. Vận tốc bằng quãng đường chia thời gian: 2√5 / 0,5 = 4√5 ≈ 8,9443 km/h. Làm tròn một chữ số thập phân là 8,9 km/h; nguồn ghi 6,3 là sai.'],
 ['source-28c75bd9db2ea7312d-11','Đường vuông góc và đường xiên','BD + CE < 2BC','BD là khoảng cách từ B đến AC nên BD ≤ BC. CE là khoảng cách từ C đến AB nên CE ≤ BC. Hai dấu bằng không thể đồng thời xảy ra trong một tam giác, do đó tổng nhỏ hơn 2BC.'],
 ['source-28c75bd9db2ea7312d-18','Đường vuông góc và đường xiên','Ngắn nhất','Theo định lí đường vuông góc và đường xiên, đoạn vuông góc từ một điểm đến một đường thẳng ngắn hơn mọi đường xiên từ điểm đó tới đường thẳng.'],
 ['source-4363245ec5b345bbac-2','Định lí','Giả thiết','Trong cấu trúc “Nếu P thì Q”, P là giả thiết và Q là kết luận.'],
 ['source-74662ef38c1e29c5b3-11','Hình hộp chữ nhật','Song song và bằng nhau','Các cạnh bên của hình hộp chữ nhật đều vuông góc với đáy, song song với nhau và có độ dài bằng chiều cao.'],
 ['source-7495ab4695a22a6cdc-5','Hai tam giác bằng nhau','Tam giác ABC bằng tam giác PNM','AB = PN, AC = PM và góc A = góc P là góc xen giữa. Tương ứng A ↔ P, B ↔ N, C ↔ M, nên ABC bằng PNM.'],
 ['source-7da721722ed55d0342-12','Hình chữ nhật','90°','Đáy ABCD là hình chữ nhật nên góc ADC là góc vuông, bằng 90°.'],
 ['source-c0e96c500f65f1a3c7-5','Số hữu tỉ','Số hữu tỉ','Mọi số thập phân vô hạn tuần hoàn đều biểu diễn được dưới dạng phân số có tử và mẫu nguyên, mẫu khác 0.'],
);
const rejected=[
 ['source-24d518bee46005afed-18','Đề nói bốn bạn nhưng liệt kê năm đánh giá, không nói tăng hay giảm; nguồn đặt Trung bình trước Khá là sai.'],
 ['source-24d518bee46005afed-9','Bảng bị trải phẳng, cần xác minh thứ tự ghép môn học với tỉ lệ trong bản gốc.'],
 ['source-f110b5b8994332e31e-3','Không thể có hai đường thẳng song song cùng đi qua một điểm; đề cần viết lại.'],
 ['source-f110b5b8994332e31e-5','Chỉ có cặp góc đồng vị chưa đủ kết luận song song, cần thêm điều kiện chúng bằng nhau.'],
 ['source-ef3d2dbefc4ece07a8-14','Thiếu điều kiện cạnh và góc nhọn phải tương ứng, nếu không có thể ghép góc phụ và suy ra sai.'],
 ['source-4397d0a514a68ef94b-17','Tia Om chưa được định nghĩa nên không xác định được góc tOm.'],
 ['source-4397d0a514a68ef94b-12','Gọi xOx′ và yOy′ là hai tia là sai kí hiệu; cần xác minh hình và tên các tia đối.'],
 ['source-4397d0a514a68ef94b-16','Không có tia KH trong giả thiết; hai tia chung gốc không đủ xác định góc đối đỉnh.'],
 ['source-5538816df4e737f5ad-12','Biến cố gắn với ngày mai và tuổi học sinh, cần quy định thời điểm và đối tượng để không phụ thuộc ngữ cảnh.'],
 ['source-5538816df4e737f5ad-13','Thiếu áp suất và điều kiện vật lí, nước có thể sôi ở 200°C dưới áp suất cao.'],
 ['source-5538816df4e737f5ad-18','Đề nói màu hộp, không nói trong hộp chỉ có bi xanh và đỏ; chưa đủ để kết luận không có bi vàng.'],
 ['source-c1333b6c8e4405d840-15','Góc tam giác luôn nhỏ hơn 180° nhưng không có giá trị lớn nhất; cách hỏi cần sửa.'],
 ['source-5538816df4e737f5ad-7','Chưa rõ biến cố của lần gieo đã quan sát hay lần gieo mới; nguồn dùng điều kiện kết quả như điều kiện không gian mẫu.'],
 ['source-74662ef38c1e29c5b3-16','Hai đường A′C và CD′ cùng thuộc mặt phẳng (A′CD′), nguồn ghi (A′BCD′) là bốn điểm không đồng phẳng; cần sửa và kiểm tra hình.'],
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
specs.push(...round2,...round3,...round4,...round5);rejected.push(...round2Corrections,...round3Corrections,...round4Corrections,...round5Corrections);
const decisionIds=[...specs,...rejected].map(row=>row[0]);
if(new Set(decisionIds).size!==decisionIds.length)throw Error('Duplicate review decisions');
const decisions=[];
for(const [id,topic,sourceAnswer,solution,revisedPrompt,forceFormat] of specs){
 const q=pending.questions.find(q=>q.id===id);if(!q)throw Error(id);
 const fullId='supplement-'+id;
 if(!supplement.questions.some(q=>q.id===fullId)){
  let prompt=(revisedPrompt||q.prompt).normalize('NFC').replace(/O10-2024-GV137/g,'').replace(/^<(?:TH|NB|VD|VDC)>\s*/,'').replace(/Hướng dẫn giải\s*$/iu,'').trim();
  // Only split inline labels after detecting the complete A/B/C/D sequence.
  if(forceFormat!=='essay'&&/\n\s*A\./.test(prompt)&&['B.','C.','D.'].every(label=>prompt.includes(label)))prompt=prompt.replace(/([^\n])([BCD])\.\s*/g,'$1\n$2. ');
  const matches=[...prompt.matchAll(/(?:^|\n)\s*([ABCD])\.\s*([^]*?)(?=\n\s*[ABCD]\.\s*|$)/g)];
  const choices=matches.length===4&&forceFormat!=='essay'?matches.map(m=>m[2].trim()):null;
  const correctIndex=choices?(/^[ABCD]$/.test(sourceAnswer)?'ABCD'.indexOf(sourceAnswer):choices.findIndex(c=>c===sourceAnswer)):-1;
  const answer=choices&&correctIndex>=0?choices[correctIndex]:sourceAnswer;
  if(choices&&correctIndex<0)throw Error('Answer missing '+id);
  if(choices)prompt=prompt.slice(0,matches[0].index).trim();
  supplement.questions.push({id:fullId,grade:q.grade,topic,tags:[topic],level:'Cơ bản',prompt,answer,unit:'',solution,formats:choices?['mcq','essay']:['essay'],...(choices?{choices,correctIndex}:{}),rubric:[{id:'reason',points:7,description:solution},{id:'result',points:3,description:answer}],source:{...q.source,originalAnswer:q.sourceSolution,...(revisedPrompt?{originalPrompt:q.prompt,adaptation:'Biên tập lại câu dẫn để sửa kí hiệu hoặc nêu rõ điều kiện; giữ bản gốc để đối chiếu.'}:{})},review:{status:'verified',method:'Đọc đề, lập luận độc lập và đối chiếu lời giải nguồn; sửa hoặc loại câu thiếu điều kiện'}});
 }
 decisions.push({id,status:'verified'});
}
for(const [id,reason] of rejected)decisions.push({id,status:'needs_source_correction',reason});
await writeFile('data/datatm-supplement-reviewed.json',JSON.stringify(supplement,null,2)+'\n');
await writeFile('baocao/datatm-practice-manual-review.json',JSON.stringify({decisions},null,2)+'\n');
console.log(JSON.stringify({verified:specs.length,needsCorrection:rejected.length}));
