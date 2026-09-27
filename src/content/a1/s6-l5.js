// Chặng 6 · Bài 5 — CHECKPOINT: kể lại một chuyến đi ngắn.
// Gom: giới thiệu (c1), giờ/ngày (c2), đường đi & phương tiện (c3),
// ăn uống/mua sắm (c4), sức khỏe/khả năng (c5), kế hoạch & quá khứ quen (c6).
export default {
  id: 'a1-s6-l5',
  stage: 6,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 1,
  title: 'Checkpoint: chuyến đi cuối tuần',
  canDo: 'Nghe và đọc một câu chuyện ngắn về chuyến đi, sau đó kể lại chuyến đi của chính mình bằng tin nhắn và lời nói — dùng gần hết vốn A1 đã học.',

  // pattern giữ lại ở dạng ôn tập — không pattern mới ở checkpoint.
  pattern: {
    name: 'Ôn tập: giới thiệu → hẹn → đi lại → ăn uống → cảm giác → kể lại',
    rule:
      'Checkpoint không có mẫu câu mới. Đọc/nghe câu chuyện của Lan (đi Huế cuối tuần), rồi kể chuyến đi của bạn theo khung: đi đâu + với ai + lúc mấy giờ/ngày nào + đi bằng gì + ăn gì/mua gì + thế nào (was/were, went, had) + sắp tới đi đâu nữa (going to).',
    examples: [
      ['Last weekend I went to Hue with my sister.', 'Cuối tuần trước tôi đi Huế với chị gái.'],
      ['We went by train. It was cheap and nice.', 'Chúng tôi đi tàu. Rẻ và vui.'],
      ['Next month we’re going to visit Da Nang.', 'Tháng sau chúng tôi định đi Đà Nẵng.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'How was your trip?', meaning: 'Chuyến đi của bạn thế nào?', example: 'Hi Lan! How was your trip?', exampleVi: 'Chào Lan! Chuyến đi của bạn thế nào?' },
    { id: 'c2', target: 'on Saturday morning / at six', meaning: 'sáng thứ Bảy / lúc sáu giờ', example: 'We left on Saturday morning at six.', exampleVi: 'Chúng tôi đi sáng thứ Bảy lúc sáu giờ.' },
    { id: 'c3', target: 'We went by train / by bus.', meaning: 'Chúng tôi đi bằng tàu / xe buýt.', example: 'We went by train. It took three hours.', exampleVi: 'Chúng tôi đi tàu. Mất ba tiếng.' },
    { id: 'c4', target: 'It wasn’t expensive.', meaning: 'Nó không đắt.', example: 'The train? It wasn’t expensive.', exampleVi: 'Tàu hả? Không đắt.' },
    { id: 'c5', target: 'We had lunch at a small restaurant.', meaning: 'Chúng tôi ăn trưa ở một quán nhỏ.', example: 'We had lunch at a small restaurant near the river.', exampleVi: 'Chúng tôi ăn trưa ở quán nhỏ gần sông.' },
    { id: 'c6', target: 'I bought a hat for my mum.', meaning: 'Tôi mua một cái mũ cho mẹ.', example: 'I bought a hat for my mum at the market.', exampleVi: 'Tôi mua cái mũ cho mẹ ở chợ.' },
    { id: 'c7', target: 'I was tired but happy.', meaning: 'Tôi mệt nhưng vui.', example: 'On Sunday night I was tired but happy.', exampleVi: 'Tối Chủ nhật tôi mệt nhưng vui.' },
    { id: 'c8', target: 'Next time you should come!', meaning: 'Lần sau bạn nên đi cùng!', example: 'Next time you should come with us!', exampleVi: 'Lần sau bạn nên đi cùng tụi mình!' },
  ],

  drills: [
    { q: 'We went ___ train. (bằng tàu)', options: ['by', 'on', 'with'], answer: 0, hint: 'by + phương tiện.' },
    { q: 'The tickets ___ expensive. (không đắt)', options: ['weren’t', 'wasn’t', 'aren’t'], answer: 0, hint: 'tickets → were → weren’t.' },
    { q: 'I ___ a hat for my mum. (đã mua)', options: ['bought', 'buyed', 'buy'], answer: 0, hint: 'buy → bought.' },
    { q: 'Next month we ___ going to visit Da Nang.', options: ['are', 'is', 'was'], answer: 0, hint: 'we → are.' },
    { q: 'Kể thời gian đúng thứ tự:', options: ['on Saturday at six', 'at six on Saturday is also OK', 'Cả hai thứ tự trên đều được'], answer: 2, hint: 'Nói "on Saturday morning at six" hay "at six on Saturday" đều tự nhiên.' },
  ],

  dialogue: {
    title: 'Lan kể chuyến đi Huế — tin nhắn dài cho bạn',
    lines: [
      ['Lan: Hi Trang! How are you? Guess what — last weekend I went to Hue with my sister!', 'Lan: Chào Trang! Khỏe không? Đoán xem — cuối tuần trước tớ đi Huế với chị gái!'],
      ['Trang: Oh nice! How was it?', 'Trang: Hay quá! Thế nào?'],
      ['Lan: It was great. We went by train on Saturday morning at six. It wasn’t expensive — about two hundred thousand.', 'Lan: Tuyệt lắm. Tụi tớ đi tàu sáng thứ Bảy lúc sáu giờ. Không đắt — khoảng hai trăm nghìn.'],
      ['Lan: The train was slow, about three hours, but the views were beautiful.', 'Lan: Tàu chậm, khoảng ba tiếng, nhưng cảnh đẹp.'],
      ['Trang: What did you do there?', 'Trang: Ở đó các cậu làm gì?'],
      ['Lan: We walked around the citadel — it’s near the river. Then we had lunch at a small restaurant. The beef noodle soup was amazing!', 'Lan: Tụi tớ đi bộ quanh kinh thành — gần sông. Rồi ăn trưa ở quán nhỏ. Bún bò ngon tuyệt!'],
      ['Lan: In the afternoon I bought a hat for my mum at the market. She loved it.', 'Lan: Chiều đó tớ mua cái mũ cho mẹ ở chợ. Mẹ thích lắm.'],
      ['Lan: On Sunday night I was tired but happy. Next time you should come with us!', 'Lan: Tối Chủ nhật tớ mệt nhưng vui. Lần sau cậu nên đi cùng!'],
    ],
    questions: [
      { q: 'Lan đi Huế bằng gì?', options: ['Tàu hỏa', 'Xe buýt', 'Xe máy'], answer: 0, hint: '"We went by train".' },
      { q: 'Tàu mất bao lâu?', options: ['Khoảng 3 tiếng', 'Khoảng 1 tiếng', 'Cả ngày'], answer: 0, hint: '"about three hours".' },
      { q: 'Bún bò thế nào?', options: ['Tuyệt vời', 'Đắt', 'Không có'], answer: 0, hint: '"was amazing".' },
      { q: 'Lan mua gì ở chợ?', options: ['Cái mũ cho mẹ', 'Quà cho chị', 'Đồ ăn'], answer: 0, hint: '"bought a hat for my mum".' },
    ],
  },

  listening: {
    text: 'Hi grandma, it’s Minh! I’m calling about our trip. We went to Nha Trang last weekend. We took the bus on Friday evening — it was cheap, about one hundred and fifty thousand. The beach was beautiful and the water was warm. We had seafood for dinner and I bought a small shell for you. On Sunday I was tired but very happy. Next time you should come with us! Love you!',
    vi: 'Chào bà, Minh đây! Cháu gọi kể chuyến đi. Cuối tuần trước chúng cháu đi Nha Trang. Tối thứ Sáu đi xe buýt — rẻ, khoảng một trăm rưỡi. Biển đẹp, nước ấm. Tối ăn hải sản và cháu mua cho bà một vỏ sò nhỏ. Chủ nhật mệt nhưng vui lắm. Lần sau bà nên đi cùng nhé! Thương bà!',
    questions: [
      { q: 'Minh đi đâu và bằng gì?', options: ['Nha Trang, bằng xe buýt', 'Huế, bằng tàu', 'Vũng Tàu, bằng xe máy'], answer: 0, hint: '"went to Nha Trang… took the bus".' },
      { q: 'Vé bao nhiêu?', options: ['Khoảng 150 nghìn', 'Khoảng 200 nghìn', 'Miễn phí'], answer: 0, hint: '"about one hundred and fifty thousand".' },
      { q: 'Minh mua gì cho bà?', options: ['Một vỏ sò nhỏ', 'Cái mũ', 'Quần áo'], answer: 0, hint: '"a small shell for you".' },
    ],
  },

  write: {
    setup: 'Một người bạn nhắn hỏi: "How was your weekend? Did you go anywhere?"',
    prompt: 'Viết tin nhắn 4–5 câu kể chuyến đi ngắn của BẠN (thật hoặc tưởng tượng): đi đâu, với ai, bằng gì, lúc nào, làm/ăn/mua gì, và cảm giác cuối chuyến.',
    model: ['It was great! Last Saturday I went to Da Lat with my brother. We went by bus at seven in the morning — it wasn’t expensive.', 'We walked around the lake and had coffee at a small cafe. I bought some flowers for my mum.', 'On Sunday night I was tired but happy. Next time you should come!'],
    checklist: [
      'Có nơi đến + người đi cùng + phương tiện (went by …).',
      'Có thời gian (on …, at …).',
      'Có ít nhất một hoạt động và một thứ đã ăn/mua (had/bought).',
      'Có was/were cho cảm giác.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gọi điện kể cho ông bà/bố mẹ một chuyến đi ngắn vừa đi.',
    roleA: 'Bạn — kể đầy đủ: đi đâu, với ai, bằng gì, mấy giờ, làm gì, ăn gì, mua gì, thế nào, và lần sau định đi đâu.',
    roleB: 'Người thân — hỏi lại từng phần: "How was it?", "What did you eat?", "Were you tired?"',
    prompt: 'Nói thành tiếng — đây là bài kiểm tổng hợp: cố gắng dùng cả quá khứ quen (went/had/was) lẫn going to cho kế hoạch tới.',
    model: ['A: Hi grandma! Last weekend I went to Nha Trang with my friends. We went by bus on Friday evening. — B: Oh! How was it?', 'A: It was beautiful. We had seafood and I bought a small shell for you. On Sunday I was tired but happy. — B: Were you tired?', 'A: A little! Next month we’re going to Da Lat. Next time you should come with us!'],
    checklist: [
      'Kể đủ: địa điểm + người + phương tiện + thời gian.',
      'Dùng went/had/was đúng.',
      'Có một câu going to cho kế hoạch tới.',
    ],
  },
};
