// Chặng 5 · Bài 4 — Thời tiết và mặc gì.
export default {
  id: 'a1-s5-l4',
  stage: 5,
  order: 4,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Hôm nay trời thế nào?',
  canDo: 'Nói và hỏi về thời tiết hôm nay, nói nên mặc/mang gì, và nhận xét đơn giản (nóng quá, đẹp quá).',

  pattern: {
    name: 'It’s sunny / raining. / What’s the weather like? / Take an umbrella.',
    rule:
      'Thời tiết dùng "It’s + tính từ": It’s hot / cold / sunny / cloudy / windy. Đang mưa: "It’s raining." Hỏi: "What’s the weather like today?" Nhiệt độ: "It’s 35 degrees." Lời khuyên: "You should wear a jacket." / "Take an umbrella." Tính từ + quá: "It’s too hot."',
    examples: [
      ['What’s the weather like? — It’s sunny and hot.', 'Trời thế nào? — Nắng và nóng.'],
      ['It’s raining. Take an umbrella.', 'Đang mưa. Mang ô đi.'],
      ['It’s cold today. You should wear a jacket.', 'Hôm nay lạnh. Bạn nên mặc áo khoác.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'What’s the weather like?', meaning: 'Trời thế nào?', example: 'What’s the weather like in Hanoi today?', exampleVi: 'Hôm nay trời Hà Nội thế nào?' },
    { id: 'c2', target: 'It’s sunny / cloudy / windy.', meaning: 'Trời nắng / nhiều mây / có gió.', example: 'It’s sunny this morning.', exampleVi: 'Sáng nay trời nắng.' },
    { id: 'c3', target: 'It’s raining.', meaning: 'Trời đang mưa.', example: 'It’s raining again!', exampleVi: 'Lại mưa nữa!' },
    { id: 'c4', target: 'It’s hot / cold / warm / cool.', meaning: 'Trời nóng / lạnh / ấm / mát.', example: 'It’s cool in the evening.', exampleVi: 'Buổi tối trời mát.' },
    { id: 'c5', target: 'It’s … degrees.', meaning: 'Trời … độ.', example: 'It’s 36 degrees today.', exampleVi: 'Hôm nay 36 độ.' },
    { id: 'c6', target: 'Take an umbrella.', meaning: 'Mang ô đi.', example: 'Take an umbrella — it looks like rain.', exampleVi: 'Mang ô đi — trông như sắp mưa.' },
    { id: 'c7', target: 'You should wear …', meaning: 'Bạn nên mặc …', example: 'You should wear a hat.', exampleVi: 'Bạn nên đội mũ.' },
    { id: 'c8', target: 'What a beautiful day!', meaning: 'Trời đẹp quá!', example: 'What a beautiful day! Let’s go out.', exampleVi: 'Trời đẹp quá! Ra ngoài đi.' },
  ],

  drills: [
    { q: 'Hỏi về thời tiết:', options: ['What’s the weather like?', 'How is the weather like?', 'What weather is?'], answer: 0, hint: 'What’s … like?' },
    { q: 'It’s ___. Take an umbrella.', options: ['raining', 'rain', 'rainy day'], answer: 0, hint: 'It’s raining = đang mưa.' },
    { q: 'It’s 8 degrees. You should wear a ___.', options: ['coat', 'T-shirt', 'hat only'], answer: 0, hint: '8 độ = lạnh → coat (áo khoác dày).' },
    { q: 'Khen thời tiết:', options: ['What a beautiful day!', 'What beautiful day is!', 'How a day beautiful!'], answer: 0, hint: 'What a + tính từ + danh từ!' },
  ],

  dialogue: {
    title: 'Chuẩn bị đi Sa Pa',
    lines: [
      ['Kim: I’m going to Sa Pa this weekend. What’s the weather like there?', 'Kim: Cuối tuần này tôi đi Sa Pa. Trời ở đó thế nào?'],
      ['Ha: It’s cold now — about 10 degrees in the morning.', 'Hà: Giờ lạnh — sáng khoảng 10 độ.'],
      ['Kim: Ten degrees! Here it’s 33.', 'Kim: Mười độ! Ở đây 33.'],
      ['Ha: Yes. You should wear a warm jacket and take an umbrella. It rains a lot.', 'Hà: Ừ. Bạn nên mặc áo khoác ấm và mang ô. Mưa nhiều lắm.'],
      ['Kim: Is it sunny sometimes?', 'Kim: Có lúc nắng không?'],
      ['Ha: In the afternoon, yes. Then it’s beautiful.', 'Hà: Buổi chiều thì có. Lúc đó đẹp lắm.'],
      ['Kim: OK. Jacket, umbrella, and a camera!', 'Kim: Được. Áo khoác, ô, và máy ảnh!'],
    ],
    questions: [
      { q: 'Sáng ở Sa Pa khoảng mấy độ?', options: ['10', '33', '20'], answer: 0, hint: '"about 10 degrees in the morning".' },
      { q: 'Hà khuyên mang gì?', options: ['Áo khoác ấm và ô', 'Mũ và kem chống nắng', 'Áo phông'], answer: 0, hint: '"a warm jacket and take an umbrella".' },
      { q: 'Khi nào trời đẹp?', options: ['Buổi chiều', 'Buổi sáng', 'Buổi tối'], answer: 0, hint: '"In the afternoon, yes."' },
    ],
  },

  listening: {
    text: 'Good morning! Here is the weather for today. In Hanoi it’s cloudy and cool, about 22 degrees. In Da Nang it’s sunny and hot, 34 degrees. In Ho Chi Minh City it’s raining this afternoon, so take an umbrella.',
    vi: 'Chào buổi sáng! Đây là thời tiết hôm nay. Hà Nội nhiều mây và mát, khoảng 22 độ. Đà Nẵng nắng và nóng, 34 độ. TP.HCM chiều nay mưa, nên mang ô.',
    questions: [
      { q: 'Đà Nẵng bao nhiêu độ?', options: ['34', '22', '24'], answer: 0, hint: '"sunny and hot, 34 degrees".' },
      { q: 'Nơi nào chiều mưa?', options: ['TP.HCM', 'Hà Nội', 'Đà Nẵng'], answer: 0, hint: '"In Ho Chi Minh City it’s raining this afternoon".' },
    ],
  },

  write: {
    setup: 'Một người bạn sắp bay đến thành phố của bạn tuần này và hỏi về thời tiết.',
    prompt: 'Viết 3 câu: trời đang thế nào (+ nhiệt độ), nên mặc gì, nên mang gì.',
    model: ['It’s hot and sunny here — about 35 degrees.', 'You should wear light clothes and a hat.', 'Take an umbrella too, because it sometimes rains in the afternoon.'],
    checklist: [
      'Có It’s + tính từ thời tiết và nhiệt độ.',
      'Có You should wear ….',
      'Có Take … / bring ….',
    ],
    gate: null,
  },

  speak: {
    setup: 'Sáng sớm, bạn gọi cho bạn ở thành phố khác trước khi họp online.',
    roleA: 'Bạn — hỏi thời tiết ở chỗ họ, nói thời tiết chỗ mình, khuyên họ mặc/mang gì cho buổi tối.',
    roleB: 'Bạn — ở Đà Lạt: mưa, 16 độ; tối lạnh.',
    prompt: 'Nói thành tiếng cả hai vai. Có hỏi What’s the weather like? và một lời khuyên should.',
    model: ['A: What’s the weather like in Da Lat? — B: It’s raining and cold, about 16 degrees.', 'A: Here it’s sunny and 30. You should wear a warm jacket tonight.', 'B: Yes, and I’ll take an umbrella.'],
    checklist: [
      'Có What’s the weather like?',
      'Có It’s + tính từ + nhiệt độ.',
      'Có You should wear / Take ….',
    ],
  },
};
