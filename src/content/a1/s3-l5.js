// Chặng 3 · Bài 5 — Checkpoint: hướng dẫn khách đến nhà.
// Reuses 3.1–3.4: rooms/there is, directions, transport, describing the area.
// "Get off" and "if you get lost" survive only as translated dialogue/
// listening context — the assessed targets are all taught directions.
export default {
  id: 'a1-s3-l5',
  stage: 3,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 2,
  title: 'Checkpoint · Hướng dẫn khách đến nhà',
  canDo: 'Hướng dẫn một người bạn đến nhà mình: đi xe nào, đến đâu, mất bao lâu, đi bộ thế nào, nhà ở đâu; miêu tả ngắn khu mình ở.',

  chunks: [
    { id: 'c1', target: 'Take bus number … to …', meaning: 'Bắt xe buýt số … đến …', example: 'Take bus number 8 to the market.', exampleVi: 'Bắt xe buýt số 8 đến chợ.' },
    { id: 'c2', target: 'It takes about … minutes.', meaning: 'Mất khoảng … phút.', example: 'It takes about fifteen minutes by bus.', exampleVi: 'Đi xe buýt mất khoảng mười lăm phút.' },
    { id: 'c3', target: 'From there, …', meaning: 'Từ đó, …', example: 'From there, go straight for five minutes.', exampleVi: 'Từ đó, đi thẳng năm phút.' },
    { id: 'c4', target: 'Turn left / right at the …', meaning: 'Rẽ trái / phải ở …', example: 'Turn right at the pharmacy.', exampleVi: 'Rẽ phải ở hiệu thuốc.' },
    { id: 'c5', target: 'It’s on your left / right.', meaning: 'Nó ở bên trái / phải bạn.', example: 'My house? It’s on your left.', exampleVi: 'Nhà tôi hả? Nó ở bên trái bạn.' },
    { id: 'c6', target: 'opposite the …', meaning: 'đối diện …', example: 'My house is opposite the post office.', exampleVi: 'Nhà tôi đối diện bưu điện.' },
    { id: 'c7', target: 'How long does it take?', meaning: 'Đi mất bao lâu?', example: 'How long does it take by bus?', exampleVi: 'Đi xe buýt mất bao lâu?' },
    { id: 'c8', target: 'It’s a quiet street near …', meaning: 'Đó là một con đường yên tĩnh gần …', example: 'It’s a quiet street near the river.', exampleVi: 'Đó là một con đường yên tĩnh gần sông.' },
  ],

  drills: [
    { q: '___ straight for two minutes.', options: ['Go', 'Turn', 'Take'], answer: 0, hint: 'go straight = đi thẳng.' },
    { q: 'My house is ___ your left.', options: ['on', 'in', 'at'], answer: 0, hint: 'on your left/right = bên trái/phải bạn.' },
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
      ['Thao: It’s a quiet street. My house is on your left, opposite the post office.', 'Thảo: Đường yên tĩnh. Nhà mình bên trái bạn, đối diện bưu điện.'],
      ['Ben: Bus 3, supermarket, right at the pharmacy, opposite the post office. Got it!', 'Ben: Xe 3, siêu thị, rẽ phải ở hiệu thuốc, đối diện bưu điện. Hiểu rồi!'],
      ['Thao: Perfect. Call me if you get lost!', 'Thảo: Tuyệt. Gọi mình nếu lạc nhé!'],
    ],
    questions: [
      { q: 'Ben bắt xe buýt số mấy?', options: ['3', '13', '15'], answer: 0, hint: '"Take bus number 3".' },
      { q: 'Xuống ở đâu?', options: ['Siêu thị lớn', 'Hiệu thuốc', 'Ga tàu'], answer: 0, hint: '"Get off at the big supermarket."' },
      { q: 'Rẽ phải ở đâu?', options: ['Hiệu thuốc', 'Siêu thị', 'Đường Lê Lợi'], answer: 0, hint: '"turn right at the pharmacy".' },
      { q: 'Nhà Thảo ở đâu?', options: ['Bên trái, đối diện bưu điện', 'Bên phải, cạnh siêu thị', 'Đối diện hiệu thuốc'], answer: 0, hint: '"on your left, opposite the post office".' },
    ],
  },

  listening: {
    text: 'Hi Anna, it’s Mark. To get to my flat, take the number 22 bus from the airport and get off at the university. It takes about forty minutes. From there, go straight for five minutes. My building is opposite a small park, on your left. Call me if you get lost!',
    vi: 'Chào Anna, Mark đây. Để đến căn hộ mình, bắt xe 22 từ sân bay, xuống ở trường đại học. Mất khoảng bốn mươi phút. Từ đó, đi thẳng năm phút. Tòa nhà mình đối diện một công viên nhỏ, bên trái bạn. Gọi mình nếu lạc!',
    questions: [
      { q: 'Anna xuống xe ở đâu?', options: ['Trường đại học', 'Sân bay', 'Công viên'], answer: 0, hint: '"get off at the university".' },
      { q: 'Đi xe mất bao lâu?', options: ['40 phút', '4 phút', '14 phút'], answer: 0, hint: '"about forty minutes".' },
      { q: 'Tòa nhà của Mark đối diện gì?', options: ['Công viên nhỏ', 'Trường đại học', 'Sân bay'], answer: 0, hint: '"opposite a small park".' },
    ],
  },

  write: {
    setup: 'Một người bạn nước ngoài sẽ đến nhà bạn ăn tối, xuất phát từ bến xe/ga gần nhất.',
    prompt: 'Viết 4 câu tin nhắn: đi bằng gì và đến đâu, mất bao lâu, đi bộ tiếp thế nào, nhà bạn ở đâu.',
    model: ['Take bus number 9 from the station to the market. It takes about twenty minutes.', 'From there, go straight and turn left at the bank.', 'My house is on your right, opposite a small park. Call me!'],
    checklist: [
      'Có phương tiện + điểm đến (Take bus … to …).',
      'Có thời gian đi (It takes about …).',
      'Có ít nhất một chỉ dẫn đi bộ và một vị trí (on your left/right, opposite …).',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn của bạn gọi điện từ bến xe, hỏi đường đến nhà bạn.',
    roleA: 'Bạn của bạn — hỏi đi bằng gì, mất bao lâu, nhắc lại chỉ dẫn.',
    roleB: 'Bạn — hướng dẫn đủ: xe/điểm đến, đi bộ, vị trí nhà; miêu tả một câu về khu bạn ở.',
    prompt: 'Nói thành tiếng cả hai vai, không nhìn mẫu lần đầu. Người hỏi phải nhắc lại các mốc.',
    model: ['A: How do I get to your house? — B: Take bus 6 to the park. It takes about ten minutes.', 'B: From there, turn left. It’s a quiet street. My house is on your right, opposite a small cafe.', 'A: Bus 6, the park, left, opposite the cafe. Got it!'],
    checklist: [
      'Chỉ dẫn có đủ 4 phần: phương tiện, điểm đến, đi bộ, vị trí nhà.',
      'Có một câu miêu tả khu ở (quiet / busy / near …).',
      'Người hỏi nhắc lại được các mốc.',
    ],
  },
};
