// Chặng 4 · Bài 3 — Quần áo: màu, cỡ, thử và đổi hàng.
export default {
  id: 'a1-s4-l3',
  stage: 4,
  order: 3,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Mua quần áo',
  canDo: 'Hỏi mua quần áo: màu, cỡ, xin thử, nói vừa/không vừa, và xin đổi hoặc trả.',

  pattern: {
    name: 'I’m looking for … / Can I try it on? / It’s too …',
    rule:
      '"I’m looking for + a/an + đồ" (đang tìm mua). Cỡ: "Do you have this in medium / a size bigger?" Thử: "Can I try it on?" Nhận xét: "It’s too big/small." (too = quá) / "It fits." (vừa). Đổi: "Can I exchange this?" / "Can I get a refund?" Màu + đồ: "a blue shirt" (màu trước danh từ).',
    examples: [
      ['I’m looking for a white T-shirt.', 'Tôi đang tìm một áo phông trắng.'],
      ['Can I try it on? — Sure, the fitting room is there.', 'Tôi thử được không? — Được, phòng thử ở đó.'],
      ['It’s too small. Do you have a bigger size?', 'Nó nhỏ quá. Có cỡ lớn hơn không?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'I’m looking for …', meaning: 'Tôi đang tìm …', example: 'I’m looking for a jacket.', exampleVi: 'Tôi đang tìm một áo khoác.' },
    { id: 'c2', target: 'Do you have this in …?', meaning: 'Có cái này màu / cỡ … không?', example: 'Do you have this in black?', exampleVi: 'Có cái này màu đen không?' },
    { id: 'c3', target: 'What size are you?', meaning: 'Bạn cỡ nào?', example: 'What size are you? — Medium.', exampleVi: 'Bạn cỡ nào? — Cỡ M.' },
    { id: 'c4', target: 'Can I try it on?', meaning: 'Tôi thử được không?', example: 'It looks nice. Can I try it on?', exampleVi: 'Đẹp đó. Tôi thử được không?' },
    { id: 'c5', target: 'It’s too big / too small.', meaning: 'Nó to quá / nhỏ quá.', example: 'It’s too big. Do you have a small?', exampleVi: 'To quá. Có cỡ S không?' },
    { id: 'c6', target: 'It fits. I’ll take it.', meaning: 'Vừa rồi. Tôi lấy cái này.', example: 'Perfect, it fits. I’ll take it.', exampleVi: 'Tuyệt, vừa rồi. Tôi lấy cái này.' },
    { id: 'c7', target: 'Can I exchange this?', meaning: 'Tôi đổi cái này được không?', example: 'Can I exchange this for a bigger size?', exampleVi: 'Tôi đổi cái này sang cỡ lớn hơn được không?' },
    { id: 'c8', target: 'Do you have the receipt?', meaning: 'Bạn có hóa đơn không?', example: 'Do you have the receipt? — Yes, here.', exampleVi: 'Có hóa đơn không? — Có, đây.' },
  ],

  drills: [
    { q: 'Thứ tự đúng:', options: ['a red dress', 'a dress red', 'red a dress'], answer: 0, hint: 'Màu (tính từ) trước danh từ.' },
    { q: 'Cái áo quá nhỏ:', options: ['It’s too small.', 'It’s very fit.', 'It’s small too.'], answer: 0, hint: 'too + tính từ = quá.' },
    { q: 'Xin thử đồ:', options: ['Can I try it on?', 'Can I try on it?', 'Can I wear try?'], answer: 0, hint: 'try it on — "it" ở giữa.' },
    { q: 'Do you have this ___ medium?', options: ['in', 'on', 'at'], answer: 0, hint: 'in + cỡ/màu.' },
  ],

  dialogue: {
    title: 'Ở cửa hàng quần áo',
    lines: [
      ['Staff: Hi, can I help you?', 'Nhân viên: Chào, tôi giúp gì được không?'],
      ['Long: Yes, I’m looking for a blue shirt.', 'Long: Có, tôi đang tìm một áo sơ mi xanh.'],
      ['Staff: What size are you?', 'Nhân viên: Bạn cỡ nào?'],
      ['Long: Medium, I think. Can I try it on?', 'Long: Cỡ M, tôi nghĩ vậy. Tôi thử được không?'],
      ['Staff: Of course. The fitting room is on the left.', 'Nhân viên: Dĩ nhiên. Phòng thử bên trái.'],
      ['Long: Hmm, it’s too small. Do you have it in large?', 'Long: Hmm, nhỏ quá. Có cỡ L không?'],
      ['Staff: Yes, here you are.', 'Nhân viên: Có, đây ạ.'],
      ['Long: This fits. I’ll take it. How much is it?', 'Long: Cái này vừa. Tôi lấy. Bao nhiêu tiền?'],
    ],
    questions: [
      { q: 'Long tìm mua gì?', options: ['Áo sơ mi xanh', 'Áo khoác đen', 'Quần jean'], answer: 0, hint: '"a blue shirt".' },
      { q: 'Cỡ M thế nào?', options: ['Nhỏ quá', 'Vừa', 'To quá'], answer: 0, hint: '"it’s too small".' },
      { q: 'Long lấy cỡ nào?', options: ['L', 'M', 'S'], answer: 0, hint: '"Do you have it in large?… This fits."' },
    ],
  },

  listening: {
    text: 'Hello, I bought this jacket yesterday, but it’s too big for my son. Can I exchange it for a smaller size? I have the receipt. Oh, and do you have it in green?',
    vi: 'Xin chào, tôi mua áo khoác này hôm qua, nhưng nó to quá so với con trai tôi. Tôi đổi sang cỡ nhỏ hơn được không? Tôi có hóa đơn. À, có màu xanh lá không?',
    questions: [
      { q: 'Vấn đề với áo khoác là gì?', options: ['To quá', 'Nhỏ quá', 'Sai màu'], answer: 0, hint: '"it’s too big for my son".' },
      { q: 'Khách muốn gì?', options: ['Đổi cỡ nhỏ hơn', 'Trả lại lấy tiền', 'Mua thêm một cái'], answer: 0, hint: '"exchange it for a smaller size".' },
    ],
  },

  write: {
    setup: 'Bạn mua online một áo nhưng không vừa. Bạn nhắn cho shop.',
    prompt: 'Viết 3 câu: bạn đã mua gì (màu, cỡ), vấn đề (too big/small), và yêu cầu đổi cỡ/màu khác.',
    model: ['Hi, I bought a black T-shirt, size M, last week.', 'It’s too small for me.', 'Can I exchange it for size L, please?'],
    checklist: [
      'Màu đứng trước danh từ (a black T-shirt).',
      'Có "too + tính từ".',
      'Có câu xin đổi "Can I exchange …?".',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn đi mua một áo khoác cho mùa đông.',
    roleA: 'Khách — nói đang tìm gì (màu), cỡ, xin thử, nhận xét không vừa, xin cỡ khác, quyết định mua.',
    roleB: 'Nhân viên — hỏi cỡ, chỉ phòng thử, đưa cỡ khác, báo giá.',
    prompt: 'Nói thành tiếng cả hai vai. Có ít nhất một câu "too …" và một câu "It fits".',
    model: ['A: I’m looking for a grey jacket. — B: What size are you? — A: Large. Can I try it on?', 'A: It’s too big. Do you have it in medium? — B: Yes, here you are.', 'A: This fits. I’ll take it. How much is it?'],
    checklist: [
      'Có I’m looking for + màu + đồ.',
      'Có Can I try it on?',
      'Có too … và It fits / I’ll take it.',
    ],
  },
};
