# Rà soát trước deploy — 17/10/2026

## Cập nhật sau sửa lỗi

Đã xử lý 10 vấn đề được xác nhận bên dưới. Các phần từ “Kết luận lúc rà soát” trở đi ghi nhận trạng thái **trước khi sửa**, không phản ánh cấu hình hiện tại.

- Đã đồng bộ và kiểm chứng Supabase: 28 tài khoản, 1 lớp, 40 tài liệu; `.env` hiện dùng `MATH_STORAGE=supabase`. Đăng nhập đủ 28 tài khoản và tải PDF/tài liệu khớp hash bản gốc.
- Đã chặn đổi khối trái với lớp; tách giới hạn đăng nhập theo tài khoản/IP và chỉ tin proxy được cấu hình; tách cache AI theo người xem; hoàn tác bộ nhớ khi lưu thất bại.
- Đã nối kết quả DATATM vào báo cáo/biểu đồ, sửa khối mặc định của công thức, lỗi điều hướng khi chatbot đang trả lời, nút tải thêm tài liệu và nhãn giao diện còn sót.
- Tách PDF và ảnh hội thoại khỏi JSON: snapshot giảm từ 84.288.409 xuống 8.557.112 byte, giữ nguyên nội dung tệp. Có sao lưu cả nguồn và Supabase trước chuyển đổi trong `private/backups/`.
- Kiểm tra tự động: **103/103 đạt**. PostgreSQL đạt kiểm tra import/export, mật khẩu, tệp đính kèm, PDF sau khởi động lại, xung đột revision, thay snapshot và rollback giao dịch. Kiểm tra AI dùng phản hồi giả lập, không chứng minh chất lượng mọi câu trả lời thực tế.
- Kiểm tra trình duyệt: **36/36 đạt**, gồm hai kịch bản chạy lại sau khi sửa thao tác kiểm tra để mở đúng tab/mục thu gọn của giao diện hiện tại. Kết quả đầu và lần chạy lại được giữ trong `artifacts/fix-browser-results.json`.
- Đã bổ sung cấu hình Nginx, systemd, dừng server an toàn và hướng dẫn trong `VPS.md`. Chỉ chạy một tiến trình ghi dữ liệu; dừng server local trước khi chạy bản VPS.

**Còn giới hạn:** chưa kiểm chứng HTTPS/domain và dịch vụ trên VPS thật. Chuỗi thư viện nhập Word còn 3 cảnh báo mức moderate, không có high/critical trong lần audit; chưa có bản nâng cấp an toàn được xác nhận. Không khẳng định dự án hoàn toàn không còn bug. Không đồng bộ ngược JSON cũ lên Supabase sau khi đã phát sinh thao tác mới.

## Kết luận lúc rà soát (trước sửa)

Chưa nên bàn giao bản hiện tại cho khách hàng. Các chức năng chính đã có luồng chạy được, nhưng còn lỗi liên kết dữ liệu, phân tích theo giáo viên, giới hạn đăng nhập sau proxy và dữ liệu Supabase chưa cập nhật. Đây là báo cáo kiểm tra, chưa phải bản sửa các lỗi bên dưới.

Lần rà này chỉ tạo tài liệu và kịch bản kiểm chứng trong `artifacts/`; không sửa logic sản phẩm, không thay dữ liệu lớp, không ghi Supabase và không gửi thư thật. Gmail được kiểm tra bằng SMTP verify. Các thao tác tạo lớp, làm bài, giả lập lỗi lưu và AI chạy với dữ liệu tạm.

## Bằng chứng kiểm tra

