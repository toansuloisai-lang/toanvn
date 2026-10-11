# Gửi thông báo phụ huynh bằng Gmail

## Render Free: Gmail API qua HTTPS

Render Free dùng `GMAIL_TRANSPORT=api`. Mật khẩu ứng dụng SMTP không dùng được cho Gmail API.

1. Mở https://console.cloud.google.com/, tạo/chọn project và bật **Gmail API** trong API Library.
2. Trong **Google Auth Platform**, cấu hình Branding, Audience (External với Gmail cá nhân) và email liên hệ. Trong Data Access thêm scope `https://www.googleapis.com/auth/gmail.send`.
3. Chuyển Audience sang **In production** trước khi lấy refresh token dài hạn. External ở Testing thường hết hạn refresh token sau 7 ngày với scope Gmail. Production không đồng nghĩa đã được Google xác minh; làm theo yêu cầu Google hiển thị. Chỉ cấp quyền cho đúng project của mình.
4. Tạo OAuth Client loại **Web application**, thêm Authorized redirect URI: `https://developers.google.com/oauthplayground`.
5. Mở https://developers.google.com/oauthplayground, bấm bánh răng, bật **Use your own OAuth credentials**, nhập Client ID và Client secret của project mình. Chọn Access type Offline và yêu cầu Consent. Không dùng credentials mặc định của Playground vì token thử nghiệm có thể bị thu hồi sau 24 giờ.
6. Nhập scope `https://www.googleapis.com/auth/gmail.send`, bấm **Authorize APIs**, đăng nhập đúng Gmail gửi rồi cấp quyền. Bấm **Exchange authorization code for tokens**, lấy Refresh token.
7. Thêm vào Render → Environment:

```dotenv
GMAIL_TRANSPORT=api
GMAIL_USER=dia-chi-gui@gmail.com
GMAIL_FROM_NAME=Math Lab
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
```

Gmail được cấp quyền phải khớp `GMAIL_USER`. Không cần `GMAIL_APP_PASSWORD` trên Render Free. Không đưa Client secret hoặc Refresh token lên GitHub. Nếu thử local qua API, thêm cùng biến vào `.env`.

Máy chủ tự lấy access token mới và gửi MIME/PDF qua HTTPS cổng 443. Không tự gửi lại khi mất phản hồi hoặc lỗi server vì Gmail có thể đã nhận thư. OAuth bị thu hồi cần cấp quyền lại. Cần gửi thử từ luồng xác nhận của giáo viên sau deploy để kiểm tra giao thư thực tế.

## Local hoặc máy chủ cho phép SMTP

1. Chọn Gmail dùng chung để gửi thông báo. Bật **Xác minh 2 bước** trong tài khoản Google.
2. Mở https://myaccount.google.com/apppasswords và tạo mật khẩu ứng dụng cho Math Lab. Nếu Google không cung cấp mục này, kiểm tra chính sách tài khoản Google Workspace hoặc dùng một tài khoản hỗ trợ mật khẩu ứng dụng.
3. Máy local: thêm vào `.env` (không commit). Render: mở **Environment**, thêm các biến sau rồi khởi động lại/deploy:

```dotenv
GMAIL_USER=dia-chi-gui@gmail.com
GMAIL_APP_PASSWORD=mat-khau-ung-dung-16-ky-tu
GMAIL_FROM_NAME=Math Lab
```

Dùng mật khẩu ứng dụng 16 ký tự, không dùng mật khẩu đăng nhập Google. Có thể dán cả khoảng trắng mà Google hiển thị. Không gửi mật khẩu vào chat hoặc đưa vào mã nguồn. Đặt `GMAIL_TRANSPORT=smtp`; máy chủ kết nối `smtp.gmail.com:465` bằng TLS. Render Free dùng API theo hướng dẫn trên.

## Sử dụng

Giáo viên vào **Thông báo phụ huynh**, chọn lớp hoặc một học sinh, nhập tiêu đề/lời nhắn. Nếu chỉ gửi lời nhắn: **Xem trước → Xác nhận gửi**. Nếu kèm bảng điểm, làm theo luồng PDF dưới đây.

