// Chặng 3 · Bài 3 — Phương tiện và mua vé.
export default {
  id: 'a1-s3-l3',
  stage: 3,
  order: 3,
  kind: 'lesson',
  contentVersion: 2,
  title: 'Đi bằng gì? Mua vé',
  canDo: 'Nói mình đi làm/đi học bằng gì, hỏi xe/tàu nào đến đâu, mua vé và hỏi giá, giờ chạy.',

  pattern: {
    name: 'I go … by bus / How do you get to …? / A ticket to …, please.',
    rule:
      'Phương tiện: "by + bus/train/bike/car/taxi/motorbike" hoặc "on foot" (đi bộ). Hỏi: "How do you get to work?" Mua vé: "A ticket to + nơi, please." / "Two tickets to Hue, please." Hỏi giá: "How much is it?" Hỏi giờ: "What time does the next bus leave?"',
    examples: [
      ['I go to work by motorbike.', 'Tôi đi làm bằng xe máy.'],
      ['How do you get to school? — On foot.', 'Bạn đến trường bằng gì? — Đi bộ.'],
      ['One ticket to Da Nang, please. How much is it?', 'Một vé đi Đà Nẵng. Bao nhiêu tiền?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'How do you get to …?', meaning: 'Bạn đến … bằng gì?', example: 'How do you get to work?', exampleVi: 'Bạn đi làm bằng gì?' },
    { id: 'c2', target: 'by bus / by train / by motorbike', meaning: 'bằng xe buýt / tàu / xe máy', example: 'I go to school by bus.', exampleVi: 'Tôi đi học bằng xe buýt.' },
    { id: 'c3', target: 'on foot', meaning: 'đi bộ', example: 'I go to the market on foot.', exampleVi: 'Tôi đi bộ đến chợ.' },
    { id: 'c4', target: 'A ticket to …, please.', meaning: 'Cho một vé đi …', example: 'A ticket to Hanoi, please.', exampleVi: 'Cho một vé đi Hà Nội.' },
    { id: 'c5', target: 'How much is it?', meaning: 'Bao nhiêu tiền?', example: 'Two tickets. How much is it?', exampleVi: 'Hai vé. Bao nhiêu tiền?' },
    { id: 'c6', target: 'Which bus goes to …?', meaning: 'Xe buýt nào đi …?', example: 'Which bus goes to the airport?', exampleVi: 'Xe buýt nào đi sân bay?' },
    { id: 'c7', target: 'What time does the next … leave?', meaning: 'Chuyến … tiếp theo chạy lúc mấy giờ?', example: 'What time does the next train leave?', exampleVi: 'Chuyến tàu tiếp theo chạy lúc mấy giờ?' },
    { id: 'c8', target: 'It takes about … minutes.', meaning: 'Mất khoảng … phút.', example: 'It takes about twenty minutes by bus.', exampleVi: 'Đi xe buýt mất khoảng hai mươi phút.' },
  ],

  drills: [
    { q: 'I go to work ___ bus.', options: ['by', 'on', 'with'], answer: 0, hint: 'by + phương tiện.' },
    { q: 'I go to the shop ___ foot.', options: ['by', 'on', 'in'], answer: 1, hint: 'on foot = đi bộ (ngoại lệ).' },
    { q: 'Mua vé:', options: ['A ticket to Hue, please.', 'Where is Hue?', 'How do you get to Hue?'], answer: 0, hint: 'A ticket to + nơi, please.' },
    { q: 'Hỏi giá:', options: ['How much is it?', 'How many is it?', 'How old is it?'], answer: 0, hint: 'How much = bao nhiêu tiền.' },
    { q: 'What time ___ the next bus leave?', options: ['does', 'do', 'is'], answer: 0, hint: 'the next bus (it) → does.' },
  ],

  dialogue: {
    title: 'Mua vé xe đi Đà Lạt',
    lines: [
      ['Minh: Hello. Which bus goes to Da Lat?', 'Minh: Chào. Xe nào đi Đà Lạt?'],
      ['Clerk: Bus number 12. The next one leaves at two thirty.', 'Nhân viên: Xe số 12. Chuyến tiếp theo chạy lúc hai rưỡi.'],
      ['Minh: Two tickets to Da Lat, please. How much is it?', 'Minh: Cho hai vé đi Đà Lạt. Bao nhiêu tiền?'],
      ['Clerk: 300,000 dong for two.', 'Nhân viên: Ba trăm nghìn cho hai vé.'],
      ['Minh: OK. How long does it take?', 'Minh: Được. Đi mất bao lâu?'],
      ['Clerk: About six hours.', 'Nhân viên: Khoảng sáu tiếng.'],
      ['Minh: Thank you. Where is the bus?', 'Minh: Cảm ơn. Xe ở đâu?'],
      ['Clerk: Gate 4, on your right.', 'Nhân viên: Cửa 4, bên phải bạn.'],
    ],
    questions: [
      { q: 'Xe nào đi Đà Lạt?', options: ['Số 12', 'Số 21', 'Số 4'], answer: 0, hint: '"Bus number 12."' },
      { q: 'Chuyến tiếp theo chạy lúc mấy giờ?', options: ['2:30', '3:00', '2:00'], answer: 0, hint: '"leaves at two thirty".' },
      { q: 'Đi mất bao lâu?', options: ['6 tiếng', '4 tiếng', '2 tiếng'], answer: 0, hint: '"About six hours."' },
    ],
  },

  listening: {
    text: 'Attention please. The train to Hue leaves from platform two at eleven fifteen. The journey takes about three hours. Tickets are 150,000 dong. Thank you.',
    vi: 'Xin chú ý. Tàu đi Huế khởi hành từ đường ray số hai lúc 11:15. Hành trình mất khoảng ba tiếng. Vé 150.000 đồng. Cảm ơn.',
    questions: [
      { q: 'Tàu đi Huế chạy lúc mấy giờ?', options: ['11:15', '11:50', '10:15'], answer: 0, hint: '"at eleven fifteen".' },
      { q: 'Từ đường ray số mấy?', options: ['2', '3', '11'], answer: 0, hint: '"platform two".' },
    ],
  },

  write: {
    setup: 'Bạn nhắn cho một đồng nghiệp mới hỏi cách đi đến văn phòng và kể cách bạn đi.',
    prompt: 'Viết 3 câu: bạn đi làm bằng gì, mất bao lâu, và hỏi người kia đi bằng gì.',
    model: ['I go to work by motorbike.', 'It takes about twenty-five minutes.', 'How do you get to the office?'],
    checklist: [
      'Có "by + phương tiện" hoặc "on foot".',
      'Có "It takes about … minutes".',
      'Có câu hỏi "How do you get to …?".',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn ở bến xe, muốn đi Nha Trang.',
    roleA: 'Bạn — hỏi xe nào đi Nha Trang, mấy giờ chạy, mua 1 vé, hỏi giá và đi mất bao lâu.',
    roleB: 'Nhân viên — xe số 7, chạy 9:00, vé 200.000, mất 8 tiếng, cửa 2.',
    prompt: 'Nói thành tiếng cả hai vai. Đọc số tiền và giờ rõ ràng.',
    model: ['A: Which bus goes to Nha Trang? — B: Number 7. It leaves at nine.', 'A: One ticket to Nha Trang, please. How much is it? — B: 200,000 dong.', 'A: How long does it take? — B: About eight hours. Gate 2.'],
    checklist: [
      'Có Which bus goes to …?',
      'Có câu mua vé + hỏi giá.',
      'Có hỏi giờ chạy hoặc thời gian đi.',
    ],
  },
};
