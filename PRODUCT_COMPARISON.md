# FlashDay — Product Comparison & Research Notes

Source: ChatGPT consult (2026-09-26) — compared against Anki, Duolingo, LingQ,
Language Reactor, Migaku, ELSA Speak, Speak, Refold. Use as input for
LEARNING_DESIGN.md decisions; verify any load-bearing claim before quoting it
externally.

FlashDay đã có Memory Engine khá mạnh nhờ FSRS + contextual cards + dictation. Khoảng trống lớn nhất hiện nay không phải thêm SRS, mà là nối immersion → noticing → retrieval → production → gặp lại trong nội dung thật thành một loop duy nhất.

PHẦN 1 — Học gì từ 8 sản phẩm
Sản phẩm	(a) Cơ chế cốt lõi làm tốt nhất	(b) FlashDay nên “trộm” 1 thứ	(c) Không nên copy
Anki	Scheduling + active recall cực mạnh; FSRS điều chỉnh interval theo lịch sử nhớ của từng item. 
Anki Manual
+1
	Desired retention control: cho user chọn Light / Normal / Intensive, map sang retention target thay vì bắt chỉnh thông số FSRS.	UI/config kiểu power-user: deck option, template, scheduler knob quá nhiều.
Duolingo	Biến học thành daily habit cực ít friction; streak và bài cực ngắn có tác động đo được lên retention. 
Duolingo Blog
+1
	Minimum viable day: chỉ cần 1 retrieval/1 phút immersion là giữ “Learning Day”.	League/XP farming. User dễ tối ưu điểm thay vì năng lực ngôn ngữ. 
Duolingo Blog
+1

LingQ	Đọc/nghe nội dung thật → click từ lạ → lưu → gặp lại từ đó ở nhiều context. 
LingQ
+1
	Known-word highlighting ngay trong transcript: new / learning / known.	Biến FlashDay thành thư viện content khổng lồ. Một dev không nên cạnh tranh bằng catalogue.
Language Reactor	Biến Netflix/YouTube thành interface học: subtitle → lookup → save word + sentence context; có thể export thành cloze. 
Language Reactor
	1-click sentence capture: chọn từ trong transcript → tự lưu sentence + target + timestamp/audio position vào source_captures.	Dual-subtitle/UI đầy công cụ luôn bật; rất dễ biến việc xem thành tra từ liên tục.
Migaku	Sentence mining được nhúng thẳng vào media; theo dõi trạng thái từ và dùng nó để ước lượng độ khó content. 
Migaku
+1
	Comprehension score cho mỗi source dựa trên % token known/learning/new.	Auto-create quá nhiều flashcard. SRS queue sẽ trở thành nghĩa địa.
ELSA Speak	Feedback phát âm granular: sound/stress/intonation ngay sau khi nói. 
ELSA Speak
+1
	Error replay: user nói 1 câu → chỉ highlight 1–2 chỗ sai quan trọng → nghe mẫu → nói lại.	Đi xây pronunciation scoring engine riêng. Quá xa core và rất tốn R&D.
Speak	Learn → Practice → Apply bằng voice; chuyển rất nhanh từ biết phrase sang dùng phrase trong tình huống. 
Speak
	Sau một card đủ mature, thỉnh thoảng yêu cầu dùng nó để tạo 1 câu mới.	Open-ended AI chat vô hạn. Tốn tiền và khó đo learning outcome.
Refold	Input-first + sentence mining: học từ chính nội dung mình tiêu thụ, rồi quay lại nhận ra nó trong immersion. 
Refold Academy
+1
	Noticing mode: từ đang học xuất hiện trong transcript thì highlight nhẹ; tap để xem card/source cũ.	Trì hoãn output quá lâu theo methodology cứng nhắc. FlashDay nên dùng input-heavy nhưng vẫn cho production tăng dần. 
Refold Academy

Pattern đáng lấy nhất: không phải 8 feature riêng lẻ. Nó là:

Content → gặp từ → capture → retrieve → gặp lại trong context khác → produce.

Đó nên trở thành primitive của FlashDay.

PHẦN 2 — Learning science → implementation

Một lưu ý quan trọng: spacing/retrieval có evidence rất mạnh. “i+1 chính xác” của Krashen thì gây tranh luận; nên triển khai nó dưới dạng content comprehensibility/adaptive difficulty, không hard-code một “công thức i+1” giả khoa học. 
ScienceDirect
+1

Cơ chế	Evidence	FlashDay đang thiếu	Implementation cụ thể
1. Retrieval practice + feedback	Testing thường tạo retention dài hạn tốt hơn restudy. 
PubMed
+1
	Nhiều card vẫn có thể thành recognition hơn là recall thực sự.	Thêm retrieval_mode: recall | cloze | listening | production vào review_events. Luôn bắt user trả lời trước khi reveal.
2. Spacing + effortful retrieval	Distributed practice là một trong các hiệu ứng bền vững nhất; meta-analysis classroom gần đây cũng cho lợi thế mức vừa. 
PubMed
+1
	FSRS schedule card tốt, nhưng chưa schedule skill/mode của cùng knowledge.	Một card mature ở recognition → FSRS review tiếp theo chuyển sang cloze/listening/production thay vì chỉ lặp cùng prompt.
3. Context variation / desirable difficulty	Variation, testing và interleaving có thể cải thiện long-term learning, miễn difficulty không vượt khả năng người học. 
Bjork Lab
+1
	Card thường gắn với một context cố định → user có thể nhớ cả screenshot/câu thay vì lexical knowledge.	Cho một card link nhiều source_capture_ids; mỗi lần review chọn context khác chứa cùng word/chunk.
4. Comprehensible authentic input	Extensive reading cho hiệu quả dương trên vocabulary, comprehension và các domain khác; captioned video cũng hỗ trợ listening/vocab. 
Springer
+1
	Acquisition Engine chưa chọn content bằng knowledge state thực của user.	Với mỗi source_capture/source: tokenize → join cards/learning_progress → tính % known / learning / unknown → xếp Next for you.
5. Production + transfer-appropriate practice	Performance tốt hơn khi operations lúc học giống operations cần lúc sử dụng; repeated L2 production cũng có lợi cho accuracy/complexity. 
ScienceDirect
+1
	Biết nghĩa/điền được ≠ tự nói/viết được.	Khi card đạt stability threshold: prompt bằng context/ý tiếng Việt → user tự tạo câu tiếng Anh, lưu production_attempt + error tags vào review_events.

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
He was ___ to admit it.

Stage 3
[audio] → type sentence

Stage 4
"Bạn không muốn nhận lời ngay."
→ Say/write your own English sentence using "reluctant".

Các mode không cần trở thành scheduler riêng phức tạp ngay; FSRS vẫn schedule knowledge item, còn FlashDay chọn retrieval task phù hợp với maturity của item.

Roadmap tôi sẽ chốt

Không build thêm game, AI tutor hay pronunciation engine lúc này.

Văn bản thuần túy
V1  Context Rotation
        ↓
V2  Content Difficulty / Next for you
        ↓
V3  Production Ladder

Khi ba thứ đó nối vào nhau, FlashDay có learning loop rõ ràng hơn hẳn:

IMMERSION → NOTICE → CAPTURE → RETRIEVE → VARY CONTEXT → PRODUCE → IMMERSION

Đây mới là moat hợp lý cho FlashDay: SRS không phải đích đến; SRS là hệ thống điều phối những gì người học cần gặp, nhớ và sử dụng tiếp theo trong tiếng Anh thật.