- `node --test`: **99/99 đạt**.
- 35 kịch bản trình duyệt dùng dữ liệu riêng: **28 đạt, 7 không đạt**. Bộ chạy ban đầu dừng bài thi ở 55 giây, trong khi kịch bản chủ động chờ 61 giây; đã chạy lại riêng và đạt cả tự nộp lúc mất mạng và kết quả giáo viên. Không tính thời gian chờ này là lỗi sản phẩm.
- `scripts/check-supabase.mjs`: PostgreSQL riêng đạt import/export, hash mật khẩu, phân quyền schema, tệp đính kèm, PDF đã duyệt sau restart, phát hiện xung đột và rollback.
- Supabase thật: kết nối và truy vấn **chỉ đọc** thành công; snapshot đang là revision 1, cập nhật 11/10/2026, **4 tài khoản, 0 lớp**. Dữ liệu local hiện có **28 tài khoản, 1 lớp, 40 tài liệu**.
- Gmail SMTP: **xác thực thành công**, không gửi mail.
- Bảy key Gemini đã gọi thành công với `gemini-2.5-flash` ở lượt kiểm tra ngay trước đợt audit này. Audit không gọi lại AI thật; các kiểm tra tích hợp AI dùng phản hồi giả lập.
- Kiểm tra import trực tiếp của JavaScript ở `public/` và 156 mục precache: không thấy tệp thiếu.
- Kiểm tra liên kết tài khoản/học sinh và khối lớp trong dữ liệu local hiện tại: không thấy liên kết mồ côi hoặc khối lệch. Điều này không phủ nhận lỗi cho phép tạo trạng thái lệch khối bên dưới.
- Kiểm tra nguồn xuất dữ liệu local: 41 tệp trong uploads, tổng khoảng 43,64 MB; các tệp tài liệu/ảnh được tham chiếu đều qua kiểm tra kích thước và hash. Không tạo bản export hoặc sửa dữ liệu nguồn.
- `npm audit --omit=dev`: 3 moderate cùng chuỗi Mammoth → argparse → sprintf-js; **0 high, 0 critical**. Chưa tái hiện được khai thác qua tính năng nhập Word.

Các kết quả trình duyệt chi tiết nằm trong `artifacts/audit-browser-results.json`; tái hiện 7 lỗi cũ trong `artifacts/audit-integration-gaps.json`. Các kịch bản bổ sung: `artifacts/audit-new-links.mjs`, `artifacts/audit-environment.mjs`.

## Các vấn đề cần xử lý

### 1. Chặn chuyển sang Supabase — dữ liệu production chưa phải bản đang dùng

**Bằng chứng:** Supabase 4 tài khoản/0 lớp; local 28 tài khoản/1 lớp. Hiện `.env` chọn `MATH_STORAGE=json`, nên thao tác trên máy đang ghi file local, không tự đồng bộ Supabase.

**Ảnh hưởng:** đổi sang `MATH_STORAGE=supabase` lúc deploy sẽ thấy dữ liệu cũ, thiếu lớp và các tài khoản hiện tại. Đây là cấu hình và đồng bộ dữ liệu, không phải lỗi mất dữ liệu đã xảy ra.

**Xử lý:** chọn nguồn dữ liệu chính, sao lưu cả hai phía và thực hiện chuyển dữ liệu có kiểm chứng. `importSnapshot` trong `database/postgres.mjs` chủ động từ chối khi đích đã có dữ liệu; không chỉ chạy lại migrate và không xóa đích tùy tiện. Nếu dùng JSON trên VPS, phải chuyển đủ `private/accounts.json` và `private/uploads`, dùng ổ bền vững và một tiến trình Node.

### 2. Cao — học sinh tự đổi khối có thể chặn giao bài cả lớp

**Vị trí:** `auth-store.mjs:86`, kiểm tra giao bài ở `learning-service.mjs`.

**Tái hiện:** tạo lớp khối 9 có học sinh khối 9; học sinh lưu hồ sơ khối 8 nhận HTTP 200; giáo viên giao bài khối 9 cho lớp nhận HTTP 400 vì không còn đúng khối cho mọi thành viên.

**Xử lý:** khối hành chính theo lớp phải do giáo viên quản lý hoặc khóa sửa khi đang có lớp. Việc ôn kiến thức khối khác nên là lựa chọn riêng.

