# Deploy Render với Supabase

Ứng dụng chạy trên Render; toàn bộ dữ liệu nghiệp vụ và tài liệu tải lên được lưu trong PostgreSQL của Supabase. Render không cần Persistent Disk cho cấu hình này. Tài khoản, mật khẩu và phân quyền hiện tại được giữ nguyên, không cần tạo lại người dùng trong Supabase Auth.

## 1. Tạo project Supabase

1. Tạo project tại https://supabase.com/dashboard. Chọn khu vực gần dịch vụ Render dự định dùng và lưu mật khẩu database riêng.
2. Đợi database sẵn sàng, mở **Connect**, chọn kết nối **Session pooler** (thường cổng `5432`), định dạng URI PostgreSQL. Pooler dùng được với môi trường chỉ có IPv4; direct connection có thể cần IPv6.
3. Sao chép URI dạng `postgresql://postgres.PROJECT_REF:PASSWORD@HOST:5432/postgres`. Thay placeholder mật khẩu bằng mật khẩu database đã URL-encode, nhất là khi có `@`, `#`, `/`, `%` hoặc `:`. Không dùng project URL, anon key hay service-role key thay cho URI PostgreSQL.
4. Thêm URI vào `.env` trên máy đang giữ dữ liệu:

```dotenv
MATH_STORAGE=json
MATH_DB_PATH=private/accounts.json
SUPABASE_DB_URL="postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres"
```

Giữ `MATH_STORAGE=json` trong lúc chuẩn bị để không vô tình trỏ app local vào database sản xuất. Các lệnh migrate dùng `SUPABASE_DB_URL` độc lập với chế độ này.

Kết nối luôn xác thực TLS. Nếu project yêu cầu chứng chỉ CA riêng, lấy chứng chỉ database từ phần cấu hình SSL của Supabase và đặt `SUPABASE_DB_CA` thành nội dung PEM; có thể thay xuống dòng bằng ký tự `\n`. Đặt cùng giá trị trên Render. Không tắt xác thực TLS để xử lý lỗi chứng chỉ.

## 2. Xuất và chuyển dữ liệu thật

Dừng ứng dụng local trước lần xuất cuối để dữ liệu không thay đổi trong lúc chuyển. Nếu chuyển từ một Render cũ, dừng ghi ở dịch vụ cũ và lấy **file `accounts.json` cùng thư mục `uploads/` bên cạnh** từ ổ dữ liệu của dịch vụ đó; bản local có thể không chứa các lượt học mới trên Render.

Tại thư mục dự án:

```powershell
npm ci
npm run supabase:prepare
npm run supabase:migrate
npm run supabase:verify
```

- `prepare` tạo thư mục riêng `private/supabase-export-THOI_GIAN/`, gồm dữ liệu tài khoản gốc, toàn bộ thư mục uploads và manifest SHA-256. Không sửa nguồn hay ghi đè bản xuất trước đó.
- `migrate` nhập bản xuất mới nhất. Có thể chỉ định bản khác: `npm run supabase:migrate -- "private/supabase-export-..."`.
- Để xuất nguồn khác: `npm run supabase:prepare -- "D:\ban-sao-render\accounts.json"`. Công cụ tìm `uploads/` cạnh file nguồn.
- Lệnh nhập tự tạo schema/bảng, nhập và đối chiếu toàn bộ JSON cùng từng byte tệp trong **một transaction**. Đích có dữ liệu sẽ bị từ chối, không có cờ ghi đè.
- `verify` so sánh Supabase với bản xuất, nên chạy trước khi mở ứng dụng cho người dùng. Sau khi có lượt học mới, dữ liệu khác bản xuất là bình thường.

Lưu nguyên ID, salt/hash mật khẩu, liên kết tài khoản, hồ sơ, lượt làm bài, lịch ôn, nhiệm vụ, nhận xét, lớp, chẩn đoán lỗi, phân tích AI đã lưu, hoạt động, nội dung giáo viên, lịch sử/hàng đợi email và tài liệu. Công cụ giữ cả các trường dữ liệu chưa được liệt kê ở đây. Thiếu tệp hoặc checksum sai thì dừng nhập. Không dùng `deploy-seed/accounts.json`: bản demo đó đã loại hash mật khẩu cũ.

Gói xuất chứa dữ liệu riêng và hash mật khẩu, chỉ giữ trong `private/` đã bị Git bỏ qua. Không đưa gói này lên GitHub. Mã nguồn/nội dung dựng sẵn trong `public/` được deploy cùng repo; chúng không cần nhập database. `.env`, nhật ký, ảnh kiểm thử và file ghi mật khẩu ban đầu không phải dữ liệu ứng dụng để nhập.

Nếu nguồn có email đã xác nhận còn chờ, hàng đợi đó cũng được giữ. Khi bật Gmail, server mới tiếp tục xử lý theo cơ chế hiện có; không chạy đồng thời server cũ và mới để gửi cùng hàng đợi.

## 3. Deploy Render

1. Đưa mã nguồn và `package-lock.json` lên GitHub; không đưa `.env`, `private/`, `node_modules/`, `artifacts/` lên Git.
2. Trên Render chọn **New → Blueprint**, kết nối repository, dùng `render.yaml` đã có trong dự án.
3. Nhập `SUPABASE_DB_URL` giống URI đã dùng để migrate. Nhập `GEMINI_API_KEY` nếu dùng AI thật; nếu không dùng, có thể để trống hoặc bỏ biến này.
4. Deploy sau khi migrate/verify đã thành công. Đăng nhập bằng **tên đăng nhập và mật khẩu cũ**. Không có bước đặt lại mật khẩu hay nạp demo tự động khi chạy Supabase.

