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
  // Editorial course sequence; it is not a CEFR pass threshold.
  const stages = [
    {
      id: "people",
      title: "1 · Bắt đầu giao tiếp",
      lessonIds: [
        "a1-introductions",
        "a1-contact",
        "a1-classroom",
        "a1-family",
        "a1-checkpoint-people",
      ],
    },
    {
      id: "daily",
      title: "2 · Nhà và sinh hoạt",
      lessonIds: [
        "a1-home",
        "a1-possessions",
        "a1-jobs",
        "a1-routine",
        "a1-frequency",
        "a1-checkpoint-daily",
      ],
    },
    {
      id: "activities",
      title: "3 · Hoạt động và kế hoạch",
      lessonIds: [
        "a1-abilities",
        "a1-now",
        "a1-weather",
        "a1-dates",
        "a1-plans",
      ],
    },
    {
      id: "services",
      title: "4 · Mua đồ và nhu cầu",
      lessonIds: [
        "a1-food",
        "a1-quantities",
        "a1-shopping",
        "a1-needs",
        "a1-checkpoint-services",
      ],
    },
    {
      id: "outside",
      title: "5 · Đi lại và hẹn gặp",
      lessonIds: [
        "a1-directions",
        "a1-signs",
        "a1-travel",
        "a1-meeting-change",
      ],
    },
    {
      id: "messages",
      title: "6 · Viết tin và tổng ôn",
      lessonIds: [
        "a1-past-places",
        "a1-past-actions",
        "a1-forms",
        "a1-postcard",
        "a1-review",
      ],
    },
  ];
  const courseOrder = stages.flatMap((stage) => stage.lessonIds);
  const additionalLessons = [
    {
      id: "a1-classroom",
      title: "Hỏi lại và làm theo hướng dẫn",
      canDo:
        "Xin nói chậm, hỏi nghĩa một từ và làm theo hướng dẫn ngắn trong lớp.",
      glossary: [
        "open / close = mở / đóng; book = sách; page = trang",
        "listen = nghe; read = đọc; write = viết; slowly = chậm",
        "again = lại; mean = có nghĩa là; partner = bạn cùng luyện",
      ],
      patterns: [
        "Open your book. = Mở sách. Câu hướng dẫn bắt đầu bằng động từ, không cần you.",
        "Don’t + động từ: Don’t close your book. = Đừng đóng sách.",
        "What does … mean? hỏi nghĩa; How do you spell …? hỏi cách đánh vần.",
        "Please speak slowly. / Could you say that again? dùng khi cần hỗ trợ.",
      ],
      units: [
        ["Please speak slowly.", "Xin nói chậm."],
        ["What does this word mean?", "Từ này có nghĩa gì?"],
        ["Open your book.", "Mở sách ra."],
        ["I don’t understand.", "Tôi chưa hiểu."],
      ],
      lines: [
        [
          "Teacher: Open your book at page ten.",
          "Giáo viên: Mở sách trang mười.",
        ],
        [
          "An: Sorry. Could you say that again?",
          "An: Xin lỗi. Cô nói lại được không?",
        ],
        [
          "Teacher: Page ten. Read the first question.",
          "Giáo viên: Trang mười. Đọc câu hỏi đầu tiên.",
        ],
        ["An: What does partner mean?", "An: Partner nghĩa là gì?"],
        [
          "Teacher: A person you work with. Write your name, then talk to your partner.",
          "Giáo viên: Người em làm việc cùng. Viết tên rồi nói với bạn cùng luyện.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Mở sách trang nào?",
          options: ["2", "10", "1"],
          answer: 1,
          hint: "Giáo viên nhắc page ten hai lần.",
        },
        {
          q: "An hỏi điều gì về partner?",
          options: ["Cách đánh vần", "Nghĩa của từ", "Giá tiền"],
          answer: 1,
          hint: "What does … mean? là hỏi nghĩa.",
        },
        {
          q: "Sau khi viết tên, làm gì?",
          options: ["Đóng sách", "Về nhà", "Nói với bạn cùng luyện"],
          answer: 2,
          hint: "then talk to your partner là bước sau.",
        },
      ],
      practiceQuiz: [
        {
          q: "Xin người kia nói chậm.",
          options: ["Please speak slowly.", "Open slowly your.", "I slowly."],
          answer: 0,
          hint: "Please + hành động là yêu cầu lịch sự.",
        },
        {
          q: "Đừng đóng sách.",
          options: [
            "Not close book.",
            "Don’t close your book.",
            "Doesn’t your book.",
          ],
          answer: 1,
          hint: "Don’t đứng trước động từ nguyên mẫu.",
        },
        {
          q: "Bạn không hiểu nghĩa từ ticket.",
          options: [
            "How old is ticket?",
            "Where is ticket?",
            "What does ticket mean?",
          ],
          answer: 2,
          hint: "mean hỏi nghĩa; không phải hỏi vị trí.",
        },
      ],
      listening: {
        text: "Please open your book at page twelve. Listen first. Then write your name. Do not close your book.",
        translation:
          "Hãy mở sách trang mười hai. Nghe trước. Sau đó viết tên. Đừng đóng sách.",
        questions: [
          {
            q: "Đoạn nghe yêu cầu mở trang nào?",
            options: ["10", "12", "20"],
            answer: 1,
            hint: "Nghe page twelve.",
          },
          {
            q: "Việc nào làm trước?",
            options: ["Nghe", "Viết tên", "Đóng sách"],
            answer: 0,
            hint: "Listen first, rồi mới write.",
          },
        ],
      },
      writing:
        "Bạn mới chưa hiểu hướng dẫn. Viết 3 câu: xin nói chậm, hỏi nghĩa từ classroom, rồi nhờ bạn mở sách trang 5.",
      modelAnswer: [
        "Please speak slowly. What does classroom mean? Please open your book at page five.",
      ],
      rubric: [
        "Có yêu cầu nói chậm.",
        "Hỏi nghĩa đúng từ classroom.",
        "Hướng dẫn đúng trang 5, không đổi thành 15.",
      ],
      speaking:
        "A hướng dẫn mở sách trang 8 và viết tên. B cố ý xin nhắc trang, nhắc lại số mình hiểu rồi làm theo. Đổi vai với trang 18; người nghe ghi số hiểu được.",
      worked: [
        "Cần biết trang: chưa nghe rõ ten. Không đoán theo trang đang mở.",
        "Xin nhắc: Could you say that again? Người kia nói Page ten.",
        "Xác nhận: Page ten? Sau đó mở đúng trang; hỏi nghĩa bằng What does … mean? nếu cần.",
      ],
      coaching: {
        mistake:
          "Sai: What mean partner? → What does partner mean? Mẫu hỏi nghĩa có does, sau đó dùng mean.",
        pronunciation:
          "Nghe và nói book, page, name. Giữ âm cuối /k/ trong book và /m/ trong name; tên chữ cái không phải cách đọc cả từ.",
        recall:
          "Ngày sau, không nhìn mẫu: nhờ người khác nói chậm và hỏi nghĩa một từ trong bài mới.",
      },
    },
    {
      id: "a1-possessions",
      title: "Đồ dùng và của ai",
      canDo:
        "Hỏi người khác có đồ gì, xác định chủ đồ vật và mô tả bằng màu đơn giản.",
      glossary: [
        "bag = túi; key = chìa khóa; phone = điện thoại; wallet = ví",
        "red / blue / black = đỏ / xanh dương / đen; whose = của ai",
        "have / has = có; mine = của tôi; yours = của bạn",
      ],
      patterns: [
        "I/you/we/they have; he/she has: She has a blue bag.",
        "Hỏi: Do you have a pen? Phủ định: I don’t have a pen.",
        "my + danh từ: my bag. Mine thay cả cụm: This bag is mine.",
        "Whose bag is this? It’s Lan’s bag. Dấu ’s chỉ sở hữu trong câu này.",
      ],
      units: [
        ["Do you have a pen?", "Bạn có bút không?"],
        ["This bag is mine.", "Túi này của tôi."],
        ["Whose phone is this?", "Điện thoại này của ai?"],
        ["She has a blue bag.", "Cô ấy có túi màu xanh dương."],
      ],
      lines: [
        [
          "Ben: Is this your black bag?",
          "Ben: Đây có phải túi đen của bạn không?",
        ],
        [
          "Mai: No. My bag is blue. The black bag is Lan’s.",
          "Mai: Không. Túi tôi màu xanh. Túi đen của Lan.",
        ],
        ["Ben: Do you have your phone?", "Ben: Bạn có mang điện thoại không?"],
        [
          "Mai: Yes. It is in my bag, but I don’t have my keys.",
          "Mai: Có. Nó trong túi, nhưng tôi không có chìa khóa.",
        ],
        [
          "Ben: These keys are on the chair.",
          "Ben: Những chìa khóa này ở trên ghế.",
        ],
        ["Mai: Thank you. They are mine.", "Mai: Cảm ơn. Chúng là của tôi."],
      ],
      scenarioQuiz: [
        {
          q: "Túi đen của ai?",
          options: ["Mai", "Ben", "Lan"],
          answer: 2,
          hint: "Mai nói The black bag is Lan’s.",
        },
        {
          q: "Điện thoại Mai ở đâu?",
          options: ["Trong túi", "Trên ghế", "Ở nhà"],
          answer: 0,
          hint: "It is in my bag nói về phone.",
        },
        {
          q: "Vật tìm thấy trên ghế là gì?",
          options: ["Ví", "Chìa khóa", "Túi xanh"],
          answer: 1,
          hint: "These keys are on the chair.",
        },
      ],
      practiceQuiz: [
        {
          q: "She ___ a blue bag.",
          options: ["have", "has", "is"],
          answer: 1,
          hint: "She đi với has để nói có đồ vật.",
        },
        {
          q: "Sửa This is mine bag.",
          options: ["This is my bag.", "This is me bag.", "This is I bag."],
          answer: 0,
          hint: "my đứng trước danh từ; mine đứng một mình.",
        },
        {
          q: "Hỏi túi này của ai.",
          options: ["Who bag?", "Where is this bag?", "Whose bag is this?"],
          answer: 2,
          hint: "Whose hỏi chủ sở hữu.",
        },
      ],
      listening: {
        text: "This is my red wallet. My phone is in the wallet. Those keys are not mine. They are Tom’s.",
        translation:
          "Đây là ví đỏ của tôi. Điện thoại tôi ở trong ví. Những chìa khóa kia không phải của tôi. Chúng là của Tom.",
        questions: [
          {
            q: "Ví màu gì?",
            options: ["Đen", "Xanh", "Đỏ"],
            answer: 2,
            hint: "my red wallet.",
          },
          {
            q: "Chìa khóa của ai?",
            options: ["Người nói", "Tom", "Không biết"],
            answer: 1,
            hint: "They are Tom’s.",
          },
        ],
      },
      writing:
        "Quầy đồ thất lạc: bạn có túi xanh, mất ví đen, điện thoại vẫn trong túi. Viết mô tả ba thông tin và hỏi chiếc ví trên bàn là của ai.",
      modelAnswer: [
        "I have a blue bag. I can’t find my black wallet. My phone is in my bag. Whose wallet is on the table?",
      ],
      rubric: [
        "Phân biệt đồ còn và đồ mất.",
        "Giữ đúng màu túi/ví.",
        "Có câu hỏi chủ sở hữu.",
      ],
      speaking:
        "A mô tả hai đồ dùng giả của mình; B hỏi Do you have …? rồi chỉ một đồ và hỏi Whose …? A đáp, B nhắc lại chủ và màu. Đổi vai.",
      worked: [
        "Hai túi: Lan — đen; Mai — xanh. Gắn người với đúng màu.",
        "My bag is blue. → từ góc nhìn Ben: Mai has a blue bag.",
        "Thay my bag bằng mine khi đã biết vật: The blue bag is mine.",
      ],
      coaching: {
        mistake:
          "Sai: She have a bag. → She has a bag. Nhưng Does she have a bag? dùng have sau does.",
        pronunciation:
          "Giữ âm /z/ cuối keys để người nghe nhận ra nhiều chìa khóa; nói chậm my bag / mine.",
        recall:
          "Ngày sau, mô tả hai vật khác và hỏi vật thứ ba của ai, không đọc lại bài.",
      },
    },
    {
      id: "a1-jobs",
      title: "Công việc và nơi làm việc",
      canDo: "Nói nghề, nơi làm việc và hỏi nghề của người khác bằng câu ngắn.",
      glossary: [
        "teacher = giáo viên; nurse = điều dưỡng; driver = tài xế; student = học sinh/sinh viên",
        "school = trường; hospital = bệnh viện; shop = cửa hàng",
        "work = làm việc; study = học; job = công việc",
      ],
      patterns: [
        "I am a teacher. / She is a nurse. Nghề đếm được số ít thường cần a/an.",
        "I work in a shop. Work là động từ: không thêm am trước work.",
        "What do you do? thường hỏi nghề; Where do you work? hỏi nơi làm.",
        "He works …; câu hỏi Does he work …? dùng work không s.",
      ],
      units: [
        ["What do you do?", "Bạn làm nghề gì?"],
        ["I am a student.", "Tôi là sinh viên."],
        ["Where do you work?", "Bạn làm việc ở đâu?"],
        ["She works in a hospital.", "Cô ấy làm việc trong bệnh viện."],
      ],
      lines: [
        ["Anna: What do you do, Nam?", "Anna: Nam làm nghề gì?"],
        [
          "Nam: I am a driver. I work in Hanoi.",
          "Nam: Tôi là tài xế. Tôi làm việc ở Hà Nội.",
        ],
        [
          "Anna: Is your sister a driver too?",
          "Anna: Chị bạn cũng là tài xế à?",
        ],
        [
          "Nam: No. She is a nurse. She works in a hospital.",
          "Nam: Không. Chị ấy là điều dưỡng. Chị làm trong bệnh viện.",
        ],
        [
          "Anna: I am a teacher. I work at a small school.",
          "Anna: Tôi là giáo viên. Tôi làm ở một trường nhỏ.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Nam làm nghề gì?",
          options: ["Giáo viên", "Tài xế", "Điều dưỡng"],
          answer: 1,
          hint: "I am a driver.",
        },
        {
          q: "Chị Nam làm ở đâu?",
          options: ["Bệnh viện", "Cửa hàng", "Trường"],
          answer: 0,
          hint: "She works in a hospital.",
        },
        {
          q: "Ai là giáo viên?",
          options: ["Nam", "Chị Nam", "Anna"],
          answer: 2,
          hint: "Anna nói I am a teacher.",
        },
      ],
      practiceQuiz: [
        {
          q: "Sửa I am work in a shop.",
          options: [
            "I work in a shop.",
            "I am works in a shop.",
            "I working shop.",
          ],
          answer: 0,
          hint: "Work là động từ chính; không dùng am ở hiện tại đơn này.",
        },
        {
          q: "He is ___ teacher.",
          options: ["an", "a", "two"],
          answer: 1,
          hint: "teacher bắt đầu bằng âm phụ âm, dùng a.",
        },
        {
          q: "___ she work here?",
          options: ["Is", "Do", "Does"],
          answer: 2,
          hint: "Hỏi hiện tại đơn với she dùng Does + she + work.",
        },
      ],
      listening: {
        text: "My name is Eva. I am a student. My father is a teacher. He works at a school. My mother works in a shop.",
        translation:
          "Tôi tên Eva. Tôi là sinh viên. Bố tôi là giáo viên, làm ở trường. Mẹ tôi làm trong cửa hàng.",
        questions: [
          {
            q: "Eva làm gì?",
            options: ["Sinh viên", "Giáo viên", "Tài xế"],
            answer: 0,
            hint: "Eva nói I am a student.",
          },
          {
            q: "Mẹ Eva làm ở đâu?",
            options: ["Bệnh viện", "Trường", "Cửa hàng"],
            answer: 2,
            hint: "My mother works in a shop.",
          },
        ],
      },
      writing:
        "Dùng nhân vật giả: bạn là sinh viên ở Huế; bạn của bạn là điều dưỡng ở bệnh viện. Viết giới thiệu cả hai rồi hỏi người nhận làm nghề gì.",
      modelAnswer: [
        "I am a student in Hue. My friend is a nurse. She works in a hospital. What do you do?",
      ],
      rubric: [
        "Có thông tin của cả hai người.",
        "Phân biệt nghề với nơi làm.",
        "Có câu hỏi nghề; a/an và be không làm sai nghĩa.",
      ],
      speaking:
        "A dùng thẻ nghề giáo viên/trường, B dùng thẻ tài xế/Huế. Hỏi nghề, nơi làm và giới thiệu lại người kia. Đổi thẻ; không đọc hội thoại mẫu.",
      worked: [
        "Thẻ: Hoa — nurse — hospital. Nghề và nơi là hai thông tin.",
        "Hoa is a nurse. She works in a hospital. Đổi Hoa thành She ở câu sau.",
        "Hỏi lại bằng Where does she work? Không dùng Where is she work?",
      ],
      coaching: {
        mistake:
          "Sai: I am teacher. → I am a teacher. Sai: She is work. → She works.",
        pronunciation:
          "Nurse có âm cuối /s/; works kết thúc /ks/. Đọc chậm rồi dùng trong câu, không thêm một âm tiết “sờ”.",
        recall:
          "Ngày sau, giới thiệu nghề và nơi làm của một nhân vật khác, rồi hỏi hai câu.",
      },
    },
    {
      id: "a1-frequency",
      title: "Thói quen và mức độ thường xuyên",
      canDo:
        "Hỏi lịch sinh hoạt, phân biệt luôn/thường/đôi khi/không bao giờ và ngày nghỉ.",
      glossary: [
        "always = luôn; usually = thường; sometimes = đôi khi; never = không bao giờ",
        "every day = mỗi ngày; weekend = cuối tuần; breakfast = bữa sáng",
        "walk = đi bộ; bus = xe buýt; start = bắt đầu; finish = kết thúc",
      ],
      patterns: [
        "I usually walk to work. Trạng từ usually đứng trước động từ walk.",
        "I am usually home at six. Với be, usually thường đứng sau am/is/are.",
        "She starts at nine. She doesn’t work on Sunday. Sau doesn’t dùng work.",
        "Do you work on Saturday? Yes, I do. / No, I don’t.",
      ],
      units: [
        ["I usually walk to work.", "Tôi thường đi bộ đi làm."],
        ["I never work on Sunday.", "Tôi không bao giờ làm vào Chủ nhật."],
        ["Do you work on Saturday?", "Bạn làm vào thứ Bảy không?"],
        ["She starts at nine.", "Cô ấy bắt đầu lúc chín giờ."],
      ],
      lines: [
        [
          "Lea: I usually take the bus to work. I start at nine.",
          "Lea: Tôi thường đi xe buýt đi làm, bắt đầu lúc chín giờ.",
        ],
        ["Bo: Do you work every day?", "Bo: Bạn làm mỗi ngày à?"],
        [
          "Lea: No. I work from Monday to Friday. I never work on Sunday.",
          "Lea: Không. Tôi làm từ thứ Hai đến thứ Sáu. Tôi không bao giờ làm Chủ nhật.",
        ],
        ["Bo: What do you do on Saturday?", "Bo: Thứ Bảy bạn làm gì?"],
        ["Lea: I sometimes visit my sister.", "Lea: Tôi đôi khi thăm chị tôi."],
      ],
      scenarioQuiz: [
        {
          q: "Lea thường đi làm bằng gì?",
          options: ["Đi bộ", "Xe buýt", "Tàu"],
          answer: 1,
          hint: "usually take the bus.",
        },
        {
          q: "Lea bắt đầu lúc nào?",
          options: ["9 giờ", "5 giờ", "7 giờ"],
          answer: 0,
          hint: "I start at nine.",
        },
        {
          q: "Câu nào đúng về thứ Bảy?",
          options: [
            "Luôn đi làm",
            "Không bao giờ ra ngoài",
            "Đôi khi thăm chị",
          ],
          answer: 2,
          hint: "sometimes visit my sister không có nghĩa tuần nào cũng thăm.",
        },
      ],
      practiceQuiz: [
        {
          q: "She ___ at nine every day.",
          options: ["start", "starts", "starting"],
          answer: 1,
          hint: "Hiện tại đơn khẳng định với she thêm s.",
        },
        {
          q: "Never có nghĩa gì?",
          options: ["Không bao giờ", "Đôi khi", "Luôn luôn"],
          answer: 0,
          hint: "Never không phải sometimes.",
        },
        {
          q: "Chọn câu đúng.",
          options: [
            "He doesn’t works on Sunday.",
            "He don’t work on Sunday.",
            "He doesn’t work on Sunday.",
          ],
          answer: 2,
          hint: "doesn’t + động từ nguyên mẫu work.",
        },
      ],
      listening: {
        text: "I am Ben. I always have breakfast at seven. I walk to school. On Saturday, I sometimes play football. I never play football on Sunday.",
        translation:
          "Tôi là Ben. Tôi luôn ăn sáng lúc bảy giờ. Tôi đi bộ đến trường. Thứ Bảy tôi đôi khi chơi bóng đá. Tôi không bao giờ chơi bóng vào Chủ nhật.",
        questions: [
          {
            q: "Ben ăn sáng lúc nào?",
            options: ["6 giờ", "7 giờ", "9 giờ"],
            answer: 1,
            hint: "breakfast at seven.",
          },
          {
            q: "Ngày nào Ben không bao giờ chơi bóng?",
            options: ["Thứ Sáu", "Thứ Bảy", "Chủ nhật"],
            answer: 2,
            hint: "never … on Sunday.",
          },
        ],
      },
      writing:
        "Thẻ giả: đi bộ đến trường thường xuyên, bắt đầu lúc 8:00, không học Chủ nhật. Viết 3 câu về thẻ và hỏi bạn mình có học thứ Bảy không.",
      modelAnswer: [
        "I usually walk to school. I start at eight. I don’t study on Sunday. Do you study on Saturday?",
      ],
      rubric: [
        "Đúng phương tiện, giờ và ngày nghỉ.",
        "Usually không biến thành always.",
        "Có câu hỏi yes/no dùng do.",
      ],
      speaking:
        "A hỏi B giờ bắt đầu và cách đi học. B trả lời với usually, rồi hỏi A có học Chủ nhật không. Người nghe nhắc lại một thói quen; đổi vai.",
      worked: [
        "Tách thói quen và việc chỉ xảy ra hôm nay; every day báo thói quen.",
        "I start at eight. → She starts at eight. Đổi chủ ngữ cần đổi động từ.",
        "Phủ định: She doesn’t start at eight. Does đã mang dấu hiệu ngôi, start không thêm s.",
      ],
      coaching: {
        mistake:
          "Sai: I don’t never work. → I never work. Trong mẫu cơ bản này never đã mang nghĩa phủ định.",
        pronunciation:
          "Nghe starts và start: thử giữ cụm âm cuối ngắn, không đánh giá phát âm chỉ từ ô đã nói.",
        recall:
          "Ngày sau, kể hai thói quen khác và hỏi người nghe một câu về cuối tuần.",
      },
    },
    {
      id: "a1-abilities",
      title: "Sở thích và khả năng",
      canDo:
        "Nói thích/không thích và có thể/không thể làm việc quen thuộc; chọn hoạt động chung.",
      glossary: [
        "swim = bơi; sing = hát; dance = nhảy; cook = nấu ăn",
        "music = âm nhạc; football = bóng đá; well = giỏi/tốt",
        "like = thích; can = có thể; can’t = không thể",
      ],
      patterns: [
        "I like music. / I like swimming. Dùng danh từ hoặc động từ -ing sau like.",
        "I can swim. She can swim. Can không thêm s theo chủ ngữ.",
        "Can you cook? Yes, I can. / No, I can’t. Sau can dùng động từ nguyên mẫu.",
        "I like football, but I can’t play well. Thích không đồng nghĩa làm giỏi.",
      ],
      units: [
        ["Can you swim?", "Bạn bơi được không?"],
        ["I can cook.", "Tôi có thể nấu ăn."],
        ["I like music.", "Tôi thích âm nhạc."],
        ["I can’t dance.", "Tôi không biết nhảy."],
      ],
      lines: [
        ["Kim: Do you like swimming?", "Kim: Bạn thích bơi không?"],
        [
          "Leo: Yes, but I can’t swim well. Can you swim?",
          "Leo: Có, nhưng tôi bơi không giỏi. Bạn bơi được không?",
        ],
        [
          "Kim: Yes, I can. I don’t like football.",
          "Kim: Có. Tôi không thích bóng đá.",
        ],
        [
          "Leo: I like music. Can you sing?",
          "Leo: Tôi thích âm nhạc. Bạn hát được không?",
        ],
        ["Kim: No, but I can dance.", "Kim: Không, nhưng tôi biết nhảy."],
      ],
      scenarioQuiz: [
        {
          q: "Leo nói gì về bơi?",
          options: ["Không thích", "Thích nhưng chưa giỏi", "Bơi rất giỏi"],
          answer: 1,
          hint: "Yes nói thích; can’t swim well nói khả năng.",
        },
        {
          q: "Kim không thích gì?",
          options: ["Âm nhạc", "Nhảy", "Bóng đá"],
          answer: 2,
          hint: "I don’t like football.",
        },
        {
          q: "Kim làm được việc gì?",
          options: ["Nhảy", "Hát", "Chơi bóng giỏi"],
          answer: 0,
          hint: "I can dance.",
        },
      ],
      practiceQuiz: [
        {
          q: "She can ___ .",
          options: ["swims", "swim", "swimming"],
          answer: 1,
          hint: "Sau can dùng swim, không thêm s hay ing.",
        },
        {
          q: "Chọn câu nói thích nấu ăn.",
          options: ["I like cooking.", "I can cooking.", "I cooking like."],
          answer: 0,
          hint: "like + cooking.",
        },
        {
          q: "Can you sing? Trả lời không.",
          options: ["No, I don’t.", "No, I am not.", "No, I can’t."],
          answer: 2,
          hint: "Câu hỏi can dùng can/can’t trong câu trả lời ngắn.",
        },
      ],
      listening: {
        text: "I like cooking, and I can cook rice. I like music too, but I cannot sing. My brother can sing very well.",
        translation:
          "Tôi thích nấu ăn và nấu cơm được. Tôi cũng thích âm nhạc nhưng không biết hát. Anh tôi hát rất hay.",
        questions: [
          {
            q: "Người nói làm được gì?",
            options: ["Nấu cơm", "Hát", "Bơi"],
            answer: 0,
            hint: "I can cook rice.",
          },
          {
            q: "Ai hát giỏi?",
            options: ["Người nói", "Anh trai", "Kim"],
            answer: 1,
            hint: "My brother can sing very well.",
          },
        ],
      },
      writing:
        "Chọn hoạt động với bạn: nhân vật của bạn thích âm nhạc, biết hát nhưng không biết nhảy. Viết ba thông tin và hỏi bạn có biết hát không.",
      modelAnswer: [
        "I like music. I can sing, but I can’t dance. Can you sing?",
      ],
      rubric: [
        "Tách sở thích và khả năng.",
        "Đúng một khả năng và một điều không làm được.",
        "Có câu hỏi can để chọn hoạt động chung.",
      ],
      speaking:
        "A và B mỗi người chọn bí mật hai hoạt động mình làm được và một không làm được. Hỏi Can you …? rồi chọn một hoạt động cả hai cùng làm được. Nói rõ nếu không tìm được hoạt động chung.",
      worked: [
        "Mục tiêu là tìm hoạt động chung, không chỉ đọc danh sách thích.",
        "A: Can you cook? B: Yes, I can. A: I can cook too.",
        "Khi B đáp No, I can’t, hãy hỏi hoạt động khác; không ghi B biết nấu.",
      ],
      coaching: {
        mistake:
          "Sai: She cans sing. → She can sing. Can giữ nguyên với mọi chủ ngữ.",
        pronunciation:
          "Can và can’t dễ nghe nhầm. Khi chưa chắc, hỏi Can you or can’t you? rồi nhờ xác nhận; khác giọng có thể làm âm cuối khác nhau.",
        recall:
          "Ngày sau hỏi người khác về hai khả năng, ghi lại điều họ thực sự trả lời.",
      },
    },
    {
      id: "a1-now",
      title: "Việc đang diễn ra",
      canDo: "Mô tả ai đang làm gì và phân biệt việc hiện tại với thói quen.",
      glossary: [
        "now = bây giờ; today = hôm nay; wait = đợi; read = đọc",
        "sit = ngồi; run = chạy; play = chơi; outside = bên ngoài",
        "at the moment = lúc này; usually = thường",
      ],
      patterns: [
        "am/is/are + động từ -ing: I am reading. They are waiting.",
        "Hỏi: Are you working? Phủ định: I am not working.",
        "I usually work at home. Today I am working in a cafe. Thói quen khác việc đang diễn ra.",
        "Một số cách viết: make → making; sit → sitting. Học qua mẫu, không chỉ thêm ing vào mọi từ.",
      ],
      units: [
        ["What are you doing?", "Bạn đang làm gì?"],
        ["I am waiting for a bus.", "Tôi đang đợi xe buýt."],
        ["She is reading.", "Cô ấy đang đọc."],
        ["They are playing outside.", "Họ đang chơi ở bên ngoài."],
      ],
      lines: [
        [
          "Tuan: Hi, Mia. What are you doing?",
          "Tuấn: Chào Mia. Bạn đang làm gì?",
        ],
        [
          "Mia: I am reading at home. My brother is cooking.",
          "Mia: Tôi đang đọc ở nhà. Anh tôi đang nấu ăn.",
        ],
        ["Tuan: Are your parents at home?", "Tuấn: Bố mẹ bạn ở nhà không?"],
        [
          "Mia: No. They are walking in the park. What about you?",
          "Mia: Không. Họ đang đi bộ trong công viên. Còn bạn?",
        ],
        [
          "Tuan: I usually study at home, but today I am studying in the library.",
          "Tuấn: Tôi thường học ở nhà, nhưng hôm nay đang học trong thư viện.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Mia đang làm gì?",
          options: ["Nấu ăn", "Đọc", "Đi bộ"],
          answer: 1,
          hint: "I am reading.",
        },
        {
          q: "Bố mẹ Mia đang ở đâu?",
          options: ["Công viên", "Nhà", "Thư viện"],
          answer: 0,
          hint: "walking in the park.",
        },
        {
          q: "Tuấn đang học ở đâu hôm nay?",
          options: ["Ở nhà", "Quán cà phê", "Thư viện"],
          answer: 2,
          hint: "today I am studying in the library, khác thói quen.",
        },
      ],
      practiceQuiz: [
        {
          q: "They ___ waiting.",
          options: ["is", "are", "am"],
          answer: 1,
          hint: "They đi với are.",
        },
        {
          q: "Sửa She reading now.",
          options: [
            "She is reading now.",
            "She does reading now.",
            "She read now is.",
          ],
          answer: 0,
          hint: "Cần is trước reading.",
        },
        {
          q: "Nói thói quen mỗi ngày.",
          options: [
            "I am walk to school every day.",
            "I walking school every day.",
            "I walk to school every day.",
          ],
          answer: 2,
          hint: "Hiện tại đơn phù hợp thói quen trong câu này.",
        },
      ],
      listening: {
        text: "I am sitting in a cafe. My sister is buying tea. Two children are playing outside. We usually come here on Friday, but today is Saturday.",
        translation:
          "Tôi đang ngồi trong quán cà phê. Chị tôi đang mua trà. Hai trẻ đang chơi bên ngoài. Chúng tôi thường đến thứ Sáu, nhưng hôm nay là thứ Bảy.",
        questions: [
          {
            q: "Chị người nói đang làm gì?",
            options: ["Ngồi", "Mua trà", "Chơi"],
            answer: 1,
            hint: "My sister is buying tea.",
          },
          {
            q: "Hôm nay là ngày nào?",
            options: ["Thứ Sáu", "Chủ nhật", "Thứ Bảy"],
            answer: 2,
            hint: "today is Saturday; usually Friday là thói quen.",
          },
        ],
      },
      writing:
        "Nhắn từ công viên: bạn đang đợi, em bạn đang chơi, mẹ đang đọc. Viết ba câu và hỏi người nhận đang làm gì.",
      modelAnswer: [
        "I am waiting in the park. My brother is playing. My mother is reading. What are you doing?",
      ],
      rubric: [
        "Có ba người và hành động tương ứng.",
        "Dùng am/is/are với ing.",
        "Có câu hỏi việc đang diễn ra.",
      ],
      speaking:
        "A chọn ba người và hành động trong phòng tưởng tượng. B hỏi What is … doing? A trả lời. B mô tả lại, A sửa thông tin sai. Đổi vai.",
      worked: [
        "Xác định chủ ngữ: I / my mother / two children.",
        "Chọn be: I am / she is / they are. Thêm reading.",
        "Đổi thành hỏi: Are they reading? Đưa are lên trước they.",
      ],
      coaching: {
        mistake:
          "Sai: I am read. → I am reading. Sai: She is cooking every day (khi chỉ nói thói quen) → She cooks every day.",
        pronunciation:
          "Đọc waiting theo hai âm tiết, không đánh vần từng chữ. Nói rõ từ chỉ hành động để người nghe phân biệt waiting và walking.",
        recall:
          "Ngày sau nhìn quanh và nói ba câu về việc đang diễn ra, thêm một câu thói quen khác.",
      },
    },
    {
      id: "a1-weather",
      title: "Thời tiết và quần áo",
      canDo:
        "Hiểu mô tả thời tiết đơn giản, nói đang mặc gì và chuẩn bị đồ phù hợp.",
      glossary: [
        "sunny = có nắng; rainy = có mưa; cold / hot = lạnh / nóng",
        "coat = áo khoác; shirt = áo sơ mi; shoes = giày; umbrella = ô",
        "wear = mặc/mang; take = mang theo; outside = bên ngoài",
      ],
      patterns: [
        "It is cold. / It is sunny. Tiếng Anh cần it trong mẫu nói thời tiết.",
        "It is raining. = Trời đang mưa. Rainy là tính từ; raining là hành động.",
        "I am wearing a blue shirt. = Tôi đang mặc áo xanh.",
        "Take your coat. / Don’t forget your umbrella. là lời nhắc ngắn.",
      ],
      units: [
        ["What is the weather like?", "Thời tiết thế nào?"],
        ["It is cold today.", "Hôm nay trời lạnh."],
        ["I am wearing a coat.", "Tôi đang mặc áo khoác."],
        ["Take your umbrella.", "Hãy mang ô theo."],
      ],
      lines: [
        ["Eva: Is it sunny outside?", "Eva: Bên ngoài có nắng không?"],
        [
          "Dan: No. It is cold and it is raining.",
          "Dan: Không. Trời lạnh và đang mưa.",
        ],
        [
          "Eva: I am wearing a shirt. Where is my coat?",
          "Eva: Tôi đang mặc áo sơ mi. Áo khoác tôi đâu?",
        ],
        [
          "Dan: It is on the chair. Take your umbrella too.",
          "Dan: Nó trên ghế. Mang cả ô theo.",
        ],
        [
          "Eva: Thanks. My umbrella is in my bag.",
          "Eva: Cảm ơn. Ô ở trong túi tôi.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Thời tiết hiện tại thế nào?",
          options: ["Nóng và nắng", "Lạnh và mưa", "Lạnh nhưng nắng"],
          answer: 1,
          hint: "cold and … raining.",
        },
        {
          q: "Áo khoác ở đâu?",
          options: ["Trên ghế", "Trong túi", "Ngoài cửa"],
          answer: 0,
          hint: "It is on the chair nói về coat.",
        },
        {
          q: "Ô của Eva ở đâu?",
          options: ["Trên ghế", "Trong túi", "Ở nhà Dan"],
          answer: 1,
          hint: "My umbrella is in my bag.",
        },
      ],
      practiceQuiz: [
        {
          q: "___ is hot today.",
          options: ["It", "He", "There"],
          answer: 0,
          hint: "Mẫu thời tiết dùng It.",
        },
        {
          q: "Nói trời đang mưa.",
          options: ["It raining.", "It is raining.", "It are rain."],
          answer: 1,
          hint: "It + is + raining.",
        },
        {
          q: "Một người đang mặc áo khoác.",
          options: [
            "She wear coat now.",
            "She is wear a coat.",
            "She is wearing a coat.",
          ],
          answer: 2,
          hint: "is + wearing, và a coat.",
        },
      ],
      listening: {
        text: "It is hot and sunny today. I am wearing a white shirt and blue shoes. My coat is at home. I have water in my bag.",
        translation:
          "Hôm nay nóng và có nắng. Tôi đang mặc áo trắng và mang giày xanh. Áo khoác ở nhà. Tôi có nước trong túi.",
        questions: [
          {
            q: "Thời tiết trong đoạn nghe?",
            options: ["Lạnh", "Mưa", "Nóng và nắng"],
            answer: 2,
            hint: "hot and sunny.",
          },
          {
            q: "Áo sơ mi màu gì?",
            options: ["Trắng", "Xanh", "Đen"],
            answer: 0,
            hint: "white shirt, khác blue shoes.",
          },
        ],
      },
      writing:
        "Bạn nhắn người sắp đến: trời lạnh và mưa; hãy mang áo khoác và ô. Thêm một câu về áo bạn đang mặc.",
      modelAnswer: [
        "It is cold and it is raining. Please take your coat and umbrella. I am wearing a blue shirt.",
      ],
      rubric: [
        "Đúng cả lạnh và mưa.",
        "Nhắc mang hai đồ vật.",
        "Có câu đang mặc, không nhầm với thời tiết.",
      ],
      speaking:
        "A có thẻ trời nóng/nắng, B có thẻ lạnh/mưa. Hỏi What is the weather like? và đang mặc gì. Nghe rồi đề nghị mang một đồ phù hợp. Đổi vai.",
      worked: [
        "Tách thời tiết và người: It is cold. I am cold. Hai câu không cùng chủ thể.",
        "Thời tiết: It is raining. Đồ đang mặc: I am wearing a coat.",
        "Nhắc người đến: Take your umbrella. Không cần dùng câu dài.",
      ],
      coaching: {
        mistake:
          "Sai: Is cold today. → It is cold today. Không bỏ it dù tiếng Việt không nói chủ ngữ này.",
        pronunciation:
          "Cold có cụm âm cuối /ld/; coat có /t/. Xin nhắc lại nếu nghe nhầm đồ vật với trạng thái.",
        recall:
          "Ngày sau, nói thời tiết thực tế và một lời nhắc đồ cần mang, không đọc mẫu.",
      },
    },
    {
      id: "a1-dates",
      title: "Ngày tháng và lời mời",
      canDo:
        "Đọc ngày rõ ràng, hỏi khi ngày viết mơ hồ và nhận hoặc từ chối lời mời đơn giản.",
      glossary: [
        "birthday = sinh nhật; party = bữa tiệc; month = tháng; year = năm",
        "first / second / third = thứ nhất / thứ hai / thứ ba; March = tháng Ba; May = tháng Năm",
        "come = đến; free = rảnh; sorry = xin lỗi",
      ],
      patterns: [
        "on Monday; on 12 March; in March; at six. Chọn giới từ theo thông tin.",
        "What is the date? hỏi ngày tháng. What day is it? hỏi thứ.",
        "Can you come? Yes, I can. / Sorry, I can’t. Có thể từ chối lịch sự.",
        "03/04 có thể là 3 April hoặc March 4 theo nơi dùng. Hỏi lại và viết tên tháng.",
      ],
      units: [
        ["When is your birthday?", "Sinh nhật bạn khi nào?"],
        ["It is on 12 March.", "Vào ngày 12 tháng Ba."],
        ["Can you come?", "Bạn đến được không?"],
        ["Sorry, I can’t come.", "Xin lỗi, tôi không đến được."],
      ],
      lines: [
        [
          "Mai: My birthday party is on 12 March at six.",
          "Mai: Tiệc sinh nhật tôi ngày 12 tháng Ba lúc sáu giờ.",
        ],
        ["Ben: Is it at your home?", "Ben: Tiệc ở nhà bạn à?"],
        [
          "Mai: No, at Green Cafe. Can you come?",
          "Mai: Không, ở Green Cafe. Bạn đến được không?",
        ],
        [
          "Ben: Yes, I can. Is that six in the evening?",
          "Ben: Có. Sáu giờ tối phải không?",
        ],
        ["Mai: Yes. See you there.", "Mai: Đúng. Hẹn gặp ở đó."],
      ],
      scenarioQuiz: [
        {
          q: "Ngày tiệc?",
          options: ["12 tháng Ba", "3 tháng Mười Hai", "6 tháng Ba"],
          answer: 0,
          hint: "12 March viết rõ tháng.",
        },
        {
          q: "Địa điểm đã xác nhận?",
          options: ["Nhà Mai", "Green Cafe", "Nhà Ben"],
          answer: 1,
          hint: "No, at Green Cafe.",
        },
        {
          q: "Giờ cuối đã làm rõ?",
          options: ["6 giờ sáng", "12 giờ trưa", "6 giờ tối"],
          answer: 2,
          hint: "six in the evening được Mai đồng ý.",
        },
      ],
      practiceQuiz: [
        {
          q: "___ March, nhưng ___ 12 March.",
          options: ["on / in", "in / on", "at / at"],
          answer: 1,
          hint: "in cho tháng, on cho ngày cụ thể.",
        },
        {
          q: "Tin ghi 03/04, bạn chưa biết quy ước.",
          options: [
            "Hỏi Is that 3 April or March 4?",
            "Tự chọn 3 April",
            "Tự chọn March 4",
          ],
          answer: 0,
          hint: "Ngày mơ hồ cần hỏi lại, không đoán.",
        },
        {
          q: "Từ chối lời mời lịch sự.",
          options: ["Yes, no.", "I not.", "Sorry, I can’t come."],
          answer: 2,
          hint: "Sorry làm rõ ý từ chối lịch sự.",
        },
      ],
      listening: {
        text: "Please come to my party on the twentieth of May at seven in the evening. The party is at my house, not at the cafe. Please bring a friend.",
        translation:
          "Hãy đến tiệc của tôi ngày 20 tháng Năm lúc bảy giờ tối. Tiệc ở nhà tôi, không ở quán. Hãy rủ một người bạn.",
        questions: [
          {
            q: "Tiệc vào tháng nào?",
            options: ["Tháng Ba", "Tháng Năm", "Tháng Bảy"],
            answer: 1,
            hint: "the twentieth of May.",
          },
          {
            q: "Tiệc ở đâu?",
            options: ["Quán", "Nhà người nói", "Công viên"],
            answer: 1,
            hint: "at my house, not at the cafe.",
          },
        ],
      },
      writing:
        "Mời bạn đến Green Park ngày 5 June lúc 5 giờ chiều. Nói đủ ngày, giờ và nơi; hỏi bạn có đến được không. Viết tên tháng để tránh nhầm.",
      modelAnswer: [
        "Please come to Green Park on 5 June at five in the afternoon. Can you come?",
      ],
      rubric: [
        "Đúng 5 June, không đảo thành 6 May.",
        "Đúng 5 giờ chiều và Green Park.",
        "Có lời mời/câu hỏi để người nhận trả lời.",
      ],
      speaking:
        "A mời B bằng ngày viết tên tháng. B hỏi sáng hay tối rồi nhận hoặc từ chối. A nhắc lại kế hoạch cuối. Đổi vai và dùng ngày khác.",
      worked: [
        "Ghi riêng: ngày 5 June; giờ 5 pm; nơi Green Park.",
        "Ghép: on 5 June at five in the afternoon, at Green Park.",
        "Nếu bạn hỏi lại giờ, xác nhận buổi trong ngày; không chỉ lặp five.",
      ],
      coaching: {
        mistake:
          "Sai: in Monday / on March (chỉ tháng). → on Monday / in March.",
        pronunciation:
          "Nghe ngày và tháng thành hai phần; fourteen và forty không cùng số. Đọc lại số để xác nhận thay vì đoán.",
        recall:
          "Ngày sau, mời một người bằng ngày khác rồi hỏi lại một ngày dạng số mơ hồ.",
      },
    },
    {
      id: "a1-quantities",
      title: "Số lượng và danh sách mua đồ",
      canDo:
        "Phân biệt đồ đếm được và lượng chứa; hỏi giá và mua đúng số lượng.",
      glossary: [
        "egg = trứng; apple = táo; rice = gạo/cơm; milk = sữa",
        "bottle = chai; bag = túi; kilo = kilôgam; some = một ít/một số",
        "any = chút/nào trong các câu hỏi và phủ định ở bài này",
      ],
      patterns: [
        "One apple, two apples. Milk/rice thường không đếm từng vật bằng s trong nghĩa thực phẩm.",
        "Two bottles of milk / a bag of rice: đếm chai/túi để nói lượng.",
        "We have some eggs. Do we have any milk? We don’t have any milk.",
        "How many apples? hỏi số vật; How much milk? hỏi lượng; How much is it? hỏi giá.",
      ],
      units: [
        ["Do we have any milk?", "Chúng ta có sữa không?"],
        ["We need two bottles of water.", "Chúng ta cần hai chai nước."],
        ["How many apples?", "Bao nhiêu quả táo?"],
        ["A kilo of rice, please.", "Cho tôi một ký gạo."],
      ],
      lines: [
        ["A: Do we have any eggs?", "A: Chúng ta có trứng không?"],
        [
          "B: Yes, we have six eggs, but we don’t have any milk.",
          "B: Có, sáu quả trứng nhưng không có sữa.",
        ],
        [
          "A: We need two bottles of milk and three apples.",
          "A: Cần hai chai sữa và ba quả táo.",
        ],
        ["B: Do we need rice?", "B: Có cần gạo không?"],
        [
          "A: No. We have a big bag of rice.",
          "A: Không. Có một túi gạo lớn rồi.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Có bao nhiêu trứng?",
          options: ["2", "3", "6"],
          answer: 2,
          hint: "we have six eggs là đồ có sẵn.",
        },
        {
          q: "Cần mua gì?",
          options: ["Hai chai sữa và ba táo", "Sáu trứng", "Một túi gạo"],
          answer: 0,
          hint: "We need … là danh sách mua.",
        },
        {
          q: "Vì sao không mua gạo?",
          options: ["Không thích", "Đã có một túi", "Cửa hàng đóng"],
          answer: 1,
          hint: "We have a big bag of rice.",
        },
      ],
      practiceQuiz: [
        {
          q: "Hai chai sữa.",
          options: [
            "two milks bottles",
            "two bottles of milk",
            "two bottle milk",
          ],
          answer: 1,
          hint: "bottles số nhiều; of milk nói thứ chứa bên trong.",
        },
        {
          q: "Hỏi số quả táo.",
          options: ["How many apples?", "How much apples?", "How old apples?"],
          answer: 0,
          hint: "many + danh từ đếm được số nhiều.",
        },
        {
          q: "We don’t have ___ rice.",
          options: ["a", "an", "any"],
          answer: 2,
          hint: "any thường dùng trong phủ định kiểu này.",
        },
      ],
      listening: {
        text: "Please buy four apples and one bottle of water. We have bread at home. The apples are three dollars in total. The water is one dollar.",
        translation:
          "Hãy mua bốn quả táo và một chai nước. Nhà đã có bánh mì. Táo tổng cộng ba đô. Nước một đô.",
        questions: [
          {
            q: "Cần mua bao nhiêu chai nước?",
            options: ["4", "3", "1"],
            answer: 2,
            hint: "one bottle of water.",
          },
          {
            q: "Tổng giá táo là bao nhiêu?",
            options: ["1 đô", "3 đô", "4 đô"],
            answer: 1,
            hint: "three dollars in total; không phải giá mỗi quả.",
          },
        ],
      },
      writing:
        "Nhà còn gạo nhưng hết nước và táo. Nhắn mua ba chai nước, bốn quả táo, không mua gạo. Hỏi tổng giá.",
      modelAnswer: [
        "We have rice, but we don’t have any water or apples. Please buy three bottles of water and four apples. How much is it in total?",
      ],
      rubric: [
        "Phân biệt còn/hết.",
        "Đúng ba chai và bốn quả.",
        "Hỏi giá tổng, không nhầm với số lượng.",
      ],
      speaking:
        "A có danh sách hai đồ, B là người bán. A hỏi có đồ không, nói số lượng. B nhắc lại đơn và giá giả. A sửa một số lượng nếu B nhắc sai. Đổi vai.",
      worked: [
        "Chọn đơn vị trước: nước đếm theo bottle trong đơn này.",
        "Ba chai → three bottles of water, không phải three waters trong bài cơ bản này.",
        "Đọc lại đơn trước khi trả tiền để phát hiện nhầm three/four.",
      ],
      coaching: {
        mistake:
          "Sai: two bottle of milk → two bottles of milk. Không dạy “mọi food đều không đếm được”: eggs/apples đếm được.",
        pronunciation:
          "Nghe và nói three, tree; three bắt đầu /θ/, đầu lưỡi gần răng, không rung như /z/. Ưu tiên người nghe hiểu đúng số.",
        recall:
          "Ngày sau, nhìn một danh sách khác, nhắn hai lượng và hỏi tổng giá.",
      },
    },
    {
      id: "a1-signs",
      title: "Biển báo và giờ mở cửa",
      canDo:
        "Tìm giờ, lối đi và điều không được làm trong thông báo ngắn; truyền lại bằng lời đơn giản.",
      glossary: [
        "open / closed = mở / đóng; entrance / exit = lối vào / ra",
        "upstairs / downstairs = trên tầng / dưới tầng; floor = tầng",
        "no food = không mang/ăn đồ ăn; quiet = yên lặng",
      ],
      patterns: [
        "Open from nine to five. = Mở từ chín đến năm. Closed on Sunday. = Đóng Chủ nhật.",
        "No food. / Don’t eat here. Hai cách nói điều không được làm trong bối cảnh này.",
        "Go upstairs. Turn right. Follow the sign. là hướng dẫn ngắn.",
        "First floor có quy ước khác nhau giữa nơi dùng tiếng Anh. Hỏi lại tầng thay vì suy từ tiếng Việt.",
      ],
      units: [
        ["What time does it open?", "Mấy giờ mở cửa?"],
        ["It is closed on Sunday.", "Nó đóng cửa Chủ nhật."],
        ["Please be quiet.", "Xin giữ yên lặng."],
        ["Where is the exit?", "Lối ra ở đâu?"],
      ],
      lines: [
        [
          "CITY LIBRARY — Open Monday to Saturday, 9 am–5 pm.",
          "THƯ VIỆN THÀNH PHỐ — Mở thứ Hai đến thứ Bảy, 9 giờ sáng–5 giờ chiều.",
        ],
        [
          "Closed on Sunday. No food in the reading room.",
          "Đóng Chủ nhật. Không ăn trong phòng đọc.",
        ],
        [
          "Books for children: upstairs. Toilets: downstairs, next to the exit.",
          "Sách trẻ em: trên tầng. Nhà vệ sinh: dưới tầng, cạnh lối ra.",
        ],
        [
          "Please be quiet. Ask at the desk for help.",
          "Xin giữ yên lặng. Hỏi tại quầy nếu cần giúp.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Có thể đến đọc lúc nào?",
          options: [
            "Chủ nhật 10 giờ",
            "Thứ Hai 10 giờ sáng",
            "Thứ Hai 7 giờ tối",
          ],
          answer: 1,
          hint: "Mở Mon–Sat, 9 am–5 pm.",
        },
        {
          q: "Sách trẻ em ở đâu?",
          options: ["Trên tầng", "Cạnh lối ra", "Ngoài cửa"],
          answer: 0,
          hint: "Books for children: upstairs.",
        },
        {
          q: "Điều nào không được làm trong phòng đọc?",
          options: ["Hỏi quầy", "Đọc sách", "Ăn"],
          answer: 2,
          hint: "No food in the reading room.",
        },
      ],
      practiceQuiz: [
        {
          q: "Closed on Sunday nghĩa là gì?",
          options: ["Chủ nhật mở", "Chỉ mở Chủ nhật", "Chủ nhật đóng"],
          answer: 2,
          hint: "Closed = đóng.",
        },
        {
          q: "Câu nào cùng ý No food ở phòng đọc?",
          options: ["Don’t eat here.", "Please eat here.", "Food is free."],
          answer: 0,
          hint: "Don’t eat here cấm ăn tại đây.",
        },
        {
          q: "Bạn không chắc first floor là tầng nào.",
          options: ["Tự đoán", "Hỏi Is it upstairs?", "Bỏ qua biển"],
          answer: 1,
          hint: "Hỏi một mốc cụ thể để tránh khác quy ước tầng.",
        },
      ],
      listening: {
        text: "The museum opens at ten in the morning and closes at four in the afternoon. It is closed on Monday. The cafe is upstairs. Please do not take photos.",
        translation:
          "Bảo tàng mở 10 giờ sáng, đóng 4 giờ chiều. Đóng thứ Hai. Quán cà phê ở trên tầng. Xin đừng chụp ảnh.",
        questions: [
          {
            q: "Bảo tàng đóng ngày nào?",
            options: ["Chủ nhật", "Thứ Hai", "Thứ Bảy"],
            answer: 1,
            hint: "closed on Monday.",
          },
          {
            q: "Khách không được làm gì?",
            options: ["Uống nước", "Lên tầng", "Chụp ảnh"],
            answer: 2,
            hint: "do not take photos.",
          },
        ],
      },
      writing:
        "Thẻ mới: Pool — open Tuesday–Sunday, 8 am–6 pm; closed Monday; entrance on the left. Nhắn cho bạn bằng tiếng Anh giờ mở, ngày đóng và lối vào. Sau đó giải thích biển bằng tiếng Việt cho người chưa biết tiếng Anh.",
      modelAnswer: [
        "The pool opens at eight in the morning and closes at six in the evening. It is closed on Monday. The entrance is on the left.",
      ],
      rubric: [
        "Đúng giờ mở và đóng, có phân biệt sáng/tối.",
        "Đúng thứ Hai đóng cửa.",
        "Lối vào bên trái; bản giải thích Việt giữ nguyên thông tin.",
      ],
      speaking:
        "A giữ thẻ Pool, B không nhìn. B hỏi giờ, ngày đóng và lối vào; A đáp chậm. B nhắc lại kế hoạch đến, A kiểm xem kế hoạch có trong giờ mở không. Đổi vai với thẻ Museum từ đoạn nghe.",
      worked: [
        "Đọc nhãn open/closed trước số để biết số nói về việc gì.",
        "Open 8 am–6 pm: đổi thành opens at eight … closes at six.",
        "Chuyển cho bạn bằng tiếng Việt vẫn phải giữ buổi sáng/tối và ngày đóng.",
      ],
      coaching: {
        mistake:
          "Nhầm 5 pm thành 5 am khiến đến sai giờ. Luôn giữ am/pm hoặc morning/afternoon khi nguồn nói rõ.",
        pronunciation:
          "Đọc open và closed theo từ, không đọc nhãn như từng chữ cái. Nói rõ not trong do not take photos.",
        recall:
          "Ngày sau, chọn một biển giờ khác, nhắn thông tin bằng tiếng Anh và giải thích lại bằng tiếng Việt.",
      },
    },
    {
      id: "a1-postcard",
      title: "Lời nhắn và bưu thiếp ngắn",
      canDo:
        "Viết lời chào ngắn về nơi ở, thời tiết và hoạt động; phản hồi tin nhắn lịch sự.",
      glossary: [
        "dear = gửi/thân gửi; wish = ước; here = ở đây; beach = bãi biển",
        "holiday = kỳ nghỉ; lovely = đẹp/dễ mến; see you soon = hẹn sớm gặp",
        "thanks = cảm ơn; sorry = xin lỗi",
      ],
      patterns: [
        "Hi/Hello + tên mở tin thân mật; See you soon kết tin.",
        "I am in Hue. It is sunny. I am visiting my aunt. Mỗi câu một ý, không cần nối tất cả thành câu dài.",
        "and nối ý thêm; but nối hai ý tương phản: It is sunny, but it is cold.",
        "Thanks for your message. / Sorry, I can’t come. phản hồi ngắn, rõ.",
      ],
      units: [
        ["Thanks for your message.", "Cảm ơn tin nhắn của bạn."],
        ["I am on holiday.", "Tôi đang đi nghỉ."],
        ["The weather is lovely.", "Thời tiết rất đẹp."],
        ["See you soon.", "Hẹn sớm gặp lại."],
      ],
      lines: [
        ["Hi Ben,", "Chào Ben,"],
        [
          "I am in Da Nang with my sister. We are staying near the beach.",
          "Tôi ở Đà Nẵng với chị. Chúng tôi ở gần bãi biển.",
        ],
        [
          "It is sunny, but the water is cold. I am reading a book. My sister is swimming.",
          "Trời nắng nhưng nước lạnh. Tôi đang đọc sách. Chị đang bơi.",
        ],
        [
          "Are you at home? See you soon! Mai",
          "Bạn đang ở nhà không? Hẹn sớm gặp! Mai",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Mai đi với ai?",
          options: ["Ben", "Chị", "Bố"],
          answer: 1,
          hint: "with my sister.",
        },
        {
          q: "Mai đang làm gì?",
          options: ["Bơi", "Đọc sách", "Nấu ăn"],
          answer: 1,
          hint: "I am reading; my sister is swimming.",
        },
        {
          q: "Câu nào mô tả đúng?",
          options: ["Nắng nhưng nước lạnh", "Mưa và lạnh", "Nước ấm"],
          answer: 0,
          hint: "sunny, but the water is cold.",
        },
      ],
      practiceQuiz: [
        {
          q: "Nối hai ý tương phản: nắng ___ lạnh.",
          options: ["and then", "because", "but"],
          answer: 2,
          hint: "but làm rõ sự tương phản trong ví dụ.",
        },
        {
          q: "Đáp lại tin nhắn lịch sự.",
          options: [
            "Thanks for your message.",
            "Thank message your.",
            "You message thanks.",
          ],
          answer: 0,
          hint: "Thanks for + điều mình cảm ơn.",
        },
        {
          q: "Chọn câu mô tả đúng nơi đang ở.",
          options: ["I in Hue.", "I am in Hue.", "I am Hue in."],
          answer: 1,
          hint: "I + am + in + địa điểm.",
        },
      ],
      listening: {
        text: "Hi Mai. Thanks for your message. I am at home with my father. It is raining here. We are cooking dinner. Have a good holiday. See you soon.",
        translation:
          "Chào Mai. Cảm ơn tin nhắn. Tôi ở nhà với bố. Ở đây đang mưa. Chúng tôi đang nấu bữa tối. Chúc kỳ nghỉ vui. Hẹn sớm gặp.",
        questions: [
          {
            q: "Người nói ở với ai?",
            options: ["Chị", "Mai", "Bố"],
            answer: 2,
            hint: "with my father.",
          },
          {
            q: "Hai người đang làm gì?",
            options: ["Đọc", "Nấu bữa tối", "Đi bơi"],
            answer: 1,
            hint: "We are cooking dinner.",
          },
        ],
      },
      writing:
        "Viết bưu thiếp ngắn từ Huế: đi với một người bạn, trời mưa, đang uống trà. Chào người nhận, kể ba thông tin, hỏi người nhận đang làm gì và kết tin. Dùng tên giả.",
      modelAnswer: [
        "Hi Lan. I am in Hue with my friend. It is raining. We are drinking tea. What are you doing? See you soon! An",
      ],
      rubric: [
        "Có chào và kết tin.",
        "Đúng nơi, người đi cùng, thời tiết và hoạt động.",
        "Người nhận hiểu và có câu để trả lời.",
      ],
      speaking:
        "A kể tình huống kỳ nghỉ giả bằng ba câu. B nghe, hỏi một thông tin thiếu và phản hồi tích cực bằng câu đơn giản. B kể tình huống khác; A hỏi lại. Không đọc nguyên bưu thiếp.",
      worked: [
        "Lập ba ô: nơi — thời tiết — hoạt động. Hue — raining — drinking tea.",
        "Viết từng câu: I am in Hue. It is raining. I am drinking tea.",
        "Thêm Hi Lan và một câu hỏi; kiểm lại xem người đọc biết ai đang ở đâu không.",
      ],
      coaching: {
        mistake:
          "Không viết mọi ý liền nhau không dấu câu. Chia thành câu ngắn giúp người nhận hiểu, không cần từ nối khó.",
        pronunciation:
          "Ngắt nhẹ giữa từng ý. Nói rõ Hue / home / who đi cùng để người nghe lấy được thông tin, không cần bắt chước giọng bản ngữ.",
        recall:
          "Ngày sau viết một tin mới ở nơi khác trước khi mở mẫu, nhờ người đọc nói lại thông tin họ hiểu.",
      },
    },
    {
      id: "a1-checkpoint-people",
      title: "Ôn chặng 1 · Gặp người mới",
      canDo:
        "Kết hợp chào hỏi, thông tin liên hệ và giới thiệu người thân trong một cuộc gặp mới.",
      glossary: [
        "welcome = chào mừng; surname = họ; daughter = con gái",
        "class = lớp học; room = phòng; phone number = số điện thoại",
      ],
      patterns: [
        "Ôn: I am / She is; my / her; What is your name?",
        "Số điện thoại đọc từng chữ số, không đọc như một số đếm lớn.",
        "Xin nhắc và xác nhận: Could you say that again? Is that …?",
      ],
      units: [
        ["Welcome to the class.", "Chào mừng đến lớp."],
        ["Is that your surname?", "Đó là họ của bạn phải không?"],
        ["This is my daughter.", "Đây là con gái tôi."],
        ["We are in room three.", "Chúng ta ở phòng ba."],
      ],
      lines: [
        [
          "Staff: Welcome. What is your name?",
          "Nhân viên: Chào mừng. Bạn tên gì?",
        ],
        [
          "Linh: I am Linh Tran. This is my daughter, Hoa. She is ten.",
          "Linh: Tôi là Linh Trần. Đây là con gái Hoa, mười tuổi.",
        ],
        [
          "Staff: How do you spell your surname?",
          "Nhân viên: Bạn đánh vần họ thế nào?",
        ],
        [
          "Linh: T-R-A-N. My phone number is 071 240 368.",
          "Linh: T-R-A-N. Số của tôi là 071 240 368.",
        ],
        [
          "Staff: Thank you. Your class is in room three.",
          "Nhân viên: Cảm ơn. Lớp ở phòng ba.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Hoa là ai?",
          options: ["Con gái Linh", "Giáo viên", "Mẹ Linh"],
          answer: 0,
          hint: "This is my daughter, Hoa.",
        },
        {
          q: "Tran là tên hay họ?",
          options: ["Tên", "Họ", "Tên lớp"],
          answer: 1,
          hint: "Nhân viên hỏi surname; Linh đánh vần TRAN.",
        },
        {
          q: "Lớp ở phòng nào?",
          options: ["10", "7", "3"],
          answer: 2,
          hint: "room three, không chọn tuổi ten.",
        },
      ],
      practiceQuiz: [
        {
          q: "Thay Linh bằng she: Linh is a student.",
          options: ["She is a student.", "She am student.", "Her is student."],
          answer: 0,
          hint: "She là chủ ngữ; her không thay she ở đây.",
        },
        {
          q: "Xin nhắc lại số chưa nghe rõ.",
          options: ["What is room?", "Could you say that again?", "I ten."],
          answer: 1,
          hint: "Xin nhắc lại thay vì tự đoán.",
        },
        {
          q: "This is ___ daughter. Tôi giới thiệu con mình.",
          options: ["I", "me", "my"],
          answer: 2,
          hint: "my đứng trước danh từ daughter.",
        },
      ],
      listening: {
        text: "Hello. I am Sam Lee. Lee is my surname: L-E-E. My son is Ben. He is eight. We are in room five.",
        translation:
          "Xin chào. Tôi là Sam Lee. Họ tôi là Lee: L-E-E. Con trai tôi là Ben, tám tuổi. Chúng tôi ở phòng năm.",
        questions: [
          {
            q: "Ben bao nhiêu tuổi?",
            options: ["5", "8", "10"],
            answer: 1,
            hint: "He is eight, khác room five.",
          },
          {
            q: "Họ người nói là gì?",
            options: ["Lee", "Sam", "Ben"],
            answer: 0,
            hint: "Lee is my surname.",
          },
        ],
      },
      writing:
        "Thẻ mới giả: An Nguyen; con trai Binh, 9 tuổi; lớp phòng 4. Viết lời giới thiệu hai người và phòng học; thêm một câu hỏi tên người nhận.",
      modelAnswer: [
        "Hello. I am An Nguyen. This is my son, Binh. He is nine. Our class is in room four. What is your name?",
      ],
      rubric: [
        "Đúng người, quan hệ và tuổi.",
        "Phòng 4 không bị nhầm thành tuổi 9.",
        "Có câu hỏi để người nhận đáp.",
        "Thử trước khi xem mẫu; nếu dùng bảng từ, tự ghi hỗ trợ đã dùng.",
      ],
      speaking:
        "A là nhân viên, B dùng thẻ viết mới. A hỏi tên, đánh vần họ, quan hệ và tuổi người đi cùng. B trả lời và xin nhắc ít nhất một câu. A ghi thông tin nghe được, B đối chiếu; đổi vai.",
      worked: [
        "Tách người lớn và trẻ: An — Nguyen; Binh — son — nine.",
        "Viết I am An Nguyen. This is my son, Binh. He is nine. Không gán tuổi cho An.",
        "Thêm phòng học và câu hỏi người đối diện; người đọc nhắc lại chi tiết để kiểm.",
      ],
      coaching: {
        mistake:
          "Dễ lấy room five làm tuổi. Gắn mỗi số với nhãn age/room/phone trước khi trả lời.",
        pronunciation:
          "Khi đánh vần, ngắt giữa các chữ, rồi nói lại cả tên; dùng người nghe xác nhận, không dựa vào tự tick.",
        recall:
          "Ngày sau dùng tên, quan hệ và tuổi khác. Nếu quên am/is → bài Giới thiệu; nhầm chữ/số → bài Liên hệ; thiếu câu hỏi → bài Hỏi lại.",
      },
    },
    {
      id: "a1-checkpoint-daily",
      title: "Ôn chặng 2 · Một ngày của người bạn",
      canDo:
        "Đọc hồ sơ ngắn, hỏi về nhà, đồ dùng và lịch làm việc rồi giới thiệu lại đúng người.",
      glossary: [
        "small = nhỏ; near = gần; clinic = phòng khám; kitchen = bếp",
        "usually = thường; Sunday = Chủ nhật; next to = cạnh",
      ],
      patterns: [
        "Ôn: She is … / She has … / She works … dùng cho ba loại thông tin khác nhau.",
        "There is/are mô tả thứ có ở một nơi; has mô tả người có gì.",
        "Do/does hỏi sinh hoạt, không thêm s vào động từ sau does.",
      ],
      units: [
        ["She lives near the park.", "Cô ấy sống gần công viên."],
        ["There is a desk in her room.", "Có bàn trong phòng cô ấy."],
        ["Does she work on Sunday?", "Cô ấy làm Chủ nhật không?"],
        ["She has a black bag.", "Cô ấy có túi đen."],
      ],
      lines: [
        [
          "Mina is a nurse. She works in a clinic from Monday to Friday.",
          "Mina là điều dưỡng. Cô làm ở phòng khám từ thứ Hai đến thứ Sáu.",
        ],
        [
          "She starts at eight. She usually walks to work.",
          "Cô bắt đầu lúc tám giờ, thường đi bộ đi làm.",
        ],
        [
          "She lives in a small flat near the park. There is a desk next to her bed.",
          "Cô sống trong căn hộ nhỏ gần công viên. Có bàn cạnh giường.",
        ],
        [
          "Her black bag is under the desk. On Sunday, she visits her mother.",
          "Túi đen ở dưới bàn. Chủ nhật cô thăm mẹ.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Mina thường đi làm thế nào?",
          options: ["Xe buýt", "Đi bộ", "Xe đạp"],
          answer: 1,
          hint: "usually walks to work.",
        },
        {
          q: "Túi nằm ở đâu?",
          options: ["Dưới bàn", "Trên giường", "Trong bếp"],
          answer: 0,
          hint: "under the desk.",
        },
        {
          q: "Chủ nhật Mina làm gì?",
          options: ["Làm phòng khám", "Đi học", "Thăm mẹ"],
          answer: 2,
          hint: "visits her mother, không phải lịch làm Mon–Fri.",
        },
      ],
      practiceQuiz: [
        {
          q: "Hỏi giờ cô ấy bắt đầu.",
          options: [
            "What time she starts?",
            "What time does she start?",
            "What time is start she?",
          ],
          answer: 1,
          hint: "does + she + start.",
        },
        {
          q: "Có một bàn trong phòng.",
          options: [
            "There is a desk in the room.",
            "She is a desk.",
            "There are a desk.",
          ],
          answer: 0,
          hint: "There is cho một vật ở nơi nào đó.",
        },
        {
          q: "She ___ a black bag.",
          options: ["is", "are", "has"],
          answer: 2,
          hint: "has nói sở hữu, không dùng is.",
        },
      ],
      listening: {
        text: "Tom is a teacher. He starts work at nine. He usually takes the bus. His blue bag is on the kitchen table. He does not work on Saturday.",
        translation:
          "Tom là giáo viên, bắt đầu làm lúc chín giờ. Anh thường đi xe buýt. Túi xanh trên bàn bếp. Anh không làm thứ Bảy.",
        questions: [
          {
            q: "Tom bắt đầu lúc nào?",
            options: ["8", "9", "7"],
            answer: 1,
            hint: "starts work at nine.",
          },
          {
            q: "Túi Tom ở đâu?",
            options: ["Dưới bàn", "Cạnh giường", "Trên bàn bếp"],
            answer: 2,
            hint: "on the kitchen table.",
          },
        ],
      },
      writing:
        "Thẻ mới: Lan, giáo viên; bắt đầu 7:30; thường đi xe buýt; túi đỏ trên ghế; Chủ nhật ở nhà. Nhắn cho bạn giới thiệu Lan và vị trí túi. Hỏi người nhận có làm Chủ nhật không.",
      modelAnswer: [
        "Lan is a teacher. She starts at seven thirty. She usually takes the bus. Her red bag is on the chair. She is at home on Sunday. Do you work on Sunday?",
      ],
      rubric: [
        "Đúng nghề, giờ và phương tiện.",
        "Đúng màu và vị trí đồ.",
        "Không nhầm người được giới thiệu với người nhận câu hỏi.",
      ],
      speaking:
        "A đọc thẻ Lan một lần rồi giấu. B hỏi nghề, giờ, phương tiện và túi ở đâu. A trả lời, được xin nhắc câu hỏi. B nhắc lại hồ sơ rồi đối chiếu thẻ; đổi vai với thẻ Tom.",
      worked: [
        "Lập ba nhóm: người/nghề; lịch; đồ/vị trí.",
        "Lan is a teacher. She starts at seven thirty. Her bag is on the chair.",
        "Kiểm mỗi câu đúng một nhóm; thêm usually nếu chỉ là thói quen thông thường.",
      ],
      coaching: {
        mistake:
          "Đừng dùng She is a bag khi muốn nói có túi: She has a bag. Với vị trí: Her bag is on the chair.",
        pronunciation:
          "Nói rõ starts at seven thirty; thử để người nghe viết 7:30. Phân biệt thirty và thirteen bằng xác nhận số.",
        recall:
          "Ngày sau đổi toàn bộ giờ/màu/vị trí. Nhầm has/is → Sở hữu; nhầm does/s → Công việc; nhầm usually/never → Tần suất.",
      },
    },
    {
      id: "a1-checkpoint-services",
      title: "Ôn chặng 4 · Mua đúng thứ cần",
      canDo:
        "Kết hợp gọi món, số lượng, giá và yêu cầu giúp đỡ trong một giao dịch mới.",
      glossary: [
        "total = tổng; each = mỗi cái; bottle = chai; change = tiền thối lại",
        "small / large = nhỏ / lớn; help = giúp; need = cần",
      ],
      patterns: [
        "Can I have …, please? yêu cầu đồ; How much is it in total? hỏi tổng.",
        "One bottle / two bottles: số lượng ảnh hưởng dạng danh từ.",
        "Sorry, I need …, not … sửa đơn lịch sự; đọc lại chi tiết cuối đã đồng ý.",
      ],
      units: [
        ["How much is it in total?", "Tổng cộng bao nhiêu?"],
        ["I need two, not three.", "Tôi cần hai, không phải ba."],
        ["Can you help me, please?", "Bạn giúp tôi được không?"],
        ["A small tea, please.", "Cho tôi một trà nhỏ."],
      ],
      lines: [
        [
          "Customer: Can I have two bottles of water and a small tea, please?",
          "Khách: Cho tôi hai chai nước và một trà nhỏ.",
        ],
        [
          "Server: Three bottles and a large tea?",
          "Nhân viên: Ba chai và trà lớn?",
        ],
        [
          "Customer: No, two bottles and a small tea.",
          "Khách: Không, hai chai và trà nhỏ.",
        ],
        [
          "Server: Sorry. Water is one dollar a bottle. A small tea is two dollars. Four dollars in total.",
          "Nhân viên: Xin lỗi. Nước một đô một chai. Trà nhỏ hai đô. Tổng bốn đô.",
        ],
        [
          "Customer: Thank you. Can I sit here?",
          "Khách: Cảm ơn. Tôi ngồi đây được không?",
        ],
        ["Server: Yes, of course.", "Nhân viên: Vâng, được chứ."],
      ],
      scenarioQuiz: [
        {
          q: "Đơn cuối có mấy chai nước?",
          options: ["3", "2", "1"],
          answer: 1,
          hint: "Khách sửa: two bottles.",
        },
        {
          q: "Cỡ trà cuối là gì?",
          options: ["Nhỏ", "Lớn", "Không gọi trà"],
          answer: 0,
          hint: "a small tea, không lấy lời nhắc sai của nhân viên.",
        },
        {
          q: "Tổng giá được báo?",
          options: ["2 đô", "3 đô", "4 đô"],
          answer: 2,
          hint: "Four dollars in total.",
        },
      ],
      practiceQuiz: [
        {
          q: "Nhân viên nhắc three, bạn muốn two.",
          options: [
            "Yes, three.",
            "Sorry, two, not three.",
            "I three two yes.",
          ],
          answer: 1,
          hint: "Sửa rõ số sai và số đúng.",
        },
        {
          q: "Hỏi tổng giá.",
          options: [
            "How much is it in total?",
            "How many is the price?",
            "Where money?",
          ],
          answer: 0,
          hint: "How much … in total hỏi tổng tiền.",
        },
        {
          q: "Được phép ngồi: Can I sit here? Đáp phù hợp.",
          options: ["Yes, I tea.", "No water two.", "Yes, of course."],
          answer: 2,
          hint: "Đáp yes làm rõ được ngồi.",
        },
      ],
      listening: {
        text: "I would like three apples and one bottle of water, please. The apples are two dollars in total. The water is one dollar. That is three dollars altogether.",
        translation:
          "Tôi muốn ba quả táo và một chai nước. Táo tổng hai đô, nước một đô. Tất cả ba đô.",
        questions: [
          {
            q: "Có bao nhiêu táo?",
            options: ["2", "1", "3"],
            answer: 2,
            hint: "three apples.",
          },
          {
            q: "Tổng tất cả bao nhiêu?",
            options: ["2 đô", "3 đô", "1 đô"],
            answer: 1,
            hint: "three dollars altogether.",
          },
        ],
      },
      writing:
        "Thẻ mua mới: hai bánh mì giá 2 đô mỗi cái, một chai nước 1 đô. Nhắn đặt hàng đủ số lượng, hỏi xác nhận tổng và xin một chỗ ngồi. Tổng mẫu dùng để tự đối chiếu, không phải bài thi toán.",
      modelAnswer: [
        "Can I have two sandwiches and one bottle of water, please? Is that five dollars in total? Can I sit here?",
      ],
      rubric: [
        "Đúng hai bánh và một chai.",
        "Tổng 5 đô nếu tự tính; không nhầm giá mỗi cái với giá tổng.",
        "Có yêu cầu lịch sự và xin chỗ ngồi.",
      ],
      speaking:
        "A mua theo thẻ mới, B nhắc sai một số lượng có chủ ý. A sửa; B nhắc lại đúng và báo giá. A xác nhận và xin chỗ ngồi. Đổi vai; người nghe ghi đơn cuối thay vì đơn nhắc sai.",
      worked: [
        "Đọc two sandwiches, each two dollars: giá một cái khác giá hai cái.",
        "Gọi: two sandwiches and one bottle of water. Sau đó hỏi Is that five dollars in total?",
        "Nếu người bán nhắc sai, sửa trước khi đồng ý; không chỉ nói yes cho xong.",
      ],
      coaching: {
        mistake:
          "Đơn nhắc lại sai chưa phải đơn đã chốt. Kiểm lời sửa và xác nhận cuối như khi đổi giờ hẹn.",
        pronunciation:
          "Nói rõ TWO sandwiches và ONE bottle. Có thể nhấn số để sửa hiểu nhầm, rồi nói lại cả cụm.",
        recall:
          "Ngày sau đổi đồ và số lượng. Nhầm số lượng → Lượng đồ ăn; nhầm cỡ → Gọi món/Mua sắm; khó xin giúp → Nhu cầu.",
      },
    },
    {
      id: "a1-past-places",
      title: "Hôm qua ở đâu · was và were",
      canDo: "Nói mình và người khác đã ở đâu, phân biệt hôm qua với hôm nay.",
      glossary: [
        "yesterday = hôm qua; last night = tối qua; today = hôm nay",
        "at home = ở nhà; busy = bận; tired = mệt; late = muộn",
      ],
      patterns: [
        "Hôm nay I am; hôm qua I was. He/she/it was; you/we/they were.",
        "I was at home yesterday. They were at school. Không thêm am vào was.",
        "Were you at home? Yes, I was. / No, I wasn’t.",
        "She wasn’t tired. = Cô ấy đã không mệt. Dùng thời điểm để người nghe biết đang nói hôm nào.",
      ],
      units: [
        ["Where were you yesterday?", "Hôm qua bạn ở đâu?"],
        ["I was at home.", "Tôi đã ở nhà."],
        ["We were at school.", "Chúng tôi đã ở trường."],
        ["It was cold yesterday.", "Hôm qua trời lạnh."],
      ],
      lines: [
        ["Lan: Where were you yesterday, Ben?", "Lan: Hôm qua bạn ở đâu, Ben?"],
        [
          "Ben: I was at home in the morning. I was tired.",
          "Ben: Buổi sáng tôi ở nhà. Tôi mệt.",
        ],
        [
          "Lan: Were you at home in the afternoon too?",
          "Lan: Buổi chiều bạn cũng ở nhà à?",
        ],
        [
          "Ben: No. I was at the park with my sister. It was sunny.",
          "Ben: Không. Tôi ở công viên với chị. Trời có nắng.",
        ],
        [
          "Lan: I was at school. Today I am at home.",
          "Lan: Tôi đã ở trường. Hôm nay tôi ở nhà.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Ben ở đâu sáng hôm qua?",
          options: ["Công viên", "Ở nhà", "Ở trường"],
          answer: 1,
          hint: "at home in the morning.",
        },
        {
          q: "Ben đi công viên với ai?",
          options: ["Chị", "Lan", "Bố"],
          answer: 0,
          hint: "with my sister.",
        },
        {
          q: "Lan ở nhà vào lúc nào được nói rõ?",
          options: ["Hôm qua sáng", "Hôm qua chiều", "Hôm nay"],
          answer: 2,
          hint: "Today I am at home, khác I was at school.",
        },
      ],
      practiceQuiz: [
        {
          q: "They ___ at home yesterday.",
          options: ["was", "were", "am"],
          answer: 1,
          hint: "They đi với were.",
        },
        {
          q: "Hỏi hôm qua bạn ở trường không.",
          options: [
            "Were you at school yesterday?",
            "Was you at school yesterday?",
            "Are yesterday you school?",
          ],
          answer: 0,
          hint: "You đi với were, đưa were lên đầu câu hỏi.",
        },
        {
          q: "Đổi hôm nay sang hôm qua: I am tired.",
          options: [
            "I am was tired yesterday.",
            "I were tired yesterday.",
            "I was tired yesterday.",
          ],
          answer: 2,
          hint: "Thay am bằng was; không dùng cả hai.",
        },
      ],
      listening: {
        text: "Yesterday morning, I was at the library. My parents were at home. In the evening, we were at a cafe. It was cold outside.",
        translation:
          "Sáng hôm qua tôi ở thư viện. Bố mẹ ở nhà. Buổi tối chúng tôi ở quán cà phê. Bên ngoài trời lạnh.",
        questions: [
          {
            q: "Người nói ở đâu sáng hôm qua?",
            options: ["Thư viện", "Nhà", "Quán"],
            answer: 0,
            hint: "Yesterday morning … library.",
          },
          {
            q: "Buổi tối họ ở đâu?",
            options: ["Công viên", "Quán cà phê", "Trường"],
            answer: 1,
            hint: "In the evening … cafe.",
          },
        ],
      },
      writing:
        "Thẻ giả hôm qua: sáng bạn ở trường; tối bạn và chị ở nhà; trời lạnh. Viết 3 câu rồi hỏi người nhận hôm qua ở đâu.",
      modelAnswer: [
        "I was at school yesterday morning. My sister and I were at home in the evening. It was cold. Where were you yesterday?",
      ],
      rubric: [
        "Đúng nơi theo từng thời điểm.",
        "I/it dùng was, nhóm người dùng were.",
        "Có câu hỏi về hôm qua.",
      ],
      speaking:
        "A chọn hai nơi đã ở hôm qua (giả). B hỏi sáng/tối, A trả lời. B kể lại bằng You were … rồi A xác nhận. Đổi vai; nói rõ là chuyện giả để luyện.",
      worked: [
        "Gắn thời gian trước: yesterday morning khác today.",
        "I am at school today. → I was at school yesterday.",
        "Đổi thành nhóm: We were at school. Hỏi: Were you at school?",
      ],
      coaching: {
        mistake:
          "Sai: I did was at home. → I was at home. Was/were tự tạo câu hỏi/phủ định, không cần did trong mẫu này.",
        pronunciation:
          "Was/were thường nói nhẹ, nhưng giữ rõ wasn’t/weren’t khi phủ định. Nhờ người nghe xác nhận đúng nơi.",
        recall:
          "Ngày sau kể hai vị trí giả mới; người nghe phân biệt được hôm qua với hôm nay.",
      },
    },
    {
      id: "a1-past-actions",
      title: "Kể một việc đã làm",
      canDo:
        "Kể vài việc đơn giản đã hoàn tất và hỏi lại về cuối tuần bằng mẫu quá khứ cơ bản.",
      glossary: [
        "yesterday = hôm qua; last Sunday = Chủ nhật trước; visited = đã thăm",
        "watched = đã xem; played = đã chơi; went = đã đi; had = đã có/ăn",
        "after = sau; then = sau đó; bought = đã mua; walked = đã đi bộ",
      ],
      patterns: [
        "I visited my aunt yesterday. Nhiều động từ thêm -ed để kể việc đã qua.",
        "Một số từ đổi khác: go → went; have → had. Học đúng từ trong câu, không thêm ed vào tất cả.",
        "Did you watch TV? No, I didn’t. I didn’t watch TV. Sau did/didn’t dùng dạng gốc watch.",
        "First … Then … dùng để kể thứ tự bằng câu ngắn; không cần kể chuyện dài ở bài này.",
      ],
      units: [
        ["What did you do yesterday?", "Hôm qua bạn làm gì?"],
        ["I visited my aunt.", "Tôi đã thăm dì."],
        ["I went to the park.", "Tôi đã đi công viên."],
        ["I didn’t watch TV.", "Tôi đã không xem TV."],
      ],
      lines: [
        [
          "Sam: What did you do last Sunday?",
          "Sam: Chủ nhật trước bạn làm gì?",
        ],
        [
          "An: I visited my aunt in the morning. We had lunch at her house.",
          "An: Sáng tôi thăm dì. Chúng tôi ăn trưa ở nhà dì.",
        ],
        ["Sam: Did you watch TV?", "Sam: Bạn có xem TV không?"],
        [
          "An: No, I didn’t. After lunch, I went to the park and played football.",
          "An: Không. Sau bữa trưa tôi đi công viên và chơi bóng đá.",
        ],
        [
          "Sam: I stayed at home and watched a film.",
          "Sam: Tôi ở nhà và xem phim.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "An thăm ai?",
          options: ["Mẹ", "Dì", "Sam"],
          answer: 1,
          hint: "visited my aunt.",
        },
        {
          q: "An làm gì sau ăn trưa?",
          options: ["Xem TV", "Về nhà", "Đi công viên chơi bóng"],
          answer: 2,
          hint: "After lunch … went to the park and played football.",
        },
        {
          q: "Ai xem phim?",
          options: ["Sam", "An", "Dì An"],
          answer: 0,
          hint: "Sam: watched a film.",
        },
      ],
      practiceQuiz: [
        {
          q: "Did she ___ to the park?",
          options: ["went", "go", "goes"],
          answer: 1,
          hint: "Sau did dùng go, không went.",
        },
        {
          q: "Sửa I goed home.",
          options: ["I went home.", "I did went home.", "I was go home."],
          answer: 0,
          hint: "Quá khứ go là went.",
        },
        {
          q: "Phủ định việc đã xem TV.",
          options: [
            "I not watched TV.",
            "I didn’t watched TV.",
            "I didn’t watch TV.",
          ],
          answer: 2,
          hint: "didn’t + watch dạng gốc.",
        },
      ],
      listening: {
        text: "Yesterday I visited my brother. We cooked rice and had lunch. Then we walked to a shop. I bought water, but I did not buy tea.",
        translation:
          "Hôm qua tôi thăm anh. Chúng tôi nấu cơm, ăn trưa rồi đi bộ đến cửa hàng. Tôi mua nước nhưng không mua trà.",
        questions: [
          {
            q: "Họ làm gì trước khi đi cửa hàng?",
            options: ["Ăn trưa", "Xem phim", "Chơi bóng"],
            answer: 0,
            hint: "had lunch, then walked to a shop.",
          },
          {
            q: "Người nói không mua gì?",
            options: ["Nước", "Gạo", "Trà"],
            answer: 2,
            hint: "did not buy tea.",
          },
        ],
      },
      writing:
        "Thẻ giả hôm qua: thăm bạn, đi công viên, không xem TV. Viết ba việc rồi hỏi người nhận đã làm gì. Dùng mẫu động từ đã học.",
      modelAnswer: [
        "I visited my friend yesterday. We went to the park. I didn’t watch TV. What did you do yesterday?",
      ],
      rubric: [
        "Truyền đúng việc làm và không làm.",
        "Sau didn’t/did dùng dạng gốc.",
        "Có thời điểm quá khứ và câu hỏi người nhận.",
      ],
      speaking:
        "A chọn ba việc giả đã làm, B hỏi What did you do? và Did you …? A trả lời; B nhắc lại thứ tự. Đổi vai, có ít nhất một câu trả lời No, I didn’t.",
      worked: [
        "Thời gian yesterday; hành động visit/go/watch.",
        "Câu khẳng định: visited / went / watched.",
        "Câu hỏi/phủ định có did: Did you go? I didn’t go. Không dùng went sau did.",
      ],
      coaching: {
        mistake:
          "Không thêm ed vào go: went là dạng cần học riêng. Đừng nhầm I was at the park (ở đâu) với I went to the park (đi đâu).",
        pronunciation:
          "-ed không luôn thành một âm tiết: watched /t/, played /d/, visited /ɪd/. Nghe mẫu từng từ, ưu tiên giữ thông tin thời gian rõ.",
        recall:
          "Ngày sau kể hai hành động giả mới và một điều không làm; nếu quên động từ, quay lại mẫu thay vì tự tạo goed.",
      },
    },
    {
      id: "a1-plans",
      title: "Kế hoạch gần và lời rủ",
      canDo:
        "Nói một kế hoạch gần bằng going to và hỏi bạn có muốn tham gia không.",
      glossary: [
        "tomorrow = ngày mai; next week = tuần sau; tonight = tối nay",
        "visit = thăm; meet = gặp; stay = ở lại; plan = kế hoạch",
      ],
      patterns: [
        "I am going to visit my aunt tomorrow. = Tôi định thăm dì ngày mai.",
        "He is going to cook. We are going to meet. Sau going to dùng động từ nguyên mẫu.",
        "Are you going to study tonight? No, I’m not. Câu hỏi đảo be lên đầu.",
        "Do you want to come? là lời rủ. Kế hoạch chưa xảy ra khác việc đang làm bây giờ.",
      ],
      units: [
        ["What are you going to do tomorrow?", "Ngày mai bạn định làm gì?"],
        ["I am going to visit my friend.", "Tôi định thăm bạn."],
        ["Do you want to come?", "Bạn muốn đi cùng không?"],
        ["We are going to meet at ten.", "Chúng tôi định gặp lúc mười giờ."],
      ],
      lines: [
        [
          "Linh: What are you going to do tomorrow?",
          "Linh: Ngày mai bạn định làm gì?",
        ],
        [
          "Bo: I am going to visit the museum with my brother.",
          "Bo: Tôi định đi bảo tàng với anh.",
        ],
        [
          "Linh: What time are you going to meet?",
          "Linh: Các bạn định gặp lúc nào?",
        ],
        [
          "Bo: At ten in the morning, at the museum entrance. Do you want to come?",
          "Bo: Mười giờ sáng ở lối vào bảo tàng. Bạn muốn đi cùng không?",
        ],
        [
          "Linh: Sorry, I can’t. I am going to study at home.",
          "Linh: Xin lỗi, tôi không đi được. Tôi định học ở nhà.",
        ],
      ],
      scenarioQuiz: [
        {
          q: "Bo định đi đâu?",
          options: ["Trường", "Bảo tàng", "Công viên"],
          answer: 1,
          hint: "visit the museum.",
        },
        {
          q: "Bo hẹn anh lúc nào?",
          options: ["10 giờ sáng", "10 giờ tối", "2 giờ chiều"],
          answer: 0,
          hint: "ten in the morning.",
        },
        {
          q: "Linh có tham gia không?",
          options: ["Có", "Chưa trả lời", "Không, định học ở nhà"],
          answer: 2,
          hint: "Sorry, I can’t … study at home.",
        },
      ],
      practiceQuiz: [
        {
          q: "We ___ going to meet.",
          options: ["is", "are", "am"],
          answer: 1,
          hint: "We đi với are.",
        },
        {
          q: "Sau going to, chọn dạng phù hợp.",
          options: ["visit", "visited", "visiting"],
          answer: 0,
          hint: "going to + động từ nguyên mẫu visit.",
        },
        {
          q: "Bạn muốn rủ người nghe đi cùng.",
          options: ["Where come?", "You coming to do?", "Do you want to come?"],
          answer: 2,
          hint: "Do you want to come? là lời rủ ngắn.",
        },
      ],
      listening: {
        text: "Tomorrow I am going to cook lunch at home. My sister is going to visit me at twelve. We are going to walk in the park after lunch.",
        translation:
          "Ngày mai tôi định nấu bữa trưa ở nhà. Chị sẽ đến thăm lúc mười hai giờ. Sau bữa trưa chúng tôi định đi bộ trong công viên.",
        questions: [
          {
            q: "Chị định đến lúc nào?",
            options: ["10 giờ", "12 giờ", "2 giờ"],
            answer: 1,
            hint: "at twelve.",
          },
          {
            q: "Sau ăn trưa dự định làm gì?",
            options: ["Học", "Nấu ăn", "Đi bộ công viên"],
            answer: 2,
            hint: "walk in the park after lunch.",
          },
        ],
      },
      writing:
        "Ngày mai bạn định đi thư viện lúc 9 giờ sáng, gặp ở cửa thư viện. Viết lời nhắn kế hoạch và rủ bạn đi cùng.",
      modelAnswer: [
        "I am going to go to the library tomorrow at nine in the morning. Let’s meet at the library entrance. Do you want to come?",
      ],
      rubric: [
        "Có tomorrow, nơi và giờ sáng.",
        "Có điểm gặp cụ thể.",
        "Có lời rủ; không tự viết rằng người kia đã đồng ý.",
      ],
      speaking:
        "A nói kế hoạch cuối tuần với giờ/nơi. B hỏi lại một chi tiết rồi nhận hoặc từ chối. A xác nhận câu trả lời, không giả định mọi lời rủ được nhận. Đổi vai.",
      worked: [
        "Đặt mốc tương lai tomorrow. Chọn việc visit a friend.",
        "I am going to visit a friend tomorrow. Thêm nơi/giờ nếu người nghe cần.",
        "Hỏi Do you want to come? Đợi người kia trả lời trước khi chốt.",
      ],
      coaching: {
        mistake:
          "Sai: I going to visit. → I am going to visit. Going to go to có thể đúng nhưng dài; có thể nói I am going to visit the library.",
        pronunciation:
          "Nói rõ tomorrow/tonight và giờ; không cần luyện dạng nói tắt gonna ở bài cơ bản.",
        recall:
          "Ngày sau dùng kế hoạch khác, nhờ người nghe nhắc lại giờ và nơi rồi mới xác nhận.",
      },
    },
  ];
  LESSONS.push(...additionalLessons);
  const teachingSupport = {
    "a1-introductions": {
      mistake:
        "Sai: I is Mai. → I am Mai. Nơi ở dùng live in, không dùng I am live.",
      pronunciation:
        "Nói tên thành một cụm rồi ngắt: My name is Mai. Nhờ người nghe nhắc lại tên thay vì chỉ nói nhanh.",
      recall:
        "Ngày sau không nhìn mẫu: giới thiệu tên/nơi ở giả mới và hỏi lại người nghe.",
    },
    "a1-contact": {
      mistake:
        "Không đọc số điện thoại thành một số đếm lớn. Khi chưa nghe chắc B/P hoặc fifteen/fifty, xin đánh vần hoặc nhắc từng số.",
      pronunciation:
        "Tên chữ E /iː/ khác I /aɪ/. Nghe mẫu chữ cái rồi đánh vần tên, kiểm bằng người nghe viết lại.",
      recall:
        "Ngày sau dùng một tên và số giả khác; nhờ người nghe ghi lại rồi so từng chữ/số.",
    },
    "a1-family": {
      mistake:
        "Sai: She name is … → Her name is …; she làm chủ ngữ, her đứng trước name.",
      pronunciation:
        "Đọc tuổi và quan hệ chậm thành hai ý. Giữ âm cuối years để người nghe nhận ra cụm tuổi.",
      recall:
        "Ngày sau giới thiệu hai người giả bằng quan hệ, tuổi và nghề khác; hỏi người nghe nhớ ai.",
    },
    "a1-home": {
      mistake:
        "Sai: There is two chairs. → There are two chairs. Phân biệt on (trên bề mặt) và under (dưới).",
      pronunciation:
        "Chair bắt đầu /tʃ/, không phải /ʃ/. Đọc chair rồi dùng cả câu There is a chair.",
      recall:
        "Ngày sau mô tả phòng khác với ba đồ; người nghe vẽ vị trí và bạn kiểm lại.",
    },
    "a1-routine": {
      mistake:
        "Sai: He get up. → He gets up. Nhưng Does he get up …? dùng get sau does.",
      pronunciation:
        "Nói cả cụm get up / go to work; giữ âm cuối work, không thêm âm “cờ” thành âm tiết riêng.",
      recall:
        "Ngày sau nói lịch ngày khác và hỏi giờ của người nghe; phân biệt giờ thức dậy/đi làm.",
    },
    "a1-food": {
      mistake:
        "I like tea nói sở thích, I’d like tea là yêu cầu gọi trà ở đây. Hỏi lại cỡ trước khi xác nhận.",
      pronunciation:
        "Nghe tea /tiː/ và three /θriː/ trong các câu khác nhau; xác nhận số lượng nếu chưa rõ.",
      recall: "Ngày sau đặt món khác, chọn cỡ và hỏi giá mà không mở mẫu.",
    },
    "a1-shopping": {
      mistake:
        "Sai: these shirt → these shirts. This/is cho một; these/are cho nhiều trong mẫu bài.",
      pronunciation:
        "Số nhiều shirts có âm cuối; đọc two shirts đủ rõ để người bán không nghe thành một áo.",
      recall:
        "Ngày sau đổi màu/cỡ/số lượng; người bán nhắc sai một chi tiết, bạn sửa lại.",
    },
    "a1-directions": {
      mistake:
        "Left và right không đoán theo vị trí trên màn hình. Gắn hướng với người đang đi; hỏi lại nếu không rõ mốc.",
      pronunciation:
        "Giữ âm đầu /r/ trong right và âm cuối /t/ trong left/right đủ để phân biệt. Không cần nói nhanh.",
      recall:
        "Ngày sau tự vẽ ba địa điểm rồi hướng dẫn người khác; xem họ chỉ đúng đích không.",
    },
    "a1-travel": {
      mistake:
        "Không lấy số sân ga làm giờ. Đọc nhãn platform/time/ticket trước số và giữ buổi trong ngày khi có.",
      pronunciation:
        "Fifteen và fifty có mẫu trọng âm khác; giọng nói thực tế thay đổi. Xác nhận bằng Is that one five or five zero? khi cần.",
      recall:
        "Ngày sau dùng vé mới, hỏi giờ và sân ga; người nghe nhắc lại hai thông tin riêng.",
    },
    "a1-needs": {
      mistake:
        "I am thirsty nói trạng thái; I need water nói nhu cầu. Không dùng I am need water.",
      pronunciation:
        "Nói rõ help và please; giọng chậm, rõ quan trọng hơn bắt chước một giọng cụ thể.",
      recall:
        "Ngày sau chọn một nhu cầu khác, nói tình trạng và yêu cầu giúp; người nghe phản hồi.",
    },
    "a1-forms": {
      mistake:
        "Given name và family name có thể sắp thứ tự khác thói quen Việt. Đọc nhãn từng ô, không điền theo vị trí đoán.",
      pronunciation:
        "Đánh vần họ và đọc lại số theo từng chữ số. Không cần đọc địa chỉ thật; dùng thông tin giả.",
      recall:
        "Ngày sau điền thẻ giả mới, rồi nhắn ngày/giờ/phòng cho người không nhìn thẻ.",
    },
    "a1-review": {
      mistake:
        "Nếu đúng khi nhìn mẫu nhưng không truyền được thông tin mới, quay lại bài liên quan và thử lại sau; không đổi số lần làm thành trình độ.",
      pronunciation:
        "Nói chậm theo nhóm tên — ngày — giờ — nơi. Người nghe ghi gì mới là bằng chứng thông tin đã truyền được.",
      recall:
        "Một ngày sau dùng một sự kiện khác. Thiếu tên → Giới thiệu; sai giờ/ngày → Ngày tháng/Hẹn gặp; sai giá → Lượng đồ ăn; thiếu phản hồi → Hỏi lại.",
    },
  };
  for (const lesson of LESSONS) {
    lesson.coaching = lesson.coaching || teachingSupport[lesson.id];
    lesson.stage = stages.find((stage) =>
      stage.lessonIds.includes(lesson.id),
    ).title;
    lesson.kind =
      lesson.id.includes("checkpoint") || lesson.id === "a1-review"
        ? "review"
        : "lesson";
  }
  LESSONS.sort((a, b) => courseOrder.indexOf(a.id) - courseOrder.indexOf(b.id));
  const clusters = LESSONS.map((lesson, index) => ({
    id: lesson.id,
    level: "A1",
    stage: lesson.stage,
    kind: lesson.kind,
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
      coaching: lesson.coaching,
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
  return {
    LESSONS,
    clusters,
    modules,
    dialogues,
    missions,
    foundations,
    stages,
    courseOrder,
  };
});
