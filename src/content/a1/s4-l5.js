// Chặng 4 · Bài 5 — Checkpoint: đi ăn và mua quà.
// Reuses 4.1–4.4: ordering, quantities, clothes/sizes, likes and suggestions.
export default {
  id: 'a1-s4-l5',
  stage: 4,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 1,
  title: 'Checkpoint · Đi ăn và mua quà',
  canDo: 'Dẫn một người bạn đi ăn (gợi ý món theo sở thích, gọi món, tính tiền) rồi giúp họ mua một món quà (hỏi có không, cỡ/màu, giá, quyết định).',

  chunks: [
    { id: 'c1', target: 'What do you feel like eating?', meaning: 'Bạn muốn ăn gì?', example: 'What do you feel like eating tonight?', exampleVi: 'Tối nay bạn muốn ăn gì?' },
    { id: 'c2', target: 'I’m looking for a gift for …', meaning: 'Tôi đang tìm quà cho …', example: 'I’m looking for a gift for my mother.', exampleVi: 'Tôi đang tìm quà cho mẹ tôi.' },
    { id: 'c3', target: 'How about this one?', meaning: 'Cái này thì sao?', example: 'How about this one? It’s handmade.', exampleVi: 'Cái này thì sao? Làm bằng tay đó.' },
    { id: 'c4', target: 'Can you wrap it, please?', meaning: 'Gói lại giúp tôi được không?', example: 'It’s a gift. Can you wrap it, please?', exampleVi: 'Là quà. Gói lại giúp tôi được không?' },
    { id: 'c5', target: 'Is there a discount?', meaning: 'Có giảm giá không?', example: 'Two scarves — is there a discount?', exampleVi: 'Hai khăn — có giảm giá không?' },
    { id: 'c6', target: 'I’ll pay by card / in cash.', meaning: 'Tôi trả bằng thẻ / tiền mặt.', example: 'I’ll pay by card, please.', exampleVi: 'Tôi trả bằng thẻ.' },
    { id: 'c7', target: 'It was delicious, thank you.', meaning: 'Rất ngon, cảm ơn.', example: 'It was delicious, thank you. The bill, please.', exampleVi: 'Rất ngon, cảm ơn. Cho tính tiền.' },
  ],

  drills: [
    { q: 'Hỏi bạn muốn ăn gì:', options: ['What do you feel like eating?', 'How much do you eat?', 'Do you like eat?'], answer: 0, hint: 'feel like + V-ing = muốn.' },
    { q: 'I’m looking for a gift ___ my sister.', options: ['for', 'to', 'at'], answer: 0, hint: 'a gift for + người.' },
    { q: 'Hỏi giảm giá:', options: ['Is there a discount?', 'Are there discount?', 'How much discount is?'], answer: 0, hint: 'Is there a + danh từ số ít.' },
    { q: 'I’ll pay ___ card.', options: ['by', 'with', 'in'], answer: 0, hint: 'by card / in cash.' },
  ],

  dialogue: {
    title: 'Ăn trưa rồi mua quà',
    lines: [
      ['Hoa: What do you feel like eating, Jack?', 'Hoa: Bạn muốn ăn gì, Jack?'],
      ['Jack: Something not too spicy. I like noodles.', 'Jack: Gì đó không quá cay. Tôi thích mì.'],
      ['Hoa: Then you should try pho. Two bowls of beef pho and two iced teas, please.', 'Hoa: Vậy bạn nên thử phở. Cho hai tô phở bò và hai trà đá.'],
      ['Jack: It was delicious, thank you! Now, I’m looking for a gift for my mum.', 'Jack: Ngon quá, cảm ơn! Giờ tôi đang tìm quà cho mẹ.'],
      ['Hoa: How about a silk scarf? This shop has some nice ones. Do you have this in blue?', 'Hoa: Khăn lụa thì sao? Tiệm này có mấy cái đẹp. Có cái này màu xanh không?'],
      ['Seller: Yes. 250,000 dong. Two for 450,000.', 'Người bán: Có. 250 nghìn. Hai cái 450 nghìn.'],
      ['Jack: Just one, please. Can you wrap it? I’ll pay by card.', 'Jack: Một cái thôi. Gói lại được không? Tôi trả bằng thẻ.'],
    ],
    questions: [
      { q: 'Jack không muốn ăn gì?', options: ['Đồ quá cay', 'Mì', 'Phở'], answer: 0, hint: '"Something not too spicy."' },
      { q: 'Hoa gọi gì?', options: ['2 phở bò + 2 trà đá', '2 bún chả + 2 cà phê', '1 phở + 1 trà'], answer: 0, hint: '"Two bowls of beef pho and two iced teas".' },
      { q: 'Jack mua quà gì cho mẹ?', options: ['Khăn lụa xanh', 'Áo phông', 'Túi'], answer: 0, hint: '"a silk scarf… in blue".' },
      { q: 'Jack trả tiền bằng gì?', options: ['Thẻ', 'Tiền mặt', 'Chuyển khoản'], answer: 0, hint: '"I’ll pay by card."' },
    ],
  },

  listening: {
    text: 'Hi Lan, it’s Chris. Thanks for lunch today — the bun cha was delicious! Quick question: I want to buy a T-shirt for my brother, size large, in black or grey. Do you know a good shop near the market? And is there usually a discount if I buy two? Thanks!',
    vi: 'Chào Lan, Chris đây. Cảm ơn bữa trưa hôm nay — bún chả ngon quá! Hỏi nhanh: mình muốn mua áo phông cho em trai, cỡ L, màu đen hoặc xám. Bạn biết tiệm nào tốt gần chợ không? Và thường mua hai cái có giảm giá không? Cảm ơn!',
    questions: [
      { q: 'Chris muốn mua gì?', options: ['Áo phông cỡ L', 'Khăn lụa', 'Áo khoác cỡ M'], answer: 0, hint: '"a T-shirt… size large".' },
      { q: 'Màu nào?', options: ['Đen hoặc xám', 'Xanh hoặc trắng', 'Đỏ'], answer: 0, hint: '"in black or grey".' },
      { q: 'Chris hỏi thêm điều gì?', options: ['Mua hai có giảm giá không', 'Quán có mở Chủ nhật không', 'Giá vé xe'], answer: 0, hint: '"is there usually a discount if I buy two?"' },
    ],
  },

  write: {
    setup: 'Một người bạn nước ngoài hỏi bạn: "I want to buy a gift for my sister and try some local food. Any ideas?"',
    prompt: 'Viết 4 câu: gợi ý một món ăn + vì sao, gợi ý một món quà, nói giá khoảng bao nhiêu, và một mẹo mua (hỏi giảm giá / trả bằng gì).',
    model: ['You should try banh xeo — it’s crispy and not spicy.', 'For your sister, how about a silk scarf? They’re about 200,000 dong at the night market.', 'Ask "Is there a discount?" if you buy two. You can pay in cash.'],
    checklist: [
      'Có gợi ý món ăn với You should try + lý do.',
      'Có gợi ý quà và giá khoảng.',
      'Có một mẹo mua sắm (discount / pay by …).',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn dẫn bạn nước ngoài đi ăn rồi vào tiệm quà.',
    roleA: 'Bạn — hỏi bạn muốn ăn gì, gọi món cho hai người, xin tính tiền; ở tiệm quà hỏi có không, màu/cỡ, giá, giảm giá, gói lại.',
    roleB: 'Bạn nước ngoài + người bán — bạn: không ăn cay, tìm quà cho bố; người bán: có, 180.000, hai cái giảm còn 320.000.',
    prompt: 'Nói thành tiếng các vai, không nhìn mẫu lần đầu. Đi hết hai tình huống: ăn → mua quà.',
    model: ['A: What do you feel like eating? — B: Not spicy. — A: Two chicken rice and two lemon juices, please… Can I have the bill?', 'A: I’m looking for a gift for his dad. Do you have this in brown? How much is it? — Seller: 180,000. — A: Is there a discount for two? — Seller: 320,000 for two.', 'A: One, please. Can you wrap it? He’ll pay in cash.'],
    checklist: [
      'Gọi món đủ cho hai người và xin tính tiền.',
      'Ở tiệm quà: hỏi có/màu, giá và giảm giá.',
      'Kết bằng quyết định mua + cách trả tiền.',
    ],
  },
};
