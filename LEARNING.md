# Hồ sơ lỗi và khắc phục

## Báo cáo PDF cho phụ huynh

Giáo viên có thể gửi bảng điểm, toàn bộ lịch sử đã lưu, lỗi có dẫn chứng, bản sửa, kiến thức cần củng cố và so sánh tiến bộ trong PDF tiếng Việt. Báo cáo có nhận xét và xác nhận bằng tài khoản giáo viên, được chốt trước khi gửi. Xem [GMAIL.md](GMAIL.md). Phút hoạt động bắt đầu ghi từ tính năng mới; dữ liệu cũ không được tự quy đổi thành thời gian học.

## Học sinh

Khi làm bài, nhập cách làm trước khi xem gợi ý. Đáp án đầu và cách làm được lưu cố định. Máy chủ kiểm tra đáp án số/biểu thức bằng bộ kiểm tra toán học; dữ liệu `initialCorrect` do trình duyệt gửi không quyết định điểm lượt mới.

Nếu sai, bấm **AI phân tích cách làm của em**. AI phải trích đúng đoạn trong cách làm đã nộp, phân loại lỗi và đưa hướng khắc phục. Kết quả là giả thuyết chờ giáo viên xác nhận. Thiếu cách làm thì lưu **Chưa đủ bằng chứng**, không suy diễn từ chủ đề hoặc đáp án cuối.

Menu **Hồ sơ lỗi & khắc phục** có tần suất loại lỗi, bằng chứng, điểm nhiệm vụ, trạng thái kỹ năng, bài luyện đề xuất, phân tích Gemini và bảng trước–sau. Các loại lỗi gồm quy tắc dấu, biến đổi tương đương, tính toán, kiến thức/điều kiện, đọc/mô hình hóa đề, chưa biết bắt đầu và chưa đủ bằng chứng.

## Giáo viên

Trang **Tổng quan** có sidebar xanh đậm, bốn chỉ số, biểu đồ theo ngày/chủ đề/loại lỗi, nhiệm vụ đang chờ hoàn thành, bảng học sinh và nhật ký hoạt động. Bộ chọn lớp dùng các lớp thật do giáo viên tạo. Biểu đồ so sánh chỉ dùng học sinh cùng khối được phân công cho chính giáo viên; không đại diện toàn trường. Khoảng 7/30 ngày áp dụng cho biểu đồ và số bộ bài mới giao. Các thống kê còn lại tổng hợp dữ liệu hiện có.

Thanh tìm kiếm hỗ trợ học sinh, lớp và bài luyện; bộ lọc trong bảng học sinh tìm theo tên hoặc tình trạng có lỗi. Học sinh có lượt sai chưa được phân tích vẫn hiện “Chưa đủ bằng chứng”. Chỉ số chú ý tính số học sinh có lịch sử đáp án sai, không kết luận mức độ yếu. Điểm trung bình là trung bình điểm các bộ câu hỏi đã giao, gồm cả bộ đang làm được ghi rõ trong báo cáo chi tiết. Không có nhiệm vụ thì tiến độ/điểm hiển thị “—”. Dữ liệu giả chỉ dùng trong kiểm thử, không thêm vào tài khoản thật.

Menu **Lớp học của tôi**, **Giao bài & chấm bài**, **Theo dõi tiến bộ** và **Phân tích lỗi sai** mở đúng phần quản lý tương ứng. **Tài liệu học tập** mở tải PDF/Word; **Thư viện bài giảng** mở bài học có sẵn. Giao diện tự chuyển sang một cột và thanh điều hướng cuộn ngang trên điện thoại.

Menu **Bản đồ lỗi lớp**:

- Tạo nhóm lớp từ học sinh được quản trị phân công, cùng khối trong hồ sơ.
- Xem số học sinh mắc từng loại lỗi, phân bố theo kỹ năng; tách số lượt đã xác nhận và chờ xem xét.
- Bấm tên học sinh để đọc cách làm, yêu cầu AI phân tích, xác nhận/sửa loại lỗi và ghi bằng chứng cùng hướng khắc phục.
- Chọn 1–30 câu cụ thể, giao cho từng học sinh hoặc cả lớp, kèm hạn hoàn thành.
- Xem bảng điểm từng nhiệm vụ hoặc nhờ Gemini phân tích lớp. AI chỉ nhận thống kê với nhãn HS 1, HS 2… thay cho tên; các bài AI chọn được đánh dấu vào bộ câu hỏi để giáo viên xem rồi giao.
- Trong hồ sơ cá nhân, dùng **Giao bài này** để giao bài khắc phục đề xuất, hạn 7 ngày.
- Khi soạn bài luyện ở Kho bài học, có thể đánh dấu loại lỗi mà bài nhắm tới. Các nhãn này dùng để tìm bài khắc phục, không phải bằng chứng học sinh thực sự mắc lỗi đó.

