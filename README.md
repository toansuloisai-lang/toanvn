# Math Lab — Phòng thí nghiệm tư duy Toán

Xem [Phân tích kiến thức và chấm tự luận](KNOWLEDGE.md) và [Thi trắc nghiệm có thời gian](EXAMS.md) cho luồng giao bài, lưu lỗi sai, sửa bài và báo cáo phụ huynh.

## Deploy Render + Supabase

Cấu hình triển khai dùng PostgreSQL của Supabase để giữ tài khoản, tiến độ và tài liệu; Render không cần Persistent Disk. Xem [RENDER.md](RENDER.md) để tạo project, chuyển dữ liệu local giữ nguyên mật khẩu và deploy. Chuẩn bị bản xuất bằng `npm run supabase:prepare`, thêm `SUPABASE_DB_URL` vào `.env`, rồi chạy `npm run supabase:migrate` và `npm run supabase:verify`. Chế độ local JSON vẫn được giữ cho phát triển/kiểm thử.

Giáo viên có thể gửi **bảng điểm và hồ sơ học tập PDF** qua Gmail, gồm lịch sử bài làm, phút hoạt động mới ghi nhận, lỗi có dẫn chứng, hướng khắc phục và xác nhận giáo viên. Luồng: xem PDF nháp → xác nhận báo cáo → gửi email kèm đúng tệp đã xác nhận. Xem [GMAIL.md](GMAIL.md).

Web/PWA tiếng Việt, xây theo `baocaoduan.docx` và trọng tâm học từ lỗi sai trong `Góp ý STTTN.docx`.

## Thống kê và cập nhật trang

Trang chủ và báo cáo dùng chung cách tính trong `public/learning-stats.js`, theo các bài hiện có của lớp đang chọn. Thanh tiến độ chủ đề là số bài khác nhau đã hoàn thành / số bài hiện có; số lần đúng và lỗi sai được tính riêng. Sổ tay vẫn giữ bài thuộc lớp khác hoặc bài chưa có trong danh mục phiên bản hiện tại. Nội dung thiếu không làm hỏng điều hướng hoặc để lại giao diện của trang trước.

Khi mở trang chủ, báo cáo hoặc sổ tay, ứng dụng lấy lại dữ liệu từ máy chủ sau khi chờ lượt lưu đang chạy. Tab quay lại cũng cập nhật các trang chỉ đọc. `/api/version` nhận diện thay đổi mã giao diện; tab đang mở sẽ thông báo có bản cập nhật, không tự làm mất nội dung đang nhập. Các tab mở từ trước khi có chức năng này cần tải lại một lần. Kiểm tra: `node scripts/check-routing-stats.mjs`.

## Giao diện theo ảnh tham chiếu

Trang chủ được dựng lại theo ảnh người dùng cung cấp, tại viewport 1536 × 1024: sidebar 242 px, thanh đầu trang 70 px, banner tại (260, 82) cao 214 px, cột phải 360 px. Có bốn thẻ chức năng, sáu bước lộ trình, biểu đồ vòng, bảng lỗi và thông báo. Menu và trang chủ được tách theo vai trò đăng nhập; học sinh không có thẻ hay menu quản lý của giáo viên/phụ huynh. Màn hình nhỏ tự sắp lại thành một cột.

Minh họa học sinh/phụ huynh, icon và font là bản dựng/thay thế; chưa có tài nguyên gốc nên không khẳng định giống từng pixel. Font ưu tiên Segoe UI trên Windows, Noto Sans cục bộ làm fallback (giấy phép OFL trong `public/assets/fonts/OFL.txt`).

Trang chủ dùng lớp đã lưu trong hồ sơ để chọn chủ đề và bài học. Khi chưa có lượt học, tiến độ bằng 0; không hiển thị điểm hay phần trăm minh họa. Dữ liệu tiến độ trên trang chủ chỉ tính các bài thuộc lớp đang chọn; sổ tay vẫn giữ lịch sử các lớp trước.

### Nội dung theo lớp 6–9

### Bộ bài demo nạp từ giáo viên

