# Rà soát chức năng ngày 18/10/2026

## Phạm vi

Kiểm tra trên mã nguồn tại máy, dùng dữ liệu và tài khoản thử nghiệm độc lập.
Không commit, push hoặc triển khai lên website.

Các luồng được kiểm tra: đăng nhập và phân quyền; liên kết giáo viên, lớp,
học sinh và phụ huynh; nhập danh sách lớp; kho câu hỏi DATATM; chọn câu và
giao đề; luyện tập trắc nghiệm, nộp ảnh tự luận; AI nhận xét; giáo viên chốt
điểm; bài kiểm tra giới hạn giờ; báo cáo, sổ tay lỗi và PDF; chatbot; công thức;
khám phá 3D; PWA; xem tài liệu; hiển thị máy tính và màn hình điện thoại.

## Lỗi đã sửa trong lượt rà soát

- Đồng bộ bộ câu hỏi và bài nộp ảnh vào báo cáo học tập, phụ huynh, sổ tay
  và PDF; bổ sung đường dẫn để mở bài từ báo cáo.
- Bài nộp ảnh hoàn thành bài giáo viên giao và không bị đếm trùng.
- Điểm AI giữ trạng thái tạm thời; điểm chính thức lấy từ giáo viên chốt.
- Không lộ nhận xét chốt điểm, đáp án và lịch sử bài kiểm tra trước hạn mở
  kết quả cho học sinh và phụ huynh.
- Phụ huynh xem được ảnh của con đã liên kết; không được chấm bài hoặc
  truy cập ảnh của học sinh khác.
- Bài nộp ảnh giữ đúng chủ đề, thay vì gom chung thành “Bài luyện tập”.
- Cập nhật kiểm tra trình duyệt theo luồng nộp ảnh hiện tại, giữ kiểm tra
  dữ liệu học cũ mà không đưa ô nhập LaTeX trở lại.

## Kiểm chứng và giới hạn

`npm test`: 116/116 đạt. Bộ kiểm tra chức năng `check-full-workflow.mjs`:
45/45 đạt, không có lượt thất bại. Kiểm tra cú pháp các module bổ sung và
`git diff --check` đạt.

Kết quả từng kiểm tra trình duyệt được lưu tại
`artifacts/full-workflow/results.json`, log tương ứng nằm cùng thư mục.
Chạy lại bằng `node scripts/check-full-workflow.mjs`.

Trình duyệt dùng Edge tự động, có mô phỏng kích thước điện thoại và mất mạng.
Gemini và gửi thư dùng phản hồi giả lập; kết quả không xác nhận dịch vụ AI
hay giao thư thật. Kiểm tra PostgreSQL dùng cơ sở dữ liệu cục bộ tạm,
không sửa Supabase đang chạy. Cài đặt PWA trên iPhone/Android thật và bản
website đã triển khai vẫn cần kiểm tra trên thiết bị sau khi cập nhật.
