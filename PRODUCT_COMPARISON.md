# FlashDay — Product Comparison & Research Notes

## Nghiên cứu xây lại trang học — 2026-09-27

**Kết luận đề xuất:** giữ nội dung 30 bài/6 chặng và bộ ôn hiện có; thay cách tổ
chức trang học bằng ba trạng thái: **Hôm nay → Đang học → Kết quả buổi học**.
Mỗi trạng thái trả lời một câu: học gì tiếp, đang làm việc gì, và cần luyện gì
sau. Kế hoạch triển khai nằm trong `FlashDay_Design_System.md`, phần “Kế hoạch
xây lại trang học”. Đây là đề xuất thiết kế, chưa phải tính năng đã triển khai.

### Phạm vi và độ tin cậy

- Repo: `/home/thunder/Code/FlashDay`, HEAD `d271265`, cộng working tree có bản
  nội dung 30 bài và bố cục sửa gần đây. HEAD riêng lẻ chưa chứa toàn bộ bản này.
- Đã chạy Vite local, Chrome, preview sạch ở 390×844 và 1440×844; xem ảnh màn
  hình và thử tải lại bài đang viết. Không đăng nhập, không ghi production.
- Đối thủ: đọc tài liệu chính thức và trang bài công khai. Chưa thử các khóa
  trả phí, chưa đăng nhập các app, không khẳng định mọi UI hiện hành giống tài liệu.
- Bài Duolingo là mô tả thiết kế năm 2022; LingQ được đối chiếu bằng hướng dẫn
  iOS. Dùng làm nguồn học cách tổ chức, không gọi đó là kiểm chứng web UI năm 2026.
- Không dùng lời quảng cáo hiệu quả học hay bảng parity cũ làm kết quả thực
  nghiệm. Chưa có nghiên cứu người dùng FlashDay để kết luận thiết kế nào tốt hơn.

### So sánh có nguồn

