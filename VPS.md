# Triển khai VPS

Ứng dụng chạy Node.js 24, **một tiến trình**, Nginx và HTTPS. Hiện cấu hình local đã chuyển sang Supabase; không chạy thêm một server khác cùng ghi database trong lúc bản local vẫn hoạt động. Bộ lưu trữ phát hiện xung đột revision và dừng phục vụ thay vì ghi đè dữ liệu.

## Chuẩn bị

- Đưa đầy đủ mã nguồn và `package-lock.json` lên `/opt/math-lab`; nhiều chức năng mới cần được commit cùng nhau. `.env`, `private/`, bản sao lưu và tài liệu gốc không được đưa lên Git.
- Cài Node 24 và chạy `npm ci --omit=dev` bằng người dùng dịch vụ `mathlab`. Kiểm tra đường dẫn Node thực tế bằng `command -v node`; sửa `ExecStart` nếu không phải `/usr/bin/node`.
- Tạo `.env` riêng trên VPS, quyền `600`, thư mục ứng dụng và `private/` thuộc người dùng dịch vụ. Chuyển secrets bằng kênh riêng.

Các biến cần thiết:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
COOKIE_SECURE=true
TRUSTED_PROXY_IPS=127.0.0.1,::1,::ffff:127.0.0.1
MATH_STORAGE=supabase
SUPABASE_DB_URL=YOUR_POSTGRESQL_URI
GEMINI_API_KEYS=YOUR_KEYS_SEPARATED_BY_COMMAS
GEMINI_MODEL=gemini-2.5-flash
GMAIL_TRANSPORT=smtp
GMAIL_USER=YOUR_GMAIL_ADDRESS
GMAIL_APP_PASSWORD=YOUR_APP_PASSWORD
```

Giữ cấu hình CA nếu kết nối Supabase yêu cầu. Mật khẩu database chứa ký tự đặc biệt phải được URL encode. Không tắt kiểm tra TLS.

## Dịch vụ và HTTPS

1. Thay `YOUR_DOMAIN` trong `deploy/nginx.conf`, đặt cấu hình vào Nginx và chạy `nginx -t`.
2. Trỏ DNS đến VPS, cấp HTTPS bằng Certbot, kiểm tra cấu hình HTTPS cũng kế thừa `client_max_body_size 24m` và proxy timeout 120 giây. Cookie Secure chỉ hoạt động qua HTTPS; truy cập local HTTP cần `COOKIE_SECURE=false`.
3. Cài `deploy/math-lab.service` vào `/etc/systemd/system/math-lab.service`. Kiểm tra người dùng, quyền, thư mục và đường dẫn Node.
4. **Dừng server local trước khi bật server VPS dùng chung Supabase.** Sau đó chạy `systemctl daemon-reload`, `systemctl enable --now math-lab`.
5. Kiểm tra `/api/status`, đăng nhập đúng các vai trò, mở lớp, gửi ảnh, tải tài liệu và PDF đã duyệt. Kiểm tra gửi email thật chỉ với người nhận được phép. Không bật PM2 cluster hay nhiều bản dịch vụ cùng ghi DB.

Đây là cấu hình mẫu; HTTPS/domain và firewall cần kiểm chứng trên VPS thật. Chỉ công khai 80/443 và cổng quản trị cần thiết; Node nghe ở loopback.

## Sao lưu, đồng bộ và khôi phục

- Lần sửa trước deploy đã sao lưu dữ liệu local và dữ liệu Supabase cũ vào `private/backups/`, sau đó đồng bộ đầy đủ dữ liệu hiện tại và tệp lên Supabase. Thư mục này không nằm trong Git; cần giữ bản sao ở nơi khác.
- `npm run supabase:sync` mặc định chỉ đọc database, sao lưu cả hai phía và in thống kê. Chỉ dùng `npm run supabase:sync -- --apply` khi **cả hai ứng dụng đã dừng** và file JSON được chọn chính xác là nguồn dữ liệu mới nhất. Lệnh này thay snapshot đích sau khi sao lưu/kiểm tra hash, kiểm tra revision và commit trong một transaction.
- Sau khi chuyển sang Supabase, file JSON local chỉ là bản chuyển dữ liệu ở thời điểm trước đó. **Không chạy sync từ file cũ sau khi người dùng đã phát sinh bài làm mới trên Supabase.** Vận hành bình thường chỉ cần chạy server, không chạy sync lại.
- Muốn khôi phục bản cũ: dừng các ứng dụng, đặt `MATH_DB_PATH` của tiến trình sync trỏ đến `private/backups/.../destination/accounts.json`, chạy dry run, đối chiếu thống kê rồi mới `--apply`. Công cụ tiếp tục sao lưu đích hiện tại trước khi khôi phục. Sau đó gỡ biến nguồn tạm này trước khi chạy server.
- Dữ liệu và tệp nằm trong các bảng `math_lab_private.state` và `math_lab_private.files`; backup database phải bao gồm cả hai. Có thể dùng `pg_dump` qua công cụ PostgreSQL để tạo bản sao nhất quán, quyền `600`, lưu ngoài VPS và định kỳ thử khôi phục vào database riêng.
- Nếu chọn JSON thay Supabase, sao lưu khi server dừng, gồm **cả** `private/accounts.json` và `private/uploads`. `npm run storage:compact` có backup trước khi chuyển PDF/ảnh base64 cũ sang tệp; không cần chạy lại với database đã chuyển.

## Giới hạn còn lại

Session và bản xem trước nhập lớp nằm trong RAM; restart cần đăng nhập lại và phải tải Excel tài khoản ngay sau tạo lớp. Bài thi/lịch sử đã lưu không phụ thuộc session này. Ngân hàng DATATM hiện là phần câu hỏi đã kiểm chứng, chưa tự chuyển mọi Word mới thành bài luyện. Ba cảnh báo npm moderate cùng chuỗi Mammoth/argparse/sprintf-js vẫn còn; không hạ Mammoth xuống bản cũ để ép hết cảnh báo.
