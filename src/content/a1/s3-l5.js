// Chặng 3 · Bài 5 — Checkpoint: hướng dẫn khách đến nhà.
// Reuses 3.1–3.4: rooms/there is, directions, transport, describing the area.
export default {
  id: 'a1-s3-l5',
  stage: 3,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 1,
  title: 'Checkpoint · Hướng dẫn khách đến nhà',
  canDo: 'Hướng dẫn một người bạn đến nhà mình: đi bằng gì, xuống ở đâu, đi bộ thế nào, nhận ra nhà ra sao; miêu tả ngắn khu mình ở.',

  chunks: [
    { id: 'c1', target: 'Take bus number … to …', meaning: 'Bắt xe buýt số … đến …', example: 'Take bus number 8 to the market.', exampleVi: 'Bắt xe buýt số 8 đến chợ.' },
    { id: 'c2', target: 'Get off at …', meaning: 'Xuống ở …', example: 'Get off at the hospital.', exampleVi: 'Xuống ở bệnh viện.' },
    { id: 'c3', target: 'From there, …', meaning: 'Từ đó, …', example: 'From there, go straight for five minutes.', exampleVi: 'Từ đó, đi thẳng năm phút.' },
    { id: 'c4', target: 'My house is the … one with …', meaning: 'Nhà tôi là căn … có …', example: 'My house is the yellow one with a blue door.', exampleVi: 'Nhà tôi là căn màu vàng có cửa xanh.' },
    { id: 'c5', target: 'Call me if you get lost.', meaning: 'Gọi tôi nếu lạc đường.', example: 'Call me if you get lost, OK?', exampleVi: 'Gọi tôi nếu lạc đường nhé?' },
    { id: 'c6', target: 'It’s a quiet street near …', meaning: 'Đó là một con đường yên tĩnh gần …', example: 'It’s a quiet street near the river.', exampleVi: 'Đó là một con đường yên tĩnh gần sông.' },
    { id: 'c7', target: 'How long does it take?', meaning: 'Đi mất bao lâu?', example: 'How long does it take by bus?', exampleVi: 'Đi xe buýt mất bao lâu?' },
  ],

  drills: [
    { q: '___ bus number 5 and ___ off at the school.', options: ['Take / get', 'Go / turn', 'Make / take'], answer: 0, hint: 'take a bus = bắt xe; get off = xuống xe.' },
    { q: 'My house is the white ___ with a big gate.', options: ['one', 'house one', 'it'], answer: 0, hint: '"the white one" = căn màu trắng (one thay cho house).' },
    { q: 'Từ trạm xe, đi tiếp:', options: ['From there, turn left.', 'There from, left turn.', 'From turn left there.'], answer: 0, hint: 'From there, + mệnh lệnh.' },
    { q: 'Hỏi thời gian đi:', options: ['How long does it take?', 'How much does it take?', 'How far it takes?'], answer: 0, hint: 'How long = bao lâu.' },
  ],

  dialogue: {
    title: 'Tin nhắn chỉ đường về nhà',
    lines: [
      ['Ben: Hi Thao! I’m at the train station. How do I get to your house?', 'Ben: Chào Thảo! Mình đang ở ga. Đến nhà bạn thế nào?'],
      ['Thao: Take bus number 3 to Le Loi Street. It takes about fifteen minutes.', 'Thảo: Bắt xe buýt số 3 đến đường Lê Lợi. Mất khoảng mười lăm phút.'],
      ['Thao: Get off at the big supermarket. From there, go straight and turn right at the pharmacy.', 'Thảo: Xuống ở siêu thị lớn. Từ đó, đi thẳng rồi rẽ phải ở hiệu thuốc.'],
      ['Ben: OK. And your house?', 'Ben: Được. Còn nhà bạn?'],
      ['Thao: It’s a quiet street. My house is the green one with a small garden, on your left.', 'Thảo: Đường yên tĩnh. Nhà mình là căn màu xanh lá có vườn nhỏ, bên trái bạn.'],
      ['Ben: Bus 3, supermarket, right at the pharmacy, green house. Got it!', 'Ben: Xe 3, siêu thị, rẽ phải ở hiệu thuốc, nhà xanh. Hiểu rồi!'],
      ['Thao: Perfect. Call me if you get lost!', 'Thảo: Tuyệt. Gọi mình nếu lạc nhé!'],
    ],
    questions: [
      { q: 'Ben bắt xe buýt số mấy?', options: ['3', '13', '15'], answer: 0, hint: '"Take bus number 3".' },
      { q: 'Xuống ở đâu?', options: ['Siêu thị lớn', 'Hiệu thuốc', 'Ga tàu'], answer: 0, hint: '"Get off at the big supermarket."' },
      { q: 'Rẽ phải ở đâu?', options: ['Hiệu thuốc', 'Siêu thị', 'Đường Lê Lợi'], answer: 0, hint: '"turn right at the pharmacy".' },
      { q: 'Nhà Thảo trông thế nào?', options: ['Màu xanh lá, có vườn nhỏ', 'Màu vàng, cửa xanh', 'Màu trắng, cổng lớn'], answer: 0, hint: '"the green one with a small garden".' },
    ],
  },

  listening: {
    text: 'Hi Anna, it’s Mark. To get to my flat, take the number 22 bus from the airport and get off at the university. It takes about forty minutes. From there, walk straight for five minutes. My building is the tall grey one opposite a bakery. I’m on the third floor. Call me if you get lost!',
    vi: 'Chào Anna, Mark đây. Để đến căn hộ của mình, bắt xe 22 từ sân bay, xuống ở trường đại học. Mất khoảng bốn mươi phút. Từ đó, đi bộ thẳng năm phút. Tòa nhà của mình là tòa cao màu xám đối diện tiệm bánh. Mình ở tầng ba. Gọi mình nếu lạc!',
    questions: [
      { q: 'Anna xuống xe ở đâu?', options: ['Trường đại học', 'Sân bay', 'Tiệm bánh'], answer: 0, hint: '"get off at the university".' },
      { q: 'Đi xe mất bao lâu?', options: ['40 phút', '4 phút', '14 phút'], answer: 0, hint: '"about forty minutes".' },
      { q: 'Tòa nhà của Mark đối diện gì?', options: ['Tiệm bánh', 'Trường đại học', 'Sân bay'], answer: 0, hint: '"opposite a bakery".' },
    ],
  },

  write: {
    setup: 'Một người bạn nước ngoài sẽ đến nhà bạn ăn tối, xuất phát từ bến xe/ga gần nhất.',
    prompt: 'Viết 4 câu tin nhắn: đi bằng gì và xuống ở đâu, mất bao lâu, đi bộ tiếp thế nào, nhận ra nhà bạn bằng gì.',
    model: ['Take bus number 9 from the station and get off at the market. It takes about twenty minutes.', 'From there, go straight and turn left at the bank.', 'My house is the blue one with a big tree in front, on your right. Call me if you get lost!'],
    checklist: [
      'Có phương tiện + điểm xuống (Take … / Get off at …).',
      'Có thời gian đi (It takes about …).',
      'Có ít nhất một chỉ dẫn đi bộ và một đặc điểm nhận ra nhà.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn của bạn gọi điện từ bến xe, hỏi đường đến nhà bạn.',
    roleA: 'Bạn của bạn — hỏi đi bằng gì, mất bao lâu, nhắc lại chỉ dẫn.',
    roleB: 'Bạn — hướng dẫn đủ: xe/xuống ở đâu, đi bộ, nhận nhà; miêu tả một câu về khu bạn ở.',
    prompt: 'Nói thành tiếng cả hai vai, không nhìn mẫu lần đầu. Người hỏi phải nhắc lại các mốc.',
    model: ['A: How do I get to your house? — B: Take bus 6 and get off at the park. About ten minutes.', 'B: From there, turn left. It’s a quiet street. My house is the white one with a red gate, on your right.', 'A: Bus 6, the park, left, white house with a red gate. Got it!'],
    checklist: [
      'Chỉ dẫn có đủ 4 phần: phương tiện, điểm xuống, đi bộ, nhận nhà.',
      'Có một câu miêu tả khu ở (quiet / busy / near …).',
      'Người hỏi nhắc lại được các mốc.',
    ],
  },
};