## Bảng điểm và hồ sơ học tập PDF

1. Chọn **Đính kèm bảng điểm và hồ sơ học tập PDF**, nhập nhận xét giáo viên (10–4.000 ký tự), bấm **Xem trước**.
2. Mở từng người nhận, tải **PDF nháp để kiểm tra**. Dữ liệu được chốt tại thời điểm xem trước, chưa có xác nhận và chưa gửi email.
3. Đánh dấu đã kiểm tra rồi bấm **Xác nhận báo cáo bằng tài khoản giáo viên**. Máy chủ lưu PDF cùng tên/mã tài khoản giáo viên và thời điểm xác nhận; không lấy danh tính người ký từ ô nhập của trình duyệt.
4. Có thể tải lại PDF đã xác nhận để xem. Bấm **Xác nhận gửi email kèm PDF** để đưa thư vào hàng đợi. Mỗi gia đình nhận một PDF riêng, chỉ chứa con nằm trong phạm vi giáo viên đã chọn. Hai con cùng phụ huynh được gộp vào một PDF.
5. Trong **PDF đã xác nhận** và **Lịch sử gửi**, tải lại đúng bản đã chốt; thay đổi bài làm sau này không làm thay nội dung tệp đó. Tối đa 30 bản/đợt gần nhất hiển thị, không có thao tác tự xóa bản lưu cũ.

PDF là văn bản tiếng Việt có font nhúng, có thể chọn/sao chép/tìm kiếm; không phải ảnh chụp màn hình. Các phần gồm:

Thiết kế có khung trang, tiêu đề xanh đậm, ô thống kê, bảng điểm chia cột và khung xác nhận giáo viên. Lịch sử, lỗi sai và thời gian hoạt động được trình bày trong bảng có đường kẻ; bảng dài tự sang trang và lặp lại tiêu đề, không cắt bỏ nội dung.

- Thông tin học sinh, lớp, giáo viên, thời điểm chốt và mã báo cáo.
- Số bài khác nhau, số lượt làm/hoàn thành, số lần đúng từ đầu/sai/đã sửa; thời gian hoạt động theo ngày.
- Bảng điểm từng nhiệm vụ do giáo viên lập báo cáo giao, điểm trung bình, số câu đã làm và hạn nộp. Câu chưa trả lời tính 0 tạm thời, nhiệm vụ chưa hoàn thành ghi rõ; sửa sau gợi ý không đổi điểm đầu.
- Toàn bộ lịch sử lượt làm đã lưu: đề bài, đáp án/cách làm ban đầu, chỗ sai có dẫn chứng, nguyên nhân, quy tắc liên quan, hướng khắc phục, bản sửa, lời giải thích và nhận xét.
- Phân biệt phân tích AI chờ duyệt với lỗi đã được giáo viên xác nhận. Thiếu cách làm/chẩn đoán thì ghi chưa đủ bằng chứng, không tự kết luận học sinh hổng kiến thức.
- So sánh với bài khác cùng kỹ năng sau sửa, số lượt tái mắc cùng nhãn lỗi và các hoạt động khám phá đã lưu.
- Nhận xét cùng xác nhận của giáo viên trên ứng dụng. Đây không phải chữ ký số có chứng thư; xác nhận báo cáo không tự đổi trạng thái các chẩn đoán AI chưa duyệt.

Toàn bộ lịch sử được chốt đến thời điểm tạo bản xem trước; chưa có bộ chọn khoảng ngày. Tối đa 8 MB mỗi PDF, 40 MB mỗi đợt PDF; vượt giới hạn thì báo lỗi để giáo viên chia nhỏ, không lặng lẽ cắt lịch sử. Bản xem trước/đợt gửi hết hạn sau 15 phút; PDF đã xác nhận vẫn lưu để tải lại. Cần tạo bản xem trước mới nếu muốn gửi sau thời hạn.

## Cách tính phút hoạt động

