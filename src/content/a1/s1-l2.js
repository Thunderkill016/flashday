// Chặng 1 · Bài 2 — Đánh vần, số điện thoại, email.
export default {
  id: 'a1-s1-l2',
  stage: 1,
  order: 2,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Đánh vần, số điện thoại và email',
  canDo: 'Đánh vần tên mình, đọc và hỏi số điện thoại, email; nhờ người kia nhắc lại.',

  pattern: {
    name: 'How do you spell …? / What’s your …?',
    rule:
      '"How do you spell + từ?" để hỏi cách đánh vần; trả lời từng chữ cái. "What’s your phone number / email?" để hỏi thông tin liên hệ. Số điện thoại đọc từng số; 0 đọc là "oh" hoặc "zero"; @ đọc "at", . đọc "dot".',
    examples: [
      ['How do you spell your name?', 'Tên bạn đánh vần thế nào?'],
      ['It’s L-I-N-H.', 'Là L-I-N-H.'],
      ['What’s your phone number?', 'Số điện thoại của bạn là gì?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'How do you spell that?', meaning: 'Cái đó đánh vần thế nào?', example: 'Sorry, how do you spell that?', exampleVi: 'Xin lỗi, cái đó đánh vần thế nào?' },
    { id: 'c2', target: 'It’s …', meaning: 'Là … (đánh vần / số)', example: 'It’s M-A-I.', exampleVi: 'Là M-A-I.' },
    { id: 'c3', target: 'What’s your phone number?', meaning: 'Số điện thoại của bạn là gì?', example: 'What’s your phone number, Tom?', exampleVi: 'Số điện thoại của bạn là gì, Tom?' },
    { id: 'c4', target: 'My number is …', meaning: 'Số của tôi là …', example: 'My number is 0912 345 678.', exampleVi: 'Số của tôi là 0912 345 678.' },
    { id: 'c5', target: 'What’s your email?', meaning: 'Email của bạn là gì?', example: 'What’s your email address?', exampleVi: 'Địa chỉ email của bạn là gì?' },
    { id: 'c6', target: 'Can you say that again?', meaning: 'Bạn nói lại được không?', example: 'Sorry, can you say that again, please?', exampleVi: 'Xin lỗi, bạn nói lại được không?' },
    { id: 'c7', target: 'at … dot com', meaning: '@ … .com (đọc email)', example: 'It’s mai dot le at gmail dot com.', exampleVi: 'Là mai.le@gmail.com.' },
  ],

  drills: [
    { q: 'How do you ___ your name?', options: ['spell', 'say', 'speak'], answer: 0, hint: 'spell = đánh vần từng chữ.' },
    { q: 'Email "tom.lee@mail.com" đọc là:', options: ['tom dot lee at mail dot com', 'tom lee mail com', 'tom at lee dot mail com'], answer: 0, hint: '. = dot, @ = at.' },
    { q: 'Bạn không nghe rõ số điện thoại. Bạn nói:', options: ['Can you say that again?', 'What’s your name?', 'Nice to meet you.'], answer: 0, hint: 'say that again = nói lại.' },
    { q: 'What’s ___ phone number?', options: ['you', 'your', 'yours'], answer: 1, hint: 'your + danh từ (your number).' },
  ],

  dialogue: {
    title: 'Đăng ký ở quầy tiếp tân',
    lines: [
      ['Staff: Good morning. Your name, please?', 'Nhân viên: Chào buổi sáng. Cho tôi xin tên bạn?'],
      ['Linh: It’s Linh Pham.', 'Linh: Là Linh Phạm.'],
      ['Staff: How do you spell Pham?', 'Nhân viên: Phạm đánh vần thế nào?'],
      ['Linh: P-H-A-M.', 'Linh: P-H-A-M.'],
      ['Staff: Thank you. And your phone number?', 'Nhân viên: Cảm ơn. Số điện thoại của bạn?'],
      ['Linh: It’s 0908 224 671.', 'Linh: Là 0908 224 671.'],
      ['Staff: Sorry, can you say that again?', 'Nhân viên: Xin lỗi, bạn nói lại được không?'],
      ['Linh: Sure. 0908 224 671.', 'Linh: Được. 0908 224 671.'],
    ],
    questions: [
      { q: 'Nhân viên hỏi đánh vần từ nào?', options: ['Linh', 'Pham', 'Phone'], answer: 1, hint: '"How do you spell Pham?"' },
      { q: 'Số điện thoại của Linh là?', options: ['0908 224 671', '0908 242 671', '0980 224 671'], answer: 0, hint: 'Nghe từng số: 0-9-0-8, 2-2-4, 6-7-1.' },
      { q: 'Vì sao Linh nói số lần hai?', options: ['Nhân viên nhờ nói lại', 'Linh nói sai lần đầu', 'Nhân viên không nghe tiếng Anh'], answer: 0, hint: '"Can you say that again?"' },
    ],
  },

  listening: {
    text: 'Hello, this is Mark from City Gym. Your new member number is 4 7 2 9. Please call us at 0 2 8 3 9 1 5 6 6 0. Thank you.',
    vi: 'Xin chào, tôi là Mark từ City Gym. Mã hội viên mới của bạn là 4729. Vui lòng gọi cho chúng tôi theo số 028 391 5660. Cảm ơn.',
    questions: [
      { q: 'Mã hội viên là số nào?', options: ['4729', '4279', '7429'], answer: 0, hint: 'four-seven-two-nine.' },
      { q: 'Mark gọi từ đâu?', options: ['City Gym', 'City Bank', 'City Cafe'], answer: 0, hint: '"this is Mark from City Gym."' },
    ],
  },

  write: {
    setup: 'Bạn điền form đăng ký khóa học online và phải giới thiệu ngắn trong ô "About you".',
    prompt: 'Viết 2 câu: tên đầy đủ của bạn (kèm cách đánh vần họ) và email của bạn.',
    model: ['My name is Linh Pham, P-H-A-M.', 'My email is linh.pham@gmail.com.'],
    checklist: [
      'Có "My name is …" và đánh vần họ bằng chữ in, nối bằng gạch ngang.',
      'Có "My email is …".',
      'Email viết đúng dạng (có @ và .com/.vn…).',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gọi đặt bàn ở nhà hàng. Nhân viên cần tên và số điện thoại của bạn.',
    roleA: 'Bạn — nói tên, đánh vần khi được hỏi, đọc số điện thoại từng số.',
    roleB: 'Nhân viên — hỏi tên, cách đánh vần, số điện thoại; nhờ nói lại một lần.',
    prompt: 'Nói thành tiếng. Khi đọc số điện thoại, đọc chậm, nhóm 3–4 số.',
    model: ['B: Your name, please? — A: It’s Minh Tran. T-R-A-N.', 'B: And your phone number? — A: It’s 0917 630 285.', 'B: Can you say that again? — A: Sure. 0917 630 285.'],
    checklist: [
      'Đã đánh vần họ rõ từng chữ.',
      'Đã đọc số điện thoại từng số, không đọc như số lớn.',
      'Khi được nhờ, đã nói lại số một lần nữa.',
    ],
  },
};
