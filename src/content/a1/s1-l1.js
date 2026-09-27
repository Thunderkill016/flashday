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
  contentVersion: 2,
  title: 'Chào hỏi và giới thiệu',
  canDo: 'Chào người mới gặp, nói tên và nơi mình đến từ, hỏi tên và nơi người ấy đến từ.',

  pattern: {
    name: 'I’m … / I’m from …',
    rule: 'I am → I’m. Nói tên: "I’m + tên" (không nói "I Linh"). Nói nơi mình đến từ: "I’m from + nơi". Hỏi người kia: "What’s your name?" và "Where are you from?".',
    examples: [
      ['I’m Mai.', 'Tôi là Mai.'],
      ['I’m from Vietnam.', 'Tôi đến từ Việt Nam.'],
      ['Where are you from?', 'Bạn đến từ đâu?'],
    ],
  },

  chunks: [
    {
      id: 'c1',
      target: 'Hello, I’m …',
      meaning: 'Chào, tôi là …',
      example: 'Hello, I’m Mai.',
      exampleVi: 'Chào, tôi là Mai.',
    },
    {
      id: 'c2',
      target: 'Nice to meet you.',
      meaning: 'Rất vui được gặp bạn.',
      example: 'Nice to meet you, Tom.',
      exampleVi: 'Rất vui được gặp bạn, Tom.',
    },
    {
      id: 'c3',
      target: 'Nice to meet you too.',
      meaning: 'Tôi cũng rất vui được gặp bạn.',
      example: 'Nice to meet you too, Mai.',
      exampleVi: 'Tôi cũng rất vui được gặp bạn, Mai.',
    },
    {
      id: 'c4',
      target: 'What’s your name?',
      meaning: 'Bạn tên gì?',
      example: 'Hi! What’s your name?',
      exampleVi: 'Chào! Bạn tên gì?',
    },
    {
      id: 'c5',
      target: 'I’m from …',
      meaning: 'Tôi đến từ …',
      example: 'I’m from Da Nang.',
      exampleVi: 'Tôi đến từ Đà Nẵng.',
    },
    {
      id: 'c6',
      target: 'Where are you from?',
      meaning: 'Bạn đến từ đâu?',
      example: 'Where are you from, Tom?',
      exampleVi: 'Bạn đến từ đâu, Tom?',
    },
    {
      id: 'c7',
      target: 'My name is …',
      meaning: 'Tên tôi là …',
      example: 'My name is Anna.',
      exampleVi: 'Tên tôi là Anna.',
    },
    {
      id: 'c8',
      target: 'And you?',
      meaning: 'Còn bạn?',
      example: 'I’m from Da Nang. And you?',
      exampleVi: 'Tôi đến từ Đà Nẵng. Còn bạn?',
    },
  ],

  drills: [
    {
      q: 'Hello, I ___ Mai.',
      options: ['am', 'is', 'are'],
      answer: 0,
      hint: 'Nói tên mình: I am Mai, hoặc I’m Mai.',
    },
    {
      q: 'Where ___ you from?',
      options: ['am', 'is', 'are'],
      answer: 2,
      hint: 'you đi với are.',
    },
    {
      q: 'Bạn chưa biết tên người đối diện. Bạn hỏi:',
      options: ['What’s your name?', 'Where are you from?', 'I’m from Hanoi.'],
      answer: 0,
      hint: 'What’s your name? hỏi tên; Where are you from? hỏi nơi đến từ.',
    },
    {
      q: 'Người kia nói "Nice to meet you." Bạn đáp:',
      options: ['Nice to meet you too.', 'Nice to meet you, Mai.', 'I’m from Hanoi.'],
      answer: 0,
      hint: 'Khi đáp lại lời chào này, thêm too = cũng vậy.',
    },
  ],

  dialogue: {
    title: 'Ngày đầu ở lớp tiếng Anh',
    lines: [
      ['Tom: Hello! I’m Tom. What’s your name?', 'Tom: Chào! Mình là Tom. Bạn tên gì?'],
      ['Mai: Hi Tom. I’m Mai.', 'Mai: Chào Tom. Mình là Mai.'],
      ['Tom: Nice to meet you, Mai.', 'Tom: Rất vui được gặp bạn, Mai.'],
      ['Mai: Nice to meet you too. Where are you from?', 'Mai: Mình cũng rất vui được gặp bạn. Bạn đến từ đâu?'],
      ['Tom: I’m from Canada. And you?', 'Tom: Mình đến từ Canada. Còn bạn?'],
      ['Mai: I’m from Da Nang, Vietnam.', 'Mai: Mình đến từ Đà Nẵng, Việt Nam.'],
    ],
    questions: [
      {
        q: 'Người Tom gặp tên gì?',
        options: ['Mai', 'Anna', 'Sam'],
        answer: 0,
        hint: 'Mai nói: "I’m Mai."',
      },
      {
        q: 'Tom đến từ đâu?',
        options: ['Việt Nam', 'Canada', 'Đà Nẵng'],
        answer: 1,
        hint: 'Tom nói: "I’m from Canada."',
      },
      {
        q: 'Mai đến từ đâu?',
        options: ['Đà Nẵng', 'Canada', 'Hà Nội'],
        answer: 0,
        hint: 'Mai nói: "I’m from Da Nang, Vietnam."',
      },
    ],
  },

  listening: {
    text: 'Hello, my name is Anna. I’m from Sydney, Australia. Nice to meet you.',
    vi: 'Chào bạn, mình là Anna. Mình đến từ Sydney, Úc. Rất vui được gặp bạn.',
    questions: [
      {
        q: 'Người nói tên gì?',
        options: ['Anna', 'Mai', 'Tom'],
        answer: 0,
        hint: 'Nghe: "My name is Anna."',
      },
      {
        q: 'Anna đến từ thành phố nào?',
        options: ['Đà Nẵng', 'Sydney', 'Hà Nội'],
        answer: 1,
        hint: 'Nghe: "I’m from Sydney, Australia."',
      },
    ],
  },

  write: {
    setup: 'Bạn vừa vào nhóm chat của lớp tiếng Anh mới. Mọi người đang lần lượt giới thiệu.',
    prompt: 'Viết 2 câu giới thiệu bạn: tên và nơi bạn đến từ. Có thể thêm một lời chào.',
    model: ['Hi! I’m Linh.', 'I’m from Hue. Nice to meet you.'],
    checklist: ['Có "I’m + tên" (không viết "I Linh").', 'Có "I’m from + nơi".', 'Đã kiểm tra chữ đầu câu và tên riêng viết hoa; sửa lại nếu cần.'],
    gate: null,
  },

  speak: {
    setup: 'Bạn gặp một người bạn mới ở quán cà phê. Hai người chưa biết tên nhau.',
    roleA: 'Bạn — chào trước, nói tên và quê, rồi hỏi lại.',
    roleB: 'Người mới — tên Sam, đến từ London.',
    prompt: 'Nói thành tiếng cả hai vai (hoặc nhờ ai đó đóng vai B). Nhớ hỏi tên VÀ quê của Sam.',
    model: ['A: Hi, I’m Linh. What’s your name? — B: I’m Sam.', 'A: I’m from Hue. Where are you from, Sam? — B: I’m from London.', 'A: Nice to meet you. — B: Nice to meet you too.'],
    checklist: ['Đã nói tên và quê của mình.', 'Đã hỏi cả tên và quê của Sam.', 'Có "Nice to meet you" / "… too".', 'Nói rõ âm cuối của name và meet để người nghe hiểu.'],
  },
};