Giáo viên mở **Kho bài học** (`#teacher-library`), xem trước nội dung rồi bấm **Nạp 20 bài demo cho lớp 6–9**. Mỗi lớp có 5 bài học, mỗi bài gắn 3 bài luyện; tổng cộng 60 lượt gắn bài luyện (có bài nền tảng được dùng lại giữa hai lớp). Bài học gồm mục tiêu, kiến thức chính, ví dụ có hướng dẫn, lỗi thường gặp và đường dẫn luyện tập. Không coi số lượng này là một tỉ lệ xác định của toàn bộ chương trình.

Nút nạp xuất bản bộ nội dung biên soạn sẵn vào thư viện dùng chung, chưa phải công cụ nhập nội dung tùy ý. Danh sách đã xuất bản lưu trong `private/accounts.json` cùng thời gian và người nạp; nạp lại không tạo trùng, không sửa lịch sử, hồ sơ hay nhận xét. Học sinh tải lại trang để nhận bộ bài đã nạp: mỗi lớp hiện 5 bài học/15 bài luyện; bài cũ vẫn xem lại được trong sổ tay. Chỉ giáo viên có quyền gọi API nạp bài. Kiểm tra bằng `node scripts/check-lessons.mjs` và `npm test`.

### Chuyển lớp trong hồ sơ

Lưu lớp trong Hồ sơ sẽ cập nhật trang chủ, lộ trình, bài học, luyện tập, tìm kiếm và bảng công thức. Hồ sơ lưu ở máy chủ nên tải lại hoặc đăng nhập lại vẫn giữ lớp. Vai trò tài khoản không đổi. Các đường dẫn tới bài cũ vẫn mở được để ôn lại, kèm nhãn lớp của bài.

Kho khởi đầu có 60 bài riêng biệt, một số bài nền tảng được dùng ở hai lớp: lớp 6 có 15 bài, lớp 7 có 24 bài, lớp 8 có 24 bài và lớp 9 có 15 bài. Lớp 9 gồm căn bậc hai, hệ phương trình, phương trình bậc hai, tỉ số lượng giác góc nhọn và đường tròn. Đây chưa phải toàn bộ chương trình hay lộ trình theo một bộ sách cụ thể. Ba thí nghiệm Khám phá vẫn là hoạt động dùng chung.

Bảng công thức có tổng cộng 18 mục; học sinh thấy các mục được gắn với lớp của mình, giáo viên có thể xem toàn thư viện. Công thức lượng giác có hình tam giác và thanh trượt cập nhật tỉ số. Kiểm tra chuyển lớp, lưu hồ sơ và giữ lịch sử: `node scripts/check-grades.mjs`.

Tìm kiếm ở thanh đầu trang hoạt động với từ khóa tiếng Việt có/không dấu. Các trang Học tập, Thử thách, Bảng công thức, Hồ sơ, Cài đặt và Thông báo đã được nối với chức năng thật. Thẻ “Bài học tương tác” giữ câu giới thiệu theo ảnh; thư viện hiện có ví dụ và quy tắc mở rộng, chưa có video.

Kiểm tra giao diện và điều hướng: `node scripts/check-design.mjs` (script tự tạo máy chủ tạm). Ảnh chụp trong `artifacts/reference-desktop.png` và `artifacts/reference-mobile.png`.

## Chạy trên máy

### Bảng công thức 3D

Mở `http://localhost:3000/#formulas`. Bản thử có **16 công thức** chia thành số học, đại số và hình học. Three.js + CSS3DRenderer sắp các ô KaTeX thành bảng, hình cầu hoặc xoắn ốc, chuyển cảnh mượt; hỗ trợ kéo xoay, cuộn/chụm thu phóng, phím mũi tên, nút thu/phóng, tự xoay và đặt lại góc nhìn. Có chế độ danh sách; điện thoại mở danh sách trước để chữ dễ đọc, vẫn chọn được 3D. Tôn trọng thiết lập giảm chuyển động của thiết bị.

Nút **Xem chi tiết** dưới mỗi ô mở điều kiện áp dụng, ý nghĩa ký hiệu, các dạng bài dùng được/không dùng được, bài mẫu giải từng bước, phản ví dụ kèm lý do và một câu tự kiểm tra có phản hồi. Nội dung được biên soạn sẵn, không cần gọi AI. Kết quả tự kiểm tra được lưu trong hồ sơ học sinh để giáo viên xem và nhận xét, theo dõi riêng với điểm nhiệm vụ.

