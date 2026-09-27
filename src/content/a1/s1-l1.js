// Chặng 1 · Bài 1 — Chào hỏi và giới thiệu.
// Exemplar lesson: every other lesson follows this shape and this level of
// care (natural English, Vietnamese that a beginner actually says, listening
// text that is NOT the reading dialogue, tasks that reuse the can-do in a
// new situation).

export default {
  id: 'a1-s1-l1',
  stage: 1,
  order: 1,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Chào hỏi và giới thiệu',
  canDo: 'Chào, nói tên và quê mình, hỏi lại tên và quê của người mới gặp.',

  pattern: {
    name: 'I’m … / I’m from …',
    rule:
      'I am → I’m (rút gọn, dùng khi nói). "I’m + tên" để nói tên; "I’m from + nơi" để nói quê. Hỏi lại: "What’s your name?" và "Where are you from?".',
    examples: [
      ['I’m Mai.', 'Tôi là Mai.'],
      ['I’m from Vietnam.', 'Tôi đến từ Việt Nam.'],
      ['Where are you from?', 'Bạn đến từ đâu?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'Hello, I’m …', meaning: 'Chào, tôi là …', example: 'Hello, I’m Mai.', exampleVi: 'Chào, tôi là Mai.' },
    { id: 'c2', target: 'Nice to meet you.', meaning: 'Rất vui được gặp bạn.', example: 'Nice to meet you, Tom.', exampleVi: 'Rất vui được gặp bạn, Tom.' },
    { id: 'c3', target: 'Nice to meet you too.', meaning: 'Tôi cũng rất vui được gặp bạn.', example: 'Nice to meet you too, Mai.', exampleVi: 'Tôi cũng rất vui được gặp bạn, Mai.' },
    { id: 'c4', target: 'What’s your name?', meaning: 'Bạn tên gì?', example: 'Hi! What’s your name?', exampleVi: 'Chào! Bạn tên gì?' },
    { id: 'c5', target: 'I’m from …', meaning: 'Tôi đến từ …', example: 'I’m from Da Nang.', exampleVi: 'Tôi đến từ Đà Nẵng.' },
    { id: 'c6', target: 'Where are you from?', meaning: 'Bạn đến từ đâu?', example: 'Where are you from, Tom?', exampleVi: 'Bạn đến từ đâu, Tom?' },
    { id: 'c7', target: 'How are you?', meaning: 'Bạn khỏe không?', example: 'Hi Mai, how are you?', exampleVi: 'Chào Mai, bạn khỏe không?' },
    { id: 'c8', target: 'I’m fine, thanks.', meaning: 'Tôi khỏe, cảm ơn.', example: 'I’m fine, thanks. And you?', exampleVi: 'Tôi khỏe, cảm ơn. Còn bạn?' },
  ],

  drills: [
    { q: 'Hello, I ___ Mai.', options: ['am', 'is', 'are'], answer: 0, hint: 'I luôn đi với am (I’m).' },
    { q: 'Where ___ you from?', options: ['am', 'is', 'are'], answer: 2, hint: 'you đi với are.' },
    { q: 'Hỏi tên người mới gặp:', options: ['What’s your name?', 'Where are you from?', 'How are you?'], answer: 0, hint: 'name = tên.' },
    { q: 'Người kia nói "Nice to meet you." Bạn đáp:', options: ['Nice to meet you too.', 'I’m from Hanoi.', 'What’s your name?'], answer: 0, hint: 'Đáp lại lời chào gặp mặt bằng "… too" (cũng vậy).' },
  ],

  dialogue: {
    title: 'Ngày đầu ở lớp tiếng Anh',
    lines: [
      ['Tom: Hello! I’m Tom.', 'Tom: Chào! Tôi là Tom.'],
      ['Mai: Hi Tom. I’m Mai. Nice to meet you.', 'Mai: Chào Tom. Tôi là Mai. Rất vui được gặp bạn.'],
      ['Tom: Nice to meet you too. Where are you from, Mai?', 'Tom: Tôi cũng rất vui được gặp bạn. Bạn đến từ đâu, Mai?'],
      ['Mai: I’m from Da Nang. And you?', 'Mai: Tôi đến từ Đà Nẵng. Còn bạn?'],
      ['Tom: I’m from Canada. Toronto.', 'Tom: Tôi đến từ Canada. Toronto.'],
      ['Mai: Oh, Canada! How are you today?', 'Mai: Ồ, Canada! Hôm nay bạn thế nào?'],
      ['Tom: I’m fine, thanks. A little tired.', 'Tom: Tôi khỏe, cảm ơn. Hơi mệt một chút.'],
    ],
    questions: [
      { q: 'Mai đến từ đâu?', options: ['Đà Nẵng', 'Hà Nội', 'Toronto'], answer: 0, hint: '"I’m from Da Nang."' },
      { q: 'Tom đến từ nước nào?', options: ['Mỹ', 'Canada', 'Anh'], answer: 1, hint: '"I’m from Canada. Toronto."' },
      { q: 'Hôm nay Tom thấy thế nào?', options: ['Khỏe nhưng hơi mệt', 'Bị ốm', 'Rất vui'], answer: 0, hint: '"I’m fine… A little tired."' },
    ],
  },

  listening: {
    text: 'Hi everyone. My name is Anna. I’m from Australia, from Sydney. Nice to meet you all.',
    vi: 'Chào mọi người. Tôi tên là Anna. Tôi đến từ Úc, từ Sydney. Rất vui được gặp tất cả các bạn.',
    questions: [
      { q: 'Người nói tên gì?', options: ['Anna', 'Mai', 'Emma'], answer: 0, hint: '"My name is Anna."' },
      { q: 'Anna đến từ thành phố nào?', options: ['Toronto', 'Sydney', 'London'], answer: 1, hint: '"from Australia, from Sydney."' },
    ],
  },

  write: {
    setup: 'Bạn vừa vào nhóm chat của lớp tiếng Anh mới. Mọi người đang lần lượt giới thiệu.',
    prompt: 'Viết 2 câu giới thiệu bạn: tên và nơi bạn đến từ. Có thể thêm một lời chào.',
    model: ['Hi everyone! I’m Linh.', 'I’m from Hue. Nice to meet you all.'],
    checklist: [
      'Có "I’m + tên" (không viết "I Linh").',
      'Có "I’m from + nơi".',
      'Chữ cái đầu câu và tên riêng viết hoa.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gặp một người bạn mới ở quán cà phê. Hai người chưa biết tên nhau.',
    roleA: 'Bạn — chào trước, nói tên và quê, rồi hỏi lại.',
    roleB: 'Người mới — tên Sam, đến từ London.',
    prompt: 'Nói thành tiếng cả hai vai (hoặc nhờ ai đó đóng vai B). Nhớ hỏi tên VÀ quê của Sam.',
    model: ['A: Hi, I’m Linh. I’m from Hue. What’s your name?', 'B: I’m Sam. I’m from London.', 'A: Nice to meet you, Sam. — B: Nice to meet you too.'],
    checklist: [
      'Đã nói tên và quê của mình.',
      'Đã hỏi cả tên và quê của Sam.',
      'Có "Nice to meet you" / "… too".',
    ],
  },
};
