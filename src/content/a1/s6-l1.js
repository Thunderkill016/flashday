// Chặng 6 · Bài 1 — Kế hoạch cuối tuần này (be going to).
export default {
  id: 'a1-s6-l1',
  stage: 6,
  order: 1,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Cuối tuần này bạn định làm gì?',
  canDo: 'Nói kế hoạch sắp tới của mình (cuối tuần, tối nay), hỏi kế hoạch người khác và rủ đi cùng.',

  pattern: {
    name: 'I’m going to … / What are you going to do …?',
    rule:
      'Kế hoạch đã định: "be going to + động từ": I’m going to visit my aunt. She’s going to cook. Hỏi: "What are you going to do this weekend?" Phủ định: "I’m not going to work." Thời gian: this weekend, tonight, tomorrow, next week. Rủ: "Do you want to come?"',
    examples: [
      ['I’m going to visit my grandparents this weekend.', 'Cuối tuần này tôi định thăm ông bà.'],
      ['What are you going to do tonight?', 'Tối nay bạn định làm gì?'],
      ['We’re going to the beach. Do you want to come?', 'Chúng tôi đi biển. Bạn muốn đi cùng không?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'What are you going to do …?', meaning: 'Bạn định làm gì …?', example: 'What are you going to do this weekend?', exampleVi: 'Cuối tuần này bạn định làm gì?' },
    { id: 'c2', target: 'I’m going to …', meaning: 'Tôi định …', example: 'I’m going to clean my room.', exampleVi: 'Tôi định dọn phòng.' },
    { id: 'c3', target: 'I’m not going to …', meaning: 'Tôi sẽ không …', example: 'I’m not going to work on Sunday.', exampleVi: 'Chủ nhật tôi sẽ không làm việc.' },
    { id: 'c4', target: 'this weekend / tonight / tomorrow', meaning: 'cuối tuần này / tối nay / mai', example: 'Tomorrow I’m going to see a film.', exampleVi: 'Mai tôi định đi xem phim.' },
    { id: 'c5', target: 'Do you want to come?', meaning: 'Bạn muốn đi cùng không?', example: 'We’re going to the park. Do you want to come?', exampleVi: 'Chúng tôi đi công viên. Bạn muốn đi cùng không?' },
    { id: 'c6', target: 'I’d love to!', meaning: 'Tôi rất muốn!', example: 'A picnic? I’d love to!', exampleVi: 'Picnic hả? Tôi rất muốn!' },
    { id: 'c7', target: 'Nothing special.', meaning: 'Không có gì đặc biệt.', example: 'This weekend? Nothing special. Just rest.', exampleVi: 'Cuối tuần này hả? Không gì đặc biệt. Chỉ nghỉ ngơi.' },
    { id: 'c8', target: 'Have a nice weekend!', meaning: 'Cuối tuần vui vẻ!', example: 'See you Monday. Have a nice weekend!', exampleVi: 'Gặp lại thứ Hai. Cuối tuần vui vẻ!' },
  ],

  drills: [
    { q: 'I ___ going to visit my friend.', options: ['am', 'is', 'are'], answer: 0, hint: 'I → am.' },
    { q: 'She’s going to ___ dinner.', options: ['cook', 'cooks', 'cooking'], answer: 0, hint: 'going to + động từ nguyên mẫu.' },
    { q: 'What ___ you going to do tonight?', options: ['are', 'is', 'do'], answer: 0, hint: 'you → are.' },
    { q: 'Rủ người khác đi cùng:', options: ['Do you want to come?', 'Are you come?', 'You come?'], answer: 0, hint: 'Do you want to + động từ?' },
    { q: 'Đồng ý nhiệt tình:', options: ['I’d love to!', 'I’m not going to.', 'Nothing special.'], answer: 0, hint: 'I’d love to = rất muốn.' },
  ],

  dialogue: {
    title: 'Chiều thứ Sáu ở văn phòng',
    lines: [
      ['An: What are you going to do this weekend, Lucy?', 'An: Cuối tuần này bạn định làm gì, Lucy?'],
      ['Lucy: On Saturday I’m going to visit my cousin in Hoi An.', 'Lucy: Thứ Bảy tôi định thăm em họ ở Hội An.'],
      ['An: Nice! And Sunday?', 'An: Hay! Còn Chủ nhật?'],
      ['Lucy: Nothing special. I’m going to sleep late and cook. What about you?', 'Lucy: Không gì đặc biệt. Tôi định ngủ nướng và nấu ăn. Còn bạn?'],
      ['An: We’re going to the beach on Sunday morning. Do you want to come?', 'An: Sáng Chủ nhật chúng tôi đi biển. Bạn muốn đi cùng không?'],
      ['Lucy: I’d love to! What time?', 'Lucy: Tôi rất muốn! Mấy giờ?'],
      ['An: About seven, before it’s hot. Have a nice weekend!', 'An: Khoảng bảy giờ, trước khi nóng. Cuối tuần vui vẻ!'],
    ],
    questions: [
      { q: 'Thứ Bảy Lucy định làm gì?', options: ['Thăm em họ ở Hội An', 'Đi biển', 'Nấu ăn'], answer: 0, hint: '"visit my cousin in Hoi An".' },
      { q: 'Chủ nhật An định làm gì?', options: ['Đi biển buổi sáng', 'Ngủ nướng', 'Làm việc'], answer: 0, hint: '"We’re going to the beach on Sunday morning."' },
      { q: 'Lucy có đi cùng không?', options: ['Có, rất muốn', 'Không, bận', 'Chưa biết'], answer: 0, hint: '"I’d love to!"' },
    ],
  },

  listening: {
    text: 'Hi everyone, quick message about the weekend. On Saturday morning we’re going to clean the park near the school. Then we’re going to have lunch together at twelve. We’re not going to meet on Sunday. Do you want to come? Reply by Friday!',
    vi: 'Chào mọi người, tin nhắn nhanh về cuối tuần. Sáng thứ Bảy chúng ta sẽ dọn công viên gần trường. Rồi ăn trưa chung lúc mười hai giờ. Chủ nhật không gặp. Bạn muốn tham gia không? Trả lời trước thứ Sáu!',
    questions: [
      { q: 'Sáng thứ Bảy nhóm sẽ làm gì?', options: ['Dọn công viên', 'Đi biển', 'Học nhóm'], answer: 0, hint: '"clean the park near the school".' },
      { q: 'Chủ nhật thì sao?', options: ['Không gặp', 'Ăn trưa chung', 'Dọn tiếp'], answer: 0, hint: '"We’re not going to meet on Sunday."' },
    ],
  },

  write: {
    setup: 'Bạn nhắn cho một người bạn hỏi kế hoạch cuối tuần và rủ đi chơi.',
    prompt: 'Viết 3 câu: hỏi kế hoạch của họ, nói kế hoạch của bạn (2 việc, có ngày/giờ), và rủ đi cùng.',
    model: ['Hi Tom! What are you going to do this weekend?', 'On Saturday I’m going to visit the night market, and on Sunday morning I’m going to the beach at seven.', 'Do you want to come?'],
    checklist: [
      'Có What are you going to do …?',
      'Có ít nhất 2 câu I’m going to + động từ với thời gian.',
      'Có Do you want to come?',
    ],
    gate: null,
  },

  speak: {
    setup: 'Cuối giờ làm thứ Sáu, bạn nói chuyện với đồng nghiệp.',
    roleA: 'Bạn — hỏi kế hoạch, kể kế hoạch của mình, rủ đi cùng một việc.',
    roleB: 'Đồng nghiệp — thứ Bảy đi thăm bố mẹ, Chủ nhật rảnh; nhận lời.',
    prompt: 'Nói thành tiếng cả hai vai. Kết bằng "Have a nice weekend!".',
    model: ['A: What are you going to do this weekend? — B: On Saturday I’m going to visit my parents. Sunday, nothing special.', 'A: We’re going to play badminton on Sunday at eight. Do you want to come? — B: I’d love to!', 'A: Great. Have a nice weekend!'],
    checklist: [
      'Có hỏi và trả lời bằng going to.',
      'Có lời rủ và lời nhận.',
      'Có câu chào kết cuối tuần.',
    ],
  },
};
