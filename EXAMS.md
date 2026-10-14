# Thi trắc nghiệm có thời gian

Học sinh và giáo viên mở **Thi trắc nghiệm** trong menu (`#exams`). Giáo viên xem đề, nguồn, đáp án và kết quả của từng học sinh; học sinh chỉ thấy các đề được giao cho lớp mình và đúng khối.

- Bấm **Bắt đầu làm bài** để bắt đầu một lượt duy nhất. Thời hạn do máy chủ xác định; tải lại trang, đổi tab, mất mạng hoặc đăng xuất không dừng thời gian.
- Chọn một trong bốn phương án. Chỉ lựa chọn được máy chủ xác nhận mới được tính. Khi lỗi lưu, giao diện quay lại lựa chọn đã lưu và yêu cầu chọn lại.
- Có thể nộp sớm bằng nút xác nhận. Hết giờ, máy chủ tự chốt các lựa chọn đã lưu kể cả khi học sinh đóng tab. Máy chủ chạy kiểm tra mỗi giây; sau khởi động lại, các lượt quá hạn được chốt trước khi đọc hoặc sửa bài.
- Không nhận đáp án đến sau hạn. Hai tab dùng phiên bản bài làm để ngăn ghi đè lựa chọn cũ. Không có lượt thi lại hoặc thay đáp án sau khi nộp.
- Chấm trên thang 10, làm tròn một chữ số thập phân. Câu chưa trả lời tính 0. Đáp án và lời giải chỉ trả cho học sinh sau khi đã nộp. Điểm thi được giữ riêng với điểm luyện tập và được đưa vào phần phân tích kiến thức trong báo cáo PDF phụ huynh. Học sinh làm lại câu sai bên dưới kết quả; các lần sửa không thay đổi điểm thi ban đầu.

Dữ liệu lưu trong hai collection `exams` và `examAttempts` cùng cơ sở dữ liệu hiện hành, hỗ trợ JSON và PostgreSQL. Giáo viên chọn **Tạo đề trắc nghiệm** (`#exams/create`), soạn 1–50 câu, xem trước công thức rồi xác nhận giao cho lớp. Mỗi đề có thời gian 1–180 phút và hạn bắt đầu tùy chọn.

Trong trang kết quả đề, giáo viên có thể đổi hạn, ngừng giao hoặc sao chép thành đợt mới. Lượt đang làm giữ đồng hồ ban đầu; ngừng giao chặn lượt mới nhưng giữ kết quả cũ. Đợt mới có mã riêng, không thay điểm đợt cũ. Kết quả thi và tự luận đã duyệt được tổng hợp cùng luyện tập ở bảng giáo viên và phụ huynh; điểm chưa nộp/chưa duyệt không bị coi là điểm 0.

60 lượt làm thử của lớp 8A4 đã được đối chiếu với `private/bao-cao-8a4/run-audit.json`, sao lưu và đánh dấu `testRun`. Các lượt này không tính điểm học thật, phân tích hoặc thành tích và không chiếm lượt thi thật. Giáo viên xem mục **Lịch sử kiểm tra hệ thống** trong trang kết quả đề. Công cụ `node scripts/separate-audited-attempts.mjs` kiểm tra đối chiếu; `--apply` chỉ chạy khi đã dừng ứng dụng. PDF/email đã chốt trước đây không bị sửa lại.

Tải Word/PDF lên kho tài liệu vẫn là phân phối tài liệu, chưa tự chuyển toàn bộ nội dung thành đề có đáp án. Giáo viên dùng trình soạn đề hoặc ngân hàng câu hỏi đã biên soạn.

## Bộ đề lớp 8A4

Đã nhập vào dữ liệu JSON tại máy làm việc: lớp 8A4, khối 8, 12 học sinh, giáo viên `giaovien`. Tên học sinh/phụ huynh tự đặt theo yêu cầu người dùng, không xác minh danh tính chủ email. Không gửi email trong quá trình nhập.

- Danh sách nhập: `private/lop-8a4.xlsx`.
- Tài khoản và mật khẩu: `private/tai-khoan-lop-8a4.xlsx`; chỉ bàn giao riêng cho đúng người.
- Sao lưu trước khi nhập: `private/accounts-before-8a4.json`.
- 10 đề, mỗi đề 15 câu và 30 phút: `private/de-thi-8a4/`. Có bản Word, đáp án/lời giải riêng, nguồn từng câu và JSON đã nhập.
- Đây là 10 mã đề ôn tập tổng hợp **cả năm lớp 8**, cùng ma trận 15 dạng bài, thay số và đảo phương án; không phải 10 chuyên đề khác nhau.
- Nguồn được giải nén tại `DATATM/giai-nen/`; `inventory.json` ghi 12 gói, 758 file, không thiếu file. Câu hỏi được biên soạn lại theo dạng bài nguồn để tránh công thức thiếu và phương án sai/trùng trong bản gốc.

Các file trong `private/` và `DATATM/` không đưa vào Git. Thay đổi này chưa triển khai hoặc nhập vào cơ sở dữ liệu Render/Supabase.

## Kiểm tra

`npm test` kiểm tra quyền truy cập, giới hạn thời gian, lưu/khôi phục, đáp án kín, tự chấm, xung đột nhiều tab và hoàn tác khi lưu lỗi.

`node scripts/check-timed-exams.mjs` kiểm tra trên Edge bằng dữ liệu tạm: bắt đầu, chọn đáp án, tải lại, màn hình di động, nộp sớm, xung đột tab, mất mạng, tự nộp và bảng điểm giáo viên. Kịch bản chờ khoảng một phút để kiểm chứng thời hạn thực.

`node scripts/check-exam-authoring.mjs` kiểm tra giáo viên tạo đề qua giao diện, xem công thức, giao đề, ngừng giao và tạo đợt mới mà vẫn giữ kết quả cũ.