Trình duyệt học sinh gửi nhịp hoạt động khoảng 15 giây/lần khi có mạng. Chỉ ghi thời gian cửa sổ đang hiển thị/có focus và có tương tác trong 2 phút gần nhất. Tab nền, ngừng tương tác hoặc mất mạng không được cộng liên tục. Máy chủ tính khoảng thời gian, không nhận số phút do trình duyệt tự khai; các tab/thiết bị trùng thời gian chỉ tính một lần. Khoảng cách nhịp lớn hơn 45 giây không được quy đổi thành thời gian học. Thống kê theo ngày UTC+7.

Đây là **ước lượng hoạt động**, không đo mức độ tập trung và không chống được mọi hành vi giả lập trình duyệt. Có thể thiếu phần cuối phiên khi đóng app, chậm mạng hoặc máy chủ khởi động lại. Không thu nội dung phím gõ hay ảnh màn hình. Dữ liệu cũ chưa đo thì ghi **chưa có dữ liệu**, không suy ra phút từ số bài làm.

Thời gian (`usage`) và PDF đã xác nhận (`parentReports`) được lưu cùng cơ sở dữ liệu hiện tại, bao gồm Supabase khi bật chế độ đó. Chỉ giáo viên sở hữu báo cáo và còn liên kết hợp lệ mới tải được PDF qua API; tệp không đặt trong thư mục public, không được service worker cache.

Email phụ huynh lấy từ tài khoản đã liên kết qua chức năng nhập Excel. Tài khoản cũ chưa có email: quản trị vào **Quản lý tài khoản → Email phụ huynh và khôi phục tài khoản**, chọn phụ huynh và lưu địa chỉ chính xác. App liệt kê học sinh thiếu địa chỉ; không tự đoán email. Hai con có cùng email phụ huynh được gộp vào một email trong đợt gửi; không lộ địa chỉ các gia đình khác. Báo cáo chỉ gồm con nằm trong phạm vi đã chọn và được phân công cho giáo viên.

## Trạng thái và giới hạn

- Gửi qua hàng đợi đã lưu trong cơ sở dữ liệu; UI cập nhật lịch sử mỗi 5 giây và có nút làm mới. Giáo viên chỉ xem lịch sử của mình.
- Gmail chấp nhận gửi không có nghĩa là email đã đến hộp thư hoặc phụ huynh đã đọc. Cần kiểm tra thư rác/thư trả lại trong tài khoản gửi nếu có vấn đề.
- Tối đa 200 người nhận mỗi đợt, 300 email/24 giờ cho toàn hệ thống; Gmail vẫn có thể áp dụng hạn mức thấp hơn.
- Gửi lại cùng xác nhận hoặc cùng nội dung/người nhận trong 15 phút trả về đợt cũ. Không tự gửi lại email lỗi hoặc chưa rõ kết quả. Với lỗi từ chối, sửa cấu hình/địa chỉ rồi soạn đợt mới sau 15 phút hoặc đổi nội dung. Với lỗi chưa rõ kết quả, kiểm tra thư đã gửi trước khi tạo đợt mới để tránh trùng thư.
- Khi khởi động lại, các thư chờ đã được giáo viên xác nhận tiếp tục gửi. Thư đang gửi lúc máy chủ dừng được đánh dấu chưa rõ kết quả, không tự gửi lại.
- Dùng một server và cấu hình Supabase như `render.yaml`; hàng đợi lưu trong database. Không chạy nhiều tiến trình cùng xử lý một hàng đợi. Nếu dùng chế độ JSON cũ, vẫn cần ổ dữ liệu bền vững.
- Không gửi mật khẩu tài khoản học sinh hoặc phụ huynh trong báo cáo.

Kiểm thử: `npm test`, `node scripts/check-parent-mail.mjs`, `node scripts/check-usage.mjs`, `npm run test:supabase`. SMTP được giả lập, không gửi thư thật. Kiểm tra xác nhận, nội dung tiếng Việt, tính riêng tư, tệp đính kèm trùng khớp PDF đã duyệt, tải lại sau khởi động lại, quyền khi thu hồi liên kết và đo thời gian hoạt động. Tạo mẫu PDF với dữ liệu giả: `node scripts/preview-parent-report.mjs` (cần devDependencies). Cần cấu hình Gmail thật để kiểm tra giao thư đầu cuối.
