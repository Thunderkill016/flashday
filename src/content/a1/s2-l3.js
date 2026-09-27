// Chặng 2 · Bài 3 — Hẹn gặp, đề xuất và đổi giờ.
// The write task is a CONFIRMATION task: the learner must restate the final
// agreed time (gate). Counter-proposing a new time is a different skill and
// deliberately not mixed in here.
export default {
  id: 'a1-s2-l3',
  stage: 2,
  order: 3,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Hẹn gặp và đổi giờ',
  canDo: 'Đề xuất giờ gặp, đồng ý hoặc xin đổi giờ, và xác nhận lại giờ cuối cùng.',

  pattern: {
    name: 'How about …? / Can we meet at …? / See you at …',
    rule:
      'Đề xuất: "How about + giờ?" hoặc "Can we meet at + giờ?". Đồng ý: "OK." / "That works." / "Sounds good." Xin đổi: "Sorry, can we meet at … instead?" Chốt lại: "See you at + giờ." Luôn nhắc lại giờ cuối cùng để cả hai chắc chắn.',
    examples: [
      ['How about three?', 'Ba giờ thì sao?'],
      ['Sorry, can we meet at four instead?', 'Xin lỗi, mình gặp lúc bốn giờ được không?'],
      ['OK. See you at four.', 'Được. Hẹn gặp lúc bốn giờ.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'Are you free on …?', meaning: 'Bạn rảnh vào … không?', example: 'Are you free on Saturday?', exampleVi: 'Thứ Bảy bạn rảnh không?' },
    { id: 'c2', target: 'How about …?', meaning: '… thì sao?', example: 'How about two o’clock?', exampleVi: 'Hai giờ thì sao?' },
    { id: 'c3', target: 'Can we meet at …?', meaning: 'Mình gặp lúc … được không?', example: 'Can we meet at five thirty?', exampleVi: 'Mình gặp lúc năm rưỡi được không?' },
    { id: 'c4', target: 'That works. / Sounds good.', meaning: 'Được đó. / Nghe hay đó.', example: 'Five thirty? That works.', exampleVi: 'Năm rưỡi hả? Được đó.' },
    { id: 'c5', target: '… instead', meaning: '… thay vào đó', example: 'Can we meet at six instead?', exampleVi: 'Mình gặp lúc sáu giờ thay vào đó được không?' },
    { id: 'c6', target: 'See you at …', meaning: 'Hẹn gặp lúc …', example: 'See you at six, then.', exampleVi: 'Vậy hẹn gặp lúc sáu giờ.' },
    { id: 'c7', target: 'I’m busy at …', meaning: 'Tôi bận lúc …', example: 'Sorry, I’m busy at two.', exampleVi: 'Xin lỗi, hai giờ tôi bận.' },
  ],

  drills: [
    { q: 'Đề xuất giờ gặp:', options: ['How about three?', 'What time is it?', 'I’m fine, thanks.'], answer: 0, hint: 'How about + giờ = đề xuất.' },
    { q: 'Sorry, can we meet at five ___?', options: ['instead', 'also', 'again'], answer: 0, hint: 'instead = thay vào đó (đổi giờ).' },
    { q: 'Người kia nói "How about four?" và bạn đồng ý:', options: ['That works.', 'I’m busy at four.', 'What day is it?'], answer: 0, hint: 'That works = được đó.' },
    { q: 'Chốt lại giờ trước khi kết thúc:', options: ['See you at four.', 'Are you free?', 'How about four?'], answer: 0, hint: 'See you at + giờ = hẹn gặp lúc.' },
  ],

  dialogue: {
    title: 'Hẹn cà phê cuối tuần',
    lines: [
      ['Linh: Are you free on Sunday? Coffee at the new cafe near the market?', 'Linh: Chủ nhật bạn rảnh không? Cà phê ở quán mới gần chợ nhé?'],
      ['Alex: Yes! What time?', 'Alex: Được! Mấy giờ?'],
      ['Linh: How about two?', 'Linh: Hai giờ thì sao?'],
      ['Alex: Sorry, I’m busy at two. Can we meet at four thirty instead?', 'Alex: Xin lỗi, hai giờ tôi bận. Mình gặp lúc bốn rưỡi thay vào đó được không?'],
      ['Linh: Four thirty works. See you at four thirty.', 'Linh: Bốn rưỡi được. Hẹn gặp lúc bốn rưỡi.'],
      ['Alex: Great. See you at the cafe!', 'Alex: Tuyệt. Gặp ở quán nhé!'],
    ],
    questions: [
      { q: 'Linh đề xuất gặp lúc mấy giờ đầu tiên?', options: ['2:00', '4:00', '4:30'], answer: 0, hint: '"How about two?"' },
      { q: 'Vì sao Alex không gặp được lúc đó?', options: ['Alex bận', 'Quán đóng cửa', 'Alex ở xa'], answer: 0, hint: '"I’m busy at two."' },
      { q: 'Giờ cuối cùng hai người chốt?', options: ['2:00', '4:00', '4:30'], answer: 2, hint: '"See you at four thirty."' },
    ],
  },

  listening: {
    text: 'Hi Nam, it’s Sara. About tomorrow: I can’t do ten in the morning. Can we meet at eleven thirty instead? Same place, the library. Text me if that works. Bye!',
    vi: 'Chào Nam, Sara đây. Về ngày mai: mình không đi được lúc 10 giờ sáng. Mình gặp lúc 11 rưỡi thay vào đó được không? Chỗ cũ, thư viện. Nhắn cho mình nếu được nhé. Chào!',
    questions: [
      { q: 'Sara muốn đổi sang giờ nào?', options: ['10:00', '11:30', '11:00'], answer: 1, hint: '"Can we meet at eleven thirty instead?"' },
      { q: 'Hai người gặp ở đâu?', options: ['Thư viện', 'Quán cà phê', 'Trường'], answer: 0, hint: '"Same place, the library."' },
    ],
  },

  write: {
    setup: 'Bạn nhận tin nhắn từ Minh: "Hi! Sorry, I can’t do six. Can we meet at seven instead? Same cafe."',
    prompt: 'Trả lời tin nhắn: đồng ý và xác nhận lại giờ cuối cùng (bảy giờ). Bài này luyện XÁC NHẬN — đề xuất giờ khác là một bài riêng.',
    model: ['Hi Minh! No problem, seven works for me.', 'See you at seven at the cafe.'],
    checklist: [
      'Có câu đồng ý (That works / No problem / OK).',
      'Có "See you at seven" — nhắc lại đúng giờ đã chốt.',
      'Không đề xuất một giờ khác.',
    ],
    gate: { type: 'time', expected: '7:00', strict: false },
  },

  speak: {
    setup: 'Bạn gọi điện hẹn bạn đi ăn tối thứ Sáu.',
    roleA: 'Bạn — đề xuất 6:00; khi bị từ chối, đồng ý giờ mới và chốt lại.',
    roleB: 'Bạn của bạn — bận lúc 6:00, đề xuất 7:30 thay vào đó.',
    prompt: 'Nói thành tiếng cả hai vai. Kết thúc bằng "See you at …" với giờ cuối cùng.',
    model: ['A: Are you free on Friday? How about dinner at six?', 'B: Sorry, I’m busy at six. Can we meet at seven thirty instead?', 'A: Seven thirty works. See you at seven thirty!'],
    checklist: [
      'Có đề xuất giờ bằng How about / Can we meet at.',
      'Có "… instead" khi đổi giờ.',
      'Câu cuối chốt đúng giờ mới (seven thirty).',
    ],
  },
};
