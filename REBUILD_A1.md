# FlashDay A1 — kế hoạch rebuild từ đầu (2026-09-27)

Quyết định đã chốt với chủ dự án:

- **Xóa app cũ, viết lại trong repo này.** Giữ Vite, Firebase project, Firestore
  rules/config, các module auth/cloud đã kiểm chứng. Không đổi framework.
- **Viết lại curriculum A1 mới** — không tái dùng `a1-curriculum.js`.
- **Phạm vi toàn bộ web:** landing + login + app.

Baseline: HEAD `24dc4d3`. Prod data đã reset về 0 (auth 0, Firestore 0) nên không
cần migration dữ liệu người dùng.

---

## 1. Giữ / xóa

| Giữ (đã verify, không đụng logic)                | Lý do                                                     |
| ------------------------------------------------ | --------------------------------------------------------- |
| `firebase-client.mjs`, `flashday-auth.mjs`       | Auth popup/redirect, verify-email gate, race fix `24dc4d3` |
| `cloud-compat.mjs`                               | Pagination, `assertAccountOwner`, storage probing         |
| `flashday-store.js`                              | Store namespace theo uid, refresh-before-transact          |
| `fsrs-scheduler.mjs` + `ts-fsrs`                 | Scheduler                                                 |
| `public/canonical.js`, `product-bootstrap.js`    | Canonical host, auth gate `/app/`                         |
| `firebase.json`, `firestore.rules`, `.firebaserc`| Hosting single-site, rules user-scoped (mở rộng, không thay) |
| `tokens.css`                                     | Brand tokens                                              |

| Xóa                                                                                                   |
| ----------------------------------------------------------------------------------------------------- |
| `app-bespoke.js`, `learning-hub.js`, `learning-entry.js`, `a1-curriculum.js`                          |
| `bespoke-engine.js`, `bespoke-adapter.js`, `bespoke-card-index.js`, `immersion-engine.js`             |
| `source-capture.js`, `starter-catalog.js`, `transcript-import.js`, `word-lookup.js`, `flashday-product.js`, `flashday-data.js` |
| `styles.css`, `landing.css`, `login/login.css`, `app/index.html`, `index.html`, `login/*`, `auth/*` (UI viết lại, glue giữ) |
| Tests của các module trên; `PRODUCT_COMPARISON.md` phần lưu trữ giữ làm lịch sử                       |

**Bỏ khỏi sản phẩm A1:** Thư viện / import transcript / tra từ. Người mới A1
chưa đọc được nội dung thật; luồng đó thuộc B1+ và làm trang học dài gấp đôi.
Code còn trong git history nếu cần mở lại ở level cao hơn.

---

## 2. Kiến trúc mới

ES modules thuần (bỏ UMD wrapper), Vite multi-page như cũ.

```
src/
  core/
    store.js          ← flashday-store.js (move, giữ nguyên)
    session.js        nháp + bước đang dở, device-local, key theo dbKey
    evidence.js       records đã nộp: lessonEvents (append-only), FSRS state
    scheduler.js      wrapper ts-fsrs cho chunk cards (4 mode: read/listen/write/speak)
    progress.js       hàm thuần: trạng thái bài/chặng, gợi ý tiếp theo — activity-only
    cloud.js          push/pull + merge (từ flashday-cloud.js, cắt phần bespoke)
  content/
    schema.js         validateLesson() — chạy trong test, fail build nếu bài lệch schema
    a1/
      index.js        STAGES + LESSONS export
      s1-*.js … s6-*.js   một file một bài
  ui/
    app.js            shell: header, 3 tab (Học · Ôn · Hồ sơ), hash router
    views/today.js    Hôm nay
    views/runner.js   Đang học — 5 pane mounted, toggle hidden
    views/summary.js  Kết quả buổi
    views/path.js     Lộ trình 6 chặng
    views/review.js   Ôn FSRS theo chunk
    views/profile.js  tài khoản, đồng bộ, xóa dữ liệu
    components/quiz.js, audio.js, draft-field.js
  auth/               ← firebase-client.mjs, flashday-auth.mjs, cloud-compat.mjs (move)
pages: index.html · login/ · auth/ · app/
styles: tokens.css (giữ) + app.css + site.css (mới, viết từ đầu)
```

Quy tắc bất biến (đem từ bài học đã trả giá):

