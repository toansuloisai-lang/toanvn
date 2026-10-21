# Bổ sung học liệu DATATM

## Cập nhật kho 2.000 câu ứng viên

Hai đợt chọn có 2.000 câu ứng viên: 65 câu đã kiểm chứng và 1.935 câu chờ duyệt. Kho giao bài có 502 câu (437 cũ + 65 bổ sung). Trong đợt hai có 634 câu chưa có lời giải nguồn. Câu chờ duyệt chỉ hiện cho giáo viên theo khối, không được chọn trực tiếp để giao học sinh.

`node scripts/sync-question-bank-supabase.mjs --apply` đồng bộ ba tài sản JSON vào bảng riêng `math_lab_private.question_bank_assets`, kiểm tra đọc lại trong giao dịch và sao lưu nội dung cũ vào `private/backups`. Không sửa snapshot tài khoản/lớp/bài làm. App hiện đọc các tài sản từ thư mục `data/` trong bản triển khai GitHub; bảng Supabase là bản lưu đồng bộ, chưa phải nguồn đọc trực tiếp khi chạy.

## Phạm vi và trạng thái

Hai quy trình dùng cùng 5 bước: kiểm kê, giải nén/phân loại, trích xuất/chuyển đổi, phân luồng kiểm duyệt, nạp và kiểm tra. Quy trình 1 ưu tiên Toán 7 cho 7A8; quy trình 2 xử lý các gói còn lại. Đã chạy trên bản sao dữ liệu tách biệt. Chưa push, chưa triển khai, chưa ghi dữ liệu vào Supabase đang chạy.

- 28 gói gốc: 4 gói Toán 7 và 24 gói còn lại; 1 trong số 24 là bản tải trùng.
- Quy trình 1: 107 tài liệu Toán 7; thêm 5 tài liệu Toán 8 nằm lẫn đã chuyển sang quy trình 2.
- Quy trình 2: giải nén 2.540 tệp, 1.889 nội dung khác nhau; không còn lỗi giải nén chính hoặc lồng.
- Chuyển 22 tài liệu DOC/RTF sang DOCX. Chuyển/chia 4 tài liệu vượt 10 MB thành 17 phần PDF. So sánh ảnh render trang đầu/cuối từng phần PDF với PDF trước khi chia: 17/17 khớp.
- 13 tài liệu môn khác, 2 tệp khóa Office và 12 tài nguyên hỗ trợ được phân loại riêng. Không xóa bản gốc.
- Nạp **1.904 tài liệu mới** vào kho của bản app kiểm tra, chỉ chủ sở hữu giáo viên được đọc. Loại thêm 30 bản trùng với tài liệu đã có cùng giáo viên, khối và SHA256.
- **37 câu mới đã kiểm tra độc lập**, gồm 17 câu Toán 7, 15 câu Toán 6 và 5 câu Toán 8. Kho chung có **474 câu**. Mỗi câu mới có đáp án, lời giải, xuất xứ và hỗ trợ chọn trắc nghiệm hoặc tự luận nộp ảnh.
- Loại 13 câu có đáp án sai, thiếu điều kiện hoặc mô tả không hợp lệ. Các mục còn lại nằm trong hàng chờ, không mặc định thành câu đã duyệt.
- Trích 4.492 và 60.924 mục câu/bài qua hai đợt. Đây là số mục trích xuất thô, có thể có mục lặp, tiêu đề hoặc thiếu hình/công thức; không phải số câu hợp lệ sẵn sàng giao.

## Tệp kết quả

- `private/datatm-supplement/`: danh mục nguồn, SHA256, văn bản tìm kiếm, câu chờ duyệt, quyết định duyệt, log và kết quả chuyển đổi.
- `private/datatm-supplement/app/accounts.json`: bản sao kiểm tra có tài liệu mới; tuyệt đối không thay toàn bộ snapshot vận hành bằng tệp này.
- `baocao/Bao_cao_bo_sung_DATATM.xlsx`: tổng hợp, danh mục tài liệu, hàng chờ câu hỏi, câu mới đã duyệt và các câu nguồn cần sửa.
- `data/datatm-supplement-reviewed.json`: chỉ chứa câu đã kiểm tra, được ghép vào kho chung và lọc trùng câu dẫn.