| Sản phẩm/nguồn                                                                                                              | Điều tài liệu mô tả                                                               | Đề xuất áp dụng vào FlashDay                                                                     | Giới hạn khi áp dụng                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| [British Council — bài nghe A1](https://learnenglish.britishcouncil.org/free-resources/listening/a1/meeting-other-students) | Chuẩn bị, nghe, bài tập và thảo luận; có transcript                               | Một mục tiêu giao tiếp, một đoạn đầu vào, câu hỏi sát đoạn; hướng dẫn ngay cạnh bài              | Không sao chép bài/audio; nguồn này không chứng minh mọi bài nên bị chia thành từng màn                     |
| [Duolingo — thiết kế learning path 2022](https://blog.duolingo.com/new-duolingo-home-screen-design/)                        | Trình tự được hướng dẫn, xen luyện lại, nhóm bài theo unit                        | Nút học tiếp có lý do; 6 chặng mở xem được; bài ôn nằm trong lộ trình                            | Không cần sao chép đường uốn lượn, điểm thưởng hoặc khóa người học vào một đường duy nhất                   |
| [Busuu — Study Plan](https://help.busuu.com/hc/en-gb/articles/16097312171153-What-s-a-Study-Plan-How-do-I-make-one)         | Người học chọn mục tiêu, ngày và thời lượng; có ước tính kết thúc                 | Cho người học thấy việc học phù hợp lúc quay lại; thiết kế có chỗ cho sở thích thời lượng về sau | Tài liệu hiện ghi Premium Plus; không coi ước tính hoàn thành là ngày đạt A1. Lịch nhắc không cần ở đợt đầu |
| [Babbel — Vocab workout](https://support.babbel.com/hc/en-gb/articles/205600228-Vocab-workout-Review)                       | Ôn có lịch, nhiều dạng luyện, gợi ý ôn cạnh bài sắp học; cụm từ đến từ bài học    | Đặt “Ôn đến hạn” cạnh “Học tiếp”; cuối bài giải thích cụm nào được lưu                           | Không sao chép lịch ngày cố định hay nhãn Strong thành năng lực; FlashDay giữ scheduler đang có             |
| [LingQ — hướng dẫn iOS](https://www.lingq.com/en/ios-app-support/)                                                          | Continue Studying; đọc cả bài hoặc từng câu với nghĩa/audio/từ vựng               | Xem nghĩa tại chỗ, mở rộng tra từ khi cần, trở lại bài đang học                                  | Không suy “đã biết” từ lướt qua chữ; không đưa mọi công cụ thư viện vào bài A1                              |
| [Anki — Studying](https://docs.ankiweb.net/studying.html)                                                                   | Hiện số thẻ đến hạn, gợi nhớ rồi mới hiện đáp án; nhiều thẻ có thể thuộc một note | Dùng trạng thái đến hạn thật và thử trước khi xem mẫu                                            | Số thẻ không đồng nghĩa số từ hay số năng lực; không lộ cấu hình scheduler lên màn học cơ bản               |

Đây là các **lựa chọn thiết kế suy ra từ nguồn**, không phải bằng chứng FlashDay
sẽ có hiệu quả bằng các sản phẩm đó. Không cần cài dịch vụ của họ để học các
cách tổ chức này; triển khai có thể giữ JS/Vite/Firebase hiện tại.

### Khoảng trống quan sát được trên FlashDay

| Mức | Quan sát hiện tại                                         | Bằng chứng                                                                                                                                     | Tác động cần kiểm nghiệm                                                             |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| P0  | Bản nháp chưa nộp và bước đang mở mất sau reload          | Điền bài viết Giới thiệu, chuyển sang Nghe, reload: textarea rỗng, bước về `prepare`. `learning-hub.js:241` chỉ đổi DOM; `:253` chỉ lưu ID bài | Gián đoạn có thể làm người học mất công; cần khôi phục đúng bước/nội dung            |
| P1  | Màn đầu chủ yếu là giới thiệu, chọn bài, nút thêm cụm     | Fresh preview 390×844: đầu bài y=531px, câu luyện đầu y=1668px. Desktop: y=281px và 1198px                                                     | Hành động học đầu tiên bị đẩy xuống; cần thử một màn nhập bài ngắn                   |
| P1  | Chuẩn bị, đọc, nghe và vận dụng vẫn cùng một trang dài    | Mobile tổng cao 3751px, phần vận dụng bắt đầu y=2872px khi chưa cài cụm; desktop 3042px/y=2371px                                               | Người học phải tự tìm và hiểu thứ tự; các nút bước hiện chỉ mở/đóng và cuộn          |
| P1  | Viết/nói bị khóa bởi việc thêm cả cụm vào bộ ôn           | `learning-hub.js:329`: `isReady=clusterState.complete`; UI khóa tại `:332`                                                                     | Một thao tác quản lý bộ ôn trở thành điều kiện học dù model submit không đòi việc đó |
| P1  | Chưa có trạng thái kết thúc buổi với đề xuất tiếp theo    | Render bài và nhiệm vụ tại `learning-hub.js:160`/`:325`; lựa chọn bài là select + trước/sau                                                    | Người học có thể không biết đã làm phần nào, còn thiếu gì hoặc nên ôn gì             |
| P2  | 30 bài có optgroup nhưng thiếu bản đồ trạng thái từng bài | `learning-hub.js:164`                                                                                                                          | Chưa thấy ngay bài đang dở hoặc kỹ năng chưa thử trong từng chặng                    |

Số pixel là **mốc đo của fixture local**, không phải chỉ số người dùng thực;
font, chiều cao cửa sổ và dữ liệu khác có thể cho kết quả khác. Không biến số
pixel thành bằng chứng trực tiếp về hiệu quả học. Ảnh trong phiên này:
`/tmp/flashday-plan-current-390.png`, `/tmp/flashday-plan-current-1440.png`;
log `/tmp/flashday-plan-audit.log` (artifact tạm, không phải tài nguyên deploy).

### Cần giữ từ bản hiện tại

- Bài đọc và câu kiểm hiểu dùng chung nguồn; bản dịch bật riêng.
- Phản hồi quiz còn nguyên sau lưu và chuyển bước trong cùng DOM.
- Nghe giọng máy, xem transcript, tự nói và tự đối chiếu là các loại bằng chứng
  khác nhau; không biến hoạt động thành “đạt A1”.
- Các ID bài/Unit/nhiệm vụ, lịch sử thử, namespace tài khoản và scheduler.
- Bốn tab hiện có; thư viện/import vẫn là luồng riêng.

### Lựa chọn thiết kế

| Phương án                                                          | Lợi ích                                       | Chi phí/rủi ro                                             | Quyết định                                  |
| ------------------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| Chỉ thu nhỏ chữ và khoảng cách trên trang dài                      | Nhanh, ít đổi hành vi                         | Không giải quyết bản nháp, học tiếp hay phụ thuộc thêm cụm | Không đủ cho vấn đề đã quan sát             |
| Trang Hôm nay + bài học từng bước + tổng kết, kèm mục xem toàn bài | Rõ việc tiếp theo, giữ khả năng tra cứu tự do | Cần quản lý phiên/bản nháp và focus đúng                   | **Chọn để làm prototype và thử người dùng** |
| Xây LMS mới, đổi framework, AI tutor và hệ thống chấm điểm         | Có thể mở thêm loại hoạt động                 | Tăng phạm vi, chi phí, migration; chưa có đo đạc biện minh | Ngoài phạm vi đợt xây lại này               |

### Nguyên tắc bổ trợ

[Progressive disclosure của NN/g](https://www.nngroup.com/articles/progressive-disclosure/)
hỗ trợ việc đưa công cụ phụ ra sau một thao tác. Trong FlashDay, câu hỏi và
phản hồi là nội dung chính; giới hạn đánh giá cần hiện ngay nơi đưa ra kết quả,
không giấu tất cả vào trợ giúp.

Theo [WCAG 2.2 — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html),
focus không được bị nội dung do tác giả tạo che hoàn toàn. Thanh nút dính đáy
nếu có phải dành chỗ cho nội dung, bàn phím ảo và focus; không chỉ thử ảnh tĩnh.

---

## Lưu trữ: ghi chú so sánh trước nghiên cứu này

Các phần bên dưới là tư vấn lịch sử, có nhãn DONE và kết luận parity chưa được
kiểm chứng lại toàn bộ. Chúng không quyết định roadmap hiện tại, không phải
chứng cứ rằng FlashDay đã ngang sản phẩm khác hoặc đủ điều kiện đạt A1.

Source: ChatGPT consult (2026-09-26) — compared against Anki, Duolingo, LingQ,
Language Reactor, Migaku, ELSA Speak, Speak, Refold. Use as input for
LEARNING_DESIGN.md decisions; verify any load-bearing claim before quoting it
externally.

FlashDay đã có Memory Engine khá mạnh nhờ FSRS + contextual cards + dictation. Khoảng trống lớn nhất hiện nay không phải thêm SRS, mà là nối immersion → noticing → retrieval → production → gặp lại trong nội dung thật thành một loop duy nhất.

PHẦN 1 — Học gì từ 8 sản phẩm
Sản phẩm (a) Cơ chế cốt lõi làm tốt nhất (b) FlashDay nên “trộm” 1 thứ (c) Không nên copy
Anki Scheduling + active recall cực mạnh; FSRS điều chỉnh interval theo lịch sử nhớ của từng item.
Anki Manual
+1
Desired retention control: cho user chọn Light / Normal / Intensive, map sang retention target thay vì bắt chỉnh thông số FSRS. UI/config kiểu power-user: deck option, template, scheduler knob quá nhiều.
Duolingo Biến học thành daily habit cực ít friction; streak và bài cực ngắn có tác động đo được lên retention.
Duolingo Blog
+1
Minimum viable day: chỉ cần 1 retrieval/1 phút immersion là giữ “Learning Day”. League/XP farming. User dễ tối ưu điểm thay vì năng lực ngôn ngữ.
Duolingo Blog
+1

LingQ Đọc/nghe nội dung thật → click từ lạ → lưu → gặp lại từ đó ở nhiều context.
LingQ
+1
Known-word highlighting ngay trong transcript: new / learning / known. Biến FlashDay thành thư viện content khổng lồ. Một dev không nên cạnh tranh bằng catalogue.
Language Reactor Biến Netflix/YouTube thành interface học: subtitle → lookup → save word + sentence context; có thể export thành cloze.
Language Reactor
1-click sentence capture: chọn từ trong transcript → tự lưu sentence + target + timestamp/audio position vào source_captures. Dual-subtitle/UI đầy công cụ luôn bật; rất dễ biến việc xem thành tra từ liên tục.
Migaku Sentence mining được nhúng thẳng vào media; theo dõi trạng thái từ và dùng nó để ước lượng độ khó content.
Migaku
+1
Comprehension score cho mỗi source dựa trên % token known/learning/new. Auto-create quá nhiều flashcard. SRS queue sẽ trở thành nghĩa địa.
ELSA Speak Feedback phát âm granular: sound/stress/intonation ngay sau khi nói.
ELSA Speak
+1
Error replay: user nói 1 câu → chỉ highlight 1–2 chỗ sai quan trọng → nghe mẫu → nói lại. Đi xây pronunciation scoring engine riêng. Quá xa core và rất tốn R&D.
Speak Learn → Practice → Apply bằng voice; chuyển rất nhanh từ biết phrase sang dùng phrase trong tình huống.
Speak
Sau một card đủ mature, thỉnh thoảng yêu cầu dùng nó để tạo 1 câu mới. Open-ended AI chat vô hạn. Tốn tiền và khó đo learning outcome.
Refold Input-first + sentence mining: học từ chính nội dung mình tiêu thụ, rồi quay lại nhận ra nó trong immersion.
Refold Academy
+1
Noticing mode: từ đang học xuất hiện trong transcript thì highlight nhẹ; tap để xem card/source cũ. Trì hoãn output quá lâu theo methodology cứng nhắc. FlashDay nên dùng input-heavy nhưng vẫn cho production tăng dần.
Refold Academy

Pattern đáng lấy nhất: không phải 8 feature riêng lẻ. Nó là:

Content → gặp từ → capture → retrieve → gặp lại trong context khác → produce.

Đó nên trở thành primitive của FlashDay.

PHẦN 2 — Learning science → implementation

Một lưu ý quan trọng: spacing/retrieval có evidence rất mạnh. “i+1 chính xác” của Krashen thì gây tranh luận; nên triển khai nó dưới dạng content comprehensibility/adaptive difficulty, không hard-code một “công thức i+1” giả khoa học.
ScienceDirect
+1

Cơ chế Evidence FlashDay đang thiếu Implementation cụ thể

1. Retrieval practice + feedback Testing thường tạo retention dài hạn tốt hơn restudy.
   PubMed
   +1
   Nhiều card vẫn có thể thành recognition hơn là recall thực sự. Thêm retrieval_mode: recall | cloze | listening | production vào review_events. Luôn bắt user trả lời trước khi reveal.
2. Spacing + effortful retrieval Distributed practice là một trong các hiệu ứng bền vững nhất; meta-analysis classroom gần đây cũng cho lợi thế mức vừa.
   PubMed
   +1
   FSRS schedule card tốt, nhưng chưa schedule skill/mode của cùng knowledge. Một card mature ở recognition → FSRS review tiếp theo chuyển sang cloze/listening/production thay vì chỉ lặp cùng prompt.
3. Context variation / desirable difficulty Variation, testing và interleaving có thể cải thiện long-term learning, miễn difficulty không vượt khả năng người học.
   Bjork Lab
   +1
   Card thường gắn với một context cố định → user có thể nhớ cả screenshot/câu thay vì lexical knowledge. Cho một card link nhiều source_capture_ids; mỗi lần review chọn context khác chứa cùng word/chunk.
4. Comprehensible authentic input Extensive reading cho hiệu quả dương trên vocabulary, comprehension và các domain khác; captioned video cũng hỗ trợ listening/vocab.
   Springer
   +1
   Acquisition Engine chưa chọn content bằng knowledge state thực của user. Với mỗi source_capture/source: tokenize → join cards/learning_progress → tính % known / learning / unknown → xếp Next for you.
5. Production + transfer-appropriate practice Performance tốt hơn khi operations lúc học giống operations cần lúc sử dụng; repeated L2 production cũng có lợi cho accuracy/complexity.
   ScienceDirect
   +1
   Biết nghĩa/điền được ≠ tự nói/viết được. Khi card đạt stability threshold: prompt bằng context/ý tiếng Việt → user tự tạo câu tiếng Anh, lưu production_attempt + error tags vào review_events.

Điểm số 5 đặc biệt quan trọng. Nghiên cứu transfer-appropriate processing cho thấy không tồn tại một kiểu “học sâu nhất” luôn thắng: cách luyện phải tương đồng với năng lực muốn sử dụng sau này.
ScienceDirect

Ví dụ:

hear → understand → luyện listening retrieval
idea → sentence → luyện production
sentence with gap → word → lexical retrieval

Đừng dùng một card type cho tất cả.

3 FEATURE tiếp theo nên build

1. Multi-Context Recall / Context Rotation

Evidence: rất mạnh · Effort: thấp–vừa

Văn bản thuần túy
word: "reluctant"

Review 1 → source sentence A
Review 2 → audio sentence B
Review 3 → cloze sentence C

Schema tối thiểu:

JavaScript
cards: {
source_capture_ids: [],
retrieval_modes: []
}

review_events: {
source_capture_id,
retrieval_mode
}

Đây là feature tôi sẽ build đầu tiên: tận dụng ngay FSRS + source_captures, chống memorization theo card và biến SRS thành học transferable knowledge.
Bjork Lab
+1

2. Immersion Difficulty Engine — “Next for you”

Evidence: mạnh · Effort: vừa

Mỗi source:

Văn bản thuần túy
92% known
5% learning
3% new

→ Good fit

Sau đó home không nói:

Study 23 cards.

Mà nói:

Continue learning from real English
8 min · 91% understandable · 6 words you're currently learning

Đây là bước thực sự biến FlashDay từ flashcard app có immersion thành SRS-assisted immersion product. Extensive input có evidence tích cực; LingQ/Migaku cho thấy product pattern để operationalize nó.
Springer
+1

3. Production Ladder

Evidence: mạnh · Effort: vừa

Không cần AI conversation lớn.

Cho mỗi knowledge unit tiến dần:

Recognize → Recall → Dictate → Produce

Ví dụ:

Văn bản thuần túy
Stage 1
"reluctant" → hiểu nghĩa

Stage 2
He was \_\_\_ to admit it.

Stage 3
[audio] → type sentence

Stage 4
"Bạn không muốn nhận lời ngay."
→ Say/write your own English sentence using "reluctant".

Các mode không cần trở thành scheduler riêng phức tạp ngay; FSRS vẫn schedule knowledge item, còn FlashDay chọn retrieval task phù hợp với maturity của item.

Roadmap tôi sẽ chốt

Không build thêm game, AI tutor hay pronunciation engine lúc này.

Văn bản thuần túy
V1 Context Rotation
↓
V2 Content Difficulty / Next for you
↓
V3 Production Ladder

Khi ba thứ đó nối vào nhau, FlashDay có learning loop rõ ràng hơn hẳn:

IMMERSION → NOTICE → CAPTURE → RETRIEVE → VARY CONTEXT → PRODUCE → IMMERSION

Đây mới là moat hợp lý cho FlashDay: SRS không phải đích đến; SRS là hệ thống điều phối những gì người học cần gặp, nhớ và sử dụng tiếp theo trong tiếng Anh thật.

---

## Round 2 — Audit sau implementation (GPT consult)

Ba feature trên đã ship (`456def3`, `4ebd733`, `38af811`). GPT round-2 audit kết luận:

> FlashDay đã vượt qua "toy SRS app" stage. Khoảng cách hiện tại nằm ở **feedback quality + friction**, không còn nằm ở scheduler.

### Gap nghiêm trọng nhất: correction loop cho output

Write/speak trước đây chỉ pass/fail self-rate — không trả lời được "sai ở đâu, sửa thế nào, có thử lại không". Speak pattern: **feedback → sửa 1 lỗi quan trọng nhất → TRY AGAIN → verify corrected attempt**.

### Round-2 parity check (trạng thái sau khi ship)

| Capability                             | Ai làm tốt          | FlashDay                             | Trạng thái                    |
| -------------------------------------- | ------------------- | ------------------------------------ | ----------------------------- |
| FSRS / individualized spacing          | Anki                | ✅                                   | DONE                          |
| Context rotation                       | LingQ / Migaku      | ✅ `rotation=first/rotated/repeated` | DONE                          |
| Track known/learning/new xuyên content | LingQ / Migaku      | ✅ reader highlighting               | DONE                          |
| Content difficulty theo vocab state    | Migaku / LingQ      | ✅ Next-for-you fit score            | DONE                          |
| Authentic-content import               | LR / Migaku         | ✅ SRT/JSON + **paste text**         | DONE                          |
| Recognition→listen→write→speak         | Speak / Duolingo    | ✅ MODE_LADDER                       | DONE                          |
| Targeted correction sau write/speak    | Speak / Duolingo    | ✅ word-diff + ONE correction        | DONE (round 2)                |
| Error → retry → verify                 | Speak Practice      | ✅ retry loop + `corrected` flag     | DONE (round 2)                |
| Memory of recurring errors             | Duolingo Mistakes   | ✅ `errorStats` → "Lỗi cần sửa"      | DONE (round 2)                |
| One-click mining từ content đang xem   | Migaku / LR / LingQ | ✅ click-word → save unit            | DONE (round 2)                |
| Content ecosystem sẵn                  | LingQ / Migaku      | ❌                                   | Out of scope (1 dev)          |
| Browser-extension immersion            | Migaku / LR         | ❌                                   | Out of scope                  |
| Real conversational roleplay           | Speak               | ❌                                   | Out of scope (AI chat)        |
| Dictionary lookup cực nhanh            | Migaku/LingQ        | ⚠️ manual meaning entry              | Chấp nhận — không có dict API |

### Đã đủ tốt — đừng đụng (GPT verdict)

- FSRS Unit×mode scheduler — ROI viết scheduler mới thấp hơn sửa feedback loop
- MODE_LADDER 4 mode — đừng bành thành 11 mode; nâng chất lượng transition
- Context Rotation — đủ
- Immersion Difficulty Engine — đủ cho V1 production; đừng tinh chỉnh fit score
- Streak/daily stats — đủ; không XP/league/gem

### Learning loop sau round 2

```
REAL CONTENT → NOTICE/CAPTURE (click-word mining) → FSRS → CONTEXT ROTATION
→ READ → LISTEN → WRITE → SPEAK → ERROR → CORRECTION → RETRY
→ RECURRING ERROR MEMORY → FUTURE PRACTICE → REAL CONTENT
```

Remaining distance to LingQ/Migaku = content ecosystem/distribution, not pedagogy.
