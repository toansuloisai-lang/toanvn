# Database demo trên VPS qua CI/CD

Theo yêu cầu của chủ dự án, bản dữ liệu demo được lưu trong Git tại
`deploy/demo-database/`. Đây là snapshot nhất quán từ Supabase ngày 23/10/2026,
revision 181: 65 tài khoản, 200 lượt làm bài, 150 tệp (122.155.691 byte),
3 bộ ngân hàng câu hỏi. Snapshot giữ nguyên mọi bộ sưu tập ứng dụng, mật khẩu
đã hash, nội dung tệp, revision và thời gian cập nhật. API key, URI/mật khẩu
kết nối database và file `.env` không được đưa vào Git.

## Luồng tự động

1. Push `main` chạy CI: bộ test Node, nhập và kiểm tra toàn bộ snapshot bằng
   PostgreSQL tạm, build Docker, chạy PostgreSQL cùng app và kiểm tra restart
   giữ lại thay đổi mới.
2. Controller đang cài trên VPS chỉ triển khai commit có CI thành công. Không
   cần cập nhật controller hoặc thêm SSH key vào GitHub cho thay đổi này.
3. Compose tạo container `toanvn-db` (PostgreSQL 17), volume dữ liệu
   `toanvn_postgres-data` và volume Unix socket `toanvn_postgres-socket`.
4. App khởi động với `MATH_STORAGE=postgres`. Lần đầu, nếu database trống,
   `scripts/start-vps.mjs` nhập snapshot cùng tệp và ngân hàng câu hỏi trong
   một transaction, kiểm tra đọc lại trước khi bắt đầu phục vụ HTTP.
5. Khi database đã có dữ liệu, các lần restart/deploy tiếp theo bỏ qua bước
   nhập và giữ toàn bộ thay đổi trên VPS. Sửa snapshot trong Git không ghi đè
   database đang dùng. Muốn đặt lại demo phải backup và thực hiện riêng.

## Kết nối và lưu trữ

PostgreSQL không có mạng Docker, không nghe TCP và không publish cổng. App
truy cập qua Unix socket trên volume chỉ chia sẻ cho hai container. Xác thực
local qua socket dùng trust; truy cập TCP bị từ chối. Do đó không cần thêm
mật khẩu PostgreSQL vào Git hoặc `.env` VPS. Quyền truy cập Docker/VPS có
quyền truy cập dữ liệu; không chia sẻ volume socket cho container khác.

Compose ghi đè `MATH_STORAGE` và đặt `DATABASE_SOCKET_DIR`, `DATABASE_NAME`,
`DATABASE_USER`. Các biến `SUPABASE_DB_URL` cũ trong `.env` không được sử dụng
ở chế độ này; giữ nguyên cấu hình AI/Gmail hiện có. Supabase không bị sửa/xóa
bởi deployment. Sau khi chuyển, tiến độ mới chỉ lưu trên VPS.

## Kiểm tra vận hành

```sh
docker ps --filter name=toanvn
docker logs --tail=80 toanvn
docker exec toanvn-db psql -U mathlab -d mathlab -c \
  'SELECT revision, updated_at FROM math_lab_private.state'
curl -fsS http://127.0.0.1:3060/api/status
docker exec nginx-manager curl -fsS http://toanvn:3000/api/status
```

Volume dữ liệu tồn tại qua recreate/redeploy. Không chạy `docker compose down
--volumes` trên VPS nếu muốn giữ tiến độ. Sao lưu ngoài VPS định kỳ bằng
`pg_dump`; volume không thay thế backup:

```sh
umask 077
docker exec toanvn-db pg_dump -U mathlab -d mathlab -Fc > /SAFE_BACKUP_PATH/mathlab.dump
```

Trước khi database VPS nhận thay đổi mới, có thể rollback bằng image và
runtime Compose Supabase cũ. Sau khi đã có thay đổi mới, quay về nguồn cũ
sẽ bỏ mất tiến độ mới nếu chưa chuyển dữ liệu ngược lại.

## Công cụ chuyển dữ liệu

`node scripts/transfer-database.mjs export DIRECTORY` xuất database đang
được cấu hình; `verify DIRECTORY` kiểm tra khớp đầy đủ; `import DIRECTORY`
chỉ nhập vào database trống. Export dùng repeatable-read; import kiểm tra
SHA-256 và rollback nếu có lỗi. Bảng ứng dụng chưa hỗ trợ sẽ khiến công cụ
dừng thay vì bỏ sót dữ liệu.

Kiểm tra bản demo được commit: `npm run test:supabase -- --demo-transfer`.
