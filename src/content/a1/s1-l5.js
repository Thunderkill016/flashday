// Chặng 1 · Bài 5 — Checkpoint: điền form và tự giới thiệu 30 giây.
// No new pattern; reuses bài 1–4 in one longer situation.
export default {
  id: 'a1-s1-l5',
  stage: 1,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 1,
  title: 'Checkpoint · Điền form và tự giới thiệu',
  canDo: 'Điền một form thông tin cá nhân và tự giới thiệu ngắn (tên, quê, gia đình, công việc) với nhóm mới.',

  chunks: [
    { id: 'c1', target: 'Let me introduce myself.', meaning: 'Để tôi tự giới thiệu.', example: 'Hi everyone, let me introduce myself.', exampleVi: 'Chào mọi người, để tôi tự giới thiệu.' },
    { id: 'c2', target: 'My full name is …', meaning: 'Tên đầy đủ của tôi là …', example: 'My full name is Nguyen Van Minh.', exampleVi: 'Tên đầy đủ của tôi là Nguyễn Văn Minh.' },
    { id: 'c3', target: 'I live in …', meaning: 'Tôi sống ở …', example: 'I live in Ho Chi Minh City.', exampleVi: 'Tôi sống ở TP. Hồ Chí Minh.' },
    { id: 'c4', target: 'I’m married. / I’m single.', meaning: 'Tôi đã kết hôn. / Tôi độc thân.', example: 'I’m married and I have one daughter.', exampleVi: 'Tôi đã kết hôn và có một con gái.' },
    { id: 'c5', target: 'That’s all. Thank you.', meaning: 'Hết rồi. Cảm ơn.', example: 'That’s all about me. Thank you!', exampleVi: 'Về tôi là vậy. Cảm ơn!' },
    { id: 'c6', target: 'Could you repeat that, please?', meaning: 'Bạn nhắc lại được không?', example: 'Sorry, could you repeat that, please?', exampleVi: 'Xin lỗi, bạn nhắc lại được không?' },
  ],

  drills: [
    { q: 'Form ghi "Date of birth". Bạn điền:', options: ['Ngày sinh', 'Nơi sinh', 'Số điện thoại'], answer: 0, hint: 'birth = sinh; date = ngày.' },
    { q: '"I ___ in Hue with my parents."', options: ['live', 'am', 'from'], answer: 0, hint: 'live in + nơi = sống ở.' },
    { q: 'Mở đầu bài tự giới thiệu:', options: ['Let me introduce myself.', 'Can you say that again?', 'What about you?'], answer: 0, hint: 'introduce myself = tự giới thiệu.' },
    { q: 'Ghép đúng: "I have two ___ — a son and a daughter."', options: ['children', 'brothers', 'parents'], answer: 0, hint: 'son + daughter = children (con).' },
  ],

  dialogue: {
    title: 'Buổi đầu của câu lạc bộ tiếng Anh',
    lines: [
      ['Leader: Welcome! Please fill in this form: name, phone, email, job.', 'Trưởng nhóm: Chào mừng! Hãy điền form này: tên, điện thoại, email, nghề.'],
      ['Hoa: OK. My full name is Tran Thi Hoa. T-R-A-N.', 'Hoa: Vâng. Tên đầy đủ của tôi là Trần Thị Hoa. T-R-A-N.'],
      ['Leader: Thanks. Now, everyone — a short introduction, please. Hoa, you first.', 'Trưởng nhóm: Cảm ơn. Giờ mọi người tự giới thiệu ngắn nhé. Hoa trước.'],
      ['Hoa: Hi everyone. I’m Hoa, from Can Tho, but I live in Saigon now.', 'Hoa: Chào mọi người. Tôi là Hoa, quê Cần Thơ, nhưng giờ sống ở Sài Gòn.'],
      ['Hoa: I’m a nurse. I work at Children’s Hospital.', 'Hoa: Tôi là y tá. Tôi làm ở Bệnh viện Nhi.'],
      ['Hoa: I’m married and I have a son. He’s 6. That’s all. Thank you.', 'Hoa: Tôi đã kết hôn và có một con trai. Bé 6 tuổi. Hết rồi. Cảm ơn.'],
      ['Leader: Great, Hoa. Sorry — where do you work? Could you repeat that?', 'Trưởng nhóm: Tuyệt, Hoa. Xin lỗi — bạn làm ở đâu? Nhắc lại được không?'],
      ['Hoa: Children’s Hospital, in District 1.', 'Hoa: Bệnh viện Nhi, ở Quận 1.'],
    ],
    questions: [
      { q: 'Hoa quê ở đâu và hiện sống ở đâu?', options: ['Quê Cần Thơ, sống Sài Gòn', 'Quê Sài Gòn, sống Cần Thơ', 'Quê và sống ở Cần Thơ'], answer: 0, hint: '"from Can Tho, but I live in Saigon now."' },
      { q: 'Hoa làm việc ở đâu?', options: ['Bệnh viện Nhi', 'Trường học', 'Công ty'], answer: 0, hint: '"I work at Children’s Hospital."' },
      { q: 'Con trai Hoa bao nhiêu tuổi?', options: ['6', '16', '60'], answer: 0, hint: '"He’s 6."' },
      { q: 'Trưởng nhóm nhờ Hoa nhắc lại điều gì?', options: ['Nơi làm việc', 'Tên', 'Số điện thoại'], answer: 0, hint: '"where do you work? Could you repeat that?"' },
    ],
  },

  listening: {
    text: 'Hello. Let me introduce myself. My name is Ken Sato. I’m from Japan and I live in Da Nang. I’m an engineer at a Japanese company. I’m single. My phone number is 0 9 3 5 8 8 1 2 4 6.',
    vi: 'Xin chào. Để tôi tự giới thiệu. Tên tôi là Ken Sato. Tôi đến từ Nhật và sống ở Đà Nẵng. Tôi là kỹ sư ở một công ty Nhật. Tôi độc thân. Số điện thoại của tôi là 0935 881 246.',
    questions: [
      { q: 'Ken sống ở đâu?', options: ['Đà Nẵng', 'Nhật', 'Hà Nội'], answer: 0, hint: '"I live in Da Nang."' },
      { q: 'Ken làm nghề gì?', options: ['Kỹ sư', 'Giáo viên', 'Y tá'], answer: 0, hint: '"I’m an engineer."' },
      { q: 'Số điện thoại của Ken?', options: ['0935 881 246', '0935 818 246', '0953 881 246'], answer: 0, hint: '0-9-3-5, 8-8-1, 2-4-6.' },
    ],
  },

  write: {
    setup: 'Bạn đăng ký một khóa học buổi tối. Form có ô "Introduce yourself (3–4 sentences)".',
    prompt: 'Viết 3–4 câu về bạn: tên đầy đủ, quê/nơi sống, nghề hoặc học ở đâu, một câu về gia đình.',
    model: ['My full name is Le Thu Ha. I’m from Nam Dinh, but I live in Hanoi.', 'I’m an accountant at a small company.', 'I’m married and I have two children.'],
    checklist: [
      'Đủ 4 ý: tên, nơi sống, công việc, gia đình.',
      'Dùng đúng I’m / I live in / I work at / I have.',
      'Không câu nào thiếu động từ (không viết "I from Hanoi").',
    ],
    gate: null,
  },

  speak: {
    setup: 'Buổi đầu của nhóm học. Trưởng nhóm mời bạn tự giới thiệu khoảng 30 giây, rồi hỏi lại một câu.',
    roleA: 'Bạn — tự giới thiệu: tên, quê, nơi sống, nghề, gia đình; kết bằng "That’s all. Thank you."',
    roleB: 'Trưởng nhóm — sau đó hỏi một câu: "Where do you work?" hoặc "How old is your …?"; hoặc nhờ nhắc lại.',
    prompt: 'Nói thành tiếng, không nhìn mẫu ở lần đầu. Bấm giờ thử xem có gần 30 giây không.',
    model: ['A: Hi everyone. Let me introduce myself. I’m Quang, from Hai Phong. I live in Hanoi now. I’m a driver. I’m married and I have a daughter. She’s 3. That’s all. Thank you.', 'B: Thanks, Quang. How old is your daughter? — A: She’s 3.'],
    checklist: [
      'Đủ 5 ý (tên, quê, nơi sống, nghề, gia đình).',
      'Có câu mở và câu kết.',
      'Trả lời được câu hỏi lại của trưởng nhóm.',
    ],
  },
};