Sáu công thức hình học có hình minh họa tương tác: Pythagore, diện tích hình chữ nhật/tam giác/hình tròn, thể tích hộp chữ nhật và tổng ba góc tam giác. Thanh trượt cập nhật số đo và kết quả. Hình hộp dùng Three.js WebGL để xoay, có sơ đồ SVG dự phòng nếu thiết bị không hỗ trợ WebGL. Ví dụ giải bên cạnh có dữ kiện cố định; hình thử nghiệm thay đổi độc lập. Phần hình học phẳng dùng SVG để giữ ký hiệu và số đo rõ nét.

Thư viện và nội dung 3D được lưu cục bộ và cache ngoại tuyến. Khi rời trang hoặc đóng hộp chi tiết, ứng dụng dừng hiệu ứng và giải phóng tài nguyên đồ họa. Sau khi nâng phiên bản Three.js, chạy `node scripts/vendor-three.mjs` để cập nhật bản phục vụ trong `public/vendor/three/` (kèm giấy phép MIT).

Kiểm tra: `node scripts/check-atlas.mjs` với máy chủ tạm do script tạo. Script kiểm tra các bố cục, toàn bộ hướng dẫn, tương tác hình học, tự kiểm tra, điện thoại, giảm chuyển động, ngoại tuyến và thoát trang. Ảnh xem trước: `artifacts/formula-atlas-table.png`, `artifacts/formula-atlas-sphere.png`, `artifacts/formula-detail-pythagoras.png`.

### Hiển thị công thức toán

Ứng dụng dùng KaTeX cục bộ để hiển thị phân số, lũy thừa, chỉ số, căn, bất đẳng thức và hệ phương trình. Thư viện, CSS và font được cache trong PWA để hoạt động ngoại tuyến. Đề bài, lời giải mẫu, kết quả, sổ lỗi, nhận xét và phản hồi Gemini đều dùng chung bộ dựng công thức.

Trong lời giải thích/nhận xét, viết `\(\frac{1}{2}\)` cho công thức trong câu, hoặc `\[\begin{cases}x+y=5\\x-y=1\end{cases}\]` cho công thức riêng dòng. Cũng hỗ trợ `$...$` và `$$...$$`. Dưới ô nhập có phần xem trước. Ô **đáp án** vẫn dùng cú pháp đơn giản `1/2`, `3x+6`, `(-2)^3` theo bộ chấm hiện tại; phần hiển thị không mở rộng phạm vi chấm bài hay tự khẳng định đáp án đúng.

Gemini được yêu cầu dùng LaTeX. LaTeX sai/không hỗ trợ sẽ giữ lại bản gốc thay vì làm mất nội dung. HTML do người dùng/AI nhập được escape; KaTeX chạy với `trust: false`. Các công thức văn bản cũ trong kho bài có danh sách chuyển đổi rõ ràng, không đoán ngày tháng hoặc điểm số thành phân số.

Sau khi nâng phiên bản KaTeX bằng npm, chạy `node scripts/vendor-math.mjs` để cập nhật tài nguyên trong `public/vendor/katex/`. Giấy phép MIT được giữ tại đó. Kiểm tra: `npm test`, `node scripts/check-math.mjs` (script tự tạo máy chủ tạm). Bài kiểm tra trình duyệt dùng phản hồi Gemini giả lập; API Gemini thực vẫn cần khóa.

Cần Node.js 22 trở lên. Chạy `npm ci` để cài các thư viện trước khi chạy ứng dụng.

```powershell
Copy-Item .env.example .env
# Chỉ lần đầu, khi chưa có tài khoản:
node scripts/setup-accounts.mjs
npm start
```

Mở **http://localhost:3000**. Để bật Gemini, điền vào `.env` rồi khởi động lại:

```dotenv
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
HOST=127.0.0.1
```