Nếu tạo Web Service thủ công:

| Thiết lập | Giá trị |
|---|---|
| Runtime | Node |
| Build command | `npm ci --omit=dev` |
| Start command | `npm run start:render` |
| Health check | `/api/status` |
| Instances | `1` |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `COOKIE_SECURE` | `true` |
| `MATH_STORAGE` | `supabase` |
| `SUPABASE_DB_URL` | URI bí mật của database |
| `GEMINI_MODEL` | `gemini-2.5-flash` |

Để Render tự cấp `PORT`. Thêm `SUPABASE_DB_CA` nếu cần, `GEMINI_API_KEY` nếu dùng AI và các biến Gmail trong [GMAIL.md](GMAIL.md) nếu gửi email. Blueprint dùng gói Free và `GMAIL_TRANSPORT=api`; cần cấu hình OAuth Gmail, không dùng mật khẩu ứng dụng SMTP. Không cần Persistent Disk. Free có thể ngủ khi không có truy cập; hàng đợi chờ tiếp tục khi app hoạt động lại, không đảm bảo thời điểm giao thư. Uptime ping không phải cam kết uptime từ nhà cung cấp.

Nếu cập nhật dịch vụ Render cũ đang dùng disk: **giữ disk cũ và bản sao dữ liệu** cho đến khi migrate, đăng nhập và kiểm tra bản mới thành công. Thay đổi YAML không phải là bằng chứng dữ liệu trên disk đã được chuyển. Chỉ gỡ tài nguyên cũ khi đã xác minh.

Database không có bản nhập hợp lệ thì ứng dụng dừng khởi động, không âm thầm tạo file JSON rỗng trên Render. `INITIAL_ADMIN_PASSWORD` không cần khi đã nhập các tài khoản hiện tại. Nếu bản nhập chủ ý không có tài khoản nào, biến này cần ít nhất 12 ký tự để tạo `quantri` lần đầu.

## 4. Kiểm tra sau deploy

1. Mở `/api/status`, kiểm tra trả HTTP 200. Trường `ai` chỉ cho biết có cấu hình khóa, không chứng minh Gemini gọi được.
2. Đăng nhập từng vai trò, đối chiếu hồ sơ, số lượt làm bài và các liên kết cũ.
3. Làm một bài, lưu bản sửa; đăng nhập giáo viên để xem kết quả.
4. Tải một PDF/Word bằng tài khoản giáo viên và kiểm tra học sinh được liên kết tải được.
5. Restart dịch vụ Render, đăng nhập lại và kiểm tra bài/tài liệu vẫn còn. Phiên đăng nhập vẫn ở bộ nhớ nên restart yêu cầu đăng nhập lại.

## Cấu trúc lưu trữ và vận hành

- `math_lab_private.state`: một bản trạng thái ứng dụng trong cột PostgreSQL `jsonb`, có revision chống ghi đè từ bản cũ. Đây là bước chuyển giữ nguyên cấu trúc hiện tại, chưa tách thành các bảng quan hệ cho từng loại nghiệp vụ.
- `math_lab_private.files`: tài liệu PDF/Word trong `bytea`. Metadata và tệp mới được commit cùng transaction, không phụ thuộc filesystem Render hay bucket Storage công khai.
- Schema riêng, bật RLS và không cấp quyền cho `anon`/`authenticated`; frontend chỉ gọi API Render. Không thêm schema này vào danh sách exposed schemas của Supabase. URI database chỉ ở server.
- Một server hoạt động tại một thời điểm. Các nghiệp vụ hiện tại ghi đồng bộ; worker riêng thực hiện I/O PostgreSQL và chỉ trả thành công sau COMMIT. Mỗi lần lưu ghi toàn bộ trạng thái, phù hợp quy mô hiện tại; chưa thiết kế để autoscale hoặc cho lưu lượng lớn.
- Không mở app local ở chế độ Supabase cùng lúc với Render sản xuất. Nếu hai server cùng ghi, revision chặn bên giữ bản cũ và trả 503 thay vì ghi mất dữ liệu. Dừng bên không dùng rồi restart bên giữ lại. Với đợt deploy có nhiều người đang ghi, nên chọn thời gian bảo trì để tránh khoảng chồng lấn giữa tiến trình cũ/mới.
- Lỗi kết nối hoặc ghi không chắc chắn khiến tiến trình ngừng phục vụ dữ liệu; xử lý lỗi kết nối rồi restart để đọc lại trạng thái đã commit. Không fallback xuống JSON. Bật sao lưu phù hợp trong Supabase; bản xuất ban đầu không thay thế sao lưu dữ liệu mới.
- Có thể tiếp tục dùng local JSON với `MATH_STORAGE=json`; đó là dữ liệu riêng, không tự đồng bộ hai chiều với Supabase.

Kiểm thử: `npm test` và `npm run test:supabase`. Lệnh thứ hai khởi tạo PostgreSQL tạm trên máy, kiểm tra transaction, quyền schema, tài khoản, tệp và restart; không đọc `.env`, không kết nối Supabase thật. Cần các devDependencies của `npm ci` và chạy bằng người dùng thường (PostgreSQL không chạy dưới root).