## Kiểm duyệt trong app

Tài liệu nhập tự động có `visibility: teacher`. Học sinh không thấy tài liệu trong workspace và bị từ chối cả URL tải trực tiếp. Giáo viên tải xuống, kiểm tra nội dung/hình/công thức; cần sửa thì tải lên bản đã sửa. Nút “Đã kiểm tra nội dung – đăng cho học sinh” chỉ dùng khi tài liệu hiện có đã đạt yêu cầu. Máy chủ kiểm tra đúng chủ sở hữu trước khi đăng. Tài liệu chỉ đến đúng khối và học sinh của giáo viên.

Không tự khẳng định đáp án trong tài liệu nguồn là đúng. Không dùng bản văn bản thuần thay thế công thức OMML, MathType, hình vẽ hoặc bảng. Bản chuyển đổi Office cần kiểm tra trực quan; kiểm tra cấu trúc hoặc so sánh PDF trước/sau chia không chứng minh bản chuyển từ DOC sang DOCX giữ nguyên mọi chi tiết.

## Chạy lại

Các lệnh chạy từ thư mục gốc, tài liệu và kết quả riêng đều nằm trong thư mục bị Git bỏ qua. Cần Python có `rarfile`, `pymupdf`, WinRAR UnRAR và công cụ LibreOffice cục bộ khi chuyển định dạng cũ.

1. `python -X utf8 scripts/prepare-datatm-supplement.py inventory`
2. `python -X utf8 scripts/prepare-datatm-supplement.py extract 1` rồi `node scripts/extract-datatm-supplement.mjs 1`
3. `node scripts/review-datatm-supplement.mjs`
4. `python -X utf8 scripts/prepare-datatm-supplement.py extract 2` rồi `node --max-old-space-size=6144 scripts/extract-datatm-supplement.mjs 2`
5. `node scripts/convert-datatm-legacy.mjs`; `python -X utf8 scripts/convert-datatm-large.py`; `node scripts/extract-datatm-supplement.mjs 2 --converted-only`
6. `node scripts/finalize-datatm-supplement.mjs`; `node scripts/review-datatm-supplement-rest.mjs`
7. Sau khi chuẩn bị bản sao kiểm tra riêng: `node scripts/stage-datatm-supplement.mjs 1`, `node scripts/stage-datatm-supplement.mjs 2`, `node scripts/deduplicate-datatm-staging.mjs`
8. `node --max-old-space-size=6144 scripts/report-datatm-supplement.mjs`

Các script có marker và SHA256 để tiếp tục; không chạy lại bộ trích xuất cũ vào các đầu ra đã được duyệt của đợt trước. Khi giải nén lại bước 2, cần chạy lại bước chuyển đổi để bổ sung danh mục file đã chuyển.

## Đưa lên môi trường vận hành

Chỉ push khi người dùng yêu cầu. Sau khi mã đã triển khai, `node scripts/publish-datatm-supplement.mjs` chỉ xuất kế hoạch. Chế độ `--apply` nhập từng tài liệu qua API của giáo viên, kiểm tra máy chủ hỗ trợ `sourceDocumentReview` **trước mọi lượt tải lên**, đối chiếu tải lại bằng SHA256 và lưu checkpoint. Không thay snapshot, không thay tài khoản/lớp hoặc gửi email. Script không được chạy ghi dữ liệu khi phiên bản web chưa hỗ trợ phạm vi chỉ giáo viên.

## Kiểm tra

123 kiểm thử Node đạt. Các kiểm tra trình duyệt đã chạy cho ngân hàng câu hỏi, tài liệu theo khối và quy trình duyệt nguồn mới. Kiểm tra mới bao gồm cấm học sinh xem/tải tài liệu chờ duyệt, cấm giáo viên khác đăng, cho phép chủ sở hữu đăng rõ ràng, tồn tại sau khởi động lại và giao diện điện thoại.
