// Authored single-answer questions. Each row: topic, prompt, four options, correct index, explanation.
const banks={
6:[
['sign','Tính −8 + 13.',['−21','5','21','−5'],1,'Hai số khác dấu: 13 − 8 = 5.'],
['sign','Tính (−6) × (−4).',['−24','−10','24','10'],2,'Tích hai số âm là số dương: 6 × 4 = 24.'],
['sign','Tính 15 − (−7).',['8','−22','−8','22'],3,'Trừ số âm là cộng số đối: 15 + 7 = 22.'],
['fractions6','Tính 1/4 + 1/2.',['3/4','2/6','1/8','2/4'],0,'Quy đồng: 1/4 + 2/4 = 3/4.'],
['fractions6','Tính 5/6 − 1/3.',['4/3','1/2','2/9','1/3'],1,'5/6 − 2/6 = 3/6 = 1/2.'],
['fractions6','Tính 3/5 × 10/9.',['13/14','3/2','2/3','1/6'],2,'Nhân tử với tử, mẫu với mẫu: 30/45 = 2/3.'],
['percent6','20% của 150 bằng bao nhiêu?',['30','20','130','750'],0,'150 × 20/100 = 30.'],
['percent6','Một lớp có 40 học sinh, 10 em đeo kính. Tỉ lệ học sinh đeo kính là bao nhiêu phần trăm?',['10','40','30','25'],3,'10/40 × 100 = 25%.'],
['percent6','Sản phẩm giá 300 nghìn đồng giảm 10%. Giá mới là bao nhiêu nghìn đồng?',['290','270','30','330'],1,'Giảm 30 nghìn đồng; giá mới là 300 − 30 = 270.'],
['area6','Hình chữ nhật dài 9 cm, rộng 4 cm. Diện tích bằng bao nhiêu cm²?',['26','13','36','18'],2,'Diện tích bằng 9 × 4 = 36 cm².'],
['area6','Tam giác có đáy 12 cm và chiều cao tương ứng 5 cm. Diện tích bằng bao nhiêu cm²?',['30','60','17','34'],0,'Diện tích bằng 12 × 5 / 2 = 30 cm².'],
['area6','Hình vuông có chu vi 28 cm. Diện tích bằng bao nhiêu cm²?',['28','196','14','49'],3,'Cạnh bằng 28/4 = 7 cm; diện tích bằng 7² = 49 cm².']
],
7:[
['sign','Tính (−12) : 3.',['4','−4','−9','−36'],1,'Thương hai số khác dấu là số âm; 12 : 3 = 4.'],
['sign','Tính (−3)².',['−9','6','9','−6'],2,'(−3) × (−3) = 9.'],
['ratio7','Biết y = 5x. Khi x = 4, y bằng bao nhiêu?',['9','1','16','20'],3,'Thay x = 4 vào y = 5x: y = 20.'],
['ratio7','Biết y tỉ lệ thuận với x, khi x = 3 thì y = 12. Hệ số tỉ lệ bằng bao nhiêu?',['4','9','36','1/4'],0,'Hệ số tỉ lệ k = y/x = 12/3 = 4.'],
['ratio7','Bốn quyển vở giá 32 nghìn đồng. Bảy quyển cùng loại giá bao nhiêu nghìn đồng?',['35','56','224','28'],1,'Một quyển giá 8 nghìn đồng; bảy quyển giá 56 nghìn đồng.'],
['ratio7','Biết y = 3x. Khi y = 21, x bằng bao nhiêu?',['18','24','7','63'],2,'Từ 3x = 21 suy ra x = 7.'],
['angles7','Tam giác có hai góc 45° và 65°. Góc còn lại bằng bao nhiêu độ?',['70','110','80','60'],0,'Tổng ba góc bằng 180°: 180 − 45 − 65 = 70.'],
['angles7','Tam giác cân có góc ở đỉnh 50°. Mỗi góc ở đáy bằng bao nhiêu độ?',['50','130','75','65'],3,'Hai góc đáy bằng nhau: (180 − 50)/2 = 65°.'],
['angles7','Tam giác vuông có một góc nhọn 28°. Góc nhọn còn lại bằng bao nhiêu độ?',['152','62','72','28'],1,'Hai góc nhọn có tổng 90°: 90 − 28 = 62°.'],
['angles7','Mỗi góc của một tam giác đều bằng bao nhiêu độ?',['90','45','60','120'],2,'Ba góc bằng nhau, tổng 180° nên mỗi góc bằng 60°.'],
['distribute','Giá trị của 2(x + 3) khi x = 4 bằng bao nhiêu?',['14','11','10','20'],0,'Thay x = 4: 2 × (4 + 3) = 14.'],
['combine','Giá trị của 5x − 2x khi x = 3 bằng bao nhiêu?',['3','15','21','9'],3,'Thu gọn thành 3x, thay x = 3 được 9.']
],
8:[
['identity8','Trong (x + 4)² = x² + bx + 16, b bằng bao nhiêu?',['4','8','16','2'],1,'Số hạng giữa là 2 × x × 4 = 8x.'],
['identity8','Tính 29 × 31 bằng hiệu hai bình phương.',['900','961','899','841'],2,'(30 − 1)(30 + 1) = 30² − 1 = 899.'],
['identity8','Tính 49².',['2400','2501','2499','2401'],3,'(50 − 1)² = 2500 − 100 + 1 = 2401.'],
['identity8','Trong (x − 5)² = x² + bx + 25, b bằng bao nhiêu?',['−10','−5','10','5'],0,'Số hạng giữa là −2 × x × 5 = −10x.'],
['pythagoras8','Tam giác vuông có hai cạnh góc vuông 5 cm và 12 cm. Cạnh huyền dài bao nhiêu cm?',['17','13','7','15'],1,'Cạnh huyền có bình phương bằng 25 + 144 = 169 nên dài 13 cm.'],
['pythagoras8','Tam giác vuông có cạnh huyền 10 cm và một cạnh góc vuông 6 cm. Cạnh còn lại dài bao nhiêu cm?',['4','16','8','12'],2,'Bình phương cạnh còn lại bằng 100 − 36 = 64; cạnh dài 8 cm.'],
['pythagoras8','Hình chữ nhật có hai cạnh 8 cm và 15 cm. Đường chéo dài bao nhiêu cm?',['17','23','7','120'],0,'Đường chéo có bình phương bằng 8² + 15² = 289 nên dài 17 cm.'],
['equation','Nghiệm của phương trình 3x + 7 = 22 là bao nhiêu?',['15','29','−5','5'],3,'3x = 22 − 7 = 15 nên x = 5.'],
['equation','Nghiệm của phương trình 4(x − 2) = 20 là bao nhiêu?',['3','7','5','12'],1,'x − 2 = 5 nên x = 7.'],
['equation','Nghiệm của phương trình 5x − 6 = 2x + 9 là bao nhiêu?',['1','3','5','15'],2,'Chuyển vế được 3x = 15 nên x = 5.'],
['distribute','Giá trị của −3(x − 2) khi x = 5 bằng bao nhiêu?',['−9','−21','9','21'],0,'−3 × (5 − 2) = −9.'],
['combine','Giá trị của 7x − 4x + 2 khi x = 2 bằng bao nhiêu?',['6','10','24','8'],3,'Thu gọn thành 3x + 2, thay x = 2 được 8.']
],
9:[
['roots9','Tính căn bậc hai số học của 121.',['−11','11','12','22'],1,'11² = 121 và 11 không âm.'],
['roots9','Tính √((-7)²).',['−7','49','7','14'],2,'Căn bậc hai số học của a² bằng |a| nên kết quả là 7.'],
['roots9','Tính √25 + √144.',['13','169','17','5'],2,'√25 = 5, √144 = 12 nên tổng bằng 17.'],
['systems9','Cho x + y = 9 và x − y = 3. Giá trị x bằng bao nhiêu?',['6','3','9','12'],0,'Cộng hai phương trình: 2x = 12 nên x = 6.'],
['systems9','Cho x + y = 10 và x − y = 4. Giá trị y bằng bao nhiêu?',['7','3','6','14'],1,'Trừ hai phương trình: 2y = 6 nên y = 3.'],
['quadratic9','Phương trình x² − 7x + 12 = 0 có nghiệm lớn hơn bằng bao nhiêu?',['3','7','4','12'],2,'(x − 3)(x − 4) = 0; nghiệm lớn hơn là 4.'],
['quadratic9','Biệt thức Δ của phương trình x² − 6x + 5 = 0 bằng bao nhiêu?',['16','56','36','4'],0,'Δ = (−6)² − 4 × 1 × 5 = 16.'],
['quadratic9','Nghiệm kép của phương trình x² − 8x + 16 = 0 bằng bao nhiêu?',['8','−4','16','4'],3,'(x − 4)² = 0 nên nghiệm kép là 4.'],
['trig9','Tam giác ABC vuông tại A, AB = 6, AC = 8, BC = 10. sin B bằng bao nhiêu?',['3/5','4/5','3/4','5/4'],1,'sin B = cạnh đối / cạnh huyền = AC/BC = 8/10 = 4/5.'],
['trig9','Tam giác ABC vuông tại A, AB = 6, AC = 8, BC = 10. cos B bằng bao nhiêu?',['4/5','4/3','3/5','5/3'],2,'cos B = cạnh kề / cạnh huyền = AB/BC = 6/10 = 3/5.'],
['circle9','Đường tròn bán kính 5 cm có chu vi kπ cm. k bằng bao nhiêu?',['10','25','5','20'],0,'Chu vi bằng 2πr = 10π cm.'],
['circle9','Hình tròn bán kính 4 cm có diện tích kπ cm². k bằng bao nhiêu?',['8','4','32','16'],3,'Diện tích bằng πr² = 16π cm².']
]};
export const practiceMCQs=Object.entries(banks).flatMap(([grade,rows])=>rows.map(([skill,prompt,choices,correctIndex,rule],i)=>({id:`mcq-${grade}-${i+1}`,grades:[Number(grade)],skill,prompt,richPrompt:true,choices,correctIndex,answer:choices[correctIndex],rule,wrong:choices[(correctIndex+1)%4],keywords:[],errorTags:[],level:i<4?'Khởi động':i<9?'Luyện tập':'Vận dụng',type:'mcq'})));
