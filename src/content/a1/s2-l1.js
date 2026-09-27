// Chặng 2 · Bài 1 — Giờ và ngày trong tuần.
export default {
  id: 'a1-s2-l1',
  stage: 2,
  order: 1,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Mấy giờ rồi? Hôm nay thứ mấy?',
  canDo: 'Hỏi và nói giờ (giờ chẵn, giờ rưỡi, giờ lẻ theo phút), nói ngày trong tuần và giờ mở/đóng cửa.',

  pattern: {
    name: 'What time is it? / It’s … / at … / on …',
    rule:
      'Hỏi giờ: "What time is it?". Trả lời "It’s + giờ": 7:00 = seven (o’clock); 7:30 = seven thirty (hoặc half past seven); 7:15 = seven fifteen; 7:45 = seven forty-five. Dùng "at + giờ" (at seven) và "on + ngày" (on Monday). Sáng/tối: a.m. / p.m. hoặc "in the morning / evening".',
    examples: [
      ['What time is it? — It’s seven thirty.', 'Mấy giờ rồi? — Bảy giờ rưỡi.'],
      ['The shop opens at nine.', 'Cửa hàng mở lúc chín giờ.'],
      ['I have English class on Tuesday.', 'Tôi có lớp tiếng Anh vào thứ Ba.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'What time is it?', meaning: 'Mấy giờ rồi?', example: 'Excuse me, what time is it?', exampleVi: 'Xin lỗi, mấy giờ rồi?' },
    { id: 'c2', target: 'It’s … o’clock.', meaning: '… giờ (chẵn).', example: 'It’s eight o’clock.', exampleVi: 'Tám giờ.' },
    { id: 'c3', target: 'It’s … thirty.', meaning: '… giờ rưỡi.', example: 'It’s six thirty.', exampleVi: 'Sáu giờ rưỡi.' },
    { id: 'c4', target: 'at …', meaning: 'lúc … giờ', example: 'Class starts at nine fifteen.', exampleVi: 'Lớp bắt đầu lúc chín giờ mười lăm.' },
    { id: 'c5', target: 'on Monday / on Friday', meaning: 'vào thứ Hai / thứ Sáu', example: 'I have class on Monday and on Friday.', exampleVi: 'Tôi có lớp vào thứ Hai và thứ Sáu.' },
    { id: 'c6', target: 'What day is it today?', meaning: 'Hôm nay thứ mấy?', example: 'What day is it today? — It’s Wednesday.', exampleVi: 'Hôm nay thứ mấy? — Thứ Tư.' },
    { id: 'c7', target: 'opens / closes at …', meaning: 'mở / đóng cửa lúc …', example: 'The bank opens at eight and closes at four thirty.', exampleVi: 'Ngân hàng mở lúc tám giờ và đóng cửa lúc bốn giờ rưỡi.' },
    { id: 'c8', target: 'in the morning / in the evening', meaning: 'buổi sáng / buổi tối', example: 'I study in the evening.', exampleVi: 'Tôi học vào buổi tối.' },
  ],

  drills: [
    { q: '7:30 đọc là:', options: ['seven thirty', 'thirty seven', 'seven three'], answer: 0, hint: 'Đọc giờ trước, phút sau.' },
    { q: 'The class starts ___ eight.', options: ['at', 'on', 'in'], answer: 0, hint: 'at + giờ.' },
    { q: 'I have a meeting ___ Monday.', options: ['at', 'on', 'in'], answer: 1, hint: 'on + ngày trong tuần.' },
    { q: 'Hỏi giờ:', options: ['What time is it?', 'What day is it?', 'How old is it?'], answer: 0, hint: 'time = giờ.' },
    { q: '"It’s a quarter past nine" = ', options: ['9:15', '9:45', '8:45'], answer: 0, hint: 'quarter past = 15 phút sau giờ.' },
  ],

  dialogue: {
    title: 'Hỏi giờ ở bến xe',
    lines: [
      ['Lan: Excuse me, what time is it?', 'Lan: Xin lỗi, mấy giờ rồi?'],
      ['Man: It’s ten fifteen.', 'Người đàn ông: Mười giờ mười lăm.'],
      ['Lan: Oh no. What time does the bus to Hue leave?', 'Lan: Ôi không. Xe đi Huế chạy lúc mấy giờ?'],
      ['Man: At ten thirty. You have fifteen minutes.', 'Người đàn ông: Mười giờ rưỡi. Bạn còn mười lăm phút.'],
      ['Lan: Is there a bus on Sunday too?', 'Lan: Chủ nhật cũng có xe chứ?'],
      ['Man: Yes, on Sunday it leaves at eleven.', 'Người đàn ông: Có, Chủ nhật xe chạy lúc mười một giờ.'],
      ['Lan: Thank you!', 'Lan: Cảm ơn!'],
    ],
    questions: [
      { q: 'Bây giờ là mấy giờ?', options: ['10:15', '10:30', '10:50'], answer: 0, hint: '"It’s ten fifteen."' },
      { q: 'Xe đi Huế chạy lúc mấy giờ?', options: ['10:15', '10:30', '11:00'], answer: 1, hint: '"At ten thirty."' },
      { q: 'Chủ nhật xe chạy lúc mấy giờ?', options: ['10:30', '11:00', 'Không có xe'], answer: 1, hint: '"on Sunday it leaves at eleven."' },
    ],
  },

  listening: {
    text: 'Welcome to Green Library. We are open from Monday to Friday, from eight thirty in the morning to five in the evening. On Saturday we open at nine and close at twelve. We are closed on Sunday.',
    vi: 'Chào mừng đến Thư viện Green. Chúng tôi mở từ thứ Hai đến thứ Sáu, từ 8:30 sáng đến 5 giờ chiều. Thứ Bảy mở lúc 9 và đóng lúc 12. Chủ nhật nghỉ.',
    questions: [
      { q: 'Ngày thường thư viện mở lúc mấy giờ?', options: ['8:30', '9:00', '8:00'], answer: 0, hint: '"from eight thirty in the morning."' },
      { q: 'Thứ Bảy thư viện đóng lúc mấy giờ?', options: ['5:00', '12:00', '9:00'], answer: 1, hint: '"close at twelve."' },
      { q: 'Chủ nhật thì sao?', options: ['Mở nửa ngày', 'Nghỉ', 'Mở cả ngày'], answer: 1, hint: '"closed on Sunday."' },
    ],
  },

  write: {
    setup: 'Bạn nhắn cho một người bạn nước ngoài về lớp học tiếng Anh của bạn.',
    prompt: 'Viết 2 câu: lớp học vào thứ mấy và bắt đầu/kết thúc lúc mấy giờ.',
    model: ['My English class is on Tuesday and Thursday.', 'It starts at seven thirty and finishes at nine in the evening.'],
    checklist: [
      'Có "on + thứ" cho ngày.',
      'Có "at + giờ" cho giờ.',
      'Giờ lẻ viết đúng thứ tự giờ–phút (seven thirty).',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn muốn đến phòng gym gần nhà. Bạn gọi hỏi giờ mở cửa.',
    roleA: 'Bạn — hỏi giờ mở, giờ đóng, và có mở Chủ nhật không.',
    roleB: 'Nhân viên — mở 6:00, đóng 22:00 (ten p.m.), Chủ nhật mở 8:00–20:00.',
    prompt: 'Nói thành tiếng cả hai vai. Đọc giờ rõ ràng; dùng a.m./p.m. hoặc in the morning/evening.',
    model: ['A: What time do you open? — B: We open at six a.m.', 'A: And what time do you close? — B: At ten p.m.', 'A: Are you open on Sunday? — B: Yes, from eight to eight.'],
    checklist: [
      'Đã hỏi cả giờ mở và giờ đóng.',
      'Đã hỏi về Chủ nhật bằng "on Sunday".',
      'Đọc giờ đúng (six a.m., ten p.m.).',
    ],
  },
};