Tạo khóa trong Google AI Studio. Model được chọn mặc định là Gemini 2.5 Flash; có thể thay bằng model được cấp quyền trong tài khoản. Khóa chỉ được đọc ở máy chủ, không được gửi tới trình duyệt. Không commit `.env`. Nếu model không khả dụng, hết hạn mức hoặc mất mạng, ứng dụng phản hồi bằng quy tắc và ghi rõ nguồn. Chưa có khóa thì vẫn dùng được toàn bộ luồng học, trừ phản hồi thực từ Gemini.

## Đã triển khai

- 60 bài khởi đầu gắn với lớp 6–9; giữ nguyên định danh các bài cũ để bảo toàn lịch sử.
- Vòng học: trả lời độc lập → tìm quy tắc bị vi phạm trong lời giải mẫu → tự sửa → giải thích cho máy hoặc gửi giáo viên → bài tương tự → hẹn ôn 1/3/7 ngày.
- Lưu câu trả lời ban đầu ngay khi nộp, kể cả chưa hoàn thành hành trình; không trộn đáp án sau gợi ý với kết quả độc lập.
- Sổ lỗi, lịch ôn, bản đồ quan hệ tiên quyết và báo cáo lưu theo tài khoản ở máy chủ. Trang chủ chưa có lượt học hiển thị mẫu giao diện có nhãn riêng như mô tả trên.
- Giáo viên giao nhiệm vụ và nhận xét học sinh được phân công; phụ huynh chỉ xem báo cáo con được liên kết và in/lưu PDF; quản trị tạo tài khoản và quản lý liên kết.
- Ba thí nghiệm: phản ví dụ hình chữ nhật, hộp đen hàm bậc nhất, tối ưu vườn với hàng rào.
- Giao diện responsive, dùng trên web hoặc cài như ứng dụng từ trình duyệt. Có nút cài, hướng dẫn Android/iPhone/máy tính, biểu tượng riêng, thông báo mất mạng và cập nhật an toàn. Xem [hướng dẫn PWA](PWA.md). Tài nguyên toán/3D được cache; mở lại app cần mạng để xác thực, dữ liệu tài khoản/API không được cache.
- API có giới hạn kích thước, giới hạn số yêu cầu theo IP, timeout và phản hồi dự phòng. Không thực thi biểu thức do người dùng nhập bằng eval.

## Cài PWA

Trên máy tính, mở localhost bằng Chrome/Edge, dùng biểu tượng cài ứng dụng trên thanh địa chỉ hoặc nút Cài ứng dụng khi trình duyệt hỗ trợ. Trên iPhone dùng Safari → Chia sẻ → Thêm vào Màn hình chính.

Khi đưa lên máy chủ/điện thoại, cần HTTPS để service worker và chức năng cài đặt hoạt động. `localhost` được trình duyệt cho phép dùng HTTP. Nếu thử qua LAN, đặt HOST=0.0.0.0; HTTP qua IP LAN không đáp ứng điều kiện PWA. Chưa triển khai lên Internet trong phiên bản này.

## Phạm vi và giới hạn

Đã có xác thực và phân quyền ở máy chủ. Dữ liệu lưu trong `private/accounts.json`, chỉ phù hợp một tiến trình Node trên máy chủ nhỏ; chưa phải cơ sở dữ liệu cho nhiều máy chủ. Sao lưu thư mục `private` khi máy chủ đã dừng. Phiên đăng nhập lưu trong bộ nhớ, hết hạn sau 8 giờ và mất hiệu lực khi khởi động lại máy chủ. Khi triển khai HTTPS, đặt `COOKIE_SECURE=true` trong `.env`.

Dữ liệu dùng thử cũ trong localStorage không tự gán cho tài khoản nào để tránh trộn lịch sử của nhiều người. Bài làm mới lưu theo tài khoản trên máy chủ. Khi mất mạng, dữ liệu chưa đồng bộ chỉ giữ trong tab; kết nối lại sẽ thử lưu tiếp, tải lại tab trước khi lưu có thể mất phần chưa đồng bộ. Không có thông báo nền hay gửi email; lịch ôn hiển thị khi mở app. Các thí nghiệm ở Góc khám phá là phiên thực hành tạm thời và chưa được tính vào báo cáo kỹ năng.

