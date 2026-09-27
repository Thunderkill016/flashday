// Chặng 5 · Bài 1 — Cơ thể, đau ốm, ở hiệu thuốc.
// Assessed set kept small: headache / fever / tablet. throat, cough, syrup
// and pharmacist were removed or glossed away so nothing above the level is
// a target — see docs/level-audit-a1.md.
export default {
  id: 'a1-s5-l1',
  stage: 5,
  order: 1,
  kind: 'lesson',
  contentVersion: 2,
  title: 'Tôi không khỏe',
  canDo: 'Nói mình bị đau/ốm ở đâu, hiểu lời khuyên đơn giản, mua thuốc ở hiệu thuốc và hỏi cách dùng.',

  pattern: {
    name: 'I have a … / My … hurts. / You should …',
    rule:
      'Bệnh thường: "I have a headache / a cold / a fever." Đau bộ phận: "My back hurts." (số ít → hurts) / "My eyes hurt." (số nhiều → hurt). Khuyên: "You should rest / drink water / see a doctor." Ở hiệu thuốc: "Do you have something for a headache?" / "How often do I take it?"',
    examples: [
      ['I have a headache and a fever.', 'Tôi bị đau đầu và sốt.'],
      ['My stomach hurts.', 'Bụng tôi đau.'],
      ['You should see a doctor.', 'Bạn nên đi khám.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'I don’t feel well.', meaning: 'Tôi không khỏe.', example: 'Sorry, I don’t feel well today.', exampleVi: 'Xin lỗi, hôm nay tôi không khỏe.' },
    { id: 'c2', target: 'I have a headache / a cold / a fever', meaning: 'Tôi bị đau đầu / cảm / sốt', example: 'I have a headache and a fever.', exampleVi: 'Tôi bị đau đầu và sốt.' },
    { id: 'c3', target: 'My … hurts.', meaning: '… của tôi đau.', example: 'My back hurts when I sit.', exampleVi: 'Lưng tôi đau khi ngồi.' },
    { id: 'c4', target: 'What’s wrong?', meaning: 'Bạn bị gì?', example: 'You look pale. What’s wrong?', exampleVi: 'Trông bạn nhợt nhạt. Bạn bị gì?' },
    { id: 'c5', target: 'You should …', meaning: 'Bạn nên …', example: 'You should rest and drink water.', exampleVi: 'Bạn nên nghỉ và uống nước.' },
    { id: 'c6', target: 'Do you have something for …?', meaning: 'Có thuốc gì cho … không?', example: 'Do you have something for a headache?', exampleVi: 'Có thuốc gì cho đau đầu không?' },
    { id: 'c7', target: 'Take one tablet … times a day.', meaning: 'Uống một viên … lần mỗi ngày.', example: 'Take one tablet three times a day after meals.', exampleVi: 'Uống một viên ba lần mỗi ngày sau ăn.' },
    { id: 'c8', target: 'Get well soon!', meaning: 'Mau khỏe nhé!', example: 'Get well soon, Mai!', exampleVi: 'Mau khỏe nhé, Mai!' },
  ],

  drills: [
    { q: 'I ___ a headache.', options: ['have', 'am', 'hurt'], answer: 0, hint: 'have a + bệnh.' },
    { q: 'My leg ___.', options: ['hurts', 'hurt', 'is hurt'], answer: 0, hint: 'leg (số ít) → hurts.' },
    { q: 'Hỏi người kia bị gì:', options: ['What’s wrong?', 'What are you?', 'How much is it?'], answer: 0, hint: 'What’s wrong? = bị gì vậy?' },
    { q: 'You ___ see a doctor.', options: ['should', 'have', 'are'], answer: 0, hint: 'should + động từ = nên.' },
    { q: '"Take one tablet twice a day" = ', options: ['Uống 1 viên, 2 lần/ngày', 'Uống 2 viên, 1 lần/ngày', 'Uống 2 viên mỗi 2 ngày'], answer: 0, hint: 'twice a day = hai lần một ngày.' },
  ],

  dialogue: {
    title: 'Ở hiệu thuốc',
    lines: [
      ['Lan: Hello. How can I help you?', 'Lan: Chào. Tôi giúp gì được?'],
      ['Duc: I don’t feel well. I have a headache and a cold.', 'Đức: Tôi không khỏe. Tôi bị đau đầu và cảm.'],
      ['Lan: Do you have a fever?', 'Lan: Có sốt không?'],
      ['Duc: No, but my head hurts a little.', 'Đức: Không, nhưng đầu hơi đau.'],
      ['Lan: OK. You should take these tablets for your head.', 'Lan: Được. Bạn nên uống mấy viên này cho đầu.'],
      ['Duc: How often do I take them?', 'Đức: Uống bao lâu một lần?'],
      ['Lan: One tablet twice a day, after meals. And you should rest.', 'Lan: Một viên hai lần mỗi ngày, sau ăn. Và bạn nên nghỉ ngơi.'],
      ['Duc: Thank you.', 'Đức: Cảm ơn.'],
    ],
    questions: [
      { q: 'Đức bị gì?', options: ['Đau đầu và cảm', 'Sốt cao', 'Đau bụng'], answer: 0, hint: '"a headache and a cold".' },
      { q: 'Đức có sốt không?', options: ['Không, chỉ hơi đau đầu', 'Có', 'Không rõ'], answer: 0, hint: '"No, but my head hurts a little."' },
      { q: 'Uống viên thuốc thế nào?', options: ['1 viên, 2 lần/ngày, sau ăn', '2 viên, 1 lần/ngày', '1 viên trước khi ngủ'], answer: 0, hint: '"One tablet twice a day, after meals."' },
    ],
  },

  listening: {
    text: 'Hi, this is Anna. I can’t come to class today. I have a fever and my head hurts a lot. I should stay in bed for two days and drink a lot of water. See you on Thursday, I hope!',
    vi: 'Chào, Anna đây. Hôm nay mình không đến lớp được. Mình bị sốt và đau đầu nhiều. Mình nên nằm nghỉ hai ngày và uống nhiều nước. Hy vọng gặp lại thứ Năm!',
    questions: [
      { q: 'Anna bị gì?', options: ['Sốt và đau đầu', 'Cảm và đau bụng', 'Chỉ sốt'], answer: 0, hint: '"I have a fever and my head hurts a lot."' },
      { q: 'Anna nên làm gì?', options: ['Nằm nghỉ 2 ngày, uống nhiều nước', 'Đi làm bình thường', 'Uống cà phê'], answer: 0, hint: '"stay in bed for two days and drink a lot of water".' },
    ],
  },

  write: {
    setup: 'Bạn bị ốm và nhắn cho giáo viên/quản lý báo không đến được.',
    prompt: 'Viết 3 câu: bạn bị gì (2 triệu chứng), bạn sẽ làm gì (nghỉ/đi khám), và khi nào bạn quay lại.',
    model: ['Hello, I don’t feel well today. I have a fever and a headache.', 'I should rest and see a doctor.', 'I hope I can come back on Monday.'],
    checklist: [
      'Có I have a + bệnh hoặc My … hurts.',
      'Có should + động từ.',
      'Có câu về ngày quay lại.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn đến hiệu thuốc vì bị đau bụng và hơi sốt.',
    roleA: 'Khách — nói triệu chứng, trả lời câu hỏi, hỏi cách uống thuốc.',
    roleB: 'Dược sĩ — hỏi có sốt không, đưa thuốc, hướng dẫn 1 viên 3 lần/ngày sau ăn, khuyên uống nước.',
    prompt: 'Nói thành tiếng cả hai vai. Khách nhắc lại cách dùng thuốc trước khi cảm ơn.',
    model: ['A: I don’t feel well. My stomach hurts and I have a small fever. — B: Anything else? — A: No.', 'B: Take one tablet three times a day after meals. You should drink water.', 'A: One tablet, three times a day, after meals. Thank you.'],
    checklist: [
      'Có My … hurts và I have a ….',
      'Có hỏi/nhắc lại cách uống thuốc.',
      'Có You should ….',
    ],
  },
};