## Điểm và so sánh trước–sau

Điểm nhiệm vụ là `số câu có đáp án đầu đúng / số câu được giao × 10`. Mỗi câu dùng lượt đầu sau thời điểm giao; chưa trả lời tính 0 tạm thời và ghi rõ chưa hoàn thành. Sửa sau gợi ý không thay điểm đầu. Đây là chấm đáp án của kho bài hiện có, chưa chấm điểm tự động mọi dạng tự luận/chứng minh.

So sánh trước–sau dùng một bài sai đã hoàn thành sửa và lượt làm đầu của **bài khác cùng kỹ năng sau đó**. Hiển thị chưa kiểm chứng nếu chưa có lượt phù hợp. Tái mắc chỉ đếm khi các lượt sai có cùng nhãn lỗi; lỗi chưa phân loại không được gán nguyên nhân. Các bài cùng kỹ năng chưa được hiệu chuẩn độ khó, nên báo cáo không khẳng định quan hệ nhân quả hay học sinh đã thành thạo.

Gợi ý theo quy tắc ưu tiên cùng kỹ năng, nhãn lỗi và khối lớp, hạn chế bài đã làm đúng sau lỗi gần nhất. Gemini chọn từ danh sách câu có thật, không tự bịa đường dẫn. Gợi ý AI đã lưu được ẩn khi đổi khối, có thêm bài làm/hoàn thành hoặc giáo viên thay chẩn đoán.

## Phụ huynh và dữ liệu cũ

Phụ huynh chỉ xem hồ sơ của con được liên kết; không phân loại lỗi hoặc giao bài. Giáo viên chỉ xem lớp/học sinh được phân công. Dữ liệu cũ giữ nguyên; không có cách làm thì hiển thị chưa đủ bằng chứng. Gửi Gmail theo hướng dẫn trong [GMAIL.md](GMAIL.md).

Lời giải thích của cả bài đúng ngay lần đầu và bài sai đều xuất hiện ở **Hồ sơ từng học sinh → Lời giải thích và nhận xét**. Giáo viên lưu nhận xét tại đây; học sinh và phụ huynh xem cùng nhận xét đó. Điểm nhiệm vụ trên phía giáo viên chỉ tính nhiệm vụ do chính giáo viên giao; học sinh và phụ huynh xem tất cả nhiệm vụ. Nhiệm vụ cũ theo chủ đề được đối chiếu với các câu thuộc chủ đề, thay vì bị bỏ khỏi báo cáo.

Phần **Kết quả khám phá và tự kiểm tra công thức** lưu phương án vườn, phản ví dụ, giả thuyết hộp đen và câu tự kiểm tra công thức của học sinh. Máy chủ kiểm tra phần số/biểu thức; giáo viên nhận xét lập luận riêng. Đây là kết quả hoạt động, không tự cộng điểm vào nhiệm vụ đã giao. Mỗi hồ sơ hiển thị 100 hoạt động gần nhất; giới hạn lưu 5.000 hoạt động/học sinh. Hoạt động cũ từ trước lần cập nhật này chỉ nằm trên màn hình và không thể khôi phục thành lịch sử.

Khi đổi giáo viên phụ trách hoặc khối, bài giáo viên soạn đã từng được giao/làm được giữ cho lịch sử và ôn lại. Chỉ các bài thực sự có liên quan tới học sinh được giữ; các bài khác của giáo viên cũ không được mở rộng quyền truy cập. Bài lưu trữ không trộn vào thư viện của khối hiện tại.

Trang tổng quan phụ huynh có banner hồ sơ con, thẻ điểm/tiến độ, biểu đồ theo chủ đề, lỗi thường gặp, bài tập đang chờ hoàn thành, cập nhật gần đây và gợi ý đồng hành. Khi liên kết nhiều con, bộ chọn chuyển toàn bộ số liệu sang đúng hồ sơ. Menu mở riêng kết quả, tiến bộ, lịch bài tập, thông báo và hồ sơ con. Phụ huynh không có nút làm bài thay học sinh.