1. Chuyển bước = toggle `hidden`; không rebuild DOM chứa quiz/textarea/feedback.
2. Nháp là nội dung **chưa nộp**; restore không tạo record. Record đã nộp là
   append-only, có `id`, `contentVersion`, `support` (dịch/transcript/mẫu đã xem).
3. Không suy "đạt A1" từ counter. Mọi nhãn tiến độ là hoạt động.
4. Store key theo uid; `claimDbNamespace` giữ nguyên hành vi preview→login.
5. Sau `cloud-hydrated` mọi view re-render từ store; nháp nằm ngoài store.

### Dữ liệu cloud

Giữ `users/{uid}/learning_progress/{uid}` (singleton payload: FSRS state,
session pointer). Thêm **`users/{uid}/lesson_events/{id}`** append-only cho
attempt (quiz/drill/write/speak) — rules mới cùng khuôn `validReviewEvent`,
test bằng Firestore emulator. `units/cards/decks/source_captures/review_events`
không dùng nữa nhưng rules giữ (deny-by-default đã có).

---

## 3. Syllabus A1 mới — 6 chặng × 5 bài

Khung theo CEFR Companion Volume A1 (giao tiếp cơ bản, câu ngắn, thông tin cá
nhân, nhu cầu cụ thể). Người học Việt: chú ý phát âm đuôi -s/-ed, thứ tự tính
từ–danh từ, mạo từ, thì hiện tại đơn ngôi 3.

Bài 5 mỗi chặng là **checkpoint**: không dạy mới, gom 4 bài trước vào một tình
huống dài hơn; runner ẩn "Hiểu mẫu" theo `kind:'checkpoint'`. Cụ thể: mọi
`chunks[].target` và đáp án đúng của drill ở checkpoint phải tái sử dụng ngôn
ngữ đã dạy trong 4 bài trước của cùng chặng (từ `pattern.examples`,
`chunks[].target`/`example`, hoặc đáp án drill của các bài đó). Từ mới chỉ
được xuất hiện trong `dialogue.lines`/`listening.text` khi có dịch tiếng
Việt kèm theo, không là mục tiêu đánh giá, và câu hỏi đọc/nghe vẫn trả lời
được nhờ ngữ cảnh + bản dịch.

| Chặng | Chủ đề                       | Bài 1–4 (can-do)                                                                                                                   | Checkpoint (bài 5)                |
| ----- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1     | Tôi và mọi người             | Chào, tên, quốc gia · Đánh vần, số điện thoại, email · Gia đình, tuổi · Nghề, nơi làm                                            | Điền form & tự giới thiệu 30 giây |
| 2     | Ngày và giờ                  | Giờ, ngày trong tuần · Thói quen hằng ngày (present simple) · Hỏi/đề xuất/đổi giờ hẹn · Tần suất, sở thích                       | Lên lịch gặp qua tin nhắn         |
| 3     | Nơi ở và đường đi            | Nhà, phòng, đồ đạc (there is/are) · Chỉ đường, giới từ nơi chốn · Phương tiện, mua vé · Thành phố của tôi                        | Hướng dẫn khách đến nhà           |
| 4     | Ăn uống và mua sắm           | Gọi món, hỏi giá · Đi chợ: số lượng, some/any · Quần áo, màu, cỡ, đổi hàng · Thích/không thích, hỏi ý                            | Đi ăn và mua quà                  |
| 5     | Sức khỏe, khả năng, việc làm | Cơ thể, đau, ở hiệu thuốc · Can/can't, kỹ năng · Ở chỗ làm: yêu cầu lịch sự · Thời tiết, mặc gì                                  | Gọi báo nghỉ và nhờ việc          |
| 6     | Kế hoạch, tin nhắn, kể lại   | Cuối tuần này (going to) · Viết tin nhắn ngắn, lời mời, từ chối · Hôm qua (was/were, quá khứ đơn quen) · Hỏi lại, xin nhắc lại, kết thúc hội thoại | Kể lại chuyến đi ngắn bằng tin nhắn |

### Mẫu một bài (15–20 phút)

