# Kiểm tra chức năng — 08/10/2026

Đã kiểm tra trên dữ liệu tạm tách biệt. Không thay đổi dữ liệu người dùng thật, không gửi email thật và không triển khai lên Render trong đợt này.

## Lỗi đã tái hiện và sửa

| Tình huống | Lỗi trước khi sửa | Kết quả sau sửa |
| --- | --- | --- |
| Học sinh gõ đáp án sửa từ `4` thành `40`, khi đáp án đúng là `4` | Tự lưu ký tự `4` ghi nhận đã sửa đúng, khóa đáp án dù học sinh chưa bấm kiểm tra | Nhập nháp chỉ lưu nháp; chỉ xác nhận sửa đúng khi học sinh bấm kiểm tra và máy chủ kiểm tra đáp án |
| Tab cũ lưu lời giải thích sau khi tab khác đã hoàn thành bài | Lời giải thích đã nộp bị thay bằng bản nháp cũ | Giữ nguyên lời giải thích, bước sửa và thời điểm hoàn thành đã lưu |
| Giáo viên thao tác trong lúc đăng bài | Có thể bật lại nút đăng bằng ô xác nhận hoặc sửa nội dung trong lúc yêu cầu đang chạy | Khóa các điều khiển trong lúc đăng; khôi phục nếu yêu cầu đăng thất bại |
| Đăng bài thành công nhưng tải lại danh sách thất bại | Hiển thị như đăng thất bại và cho phép đăng trùng | Thông báo đã đăng thành công, giữ nút đăng bị khóa và hướng dẫn tải lại trang |
| Chuyển sang soạn tài liệu khác trong khi bài trước đang đăng | Phản hồi muộn có thể dựng lại trang và làm mất nội dung mới nhập | Chỉ dựng lại màn hình đã khởi tạo thao tác nếu màn hình đó vẫn còn mở |

Kiểm thử đăng xuất cũ cũng được sửa: sau khi thu hồi phiên, sự kiện lấy lại focus yêu cầu xác minh phiên và chờ màn hình đăng nhập; không cố bấm nút đã bị giao diện khóa phiên loại bỏ.

## Kết quả xác minh

- `npm test`: **50/50 đạt**, bao gồm hai kiểm thử hồi quy mới về bản nháp sửa bài và lời giải thích ở nhiều tab.
- **20 chương trình kiểm thử trình duyệt đạt** sau khi sửa: đăng nhập/phân quyền, học sinh theo khối 6–9, làm/sửa/tiếp tục bài, thống kê, lớp học/giao đề/nhận xét, phụ huynh, nhập Excel, soạn bài, upload/download, thư viện, công thức, khám phá 3D, điều hướng, giao diện di động, ngoại tuyến và thời gian hoạt động. Các luồng chịu ảnh hưởng đã được chạy lại sau sửa.
- `node scripts/check-edge-cases.mjs`: tái hiện kết nối chậm, lỗi tải lại sau đăng và phản hồi muộn khi đã chuyển màn hình.
- `node scripts/check-supabase.mjs`: PostgreSQL tạm đạt kiểm tra nhập/đọc lại dữ liệu, quyền schema, mật khẩu, file, thời gian học, PDF sau khởi động lại, xung đột phiên bản và rollback transaction.
- `npm audit --omit=dev`: không có lỗ hổng dependency production được công cụ báo tại thời điểm kiểm tra.
- `git diff --check` với thiết lập phù hợp CRLF: đạt.

## Phạm vi chưa xác minh bằng dịch vụ thật

- Chưa có project Supabase của người dùng: kiểm thử PostgreSQL tạm không thay thế kiểm tra kết nối/TLS và dữ liệu trên project thật.
- Gmail dùng SMTP giả trong kiểm thử; Gemini dùng phản hồi giả hoặc chế độ dự phòng. Chưa xác minh gửi/nhận Gmail hay chất lượng phân tích của Gemini thật.
- Chưa chạy trên Render thật, chưa kiểm thử tải với nhiều học sinh đồng thời. Cấu hình lưu PostgreSQL hiện dùng một instance như hướng dẫn triển khai.
- Trình duyệt tự động dùng Chromium qua Microsoft Edge; chưa xác minh riêng Safari/iOS hoặc thiết bị thật.

Kết quả này xác nhận các trường hợp đã kiểm tra, không phải cam kết không còn mọi lỗi có thể xảy ra.
