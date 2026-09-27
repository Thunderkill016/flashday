// Chặng 4 · Bài 5 — Checkpoint: đi ăn và mua quà.
// Reuses 4.1–4.4: ordering, quantities, clothes/sizes, likes and suggestions.
// Every assessed target comes from 4.1–4.4 (You should try / I'd like /
// the bill / I'm looking for / in + colour / How much / too expensive /
// I'll take it) — no new gift-wrap-discount vocabulary is assessed.
export default {
  id: 'a1-s4-l5',
  stage: 4,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 2,
  title: 'Checkpoint · Đi ăn và mua quà',
  canDo: 'Dẫn một người bạn đi ăn (hỏi sở thích, gợi ý món, gọi món, tính tiền) rồi giúp họ mua một món quà (hỏi có không, màu, giá, quyết định).',

  chunks: [
    { id: 'c1', target: 'You should try …', meaning: 'Bạn nên thử …', example: 'You should try the beef pho.', exampleVi: 'Bạn nên thử phở bò.' },
    { id: 'c2', target: 'I’d like …, please.', meaning: 'Cho tôi …', example: 'I’d like two bowls of pho, please.', exampleVi: 'Cho tôi hai tô phở.' },
    { id: 'c3', target: 'Can I have the bill, please?', meaning: 'Cho tôi tính tiền.', example: 'Excuse me, can I have the bill, please?', exampleVi: 'Xin lỗi, cho tôi tính tiền.' },
    { id: 'c4', target: 'I’m looking for …', meaning: 'Tôi đang tìm …', example: 'I’m looking for a T-shirt for my mum.', exampleVi: 'Tôi đang tìm một áo phông cho mẹ.' },
    { id: 'c5', target: 'Do you have this in …?', meaning: 'Có cái này màu / cỡ … không?', example: 'Do you have this in blue?', exampleVi: 'Có cái này màu xanh không?' },
    { id: 'c6', target: 'How much is it?', meaning: 'Bao nhiêu tiền?', example: 'How much is it? — 250,000.', exampleVi: 'Bao nhiêu tiền? — 250 nghìn.' },
    { id: 'c7', target: 'That’s too expensive.', meaning: 'Đắt quá.', example: 'Fifty thousand? That’s too expensive.', exampleVi: 'Năm mươi nghìn? Đắt quá.' },
    { id: 'c8', target: 'I’ll take it.', meaning: 'Tôi lấy cái này.', example: 'It’s nice. I’ll take it.', exampleVi: 'Đẹp đó. Tôi lấy cái này.' },
  ],

  drills: [
    { q: 'Gợi ý món phở cho người kia:', options: ['You should try pho.', 'You try pho should.', 'Should pho you try.'], answer: 0, hint: 'You should + động từ = nên.' },
    { q: 'I’m looking ___ a T-shirt for my mum.', options: ['for', 'to', 'at'], answer: 0, hint: 'look for = tìm (mua).' },
    { q: 'Hỏi giá một cái áo:', options: ['How much is it?', 'How many is it?', 'How much are it?'], answer: 0, hint: 'How much + is cho một món.' },
    { q: 'Xin tính tiền sau bữa ăn:', options: ['Can I have the bill, please?', 'Can I have the menu, please?', 'How much is the bill?'], answer: 0, hint: 'bill = hóa đơn.' },
    { q: 'Cái áo vừa, bạn quyết định mua:', options: ['I’ll take it.', 'I take it will.', 'It takes me.'], answer: 0, hint: 'I’ll take it = tôi lấy cái này.' },
  ],

  dialogue: {
    title: 'Ăn trưa rồi mua quà',
    lines: [
      ['Hoa: I’m hungry, Jack. Do you like pho?', 'Hoa: Tôi đói rồi, Jack. Bạn thích phở không?'],
      ['Jack: Yes, I do. But I don’t like very spicy food. Is it spicy?', 'Jack: Có. Nhưng tôi không thích đồ quá cay. Cay không?'],
      ['Hoa: No, it’s a bit sweet and salty. You should try the beef pho. — Two bowls of beef pho and two iced teas, please.', 'Hoa: Không, hơi ngọt và mặn. Bạn nên thử phở bò. — Cho hai tô phở bò và hai trà đá.'],
      ['Jack: It’s delicious! … Can I have the bill, please?', 'Jack: Ngon quá! … Cho tôi tính tiền.'],
      ['Jack: Now, I’m looking for something for my mum.', 'Jack: Giờ, tôi đang tìm một món cho mẹ.'],
      ['Hoa: How about this T-shirt? Do you have this in blue?', 'Hoa: Áo phông này thì sao? Có cái này màu xanh không?'],
      ['Seller: Yes. 250,000 dong. Two for 450,000.', 'Người bán: Có. 250 nghìn. Hai cái 450 nghìn.'],
      ['Jack: Hmm, that’s a bit expensive. Just one, please. Here you are.', 'Jack: Hmm, hơi đắt. Một cái thôi. Đây ạ.'],
    ],
    questions: [
      { q: 'Jack không thích ăn gì?', options: ['Đồ quá cay', 'Phở', 'Đồ ngọt'], answer: 0, hint: '"I don’t like very spicy food."' },
      { q: 'Hoa gọi gì?', options: ['2 phở bò + 2 trà đá', '2 bún chả + 2 cà phê', '1 phở + 1 trà'], answer: 0, hint: '"Two bowls of beef pho and two iced teas".' },
      { q: 'Jack tìm mua gì cho mẹ?', options: ['Áo phông xanh', 'Áo sơ mi', 'Túi'], answer: 0, hint: '"this T-shirt… in blue".' },
      { q: 'Cái áo giá bao nhiêu một cái?', options: ['250.000', '450.000', '150.000'], answer: 0, hint: '"250,000 dong. Two for 450,000."' },
    ],
  },

  listening: {
    text: 'Hi Lan, it’s Chris. Thanks for lunch today — the bun cha was delicious! Quick question: I want to buy a T-shirt for my brother, size large, in black or grey. Do you know a good shop near the market? Is two hundred thousand a good price for one? Thanks!',
    vi: 'Chào Lan, Chris đây. Cảm ơn bữa trưa hôm nay — bún chả ngon quá! Hỏi nhanh: mình muốn mua áo phông cho em trai, cỡ L, màu đen hoặc xám. Bạn có biết tiệm nào tốt gần chợ không? Hai trăm nghìn một cái có phải giá tốt không? Cảm ơn!',
    questions: [
      { q: 'Chris muốn mua gì?', options: ['Áo phông cỡ L', 'Áo sơ mi', 'Áo khoác cỡ M'], answer: 0, hint: '"a T-shirt… size large".' },
      { q: 'Màu nào?', options: ['Đen hoặc xám', 'Xanh hoặc trắng', 'Đỏ'], answer: 0, hint: '"in black or grey".' },
      { q: 'Chris hỏi thêm điều gì?', options: ['200.000 một cái có phải giá tốt không', 'Quán có mở Chủ nhật không', 'Giá vé xe'], answer: 0, hint: '"a good price for one".' },
    ],
  },

  write: {
    setup: 'Một người bạn nước ngoài hỏi bạn: "I want to buy a gift for my sister and try some local food. Any ideas?"',
    prompt: 'Viết 4 câu: gợi ý một món ăn + vì sao, gợi ý một món quà, nói giá khoảng bao nhiêu, và một mẹo mua (hỏi giá / nói đắt).',
    model: ['You should try banh xeo — it’s crispy and not too spicy.', 'For your sister, how about a nice T-shirt? They’re about 200,000 dong at the night market.', 'Too expensive? Say "That’s a bit expensive" — you can get a better price!'],
    checklist: [
      'Có gợi ý món ăn với You should try + lý do.',
      'Có gợi ý món quà và giá khoảng.',
      'Có một câu về giá (How much is it? / That’s (a bit/too) expensive).',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn dẫn bạn nước ngoài đi ăn rồi vào tiệm quà.',
    roleA: 'Bạn — hỏi bạn thích gì, gợi ý món, gọi món cho hai người, xin tính tiền; ở tiệm quà hỏi có không, màu, giá, quyết định.',
    roleB: 'Bạn nước ngoài + người bán — bạn: không ăn cay, tìm quà cho bố; người bán: có, 180.000, hai cái còn 320.000.',
    prompt: 'Nói thành tiếng các vai, không nhìn mẫu lần đầu. Đi hết hai tình huống: ăn → mua quà.',
    model: ['A: Do you like spicy food? — B: No, I don’t. — A: You should try pho. Two bowls of pho and two lemon juices, please… Can I have the bill?', 'A: I’m looking for a T-shirt for his dad. Do you have this in brown? How much is it? — Seller: 180,000. — A: That’s a bit expensive. Two for 300,000? — Seller: OK.', 'A: I’ll take them — the two T-shirts. Here you are.'],
    checklist: [
      'Gọi món đủ cho hai người và xin tính tiền.',
      'Ở tiệm quà: hỏi có/màu và giá.',
      'Kết bằng quyết định mua (I’ll take it / … please).',
    ],
  },
};
