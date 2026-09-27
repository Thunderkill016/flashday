// Chặng 6 · Bài 3 — Hôm qua: was/were và vài động từ quá khứ quen thuộc.
// Honest scope: learners get was/were + a small set of everyday past forms
// (went, had, saw, ate). Full past tense is A2 — the lesson says so.
export default {
  id: 'a1-s6-l3',
  stage: 6,
  order: 3,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Hôm qua thế nào?',
  canDo: 'Nói vài câu về hôm qua/cuối tuần vừa rồi bằng was/were và các động từ quen (went, had, saw, ate); hỏi người khác.',

  pattern: {
    name: 'It was … / I was … / I went / I had …',
    rule:
      'Quá khứ của be: was (I/he/she/it) và were (you/we/they). "It was fun." "I was tired." "We were busy." — phủ định wasn’t/weren’t, hỏi "Was it fun?" Vài động từ thông dụng đi quá khứ: go→went, have→had, see→saw, eat→ate. (Quá khứ đầy đủ là A2 — bài này chỉ luyện nhóm quen trên.)',
    examples: [
      ['It was a nice day.', 'Hôm đó trời đẹp.'],
      ['I went to the market yesterday.', 'Hôm qua tôi đi chợ.'],
      ['We were tired after the trip.', 'Chúng tôi mệt sau chuyến đi.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'How was your …?', meaning: '… của bạn thế nào?', example: 'How was your weekend?', exampleVi: 'Cuối tuần của bạn thế nào?' },
    { id: 'c2', target: 'It was …', meaning: 'Nó đã …', example: 'It was great, thanks!', exampleVi: 'Tuyệt, cảm ơn!' },
    { id: 'c3', target: 'I was …', meaning: 'Tôi đã …', example: 'I was at home all day.', exampleVi: 'Tôi ở nhà cả ngày.' },
    { id: 'c4', target: 'We were / They were …', meaning: 'Chúng tôi / Họ đã …', example: 'We were very busy on Sunday.', exampleVi: 'Chủ nhật chúng tôi rất bận.' },
    { id: 'c5', target: 'I went to …', meaning: 'Tôi đã đi/đến …', example: 'I went to my parents’ house.', exampleVi: 'Tôi về nhà bố mẹ.' },
    { id: 'c6', target: 'I had …', meaning: 'Tôi đã có/ăn …', example: 'I had dinner with an old friend.', exampleVi: 'Tôi ăn tối với một bạn cũ.' },
    { id: 'c7', target: 'yesterday / last week / last weekend', meaning: 'hôm qua / tuần trước / cuối tuần trước', example: 'Yesterday was a holiday.', exampleVi: 'Hôm qua là ngày lễ.' },
    { id: 'c8', target: 'What about you?', meaning: 'Còn bạn?', example: 'My weekend was quiet. What about you?', exampleVi: 'Cuối tuần tôi yên tĩnh. Còn bạn?' },
  ],

  drills: [
    { q: 'Yesterday I ___ very tired.', options: ['was', 'were', 'am'], answer: 0, hint: 'I → was.' },
    { q: 'They ___ at the beach last Sunday.', options: ['were', 'was', 'are'], answer: 0, hint: 'they → were.' },
    { q: 'How ___ your holiday?', options: ['was', 'were', 'is'], answer: 0, hint: 'your holiday = it → was.' },
    { q: 'I ___ to Da Lat last week. (đã đi)', options: ['went', 'go', 'goes'], answer: 0, hint: 'go → went.' },
    { q: 'We ___ a great dinner last night. (đã ăn)', options: ['had', 'have', 'has'], answer: 0, hint: 'have → had.' },
  ],

  dialogue: {
    title: 'Sáng thứ Hai hỏi cuối tuần',
    lines: [
      ['Ben: Good morning, Hoa. How was your weekend?', 'Ben: Chào buổi sáng, Hoa. Cuối tuần thế nào?'],
      ['Hoa: It was nice. I went to Vung Tau with my family.', 'Hoa: Vui. Tôi đi Vũng Tàu với gia đình.'],
      ['Ben: Oh, nice! Was it busy?', 'Ben: Ồ hay! Có đông không?'],
      ['Hoa: Yes, it was very crowded, but the food was great. We had seafood.', 'Hoa: Có, đông lắm, nhưng đồ ăn tuyệt. Chúng tôi ăn hải sản.'],
      ['Ben: What about Sunday?', 'Ben: Còn Chủ nhật?'],
      ['Hoa: On Sunday we were all tired, so we stayed home and slept late.', 'Hoa: Chủ nhật cả nhà mệt, nên ở nhà ngủ nướng.'],
      ['Ben: Sounds like a good weekend!', 'Ben: Nghe là một cuối tuần vui!'],
    ],
    questions: [
      { q: 'Hoa đi đâu cuối tuần?', options: ['Vũng Tàu', 'Đà Lạt', 'Ở nhà'], answer: 0, hint: '"I went to Vung Tau".' },
      { q: 'Nơi đó thế nào?', options: ['Đông, nhưng đồ ăn tuyệt', 'Vắng và yên tĩnh', 'Mưa cả ngày'], answer: 0, hint: '"very crowded, but the food was great".' },
      { q: 'Chủ nhật gia đình Hoa làm gì?', options: ['Ở nhà, ngủ nướng', 'Đi chợ', 'Đi biển tiếp'], answer: 0, hint: '"we stayed home and slept late".' },
    ],
  },

  listening: {
    text: 'Yesterday was my daughter’s birthday. It was a small party at our house. My parents came — they were happy to see the kids. We had cake and fruit. The children were loud, but it was a lovely day.',
    vi: 'Hôm qua là sinh nhật con gái tôi. Tiệc nhỏ ở nhà. Bố mẹ tôi đến — hai ông bà vui lắm được thấy các cháu. Chúng tôi ăn bánh và trái cây. Bọn trẻ ồn, nhưng đó là một ngày đẹp.',
    questions: [
      { q: 'Hôm qua là ngày gì?', options: ['Sinh nhật con gái', 'Sinh nhật bố', 'Ngày lễ'], answer: 0, hint: '"my daughter’s birthday".' },
      { q: 'Ai đến?', options: ['Bố mẹ người nói', 'Bạn bè công ty', 'Hàng xóm'], answer: 0, hint: '"My parents came".' },
      { q: 'Có gì ăn?', options: ['Bánh và trái cây', 'Hải sản', 'Phở'], answer: 0, hint: '"cake and fruit".' },
    ],
  },

  write: {
    setup: 'Bạn nhắn cho một người bạn nước ngoài kể về hôm qua.',
    prompt: 'Viết 3 câu: hôm qua thế nào (It was …), bạn đi đâu/làm gì (went/had), và một cảm giác (I was …).',
    model: ['Yesterday was a good day.', 'I went to the cinema with my sister and we had pho after.', 'I was a bit tired but happy.'],
    checklist: [
      'Có It was + tính từ.',
      'Có went hoặc had (không viết "goed" / "haved").',
      'Có I was / We were với tính từ.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Sáng thứ Hai bạn gặp lại một bạn học.',
    roleA: 'Bạn — hỏi "How was your weekend?", trả lời về cuối tuần của mình.',
    roleB: 'Bạn học — cuối tuần đi thăm ông bà; mệt nhưng vui; hỏi lại.',
    prompt: 'Nói thành tiếng cả hai vai. Mỗi người có ít nhất was/were và một động từ quá khứ (went/had).',
    model: ['A: How was your weekend? — B: It was nice. I went to my grandparents’ house. They were happy to see me.', 'A: I was at home all weekend. I had a big dinner with my family on Sunday. What about you, was it busy?'],
    checklist: [
      'Có How was your …?',
      'Có was/were đúng chủ ngữ.',
      'Có went hoặc had.',
    ],
  },
};
