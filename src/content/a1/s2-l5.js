// Chặng 2 · Bài 5 — Checkpoint: lên lịch gặp qua tin nhắn.
// Reuses 2.1–2.4: times, days, routines, proposing/confirming, frequency.
// Every assessed target is language already taught in 2.1–2.4.
export default {
  id: 'a1-s2-l5',
  stage: 2,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 2,
  title: 'Checkpoint · Lên lịch gặp qua tin nhắn',
  canDo: 'Trao đổi tin nhắn để hẹn một buổi gặp: hỏi lịch rảnh, nói lịch của mình, đề xuất, đồng ý và chốt giờ + ngày.',

  chunks: [
    { id: 'c1', target: 'Are you free on …?', meaning: 'Bạn rảnh vào … không?', example: 'Are you free on Thursday?', exampleVi: 'Thứ Năm bạn rảnh không?' },
    { id: 'c2', target: 'I’m free on … after …', meaning: 'Tôi rảnh vào … sau … giờ', example: 'I’m free on Thursday after six.', exampleVi: 'Tôi rảnh thứ Năm sau sáu giờ.' },
    { id: 'c3', target: 'I usually finish work at …', meaning: 'Tôi thường xong việc lúc …', example: 'I usually finish work at five thirty.', exampleVi: 'Tôi thường xong việc lúc năm rưỡi.' },
    { id: 'c4', target: 'How about …?', meaning: '… thì sao?', example: 'How about Wednesday at six?', exampleVi: 'Thứ Tư sáu giờ thì sao?' },
    { id: 'c5', target: 'I’m busy at …', meaning: 'Tôi bận lúc …', example: 'Sorry, I’m busy at six on Wednesday.', exampleVi: 'Xin lỗi, thứ Tư sáu giờ tôi bận.' },
    { id: 'c6', target: 'See you at …', meaning: 'Hẹn gặp lúc …', example: 'See you at six thirty on Thursday.', exampleVi: 'Hẹn gặp lúc sáu rưỡi thứ Năm.' },
  ],

  drills: [
    { q: 'Hỏi người kia rảnh thứ Năm không:', options: ['Are you free on Thursday?', 'What day is it today?', 'How often are you free?'], answer: 0, hint: 'Are you free on + ngày?' },
    { q: 'I’m free ___ Wednesday ___ seven.', options: ['on / after', 'at / on', 'in / at'], answer: 0, hint: 'on + ngày; after + giờ = sau … giờ.' },
    { q: 'Thứ Tư bạn bận, muốn đổi sang sáu giờ. Bạn nói:', options: ['Can we meet at six instead?', 'I never meet at six.', 'See you at six.'], answer: 0, hint: 'instead = thay vào đó.' },
    { q: 'Chốt giờ cuối cùng trước khi kết thúc:', options: ['See you at six thirty.', 'How about six thirty?', 'It’s six thirty.'], answer: 0, hint: 'See you at + giờ = hẹn gặp lúc.' },
  ],

  dialogue: {
    title: 'Tin nhắn hẹn học nhóm',
    lines: [
      ['Quang: Hi Emma! Are you free on Wednesday or Thursday? Can we study together?', 'Quang: Chào Emma! Thứ Tư hay thứ Năm bạn rảnh không? Mình học chung được không?'],
      ['Emma: Hi! I work every day, but I usually finish work at five thirty.', 'Emma: Chào! Mình làm mỗi ngày, nhưng thường xong việc lúc năm rưỡi.'],
      ['Quang: How about Wednesday at six?', 'Quang: Thứ Tư sáu giờ thì sao?'],
      ['Emma: Sorry, I’m busy on Wednesday — I have English class. Can we meet on Thursday instead?', 'Emma: Xin lỗi, thứ Tư mình bận — mình có lớp tiếng Anh. Thứ Năm thay vào đó được không?'],
      ['Quang: Thursday works. How about six thirty at the library?', 'Quang: Thứ Năm được. Sáu rưỡi ở thư viện nhé?'],
      ['Emma: That works. See you at six thirty on Thursday!', 'Emma: Được đó. Hẹn gặp lúc sáu rưỡi thứ Năm!'],
    ],
    questions: [
      { q: 'Emma thường xong việc lúc mấy giờ?', options: ['5:00', '5:30', '6:30'], answer: 1, hint: '"I usually finish work at five thirty."' },
      { q: 'Vì sao không gặp thứ Tư được?', options: ['Emma có lớp tiếng Anh', 'Quang bận', 'Thư viện đóng'], answer: 0, hint: '"I have English class."' },
      { q: 'Lịch cuối cùng là gì?', options: ['Thứ Tư 6:00', 'Thứ Năm 6:30', 'Thứ Năm 5:30'], answer: 1, hint: '"See you at six thirty on Thursday."' },
      { q: 'Hai người gặp ở đâu?', options: ['Thư viện', 'Quán cà phê', 'Lớp tiếng Anh'], answer: 0, hint: '"at the library".' },
    ],
  },

  listening: {
    text: 'Hey, it’s Leo. About our football on Saturday — I usually play at nine, but this week I work on Saturday morning. Can we play at four in the afternoon instead? Text me back. Thanks!',
    vi: 'Này, Leo đây. Về trận bóng thứ Bảy — mình thường chơi lúc chín giờ, nhưng tuần này mình làm việc sáng thứ Bảy. Mình chơi lúc bốn giờ chiều thay vào đó được không? Nhắn lại cho mình. Cảm ơn!',
    questions: [
      { q: 'Leo thường chơi bóng lúc mấy giờ?', options: ['9:00', '4:00', '7:00'], answer: 0, hint: '"I usually play at nine."' },
      { q: 'Tuần này Leo đề xuất giờ nào?', options: ['9:00 sáng', '4:00 chiều', '4:00 sáng'], answer: 1, hint: '"four in the afternoon instead."' },
      { q: 'Vì sao Leo đổi giờ?', options: ['Làm việc sáng thứ Bảy', 'Trời mưa', 'Sân bận'], answer: 0, hint: '"I work on Saturday morning."' },
    ],
  },

  write: {
    setup: 'Bạn muốn hẹn bạn học Anna học nhóm tuần này. Anna nhắn: "I’m free on Tuesday and Friday after 6."',
    prompt: 'Viết 3–4 câu tin nhắn: nói lịch của bạn (bạn thường xong việc lúc mấy giờ), đề xuất một ngày + giờ phù hợp với Anna, và hỏi xem giờ đó có được không.',
    model: ['Hi Anna! I usually finish work at six thirty.', 'How about Friday at seven at the library?', 'Is that OK for you?'],
    checklist: [
      'Có câu về lịch của bạn với trạng từ tần suất hoặc "at + giờ".',
      'Ngày + giờ đề xuất khớp với lịch rảnh của Anna (thứ Ba/thứ Sáu, sau 6 giờ).',
      'Có câu hỏi xác nhận (Is that OK? / Does that work?).',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gọi cho một người bạn để hẹn đi ăn tối trong tuần.',
    roleA: 'Bạn — hỏi lịch rảnh, nói lịch mình, đề xuất, xử lý một lần bị từ chối, chốt ngày + giờ + chỗ.',
    roleB: 'Bạn của bạn — bận thứ Ba; rảnh thứ Năm sau 7 giờ; thích quán gần chợ.',
    prompt: 'Nói thành tiếng cả hai vai, không nhìn mẫu ở lần đầu. Câu cuối phải có đủ ngày, giờ và chỗ.',
    model: ['A: Are you free on Tuesday? — B: Sorry, I’m busy on Tuesday, but I’m free on Thursday after seven.', 'A: How about Thursday at seven thirty at the cafe near the market? — B: That works!', 'A: Great. See you on Thursday at seven thirty!'],
    checklist: [
      'Đã hỏi lịch rảnh và xử lý một lần từ chối.',
      'Câu chốt có ngày + giờ + địa điểm.',
      'Dùng đúng on + ngày, at + giờ.',
    ],
  },
};