| Bước     | Nội dung                                                                  | Bằng chứng ghi                                        |
| -------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Hiểu mẫu | 1 mẫu câu + 6–8 cụm (EN/VI/ví dụ); 3 drill điền/chọn                       | drill attempt (đúng/sai, hint đã xem)                  |
| Đọc      | hội thoại 6–8 dòng, dịch ẩn; 3 câu hiểu tình huống                        | quiz attempt + `translationViewed`                    |
| Nghe     | đoạn **khác** hội thoại đọc (TTS), 2 câu hỏi; transcript = có hỗ trợ       | listen attempt + `completedPlays`, `transcriptViewed` |
| Viết     | tình huống mới cùng can-do, 1–2 câu; xem mẫu sau khi thử; checklist        | write attempt, `modelRevealed`, `selfReviewed`        |
| Nói      | hai vai, thông tin cần trao đổi; tự khai đã nói / có người nghe            | speak attempt, `spoke`, `listener:'self'|'partner'`   |

Chunk của bài vào bộ ôn FSRS **khi người học nộp bước Hiểu mẫu** (đã gặp và
thử) — không cần nút "thêm cụm", không khóa Viết/Nói. Checkpoint không có
Hiểu mẫu nên cụm vào bộ ôn ở **lần nộp đầu tiên** của bài đó.

---

## 4. Schema bài (`src/content/schema.js`)

```js
{
  id:'a1-s1-l1', stage:1, order:1, kind:'lesson'|'checkpoint',
  contentVersion:1,
  title:'Chào hỏi và giới thiệu', canDo:'Chào, nói tên và quê, hỏi lại người mới gặp.',
  pattern:{ name:'I am / I’m from', rule:'…', examples:[['I’m Mai.','Tôi là Mai.']] },
  chunks:[{ id:'c1', target:'Nice to meet you.', meaning:'Rất vui được gặp bạn.', example:'…', exampleVi:'…' }],
  drills:[{ q:'I ___ from Vietnam.', options:['am','is','are'], answer:0, hint:'I đi với am.' }],
  dialogue:{ title:'…', lines:[['Mai: Hello, I’m Mai.','Mai: Chào, tôi là Mai.']],
             questions:[{ q, options, answer, hint }] },
  listening:{ text:'…', vi:'…', questions:[…] },
  write:{ setup:'…', prompt:'…', model:['…'], checklist:['…'],
          gate:null | { type:'time', expected:'7:00', strict:false } },
  speak:{ setup:'…', roleA:'…', roleB:'…', prompt:'…', model:['…'], checklist:['…'] }
}
```

`validateLesson` kiểm: đủ trường, `answer` trong range, ≥3 câu hỏi đọc, 2 nghe,
3 drill, 6–8 chunk, mọi chunk có ví dụ, `contentVersion` số nguyên. Chạy trong
`npm test` — bài lệch schema là fail build.

---

## 5. Các đợt

| Đợt | Kết quả                                                                                                                 | Điều kiện xong                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Xóa app cũ; `src/` skeleton; shell + router + 3 tab; store/session/progress + unit tests; login/landing/auth UI mới trên glue cũ | `npm run verify` xanh trên cây mới; login thật vào `/app/` rỗng; tests auth cũ giữ |
| 2   | Schema + validator; **chặng 1 (5 bài)** viết đầy đủ; runner 5 pane chạy hết chặng 1                                    | 7 ca browser test §Design 10.5 pass trên chặng 1                             |
| 3   | Hôm nay · Lộ trình · Kết quả buổi · Ôn FSRS theo chunk                                                                  | Không số liệu mẫu; ôn đến hạn từ scheduler thật; summary đúng attempt        |
| 4   | Chặng 2–6 (25 bài)                                                                                                      | validator pass 30/30; mỗi chặng review nội dung trước merge                  |
| 5   | Cloud: `lesson_events` rules + push/pull + merge + emulator test; hydrate re-render                                     | wipe local → reload → đủ attempt; A→B→A tách; 2 phiên không mất record       |
| 6   | Polish 320/390/768/1440, keyboard, zoom 200%, dark; pilot 5 người học                                                   | ≥4/5 làm được việc cốt lõi không cần chỉ; 0 lỗi mất câu/feedback              |

Deploy prod chỉ sau đợt 5 xong + xác nhận. Trong lúc đó preview channel Firebase
Hosting (`firebase hosting:channel:deploy`) để thử trên điện thoại thật.

## 6. Phân công nội dung

Schema, syllabus map, và **bài 1.1 làm mẫu chuẩn** do lead viết. Các bài còn
lại viết theo mẫu + validator, mỗi chặng review nội dung (ngữ pháp, tự nhiên,
đúng can-do, dịch Việt) trước khi nhận. Không bài nào vào repo mà chưa qua
validator và review.