### 3. Cao trên VPS sau reverse proxy — một nhóm đăng nhập sai có thể chặn mọi người

**Vị trí:** `auth-store.mjs:43`, `server.mjs` truyền `req.socket.remoteAddress` vào login; `/api/explain` cũng giới hạn theo địa chỉ socket.

**Tái hiện:** 20 lần sai của một học sinh trên cùng IP; giáo viên nhập đúng ngay sau đó vẫn nhận HTTP 429. Nginx có thể khiến Node nhìn thấy cùng IP proxy cho mọi người. Chưa kiểm chứng proxy thật.

**Xử lý:** thiết kế giới hạn theo tài khoản kết hợp IP, hỗ trợ IP chuyển tiếp từ proxy được cấu hình tin cậy. Không tin tùy ý header do người gọi gửi.

### 4. Cao — cache phân tích AI dùng chung giữa các giáo viên

**Vị trí:** `learning-service.mjs:21`, `learning-service.mjs:77`.

**Tái hiện:** hai giáo viên được phân công cùng một học sinh; lưu phân tích của A; báo cáo của B nhận nội dung phân tích của A. Cache đang theo mã học sinh, trong khi dữ liệu bài kiểm tra/bài tự luận của báo cáo có lọc theo giáo viên.

**Ảnh hưởng:** phân tích có thể không đúng với bằng chứng đang hiển thị, đồng thời lẫn nội dung phân tích giữa phạm vi của hai giáo viên. Không phải truy cập một học sinh hoàn toàn không được phân công.

**Xử lý:** cache và revision cần theo học sinh, vai trò/người xem và phạm vi dữ liệu.

### 5. Cao khi lưu trữ gặp sự cố — có thao tác lỗi nhưng bộ nhớ vẫn thay đổi

**Vị trí:** `auth-store.mjs:39`, `auth-store.mjs:86`; còn các thao tác push/sửa rồi persist khác cần rà cùng cơ chế.

**Tái hiện:** storage giả lập ném lỗi khi tạo tài khoản; thao tác báo thất bại nhưng tài khoản vẫn xuất hiện trong `store.users()` của tiến trình đó.

**Ảnh hưởng:** bộ nhớ và dữ liệu đã lưu có thể lệch, thử lại gặp tài khoản trùng. Chưa phát hiện hỏng dữ liệu local thật. PostgreSQL có cơ chế ngừng phục vụ sau lỗi storage, nhưng không thay thế rollback trong domain service.

**Xử lý:** rollback các thao tác ghi nếu persist thất bại; giữ nguyên dữ liệu gốc và kiểm tra thử lại.

### 6. Vừa — bài DATATM chưa liên kết đầy đủ với thống kê tổng quan

**Vị trí:** `datatm-service.mjs`, `assessment-rollup.mjs`, `learning-service.mjs:21`, `knowledge-service.mjs:46`.

**Tái hiện:** làm sai một bài DATATM do gia sư giao. Sổ tay có 1 lịch sử và 1 lỗi DATATM, nhưng `learning.report().total` vẫn từ 0 sang 0.

**Ảnh hưởng:** số bài đã làm và các chỉ số/radar lấy từ learning report có thể khác sổ tay. Lịch sử chi tiết DATATM đã được lưu; không phải toàn bộ dữ liệu bị mất. PDF có phần knowledge riêng nên không kết luận tất cả nội dung PDF đều thiếu.

**Xử lý:** thống nhất nguồn tổng hợp; phân biệt đáp án đầu đúng, sửa đúng và bài được giáo viên xác nhận, tránh cộng trùng.

### 7. Vừa — bảng công thức tự chọn sai khối

**Vị trí:** `public/formula-atlas.js:29`.

**Tái hiện:** học sinh khối 9 vào bảng công thức; mặc định chọn khối 8, chỉ hiện 1 công thức, công thức nghiệm bậc hai bị ẩn. Thư viện vẫn có công thức; lỗi nằm ở bộ lọc mặc định.

