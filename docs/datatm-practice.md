# Luyện tập từ kho DATATM

Kho hiện có 1.998 câu nguồn riêng biệt. Đợt bổ sung lớp 8 và lớp 9 thêm
434 câu so với mốc 1.564: lớp 8 thêm 146, lớp 9 thêm 288.
Chỉ dùng DATATM, không thêm câu tự soạn. Chưa push.

| Khối | Câu nguồn | Trắc nghiệm hiển thị | Tự luận hiển thị |
|---|---:|---:|---:|
| 6 | 378 | 189 | 189 |
| 7 | 612 | 306 | 306 |
| 8 | 507 | 254 | 254 |
| 9 | 501 | 251 | 251 |

Lớp 8 và lớp 9 đều đạt yêu cầu mới: ít nhất 500 câu mỗi khối.
Danh sách DATATM hiển thị 1.000 bài trắc nghiệm và 1.000 bài tự luận,
giữ tỷ lệ 50/50 từng khối. Khi số câu nguồn lẻ, một câu xuất hiện cả hai dạng;
hai dạng không tính thành hai câu nguồn. Bài khởi đầu và bài giáo viên soạn
nằm ngoài tỷ lệ DATATM này.

Kho đầy đủ giữ 1.477 dạng trắc nghiệm và 1.992 dạng tự luận để liên kết cũ,
lịch sử và danh mục máy chủ tiếp tục truy cập được. Giao diện chọn danh sách
cân bằng qua `libraryPracticeListedIds`. Trắc nghiệm chấm trên máy chủ;
tự luận dùng quy trình nộp ảnh, chấm AI và giáo viên xác nhận.

Quy trình duyệt mở rộng hiện lưu 982 quyết định, đối chiếu SHA256 của 120 file
nguồn. Câu dẫn trùng được lọc khi ghép kho. Hàng chờ cũ còn 1.172 câu;
các nguồn thiếu công thức, hình hoặc chưa xác minh được lời giải tiếp tục chờ.
Đây chưa phải hoàn tất duyệt toàn bộ DATATM.

## Duyệt và sinh lại kho

```sh
node scripts/extract-datatm-prompt-review.mjs --grade9
node scripts/extract-datatm-wmf-review.mjs source-7f79e734bffc813a6e-4
node scripts/review-expanded-datatm.mjs
node scripts/build-library-practice.mjs
node --test
node scripts/check-library-practice.mjs 8
node scripts/check-library-practice.mjs 9
```

Các quyết định được lưu trong `expanded-datatm-decisions.mjs`,
`grade89-datatm-decisions.mjs`, `recovered-datatm-decisions.mjs` và
`wmf-datatm-decisions.mjs`. Mỗi câu được giải độc lập, kiểm tra lựa chọn và
giữ đề gốc cùng dấu vết nguồn để đối chiếu.

Công cụ đọc XML kiểm tra riêng phần đề; cho phép thay lựa chọn bị mất công
thức khi phần đề đã đủ dữ kiện. Công cụ WMF đọc bản ghi ExtTextOut để hỗ trợ
khôi phục số liệu. Đây chỉ là công cụ hỗ trợ duyệt: không tự động xác nhận
công thức hay hình vẽ. 52 câu được chọn từ nguồn WMF đã có câu dẫn biên tập,
lời giải độc lập, bản khôi phục và phương pháp khôi phục lưu trong dữ liệu.
Đáp án sai trong lựa chọn gốc được sửa khi có lời giải xác minh.

Báo cáo cục bộ nằm trong `baocao/`, không đưa lên Git. Dữ liệu sinh cho ứng dụng
là `public/library-practice-bank.js`; máy chủ dùng `questionLibrary`.

## Tối ưu khi deploy

Docker và Render tự chạy `npm run build:deploy`: sinh lại kho trình duyệt,
sau đó thu gọn khoảng trắng trong 6 file JSON chương trình. Không thay nội dung,
nguồn đối chiếu, đáp án, tài khoản, ảnh nộp hoặc lịch sử. JSON trong bản làm việc
vẫn giữ định dạng dễ duyệt; bước thu gọn chỉ cần chạy trong bản build deploy.
Có thể xem trước bằng `node scripts/prepare-deploy.mjs --check`.

Với 1.998 câu, kho trình duyệt giảm từ 2.343.081 xuống 929.768 byte
(xấp xỉ 60%); gzip khoảng 222 KB. Nội dung dùng chung được lưu một lần rồi
khôi phục đủ 3.469 dạng bài khi tải, giữ nguyên mã bài và danh sách 50/50.
JSON deploy giảm từ 6.355.152 xuống 5.153.395 byte (xấp xỉ 19%),
giữ đủ cả dữ liệu duyệt và nguồn gốc.

Máy chủ lưu đệm file tĩnh và kết quả gzip để giảm đọc đĩa, băm và nén lặp.
Bộ đệm LRU giữ tối đa 64 file, 8 MiB dữ liệu gốc; bản gzip chỉ được giữ nếu
nhỏ hơn bản gốc, nên tổng dữ liệu giữ đệm dưới 16 MiB, ngoài metadata.
File đổi sẽ được nạp lại qua kiểm tra kích thước và thời gian sửa.
ETag, trả 304 và HEAD vẫn hoạt động. Phiên bản tài nguyên chỉ được tính một lần
trong mỗi tiến trình production; bản deploy mới cần khởi động tiến trình mới.

Docker không đóng gói thư mục DATATM gốc, tài liệu, test và báo cáo cục bộ.
Đã kiểm tra build trong thư mục riêng, đối chiếu toàn bộ JSON trước/sau,
138 kiểm thử và trình duyệt lớp 8, lớp 9. Chưa chạy Docker build tại máy này
do chưa có Docker CLI; chưa push hoặc deploy.
