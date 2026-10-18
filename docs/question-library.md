# Kho câu hỏi DATATM

## Dữ liệu

`data/question-library.json` được dựng từ các câu có trạng thái `verified` trong
`data/datatm-bank.json`, `data/datatm-arithmetic-reviewed.json` và
`data/datatm-manual-reviewed.json`. Chạy `node scripts/build-question-library.mjs` tại máy có
thư mục DATATM gốc. Script kiểm tra SHA-256 của từng tài liệu nguồn trước khi dựng.

Hiện có **437 câu nguồn khác nhau**: lớp 6: 173; lớp 7: 89; lớp 8: 124; lớp 9: 51.
Đã vượt mục tiêu ban đầu 240 câu. Có 346 câu hỗ trợ trắc nghiệm và 431 câu hỗ trợ
tự luận (hai tập giao nhau); 6 câu trắc nghiệm giữ bốn lựa chọn văn bản gốc.
Không coi hai cách trình bày
trắc nghiệm và tự luận của cùng một câu là hai câu nguồn.

Mỗi câu giữ mã nguồn, số câu, hàm băm, đề, đáp án, lời giải và hướng dẫn chấm.
Câu số được bổ sung lựa chọn khi chuyển sang trắc nghiệm; các phương án bổ sung
không phải phương án gốc DATATM. Câu nhiều kết quả, định nghĩa hoặc chứng minh
được giữ tự luận; không sinh lựa chọn giả cho đáp án văn bản. Bốn lựa chọn gốc
được giữ ở các câu trắc nghiệm văn bản còn nguyên nội dung khi trích xuất.
Giáo viên phải kiểm tra và duyệt trước khi giao. Mức độ hiện ghi Cơ bản theo dữ
liệu đã kiểm chứng; chưa tự gán mức nâng cao cho các câu chưa phân loại.

Kho cũng liệt kê bài luyện tập do chính giáo viên đang đăng nhập đã soạn và đăng.
Câu do giáo viên khác soạn không xuất hiện. Câu tự soạn giữ nguyên dạng đã soạn.

## Kiểm chứng và tái dựng

- `node scripts/audit-library-arithmetic.mjs`: tính độc lập bằng phân số BigInt,
  đối chiếu đáp án nguồn; 63 câu được xác nhận tự động. Câu đáp án không khớp
  được ghi riêng trong `private/datatm-bank/arithmetic-review-rejected.json`.
- `node scripts/review-library-additions.mjs`: dựng 312 bản rà có lời giải độc lập,
  gồm những câu được sửa đáp án nguồn. Script khóa hàm băm của ba danh sách trích
  xuất để ghi chú theo chỉ số không bị gắn nhầm câu khi dữ liệu nguồn thay đổi.
- `node scripts/build-question-library.mjs`: kiểm tra hàm băm tài liệu DOCX, ghép
  ba ngân hàng, giữ thứ tự câu cũ và loại 11 bản trùng theo mã/nguồn/đề chuẩn hóa.
- Một số nguồn chỉ có đáp án cho phần cuối trong khi đề hỏi nhiều phần: bản rà
  bổ sung đủ các kết quả. Đáp án và đề gốc được lưu trong `source` để đối chiếu.
  Các câu mất công thức, thiếu hình thiết yếu hoặc mâu thuẫn chưa sửa được không
  vào kho. Hai câu hình học được làm rõ điều kiện tránh tứ giác suy biến.
- Ví dụ sửa nguồn: tổng hai số 40, tỉ lệ 3:5 có đáp án 15 và 25; bài ước lượng
  120 bé trai/200 trẻ cho 600 bé trai/1 000 trẻ; bài cực tiểu DE trong hình chữ
  nhật phụ đạt tại chân đường cao, không phải tại B.

## Luồng sử dụng

Vào Không gian giáo viên → Kho DATATM. Chọn lớp, lọc theo chủ đề/mức độ, tick câu,
chọn dạng, sửa bản sao, sắp xếp và đặt tổng 10 điểm. Mẫu 10 trắc nghiệm hoặc 2 tự
luận chỉ là chọn nhanh; nếu thiếu câu đúng khối, giao diện báo số thực tế.

Giáo viên xem lại đề, đáp án, lời giải và hướng dẫn chấm rồi xác nhận giao.
Bộ đã giao lưu ảnh chụp dữ liệu câu hỏi; sửa câu gốc sau đó không đổi bộ đã giao.

- Luyện tập: bài xuất hiện trong mục Luyện tập, mở lời giải sau khi nộp toàn bài.
- Kiểm tra: bài xuất hiện trong mục Kiểm tra của ứng dụng, hỗ trợ
  cả hai dạng câu trong một bộ; đồng hồ máy chủ khóa bài khi hết thời gian hoặc
  đến hạn nộp. Lời giải và kết quả tự động chỉ mở sau hạn nộp.
- Tự luận: học sinh chỉ tải ảnh, lưu từng câu rồi nộp toàn bài; không có ô gõ LaTeX.
- AI chấm sau khi nộp; nếu lỗi, ảnh vẫn còn và có thể thử lại. Với kiểm tra,
  học sinh đợi đến hạn mở kết quả, giáo viên có thể chấm sớm.
- Điểm tạm thời cộng theo trọng số từng câu; chưa có điểm tạm thời toàn bài nếu
  ảnh đã nộp còn chờ AI chấm hoặc chưa đọc được. Câu bỏ trống tính 0.
- Giáo viên xem lựa chọn, ảnh và nhận xét, nhập điểm và nhận xét để chốt toàn bài.
  Điểm chính thức lưu riêng, không bị phản hồi AI đến muộn thay đổi.

## Lưu trữ và kiểm tra

Dùng các trường `librarySets`, `libraryAttempts`, `librarySubmissions` trong cùng
snapshot cơ sở dữ liệu JSON/PostgreSQL hiện có. Ảnh dùng kho tệp riêng có xác thực;
API học sinh không trả đáp án, nguồn lời giải hoặc rubric trước thời điểm mở.
Hệ thống kiểm tra liên kết giáo viên–lớp–học sinh và khối tại mỗi lần truy cập.

Kiểm tra: `npm test`, `node scripts/check-question-library.mjs`. Bài kiểm tra
trình duyệt dùng cơ sở dữ liệu tạm, Edge headless và AI giả lập, không gọi AI thật.
Chưa triển khai lên website cho đến khi người dùng yêu cầu push.
