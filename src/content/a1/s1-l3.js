// Chặng 1 · Bài 3 — Gia đình và tuổi.
export default {
  id: 'a1-s1-l3',
  stage: 1,
  order: 3,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Gia đình và tuổi',
  canDo: 'Nói về những người trong gia đình mình (ai, tên, tuổi) và hỏi về gia đình người khác.',

  pattern: {
    name: 'This is my … / He’s … / She’s …',
    rule:
      '"This is my + người" để giới thiệu; sau đó dùng he (anh/ông/em trai…) hoặc she (chị/bà/em gái…). Tuổi: "He’s 30." hoặc "He’s 30 years old." — không dùng "have" cho tuổi.',
    examples: [
      ['This is my sister. She’s 20.', 'Đây là em gái tôi. Em ấy 20 tuổi.'],
      ['My father is 55 years old.', 'Bố tôi 55 tuổi.'],
      ['How old is your brother?', 'Anh trai bạn bao nhiêu tuổi?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'This is my …', meaning: 'Đây là … của tôi', example: 'This is my mother, Hoa.', exampleVi: 'Đây là mẹ tôi, Hoa.' },
    { id: 'c2', target: 'He’s … / She’s …', meaning: 'Anh ấy … / Cô ấy …', example: 'She’s a teacher.', exampleVi: 'Cô ấy là giáo viên.' },
    { id: 'c3', target: 'How old is …?', meaning: '… bao nhiêu tuổi?', example: 'How old is your son?', exampleVi: 'Con trai bạn bao nhiêu tuổi?' },
    { id: 'c4', target: '… years old', meaning: '… tuổi', example: 'My brother is 12 years old.', exampleVi: 'Em trai tôi 12 tuổi.' },
    { id: 'c5', target: 'Do you have any brothers or sisters?', meaning: 'Bạn có anh chị em không?', example: 'Do you have any brothers or sisters, Tom?', exampleVi: 'Bạn có anh chị em không, Tom?' },
    { id: 'c6', target: 'I have …', meaning: 'Tôi có …', example: 'I have one brother and two sisters.', exampleVi: 'Tôi có một anh trai và hai em gái.' },
    { id: 'c7', target: 'His name is … / Her name is …', meaning: 'Tên anh ấy là … / Tên cô ấy là …', example: 'Her name is Lan.', exampleVi: 'Tên cô ấy là Lan.' },
  ],

  drills: [
    { q: 'This is my sister. ___ name is Thu.', options: ['His', 'Her', 'Your'], answer: 1, hint: 'sister → she → her.' },
    { q: 'My father ___ 60 years old.', options: ['is', 'has', 'have'], answer: 0, hint: 'Tuổi dùng be (is), không dùng have.' },
    { q: 'How ___ is your brother?', options: ['many', 'old', 'much'], answer: 1, hint: 'how old = bao nhiêu tuổi.' },
    { q: 'Hỏi ai đó có anh chị em không:', options: ['Do you have any brothers or sisters?', 'How old are you?', 'Where is your sister?'], answer: 0, hint: 'have = có.' },
  ],

  dialogue: {
    title: 'Xem ảnh gia đình',
    lines: [
      ['Tom: Is this your family, Mai?', 'Tom: Đây là gia đình bạn hả, Mai?'],
      ['Mai: Yes. This is my father. He’s 58.', 'Mai: Ừ. Đây là bố tôi. Bố 58 tuổi.'],
      ['Tom: And who’s this?', 'Tom: Còn đây là ai?'],
      ['Mai: That’s my younger brother, Nam. He’s 15.', 'Mai: Đó là em trai tôi, Nam. Em ấy 15 tuổi.'],
      ['Tom: Do you have any sisters?', 'Tom: Bạn có chị em gái không?'],
      ['Mai: Yes, one older sister. Her name is Thu. She’s a nurse.', 'Mai: Có, một chị gái. Tên chị là Thu. Chị là y tá.'],
      ['Tom: Nice family!', 'Tom: Gia đình đẹp quá!'],
    ],
    questions: [
      { q: 'Bố Mai bao nhiêu tuổi?', options: ['58', '85', '15'], answer: 0, hint: '"He’s 58."' },
      { q: 'Nam là ai?', options: ['Em trai Mai', 'Anh trai Mai', 'Bạn Mai'], answer: 0, hint: '"my younger brother, Nam."' },
      { q: 'Chị gái Mai làm nghề gì?', options: ['Giáo viên', 'Y tá', 'Bác sĩ'], answer: 1, hint: '"She’s a nurse."' },
    ],
  },

  listening: {
    text: 'This is a photo of my family. My mother is 50 and my father is 52. I have one sister. Her name is Emma and she’s 25. She lives in Melbourne.',
    vi: 'Đây là ảnh gia đình tôi. Mẹ tôi 50 và bố tôi 52. Tôi có một chị/em gái. Tên cô ấy là Emma và cô ấy 25 tuổi. Cô ấy sống ở Melbourne.',
    questions: [
      { q: 'Bố người nói bao nhiêu tuổi?', options: ['50', '52', '25'], answer: 1, hint: '"my father is 52."' },
      { q: 'Emma là ai?', options: ['Chị/em gái', 'Mẹ', 'Bạn'], answer: 0, hint: '"I have one sister. Her name is Emma."' },
    ],
  },

  write: {
    setup: 'Bạn gửi ảnh gia đình cho bạn nước ngoài và viết chú thích.',
    prompt: 'Viết 2–3 câu giới thiệu hai người trong gia đình bạn: là ai, tên, tuổi (hoặc nghề).',
    model: ['This is my mother. Her name is Hoa and she’s 49.', 'This is my little brother, Bao. He’s 10 years old.'],
    checklist: [
      'Mỗi người có "This is my …".',
      'Dùng đúng he/she và his/her.',
      'Tuổi dùng is/’s, không dùng have.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn cùng bạn mới xem ảnh trên điện thoại. Người kia hỏi về gia đình bạn.',
    roleA: 'Bạn — giới thiệu 2 người trong ảnh, trả lời tuổi.',
    roleB: 'Bạn mới — hỏi "Who’s this?", "How old is he/she?", "Do you have any brothers or sisters?".',
    prompt: 'Nói thành tiếng cả hai vai. Cố dùng he/she đúng theo người.',
    model: ['B: Who’s this? — A: This is my father. He’s 60.', 'B: Do you have any brothers or sisters? — A: Yes, one sister. Her name is Ly.', 'B: How old is she? — A: She’s 22.'],
    checklist: [
      'Đã giới thiệu ít nhất 2 người.',
      'Đã trả lời tuổi bằng "He’s/She’s + số".',
      'Không nhầm he/she.',
    ],
  },
};