Điểm trung bình lấy từ các bộ câu hỏi được giao; câu chưa làm tính 0 tạm thời. Tỉ lệ hoàn thành tính số câu đã trả lời trên tổng số câu được giao. Biểu đồ 7/30 ngày thể hiện tỉ lệ đáp án đầu đúng lũy kế trong khoảng được chọn; vòng tròn thể hiện phân bố lượt làm. Mức tiến bộ chỉ được nhận định khi có ít nhất ba bài mới để kiểm chứng sau sửa; trước đó hiển thị “Đang theo dõi”. So sánh số lỗi giữa hai kỳ không tự kết luận con tiến bộ vì lượng bài làm có thể khác nhau.

Chưa có dữ liệu xếp hạng lớp hoặc bài thi thử nên giao diện dùng kiểm chứng sau sửa và lượt ôn lại. Cập nhật gần đây lấy từ bài làm/nhiệm vụ thực tế, không giả lập báo cáo tháng đã gửi. Hồ sơ chưa lưu tên trường nên không hiển thị tên trường mẫu. Trang chưa có dữ liệu hiển thị “—” và trạng thái trống.

## Kiểm tra

- `npm test`: quyền truy cập, điểm máy chủ, dữ liệu trước/sau, nhãn lỗi, bằng chứng AI, lưu và khởi động lại.
- `node scripts/check-learning.mjs`: trình duyệt kiểm tra toàn luồng tạo lớp, giao câu, làm bài, AI, xác nhận, giao bài khắc phục, báo cáo và màn hình điện thoại; phản hồi Gemini được giả lập để chạy không tốn API.
- `node scripts/check-content.mjs` và `node scripts/check-routing-stats.mjs`: tương thích chức năng soạn bài, tiến độ và điều hướng hiện có.
- `node scripts/check-teacher-dashboard.mjs`: kiểm tra số liệu, chọn lớp, biểu đồ, tìm kiếm, lọc học sinh, các mục menu và bố cục desktop/điện thoại.
- `node scripts/check-parent-dashboard.mjs`: tổng quan phụ huynh, chuyển con, biểu đồ, tìm kiếm, các trang chi tiết, trạng thái trống, quyền chỉ xem và bố cục điện thoại.

Không có dữ liệu kiểm thử được ghi vào tài khoản thật hoặc snapshot deploy.
# Tiếp tục sửa bài sai

Đáp án sai chuyển thẳng sang sửa bài của học sinh, giữ nguyên đáp án và cách làm ban đầu. Bản sửa và lời giải thích được lưu khi nhập; mở lại bài chưa hoàn thành sẽ tiếp tục cùng lượt làm. Các lượt ôn hoặc kiểm chứng được giữ riêng theo chế độ.

Phân tích lỗi sử dụng dẫn chứng từ các bước ban đầu hoặc xác nhận của giáo viên. Khi thiếu các bước làm, hệ thống không khẳng định vị trí sai. Báo cáo hiển thị cách làm trước và sau sửa; kết quả đúng sau gợi ý không thay đổi điểm trả lời đầu. Cần kết nối mạng để lưu bản sửa lên máy chủ.

Kiểm tra: `node scripts/check-resume.mjs` sử dụng cơ sở dữ liệu tạm, kiểm tra tiếp tục bài sau đổi trang/tải lại, lưu bản sửa, giữ nguyên điểm và bằng chứng ban đầu, giáo viên nhận được bản sửa.
# Giao diện chuẩn bị bài cho giáo viên

Trong **Ngân hàng đề**, giáo viên chọn một trong ba thao tác:

- **Soạn bài tập** (`#teacher-library/create`): nhập nội dung, khối, đáp án và hướng dẫn; xem lại và xác nhận trước khi đăng. Có thể chuyển sang soạn công thức.
- **Tạo đề & giao bài** (`#teacher-library/assign`): chọn lớp hoặc học sinh, chọn tối đa 30 câu phù hợp khối, đặt hạn, xem lại rồi xác nhận giao.
- **Tải tài liệu** (`#teacher-library/documents`): chọn hoặc kéo thả PDF/Word (.docx), tối đa 10 MB; kiểm tra trước khi đăng.

Trang tổng quan có tìm kiếm và lọc bài tập/tài liệu theo khối. Bài giảng mẫu nằm tại `#teacher-library/lessons`. Các màn hình này sử dụng API và logic hiện có.
