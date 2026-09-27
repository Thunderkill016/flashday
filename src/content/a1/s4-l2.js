// Chặng 4 · Bài 2 — Đi chợ: số lượng, some/any.
export default {
  id: 'a1-s4-l2',
  stage: 4,
  order: 2,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Đi chợ mua đồ ăn',
  canDo: 'Mua đồ ăn ở chợ/siêu thị: hỏi có không, nói số lượng (a kilo, two bottles), hỏi giá và trả tiền.',

  pattern: {
    name: 'some / any + a kilo of … / a bottle of …',
    rule:
      '"some" trong câu khẳng định (I need some eggs); "any" trong câu hỏi và phủ định (Do you have any milk? / We don’t have any). Số lượng: "a kilo of rice", "two bottles of water", "half a kilo of pork", "a dozen eggs". Hỏi giá theo đơn vị: "How much is a kilo?"',
    examples: [
      ['I need some tomatoes and a kilo of rice.', 'Tôi cần một ít cà chua và một cân gạo.'],
      ['Do you have any fresh fish?', 'Có cá tươi không?'],
      ['How much is a kilo of mango?', 'Xoài bao nhiêu một cân?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'I need some …', meaning: 'Tôi cần một ít …', example: 'I need some onions.', exampleVi: 'Tôi cần một ít hành.' },
    { id: 'c2', target: 'Do you have any …?', meaning: 'Có … không?', example: 'Do you have any fresh bread?', exampleVi: 'Có bánh mì tươi không?' },
    { id: 'c3', target: 'a kilo of / half a kilo of …', meaning: 'một cân / nửa cân …', example: 'Half a kilo of pork, please.', exampleVi: 'Cho nửa cân thịt heo.' },
    { id: 'c4', target: 'a bottle of / a bag of …', meaning: 'một chai / một túi …', example: 'Two bottles of water and a bag of sugar.', exampleVi: 'Hai chai nước và một túi đường.' },
    { id: 'c5', target: 'How much is a kilo?', meaning: 'Bao nhiêu một cân?', example: 'How much is a kilo of apples?', exampleVi: 'Táo bao nhiêu một cân?' },
    { id: 'c6', target: 'That’s too expensive.', meaning: 'Đắt quá.', example: 'Fifty thousand? That’s too expensive.', exampleVi: 'Năm mươi nghìn? Đắt quá.' },
    { id: 'c7', target: 'Here you are.', meaning: 'Đây ạ. (đưa tiền/đồ)', example: 'Here you are. 100,000.', exampleVi: 'Đây ạ. 100 nghìn.' },
    { id: 'c8', target: 'Keep the change.', meaning: 'Không cần trả lại.', example: 'Thanks. Keep the change.', exampleVi: 'Cảm ơn. Không cần trả lại.' },
  ],

  drills: [
    { q: 'I need ___ eggs.', options: ['some', 'any', 'a'], answer: 0, hint: 'Câu khẳng định → some.' },
    { q: 'Do you have ___ milk?', options: ['any', 'some', 'a'], answer: 0, hint: 'Câu hỏi → any.' },
    { q: 'A ___ of water, please.', options: ['bottle', 'kilo', 'slice'], answer: 0, hint: 'nước → bottle (chai).' },
    { q: 'Hỏi giá theo cân:', options: ['How much is a kilo?', 'How many is a kilo?', 'How much kilo?'], answer: 0, hint: 'How much is a kilo of …?' },
    { q: 'We don’t have ___ fish today.', options: ['any', 'some', 'a'], answer: 0, hint: 'Phủ định → any.' },
  ],

  dialogue: {
    title: 'Ở chợ sáng',
    lines: [
      ['Seller: Good morning! What do you need?', 'Người bán: Chào buổi sáng! Cô cần gì?'],
      ['Ha: Do you have any fresh tomatoes?', 'Hà: Có cà chua tươi không?'],
      ['Seller: Yes. 20,000 a kilo.', 'Người bán: Có. 20 nghìn một cân.'],
      ['Ha: A kilo, please. And half a kilo of onions.', 'Hà: Cho một cân. Và nửa cân hành.'],
      ['Seller: Anything else? I have some nice mangoes today.', 'Người bán: Gì nữa không? Hôm nay có xoài ngon.'],
      ['Ha: How much is a kilo of mangoes?', 'Hà: Xoài bao nhiêu một cân?'],
      ['Seller: 60,000.', 'Người bán: 60 nghìn.'],
      ['Ha: Hmm, that’s a bit expensive. Just the tomatoes and onions. Here you are.', 'Hà: Hơi đắt. Chỉ cà chua và hành thôi. Đây ạ.'],
    ],
    questions: [
      { q: 'Cà chua giá bao nhiêu một cân?', options: ['20.000', '60.000', '10.000'], answer: 0, hint: '"20,000 a kilo".' },
      { q: 'Hà mua bao nhiêu hành?', options: ['Nửa cân', 'Một cân', 'Hai cân'], answer: 0, hint: '"half a kilo of onions".' },
      { q: 'Hà có mua xoài không?', options: ['Không, hơi đắt', 'Có, một cân', 'Có, hai cân'], answer: 0, hint: '"that’s a bit expensive. Just the tomatoes and onions."' },
    ],
  },

  listening: {
    text: 'Honey, can you go to the supermarket? We need some rice — a five-kilo bag — two bottles of cooking oil, and a dozen eggs. We don’t need any sugar, we have some. Oh, and some bananas. Thanks!',
    vi: 'Mình ơi, đi siêu thị được không? Nhà cần gạo — một túi 5 cân — hai chai dầu ăn, và một tá trứng. Không cần đường, còn mà. À, và ít chuối. Cảm ơn!',
    questions: [
      { q: 'Cần mua mấy chai dầu ăn?', options: ['2', '5', '12'], answer: 0, hint: '"two bottles of cooking oil".' },
      { q: 'Không cần mua gì?', options: ['Đường', 'Trứng', 'Chuối'], answer: 0, hint: '"We don’t need any sugar."' },
    ],
  },

  write: {
    setup: 'Bạn nhắn cho người nhà đi siêu thị giúp.',
    prompt: 'Viết một danh sách 3–4 thứ cần mua dưới dạng câu, có số lượng (kilo / bottle / bag / dozen) và một thứ KHÔNG cần mua.',
    model: ['Can you buy some things? We need a kilo of rice, two bottles of milk and a dozen eggs.', 'We don’t need any bread.', 'Thanks!'],
    checklist: [
      'Dùng đúng some (khẳng định) / any (phủ định, câu hỏi).',
      'Có ít nhất 2 cụm số lượng (a kilo of / a bottle of…).',
      'Có một câu phủ định "We don’t need any …".',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn mua đồ ở sạp trái cây trong chợ.',
    roleA: 'Khách — hỏi có xoài/cam không, hỏi giá theo cân, mua 1 cân + nửa cân, trả tiền.',
    roleB: 'Người bán — có xoài 40.000/kg, không có cam, gợi ý mua thêm chuối.',
    prompt: 'Nói thành tiếng cả hai vai. Đọc giá và số lượng rõ.',
    model: ['A: Do you have any oranges? — B: Sorry, no oranges today. I have mangoes.', 'A: How much is a kilo of mangoes? — B: 40,000. — A: A kilo, please. And half a kilo of bananas.', 'A: Here you are. — B: Thank you!'],
    checklist: [
      'Có Do you have any …?',
      'Có hỏi giá theo cân và nói số lượng.',
      'Có Here you are khi trả tiền.',
    ],
  },
};
