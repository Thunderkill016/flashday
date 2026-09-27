# FlashDay — thiết kế để học và ôn

## Mục tiêu

Nội dung học và hành động tiếp theo phải rõ trước các công cụ nhập liệu, số liệu và thiết lập. Giữ màu thương hiệu lime, typography và semantic tokens trong `tokens.css`; dùng nền dịu, viền mảnh, khoảng trắng thay cho bóng cứng trên mọi khối. Hỗ trợ cả giao diện sáng và tối.

## Bốn khu vực

- **Bài học:** chọn bài → chuẩn bị → đọc và kiểm hiểu → nghe → viết và nói. Đây là màn hình mặc định.
- **Ôn tập:** gợi nhớ trước khi xem đáp án, sửa lỗi rồi thử lại.
- **Thư viện:** nguồn đọc cá nhân, nội dung mẫu, nhập transcript và thêm từ thủ công.
- **Từ đã lưu:** tìm kiếm bộ nhớ; thiết lập trình độ và thao tác xóa nằm trong phần mở rộng riêng.

Desktop có cột chọn bài và cột nội dung; mobile dùng một cột. Thanh bốn bước chỉ mở/đóng phần tương ứng, không thay DOM hay xóa phản hồi quiz. Đổi bài là thao tác riêng có lưu lựa chọn theo tài khoản.

## Quy tắc trình bày

- Một tiêu đề chính, mục tiêu ngắn, hành động thêm cụm từ rõ ràng.
- Hội thoại đứng ngay trước câu hỏi đọc; bản dịch ẩn mặc định và có nút bật/tắt.
- Thống kê, giới hạn đánh giá và tài liệu nền nằm trong details; câu hỏi và phản hồi không bị ẩn bởi cập nhật tiến độ.
- Dòng văn bản tối đa khoảng 68 ký tự; cột nội dung co được ở màn hình hẹp.
- Nút chính tối thiểu 44px; có focus rõ, tab bàn phím và giảm chuyển động theo thiết lập hệ thống.
- Không dùng số lần làm để tuyên bố đã đạt A1. Nghe giọng tổng hợp và bài tự đối chiếu phải có nhãn đúng bản chất.

## Tham khảo

