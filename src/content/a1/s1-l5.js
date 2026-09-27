// Chặng 1 · Bài 5 — Checkpoint: điền form và tự giới thiệu 30 giây.
// No new pattern; every chunk target and drill answer reuses bài 1–4
// (name/spelling, contact info, family, job). New words stay in translated
// dialogue/listening context only — nothing new is assessed.
export default {
  id: 'a1-s1-l5',
  stage: 1,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 2,
  title: 'Checkpoint · Điền form và tự giới thiệu',
  canDo: 'Điền một form thông tin cá nhân và tự giới thiệu ngắn (tên, quê, gia đình, công việc) với nhóm mới.',

  chunks: [
    { id: 'c1', target: 'My name is …', meaning: 'Tên tôi là …', example: 'My name is Tran Thi Hoa. T-R-A-N.', exampleVi: 'Tên tôi là Trần Thị Hoa. T-R-A-N.' },
    { id: 'c2', target: 'I’m from …', meaning: 'Tôi đến từ …', example: 'I’m from Can Tho.', exampleVi: 'Tôi đến từ Cần Thơ.' },
    { id: 'c3', target: 'I live in …', meaning: 'Tôi sống ở …', example: 'I live in Ho Chi Minh City now.', exampleVi: 'Giờ tôi sống ở TP. Hồ Chí Minh.' },
    { id: 'c4', target: 'I’m a … / I’m an …', meaning: 'Tôi là … (nghề)', example: 'I’m a nurse.', exampleVi: 'Tôi là y tá.' },
    { id: 'c5', target: 'I have …', meaning: 'Tôi có …', example: 'I have a son. He’s 6.', exampleVi: 'Tôi có một con trai. Bé 6 tuổi.' },
    { id: 'c6', target: 'Can you say that again?', meaning: 'Bạn nói lại được không?', example: 'Sorry, can you say that again, please?', exampleVi: 'Xin lỗi, bạn nói lại được không?' },
  ],

  drills: [
    { q: 'Form ghi "Date of birth". Bạn điền:', options: ['Ngày sinh', 'Nơi sinh', 'Số điện thoại'], answer: 0, hint: 'birth = sinh; date = ngày.' },
    { q: '"I ___ a nurse."', options: ['am', 'is', 'have'], answer: 0, hint: 'I + am; I’m a + nghề.' },
    { q: 'Bạn không nghe rõ số điện thoại. Bạn nói:', options: ['Can you say that again?', 'What’s your name?', 'Nice to meet you.'], answer: 0, hint: 'say that again = nói lại.' },
    { q: 'Ghép đúng: "I have two ___ — a son and a daughter."', options: ['children', 'brothers', 'parents'], answer: 0, hint: 'son + daughter = children (con).' },
  ],

  dialogue: {
    title: 'Buổi đầu của câu lạc bộ tiếng Anh',
    lines: [
      ['Leader: Welcome! Please fill in this form: name, phone, email, job.', 'Trưởng nhóm: Chào mừng! Hãy điền form này: tên, điện thoại, email, nghề.'],
      ['Hoa: OK. My name is Tran Thi Hoa. T-R-A-N.', 'Hoa: Vâng. Tên tôi là Trần Thị Hoa. T-R-A-N.'],
      ['Leader: Thanks. Now, everyone — a short introduction, please. Hoa, you first.', 'Trưởng nhóm: Cảm ơn. Giờ mọi người tự giới thiệu ngắn nhé. Hoa trước.'],
      ['Hoa: Hi everyone. I’m Hoa. I’m from Can Tho, but I live in Saigon now.', 'Hoa: Chào mọi người. Tôi là Hoa. Tôi đến từ Cần Thơ, nhưng giờ sống ở Sài Gòn.'],
      ['Hoa: I’m a nurse. I work at Children’s Hospital.', 'Hoa: Tôi là y tá. Tôi làm ở Bệnh viện Nhi.'],
      ['Hoa: I have a son. He’s 6. That’s all. Thank you.', 'Hoa: Tôi có một con trai. Bé 6 tuổi. Hết rồi. Cảm ơn.'],
      ['Leader: Great, Hoa. Sorry — where do you work? Can you say that again?', 'Trưởng nhóm: Tuyệt, Hoa. Xin lỗi — bạn làm ở đâu? Nói lại được không?'],
      ['Hoa: Children’s Hospital, in District 1.', 'Hoa: Bệnh viện Nhi, ở Quận 1.'],
    ],
    questions: [
      { q: 'Hoa quê ở đâu và hiện sống ở đâu?', options: ['Quê Cần Thơ, sống Sài Gòn', 'Quê Sài Gòn, sống Cần Thơ', 'Quê và sống ở Cần Thơ'], answer: 0, hint: '"from Can Tho, but I live in Saigon now."' },
      { q: 'Hoa làm việc ở đâu?', options: ['Bệnh viện Nhi', 'Trường học', 'Công ty'], answer: 0, hint: '"I work at Children’s Hospital."' },
      { q: 'Con trai Hoa bao nhiêu tuổi?', options: ['6', '16', '60'], answer: 0, hint: '"He’s 6."' },
      { q: 'Trưởng nhóm nhờ Hoa nhắc lại điều gì?', options: ['Nơi làm việc', 'Tên', 'Số điện thoại'], answer: 0, hint: '"where do you work? Can you say that again?"' },
    ],
  },

  listening: {
    text: 'Hello. My name is Ken Sato. I’m from Japan and I live in Da Nang. I’m an engineer at a Japanese company. I have one daughter. My phone number is 0 9 3 5 8 8 1 2 4 6.',
    vi: 'Xin chào. Tên tôi là Ken Sato. Tôi đến từ Nhật và sống ở Đà Nẵng. Tôi là kỹ sư ở một công ty Nhật. Tôi có một con gái. Số điện thoại của tôi là 0935 881 246.',
    questions: [
      { q: 'Ken sống ở đâu?', options: ['Đà Nẵng', 'Nhật', 'Hà Nội'], answer: 0, hint: '"I live in Da Nang."' },
      { q: 'Ken làm nghề gì?', options: ['Kỹ sư', 'Giáo viên', 'Y tá'], answer: 0, hint: '"I’m an engineer."' },
      { q: 'Số điện thoại của Ken?', options: ['0935 881 246', '0935 818 246', '0953 881 246'], answer: 0, hint: '0-9-3-5, 8-8-1, 2-4-6.' },
    ],
  },

  write: {
    setup: 'Bạn đăng ký một khóa học buổi tối. Form có ô "Introduce yourself (3–4 sentences)".',
    prompt: 'Viết 3–4 câu về bạn: tên đầy đủ, quê/nơi sống, nghề hoặc học ở đâu, một câu về gia đình.',
    model: ['My name is Le Thu Ha. I’m from Nam Dinh, but I live in Hanoi.', 'I’m an accountant at a small company.', 'I have a son and a daughter.'],
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
    roleB: 'Trưởng nhóm — sau đó hỏi một câu: "Where do you work?" hoặc "How old is your …?"; hoặc nhờ nói lại (Can you say that again?).',
    prompt: 'Nói thành tiếng, không nhìn mẫu ở lần đầu. Bấm giờ thử xem có gần 30 giây không.',
    model: ['A: Hi everyone. My name is Quang. I’m from Hai Phong, but I live in Hanoi now. I’m a driver. I have a daughter. She’s 3. That’s all. Thank you.', 'B: Thanks, Quang. How old is your daughter? — A: She’s 3.'],
    checklist: [
      'Đủ 5 ý (tên, quê, nơi sống, nghề, gia đình).',
      'Có câu mở và câu kết.',
      'Trả lời được câu hỏi lại của trưởng nhóm.',
    ],
  },
};
