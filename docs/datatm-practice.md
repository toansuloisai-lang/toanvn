# Luyện tập từ kho DATATM

Kho đã duyệt được chuyển thành bài luyện tập độc lập theo khối và chủ đề.
Một câu hỗ trợ cả hai dạng có hai bài luyện tập, dùng chung mã câu nguồn.
Trắc nghiệm chấm trên máy chủ và lưu lịch sử; tự luận dùng quy trình nộp ảnh,
chấm AI và giáo viên xác nhận hiện có.

Hiện có 893 câu nguồn: 502 câu đã duyệt trước đây và 391 câu mới không trùng.
Có 481 bài trắc nghiệm và 887 bài tự luận. Không cộng hai số này thành số câu nguồn.

Sau khi bổ sung câu đã duyệt, chạy:

```sh
node scripts/build-library-practice.mjs
node --test
node scripts/check-library-practice.mjs
```

`public/library-practice-bank.js` là tài sản được sinh từ `questionLibrary`.
Danh mục phía máy chủ và giao diện dùng chung tài sản này.

Rà soát hàng chờ:

- `node scripts/audit-pending-practice.mjs`: sàng lọc toàn bộ 1.935 câu, chỉ
  tự xác nhận biểu thức/phương trình nguyên vẹn tính được bằng phân số chính xác.
- `node scripts/review-pending-practice.mjs`: quyết định kiểm tra độc lập từng câu
  trong 479 câu; 391 câu đạt và 88 câu cần sửa nguồn. Cùng 1 câu được tính chính xác
  tự động, đã có quyết định cho toàn bộ 480 mục đầu của danh sách nguồn.
  Một câu đạt trùng câu dẫn trong kho được lọc khi ghép; còn 1.543 câu chờ.
- Báo cáo chi tiết ở `baocao/datatm-practice-review.json` và
  `baocao/datatm-practice-manual-review.json` (thư mục cục bộ, không đưa lên Git).

Đây chưa phải hoàn tất duyệt nội dung toàn bộ hàng chờ. Sàng lọc ban đầu tìm
thấy 627 câu chưa có lời giải nguồn và 45 câu cần kiểm tra hình/bảng. Các câu
chưa xác minh vẫn giữ chờ, không xuất hiện trong luyện tập của học sinh.