Cấu trúc chuẩn bị → nghe → kiểm hiểu tham khảo [British Council A1 listening](https://learnenglish.britishcouncil.org/free-resources/listening/a1). Việc đưa công cụ phụ vào phần mở rộng áp dụng [progressive disclosure của Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/). Nội dung bài học vẫn là nội dung tự biên soạn của FlashDay.

## Kiểm chứng

Chạy `npm run verify:full`; browser kiểm tra luồng bài học, phản hồi quiz, hiển thị bản dịch, thư viện, nhập từ và tràn ngang. Xem ảnh thực tế desktop/mobile cho app, landing và đăng nhập. Kiểm tra tự động không thay cho đánh giá hiệu quả học với người học thật.

## Kế hoạch xây lại trang học — đề xuất 2026-09-27

**Trạng thái: kế hoạch để triển khai, chưa phải giao diện đã có.** Nghiên cứu,
nguồn chính thức, các lựa chọn đã so sánh và phép đo local nằm trong
[`PRODUCT_COMPARISON.md`](PRODUCT_COMPARISON.md#nghiên-cứu-xây-lại-trang-học--2026-09-27).
Nội dung can-do và giới hạn đánh giá vẫn theo `LEARNING_DESIGN.md`.

### 1. Mục tiêu và phạm vi

Người Việt mới học A1 cần chọn đúng việc học, thực hiện một hoạt động có phản
hồi, tạm dừng rồi tiếp tục mà không mất công. Giả thuyết cần kiểm chứng: việc
chia trang thành Hôm nay, Đang học và Kết quả sẽ giảm tìm kiếm/cuộn trang so với
bản hiện tại mà không làm khó việc quay lại xem nội dung.

Giữ `/app/` và bốn tab. Ba trạng thái mới nằm **bên trong tab Bài học**, không
thêm ba tab chính. Giữ 30 bài/6 chặng, nguồn dữ liệu, Firebase Auth/Firestore,
FSRS và ID cũ. Không đổi framework, thêm API model, thu âm bắt buộc, chấm phát
âm, mạng xã hội, chứng chỉ hay hệ thống điểm thưởng. Đợt này không viết thêm bài
để tăng số lượng; nội dung chỉ chỉnh khi kiểm chứng thấy thiếu hoặc lệch mục tiêu.

### 2. Màn Hôm nay: chọn việc học

Thứ tự trên mobile và desktop:

1. **Một hành động chính:** Tiếp tục bài đang dở; nếu chưa có thì Bắt đầu bài 1.
   Tên bài, mục tiêu một câu và bước đang dở nằm cùng nút. Chỉ hiện “bản nháp đã
   lưu trên thiết bị” khi thực sự ghi thành công.
2. **Ôn đến hạn:** số lấy từ hàng đợi thực tế, nhãn đúng đơn vị thẻ. Nếu bằng 0,
   nói “Chưa có thẻ đến hạn”; không tạo số mẫu. Có thẻ đến hạn vẫn cho học bài mới.
3. **Lộ trình 6 chặng:** danh sách có thể mở rộng, mỗi bài có tên can-do và trạng
   thái hoạt động. Mặc định mở chặng hiện tại, vẫn được xem/chọn chặng khác.
4. **Thư viện:** liên kết nhẹ để đọc nội dung riêng; không đặt form import ở đây.

Ưu tiên đề xuất có thể giải thích: bản nháp đang dở → phần chưa thử của bài vừa
học → bài tiếp theo theo `A1_STAGES`. Ôn đến hạn luôn có ô riêng. Không tự gọi
đây là cá nhân hóa bằng AI. Người học có quyền chọn bài khác hoặc ôn trước.

Trạng thái bài: Chưa bắt đầu / Đang luyện / Đã thử các phần. Nếu đã làm đủ,
hiện từng kỹ năng và gợi ý ôn, không viết “Đã thành thạo”. Điểm đúng thấp không
bị biến thành đã hiểu; tách trạng thái hoạt động khỏi kết quả.

Wireframe định hướng, mọi con số ví dụ chỉ dành cho prototype có nhãn giả lập:

```text
BÀI HỌC                         [Ôn tập] [Thư viện] [Từ đã lưu]

Tiếp tục: Chào hỏi và giới thiệu
Bạn đang ở phần Nghe. Bản nháp lưu trên thiết bị.
[Tiếp tục học]

Ôn đến hạn: lấy từ lịch ôn thật             [Mở phần ôn]

Lộ trình A1
v 1. Bắt đầu giao tiếp
  Chào hỏi và giới thiệu   Đang luyện
  Liên hệ                 Chưa bắt đầu
  ...
> 2. Nhà và sinh hoạt
...
```

### 3. Màn Đang học: một việc chính tại một thời điểm

Thanh đầu gọn: Về lộ trình / tên bài / bước hiện tại / trạng thái lưu. Mở mục
lục khi cần; không để sidebar chọn 30 bài chiếm màn hình trước nội dung mobile.
Desktop dùng cột nội dung khoảng 60–75ch, cột trợ giúp tùy chọn. Giữ font và
semantic tokens; lime dành cho hành động chính, màu lỗi có chữ giải thích.

Năm bước có tên rõ, tách Viết và Nói vì yêu cầu và bằng chứng khác nhau:

| Bước     | Nội dung chính                                                        | Hành động và phản hồi                                                                                    |
| -------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Hiểu mẫu | Mục tiêu, một mẫu có nghĩa Việt, giải thích ngắn; còn lại mở xem thêm | Câu luyện ngay sau mẫu; sai thì chỉ ra quy tắc cần sửa, cho thử lại                                      |
| Đọc      | Văn bản đúng nguồn câu hỏi; bản dịch theo yêu cầu                     | Ba câu ngắn cùng văn bản, phản hồi giữ nguyên; không tách từng câu hỏi đến mức mất bối cảnh              |
| Nghe     | Điều khiển nghe, câu hỏi; transcript chưa mở mặc định                 | Phát lại, trạng thái phát/lỗi, mở lời là có hỗ trợ. Không có giọng: chọn luyện đọc lời hoặc quay lại sau |
| Viết     | Tình huống mới, khung trả lời và mẫu sau khi thử                      | Ghi bản nháp; xem mẫu/checklist; sửa; lưu lần thử. Chỉ hiện tick nói ở bước nói                          |
| Nói      | Hai vai và thông tin cần trao đổi; câu nhờ nhắc lại luôn dễ tìm       | Thực hành với người khác hoặc khai rõ tự luyện, ghi câu/điều người nghe hiểu, lưu lần thử                |

Không ép trả lời mọi câu đúng mới được xem phần khác. Cho lựa chọn “Xem hướng
dẫn”, “Thử lại”, “Học tiếp” sau phản hồi; khi bỏ qua phải giữ nhãn chưa thử.
Không biến nhấn Tiếp thành một bản ghi đã làm. Bài nghe không thực hiện được
không khóa toàn bộ khóa học; tổng kết nói rõ chưa có lần nghe hợp lệ.

Điều hướng bước phải đổi phần nội dung hoạt động và focus về tiêu đề phù hợp,
không chỉ cuộn tới một khối giữa trang dài. Không tự focus vào input làm bật bàn
phím ngay khi vào bài. Có Quay lại và Mục lục; “Xem toàn bài” là chế độ tra cứu,
quay về bước cũ không làm mất câu trả lời hay đánh dấu đã làm.

```text
[← Lộ trình]  Chào hỏi và giới thiệu     [Mục lục]
Đọc · bước 2/5                         Đã lưu trên thiết bị

Mục tiêu: tìm đúng tên và nơi ở.
Hội thoại (giữ cạnh câu hỏi)
[Hiện nghĩa]

Tom đang sống ở đâu?
( ) Canada    ( ) Hà Nội    ( ) Huế
[Kiểm tra]

Phản hồi + gợi ý cụ thể sau khi nộp
[Quay lại]                               [Học tiếp: Nghe]
```

Thanh hành động có thể dính đáy nếu không che nội dung/focus khi zoom và mở bàn
phím. Chỉ nút chính dùng màu mạnh. Đặt nhãn “Giọng máy”, “Tự đối chiếu” tại hoạt
động liên quan; mô tả giới hạn dài nằm trong trợ giúp nhưng không làm người học
hiểu nhầm kết quả đang được máy chấm.

### 4. Kết quả buổi học: phản hồi và bước tiếp theo

- Đọc/nghe: số đúng, số lần thử và hỗ trợ đã dùng; không suy trình độ.
- Viết/nói: có bản đã lưu hay còn nháp, đã tự đối chiếu chưa, nói một mình hay
  có người nghe (chỉ hiện nếu có dữ liệu, không tự suy).
- Phần chưa thử hoặc cần quay lại phải hiện rõ, kể cả người học kết thúc sớm.
- Hiện các cụm có thể lưu để ôn. Chọn cụm nào thì dùng luồng import hiện có,
  chống trùng theo identity; thêm cụm không được tự tạo review event.
- Một nút tiếp theo có lý do: “Sửa phần đọc” nếu người học chọn sửa; “Ôn đến hạn”
  nếu có; hoặc “Học bài tiếp”. Người học luôn có thể về lộ trình.

**Bỏ phụ thuộc “phải thêm toàn bộ cụm trước khi viết/nói”.** Đây là thay đổi
hành vi có chủ ý: luyện vận dụng không cần thao tác quản lý bộ ôn. Cho lưu cụm
khi đọc hoặc cuối buổi. Không tự thêm cả 30 bài vào hàng đợi.

### 5. Bản nháp, tiếp tục và bằng chứng

Thiết kế trạng thái cần hoàn thành trước khi đổi renderer:

- Key nháp theo namespace tài khoản/preview, lessonId, phiên bản nội dung.
  Gồm bước, câu chưa nộp, đáp án đã chọn, draft viết/nói, việc đã xem hỗ trợ và
  thời điểm ghi. Kiểm cấu trúc dữ liệu khi đọc; không dùng nháp như điểm số.
- Đợt đầu lưu nháp **trên thiết bị**, có nhãn rõ. Kết quả đã nộp dùng store/cloud
  hiện có. Chưa thêm đồng bộ nháp giữa thiết bị và quy tắc merge mới vào đợt đầu.
- Lưu trước chuyển bước/tab/bài, và khi sửa nội dung. Báo lỗi khi storage đầy
  hoặc bị chặn; không hiện “Đã lưu” khi ghi thất bại. Không chỉ dựa `beforeunload`.
- Chuyển tài khoản: dừng audio, bỏ view state của tài khoản trước, không đưa
  response cũ vào tài khoản mới. Login từ preview không âm thầm trộn dữ liệu.
- Nội dung đổi phiên bản: không áp đáp án chỉ số cũ vào câu mới; báo có nháp cũ
  để người học đọc lại, không chuyển thành điểm hay tự xóa nháp đang có.
- Tiến độ phiên và bằng chứng học là hai thứ khác nhau. Các attempt đã nộp giữ
  ID, phiên bản, loại hỗ trợ và thời gian; khôi phục không tự nộp thêm lần nữa.
- Giữ `comprehensionChecks`, `transferAttempts`, quy tắc giờ hẹn và
  `grading: self-check`. Chưa cần thay schema Firestore chỉ để đổi bố cục.

Trước triển khai cần kiểm `hydrate/reset/export` có xử lý key nháp nhất quán;
xóa dữ liệu học phải xử lý cả nháp theo cùng xác nhận hiện có. Đề xuất dùng
schema nháp có version riêng và giới hạn theo kích thước đã đo, không chọn một
con số tùy ý rồi coi đó là năng lực lưu trữ thật.

### 6. Phân công theo mã hiện có

| Nơi sửa khi triển khai                                                                           | Trách nhiệm                                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `a1-curriculum.js`                                                                               | Tiếp tục là nguồn bài/chặng; chỉ thêm metadata cần cho một mẫu bài gọn, không tạo bản sao catalog       |
| `learning-entry.js`                                                                              | Hàm thuần xác định trạng thái hoạt động và đề xuất tiếp theo; giữ gate, ID và bằng chứng                |
| `learning-hub.js`                                                                                | Home/runner/summary và điều khiển đọc, quiz, audio; tách renderer sau khi có test bảo vệ trạng thái     |
| `app/index.html`, `app-bespoke.js`                                                               | Mount và điều hướng bên trong tab Bài học, không phá ba tab còn lại                                     |
| `styles.css`, `tokens.css`                                                                       | Component học, responsive, focus và trạng thái; xóa quy tắc cũ khi thay thế thay vì chồng thêm override |
| `flashday-store.js`, `flashday-data.js`                                                          | Đọc/ghi dữ liệu đã nộp hiện tại; chỉ sửa nếu adapter nháp thực sự cần, giữ cloud record riêng           |
| `tests/learning-browser.test.mjs`, `tests/a1-curriculum.test.js`, `tests/learning-entry.test.js` | Luồng thật, nội dung và trạng thái; không chỉ grep số lần gọi renderer                                  |

Nếu logic phiên không còn thuộc trách nhiệm model bài học, một module
`lesson-session.js` thuần cho trạng thái/nháp là ranh giới hợp lý. Quyết định khi
triển khai; không dựng một store hay scheduler thứ hai. Renderer riêng chỉ
được tách để dùng lại cùng state, không tạo một app song song.

### 7. Các đợt triển khai và điều kiện xong

| Đợt                  | Kết quả cụ thể                                                                    | Điều kiện chấp nhận                                                                                                |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 0 · Chốt luồng       | Prototype Home/runner/summary cho Giới thiệu, Hẹn gặp, Ôn giao dịch; mobile trước | Các hành động và trạng thái thiếu audio/chưa lưu có thể đi hết luồng; chưa sửa toàn bộ 30 bài                      |
| 1 · Tiếp tục an toàn | State phiên, bản nháp và test khôi phục                                           | Reload, đổi bài, đổi tab giữ câu và bước; đổi tài khoản không lẫn dữ liệu; lỗi storage không báo thành công        |
| 2 · Học và phản hồi  | Renderer 5 bước, trợ giúp tại chỗ, gate viết/nói độc lập import                   | Giữ nguyên feedback/retry; văn bản đúng nguồn quiz; chỉ lưu đúng một attempt mỗi lần nộp; reader quay về đúng bước |
| 3 · Home và kết quả  | Lộ trình 6 chặng, học tiếp, ôn thật, tổng kết từng kỹ năng                        | Không có số liệu mẫu trong dữ liệu thật; không đánh dấu đạt do click/import; nhãn thiếu kỹ năng đúng               |
| 4 · Mở đủ 30 bài     | Mapping nội dung, polish, regression và thử người học                             | `verify:full` đạt; đủ cả 30 bài; kiểm mobile/keyboard/zoom; xử lý lỗi nghiêm trọng từ buổi thử                     |

Không cần gán lịch giao theo ngày khi chưa hoàn tất prototype và xác định chi
phí persistence. Thứ tự trên là thứ tự phụ thuộc; phần tiếp theo sau bản kế
hoạch là prototype ba bài đại diện cùng contract trạng thái, không viết lại
scheduler hay tiếp tục tăng số lượng bài.

### 8. Kiểm chứng thiết kế

**Gate kỹ thuật:** chạy typecheck, unit, build, browser và Firestore emulator
trên cây cuối. Các ca bắt buộc: reload nháp ở từng bước; retry giữ feedback;
chuyển account khi đang lưu; phát audio lỗi; transcript hỗ trợ không tính nghe;
đổi nội dung không tái dùng đáp án cũ; import không nhân bản; từ reader quay lại;
không mất bản nháp khi chọn bài khác; review queue không đổi chỉ vì đổi màn.

**Gate giao diện:** ở 390×844, nút Bắt đầu/Tiếp tục nhìn thấy ngay; sau khi vào
bài, thấy mục tiêu và mẫu ngắn mà không phải đi qua sidebar chọn bài. Với bài
Giới thiệu, mục tiêu prototype là câu luyện đầu nằm trong khoảng một màn cuộn
sau khi vào bài (mục tiêu thiết kế, chưa phải kết quả). Kiểm 320, 390, 768,
1440px, zoom 200%, bàn phím ảo, sáng/tối, focus và screen reader cơ bản. Không
ép mọi đoạn đọc vào đúng một màn hình.

**Thử với người học:** mời khoảng 5 người Việt mới bắt đầu (mẫu định tính,
không đại diện thị trường), cho thực hiện: chọn bài; tìm phản hồi khi sai; bật
trợ giúp; dừng/tải lại và học tiếp; tìm việc ôn sau buổi. Ghi thời gian tìm,
hành động nhầm, cần người hướng dẫn và lời giải thích của họ về kết quả.
Mục tiêu pilot: ít nhất 4/5 người làm được các việc cốt lõi mà không được chỉ
nút; 0 lỗi mất câu hoặc mất feedback. Đây là tiêu chí quyết định nội bộ, không
phải kết luận thống kê. Nếu không đạt, sửa nguyên nhân rồi thử lại.

**Kiểm hiệu quả học riêng:** dùng nhiệm vụ mới cùng can-do sau một ngày, có
người nghe/chấm và ghi hỗ trợ. So sánh giao diện cũ/mới chỉ có ý nghĩa khi giữ
nội dung và điều kiện tương đương; completion, thời gian bấm và test phần mềm
không chứng minh học tốt hơn. Chưa thu dữ liệu này trong phiên nghiên cứu.

### 9. Phát hành và quay lại

Giữ bản dữ liệu/ID cũ tương thích. Chỉ thay UI sau khi các gate đạt; thử preview
trước production, giữ đường quay lại renderer trước trong giai đoạn kiểm thử.
Không chạy hai luồng cùng ghi cho một lần nộp. Deployment production là bước
riêng cần xác nhận theo `AGENTS.md` cấp workspace. Phiên nghiên cứu này chỉ cập
nhật tài liệu; không đổi runtime hoặc deploy.
