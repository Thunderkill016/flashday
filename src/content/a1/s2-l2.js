// Chặng 2 · Bài 2 — Thói quen hằng ngày (present simple).
export default {
  id: 'a1-s2-l2',
  stage: 2,
  order: 2,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Một ngày của tôi',
  canDo: 'Kể một ngày bình thường của mình theo giờ (thức dậy, đi làm, ăn, đi ngủ) và hỏi về ngày của người khác.',

  pattern: {
    name: 'I get up at … / She gets up at …',
    rule:
      'Thói quen dùng hiện tại đơn. Với I/you/we/they: động từ nguyên mẫu (I get up, they work). Với he/she/it: thêm -s (she gets up, he works, it starts). Hỏi: "What time do you get up?" — "What time does she start work?" (do/does, động từ giữ nguyên).',
    examples: [
      ['I get up at six. I go to work at seven thirty.', 'Tôi thức dậy lúc sáu giờ. Tôi đi làm lúc bảy rưỡi.'],
      ['My sister gets up at eight.', 'Chị tôi thức dậy lúc tám giờ.'],
      ['What time do you go to bed?', 'Bạn đi ngủ lúc mấy giờ?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'I get up at …', meaning: 'Tôi thức dậy lúc …', example: 'I get up at six every day.', exampleVi: 'Tôi thức dậy lúc sáu giờ mỗi ngày.' },
    { id: 'c2', target: 'I have breakfast / lunch / dinner', meaning: 'Tôi ăn sáng / trưa / tối', example: 'I have breakfast at home.', exampleVi: 'Tôi ăn sáng ở nhà.' },
    { id: 'c3', target: 'I go to work / school at …', meaning: 'Tôi đi làm / đi học lúc …', example: 'I go to work at eight.', exampleVi: 'Tôi đi làm lúc tám giờ.' },
    { id: 'c4', target: 'I start / finish work at …', meaning: 'Tôi bắt đầu / xong việc lúc …', example: 'I finish work at five thirty.', exampleVi: 'Tôi xong việc lúc năm rưỡi.' },
    { id: 'c5', target: 'I go to bed at …', meaning: 'Tôi đi ngủ lúc …', example: 'I go to bed at eleven.', exampleVi: 'Tôi đi ngủ lúc mười một giờ.' },
    { id: 'c6', target: 'What time do you …?', meaning: 'Bạn … lúc mấy giờ?', example: 'What time do you get up?', exampleVi: 'Bạn thức dậy lúc mấy giờ?' },
    { id: 'c7', target: 'He / She gets up at …', meaning: 'Anh / Cô ấy thức dậy lúc …', example: 'She gets up at five to cook.', exampleVi: 'Cô ấy thức dậy lúc năm giờ để nấu ăn.' },
    { id: 'c8', target: 'in the afternoon', meaning: 'buổi chiều', example: 'I study English in the afternoon.', exampleVi: 'Tôi học tiếng Anh vào buổi chiều.' },
  ],

  drills: [
    { q: 'My brother ___ up at seven.', options: ['get', 'gets', 'getting'], answer: 1, hint: 'he/she → thêm -s.' },
    { q: 'What time ___ you have lunch?', options: ['do', 'does', 'are'], answer: 0, hint: 'you → do.' },
    { q: 'She ___ work at six.', options: ['finish', 'finishes', 'finishs'], answer: 1, hint: 'finish + es (kết thúc bằng -sh).' },
    { q: 'I ___ to bed at eleven.', options: ['go', 'goes', 'going'], answer: 0, hint: 'I → động từ nguyên mẫu.' },
    { q: 'Hỏi giờ ăn tối của người kia:', options: ['What time do you have dinner?', 'What time is dinner you?', 'Do you dinner what time?'], answer: 0, hint: 'What time do you + động từ?' },
  ],

  dialogue: {
    title: 'Hai đồng nghiệp nói về buổi sáng',
    lines: [
      ['Ben: You look tired, Hoa. What time do you get up?', 'Ben: Trông bạn mệt đó, Hoa. Bạn thức dậy lúc mấy giờ?'],
      ['Hoa: At five. I cook breakfast for my kids.', 'Hoa: Năm giờ. Tôi nấu bữa sáng cho các con.'],
      ['Ben: Five! I get up at seven thirty.', 'Ben: Năm giờ! Tôi thức dậy lúc bảy rưỡi.'],
      ['Hoa: Then I take them to school at seven and start work at eight.', 'Hoa: Rồi tôi đưa các con đi học lúc bảy giờ và bắt đầu làm lúc tám giờ.'],
      ['Ben: And what time do you go to bed?', 'Ben: Và bạn đi ngủ lúc mấy giờ?'],
      ['Hoa: Around ten. My husband goes to bed late, at midnight.', 'Hoa: Khoảng mười giờ. Chồng tôi đi ngủ muộn, lúc nửa đêm.'],
      ['Ben: Wow. You need a coffee!', 'Ben: Chà. Bạn cần một ly cà phê!'],
    ],
    questions: [
      { q: 'Hoa thức dậy lúc mấy giờ?', options: ['5:00', '7:00', '7:30'], answer: 0, hint: '"At five."' },
      { q: 'Hoa bắt đầu làm việc lúc mấy giờ?', options: ['7:00', '8:00', '10:00'], answer: 1, hint: '"start work at eight."' },
      { q: 'Ai đi ngủ lúc nửa đêm?', options: ['Hoa', 'Ben', 'Chồng Hoa'], answer: 2, hint: '"My husband goes to bed late, at midnight."' },
    ],
  },

  listening: {
    text: 'My name is Carlos and I’m a baker. I get up at three in the morning and start work at four. I have lunch at eleven and finish work at one. In the afternoon I sleep. I go to bed at eight.',
    vi: 'Tôi tên Carlos và là thợ làm bánh. Tôi thức dậy lúc ba giờ sáng và bắt đầu làm lúc bốn giờ. Tôi ăn trưa lúc mười một giờ và xong việc lúc một giờ. Buổi chiều tôi ngủ. Tôi đi ngủ lúc tám giờ.',
    questions: [
      { q: 'Carlos thức dậy lúc mấy giờ?', options: ['3:00', '4:00', '8:00'], answer: 0, hint: '"get up at three in the morning."' },
      { q: 'Carlos xong việc lúc mấy giờ?', options: ['11:00', '1:00', '8:00'], answer: 1, hint: '"finish work at one."' },
    ],
  },

  write: {
    setup: 'Bạn viết vào nhật ký học tiếng Anh về một ngày thường của mình.',
    prompt: 'Viết 3 câu về một ngày của bạn: thức dậy, đi làm/đi học, đi ngủ — mỗi câu có giờ.',
    model: ['I get up at six thirty.', 'I go to work at eight and finish at five.', 'I go to bed at eleven.'],
    checklist: [
      'Ba hoạt động, mỗi hoạt động có "at + giờ".',
      'Động từ đúng cho "I" (không thêm -s).',
      'Có ít nhất một giờ lẻ (six thirty, seven fifteen…).',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn phỏng vấn một người bạn về ngày của họ để làm bài tập lớp.',
    roleA: 'Bạn — hỏi 3 câu "What time do you …?" (thức dậy, ăn trưa, đi ngủ).',
    roleB: 'Bạn của bạn — tên Ken: thức dậy 6:15, ăn trưa 12:30, đi ngủ 23:00.',
    prompt: 'Nói thành tiếng cả hai vai. Sau đó kể lại về Ken bằng "He gets up at …" (nhớ -s).',
    model: ['A: What time do you get up? — B: I get up at six fifteen.', 'A: What time do you have lunch? — B: At twelve thirty.', 'A (kể lại): Ken gets up at six fifteen and goes to bed at eleven.'],
    checklist: [
      'Ba câu hỏi đúng dạng "What time do you …?".',
      'Khi kể lại về Ken, động từ có -s (gets, goes).',
      'Giờ đọc đúng.',
    ],
  },
};
