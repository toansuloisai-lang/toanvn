# Kiểm tra tốc độ ngày 17/10/2026

Đã đo trước/sau và sửa các điểm gây tải thừa. Chưa phải kết quả đo VPS thực tế hoặc chứng nhận Core Web Vitals.

## Kết quả truyền tải

Edge headless, màn hình 390 × 844, CPU chậm 4 lần, cấu hình mạng CDP 8 Mbps/40 ms, dữ liệu kiểm tra riêng. Tắt service worker trong phép so sánh để đo trực tiếp HTTP cache. Mỗi trường hợp đo một lượt đầu và một lượt tải lại; các số thời gian đơn lẻ không đủ để kết luận độ ổn định.

| Màn hình | Lần đầu trước sửa | Lần đầu sau sửa | Giảm | Tải lại sau sửa |
|---|---:|---:|---:|---:|
| Đăng nhập | 4,29 MB | 1,67 MB | 61% | 25,9 KB |
| Học sinh | 3,74 MB | 1,11 MB | 70% | 26,1 KB |
| Giáo viên | 4,86 MB | 2,24 MB | 54% | 34,8 KB |

MB/KB theo hệ thập phân; transferSize bao gồm overhead do trình duyệt ghi nhận. Các mốc DOM/load trong JSON không đồng nghĩa màn hình ứng dụng đã sẵn sàng, vì ứng dụng dùng import bất đồng bộ. Kịch bản bổ sung đo `readyMs` riêng cho form đăng nhập, trang học sinh và bảng điều khiển giáo viên.

Lượt đo bổ sung sau sửa: màn hình sẵn sàng lần đầu lần lượt 2,07 giây (đăng nhập), 2,27 giây (học sinh), 2,45 giây (giáo viên); tải lại khoảng 1,25–1,31 giây. Đây là một mẫu theo điều kiện giả lập nêu trên, không phải cam kết thời gian cho người dùng thực tế.

## Thay đổi

- Tải Three.js khi mở hoạt động 3D, giữ trạng thái nhập mới nhất trong lúc tải, giải phóng an toàn nếu rời trang. Loại hơn 2 MB JavaScript khỏi chuỗi tải trang đầu.
- Không chặn khởi động ứng dụng bởi API kiểm tra phiên bản; vẫn giữ kiểm tra cập nhật và bảo vệ nội dung chưa lưu.
- Tài nguyên tĩnh hỗ trợ gzip, ETag, conditional GET/304 và HEAD. Giữ `no-cache` để xác thực phiên bản mới thay vì giữ mã cũ lâu ngày; không cache API chứa dữ liệu tài khoản.
- Service worker không tải sẵn Three.js khi cài; mô-đun đã mở được lưu để dùng lại. Hoạt động 3D chưa từng mở vẫn cần mạng lần đầu.
- Bật gzip trong mẫu Nginx, bao gồm JSON API. Cấu hình này chỉ có tác dụng khi được cài và reload trên VPS.

## API với dữ liệu hiện có

Server local đang dùng bộ lưu trữ Supabase, lấy 3 mẫu GET mỗi API, chỉ xuất số đo, không xuất nội dung riêng tư:

| Vai trò/API | Phản hồi chưa nén | Thời gian local |
|---|---:|---:|
| Học sinh / workspace | 13,0 KB | 1–3 ms |
| Giáo viên / workspace | 30,6 KB | 1–2 ms |
| Phụ huynh / workspace | 7,8 KB | 1 ms |
| Giáo viên / class-report | 488,2 KB | 17–19 ms |

Đây là tốc độ server local đọc trạng thái đã nạp trong bộ nhớ, **không phải** thời gian truy vấn Supabase mới cho mỗi request. Báo cáo lớp có payload lớn nhất; gzip JSON ở Nginx giúp giảm truyền tải, nhưng chưa đo kích thước nén từ Nginx thật. Chưa đo độ trễ ghi Supabase trong đợt này để tránh thay dữ liệu thật.

## Kiểm chứng và giới hạn

- 104/104 kiểm tra tự động đạt, gồm nội dung gzip, phân biệt ETag theo encoding, 304, HEAD và từ chối gzip khi `q=0`.
- Các kịch bản trình duyệt đồ họa 3D, PWA, cập nhật an toàn, điều hướng, bố cục điện thoại và công thức đều đạt sau sửa.
- Không thấy lỗi JavaScript trong các lượt đo tải trang.
- Font TTF và việc tải nhiều mô-đun/CSS chung vẫn còn dư địa tối ưu. Chưa đo tải đồng thời nhiều người dùng, AI thật, tốc độ ghi database, LCP/INP/CLS ngoài thực tế hoặc mạng di động thật.
- Backend đang chạy cần khởi động lại để nhận phần gzip/ETag mới; backend dùng cho phép đo sau sửa là tiến trình kiểm tra khởi động mới. Khi chuyển lên VPS cần dừng server local, chạy một tiến trình ứng dụng và dùng cấu hình Nginx mới.

Kết quả thô: `artifacts/performance-before.json`, `artifacts/performance-after.json`, `artifacts/performance-ready.json`, `artifacts/performance-live-api.json`. Chạy lại: `node scripts/check-load-performance.mjs latest`.
