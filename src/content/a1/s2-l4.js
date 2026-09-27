// Chặng 2 · Bài 4 — Tần suất và sở thích.
export default {
  id: 'a1-s2-l4',
  stage: 2,
  order: 4,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Bao lâu một lần? Bạn thích gì?',
  canDo: 'Nói mình làm việc gì thường xuyên đến đâu (always, usually, sometimes, never) và nói về sở thích cuối tuần.',

  pattern: {
    name: 'I usually … / How often …? / I like + V-ing',
    rule:
      'Trạng từ tần suất đứng TRƯỚC động từ thường: "I usually cook." "She never drinks coffee." (always > usually > often > sometimes > never). Hỏi: "How often do you …?" Trả lời: "Every day." / "Twice a week." / "On weekends." Sở thích: "I like/love + V-ing" (I like cooking).',
    examples: [
      ['I usually get up early.', 'Tôi thường dậy sớm.'],
      ['How often do you play football? — Twice a week.', 'Bạn chơi bóng bao lâu một lần? — Hai lần một tuần.'],
      ['I love cooking on weekends.', 'Tôi thích nấu ăn vào cuối tuần.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'How often do you …?', meaning: 'Bạn … bao lâu một lần?', example: 'How often do you go to the gym?', exampleVi: 'Bạn đi gym bao lâu một lần?' },
    { id: 'c2', target: 'every day / every week', meaning: 'mỗi ngày / mỗi tuần', example: 'I call my mother every day.', exampleVi: 'Tôi gọi cho mẹ mỗi ngày.' },
    { id: 'c3', target: 'once / twice a week', meaning: 'một / hai lần một tuần', example: 'I go swimming twice a week.', exampleVi: 'Tôi đi bơi hai lần một tuần.' },
    { id: 'c4', target: 'I usually …', meaning: 'Tôi thường …', example: 'I usually have coffee at seven.', exampleVi: 'Tôi thường uống cà phê lúc bảy giờ.' },
    { id: 'c5', target: 'I never …', meaning: 'Tôi không bao giờ …', example: 'I never eat breakfast.', exampleVi: 'Tôi không bao giờ ăn sáng.' },
    { id: 'c6', target: 'on weekends', meaning: 'vào cuối tuần', example: 'On weekends I visit my parents.', exampleVi: 'Cuối tuần tôi thăm bố mẹ.' },
    { id: 'c7', target: 'I like / love + V-ing', meaning: 'Tôi thích / rất thích …', example: 'I like reading and I love cooking.', exampleVi: 'Tôi thích đọc sách và rất thích nấu ăn.' },
    { id: 'c8', target: 'What do you do on weekends?', meaning: 'Cuối tuần bạn làm gì?', example: 'What do you usually do on weekends?', exampleVi: 'Cuối tuần bạn thường làm gì?' },
  ],

  drills: [
    { q: 'I ___ drink coffee at night. (không bao giờ)', options: ['never', 'always', 'usually'], answer: 0, hint: 'never = không bao giờ.' },
    { q: 'Vị trí đúng: ', options: ['I usually cook dinner.', 'I cook usually dinner.', 'Usually I cook dinner usually.'], answer: 0, hint: 'Trạng từ tần suất trước động từ.' },
    { q: 'How often ___ you play football?', options: ['do', 'does', 'are'], answer: 0, hint: 'you → do.' },
    { q: 'I like ___ music.', options: ['listen', 'listening', 'to listening'], answer: 1, hint: 'like + V-ing.' },
    { q: '"Twice a week" = ', options: ['Hai lần một tuần', 'Hai tuần một lần', 'Mỗi tuần hai ngày liền'], answer: 0, hint: 'twice = hai lần; a week = một tuần.' },
  ],

  dialogue: {
    title: 'Cuối tuần của bạn thế nào?',
    lines: [
      ['Mai: What do you usually do on weekends, Tom?', 'Mai: Cuối tuần bạn thường làm gì, Tom?'],
      ['Tom: I usually play football on Saturday morning.', 'Tom: Tôi thường chơi bóng sáng thứ Bảy.'],
      ['Mai: How often do you play?', 'Mai: Bạn chơi bao lâu một lần?'],
      ['Tom: Every week. And on Sunday I sleep late. I never get up before ten!', 'Tom: Mỗi tuần. Còn Chủ nhật tôi ngủ nướng. Tôi không bao giờ dậy trước mười giờ!'],
      ['Mai: Ha! I always get up early. I love cooking, so I cook for my family.', 'Mai: Ha! Tôi luôn dậy sớm. Tôi thích nấu ăn, nên tôi nấu cho gia đình.'],
      ['Tom: Nice. Do you like football?', 'Tom: Hay. Bạn thích bóng đá không?'],
      ['Mai: Sometimes I watch it, but I don’t play.', 'Mai: Đôi khi tôi xem, nhưng không chơi.'],
    ],
    questions: [
      { q: 'Tom chơi bóng bao lâu một lần?', options: ['Mỗi tuần', 'Hai lần một tuần', 'Mỗi ngày'], answer: 0, hint: '"Every week."' },
      { q: 'Chủ nhật Tom làm gì?', options: ['Ngủ nướng', 'Nấu ăn', 'Chơi bóng'], answer: 0, hint: '"On Sunday I sleep late."' },
      { q: 'Mai thích gì?', options: ['Nấu ăn', 'Chơi bóng', 'Ngủ nướng'], answer: 0, hint: '"I love cooking."' },
    ],
  },

  listening: {
    text: 'I’m Julia. I work from Monday to Friday, so my weekends are important. On Saturday I always go to the market in the morning and I sometimes meet friends for lunch. I never work on Sunday. I love reading, so on Sunday I read all day.',
    vi: 'Tôi là Julia. Tôi làm từ thứ Hai đến thứ Sáu, nên cuối tuần rất quan trọng. Thứ Bảy tôi luôn đi chợ buổi sáng và đôi khi gặp bạn ăn trưa. Tôi không bao giờ làm việc Chủ nhật. Tôi thích đọc sách, nên Chủ nhật tôi đọc cả ngày.',
    questions: [
      { q: 'Thứ Bảy Julia luôn làm gì?', options: ['Đi chợ', 'Gặp bạn', 'Đọc sách'], answer: 0, hint: '"I always go to the market."' },
      { q: 'Julia không bao giờ làm gì vào Chủ nhật?', options: ['Làm việc', 'Đọc sách', 'Đi chợ'], answer: 0, hint: '"I never work on Sunday."' },
    ],
  },

  write: {
    setup: 'Bạn giới thiệu bản thân trong một nhóm bạn học online, chủ đề tuần này: "Your weekend".',
    prompt: 'Viết 3 câu: một việc bạn thường làm cuối tuần, một việc bạn không bao giờ làm, và một sở thích (like/love + V-ing).',
    model: ['On weekends I usually visit my grandparents.', 'I never get up early on Sunday.', 'I love watching films at night.'],
    checklist: [
      'Có một trạng từ tần suất đứng trước động từ.',
      'Có "never" dùng đúng (không kèm "don’t").',
      'Có like/love + V-ing.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn nói chuyện với đồng nghiệp mới trong giờ ăn trưa về thói quen và sở thích.',
    roleA: 'Bạn — hỏi "What do you do on weekends?" và "How often …?"; trả lời về mình.',
    roleB: 'Đồng nghiệp — tên Rosa: chạy bộ 3 lần/tuần, thích chụp ảnh, không bao giờ xem TV.',
    prompt: 'Nói thành tiếng cả hai vai. Dùng ít nhất 3 trạng từ tần suất khác nhau.',
    model: ['A: What do you do on weekends, Rosa? — B: I usually go running. I run three times a week.', 'A: Do you watch TV? — B: No, I never watch TV. I love taking photos.', 'A: I sometimes take photos too!'],
    checklist: [
      'Có câu hỏi How often / What do you do on weekends.',
      'Dùng đúng ít nhất 3 trạng từ tần suất.',
      'Có like/love + V-ing.',
    ],
  },
};
