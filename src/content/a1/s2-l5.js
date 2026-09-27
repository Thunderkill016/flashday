// Chặng 2 · Bài 5 — Checkpoint: lên lịch gặp qua tin nhắn.
// Reuses 2.1–2.4: times, days, routines, proposing/confirming, frequency.
export default {
  id: 'a1-s2-l5',
  stage: 2,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 1,
  title: 'Checkpoint · Lên lịch gặp qua tin nhắn',
  canDo: 'Trao đổi tin nhắn để hẹn một buổi gặp: hỏi lịch rảnh, nói lịch của mình, đề xuất, đồng ý và chốt giờ + ngày.',

  chunks: [
    { id: 'c1', target: 'When are you free this week?', meaning: 'Tuần này bạn rảnh khi nào?', example: 'Hi! When are you free this week?', exampleVi: 'Chào! Tuần này bạn rảnh khi nào?' },
    { id: 'c2', target: 'I’m free on … after …', meaning: 'Tôi rảnh vào … sau … giờ', example: 'I’m free on Thursday after six.', exampleVi: 'Tôi rảnh thứ Năm sau sáu giờ.' },
    { id: 'c3', target: 'I usually finish work at …', meaning: 'Tôi thường xong việc lúc …', example: 'I usually finish work at five thirty.', exampleVi: 'Tôi thường xong việc lúc năm rưỡi.' },
    { id: 'c4', target: 'Let’s meet at …', meaning: 'Mình gặp lúc … nhé', example: 'Let’s meet at seven at the cafe.', exampleVi: 'Mình gặp lúc bảy giờ ở quán cà phê nhé.' },
    { id: 'c5', target: 'Perfect. See you then!', meaning: 'Tuyệt. Hẹn gặp lúc đó!', example: 'Perfect. See you then!', exampleVi: 'Tuyệt. Hẹn gặp lúc đó!' },
    { id: 'c6', target: 'Can you make it?', meaning: 'Bạn đến được không?', example: 'Friday at eight — can you make it?', exampleVi: 'Thứ Sáu tám giờ — bạn đến được không?' },
  ],

  drills: [
    { q: 'Hỏi lịch rảnh của người kia trong tuần:', options: ['When are you free this week?', 'What time is it?', 'How often do you work?'], answer: 0, hint: 'free = rảnh; this week = tuần này.' },
    { q: 'I’m free ___ Wednesday ___ seven.', options: ['on / after', 'at / on', 'in / at'], answer: 0, hint: 'on + ngày; after + giờ = sau … giờ.' },
    { q: 'Người kia hỏi "Can you make it?" nghĩa là:', options: ['Bạn đến được không?', 'Bạn làm được không?', 'Bạn nấu được không?'], answer: 0, hint: 'make it = đến được / kịp.' },
    { q: 'Đề nghị cùng gặp:', options: ['Let’s meet at six.', 'I never meet at six.', 'What time do you meet?'], answer: 0, hint: 'Let’s + động từ = mình … nhé.' },
  ],

  dialogue: {
    title: 'Tin nhắn hẹn học nhóm',
    lines: [
      ['Quang: Hi Emma! When are you free this week? Let’s study together.', 'Quang: Chào Emma! Tuần này bạn rảnh khi nào? Mình học chung nhé.'],
      ['Emma: Hi! I work every day, but I usually finish at five thirty.', 'Emma: Chào! Mình làm mỗi ngày, nhưng thường xong lúc năm rưỡi.'],
      ['Quang: How about Wednesday at six?', 'Quang: Thứ Tư sáu giờ thì sao?'],
      ['Emma: Sorry, on Wednesday I have yoga. Thursday instead?', 'Emma: Xin lỗi, thứ Tư mình có yoga. Thứ Năm thay vào đó nhé?'],
      ['Quang: Thursday works. Six thirty at the library? Can you make it?', 'Quang: Thứ Năm được. Sáu rưỡi ở thư viện? Bạn đến được không?'],
      ['Emma: Yes! Six thirty on Thursday. Perfect. See you then!', 'Emma: Được! Sáu rưỡi thứ Năm. Tuyệt. Hẹn gặp lúc đó!'],
    ],
    questions: [
      { q: 'Emma thường xong việc lúc mấy giờ?', options: ['5:00', '5:30', '6:30'], answer: 1, hint: '"I usually finish at five thirty."' },
      { q: 'Vì sao không gặp thứ Tư được?', options: ['Emma có yoga', 'Quang bận', 'Thư viện đóng'], answer: 0, hint: '"on Wednesday I have yoga."' },
      { q: 'Lịch cuối cùng là gì?', options: ['Thứ Tư 6:00', 'Thứ Năm 6:30', 'Thứ Năm 5:30'], answer: 1, hint: '"Six thirty on Thursday."' },
      { q: 'Hai người gặp ở đâu?', options: ['Thư viện', 'Quán cà phê', 'Phòng yoga'], answer: 0, hint: '"at the library".' },
    ],
  },

  listening: {
    text: 'Hey, it’s Leo. About our football on Saturday — I usually play at nine, but this week I have to work in the morning. Can we play at four in the afternoon instead? Text me back. Thanks!',
    vi: 'Này, Leo đây. Về trận bóng thứ Bảy — mình thường chơi lúc chín giờ, nhưng tuần này mình phải làm buổi sáng. Mình chơi lúc bốn giờ chiều thay vào đó được không? Nhắn lại cho mình. Cảm ơn!',
    questions: [
      { q: 'Leo thường chơi bóng lúc mấy giờ?', options: ['9:00', '4:00', '7:00'], answer: 0, hint: '"I usually play at nine."' },
      { q: 'Tuần này Leo đề xuất giờ nào?', options: ['9:00 sáng', '4:00 chiều', '4:00 sáng'], answer: 1, hint: '"four in the afternoon instead."' },
      { q: 'Vì sao Leo đổi giờ?', options: ['Phải làm việc buổi sáng', 'Trời mưa', 'Sân bận'], answer: 0, hint: '"I have to work in the morning."' },
    ],
  },

  write: {
    setup: 'Bạn muốn hẹn bạn học Anna học nhóm tuần này. Anna nhắn: "I’m free on Tuesday and Friday after 6."',
    prompt: 'Viết 3–4 câu tin nhắn: nói lịch của bạn (bạn thường xong việc lúc mấy giờ), đề xuất một ngày + giờ phù hợp với Anna, hỏi cô ấy đến được không.',
    model: ['Hi Anna! I usually finish work at six thirty.', 'How about Friday at seven at the library?', 'Can you make it?'],
    checklist: [
      'Có câu về lịch của bạn với trạng từ tần suất hoặc "at + giờ".',
      'Ngày + giờ đề xuất khớp với lịch rảnh của Anna (thứ Ba/thứ Sáu, sau 6 giờ).',
      'Có câu hỏi xác nhận (Can you make it? / Does that work?).',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gọi cho một người bạn để hẹn đi ăn tối trong tuần.',
    roleA: 'Bạn — hỏi lịch rảnh, nói lịch mình, đề xuất, xử lý một lần bị từ chối, chốt ngày + giờ + chỗ.',
    roleB: 'Bạn của bạn — bận thứ Ba; rảnh thứ Năm sau 7 giờ; thích quán gần chợ.',
    prompt: 'Nói thành tiếng cả hai vai, không nhìn mẫu ở lần đầu. Câu cuối phải có đủ ngày, giờ và chỗ.',
    model: ['A: When are you free this week? — B: I’m busy on Tuesday, but I’m free on Thursday after seven.', 'A: How about Thursday at seven thirty at the cafe near the market? — B: That works!', 'A: Perfect. See you on Thursday at seven thirty!'],
    checklist: [
      'Đã hỏi lịch rảnh và xử lý một lần từ chối.',
      'Câu chốt có ngày + giờ + địa điểm.',
      'Dùng đúng on + ngày, at + giờ.',
    ],
  },
};