## Tài khoản và phân quyền

### Giáo viên tải tài liệu lên

Trong **Kho bài học**, biểu mẫu **Tải bài lên** nhận tên bài, lớp 6–9, hướng dẫn và một file PDF hoặc Word `.docx` tối đa 10 MB. Chọn **Xem lại trước khi đăng**, kiểm tra thông tin rồi **Đăng bài cho học sinh**. Bước xem lại là xem thông tin bài và tên file, không tự trích xuất nội dung Word/PDF. Tài liệu tải lên giữ nguyên định dạng để tải về, chưa chuyển thành câu hỏi chấm điểm hoặc tăng số bài đã hoàn thành.

Giáo viên thấy các bài do mình tải; học sinh chỉ thấy tài liệu đúng lớp hiện tại từ giáo viên được quản trị phân công. Máy chủ kiểm tra lại quan hệ này khi tải file. Tài liệu nằm trong `private/uploads`, metadata nằm trong `private/accounts.json`; API trả `no-store`, service worker không cache file. Gửi lại cùng tên bài, lớp, hướng dẫn và nội dung file không tạo bản trùng. Chưa có sửa/xóa bài đã đăng hoặc nhận file `.doc` cũ. Khi sao lưu cần giữ cả metadata lẫn thư mục uploads.

Kiểm tra: `node scripts/check-upload.mjs` (máy chủ và file thử riêng), cùng các kiểm tra định dạng, dung lượng và phân quyền trong `npm test`.

### Cấp tài khoản

Lần đầu, khi máy chủ chưa chạy, dùng `node scripts/setup-accounts.mjs`. Lệnh chỉ chạy khi chưa có tài khoản, tạo học sinh, giáo viên, phụ huynh và quản trị với mật khẩu ngẫu nhiên riêng trong `private/tai-khoan-ban-dau.md`. File này không được phục vụ qua web và không được commit. Giáo viên/phụ huynh ban đầu được liên kết với học sinh ban đầu.

Đăng nhập bằng tên và mật khẩu; không chọn vai trò. Máy chủ quyết định vai trò từ tài khoản. Quản trị tạo tài khoản mới và phân công học sinh qua giao diện. Có thể tạo tài khoản bằng CLI khi máy chủ dừng: `node scripts/create-account.mjs ten_dang_nhap student "Họ tên"`; CLI xuất mật khẩu ngẫu nhiên hoặc nhận từ biến môi trường `ACCOUNT_PASSWORD`.

- Học sinh chỉ đọc/lưu bài làm của chính mình; không được ghi nhận xét hay nhiệm vụ.
- Giáo viên chỉ đọc, giao bài và nhận xét học sinh được quản trị phân công.
- Phụ huynh chỉ đọc báo cáo học sinh được liên kết.
- Quản trị quản lý tài khoản và liên kết, không mặc nhiên có quyền làm bài hay ghi nhận xét thay giáo viên.

Mật khẩu băm bằng scrypt với salt riêng. Cookie phiên dùng HttpOnly, SameSite=Strict; API kiểm tra phiên, vai trò, học sinh liên kết và nguồn yêu cầu. Sửa localStorage, nhập thẳng URL hoặc giả trường role trong request không cấp quyền. Các API riêng tư trả `Cache-Control: no-store` và không đi qua cache service worker. Chưa có đăng ký tự do, khôi phục mật khẩu qua email hoặc cập nhật trực tiếp theo thời gian thực; tải lại báo cáo để lấy dữ liệu mới.

Phản hồi Gemini không quyết định học sinh đã hiểu; đánh giá lập luận do giáo viên thực hiện. Bộ chấm biểu thức chỉ hỗ trợ dạng số và biểu thức đại số đơn giản của kho bài này, không phải CAS tổng quát. Kho bài tập ở trình duyệt nên đây không phải nền tảng thi có bảo mật đáp án.

Chưa triển khai game cầu/nhà 3D, bảng hình học động đầy đủ, chương trình toàn bộ lớp 6–9, Gmail, AI hội thoại hay hệ thống thi thử. Phạm vi tập trung demo nhỏ chạy trọn vòng theo tài liệu góp ý; 24 bài là tình huống luyện tập, không khẳng định đại diện 24 loại lỗi độc lập.

