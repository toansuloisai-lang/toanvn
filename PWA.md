# Dùng Tư duy Toán trên web và dưới dạng ứng dụng

Giao diện dùng ảnh trường từ `nen1.jpg` tại màn hình đăng nhập và banner học sinh, giáo viên, phụ huynh. Hai bản tối ưu là `public/assets/school-campus.webp` (máy tính) và `public/assets/school-campus-mobile.webp` (điện thoại), được cache cùng app. Cách căn ảnh và lớp phủ để chữ rõ nằm trong `public/school-theme.css`; ảnh gốc được giữ nguyên.

Ứng dụng là PWA: một địa chỉ web dùng được trực tiếp trong trình duyệt và có thể cài biểu tượng để mở trong cửa sổ ứng dụng riêng. Bản web và bản cài dùng cùng backend, tài khoản và dữ liệu. Trình duyệt/hệ điều hành có thể yêu cầu đăng nhập lại khi mở bản cài lần đầu.

## Cài từ trình duyệt

Mở địa chỉ HTTPS của ứng dụng, bấm **Cài ứng dụng** ở góc màn hình. Nút này có cả ở màn hình đăng nhập. Trong tài khoản cũng có mục **Cài đặt → Dùng như ứng dụng**.

- **Android:** dùng Chrome; bấm **Cài Tư duy Toán** nếu có hộp thoại cài đặt, hoặc menu **⋮ → Cài đặt ứng dụng / Thêm vào màn hình chính**.
- **iPhone/iPad:** dùng Safari; bấm **Chia sẻ → Thêm vào Màn hình chính**, bật **Mở dưới dạng ứng dụng web** nếu có, rồi bấm **Thêm**.
- **Windows/macOS:** dùng Chrome hoặc Edge; bấm nút cài của trang hoặc biểu tượng cài đặt trên thanh địa chỉ. Cũng có thể dùng menu trình duyệt **Ứng dụng / Cài đặt trang này**.

Sau khi cài, mở **Tư duy Toán** từ biểu tượng mới. Không cần APK hoặc đăng lên cửa hàng ứng dụng. Gỡ cài đặt theo thao tác quản lý ứng dụng của thiết bị; việc gỡ biểu tượng không xóa tài khoản hay dữ liệu trên máy chủ.

Nếu mở từ trình duyệt bên trong Zalo/Facebook, chuyển sang Chrome hoặc Safari trước. Nếu trình duyệt chưa đưa ra nút cài trực tiếp, hộp hướng dẫn vẫn hiển thị các bước cài thủ công. Không thể ép trình duyệt hiện hộp thoại cài đặt.

## Triển khai

- Deploy theo [RENDER.md](RENDER.md); dùng địa chỉ **HTTPS** của Render hoặc tên miền HTTPS riêng. Không cần thêm dịch vụ backend cho PWA.
- Giữ manifest tại `/manifest.webmanifest`, service worker tại `/sw.js`, và triển khai từ gốc tên miền như cấu hình hiện tại.
- HTTPS hoặc localhost là điều kiện cho service worker. Truy cập `http://192.168...` từ điện thoại trong mạng LAN không tương đương localhost và thường không cài PWA được.
- Giữ `id`, `scope`, `start_url` ổn định để tránh tạo hai ứng dụng cài đặt khác nhau khi cập nhật.
- Icon Android maskable và Apple đã được tạo từ biểu tượng hiện có. Tạo lại bằng `node scripts/generate-pwa-icons.mjs` nếu đổi `public/icon.svg`.

## Bố cục riêng cho app đã cài

App dùng menu đầy đủ ở cạnh trái, mỗi chức năng có biểu tượng và tên. Trên điện thoại/màn hình dưới 1.000 px, nút **Menu** mở bảng điều hướng bên trái; chọn chức năng sẽ đóng menu để dùng trọn vùng học tập. Trên màn hình lớn, menu luôn hiện bên trái. Có hỗ trợ đóng bằng Escape, chạm nền ngoài và điều hướng bàn phím.

Trang chủ app xếp các chức năng thành thẻ lớn; nội dung chính dùng chữ 16 px, ô nhập 17 px và nút tối thiểu 48 px. Bài học, sửa lỗi và nhập đáp án dùng bố cục một cột trên điện thoại. Giao diện app được áp dụng khi chạy chế độ standalone, không thu nhỏ trang web bằng tỷ lệ zoom.

Kiểm tra bằng `node scripts/check-app-layout.mjs`. Ảnh minh họa được tạo trong `artifacts/app-left-menu.png`, `artifacts/app-learning-mobile.png` và `artifacts/app-learning-tablet.png`.

## Mất mạng và cập nhật

Tài nguyên giao diện, công thức, hình ảnh và mô-đun được cache. API, điểm số, PDF riêng và dữ liệu tài khoản không được lưu vào Cache Storage.

Tab đã đăng nhập có thể tiếp tục sử dụng những nội dung đã tải khi mất mạng. Đăng nhập, mở lại app, lưu lên máy chủ, Gmail và AI cần kết nối. Khi mất mạng, giữ tab/app mở; không tải lại hoặc đóng app khi bài chưa được lưu. Thời gian hoạt động không tự cộng thêm trong khoảng mất mạng.

Khi có phiên bản mới, app hiện thông báo **Tải bản mới**. Bài học đang chờ lưu phải lưu thành công trước khi tải lại; nội dung giáo viên đang soạn phải hoàn tất hoặc sao chép trước khi cập nhật. App không tự tải lại và làm mất nội dung đang nhập.

## Kiểm tra

`node scripts/check-pwa.mjs` kiểm tra điều kiện cài đặt Chromium bằng profile tạm không ẩn danh, manifest và kích thước icon, chấp nhận/từ chối lời mời cài, hướng dẫn iPhone, trạng thái standalone, offline/reconnect, dữ liệu API không bị cache và bảo vệ bản nháp khi cập nhật.

Kiểm thử tự động mô phỏng lựa chọn cài đặt và trạng thái standalone; trước khi đưa vào sử dụng, kiểm tra cài/mở/gỡ thực tế trên Android, iPhone và máy tính bằng địa chỉ HTTPS đã triển khai.
