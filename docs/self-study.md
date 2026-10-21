# Lớp hệ thống và học ẩn danh

## Giáo viên ảo

Admin mở trang chủ quản trị, phần **Giáo viên ảo · Lớp do hệ thống quản lý**.
Có thể thêm học sinh đã có tài khoản hoặc cấp mới học sinh/phụ huynh bằng
tên học sinh, khối, tên phụ huynh và Gmail phụ huynh. Tài khoản dùng tên đăng
nhập riêng và mật khẩu ngẫu nhiên; admin nhận thông tin để bàn giao, không
tự gửi thư hoặc tự xác minh quan hệ phụ huynh.
Nếu Gmail và tên phụ huynh trùng tài khoản đã có, liên kết thêm con vào tài
khoản đó, không đổi mật khẩu. Trùng Gmail nhưng khác tên hoặc trùng cả học
sinh/khối/phụ huynh bị chặn để admin kiểm tra, tránh cấp tài khoản trùng.

Mỗi khối 6–9 có lớp riêng, tối đa 200 học sinh/lớp. Giáo viên ảo là tài khoản
nội bộ, không thể đăng nhập bằng mật khẩu. Không thay đổi lớp hay tài khoản
8A4 hiện tại. Admin có thể tạm dừng/bật giao bài cho từng lớp.

Hệ thống kiểm tra mỗi phút khi tiến trình máy chủ chạy. Mỗi học sinh nhận
một bộ 10 trắc nghiệm + 2 tự luận từ kho đã duyệt mỗi 7 ngày, tổng 10 điểm.
Ưu tiên chủ đề còn yếu và tránh các câu trong ba bộ gần nhất nếu kho đủ câu.
Mỗi bộ chỉ học sinh được giao mới xem được. Mất mạng hoặc khởi động lại
không tạo trùng bộ; lần kiểm tra tiếp theo bù lượt đến hạn, không tạo hàng
loạt bộ cho tất cả các tuần đã bỏ lỡ. Bài tự chọn không làm lùi lịch tuần.

Ảnh tự luận đã nộp được chấm AI theo hàng đợi, tối đa một bài mỗi phút.
Nếu AI lỗi, học sinh có thể bấm chấm lại. Kết quả AI là tham khảo, không ghi
vào điểm trung bình chính thức và không tự xác nhận thành tích sửa lỗi.
Bài sai và kiến thức cần củng cố tiếp tục đi qua báo cáo/sổ tay hiện có.
Không có giáo viên thật được tạo giả để chốt điểm thay AI.

## Học ẩn danh

Trang vào có nút **Vào học ẩn danh**, chọn khối rồi dùng giao diện học sinh:
bài học hệ thống, công thức, khám phá, gia sư, luyện tập và kho câu hỏi theo
chủ đề. Không xem được đáp án/lời giải của câu trong kho trước khi nộp.
Tự luận chỉ nộp ảnh; trắc nghiệm chọn đáp án.

Mỗi lượt dùng kho dữ liệu bộ nhớ riêng, không tạo học sinh hay lớp thử vào
Supabase. Phiên tối đa 2 giờ, mất khi máy chủ khởi động lại hoặc đăng xuất;
không tự chuyển lịch sử thử sang tài khoản được cấp. Các giới hạn hiện tại:
30 yêu cầu AI/ngày/IP, 20 phiên mới/ngày/IP, 100 phiên đồng thời, 8 MB ảnh
mỗi phiên và 80 MB ảnh tổng cộng. Hạn mức dùng chung IP có thể ảnh hưởng
người dùng cùng mạng. Hết lượt AI vẫn xem bài và luyện trắc nghiệm được.
Máy chủ một tiến trình; không dùng thiết kế bộ nhớ này cho nhiều replica.

## Xin vào lớp

Học sinh gửi biểu mẫu trên trang chủ; thông tin yêu cầu được lưu vào cơ sở
dữ liệu chính để admin duyệt. Thông tin này không mất cùng phiên học thử.
Admin kiểm tra thông tin, duyệt và bàn giao tài khoản học sinh/phụ huynh.
Yêu cầu bị từ chối có thể gửi lại; yêu cầu đã duyệt không cấp trùng tài khoản.
Với tài khoản học sinh đã có, giữ nguyên danh tính và lịch sử khi vào lớp;
khối xung đột lớp hiện có bị chặn để admin xử lý chuyển lớp riêng.

Không chạy migration thay thế dữ liệu Supabase. Các trường mới được bổ sung
qua storage hiện có khi admin thực sự tạo lớp hoặc tiếp nhận yêu cầu.

## Kiểm tra

- `node --test test/virtual-teacher.test.mjs test/guest-sessions.test.mjs`
- `node scripts/check-self-study.mjs`
- `npm test`

Kiểm tra dùng dữ liệu cục bộ tạm; không tạo lớp thật, không gửi email thật
và không gọi Gemini thật. Cần cấu hình Gemini hợp lệ trên máy chủ để chấm
ảnh/gia sư thực tế; không có khóa thì hệ thống vẫn phục vụ nội dung học.

Lượt kiểm chứng ngày 20/10/2026: 121/121 unit/integration tests đạt và
46/46 script kiểm tra chức năng đạt. Log tại `artifacts/full-workflow/`.
Đã xem ảnh chụp giao diện điện thoại, kiểm tra ghép lớp và quyền phụ huynh.
Chưa commit, push hay triển khai; không sửa dữ liệu Supabase đang chạy.
