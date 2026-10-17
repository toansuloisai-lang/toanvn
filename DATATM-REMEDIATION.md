# Bài củng cố theo lỗi sai

Đã nối sổ tay lỗi sai với ngân hàng câu hỏi có nguồn từ DATATM. Cùng một hồ sơ lỗi được dùng cho bài thi, tự luận và bài luyện tập. Bản sửa gần nhất đúng mở bài củng cố; việc này không thay điểm bài gốc hoặc thay xác nhận cách làm của giáo viên.

## Kho hiện tại

`data/datatm-bank.json` chứa 73 câu đã đối chiếu đề và tính lại đáp án: khối 6: 24; khối 7: 24; khối 8: 18; khối 9: 7. Có chủ đề, nhãn kiến thức, lời giải, tên file, số câu và SHA-256 tài liệu. Khối 9 hiện có chủ đề không gian mẫu; các câu này chuyển câu dẫn trắc nghiệm đầy đủ thành trả lời bằng số, có lưu cách chuyển trong metadata nguồn.

Đây là tập đầu tiên đã kiểm tra, chưa phải toàn bộ DATATM. Kiểm kê 720 file Word ghi nhận 1 file không đọc xong trong thời hạn. Khối 9 không có file hoàn toàn không dùng OLE. Không đưa biểu thức MathType bị mất, câu phụ thuộc hình hoặc đáp án chưa đáng tin vào kho hoạt động. Những chủ đề chưa có câu phù hợp hiển thị đúng tình trạng thiếu câu, không lấy ngẫu nhiên câu khác khối hay gán bài khác kiến thức.

## Chọn bài và lưu kết quả

- Máy chủ tìm theo khối và nhãn kiến thức của lỗi. Không đưa lại đúng câu dẫn gốc; ưu tiên câu mới, giữ câu vừa sai để học sinh có thể sửa tiếp. Câu đã đúng được loại khỏi gợi ý tiếp theo.
- Học sinh nhập đáp án số hoặc phân số và cách làm. Chấm đáp án trên máy chủ bằng phân số chính xác; chấp nhận số thập phân dùng dấu phẩy và đơn vị đúng. Lời giải chỉ trả về sau khi nộp. Cách làm được lưu để người xem đối chiếu, không được tuyên bố đã chấm bằng bộ so sánh đáp án số.
- `datatmAttempts` trong cùng cơ sở dữ liệu tài khoản lưu bản chụp câu nguồn, đáp án đầu, cách làm, thời gian và liên kết lỗi gốc. Lần đầu đúng một câu mới khác với sửa đúng sau khi đã xem lời giải. Kết quả này là bằng chứng luyện tập, không tự kết luận thành thạo.
- Giáo viên/phụ huynh xem trong báo cáo của học sinh được liên kết; chỉ học sinh có thể nộp. Lỗi không thuộc hồ sơ, câu sai khối/kiến thức, nộp lại câu đã hoàn thành đều bị chặn. Mã yêu cầu chống ghi trùng khi gửi lại; lỗi lưu trữ được hoàn tác trong bộ nhớ.
- Nút AI chọn bài gọi Gemini với các ứng viên đã tìm trong kho. AI chỉ được trả mã trong danh sách đó. Không có Gemini thì danh sách theo kiến thức vẫn dùng được. Khi AI phản hồi, máy chủ kiểm tra lại quyền và các câu còn hợp lệ. Kiểm thử AI dùng phản hồi giả lập, không gọi dịch vụ thật.

## Triển khai và bổ sung dữ liệu

Kho JSON được đưa theo mã nguồn lên VPS, không cần thư mục DATATM gốc để chạy. Lịch sử dùng cùng cơ chế lưu JSON hoặc Supabase hiện có; không có cơ sở dữ liệu riêng cần cấu hình. Thay đổi tài liệu Word trong Supabase chưa tự tạo câu hỏi: cần tách câu, kiểm tra đáp án và xuất bản vào kho hoạt động.

Quy trình nguồn: `node scripts/inventory-datatm.mjs`, `node scripts/extract-datatm.mjs`, `node scripts/build-datatm-bank.mjs`. Hai bước đầu cần DATATM gốc và ghi kết quả vào `private/datatm-bank/` được Git bỏ qua. Bước cuối lấy đúng các câu được lựa chọn, từ chối câu mơ hồ hoặc có thành phần không đọc được.

Kiểm tra: `node --test` và `node scripts/check-datatm-flow.mjs`. Kịch bản trình duyệt sử dụng cơ sở dữ liệu tạm, kiểm tra sửa bài, câu có nguồn, AI chọn ứng viên, sai rồi sửa đúng, tải lại lịch sử, quyền phụ huynh và màn hình điện thoại. Ảnh kết quả ở `artifacts/datatm-knowledge-desktop.png` và `artifacts/datatm-notebook-mobile.png`.
