/*
 * Starter catalog — the "library is never empty" layer every content-first
 * product ships (LingQ mini-stories, Dreaming Spanish catalog, LR browse).
 * Items are bundled so importing needs zero network and zero preparation.
 *
 * Licensing tiers, kept honest in `source`:
 *   - 'voa'    : VOA Learning English — US government public domain.
 *   - 'self'   : written for FlashDay around the seed deck's units.
 * Bundled text is always real study material, not lorem filler.
 */
(function (root, factory) {
  if (
    typeof window === "undefined" &&
    typeof module === "object" &&
    module.exports
  )
    module.exports = factory();
  else root.FlashDayCatalog = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ITEMS = [
    {
      id: "cat-coffee-order-v2",
      title: "Gọi đồ ở quán cà phê",
      level: "A1",
      kind: "dialog",
      minutes: 2,
      source: { name: "FlashDay", url: "" },
      goal: "Tìm món đã gọi và giá tiền trong một đoạn hội thoại ngắn.",
      lines: [
        ["A: A coffee, please.", "A: Cho tôi một ly cà phê."],
        ["B: Small or large?", "B: Ly nhỏ hay lớn?"],
        ["A: Small, please.", "A: Ly nhỏ nhé."],
        ["B: Anything else?", "B: Bạn cần thêm gì không?"],
        [
          "A: No, thank you. How much is it?",
          "A: Không, cảm ơn. Bao nhiêu tiền?",
        ],
        ["B: Three dollars.", "B: Ba đô la."],
      ],
    },
    {
      id: "cat-asking-way-v2",
      title: "Hỏi đường trong thành phố",
      level: "A1",
      kind: "dialog",
      minutes: 2,
      source: { name: "FlashDay", url: "" },
      goal: "Tìm địa điểm và làm theo hai chỉ dẫn đường ngắn.",
      lines: [
        ["A: Excuse me. Where is the cafe?", "A: Xin lỗi. Quán cà phê ở đâu?"],
        [
          "B: Go straight. Turn left at the bank.",
          "B: Đi thẳng. Rẽ trái ở ngân hàng.",
        ],
        ["A: Left at the bank?", "A: Rẽ trái ở ngân hàng phải không?"],
        [
          "B: Yes. The cafe is next to the bank.",
          "B: Đúng. Quán cà phê ở cạnh ngân hàng.",
        ],
        ["A: Thank you.", "A: Cảm ơn."],
        ["B: You are welcome.", "B: Không có gì."],
      ],
    },
    {
      id: "cat-weekend-plans",
      title: "Rủ đi chơi cuối tuần",
      level: "A2",
      kind: "dialog",
      minutes: 3,
      source: { name: "FlashDay", url: "" },
      lines: [
        [
          "Hey, any plans for the weekend?",
          "Này, cuối tuần có kế hoạch gì chưa?",
        ],
        [
          "Not yet. I was thinking about going hiking.",
          "Chưa. Tớ đang tính đi leo núi.",
        ],
        [
          "Nice. Mind if I join? I need a break from work.",
          "Hay đấy. Cho tớ đi cùng nhé? Tớ cần nghỉ xả hơi khỏi công việc.",
        ],
        [
          "Of course! I'm planning to leave early on Saturday.",
          "Dĩ nhiên rồi! Tớ định đi sớm thứ bảy.",
        ],
        [
          "How early? I am not a morning person.",
          "Sớm cỡ nào? Tớ không phải kiểu người dậy sớm.",
        ],
        [
          "Around seven. I can pick you up on the way.",
          "Khoảng bảy giờ. Tớ có thể đón cậu trên đường.",
        ],
        [
          "Deal. Should I bring anything?",
          "Chốt. Tớ có cần mang theo gì không?",
        ],
        [
          "Just water and snacks. I will take care of the map.",
          "Chỉ cần nước và đồ ăn nhẹ. Bản đồ để tớ lo.",
        ],
        [
          "Perfect. Text me the exact time tomorrow.",
          "Hoàn hảo. Mai nhắn cho tớ giờ chính xác nhé.",
        ],
        ["Will do. See you Saturday!", "Sẽ nhắn. Thứ bảy gặp!"],
      ],
    },
    {
      id: "cat-voa-road-trip",
      title: "VOA — Chuyến đi xuyên nước Mỹ (đoạn đầu)",
      level: "A2",
      kind: "story",
      minutes: 3,
      source: {
        name: "VOA Learning English (public domain)",
        url: "https://learningenglish.voanews.com/a/lesson-45-this-land-is-your-land/3710209.html",
      },
      lines: [
        [
          "Anna: You know I love Washington, D.C. But I want to see more of the United States.",
          "Anna: Cậu biết tớ yêu Washington D.C. Nhưng tớ muốn ngắm thêm nước Mỹ.",
        ],
        [
          "My roommate Marsha and I will be on vacation at the same time. So, we are going on a road trip together!",
          "Tớ và bạn cùng phòng Marsha sẽ nghỉ phép cùng lúc. Thế là tụi tớ đi road trip cùng nhau!",
        ],
        [
          "Anna: I packed my bags and I am ready to go!",
          "Anna: Tớ xếp đồ xong và sẵn sàng lên đường rồi!",
        ],
        [
          "Marsha: Did you make a list of all the places you want to see?",
          "Marsha: Cậu đã liệt kê hết những nơi muốn đến chưa?",
        ],
        [
          "Anna: I did. I want to see New York City and the Statue of Liberty!",
          "Anna: Rồi. Tớ muốn xem New York và tượng Nữ thần Tự do!",
        ],
        [
          "Marsha: And I want to see Mount Rushmore!",
          "Marsha: Còn tớ muốn xem núi Rushmore!",
        ],
        [
          "Marsha: We will be driving for a long time. So, we might get bored.",
          "Marsha: Ta sẽ lái xe rất lâu. Nên có thể sẽ chán.",
        ],
        [
          "Anna: Bored? No way! We can talk. We can play word games. We can sing!",
          "Anna: Chán á? Không đời nào! Mình có thể nói chuyện, chơi đố chữ, hát nữa!",
        ],
        ["Marsha: Will we be stopping soon?", "Marsha: Sắp dừng lại chưa?"],
        [
          "Anna: We won't be stopping soon. We'll be eating lunch in about 2 hours. Can you wait?",
          "Anna: Chưa dừng đâu. Khoảng 2 tiếng nữa mới ăn trưa. Chịu được không?",
        ],
        [
          "Marsha: Okay, we will be arriving in New York City very soon!",
          "Marsha: Được rồi, sắp tới New York rồi này!",
        ],
        [
          "Anna: I can't wait to see The Big Apple!",
          "Anna: Tớ nóng lòng muốn thấy Big Apple quá!",
        ],
      ],
    },
    {
      id: "cat-lost-phone",
      title: "Làm mất điện thoại",
      level: "B1",
      kind: "story",
      minutes: 3,
      source: { name: "FlashDay", url: "" },
      lines: [
        [
          "Last Friday, Minh left his phone in a taxi on his way home.",
          "Thứ sáu tuần trước, Minh để quên điện thoại trên taxi lúc về nhà.",
        ],
        [
          "He only noticed when he was already at his front door.",
          "Anh chỉ nhận ra khi đã đứng trước cửa nhà.",
        ],
        [
          "He borrowed his neighbor’s phone to call his own number.",
          "Anh mượn điện thoại của hàng xóm để gọi số của mình.",
        ],
        [
          "Nobody answered, so he started to panic a little.",
          "Không ai nghe máy, nên anh bắt đầu hơi hoảng.",
        ],
        [
          "Then he remembered the taxi app still showed the driver.",
          "Rồi anh nhớ app taxi vẫn còn hiện thông tin tài xế.",
        ],
        [
          "He sent a message through the app and waited.",
          "Anh nhắn tin qua app rồi đợi.",
        ],
        [
          "Ten minutes later, the driver called back and promised to return the phone.",
          "Mười phút sau, tài xế gọi lại và hứa sẽ mang trả.",
        ],
        [
          "When the driver arrived, Minh offered him some money as a thank-you.",
          "Khi tài xế tới, Minh đưa anh ấy ít tiền để cảm ơn.",
        ],
        [
          "The driver refused politely and just smiled.",
          "Tài xế lịch sự từ chối và chỉ cười.",
        ],
        [
          "Minh learned two things that night: check your pockets, and kind people exist.",
          "Đêm đó Minh học được hai điều: kiểm tra túi trước khi xuống xe, và người tử tế vẫn tồn tại.",
        ],
      ],
    },
  ];

  return { ITEMS };
});
