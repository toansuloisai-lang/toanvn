# Gia sư Toán AI

Học sinh mở **Gia sư AI** trong thanh điều hướng hoặc `/#chat`. Dùng `GEMINI_API_KEYS=key1,key2,key3` và `GEMINI_MODEL`; khi danh sách trống vẫn dùng `GEMINI_API_KEY` cũ. Khởi động lại máy chủ sau khi sửa `.env`.

## Ảnh và điều phối Gemini

Chat nhận tối đa 3 ảnh JPG/PNG/WebP mỗi lượt. Trình duyệt nén ảnh; máy chủ kiểm tra nội dung thật, giới hạn 4 MB/ảnh và 25 megapixel, xoay ảnh, loại metadata và chuyển JPEG. Ảnh lưu trong dữ liệu hội thoại theo học sinh, gửi đến Gemini khi hỏi bài và trong 12 tin nhắn gần nhất để hỏi tiếp. Gửi ảnh không tự tạo bài nộp hay điểm số. Lỗi API giữ nguyên nội dung và ảnh đang soạn.

Tất cả chức năng Gemini dùng chung bộ điều phối trong `gemini-client.mjs`. Chọn key ít yêu cầu đang chạy, luân phiên khi ngang nhau; 429 nghỉ theo Retry-After hoặc 60 giây, lỗi máy chủ/kết nối nghỉ 5 giây, 401/403 nghỉ 5 phút. Tối đa 4 key khác nhau mỗi yêu cầu, trong cùng thời hạn của tác vụ. Không chờ hàng đợi khi tất cả key đang nghỉ; các giới hạn chống lạm dụng theo tài khoản vẫn áp dụng. Trạng thái điều phối dùng chung trong một tiến trình Node, không đồng bộ giữa nhiều tiến trình/VPS. Hạn mức cùng project/model vẫn được Google dùng chung.

## Hồ sơ và truy xuất bài

Máy chủ tự xác định học sinh từ phiên đăng nhập, không nhận mã học sinh do nội dung chat yêu cầu. Hồ sơ gửi Gemini gồm khối, các lỗi và bài làm liên quan, đáp án đầu, cách làm, lịch sử sửa, kết quả bài củng cố và các câu ứng viên. Không gửi danh sách người dùng, email, mật khẩu, tên học sinh hoặc hồ sơ của bạn khác. Văn bản học sinh tự nhập có thể được gửi đến Gemini để trả lời.

Truy xuất hiện dùng nhãn kiến thức và các cách gọi thông dụng, không phải tìm kiếm ngữ nghĩa trong toàn bộ Word. Có giữ chủ đề cho câu hỏi nối tiếp và nhận diện cách gõ “căn bật hai”. Gemini chỉ chọn mã câu và mã bằng chứng có trong dữ liệu đã lọc. Giao diện gắn phần đối chiếu bài gốc bên cạnh tư vấn.

Kho DATATM đang có 73 câu đã kiểm tra. Với chủ đề thiếu câu, có thể dùng bài luyện đúng khối trong kho ứng dụng, hiển thị riêng nguồn. Không gắn nhãn DATATM cho câu tự sinh hoặc bài ứng dụng. Việc gửi thêm file Word vào Supabase chưa tự làm tăng số câu hoạt động.

## Bài luyện, lịch sử và lộ trình

AI chọn tối đa 3 bài, tối đa 4 bước lộ trình. Bài DATATM làm ngay trong cuộc trò chuyện, chấm đáp án trên máy chủ và lưu cùng `datatmAttempts`. Chỉ chấp nhận câu trong lời mời do máy chủ đã lưu cho chính học sinh và đúng khối hiện tại. Chưa nộp bài thì không trả đáp án hoặc lời giải của bài được giao. Bài kho ứng dụng mở quy trình luyện tập hiện có.

Kết quả mới có trong ngữ cảnh của lần hỏi tiếp. Các lỗi mới khi luyện cùng gia sư và lịch sử bài củng cố xuất hiện trong báo cáo kiến thức và sổ tay, giáo viên/phụ huynh xem theo liên kết hiện có. Đúng lần đầu được phân biệt với đúng sau khi xem lời giải; bộ chấm số không tuyên bố xác nhận lập luận. Lộ trình là tư vấn hiển thị trong chat, không tự thay hạn bài giáo viên giao hay lịch ôn hệ thống.

`tutorThreads` lưu hội thoại trong cùng kho JSON/Supabase. Mỗi hội thoại tối đa 80 tin nhắn, tối đa 50 hội thoại mỗi học sinh; Gemini nhận tối đa 12 tin nhắn lịch sử gần nhất. Cùng lúc chỉ xử lý một câu hỏi của một học sinh, giới hạn 8 yêu cầu AI/phút dùng chung với các tính năng AI học tập. Mã yêu cầu chống ghi trùng. Hồ sơ đổi trong lúc AI xử lý thì yêu cầu gửi lại thay vì lưu tư vấn theo dữ liệu cũ. Lỗi Gemini không tạo câu trả lời giả hay làm mất câu đang nhập; lỗi lưu trữ được hoàn tác trong bộ nhớ.

## Công thức

Gemini được yêu cầu dùng LaTeX trong `\( ... \)` và `\[ ... \]`. Trước khi lưu, máy chủ kiểm tra bằng KaTeX; cú pháp lỗi hoặc lệnh LaTeX nằm ngoài dấu bao sẽ bị từ chối. Giao diện dùng bộ hiển thị toán hiện có, hỗ trợ phân số, căn, giá trị tuyệt đối và hệ phương trình. Nội dung HTML trong tin nhắn được escape; không thực thi mã mô hình trả về. Điều này bảo đảm cú pháp hiển thị, không bảo đảm mọi lời giải AI đều đúng về toán học.

## Kiểm tra

- `node --test`: kiểm tra logic, quyền truy cập, hồ sơ riêng, khôi phục sau lỗi và tính toàn vẹn liên kết bài.
- `node scripts/check-tutor.mjs`: trình duyệt với Gemini giả lập, kiểm tra công thức, chọn bài DATATM, nộp và lưu bài, hỏi tiếp, tải lại hội thoại, sổ tay, lỗi API và màn hình điện thoại.
- Đã gọi Gemini thật với câu hỏi căn bậc hai, không dùng dữ liệu học sinh; câu trả lời có căn, giá trị tuyệt đối, hệ từng trường hợp được kiểm tra và dựng KaTeX thành công.