## Kiểm tra

```powershell
npm test
```

Kiểm tra bộ chấm, kho bài, phục vụ tài nguyên PWA, chặn truy cập file ngoài public, API validation và phản hồi quy tắc. Kiểm tra Gemini thực cần API key riêng.

Kiểm tra trình duyệt (máy đã cài Edge; script tự tạo máy chủ và tài khoản tạm, không sửa tài khoản đang dùng):

```powershell
npm install
node scripts/e2e.mjs
node scripts/check-explore.mjs
```

`e2e.mjs` chạy kiểm tra đăng nhập, URL bị chặn, giả mạo localStorage, dữ liệu học sinh độc lập, vòng học, giáo viên giao bài/nhận xét, phụ huynh chỉ xem, quản trị tạo tài khoản, điện thoại, đăng xuất và khóa khi tải lại ngoại tuyến. Kiểm tra API trong `npm test` bao gồm vượt quyền và truy cập học sinh không liên kết. Ảnh chụp được lưu trong `artifacts/`.

### Góc khám phá 3D

Ba thí nghiệm dùng Three.js cục bộ, hoạt động ngoại tuyến: hai hình chữ nhật cùng tỉ lệ, khu vườn có tường và hàng rào ba cạnh, máy hộp đen có chuyển động đầu vào. Kéo để xoay, cuộn hoặc chụm hai ngón để thu/phóng; có nút nhìn từ trên, đặt lại và hỗ trợ phím mũi tên. Số đo cập nhật theo dữ kiện; công thức hiển thị bằng KaTeX.

Độ dày hình chữ nhật chỉ để minh họa, diện tích tính trên mặt hình. Khu vườn dùng 24 m rào cho ba cạnh, đạt diện tích lớn nhất 72 m² khi a = 6 m và b = 12 m. Các phương án lưu chỉ tồn tại trong phiên thí nghiệm hiện tại. Hộp đen yêu cầu ít nhất hai đầu vào khác nhau trước khi kiểm tra giả thuyết. Khi WebGL không khả dụng hoặc mất ngữ cảnh, sơ đồ dự phòng giữ phần bài tập sử dụng được. Chuyển động tôn trọng thiết lập giảm chuyển động của thiết bị.

`check-explore.mjs` kiểm tra WebGL, dữ kiện, kết quả toán, điều khiển, ba kích thước màn hình, ngoại tuyến, mất ngữ cảnh và chuyển trang.
# Giáo viên soạn công thức và bài luyện

Trong **Kho bài học → Soạn công thức & bài luyện tập**, chọn loại nội dung và lớp. Thanh công cụ chèn LaTeX và xem trước ngay khi nhập. Giáo viên có thể nhập mô tả rồi bấm **AI tạo bản nháp**, sửa các trường, xem lại, xác nhận đã kiểm tra và duyệt đăng. Bản nháp AI không tự xuất bản. Gemini dùng `GEMINI_API_KEY` và `GEMINI_MODEL` trong `.env` (mặc định `gemini-2.5-flash`); thiếu khóa vẫn soạn thủ công được.

Nội dung lưu trong cơ sở dữ liệu tài khoản; học sinh được phân công đúng giáo viên và đúng lớp mới nhận nội dung. Công thức mới xuất hiện trong mục Bảng công thức dưới dạng thẻ có phần cách dùng và ví dụ; chưa tự tạo mô hình hình học 3D. Bài luyện mới đi vào luồng luyện tập, sửa lỗi, giải thích và lưu tiến độ. Đáp án tự chấm của nội dung giáo viên hiện giới hạn ở số hoặc phép tính số (ví dụ `1/2`); chưa hỗ trợ chấm chứng minh hay đáp án tập hợp. Nội dung đã đăng chưa có chức năng sửa/xóa.

Kiểm tra: `npm test`, `node scripts/check-content.mjs` (thanh công thức, duyệt đăng, học sinh làm bài và lưu tiến độ). Kiểm thử Gemini dùng phản hồi giả lập để không cần khóa API; kiểm thử thật cần cấu hình khóa.