**Xử lý:** truyền khối hồ sơ vào bộ lọc, không suy từ khối nhỏ nhất trong nhãn công thức dùng chung.

### 8. Vừa — rời chat khi Gemini đang trả lời gây lỗi JavaScript

**Vị trí:** `public/tutor-view.js:23`, `public/tutor-view.js:24`.

**Tái hiện:** gửi câu hỏi, chờ API; chuyển sang Trang chủ; cho API trả về. Trình duyệt báo `Cannot set properties of null (setting 'disabled')`.

**Nguyên nhân:** `root` là phần tử main vẫn còn trong DOM; `root.isConnected` không phát hiện nội dung chat đã bị thay. `finally` tiếp tục tìm nút cuộc trò chuyện mới đã không còn.

**Xử lý:** kiểm tra đúng phiên mount, hủy hoặc bỏ qua cập nhật giao diện cũ, cleanup an toàn. Không làm mất bản ghi cuộc trò chuyện đã gửi thành công.

### 9. Vừa — nút tải thêm tài liệu đưa về Trang chủ

**Vị trí:** `public/lesson-upload.js:4`.

**Tái hiện:** giáo viên ở thư viện tài liệu, nhấn “+ Tải thêm tài liệu”; hash chuyển `#upload-lesson`, router chuyển về `#home`, form upload không còn hiển thị.

**Xử lý:** cuộn đến form trên trang hiện tại hoặc dùng route được router hỗ trợ.

### 10. Thấp — nội dung giao diện chưa đúng yêu cầu trình bày

**Vị trí:** `public/teacher-library-view.js:19`.

Giáo viên chưa nạp bài vẫn thấy nút “Nạp 20 bài demo cho lớp 6–9”. Đây là chữ hiển thị trong sản phẩm, trái yêu cầu trước đó của người dùng.

## Hiệu năng và giới hạn vận hành

- Snapshot local khoảng **84,29 MB**; riêng `parentReports` khoảng **80,82 MB**. Chỉ stringify đã mất khoảng **139 ms** trong một phép đo local, chưa gồm ghi đĩa hoặc truyền database. Không coi đây là benchmark tải nhiều lớp.
- `persist()` JSON ghi lại toàn bộ snapshot; PostgreSQL cũng cập nhật toàn bộ payload JSONB (`database/postgres.mjs:37`), còn đường gọi chờ đồng bộ qua `Atomics.wait` (`database/storage.mjs:20`). Ảnh chat mới cũng nằm trong snapshot. Khi tăng học sinh hoặc gửi báo cáo nhiều đợt, điều này dễ tạo độ trễ và tốn băng thông tới DB.
- Nên tách PDF và ảnh chat ra kho tệp, giữ metadata/hash; giữ nguyên PDF đã duyệt, không tự xóa báo cáo. Cần đo tải sau thay đổi trước khi đưa nhiều lớp dùng đồng thời.
- Hiện chỉ phù hợp **một tiến trình ứng dụng ghi dữ liệu**. Không bật PM2 cluster hoặc nhiều instance. Bộ điều phối key Gemini cũng dùng bộ nhớ của một tiến trình.
- Phiên đăng nhập và preview Excel nằm trong RAM. Restart làm đăng xuất; file tài khoản vừa tạo cần tải về ngay. Chưa có luồng tải lại lâu dài theo lớp sau restart.
- Đọc ảnh và gửi ảnh đã liên kết với chat; nhưng truy xuất DATATM hiện chọn chủ đề từ chữ/hồ sơ trước khi gọi Gemini. Chưa có bước đọc chủ đề từ ảnh rồi truy xuất lại. Không nên quảng bá rằng ảnh bất kỳ đều tự tìm đúng bài liên quan trong toàn kho Word.
- DATATM hiện có 73 câu đã kiểm chứng, không phải toàn bộ nội dung Word đã thành ngân hàng câu hỏi. Gửi thêm Word vào Supabase chưa tự tạo câu hỏi có đáp án trong app.

