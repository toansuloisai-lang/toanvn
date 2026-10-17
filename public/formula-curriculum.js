const r=String.raw;
const entries=[];
function section(grade,group,topic,rows){for(const [key,title,tex,condition,example,question,answer,hint] of rows)entries.push({id:`curriculum-${grade}-${key}`,grades:[grade],group,topic,title,tex,condition,example,description:`${title} · Toán ${grade} · ${topic}.`,symbols:[condition],use:[`Tra cứu và giải bài thuộc chủ đề ${topic.toLocaleLowerCase('vi')}.`],avoid:[hint],problem:question,steps:[['Chọn công thức và kiểm tra điều kiện',tex],['Thay số, thực hiện phép tính',example]],solutionNote:hint,counter:null,check:[question,answer,hint],symbol:String(grade)});}
section(6,'numbers','Số tự nhiên và số nguyên',[
 ['power','Định nghĩa lũy thừa',r`a^n=\underbrace{a\cdot a\cdots a}_{n\text{ thừa số}}`,'n là số nguyên dương; a là cơ số.',r`3^4=3\cdot3\cdot3\cdot3=81`,'Tính 3 mũ 4.',81,'Nhân cơ số với chính nó 4 lần; không lấy 3 nhân 4.'],
 ['division','Phép chia có dư',r`a=bq+r,\quad0\le r<b`,'a, b là số tự nhiên, b > 0; q là thương, r là số dư.',r`29=5\cdot5+4`,'29 chia 5 có số dư bằng bao nhiêu?',4,'Số dư phải nhỏ hơn số chia: 4 < 5.'],
 ['divisibility','Dấu hiệu chia hết cho 3 và 9',r`n\vdots3\Leftrightarrow S\vdots3,\quad n\vdots9\Leftrightarrow S\vdots9`,'S là tổng các chữ số của số tự nhiên n.',r`4+5+9=18,\quad459\vdots9`,'Tổng các chữ số của 459 bằng bao nhiêu?',18,'Dùng tổng chữ số để xét chia hết cho 3 hoặc 9; không dùng quy tắc này cho mọi số chia.'],
 ['gcd-lcm','Ước chung lớn nhất và bội chung nhỏ nhất',r`\operatorname{UCLN}(a,b)\operatorname{BCNN}(a,b)=ab`,'a và b là hai số nguyên dương.',r`\operatorname{BCNN}(12,18)=\frac{12\cdot18}{6}=36`,'ƯCLN của 12 và 18 là 6. BCNN bằng bao nhiêu?',36,'Công thức tích dùng cho hai số nguyên dương; không suy rộng nguyên dạng cho ba số.'],
 ['negative','Nhân và chia số nguyên',r`(-a)(-b)=ab,\quad(-a)b=-(ab)`,'a, b dương. Chia cho số khác 0 cũng theo quy tắc dấu tương tự.',r`(-6)(-4)=24`,'Tính (-6) nhân (-4).',24,'Hai số âm nhân nhau được số dương; cộng hai số âm dùng quy tắc khác.'],
 ['absolute','Giá trị tuyệt đối',r`|a|=\begin{cases}a&a\ge0\\-a&a<0\end{cases}`,'a là số nguyên; giá trị tuyệt đối là khoảng cách đến 0.',r`|-12|=12`,'Giá trị tuyệt đối của -12 bằng bao nhiêu?',12,'Khoảng cách không âm; dấu trừ bên ngoài giá trị tuyệt đối vẫn phải giữ.']
]);
section(6,'numbers','Phân số, số thập phân và phần trăm',[
 ['fraction-equivalence','Hai phân số bằng nhau',r`\frac ab=\frac cd\Leftrightarrow ad=bc`,'b và d khác 0.',r`\frac{x}{15}=\frac25\Rightarrow5x=30\Rightarrow x=6`,'x/15 = 2/5. Tìm x.',6,'Nhân chéo đúng vị trí; kiểm tra các mẫu số khác 0.'],
 ['fraction-multiply','Nhân và chia phân số',r`\frac ab\cdot\frac cd=\frac{ac}{bd},\quad\frac ab:\frac cd=\frac{ad}{bc}`,'b, d khác 0; với phép chia cần thêm c khác 0.',r`\frac23:\frac45=\frac23\cdot\frac54=\frac56`,'Tính (2/3) chia (4/5).',5/6,'Chỉ đảo phân số đứng sau dấu chia, không đảo cả hai.'],
 ['percentage','Tỉ số phần trăm',r`p=\frac ab\cdot100\%`,'a, b cùng đơn vị và b khác 0; b là đại lượng được chọn làm mốc.',r`\frac{15}{60}\cdot100\%=25\%`,'15 chiếm bao nhiêu phần trăm của 60? Nhập số phần trăm.',25,'Xác định đúng đại lượng làm mốc ở mẫu số.'],
 ['percent-value','Tìm giá trị phần trăm của một số',r`A=B\cdot\frac p{100}`,'p là số phần trăm; B là giá trị ban đầu.',r`240\cdot\frac{15}{100}=36`,'15% của 240 bằng bao nhiêu?',36,'Đổi 15% thành 15/100 trước khi nhân.'],
 ['find-original','Tìm số khi biết một phân số của nó',r`B=A:\frac mn=A\cdot\frac nm`,'m, n khác 0; A là m/n của số B.',r`B=18:\frac35=30`,'3/5 của một số bằng 18. Số đó là bao nhiêu?',30,'Tìm số ban đầu bằng phép chia, không nhân tiếp với 3/5.']
]);
section(6,'geometry','Hình phẳng và đo lường',[
 ['square','Chu vi và diện tích hình vuông',r`P=4a,\quad S=a^2`,'a > 0 là độ dài cạnh; diện tích có đơn vị vuông.',r`a=5\Rightarrow P=20,\ S=25`,'Hình vuông cạnh 5 cm có diện tích bao nhiêu cm²?',25,'Phân biệt chu vi 4a và diện tích a².'],
 ['rectangle-perimeter','Chu vi hình chữ nhật',r`P=2(a+b)`,'a, b > 0 là chiều dài và chiều rộng, cùng đơn vị.',r`P=2(8+3)=22`,'Hình chữ nhật dài 8 cm, rộng 3 cm có chu vi bao nhiêu cm?',22,'Cộng chiều dài với chiều rộng rồi nhân 2.'],
 ['parallelogram','Diện tích hình bình hành',r`S=ah`,'a là đáy; h là chiều cao vuông góc tương ứng.',r`S=9\cdot4=36`,'Đáy 9 cm, chiều cao 4 cm. Diện tích hình bình hành là bao nhiêu cm²?',36,'Không thay chiều cao bằng cạnh bên xiên.'],
 ['trapezoid','Diện tích hình thang',r`S=\frac{(a+b)h}{2}`,'a, b là hai đáy song song; h là khoảng cách giữa hai đáy.',r`S=\frac{(6+10)\cdot4}{2}=32`,'Hình thang có hai đáy 6 và 10 cm, cao 4 cm. Diện tích là bao nhiêu cm²?',32,'Cần cộng hai đáy, nhân chiều cao rồi chia 2.'],
 ['rhombus','Diện tích hình thoi',r`S=\frac{d_1d_2}{2}`,'d₁, d₂ là độ dài hai đường chéo hình thoi.',r`S=\frac{6\cdot8}{2}=24`,'Hai đường chéo hình thoi dài 6 và 8 cm. Diện tích bằng bao nhiêu cm²?',24,'Đường chéo không phải độ dài cạnh.'],
 ['segment','Cộng độ dài đoạn thẳng',r`AB+BC=AC`,'B nằm giữa A và C; các độ dài cùng đơn vị.',r`AB=3,\ BC=5\Rightarrow AC=8`,'B nằm giữa A và C; AB = 3 cm, BC = 5 cm. AC bằng bao nhiêu cm?',8,'Phải xác định điểm nằm giữa trước khi cộng đoạn thẳng.'],
 ['angle','Hai góc kề bù',r`\alpha+\beta=180^\circ`,'Hai góc kề nhau và hai cạnh ngoài là hai tia đối nhau.',r`\beta=180^\circ-65^\circ=115^\circ`,'Một góc bằng 65°. Góc kề bù bằng bao nhiêu độ?',115,'Hai góc kề nhau chưa chắc bù nhau nếu cạnh ngoài không đối nhau.']
]);
section(6,'statistics','Dữ liệu và xác suất',[
 ['experimental','Xác suất thực nghiệm',r`P_{\mathrm{TN}}(A)=\frac{k}{n}`,'n > 0 là số lần thử; k là số lần xuất hiện sự kiện A.',r`P_{\mathrm{TN}}=\frac{18}{30}=0.6`,'Thử 30 lần, sự kiện xuất hiện 18 lần. Xác suất thực nghiệm bằng bao nhiêu?',0.6,'Kết quả thực nghiệm có thể khác xác suất lí thuyết.']
]);
section(7,'numbers','Số hữu tỉ và số thực',[
 ['power-quotient','Chia hai lũy thừa cùng cơ số',r`a^m:a^n=a^{m-n}`,'a khác 0; m, n nguyên không âm và m ≥ n trong phạm vi lũy thừa đang học.',r`5^6:5^4=5^2=25`,'Tính 5 mũ 6 chia 5 mũ 4.',25,'Trừ số mũ, không chia hai số mũ.'],
 ['power-power','Lũy thừa của lũy thừa',r`(a^m)^n=a^{mn}`,'m, n là số nguyên dương; a là số hữu tỉ.',r`(2^3)^2=2^6=64`,'Tính (2 mũ 3) mũ 2.',64,'Nhân hai số mũ; không cộng.'],
 ['power-product','Lũy thừa của tích và thương',r`(ab)^n=a^nb^n,\quad\left(\frac ab\right)^n=\frac{a^n}{b^n}`,'n nguyên dương; b khác 0 trong biểu thức thương.',r`\left(\frac23\right)^2=\frac49`,'Tính (2/3) bình phương.',4/9,'Không áp dụng quy tắc này để tách lũy thừa của một tổng.'],
 ['sqrt','Căn bậc hai số học',r`\sqrt a=x\Leftrightarrow x\ge0,\ x^2=a`,'a ≥ 0; căn bậc hai số học là số không âm.',r`\sqrt{144}=12`,'Căn bậc hai số học của 144 là bao nhiêu?',12,'Không viết căn bậc hai số học của 144 bằng ±12.']
]);
section(7,'algebra','Tỉ lệ thức và đại lượng tỉ lệ',[
 ['proportion','Tính chất tỉ lệ thức',r`\frac ab=\frac cd\Leftrightarrow ad=bc`,'b, d khác 0.',r`\frac x6=\frac49\Rightarrow x=\frac83`,'x/6 = 4/9. Tìm x.',8/3,'Giữ đúng thứ tự các số hạng khi nhân chéo.'],
 ['ratio-chain','Dãy tỉ số bằng nhau',r`\frac ab=\frac cd=\frac{a+c}{b+d}`,'b, d, b + d khác 0; hai tỉ số ban đầu bằng nhau.',r`\frac x2=\frac y3,\ x+y=25\Rightarrow\frac x2=5\Rightarrow x=10`,'x/2 = y/3 và x + y = 25. Tìm x.',10,'Mẫu số mới là tổng 2 + 3; không cộng hai thương riêng lẻ.'],
 ['direct','Đại lượng tỉ lệ thuận',r`y=kx,\quad\frac{y_1}{x_1}=\frac{y_2}{x_2}=k`,'k khác 0; các mẫu x₁, x₂ khác 0 khi lập tỉ số.',r`k=3,\ x=4\Rightarrow y=12`,'y tỉ lệ thuận với x theo hệ số 3. Khi x = 4, y bằng bao nhiêu?',12,'Tỉ lệ thuận giữ tỉ số y/x không đổi.'],
 ['inverse','Đại lượng tỉ lệ nghịch',r`y=\frac ax,\quad xy=a`,'a khác 0, x khác 0.',r`xy=24,\ x=6\Rightarrow y=4`,'x và y tỉ lệ nghịch, xy = 24. Khi x = 6, y bằng bao nhiêu?',4,'Tỉ lệ nghịch giữ tích không đổi, không giữ thương không đổi.']
]);
section(7,'geometry','Góc và tam giác',[
 ['vertical','Hai góc đối đỉnh',r`\widehat{AOB}=\widehat{COD}`,'OA và OC là hai tia đối nhau; OB và OD cũng là hai tia đối nhau.',r`\widehat{AOB}=48^\circ\Rightarrow\widehat{COD}=48^\circ`,'Một góc bằng 48°. Góc đối đỉnh bằng bao nhiêu độ?',48,'Hai góc bằng nhau chưa đủ để kết luận chúng đối đỉnh.'],
 ['parallel','Góc khi hai đường thẳng song song',r`\alpha_{\mathrm{so\ le}}=\beta_{\mathrm{so\ le}},\quad\gamma+\delta=180^\circ`,'Hai đường thẳng song song bị cắt bởi một đường thẳng; γ, δ là hai góc trong cùng phía.',r`\gamma=70^\circ\Rightarrow\delta=110^\circ`,'Hai góc trong cùng phía của hai đường song song: một góc 70°. Góc kia bao nhiêu độ?',110,'Phân biệt góc so le trong bằng nhau và góc trong cùng phía bù nhau.'],
 ['isosceles','Góc ở đáy tam giác cân',r`B=C=\frac{180^\circ-A}{2}`,'Tam giác ABC cân tại A; B, C là hai góc ở đáy.',r`A=40^\circ\Rightarrow B=C=70^\circ`,'Tam giác cân có góc đỉnh 40°. Mỗi góc ở đáy bằng bao nhiêu độ?',70,'Góc đỉnh là góc xen giữa hai cạnh bên bằng nhau.'],
 ['triangle-inequality','Bất đẳng thức tam giác',r`|b-c|<a<b+c`,'a, b, c là ba cạnh của một tam giác không suy biến.',r`b=3,\ c=5\Rightarrow2<a<8`,'Hai cạnh dài 3 và 5. Cận trên của cạnh thứ ba là bao nhiêu (không lấy dấu bằng)?',8,'Bất đẳng thức là nghiêm ngặt; a = 8 tạo hình suy biến.'],
 ['median','Trọng tâm tam giác',r`AG=\frac23AM,\quad AG=2GM`,'M là trung điểm BC; G là trọng tâm tam giác ABC.',r`AM=12\Rightarrow AG=8`,'Trung tuyến AM dài 12 cm. G là trọng tâm. AG dài bao nhiêu cm?',8,'Đo từ đỉnh A đến trọng tâm G bằng 2/3 trung tuyến.']
]);
section(7,'geometry','Hình khối',[
 ['cube','Hình lập phương',r`V=a^3,\quad S_{\mathrm{tp}}=6a^2`,'a > 0 là cạnh hình lập phương.',r`a=3\Rightarrow V=27,\ S_{\mathrm{tp}}=54`,'Hình lập phương cạnh 3 cm có thể tích bao nhiêu cm³?',27,'Thể tích dùng đơn vị khối; diện tích dùng đơn vị vuông.'],
 ['box-area','Diện tích hình hộp chữ nhật',r`S_{\mathrm{tp}}=2(ab+ah+bh)`,'a, b, h là ba kích thước dương, cùng đơn vị.',r`S_{\mathrm{tp}}=2(3\cdot4+3\cdot5+4\cdot5)=94`,'Hộp chữ nhật kích thước 3, 4, 5 cm có diện tích toàn phần bao nhiêu cm²?',94,'Tính đủ ba cặp mặt đối diện; không nhầm với thể tích abh.'],
 ['prism','Lăng trụ đứng',r`V=S_{\mathrm{day}}h,\quad S_{\mathrm{xq}}=P_{\mathrm{day}}h`,'h là chiều cao lăng trụ đứng; S và P là diện tích, chu vi của một đáy.',r`S_{\mathrm{day}}=12,\ h=5\Rightarrow V=60`,'Lăng trụ đứng có đáy diện tích 12 cm² và cao 5 cm. Thể tích là bao nhiêu cm³?',60,'Không chia 3 như công thức hình chóp.']
]);
section(7,'statistics','Dữ liệu và xác suất',[
 ['pie-chart','Biểu đồ hình quạt tròn',r`\alpha=360^\circ\cdot\frac p{100}`,'p là phần trăm của một nhóm trong tổng số liệu.',r`\alpha=360^\circ\cdot\frac{25}{100}=90^\circ`,'Nhóm chiếm 25% ứng với góc quạt bao nhiêu độ?',90,'Tổng góc của cả biểu đồ là 360°, không phải 180°.'],
 ['probability','Xác suất với kết quả đồng khả năng',r`P(A)=\frac{m}{n}`,'Không gian kết quả hữu hạn có n > 0 kết quả đồng khả năng; m kết quả thuận lợi.',r`P(\text{so chan})=\frac36=\frac12`,'Gieo xúc xắc cân đối 6 mặt. Xác suất xuất hiện số chẵn là bao nhiêu?',0.5,'Chỉ đếm theo tỉ số khi các kết quả có khả năng xuất hiện như nhau.']
]);
section(8,'algebra','Hằng đẳng thức và phân tích đa thức',[
 ['square-difference','Bình phương một hiệu',r`(a-b)^2=a^2-2ab+b^2`,'a, b là các biểu thức thực có nghĩa.',r`(x-3)^2=x^2-6x+9`,'Trong (x - 3)², hệ số của x bằng bao nhiêu?',-6,'Không bỏ tích -2ab; số hạng b² vẫn dương.'],
 ['difference-squares','Hiệu hai bình phương',r`a^2-b^2=(a-b)(a+b)`,'a, b là các biểu thức thực có nghĩa.',r`19^2-1^2=18\cdot20=360`,'Tính 19² - 1².',360,'Tổng hai bình phương không phân tích thành (a - b)(a + b).'],
 ['cube-sum','Lập phương một tổng',r`(a+b)^3=a^3+3a^2b+3ab^2+b^3`,'a, b là các biểu thức thực có nghĩa.',r`(x+2)^3=x^3+6x^2+12x+8`,'Hệ số của x² trong (x + 2)³ là bao nhiêu?',6,'Hai số hạng giữa có hệ số 3; không chỉ lấy a³ + b³.'],
 ['cube-difference','Lập phương một hiệu',r`(a-b)^3=a^3-3a^2b+3ab^2-b^3`,'a, b là các biểu thức thực có nghĩa.',r`(x-2)^3=x^3-6x^2+12x-8`,'Hệ số tự do trong (x - 2)³ là bao nhiêu?',-8,'Các dấu lần lượt là cộng, trừ, cộng, trừ.'],
 ['sum-cubes','Tổng hai lập phương',r`a^3+b^3=(a+b)(a^2-ab+b^2)`,'a, b là các biểu thức thực có nghĩa.',r`2^3+3^3=5(4-6+9)=35`,'Tính 2³ + 3³.',35,'Trong thừa số bậc hai, tích ab mang dấu trừ.'],
 ['difference-cubes','Hiệu hai lập phương',r`a^3-b^3=(a-b)(a^2+ab+b^2)`,'a, b là các biểu thức thực có nghĩa.',r`4^3-1^3=3(16+4+1)=63`,'Tính 4³ - 1³.',63,'Thừa số bậc hai gồm ba số hạng mang dấu cộng.'],
 ['factor','Đặt nhân tử chung',r`AB+AC=A(B+C)`,'Các biểu thức phải có nghĩa; A là nhân tử chung của mọi số hạng.',r`6x^2+9x=3x(2x+3)`,'Nhân tử số chung lớn nhất của 6x² và 9x là bao nhiêu?',3,'Đưa nhân tử chung ra ngoài phải chia mọi số hạng cho nhân tử đó.']
]);
section(8,'algebra','Phân thức và hàm số',[
 ['rational-domain','Điều kiện xác định của phân thức',r`\frac{A(x)}{B(x)}\text{ xac dinh}\Leftrightarrow B(x)\ne0`,'A, B là đa thức; mẫu phải khác 0 trước và sau biến đổi.',r`\frac{x+1}{x-2}\text{ xac dinh khi }x\ne2`,'Phân thức (x + 1)/(x - 2) không xác định tại x bằng bao nhiêu?',2,'Rút gọn không xóa điều kiện của mẫu ban đầu.'],
 ['rational-add','Cộng và trừ phân thức',r`\frac AB\pm\frac CD=\frac{AD\pm BC}{BD}`,'B và D khác 0; quy đồng và giữ điều kiện xác định.',r`\frac{x}{x-1}+\frac{1}{x-1}=\frac{x+1}{x-1}`,'Tại x = 3, (x + 1)/(x - 1) bằng bao nhiêu?',2,'Không cộng các mẫu số với nhau.'],
 ['rational-divide','Chia phân thức',r`\frac AB:\frac CD=\frac{AD}{BC}`,'B, C, D đều khác 0 tại giá trị đang xét.',r`\frac{x}{2}:\frac{x}{3}=\frac32\quad(x\ne0)`,'Với x khác 0, (x/2) chia (x/3) bằng bao nhiêu?',1.5,'Phân thức bị chia có thể bằng 0; phân thức dùng làm số chia phải khác 0.'],
 ['linear-function','Hàm số bậc nhất',r`y=ax+b,\quad a\ne0`,'a, b là hằng số; a khác 0 để là hàm số bậc nhất.',r`y=2x-3,\ x=4\Rightarrow y=5`,'y = 2x - 3. Khi x = 4, y bằng bao nhiêu?',5,'Thay cả giá trị và dấu của x; b là tung độ giao với trục Oy.'],
 ['slope','Hệ số góc của đường thẳng',r`a=\frac{y_2-y_1}{x_2-x_1}`,'Hai điểm thuộc đường thẳng y = ax + b; x₁ khác x₂.',r`a=\frac{7-3}{4-2}=2`,'Đường thẳng qua (2; 3) và (4; 7) có hệ số góc bao nhiêu?',2,'Đường thẳng đứng không biểu diễn dưới dạng y = ax + b.']
]);
section(8,'geometry','Tam giác và hình chóp',[
 ['thales','Định lí Thales',r`\frac{AD}{AB}=\frac{AE}{AC}=\frac{DE}{BC}`,'D thuộc cạnh AB, E thuộc cạnh AC và DE song song BC trong tam giác ABC.',r`\frac{AD}{AB}=\frac25,\ BC=15\Rightarrow DE=6`,'DE song song BC, AD/AB = 2/5 và BC = 15. DE bằng bao nhiêu?',6,'Phải có điều kiện song song; ghép đúng các đoạn tương ứng.'],
 ['midline','Đường trung bình tam giác',r`MN\parallel BC,\quad MN=\frac12BC`,'M và N lần lượt là trung điểm AB và AC.',r`BC=14\Rightarrow MN=7`,'Đường trung bình song song cạnh dài 14 cm có độ dài bao nhiêu cm?',7,'Cần cả hai đầu mút là trung điểm của hai cạnh.'],
 ['bisector','Tính chất đường phân giác',r`\frac{BD}{DC}=\frac{AB}{AC}`,'AD là phân giác trong của góc A, D thuộc cạnh BC của tam giác ABC.',r`AB=6,\ AC=9,\ BC=10\Rightarrow BD=4`,'AB = 6, AC = 9, BC = 10. Phân giác AD cắt BC tại D. BD bằng bao nhiêu?',4,'BD/DC tương ứng với AB/AC, không phải AB/BC.'],
 ['similarity','Tỉ số của hai tam giác đồng dạng',r`\frac{P_1}{P_2}=k,\quad\frac{S_1}{S_2}=k^2`,'k > 0 là tỉ số cạnh tương ứng của tam giác thứ nhất so với thứ hai.',r`k=3\Rightarrow\frac{S_1}{S_2}=9`,'Hai tam giác đồng dạng có tỉ số cạnh 3. Tỉ số diện tích bằng bao nhiêu?',9,'Chu vi theo k, diện tích theo k².'],
 ['pyramid','Thể tích hình chóp',r`V=\frac13S_{\mathrm{day}}h`,'h là chiều cao vuông góc từ đỉnh xuống mặt đáy.',r`V=\frac13\cdot36\cdot5=60`,'Hình chóp có diện tích đáy 36 cm², cao 5 cm. Thể tích bao nhiêu cm³?',60,'Chiều cao hình chóp không phải chiều cao mặt bên.'],
 ['pyramid-area','Diện tích xung quanh hình chóp đều',r`S_{\mathrm{xq}}=\frac12P_{\mathrm{day}}d`,'d là trung đoạn: chiều cao của một mặt bên; đáy là đa giác đều.',r`P_{\mathrm{day}}=24,\ d=5\Rightarrow S_{\mathrm{xq}}=60`,'Hình chóp đều có chu vi đáy 24 cm, trung đoạn 5 cm. Diện tích xung quanh bao nhiêu cm²?',60,'Dùng trung đoạn d, không dùng chiều cao vuông góc của hình chóp.']
]);
section(8,'statistics','Tần suất và xác suất',[
 ['frequency','Tần số tương đối thực nghiệm',r`f=\frac{k}{n},\quad f_{\%}=\frac{k}{n}\cdot100\%`,'n > 0 là tổng số lần quan sát; k là số lần xuất hiện kết quả.',r`f=\frac{12}{40}=0.3=30\%`,'Có 12 lần thành công trong 40 lần thử. Tần số tương đối dưới dạng số thập phân là bao nhiêu?',0.3,'Phân biệt 0,3 với 30%; cả hai biểu diễn cùng một tỉ lệ.']
]);
section(9,'algebra','Căn thức',[
 ['sqrt-product','Căn bậc hai của tích',r`\sqrt{ab}=\sqrt a\sqrt b`,'a ≥ 0 và b ≥ 0 trong tập số thực.',r`\sqrt{9\cdot16}=3\cdot4=12`,'Tính căn bậc hai của 9 nhân 16.',12,'Không tách √(a + b) thành √a + √b.'],
 ['sqrt-quotient','Căn bậc hai của thương',r`\sqrt{\frac ab}=\frac{\sqrt a}{\sqrt b}`,'a ≥ 0, b > 0.',r`\sqrt{\frac{81}{4}}=\frac92`,'Tính căn bậc hai của 81/4.',4.5,'Mẫu b phải dương, không được bằng 0.'],
 ['extract-radical','Đưa thừa số ra ngoài căn',r`\sqrt{a^2b}=|a|\sqrt b`,'a thực, b ≥ 0.',r`\sqrt{(-3)^2\cdot5}=3\sqrt5`,'Hệ số đứng trước √5 khi rút gọn √45 là bao nhiêu?',3,'Phải lấy giá trị tuyệt đối của a khi chưa biết dấu.'],
 ['rationalize','Trục căn thức ở mẫu',r`\frac1{\sqrt a}=\frac{\sqrt a}{a}`,'a > 0.',r`\frac1{\sqrt5}=\frac{\sqrt5}{5}`,'Trong 1/√5 = √5/k, k bằng bao nhiêu?',5,'Nhân cả tử và mẫu với cùng √a, không chỉ nhân mẫu.'],
 ['conjugate','Trục căn bằng biểu thức liên hợp',r`\frac1{\sqrt a-\sqrt b}=\frac{\sqrt a+\sqrt b}{a-b}`,'a, b ≥ 0 và a khác b.',r`\frac1{\sqrt5-2}=\sqrt5+2`,'Trong 1/(√5 - 2) = √5 + k, k bằng bao nhiêu?',2,'Điều kiện mẫu khác 0 vẫn phải giữ khi nhân liên hợp.'],
 ['cube-root','Căn bậc ba',r`\sqrt[3]{a^3}=a`,'a là số thực; căn bậc ba của số âm vẫn xác định.',r`\sqrt[3]{-125}=-5`,'Căn bậc ba của -125 bằng bao nhiêu?',-5,'Không thêm giá trị tuyệt đối như với √(a²).']
]);
section(9,'algebra','Phương trình, hệ phương trình và hàm số',[
 ['linear-system','Giải hệ hai phương trình bậc nhất',r`D=ae-bd,\quad x=\frac{ce-bf}{D},\quad y=\frac{af-cd}{D}`,'Hệ ax + by = c, dx + ey = f. Công thức này chỉ áp dụng khi D khác 0.',r`\begin{cases}x+y=5\\x-y=1\end{cases}\Rightarrow(x,y)=(3,2)`,'Hệ x + y = 5 và x - y = 1 có nghiệm x bằng bao nhiêu?',3,'D = 0 phải xét riêng; có thể vô nghiệm hoặc vô số nghiệm.'],
 ['product-equation','Phương trình tích',r`A(x)B(x)=0\Leftrightarrow A(x)=0\ \text{hoac}\ B(x)=0`,'Các biểu thức đều xác định; giữ điều kiện nếu chứa mẫu hoặc căn.',r`(x-2)(x+3)=0\Rightarrow x=2\ \text{hoac}\ x=-3`,'Nghiệm dương của (x - 2)(x + 3) = 0 là bao nhiêu?',2,'Quy tắc tích bằng 0 không áp dụng nguyên dạng cho tổng bằng 0.'],
 ['vieta','Hệ thức Viète',r`x_1+x_2=-\frac ba,\quad x_1x_2=\frac ca`,'x₁, x₂ là hai nghiệm thực (có thể bằng nhau) của ax² + bx + c = 0, a khác 0.',r`x^2-7x+10=0\Rightarrow x_1+x_2=7,\ x_1x_2=10`,'Tổng hai nghiệm của x² - 7x + 10 = 0 bằng bao nhiêu?',7,'Kiểm tra có nghiệm thực trước khi nói đến hai nghiệm thực.'],
 ['quadratic-function','Hàm số y = ax²',r`y=ax^2,\quad a\ne0`,'Đồ thị có đỉnh O, nhận Oy làm trục đối xứng.',r`y=2x^2,\ x=-3\Rightarrow y=18`,'y = 2x². Khi x = -3, y bằng bao nhiêu?',18,'Bình phương toàn bộ giá trị x trước khi nhân a.']
]);
section(9,'geometry','Lượng giác và đường tròn',[
 ['cotangent','Cotang góc nhọn',r`\cot\alpha=\frac{a}{b}=\frac1{\tan\alpha}`,'Trong tam giác vuông, a là cạnh kề, b là cạnh đối với góc nhọn α.',r`a=3,\ b=4\Rightarrow\cot\alpha=\frac34`,'Cạnh kề 3, cạnh đối 4. Cotang của góc đang xét bằng bao nhiêu?',0.75,'Đổi góc đang xét sẽ đổi vai trò cạnh đối và cạnh kề.'],
 ['trig-identities','Hệ thức lượng giác cơ bản',r`\sin^2\alpha+\cos^2\alpha=1,\quad\tan\alpha=\frac{\sin\alpha}{\cos\alpha}`,'α là góc nhọn; sin²α nghĩa là (sin α)².',r`\sin\alpha=\frac35\Rightarrow\cos\alpha=\frac45`,'Góc nhọn α có sin α = 3/5. Cos α bằng bao nhiêu?',0.8,'Chọn căn dương vì α là góc nhọn.'],
 ['complementary','Hai góc phụ nhau',r`\sin\alpha=\cos(90^\circ-\alpha),\quad\tan\alpha=\cot(90^\circ-\alpha)`,'0° < α < 90°.',r`\sin30^\circ=\cos60^\circ=\frac12`,'Sin 30° bằng bao nhiêu?',0.5,'Phụ nhau có tổng 90°, bù nhau có tổng 180°.'],
 ['circumference','Chu vi đường tròn',r`C=2\pi r=\pi d`,'r > 0 là bán kính; d = 2r là đường kính.',r`r=4\Rightarrow C=8\pi`,'Đường tròn bán kính 4 cm có chu vi kπ cm. k bằng bao nhiêu?',8,'Phân biệt chu vi 2πr và diện tích πr².'],
 ['arc','Độ dài cung tròn',r`l=\frac{\pi rn}{180}`,'r > 0 là bán kính; n là số đo góc ở tâm của cung, tính bằng độ.',r`r=6,\ n=60\Rightarrow l=2\pi`,'Cung 60° của đường tròn bán kính 6 cm dài kπ cm. k bằng bao nhiêu?',2,'Góc n phải dùng đơn vị độ trong công thức này.'],
 ['sector','Diện tích hình quạt tròn',r`S=\frac{\pi r^2n}{360}=\frac{lr}{2}`,'n là góc ở tâm tính bằng độ; l là độ dài cung tương ứng.',r`r=6,\ n=90\Rightarrow S=9\pi`,'Quạt tròn bán kính 6 cm, góc 90° có diện tích kπ cm². k bằng bao nhiêu?',9,'Không nhầm công thức diện tích quạt với độ dài cung.'],
 ['annulus','Diện tích hình vành khuyên',r`S=\pi(R^2-r^2)`,'Hai đường tròn đồng tâm có bán kính R > r > 0.',r`R=5,\ r=3\Rightarrow S=16\pi`,'Vành khuyên có R = 5, r = 3. Diện tích kπ, k bằng bao nhiêu?',16,'Lấy hiệu hai bình phương, không bình phương hiệu hai bán kính.'],
 ['inscribed','Góc nội tiếp',r`\alpha=\frac12\widehat{\text{cung bi chan}}`,'Đỉnh góc nằm trên đường tròn; hai cạnh chứa các dây cung.',r`\widehat{\text{cung}}=100^\circ\Rightarrow\alpha=50^\circ`,'Góc nội tiếp chắn cung 100° có số đo bao nhiêu độ?',50,'Cung bị chắn không chứa đỉnh của góc nội tiếp.'],
 ['cyclic','Tứ giác nội tiếp',r`A+C=180^\circ,\quad B+D=180^\circ`,'A, B, C, D theo thứ tự là bốn góc trong của tứ giác nội tiếp.',r`A=75^\circ\Rightarrow C=105^\circ`,'Một góc của tứ giác nội tiếp bằng 75°. Góc đối diện bằng bao nhiêu độ?',105,'Hai góc đối bù nhau; hai góc kề không nhất thiết bù nhau.'],
 ['tangent','Tiếp tuyến và bán kính',r`OT\perp d`,'d tiếp xúc đường tròn tâm O tại T; OT là bán kính tới tiếp điểm.',r`\angle(OT,d)=90^\circ`,'Góc giữa tiếp tuyến và bán kính tại tiếp điểm bằng bao nhiêu độ?',90,'Bán kính phải đi đến đúng tiếp điểm.']
]);
section(9,'geometry','Hình trụ, hình nón và hình cầu',[
 ['cylinder','Hình trụ',r`V=\pi r^2h,\quad S_{\mathrm{xq}}=2\pi rh`,'r > 0 là bán kính đáy; h > 0 là chiều cao.',r`r=3,\ h=4\Rightarrow V=36\pi`,'Hình trụ bán kính 3 cm, cao 4 cm có thể tích kπ cm³. k bằng bao nhiêu?',36,'Diện tích toàn phần cần cộng thêm diện tích hai đáy.'],
 ['cone','Hình nón',r`V=\frac13\pi r^2h,\quad S_{\mathrm{xq}}=\pi rl`,'r là bán kính, h là chiều cao, l là đường sinh; l² = r² + h².',r`r=3,\ h=4\Rightarrow l=5,\ V=12\pi`,'Hình nón bán kính 3 cm, cao 4 cm có thể tích kπ cm³. k bằng bao nhiêu?',12,'Thể tích dùng chiều cao h; diện tích xung quanh dùng đường sinh l.'],
 ['sphere','Hình cầu và mặt cầu',r`S=4\pi r^2,\quad V=\frac43\pi r^3`,'r > 0 là bán kính; S là diện tích mặt cầu, V là thể tích hình cầu.',r`r=3\Rightarrow S=36\pi,\ V=36\pi`,'Hình cầu bán kính 3 cm có thể tích kπ cm³. k bằng bao nhiêu?',36,'Đơn vị diện tích là cm², đơn vị thể tích là cm³ dù hệ số có thể trùng.']
]);
section(9,'statistics','Thống kê và xác suất',[
 ['relative-frequency','Tần số tương đối',r`f_i=\frac{n_i}{N},\quad\sum_i f_i=1`,'N > 0 là số quan sát; các nhóm phân loại đầy đủ, không chồng lặp.',r`n_i=8,\ N=40\Rightarrow f_i=0.2`,'Nhóm có 8 quan sát trong tổng 40. Tần số tương đối bằng bao nhiêu?',0.2,'Tổng phần trăm các nhóm là 100%; có thể chênh nhẹ khi làm tròn.'],
 ['complement','Biến cố đối',r`P(\overline A)=1-P(A)`,'A và biến cố đối bao phủ toàn bộ kết quả và không thể đồng thời xảy ra.',r`P(A)=0.3\Rightarrow P(\overline A)=0.7`,'P(A) = 0,3. Xác suất biến cố đối bằng bao nhiêu?',0.7,'Chỉ lấy 1 trừ xác suất khi đúng là hai biến cố đối nhau.']
]);
export const curriculumFormulas=entries;
