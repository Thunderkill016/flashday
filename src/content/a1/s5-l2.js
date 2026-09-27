// Chặng 5 · Bài 2 — Can / can’t: kỹ năng và khả năng.
export default {
  id: 'a1-s5-l2',
  stage: 5,
  order: 2,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Tôi biết làm gì',
  canDo: 'Nói mình biết/không biết làm gì (bơi, lái xe, nấu ăn, nói tiếng gì), hỏi khả năng người khác, và nói mức độ (a little, very well).',

  pattern: {
    name: 'I can … / I can’t … / Can you …?',
    rule:
      '"can + động từ nguyên mẫu" cho mọi chủ ngữ: I can swim, She can drive (không thêm -s, không "to"). Phủ định: can’t (cannot). Hỏi: "Can you cook?" — "Yes, I can." / "No, I can’t." Mức độ: "a little", "quite well", "very well" đứng cuối câu.',
    examples: [
      ['I can swim, but I can’t drive.', 'Tôi biết bơi, nhưng không biết lái xe.'],
      ['She can speak English quite well.', 'Cô ấy nói tiếng Anh khá tốt.'],
      ['Can you play the guitar? — Yes, a little.', 'Bạn chơi ghi-ta được không? — Được, một chút.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'I can …', meaning: 'Tôi có thể / biết …', example: 'I can ride a motorbike.', exampleVi: 'Tôi biết đi xe máy.' },
    { id: 'c2', target: 'I can’t …', meaning: 'Tôi không thể / không biết …', example: 'I can’t swim.', exampleVi: 'Tôi không biết bơi.' },
    { id: 'c3', target: 'Can you …?', meaning: 'Bạn … được không?', example: 'Can you cook Vietnamese food?', exampleVi: 'Bạn nấu đồ Việt được không?' },
    { id: 'c4', target: 'Yes, I can. / No, I can’t.', meaning: 'Được. / Không được.', example: 'Can you drive? — No, I can’t.', exampleVi: 'Bạn lái xe được không? — Không.' },
    { id: 'c5', target: 'a little / very well', meaning: 'một chút / rất tốt', example: 'I can speak Korean a little.', exampleVi: 'Tôi nói tiếng Hàn được một chút.' },
    { id: 'c6', target: 'I’m good at …', meaning: 'Tôi giỏi …', example: 'I’m good at cooking.', exampleVi: 'Tôi giỏi nấu ăn.' },
    { id: 'c7', target: 'I’m learning to …', meaning: 'Tôi đang học …', example: 'I’m learning to drive.', exampleVi: 'Tôi đang học lái xe.' },
    { id: 'c8', target: 'Can you help me with …?', meaning: 'Bạn giúp tôi … được không?', example: 'Can you help me with my English?', exampleVi: 'Bạn giúp tôi học tiếng Anh được không?' },
  ],

  drills: [
    { q: 'She ___ speak three languages.', options: ['can', 'cans', 'can to'], answer: 0, hint: 'can không đổi theo chủ ngữ, không "to".' },
    { q: 'I ___ swim. (không biết)', options: ['can’t', 'don’t can', 'not can'], answer: 0, hint: 'can’t = cannot.' },
    { q: '___ you drive?', options: ['Can', 'Do', 'Are'], answer: 0, hint: 'Hỏi khả năng → Can you …?' },
    { q: 'Trả lời ngắn cho "Can you cook?":', options: ['Yes, I can.', 'Yes, I do.', 'Yes, I am.'], answer: 0, hint: 'Can → can.' },
    { q: 'I can speak English ___. (một chút)', options: ['a little', 'a few', 'little a'], answer: 0, hint: 'a little ở cuối câu.' },
  ],

  dialogue: {
    title: 'Phỏng vấn việc bán thời gian',
    lines: [
      ['Manager: So, Linh, can you speak English?', 'Quản lý: Vậy, Linh, bạn nói tiếng Anh được không?'],
      ['Linh: Yes, I can — a little. I’m learning.', 'Linh: Được — một chút. Tôi đang học.'],
      ['Manager: Good. Can you use a computer?', 'Quản lý: Tốt. Bạn dùng máy tính được không?'],
      ['Linh: Yes, I can. I’m good at Excel.', 'Linh: Được. Tôi giỏi Excel.'],
      ['Manager: And can you drive?', 'Quản lý: Và bạn lái xe được không?'],
      ['Linh: I can ride a motorbike, but I can’t drive a car.', 'Linh: Tôi đi xe máy được, nhưng không lái ô tô được.'],
      ['Manager: That’s fine. Can you start on Monday?', 'Quản lý: Không sao. Bạn bắt đầu thứ Hai được không?'],
      ['Linh: Yes, I can!', 'Linh: Được!'],
    ],
    questions: [
      { q: 'Linh nói tiếng Anh thế nào?', options: ['Một chút, đang học', 'Rất tốt', 'Không nói được'], answer: 0, hint: '"a little. I’m learning."' },
      { q: 'Linh giỏi gì?', options: ['Excel', 'Lái ô tô', 'Nấu ăn'], answer: 0, hint: '"I’m good at Excel."' },
      { q: 'Linh không làm được gì?', options: ['Lái ô tô', 'Đi xe máy', 'Dùng máy tính'], answer: 0, hint: '"I can’t drive a car."' },
    ],
  },

  listening: {
    text: 'My grandfather is 80, but he can do many things. He can swim very well and he can cook. He can’t use a smartphone, so I help him. He can speak French a little because he studied it at school.',
    vi: 'Ông tôi 80 tuổi nhưng làm được nhiều thứ. Ông bơi rất giỏi và nấu ăn được. Ông không dùng được điện thoại thông minh, nên tôi giúp. Ông nói tiếng Pháp được một chút vì học ở trường.',
    questions: [
      { q: 'Ông làm gì rất giỏi?', options: ['Bơi', 'Dùng điện thoại', 'Nói tiếng Pháp'], answer: 0, hint: '"He can swim very well".' },
      { q: 'Ông không làm được gì?', options: ['Dùng smartphone', 'Nấu ăn', 'Bơi'], answer: 0, hint: '"He can’t use a smartphone".' },
    ],
  },

  write: {
    setup: 'Bạn điền phần "Skills" trong hồ sơ xin việc bán thời gian.',
    prompt: 'Viết 3 câu: hai việc bạn làm được (có mức độ), một việc bạn không làm được hoặc đang học.',
    model: ['I can speak English a little and I can use a computer very well.', 'I can’t drive a car, but I can ride a motorbike.', 'I’m learning to cook.'],
    checklist: [
      'Dùng can/can’t + động từ nguyên mẫu (không -s, không to).',
      'Có mức độ (a little / very well).',
      'Có can’t hoặc I’m learning to ….',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn tìm bạn cùng nhóm cho một chuyến đi cắm trại.',
    roleA: 'Bạn — hỏi 3 khả năng (Can you swim / cook / drive?), nói khả năng của mình.',
    roleB: 'Bạn mới — bơi được, không nấu được, lái xe rất tốt.',
    prompt: 'Nói thành tiếng cả hai vai. Mỗi câu trả lời ngắn đúng dạng Yes, I can / No, I can’t.',
    model: ['A: Can you swim? — B: Yes, I can. — A: Can you cook? — B: No, I can’t.', 'A: Can you drive? — B: Yes, very well.', 'A: Great! I can cook, so we’re a good team.'],
    checklist: [
      'Có 3 câu hỏi Can you …?',
      'Trả lời ngắn đúng dạng.',
      'Có một mức độ (a little / very well).',
    ],
  },
};
