/* Original FlashDay A1 teaching content. CEFR mapping and limits: LEARNING_DESIGN.md.
 * A lesson catalog, not a proficiency classifier. Audio is browser TTS, never certified speech evidence.
 */
(function (root, factory) {
  if (
    typeof window === "undefined" &&
    typeof module === "object" &&
    module.exports
  )
    module.exports = factory();
  else root.FlashDayA1Curriculum = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const LESSONS = [
    {
      id: "a1-introductions",
      title: "Chào hỏi và giới thiệu",
      canDo: "Giới thiệu tên, nơi ở và hỏi tên người mới gặp.",
      glossary: [
        "hello = xin chào; name = tên; from = đến từ",
        "live = sống; city = thành phố; nice = vui/tốt",
      ],
      patterns: [
        "I am / I’m + tên hoặc thông tin: I’m Mai.",
        "My name is + tên. Hỏi tên: What is your name?",
        "I live in + nơi ở. I’m from + quê/quốc gia; hai thông tin có thể khác nhau.",
      ],
      units: [
        ["Hello.", "Xin chào."],
        ["My name is Mai.", "Tên tôi là Mai."],
        ["What's your name?", "Bạn tên gì?"],
        ["I live in Hanoi.", "Tôi sống ở Hà Nội."],
      ],
      lines: [
        ["Mai: Hello. My name is Mai.", "Mai: Xin chào. Tôi tên Mai."],
        ["Tom: Hi, Mai. I am Tom.", "Tom: Chào Mai. Tôi là Tom."],
        ["Mai: Where are you from?", "Mai: Bạn đến từ đâu?"],
        [
          "Tom: I am from Canada. I live in Hanoi.",
          "Tom: Tôi đến từ Canada. Tôi sống ở Hà Nội.",
        ],
        ["Mai: Nice to meet you.", "Mai: Rất vui được gặp bạn."],
        ["Tom: Nice to meet you too.", "Tom: Tôi cũng rất vui được gặp bạn."],
      ],
      scenarioQuiz: [
        {
          q: "Người nói chuyện với Mai tên gì?",
          options: ["Tom", "Canada", "Hanoi"],
          answer: 0,
          hint: "Tom nói I am Tom.",
        },
        {
          q: "Tom đến từ đâu?",
          options: ["Hà Nội", "Canada", "Việt Nam"],
          answer: 1,
          hint: "from Canada chỉ nơi xuất thân.",
        },
        {
          q: "Tom đang sống ở đâu?",
          options: ["Canada", "Đà Nẵng", "Hà Nội"],
          answer: 2,
          hint: "live in Hanoi chỉ nơi ở.",
        },
      ],
      practiceQuiz: [
        {
          q: "I ___ Mai.",
          options: ["is", "am", "are"],
          answer: 1,
          hint: "I đi với am.",
        },
        {
          q: "Hỏi tên người mới gặp.",
          options: ["What’s your name?", "Where is the cafe?", "How much?"],
          answer: 0,
          hint: "name nghĩa là tên.",
        },
        {
          q: "Nói mình sống ở Huế.",
          options: ["I live Hue.", "I live in Hue.", "I am live Hue."],
          answer: 1,
          hint: "Dùng live in + nơi.",
        },
      ],
      listening: {
        text: "Hello. My name is Ben. I am from Australia. I live in Hue.",
        questions: [
          {
            q: "Tên người nói?",
            options: ["Tom", "Ben", "Mai"],
            answer: 1,
            hint: "Nghe My name is Ben.",
          },
          {
            q: "Người đó sống ở đâu?",
            options: ["Huế", "Hà Nội", "Australia"],
            answer: 0,
            hint: "I live in Hue.",
          },
        ],
        translation:
          "Xin chào. Tôi tên Ben. Tôi đến từ Australia. Tôi sống ở Huế.",
      },
      writing:
        "Bạn gặp một bạn mới. Dùng tên và thành phố giả: giới thiệu mình trong 2 câu rồi hỏi tên người kia.",
      modelAnswer: ["Hi. My name is An. I live in Da Nang. What is your name?"],
      rubric: [
        "Có tên và nơi ở.",
        "Có câu hỏi tên người kia.",
        "Phân biệt nơi ở với quê; người đọc hiểu được.",
      ],
      speaking:
        "Vai A: chào, nói tên và hỏi tên. Vai B: dùng tên khác, trả lời và hỏi nơi ở. A trả lời. Đổi vai; nếu chưa nghe rõ, xin nhắc lại.",
      worked: [
        "Thông tin cần nói: tên An, sống ở Huế.",
        "My name is Mai. → thay Mai bằng An: My name is An. Thêm nơi ở: I live in Hue.",
        "Để người kia trả lời, thêm What is your name? Không chỉ nói tên mình rồi dừng.",
      ],
    },
    {
      id: "a1-contact",
      title: "Đánh vần, số và thông tin liên hệ",
      canDo: "Hỏi cách đánh vần tên và đọc lại số liên hệ đơn giản.",
      glossary: [
        "spell = đánh vần; phone = điện thoại; number = số",
        "zero/oh = 0; one–nine = 1–9; double two = hai số 2",
        "Chỉ dùng thông tin giả trong bài luyện.",
      ],
      patterns: [
        "How do you spell + tên/từ? — hỏi cách đánh vần.",
        "Đọc số điện thoại từng chữ số; không đọc thành số hàng trăm.",
        "Is that ...? dùng để kiểm tra lại thông tin nghe được.",
      ],
      units: [
        ["How do you spell that?", "Bạn đánh vần từ đó thế nào?"],
        ["What is your phone number?", "Số điện thoại của bạn là gì?"],
        ["Is that two?", "Đó là số hai phải không?"],
        ["Please say it again.", "Xin nói lại."],
      ],
      lines: [
        ["A: What is your name?", "A: Bạn tên gì?"],
        ["B: Kim.", "B: Kim."],
        ["A: How do you spell that?", "A: Bạn đánh vần thế nào?"],
        ["B: K, I, M.", "B: K, I, M."],
        ["A: What is your phone number?", "A: Số điện thoại của bạn là gì?"],
        [
          "B: Zero seven two, four one eight.",
          "B: Không bảy hai, bốn một tám.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Tên được đánh vần thế nào?",
          options: ["K-I-M", "K-E-M", "T-I-M"],
          answer: 0,
          hint: "B nói K, I, M.",
        },
        {
          q: "Ba số đầu?",
          options: ["027", "072", "702"],
          answer: 1,
          hint: "Zero seven two.",
        },
        {
          q: "Ba số cuối?",
          options: ["481", "814", "418"],
          answer: 2,
          hint: "Four one eight.",
        },
      ],
      practiceQuiz: [
        {
          q: "Xin người kia đánh vần.",
          options: ["How do you spell that?", "How old is it?", "How much?"],
          answer: 0,
          hint: "spell là đánh vần.",
        },
        {
          q: "zero là số nào?",
          options: ["1", "0", "2"],
          answer: 1,
          hint: "zero = 0.",
        },
        {
          q: "four one eight là gì?",
          options: ["481", "418", "814"],
          answer: 1,
          hint: "Giữ đúng thứ tự từng chữ số.",
        },
      ],
      listening: {
        text: "My name is Sam. S, A, M. My number is zero six five, two nine one.",
        questions: [
          {
            q: "Tên được nghe?",
            options: ["Kim", "Sam", "Tom"],
            answer: 1,
            hint: "S, A, M.",
          },
          {
            q: "Số liên hệ?",
            options: ["065291", "056291", "065219"],
            answer: 0,
            hint: "Zero six five, two nine one.",
          },
        ],
        translation:
          "Tôi tên Sam. S, A, M. Số của tôi là không sáu năm, hai chín một.",
      },
      writing:
        "Tạo một thẻ liên hệ giả: Name, City, Phone (6 chữ số). Viết một câu hỏi để xác nhận tên hoặc số.",
      modelAnswer: [
        "Name: Lan. City: Hue. Phone: 073246. Is that zero seven three, two four six?",
      ],
      rubric: [
        "Đủ ba trường, dùng dữ liệu giả.",
        "Số viết và số đọc lại khớp nhau.",
        "Câu hỏi xác nhận dễ hiểu.",
      ],
      speaking:
        "A đọc một tên và số giả 6 chữ số, không cho B xem. B xin đánh vần, ghi lại rồi đọc số xác nhận. A so với bản gốc; đổi vai.",
      worked: [
        "Tên giả Lan → tách từng chữ: L, A, N. Đừng đọc thành tên chữ của tiếng Việt khi luyện tiếng Anh.",
        "Số 073246 → zero seven three, two four six; giữ nguyên thứ tự, kể cả số 0 đầu.",
        "Nếu chưa rõ chữ số thứ ba: Is that three? Người kia xác nhận rồi mới ghi vào thẻ.",
      ],
    },
    {
      id: "a1-family",
      title: "Gia đình và người quen",
      canDo: "Giới thiệu một người, mối quan hệ và thông tin cơ bản.",
      glossary: [
        "mother = mẹ; father = bố; sister = chị/em gái; brother = anh/em trai",
        "teacher = giáo viên; student = học sinh/sinh viên; years old = tuổi",
      ],
      patterns: [
        "This is + tên/người để giới thiệu.",
        "He is / She is + tuổi hoặc a + nghề số ít.",
        "My chỉ của tôi; his của anh ấy, her của cô ấy.",
      ],
      units: [
        ["This is my sister.", "Đây là chị/em gái tôi."],
        ["She is a teacher.", "Cô ấy là giáo viên."],
        ["He is twenty years old.", "Anh ấy hai mươi tuổi."],
        ["I have two brothers.", "Tôi có hai anh/em trai."],
      ],
      lines: [
        ["This is my family.", "Đây là gia đình tôi."],
        ["My mother is a teacher.", "Mẹ tôi là giáo viên."],
        ["My father is a cook.", "Bố tôi là đầu bếp."],
        ["My sister is twenty years old.", "Chị tôi hai mươi tuổi."],
        [
          "Her name is Linh. She is a student.",
          "Chị tên Linh. Chị là sinh viên.",
        ],
        [
          "I have one sister. I do not have a brother.",
          "Tôi có một chị gái. Tôi không có anh/em trai.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Mẹ làm nghề gì?",
          options: ["Giáo viên", "Đầu bếp", "Sinh viên"],
          answer: 0,
          hint: "My mother is a teacher.",
        },
        {
          q: "Linh bao nhiêu tuổi?",
          options: ["12", "20", "22"],
          answer: 1,
          hint: "twenty = 20.",
        },
        {
          q: "Người kể có mấy chị/em gái?",
          options: ["Hai", "Không có", "Một"],
          answer: 2,
          hint: "I have one sister.",
        },
      ],
      practiceQuiz: [
        {
          q: "She ___ a teacher.",
          options: ["am", "is", "are"],
          answer: 1,
          hint: "She đi với is.",
        },
        {
          q: "Hai anh/em trai.",
          options: ["two brother", "two brothers", "a brothers"],
          answer: 1,
          hint: "Danh từ đếm được số nhiều thêm s trong ví dụ này.",
        },
        {
          q: "Giới thiệu em gái.",
          options: ["This is my sister.", "This my sister.", "She are sister."],
          answer: 0,
          hint: "Cần is sau This.",
        },
      ],
      listening: {
        text: "This is my brother. His name is Nam. He is eighteen years old. He is a student.",
        questions: [
          {
            q: "Nam là ai của người nói?",
            options: ["Anh/em trai", "Bố", "Bạn"],
            answer: 0,
            hint: "my brother.",
          },
          {
            q: "Nam bao nhiêu tuổi?",
            options: ["80", "18", "28"],
            answer: 1,
            hint: "eighteen = 18, không phải eighty.",
          },
        ],
        translation:
          "Đây là anh/em trai tôi. Anh ấy tên Nam. Anh ấy mười tám tuổi. Anh ấy là sinh viên.",
      },
      writing:
        "Giới thiệu một người tưởng tượng bằng 3 câu: tên, quan hệ với bạn, tuổi hoặc nghề.",
      modelAnswer: ["This is my friend. Her name is Hoa. She is a teacher."],
      rubric: [
        "Có người và quan hệ rõ.",
        "Có tuổi hoặc nghề.",
        "He/she và is giúp người đọc hiểu ai được nói tới.",
      ],
      speaking:
        "A giới thiệu một người giả. B hỏi tên và tuổi bằng What is their name? / How old are they? A trả lời ngắn; đổi vai.",
      worked: [
        "Thông tin: Hoa là bạn của tôi, làm giáo viên.",
        "Giới thiệu quan hệ: This is my friend. Nói tên: Her name is Hoa.",
        "Nói nghề: She is a teacher. Giữ a trước nghề số ít, không viết She teacher.",
      ],
    },
    {
      id: "a1-home",
      title: "Nhà ở và đồ vật",
      canDo: "Mô tả phòng và nói đồ vật ở đâu.",
      glossary: [
        "room = phòng; table = bàn; chair = ghế; bag = túi",
        "on = trên; under = dưới; next to = cạnh; in = trong",
      ],
      patterns: [
        "There is a + đồ vật số ít; There are + nhiều đồ vật.",
        "Where is + vật? — hỏi vị trí.",
        "a/an dùng với một vật: a bag, an apple.",
      ],
      units: [
        ["There is a table.", "Có một cái bàn."],
        ["There are two chairs.", "Có hai cái ghế."],
        ["The bag is under the table.", "Túi ở dưới bàn."],
        ["Where is the book?", "Quyển sách ở đâu?"],
      ],
      lines: [
        ["My room is small.", "Phòng tôi nhỏ."],
        ["There is a bed and a table.", "Có một cái giường và một cái bàn."],
        ["There are two chairs.", "Có hai cái ghế."],
        ["My bag is under the table.", "Túi tôi ở dưới bàn."],
        ["A book is on the table.", "Một quyển sách ở trên bàn."],
        ["The door is next to the bed.", "Cửa ở cạnh giường."],
      ],
      scenarioQuiz: [
        {
          q: "Có mấy ghế?",
          options: ["Một", "Hai", "Ba"],
          answer: 1,
          hint: "There are two chairs.",
        },
        {
          q: "Túi ở đâu?",
          options: ["Dưới bàn", "Trên giường", "Cạnh cửa"],
          answer: 0,
          hint: "under the table.",
        },
        {
          q: "Cái gì ở trên bàn?",
          options: ["Túi", "Giường", "Sách"],
          answer: 2,
          hint: "A book is on the table.",
        },
      ],
      practiceQuiz: [
        {
          q: "There ___ two chairs.",
          options: ["is", "are", "am"],
          answer: 1,
          hint: "Hai ghế là số nhiều.",
        },
        {
          q: "under nghĩa là gì?",
          options: ["Dưới", "Trên", "Cạnh"],
          answer: 0,
          hint: "under = dưới.",
        },
        {
          q: "Một quả táo.",
          options: ["a apple", "an apple", "two apple"],
          answer: 1,
          hint: "Dùng an trước âm nguyên âm trong apple.",
        },
      ],
      listening: {
        text: "There is a red bag on the chair. The book is under the chair. There are three cups on the table.",
        questions: [
          {
            q: "Túi ở đâu?",
            options: ["Trên bàn", "Trên ghế", "Dưới ghế"],
            answer: 1,
            hint: "bag on the chair.",
          },
          {
            q: "Có mấy cốc?",
            options: ["Hai", "Bốn", "Ba"],
            answer: 2,
            hint: "three cups.",
          },
        ],
        translation:
          "Có một túi đỏ trên ghế. Sách ở dưới ghế. Có ba cốc trên bàn.",
      },
      writing:
        "Mô tả phòng tưởng tượng trong 3 câu: có những gì và vị trí của một đồ vật.",
      modelAnswer: [
        "There is a bed. There are two chairs. My bag is on a chair.",
      ],
      rubric: [
        "Phân biệt một vật với nhiều vật.",
        "Có ít nhất một vị trí cụ thể.",
        "Người đọc có thể vẽ sơ đồ đơn giản từ lời mô tả.",
      ],
      speaking:
        "A đặt ba vật hoặc vẽ sơ đồ nhưng che khỏi B. B hỏi Where is ...? và vẽ lại. So hai sơ đồ rồi đổi vai.",
      worked: [
        "Có một ghế: There is a chair. Có ba ghế: There are three chairs.",
        "Túi ở dưới bàn → The bag is under the table. Nếu chuyển lên bàn, đổi under thành on.",
        "Người nghe hỏi Where is the bag? → trả lời vị trí túi, không chỉ kể trong phòng có bàn.",
      ],
    },
    {
      id: "a1-routine",
      title: "Một ngày và sở thích",
      canDo: "Nói giờ sinh hoạt, điều thích và hỏi thói quen đơn giản.",
      glossary: [
        "get up = thức dậy; work = làm việc; breakfast = bữa sáng",
        "every day = mỗi ngày; like = thích; read = đọc; swim = bơi",
      ],
      patterns: [
        "I work / I like + hoạt động hoặc vật. I don’t work ... là phủ định.",
        "Do you like ...? → Yes, I do. / No, I don’t.",
        "Giờ: at seven; ngày: on Monday. Can + động từ: I can swim.",
      ],
      units: [
        ["I get up at seven.", "Tôi thức dậy lúc bảy giờ."],
        ["I like music.", "Tôi thích âm nhạc."],
        ["Do you like coffee?", "Bạn thích cà phê không?"],
        ["I can swim.", "Tôi biết bơi."],
      ],
      lines: [
        ["I get up at six.", "Tôi thức dậy lúc sáu giờ."],
        ["I have breakfast at seven.", "Tôi ăn sáng lúc bảy giờ."],
        ["I work in a shop.", "Tôi làm ở cửa hàng."],
        ["I go home at five.", "Tôi về nhà lúc năm giờ."],
        [
          "I like music. I do not like football.",
          "Tôi thích âm nhạc. Tôi không thích bóng đá.",
        ],
        ["On Sunday, I read at home.", "Chủ nhật tôi đọc ở nhà."],
      ],
      scenarioQuiz: [
        {
          q: "Thức dậy lúc nào?",
          options: ["6 giờ", "7 giờ", "5 giờ"],
          answer: 0,
          hint: "get up at six.",
        },
        {
          q: "Làm ở đâu?",
          options: ["Trường học", "Cửa hàng", "Ở nhà"],
          answer: 1,
          hint: "work in a shop.",
        },
        {
          q: "Không thích gì?",
          options: ["Âm nhạc", "Đọc", "Bóng đá"],
          answer: 2,
          hint: "do not like football.",
        },
      ],
      practiceQuiz: [
        {
          q: "Hỏi bạn có thích cà phê không.",
          options: [
            "Do you like coffee?",
            "Are you like coffee?",
            "You like coffee what?",
          ],
          answer: 0,
          hint: "Do you + động từ.",
        },
        {
          q: "Tôi không thích trà.",
          options: [
            "I not like tea.",
            "I don’t like tea.",
            "I am not like tea.",
          ],
          answer: 1,
          hint: "Phủ định với don’t + like.",
        },
        {
          q: "I can ___ .",
          options: ["swim", "swims", "swimming"],
          answer: 0,
          hint: "Sau can dùng động từ nguyên mẫu.",
        },
      ],
      listening: {
        text: "I get up at eight on Sunday. I have breakfast at nine. I like tea. I can cook.",
        questions: [
          {
            q: "Ăn sáng lúc nào?",
            options: ["8 giờ", "9 giờ", "7 giờ"],
            answer: 1,
            hint: "breakfast at nine.",
          },
          {
            q: "Người nói biết làm gì?",
            options: ["Bơi", "Lái xe", "Nấu ăn"],
            answer: 2,
            hint: "I can cook.",
          },
        ],
        translation:
          "Chủ nhật tôi thức dậy lúc tám giờ. Tôi ăn sáng lúc chín giờ. Tôi thích trà. Tôi biết nấu ăn.",
      },
      writing:
        "Viết lịch một ngày giả trong 3–4 câu: hai hoạt động có giờ, một điều thích và một việc biết làm.",
      modelAnswer: [
        "I get up at seven. I work at nine. I like tea. I can cook.",
      ],
      rubric: [
        "Có hai hoạt động với giờ.",
        "Có sở thích và khả năng.",
        "Không nhầm giờ thức dậy với giờ bắt đầu làm.",
      ],
      speaking:
        "A hỏi B giờ thức dậy và đồ uống thích. B trả lời rồi hỏi A một việc A biết làm. Đổi vai và so điểm giống/khác.",
      worked: [
        "Đổi giờ thức dậy từ 7 sang 8: I get up at seven. → I get up at eight.",
        "Thêm sở thích: I like tea. Không thích cà phê: I don’t like coffee.",
        "Khi hỏi lại người kia, dùng Do you like tea? Người kia đáp Yes, I do. hoặc No, I don’t.",
      ],
    },
    {
      id: "a1-food",
      title: "Gọi đồ ăn và đồ uống",
      canDo: "Gọi món, hỏi giá và phản hồi yêu cầu đơn giản.",
      glossary: [
        "water = nước; tea = trà; coffee = cà phê; rice = cơm",
        "small = nhỏ; large = lớn; please = làm ơn; bill = hóa đơn",
      ],
      patterns: [
        "Can I have + món + please? dùng để yêu cầu lịch sự.",
        "How much is it? hỏi giá.",
        "I’d like = I would like, dùng như cụm gọi món.",
      ],
      units: [
        ["Can I have some water, please?", "Cho tôi xin ít nước."],
        ["I would like a tea.", "Tôi muốn một ly trà."],
        ["How much is it?", "Giá bao nhiêu?"],
        ["The bill, please.", "Cho tôi xin hóa đơn."],
      ],
      lines: [
        ["A: Can I have a tea, please?", "A: Cho tôi một ly trà."],
        ["B: Small or large?", "B: Ly nhỏ hay lớn?"],
        [
          "A: Small, please. And a sandwich.",
          "A: Ly nhỏ. Và một chiếc bánh mì kẹp.",
        ],
        ["B: That is five dollars.", "B: Tổng là năm đô la."],
        ["A: Here you are.", "A: Của bạn đây."],
        ["B: Thank you.", "B: Cảm ơn."],
      ],
      scenarioQuiz: [
        {
          q: "Đồ uống được gọi?",
          options: ["Cà phê", "Trà", "Nước"],
          answer: 1,
          hint: "a tea.",
        },
        {
          q: "Cỡ nào?",
          options: ["Nhỏ", "Lớn", "Không nói"],
          answer: 0,
          hint: "Small, please.",
        },
        {
          q: "Tổng giá?",
          options: ["3 đô", "4 đô", "5 đô"],
          answer: 2,
          hint: "five dollars.",
        },
      ],
      practiceQuiz: [
        {
          q: "Yêu cầu nước lịch sự.",
          options: [
            "Water now!",
            "Can I have some water, please?",
            "Water is I.",
          ],
          answer: 1,
          hint: "Can I have ... please? là mẫu yêu cầu.",
        },
        {
          q: "Hỏi giá.",
          options: ["How much is it?", "What time is it?", "Where is it?"],
          answer: 0,
          hint: "How much hỏi số tiền.",
        },
        {
          q: "large nghĩa là gì?",
          options: ["Nhỏ", "Lạnh", "Lớn"],
          answer: 2,
          hint: "large = lớn.",
        },
      ],
      listening: {
        text: "I would like a large coffee and a cake, please. The coffee is four dollars. The cake is two dollars.",
        questions: [
          {
            q: "Gọi cỡ nào?",
            options: ["Nhỏ", "Lớn", "Vừa"],
            answer: 1,
            hint: "large coffee.",
          },
          {
            q: "Bánh giá bao nhiêu?",
            options: ["2 đô", "4 đô", "6 đô"],
            answer: 0,
            hint: "cake is two dollars.",
          },
        ],
        translation:
          "Tôi muốn một ly cà phê lớn và một chiếc bánh. Cà phê giá bốn đô la. Bánh giá hai đô la.",
      },
      writing:
        "Bạn ở quán khác. Viết yêu cầu một đồ uống và một món ăn, rồi hỏi tổng giá. Không cần tính tiền.",
      modelAnswer: [
        "Can I have a small coffee and a cake, please? How much is it?",
      ],
      rubric: [
        "Có món ăn và đồ uống.",
        "Có cách yêu cầu lịch sự.",
        "Có câu hỏi giá, không chỉ danh sách món.",
      ],
      speaking:
        "A là khách, B là nhân viên có menu tự viết 3 món và giá. A gọi món, B hỏi cỡ và báo giá, A xác nhận. Đổi vai.",
      worked: [
        "Muốn trà nhỏ: Can I have a small tea, please? Món và cỡ phải cùng xuất hiện.",
        "Đổi sang cà phê lớn: thay small tea bằng large coffee, giữ mẫu yêu cầu.",
        "Sau khi gọi món, hỏi How much is it? để biết giá; không dùng What time? vì đó là hỏi giờ.",
      ],
    },
    {
      id: "a1-shopping",
      title: "Mua đồ, màu và số lượng",
      canDo: "Hỏi giá, chọn màu/cỡ và số lượng.",
      glossary: [
        "shirt = áo; blue = xanh dương; red = đỏ; size = cỡ",
        "one = 1; two = 2; ten = 10; twenty = 20; thirty = 30",
      ],
      patterns: [
        "This + vật gần số ít; these + nhiều vật gần.",
        "How much is this ...? / How much are these ...?",
        "I’d like two ... dùng với danh từ số nhiều như shirts.",
      ],
      units: [
        ["How much is this shirt?", "Chiếc áo này bao nhiêu tiền?"],
        ["Do you have a small size?", "Bạn có cỡ nhỏ không?"],
        ["I like the blue one.", "Tôi thích cái màu xanh dương."],
        ["I would like two shirts.", "Tôi muốn hai chiếc áo."],
      ],
      lines: [
        ["A: How much is this shirt?", "A: Chiếc áo này bao nhiêu?"],
        ["B: It is ten dollars.", "B: Mười đô la."],
        ["A: Do you have a small size?", "A: Có cỡ nhỏ không?"],
        ["B: Yes. Red or blue?", "B: Có. Đỏ hay xanh dương?"],
        ["A: Blue, please. One shirt.", "A: Xanh dương. Một chiếc áo."],
        ["B: Here you are.", "B: Của bạn đây."],
      ],
      scenarioQuiz: [
        {
          q: "Áo giá bao nhiêu?",
          options: ["10 đô", "20 đô", "30 đô"],
          answer: 0,
          hint: "ten dollars.",
        },
        {
          q: "Màu được chọn?",
          options: ["Đỏ", "Xanh dương", "Trắng"],
          answer: 1,
          hint: "Blue, please.",
        },
        {
          q: "Mua mấy áo?",
          options: ["Hai", "Ba", "Một"],
          answer: 2,
          hint: "One shirt.",
        },
      ],
      practiceQuiz: [
        {
          q: "Hai chiếc áo.",
          options: ["two shirts", "two shirt", "a shirts"],
          answer: 0,
          hint: "Thêm s cho shirts.",
        },
        {
          q: "Hỏi giá một áo.",
          options: [
            "How much are this shirt?",
            "How much is this shirt?",
            "How many is shirt?",
          ],
          answer: 1,
          hint: "Một shirt dùng is.",
        },
        {
          q: "these dùng cho gì?",
          options: ["Một vật xa", "Một vật gần", "Nhiều vật gần"],
          answer: 2,
          hint: "these là số nhiều của this.",
        },
      ],
      listening: {
        text: "These socks are three dollars. The red shirt is twelve dollars. I would like two pairs of socks.",
        questions: [
          {
            q: "Áo đỏ giá bao nhiêu?",
            options: ["3 đô", "12 đô", "20 đô"],
            answer: 1,
            hint: "red shirt is twelve dollars.",
          },
          {
            q: "Khách muốn mấy đôi tất?",
            options: ["Một", "Hai", "Ba"],
            answer: 1,
            hint: "two pairs of socks.",
          },
        ],
        translation:
          "Đôi tất này giá ba đô la. Áo đỏ giá mười hai đô la. Tôi muốn hai đôi tất.",
      },
      writing:
        "Hỏi giá một chiếc áo màu khác bài đọc, hỏi cỡ, rồi nói số lượng bạn muốn mua.",
      modelAnswer: [
        "How much is the red shirt? Do you have a large size? I would like one shirt.",
      ],
      rubric: [
        "Có màu, cỡ và số lượng.",
        "Câu hỏi giá dễ hiểu.",
        "is/are và danh từ giúp phân biệt một/nhiều.",
      ],
      speaking:
        "A bán hai đồ vật với giá khác nhau. B hỏi giá, màu/cỡ và chọn số lượng. A nhắc lại đơn hàng để B xác nhận.",
      worked: [
        "Muốn áo xanh: I like the blue one. Người bán cần biết bạn đang chỉ áo nào.",
        "Muốn hai áo: I would like two shirts. Thêm s vì có hai chiếc.",
        "Hỏi giá một áo bằng How much is this shirt? Hỏi nhiều áo bằng How much are these shirts?",
      ],
    },
    {
      id: "a1-directions",
      title: "Hỏi đường và đọc chỉ dẫn",
      canDo: "Hỏi vị trí và làm theo chỉ dẫn ngắn.",
      glossary: [
        "left = trái; right = phải; straight = thẳng",
        "bank = ngân hàng; station = nhà ga; opposite = đối diện",
      ],
      patterns: [
        "Where is + địa điểm? dùng để hỏi vị trí.",
        "Chỉ dẫn ngắn bắt đầu bằng động từ: Go straight. Turn left.",
        "next to = cạnh, opposite = đối diện; phải gắn với mốc cụ thể.",
      ],
      units: [
        ["Where is the station?", "Nhà ga ở đâu?"],
        ["Go straight.", "Đi thẳng."],
        ["Turn left at the bank.", "Rẽ trái ở ngân hàng."],
        ["It is next to the cafe.", "Nó ở cạnh quán cà phê."],
      ],
      lines: [
        ["A: Excuse me. Where is the library?", "A: Xin lỗi. Thư viện ở đâu?"],
        [
          "B: Go straight. Turn right at the bank.",
          "B: Đi thẳng. Rẽ phải ở ngân hàng.",
        ],
        ["A: Right at the bank?", "A: Rẽ phải ở ngân hàng phải không?"],
        [
          "B: Yes. The library is next to the school.",
          "B: Đúng. Thư viện cạnh trường.",
        ],
        ["A: Thank you.", "A: Cảm ơn."],
        ["B: You are welcome.", "B: Không có gì."],
      ],
      scenarioQuiz: [
        {
          q: "Người hỏi muốn tới đâu?",
          options: ["Thư viện", "Ngân hàng", "Trường"],
          answer: 0,
          hint: "Where is the library?",
        },
        {
          q: "Rẽ hướng nào?",
          options: ["Trái", "Phải", "Quay lại"],
          answer: 1,
          hint: "Turn right.",
        },
        {
          q: "Thư viện cạnh đâu?",
          options: ["Quán cà phê", "Ga", "Trường"],
          answer: 2,
          hint: "next to the school.",
        },
      ],
      practiceQuiz: [
        {
          q: "Turn left nghĩa là gì?",
          options: ["Rẽ phải", "Rẽ trái", "Đi thẳng"],
          answer: 1,
          hint: "left = trái.",
        },
        {
          q: "Hỏi vị trí ga.",
          options: [
            "Where is the station?",
            "What is station time?",
            "Who is the station?",
          ],
          answer: 0,
          hint: "Where hỏi nơi chốn.",
        },
        {
          q: "Cạnh quán cà phê.",
          options: ["under the cafe", "next to the cafe", "in front cafe"],
          answer: 1,
          hint: "next to + địa điểm.",
        },
      ],
      listening: {
        text: "To get to the cafe, go straight and turn left at the school. The cafe is opposite the bank.",
        questions: [
          {
            q: "Rẽ ở mốc nào?",
            options: ["Trường", "Ga", "Ngân hàng"],
            answer: 0,
            hint: "at the school.",
          },
          {
            q: "Quán đối diện đâu?",
            options: ["Trường", "Ngân hàng", "Ga"],
            answer: 1,
            hint: "opposite the bank.",
          },
        ],
        translation:
          "Để tới quán cà phê, đi thẳng rồi rẽ trái ở trường. Quán đối diện ngân hàng.",
      },
      writing:
        "Viết hai chỉ dẫn giúp bạn tới công viên: đi thẳng, rẽ trái ở trường. Thêm câu công viên cạnh quán cà phê.",
      modelAnswer: [
        "Go straight. Turn left at the school. The park is next to the cafe.",
      ],
      rubric: [
        "Đúng hướng trái và đúng mốc trường.",
        "Nói được vị trí công viên.",
        "Người đọc có thể đi theo thứ tự.",
      ],
      speaking:
        "Vẽ bản đồ ba địa điểm. A hỏi đường; B đưa tối đa ba chỉ dẫn ngắn. A chỉ lại đường trên bản đồ và xin nhắc lại khi cần.",
      worked: [
        "Đích là quán cà phê, mốc rẽ là ngân hàng. Bắt đầu: Go straight.",
        "Nếu rẽ trái ở ngân hàng: Turn left at the bank. Không nói right vì đổi hướng sẽ dẫn sai đường.",
        "Người nghe kiểm tra: Left at the bank? → Yes. The cafe is next to the bank.",
      ],
    },
    {
      id: "a1-travel",
      title: "Vé, giờ và thông báo",
      canDo: "Tìm giờ đi, nơi lên xe và mua vé đơn giản.",
      glossary: [
        "bus = xe buýt; ticket = vé; platform = sân ga; stop = điểm dừng",
        "leave = khởi hành; today = hôm nay; tomorrow = ngày mai",
        "fifteen = 15; fifty = 50 — nghe phần cuối khác nhau.",
      ],
      patterns: [
        "A ticket to + nơi đến, please.",
        "What time does ... leave? học như một câu hỏi giờ khởi hành.",
        "Đọc giờ từng phần: nine thirty = 9:30. Không nhầm giờ với số sân ga.",
      ],
      units: [
        ["A ticket to Hue, please.", "Cho tôi một vé đến Huế."],
        ["What time does the bus leave?", "Xe buýt khởi hành lúc mấy giờ?"],
        ["Which platform?", "Sân ga nào?"],
        ["Is it today?", "Có phải hôm nay không?"],
      ],
      lines: [
        ["A: A ticket to Hue, please.", "A: Cho tôi một vé đến Huế."],
        ["B: Today?", "B: Hôm nay phải không?"],
        ["A: Yes. What time does the bus leave?", "A: Đúng. Xe đi mấy giờ?"],
        [
          "B: At nine thirty. Stop three.",
          "B: Lúc chín giờ rưỡi. Điểm dừng số ba.",
        ],
        ["A: How much is it?", "A: Bao nhiêu tiền?"],
        ["B: Fifteen dollars.", "B: Mười lăm đô la."],
      ],
      scenarioQuiz: [
        {
          q: "Nơi đến?",
          options: ["Huế", "Hà Nội", "Đà Nẵng"],
          answer: 0,
          hint: "ticket to Hue.",
        },
        {
          q: "Giờ đi?",
          options: ["9:00", "9:30", "3:00"],
          answer: 1,
          hint: "nine thirty.",
        },
        {
          q: "Giá vé?",
          options: ["50 đô", "30 đô", "15 đô"],
          answer: 2,
          hint: "fifteen, không phải fifty.",
        },
      ],
      practiceQuiz: [
        {
          q: "nine thirty là mấy giờ?",
          options: ["9:30", "9:13", "3:09"],
          answer: 0,
          hint: "thirty là ba mươi phút.",
        },
        {
          q: "A ticket ___ Hue.",
          options: ["at", "to", "on"],
          answer: 1,
          hint: "to chỉ nơi đến.",
        },
        {
          q: "fifteen là bao nhiêu?",
          options: ["50", "5", "15"],
          answer: 2,
          hint: "fifteen = 15.",
        },
      ],
      listening: {
        text: "The train to Hanoi leaves at ten fifteen. Please go to platform two. The ticket is twenty dollars.",
        questions: [
          {
            q: "Giờ khởi hành?",
            options: ["10:50", "10:15", "2:15"],
            answer: 1,
            hint: "ten fifteen.",
          },
          {
            q: "Sân ga?",
            options: ["2", "10", "20"],
            answer: 0,
            hint: "platform two.",
          },
        ],
        translation:
          "Tàu đi Hà Nội khởi hành lúc mười giờ mười lăm. Đến sân ga số hai. Vé giá hai mươi đô la.",
      },
      writing:
        "Bạn nhận tin: Bus to Da Nang. 8:30. Stop 4. Viết tin nhắn cho bạn bằng tiếng Anh để truyền lại nơi đến, giờ và điểm lên xe.",
      modelAnswer: [
        "The bus to Da Nang leaves at eight thirty. Go to stop four.",
      ],
      rubric: [
        "Đủ nơi đến, 8:30 và điểm 4.",
        "Không đảo giờ với số điểm dừng.",
        "Tin nhắn ngắn, người nhận hiểu phải làm gì.",
      ],
      speaking:
        "A là người bán vé, B hỏi một vé, ngày đi và giờ. A báo giờ và điểm lên xe. B đọc lại hai thông tin để xác nhận.",
      worked: [
        "Thẻ: Bus to Hue — 8:15 — Stop 4. Tách nơi đến, giờ, điểm lên xe.",
        "Đọc 8:15 là eight fifteen. Số 4 là stop four, không phải giờ khởi hành.",
        "Nhắn: The bus to Hue leaves at eight fifteen. Go to stop four. So lại từng số với thẻ.",
      ],
    },
    {
      id: "a1-needs",
      title: "Nhu cầu cơ bản và xin giúp đỡ",
      canDo: "Nói một nhu cầu trước mắt và hiểu chỉ dẫn ngắn.",
      glossary: [
        "help = giúp; water = nước; tired = mệt; cold = lạnh",
        "hot = nóng; hungry = đói; door = cửa; sit = ngồi",
      ],
      patterns: [
        "I am + trạng thái: I am tired. Không dùng I have tired.",
        "I need + vật hoặc to + động từ: I need water.",
        "Can you help me, please? là mẫu xin giúp; Please sit down. là chỉ dẫn.",
      ],
      units: [
        ["Can you help me, please?", "Bạn giúp tôi được không?"],
        ["I need some water.", "Tôi cần ít nước."],
        ["I am cold.", "Tôi thấy lạnh."],
        ["Please sit down.", "Mời ngồi xuống."],
      ],
      lines: [
        ["A: Are you OK?", "A: Bạn ổn không?"],
        ["B: I am tired. I need some water.", "B: Tôi mệt. Tôi cần ít nước."],
        ["A: Please sit down.", "A: Mời ngồi."],
        ["B: Thank you. Where is the water?", "B: Cảm ơn. Nước ở đâu?"],
        ["A: On the table, next to the door.", "A: Trên bàn, cạnh cửa."],
        ["B: Thank you for your help.", "B: Cảm ơn bạn đã giúp."],
      ],
      scenarioQuiz: [
        {
          q: "B thấy thế nào?",
          options: ["Mệt", "Đói", "Lạnh"],
          answer: 0,
          hint: "I am tired.",
        },
        {
          q: "B cần gì?",
          options: ["Đồ ăn", "Nước", "Áo"],
          answer: 1,
          hint: "I need some water.",
        },
        {
          q: "Nước ở đâu?",
          options: ["Dưới ghế", "Ngoài cửa", "Trên bàn"],
          answer: 2,
          hint: "On the table.",
        },
      ],
      practiceQuiz: [
        {
          q: "Nói mình lạnh.",
          options: ["I cold.", "I am cold.", "I have cold."],
          answer: 1,
          hint: "am + trạng thái.",
        },
        {
          q: "Xin giúp lịch sự.",
          options: ["Can you help me, please?", "You help now.", "I help you?"],
          answer: 0,
          hint: "Can you ... please?",
        },
        {
          q: "Please sit down nghĩa là gì?",
          options: ["Đứng lên", "Mở cửa", "Ngồi xuống"],
          answer: 2,
          hint: "sit down = ngồi xuống.",
        },
      ],
      listening: {
        text: "It is hot today. I need some water. Please open the window. The water is on the small table.",
        questions: [
          {
            q: "Thời tiết thế nào?",
            options: ["Lạnh", "Nóng", "Mưa"],
            answer: 1,
            hint: "It is hot.",
          },
          {
            q: "Được nhờ mở gì?",
            options: ["Cửa sổ", "Cửa ra vào", "Túi"],
            answer: 0,
            hint: "open the window.",
          },
        ],
        translation:
          "Hôm nay trời nóng. Tôi cần ít nước. Xin mở cửa sổ. Nước ở trên bàn nhỏ.",
      },
      writing:
        "Bạn ở một lớp mới và thấy lạnh. Viết lời nói trạng thái, xin giúp và hỏi có thể đóng cửa sổ không. Đây là bài ngôn ngữ, không phải tư vấn sức khỏe.",
      modelAnswer: [
        "I am cold. Can you help me, please? Can we close the window?",
      ],
      rubric: [
        "Trạng thái rõ ràng.",
        "Yêu cầu cụ thể, lịch sự.",
        "Không cần giải thích bệnh hay dùng từ y khoa.",
      ],
      speaking:
        "A nói một nhu cầu đơn giản như nước hoặc chỗ ngồi. B chỉ nơi đồ vật và đưa một chỉ dẫn. A xác nhận đã hiểu; đổi vai.",
      worked: [
        "Cần nước → I need some water. Dùng need cho nhu cầu cụ thể.",
        "Cần người giúp → Can you help me, please? Nói yêu cầu tiếp theo để người nghe biết giúp việc gì.",
        "Nghe Please sit down. → hiểu là ngồi xuống. Nếu chưa hiểu, dùng Could you say that again?",
      ],
    },
    {
      id: "a1-forms",
      title: "Biểu mẫu, ngày và tin nhắn",
      canDo: "Điền thông tin cá nhân giả và truyền lại thông báo ngắn.",
      glossary: [
        "first name = tên; family name = họ; date = ngày; address = địa chỉ",
        "Monday = thứ Hai; Tuesday = thứ Ba; March = tháng Ba",
        "closed = đóng cửa; open = mở cửa; class = lớp học",
      ],
      patterns: [
        "Điền form có thể dùng từ/cụm ngắn, không cần câu dài.",
        "Viết ngày bằng chữ tháng để tránh nhầm: 12 March.",
        "Tin nhắn cần ai/việc gì + khi nào + ở đâu nếu nguồn có.",
      ],
      units: [
        ["My first name is Lan.", "Tên tôi là Lan."],
        ["My family name is Tran.", "Họ tôi là Trần."],
        ["The class is on Monday.", "Lớp học vào thứ Hai."],
        ["The shop is closed.", "Cửa hàng đóng cửa."],
      ],
      lines: [
        ["Name: An Le.", "Tên: An Lê."],
        ["Address: 12 Green Street.", "Địa chỉ: 12 phố Green."],
        [
          "English class: Monday, 12 March.",
          "Lớp tiếng Anh: thứ Hai, 12 tháng Ba.",
        ],
        ["Time: 10:00. Room: 2.", "Giờ: 10:00. Phòng: 2."],
        ["Please bring a pen.", "Vui lòng mang bút."],
        ["The office is closed on Sunday.", "Văn phòng đóng cửa Chủ nhật."],
      ],
      scenarioQuiz: [
        {
          q: "Lớp học ngày nào trong tuần?",
          options: ["Thứ Hai", "Chủ nhật", "Thứ Ba"],
          answer: 0,
          hint: "Monday.",
        },
        {
          q: "Phòng nào?",
          options: ["12", "2", "10"],
          answer: 1,
          hint: "Room: 2.",
        },
        {
          q: "Cần mang gì?",
          options: ["Vé", "Đồ ăn", "Bút"],
          answer: 2,
          hint: "bring a pen.",
        },
      ],
      practiceQuiz: [
        {
          q: "family name là gì?",
          options: ["Tên", "Họ", "Địa chỉ"],
          answer: 1,
          hint: "family name = họ.",
        },
        {
          q: "The class is ___ Monday.",
          options: ["on", "at", "in"],
          answer: 0,
          hint: "on + ngày trong tuần.",
        },
        {
          q: "Closed nghĩa là gì?",
          options: ["Mở", "Đóng", "Miễn phí"],
          answer: 1,
          hint: "closed = đóng cửa.",
        },
      ],
      listening: {
        text: "Your English class is on Tuesday at eleven. Please go to room five. Bring a book and a pen.",
        questions: [
          {
            q: "Ngày học?",
            options: ["Thứ Hai", "Thứ Ba", "Chủ nhật"],
            answer: 1,
            hint: "Tuesday.",
          },
          {
            q: "Phòng học?",
            options: ["11", "2", "5"],
            answer: 2,
            hint: "room five.",
          },
        ],
        translation:
          "Lớp tiếng Anh của bạn vào thứ Ba lúc mười một giờ. Đến phòng năm. Mang theo sách và bút.",
      },
      writing:
        "Điền Name, City, Date bằng thông tin giả. Sau đó nhắn cho bạn từ thông báo: Music class — Friday, 9:00, Room 3. Bring a pen.",
      modelAnswer: [
        "Name: Kim Le. City: Hue. Date: 14 May. The music class is on Friday at nine in room three. Bring a pen.",
      ],
      rubric: [
        "Đủ ba trường form; không nhập thông tin nhạy cảm thật.",
        "Tin nhắn giữ đúng thứ Sáu, 9 giờ, phòng 3.",
        "Có lời nhắc mang bút, không thêm thông tin nguồn không có.",
      ],
      speaking:
        "A giữ thẻ thông báo gồm ngày, giờ, phòng. B không nhìn thẻ, hỏi từng thông tin và ghi lại. A so kết quả; đổi vai.",
      worked: [
        "Tên giả Lan Tran: First name: Lan. Family name: Tran. Không đảo hai trường.",
        "Thông báo: English class — Monday — 10:00 — Room 2. Gạch ra ba thông tin cần chuyển.",
        "Nhắn: The English class is on Monday at ten in room two. Kiểm lại ngày, giờ và phòng trước khi gửi.",
      ],
    },
    {
      id: "a1-review",
      title: "Tổng ôn: một ngày ở trung tâm",
      canDo:
        "Kết hợp đọc, nghe, viết và hỏi đáp trong tình huống chưa luyện nguyên văn.",
      glossary: [
        "reception = quầy tiếp tân; course = khóa học; lunch = bữa trưa",
        "Ôn tên, số, ngày, giờ, giá, hướng và cách xin nhắc lại.",
      ],
      patterns: [
        "Đọc yêu cầu trước, tìm thông tin cần dùng; không cần dịch từng từ.",
        "Nghe và ghi ý cần thiết; xin phát lại khi cần.",
        "Tự làm trước khi xem mẫu. Điểm bài tập không thay thế đánh giá A1 độc lập.",
      ],
      units: [
        ["Where is room four?", "Phòng bốn ở đâu?"],
        ["Can you say the time again?", "Bạn nói lại giờ được không?"],
        ["I would like a ticket, please.", "Tôi muốn một vé."],
        ["See you on Friday.", "Hẹn gặp thứ Sáu."],
      ],
      lines: [
        ["Welcome to Green Centre.", "Chào mừng đến trung tâm Green."],
        [
          "The art class is on Friday at ten.",
          "Lớp mỹ thuật vào thứ Sáu lúc mười giờ.",
        ],
        [
          "Go to room four, next to the cafe.",
          "Đến phòng bốn, cạnh quán cà phê.",
        ],
        ["A class ticket is six dollars.", "Vé lớp học giá sáu đô la."],
        ["Bring a pencil.", "Mang theo bút chì."],
        ["The cafe closes at two.", "Quán cà phê đóng lúc hai giờ."],
      ],
      scenarioQuiz: [
        {
          q: "Lớp mỹ thuật bắt đầu lúc nào?",
          options: ["10 giờ thứ Sáu", "2 giờ thứ Sáu", "6 giờ thứ Hai"],
          answer: 0,
          hint: "Friday at ten.",
        },
        {
          q: "Phòng học ở đâu?",
          options: ["Đối diện ga", "Cạnh quán cà phê", "Cạnh ngân hàng"],
          answer: 1,
          hint: "room four, next to the cafe.",
        },
        {
          q: "Cần mang gì?",
          options: ["Bút mực", "Vé xe", "Bút chì"],
          answer: 2,
          hint: "Bring a pencil.",
        },
      ],
      practiceQuiz: [
        {
          q: "Dùng at với gì trong bài?",
          options: ["Giờ", "Thứ", "Tên"],
          answer: 0,
          hint: "at ten.",
        },
        {
          q: "Muốn biết giá vé, hỏi gì?",
          options: [
            "Where is the ticket?",
            "How much is a ticket?",
            "What is your name?",
          ],
          answer: 1,
          hint: "How much hỏi giá.",
        },
        {
          q: "Chưa nghe rõ, làm gì?",
          options: ["Đoán luôn", "Bỏ qua", "Xin nhắc lại"],
          answer: 2,
          hint: "Can you say that again?",
        },
      ],
      listening: {
        text: "Hello. I am Eva. The music class is on Saturday at eleven thirty. We are in room six. Please bring a book.",
        questions: [
          {
            q: "Giờ lớp âm nhạc?",
            options: ["11:00", "11:30", "6:30"],
            answer: 1,
            hint: "eleven thirty.",
          },
          {
            q: "Phòng học?",
            options: ["4", "5", "6"],
            answer: 2,
            hint: "room six.",
          },
        ],
        translation:
          "Xin chào. Tôi là Eva. Lớp âm nhạc vào thứ Bảy lúc mười một giờ rưỡi. Chúng ta ở phòng sáu. Hãy mang sách.",
      },
      writing:
        "Tình huống mới: Sports club — Sunday, 8:00, Park Gate 2, ticket 4 dollars. Viết lời giới thiệu bằng tên giả; nhắn cho bạn đủ ngày/giờ/nơi/giá; hỏi bạn có muốn đi không.",
      modelAnswer: [
        "Hi. I am Bao. The sports club is on Sunday at eight. Meet at park gate two. A ticket is four dollars. Do you want to go?",
      ],
      rubric: [
        "Thông tin cá nhân đơn giản, dễ hiểu.",
        "Giữ đủ và đúng bốn chi tiết của thông báo.",
        "Có câu hỏi để người kia phản hồi.",
        "Nhờ người khác đọc: họ có xác định đúng nơi và giờ không? Đây chưa phải chứng nhận A1.",
      ],
      speaking:
        "Hai vai, không đọc mẫu: A hỏi B tên và nơi ở; B hỏi lịch câu lạc bộ từ thẻ mới; A trả lời; B xin nhắc một chi tiết và xác nhận; đổi vai. Người nghe ghi chi tiết hiểu được và phần cần hỏi lại.",
      worked: [
        "Thẻ luyện mẫu: Reading group — Tuesday — 9:00 — Room 1. Tách việc, ngày, giờ, phòng.",
        "Nhắn: The reading group is on Tuesday at nine in room one. Không thêm giá nếu thẻ không nói.",
        "Xin xác nhận: Can you come? Sau đó tự làm nhiệm vụ câu lạc bộ thể thao với thông tin khác, trước khi mở mẫu.",
      ],
    },
  ];
  const clusters = LESSONS.map((lesson, index) => ({
    id: lesson.id,
    level: "A1",
    title: lesson.title,
    canDo: lesson.canDo,
    moduleIds: [`${lesson.id}-core`],
    levelBasis: "Mục tiêu A1 · biên soạn nội bộ",
    scopeNote:
      "Luyện có hỗ trợ; điểm bài tập không chứng nhận trình độ. Dùng tên và thông tin giả.",
    preparation: {
      prerequisite: index
        ? "Ôn lại bài trước khi cần; được dùng bảng từ và xin nhắc lại."
        : "Bắt đầu bằng lời chào và tên. Đọc từng câu; chưa cần nhớ hết trước khi luyện.",
      glossary: lesson.glossary,
      patterns: lesson.patterns,
      worked: lesson.worked,
      practiceQuiz: lesson.practiceQuiz,
    },
    workedExample: {
      label: "Hội thoại / văn bản mẫu có nghĩa",
      turns: lesson.lines.map(([text, translation]) => ({
        speaker: "",
        text,
        translation,
      })),
    },
    audioNote:
      "Nghe giọng máy là bài luyện, không phải audio đã thẩm định. Nói hai vai cần người nghe phản hồi.",
  }));
  const modules = LESSONS.map((lesson) => ({
    id: `${lesson.id}-core`,
    clusterId: lesson.id,
    order: 1,
    level: "A1",
    title: "Cụm câu cốt lõi",
    canDo: lesson.canDo,
    units: lesson.units.map(([target, meaning], index) => ({
      id: `${lesson.id}-unit-${index + 1}`,
      type: "expression",
      target,
      meaning,
      forms: [],
      accepted: [],
      contexts: [lesson.canDo],
      tags: ["a1-curriculum"],
      intent: lesson.canDo,
      canDo: lesson.canDo,
      exampleSentence: target,
      exampleTranslation: meaning,
    })),
  }));
  const dialogues = Object.fromEntries(
    LESSONS.map((lesson) => [
      lesson.id,
      {
        sourceId: `lesson:${lesson.id}:v1`,
        contentVersion: 1,
        title: lesson.title,
        lines: lesson.lines,
        scenarioQuiz: lesson.scenarioQuiz,
        listening: lesson.listening,
      },
    ]),
  );
  const missions = LESSONS.flatMap((lesson) => [
    {
      id: `${lesson.id}-writing`,
      clusterId: lesson.id,
      level: "A1",
      title: "Viết và truyền thông tin",
      canDo: lesson.canDo,
      setup: lesson.writing,
      incomingMessage: "Hãy tự thử trước khi xem mẫu.",
      instructions:
        "Viết các câu ngắn theo yêu cầu. Được dùng cách diễn đạt khác mẫu nếu giữ đúng nghĩa.",
      modelAnswer: lesson.modelAnswer,
      selfCheck: lesson.rubric,
      skill: "write",
      requireWritten: true,
    },
    {
      id: `${lesson.id}-speaking`,
      clusterId: lesson.id,
      level: "A1",
      title: "Nói và hỏi đáp hai vai",
      canDo: lesson.canDo,
      setup: lesson.speaking,
      incomingMessage:
        "Nói chậm; người nghe có thể xin nhắc lại. Nếu luyện một mình, đóng cả hai vai.",
      instructions:
        "Nói thành tiếng, rồi ghi một câu bạn đã nói và chi tiết người nghe hiểu hoặc cần bạn nhắc lại. Nếu luyện một mình, ghi rõ tự luyện.",
      modelAnswer: [
        "Đối chiếu các câu cốt lõi và hội thoại trong bài. Không cần nói giống nguyên văn.",
      ],
      selfCheck: [
        "Có trao đổi cả hỏi và đáp.",
        "Truyền đạt đúng thông tin cần thiết.",
        "Ghi rõ tự luyện hay có người nghe; không coi tự khai là chấm phát âm.",
      ],
      skill: "speak",
      requireWritten: true,
      requireSpoken: true,
    },
  ]);
  const foundations = [
    {
      title: "Bảng chữ cái và đánh vần",
      text: "A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z.",
      note: "Nghe tên chữ cái rồi đánh vần tên giả của bạn. Tên chữ cái khác âm của chữ trong từ; không dùng bảng này để đoán mọi cách phát âm.",
    },
    {
      title: "Số 0–20",
      text: "zero, one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty.",
      note: "Theo thứ tự là 0–20. Điện thoại đọc từng số. So fifteen (15) với fifty (50) bằng cách xin người nghe đọc lại số họ hiểu.",
    },
    {
      title: "Số lớn hơn và giá",
      text: "twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred. Twenty-one. Thirty-five. Two dollars. Two dollars fifty.",
      note: "20, 30, 40, 50, 60, 70, 80, 90, 100. Ghép chục + đơn vị: twenty-one = 21; thirty-five = 35. Two dollars fifty = 2 đô 50 xu.",
    },
    {
      title: "Ngày và tháng",
      text: "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. January, February, March, April, May, June, July, August, September, October, November, December.",
      note: "Các thứ từ thứ Hai tới Chủ nhật; các tháng 1–12. on Monday, in March. Viết 12 March để tránh nhầm thứ tự ngày/tháng. Ngày sinh có thể ghi số trong biểu mẫu.",
    },
    {
      title: "Hỏi và nói giờ",
      text: "What time is it? It is seven. It is seven thirty. At eight fifteen. In the morning. In the afternoon. In the evening.",
      note: "7:00; 7:30; 8:15. am trước trưa, pm sau trưa. Cần hỏi lại nếu người nói chỉ nói seven mà bối cảnh không rõ sáng hay tối.",
    },
    {
      title: "Người, sở hữu và động từ be",
      text: "I am. You are. He is. She is. It is. We are. They are. My name. Your name. His name. Her name.",
      note: "I = tôi; you = bạn; he/she = anh ấy/cô ấy; it = nó; we = chúng tôi; they = họ. My/your/his/her chỉ sở hữu. Câu hỏi: Are you a student? Phủ định: I am not a teacher.",
    },
    {
      title: "Một/nhiều và vị trí",
      text: "A book. An apple. Two books. This bag. These bags. There is a chair. There are two chairs. In, on, under, next to, opposite.",
      note: "a/an cho một vật chưa xác định; the khi người nghe biết vật nào. Nhiều danh từ thêm s, nhưng không phải mọi từ đều vậy. in/trong; on/trên; under/dưới; next to/cạnh; opposite/đối diện.",
    },
    {
      title: "Sinh hoạt, phủ định, câu hỏi",
      text: "I work in a shop. She works in a shop. I do not work on Sunday. She does not work on Sunday. Do you work here? Does she work here? I am reading now.",
      note: "Hiện tại đơn nói thói quen. He/she thường thêm s ở câu khẳng định. Sau do/does/don’t/doesn’t giữ work. am/is/are + ing nói việc đang diễn ra: I am reading now = tôi đang đọc.",
    },
    {
      title: "Nối ý và xin hỗ trợ",
      text: "I like tea and coffee. I like tea, but I do not like coffee. First, go straight. Then turn left. Please speak slowly. Could you say that again? What does that mean?",
      note: "and = và; but = nhưng; first/then = trước tiên/sau đó. Không cần câu dài để giao tiếp rõ. Được xin nói chậm, nhắc lại và hỏi nghĩa.",
    },
  ];
  return { LESSONS, clusters, modules, dialogues, missions, foundations };
});