## Phân loại 7 kịch bản trình duyệt chưa đạt

| Kịch bản | Kết quả cần hiểu đúng |
|---|---|
| `check-workflow-audit.mjs` | Không mở được công thức đang bị bộ lọc sai khối ẩn; lỗi sản phẩm đã tái hiện riêng. Các bước phía sau chưa được bài này chạy tới. |
| `check-atlas.mjs` | Kỳ vọng cũ đòi 99 thẻ 3D cùng hiện; hiện chia trang 6 thẻ. Không coi riêng phép đếm này là lỗi sản phẩm. |
| `check-math.mjs` | Kỳ vọng 6 công thức khối 9 trong khi thư viện có 31. Các kiểm tra công thức khác và kiểm tra logic đã đạt. |
| `check-roster.mjs` | Kỳ vọng CSV cũ, trong khi app xuất XLSX đúng yêu cầu. `check-roster-download.mjs` đạt. |
| `check-teacher-dashboard.mjs` | Chờ tiêu đề “Lớp học của tôi” cũ. Kịch bản workspace, class reports và class assessments mới đạt; các bước sau của bài cũ chưa được xác nhận bởi chính bài đó. |
| `check-routing-stats.mjs` | Không tìm thấy lịch sử bài thuộc catalog không biết. Cần cập nhật kỳ vọng và xác minh việc hiển thị lịch sử cũ, không mặc nhiên coi đây chỉ là lỗi kiểm tra. |
| `check-grades.mjs` | Dừng ở kỳ vọng lịch sử khác khối trong sổ tay khi trang còn đang tải. Cần đồng bộ chờ API và xác định chính sách xem lịch sử khác khối; lỗi bộ lọc công thức đã có bằng chứng riêng. |

## Những luồng đã có bằng chứng chạy được

Excel danh sách → tạo lớp → tài khoản học sinh/phụ huynh → tải XLSX; soạn đề thủ công/AI/Word với AI giả lập → bài thi → kết quả; tự luận ảnh → nộp ảnh → giáo viên chấm/cho nộp lại; tài liệu → lọc khối → tải xuống đúng quyền; báo cáo theo lớp → học sinh → radar; sổ tay → sửa bài → DATATM → lịch sử; chat chữ/ảnh → lịch sử → bài luyện → sổ tay; phụ huynh đổi con; email preview/PDF/queue qua bộ gửi giả lập; khám phá/công thức → lưu hoạt động; PWA và giao diện mobile trong trình duyệt.

## Điều kiện trước khi deploy thật

1. Sửa các vấn đề ưu tiên cao và các lỗi liên kết thấy được; chạy lại đúng tình huống tái hiện.
2. Chọn JSON hoặc Supabase, sao lưu và chuyển đủ dữ liệu hiện tại cùng tệp; xác minh lại số tài khoản, lớp, bài làm và tải tài liệu sau chuyển.
3. VPS cần HTTPS/domain, `COOKIE_SECURE=true`, Node không công khai cổng nội bộ nếu đứng sau Nginx. Cấu hình proxy phải hỗ trợ body ảnh/Excel/Word và thời gian xử lý AI/PDF. Repo chưa có cấu hình Nginx/PM2/systemd hoàn chỉnh để kiểm chứng.
4. Chạy một tiến trình, cấu hình tự khởi động lại, backup định kỳ và kiểm tra khôi phục. Nhiều tệp chức năng mới còn untracked/chưa commit; khi đưa qua Git phải đóng gói đầy đủ, `.env` và `private/` không nằm trong Git.
5. Kiểm tra trên VPS thật: HTTPS/cookie, tải lên ảnh lớn, tải tài liệu, kết nối DB, SMTP, PDF và độ trễ nhiều người dùng. Audit ở máy local không thay thế kiểm tra này. Chưa gửi email thật hoặc kiểm chứng hộp thư người nhận trong đợt này.
