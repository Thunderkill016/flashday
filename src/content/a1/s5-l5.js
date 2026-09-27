// Chặng 5 · Bài 5 — Checkpoint: gọi báo nghỉ và nhờ việc.
// Reuses 5.1–5.4: illness, can/can’t, polite requests, weather as small talk.
export default {
  id: 'a1-s5-l5',
  stage: 5,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 1,
  title: 'Checkpoint · Gọi báo nghỉ và nhờ việc',
  canDo: 'Gọi/nhắn cho chỗ làm để báo ốm, nói mình không làm được gì hôm nay, nhờ đồng nghiệp làm thay một việc, và hứa khi nào quay lại.',

  chunks: [
    { id: 'c1', target: 'I’m calling to say …', meaning: 'Tôi gọi để báo …', example: 'I’m calling to say I can’t come in today.', exampleVi: 'Tôi gọi để báo hôm nay không đến được.' },
    { id: 'c2', target: 'I can’t come in today.', meaning: 'Hôm nay tôi không đến làm được.', example: 'Sorry, I can’t come in today. I’m sick.', exampleVi: 'Xin lỗi, hôm nay tôi không đến được. Tôi ốm.' },
    { id: 'c3', target: 'Could you cover for me?', meaning: 'Bạn làm thay tôi được không?', example: 'Could you cover for me this afternoon?', exampleVi: 'Chiều nay bạn làm thay tôi được không?' },
    { id: 'c4', target: 'I’ll be back on …', meaning: 'Tôi sẽ quay lại vào …', example: 'I’ll be back on Wednesday.', exampleVi: 'Tôi sẽ quay lại thứ Tư.' },
    { id: 'c5', target: 'Take care of yourself.', meaning: 'Giữ gìn sức khỏe nhé.', example: 'Take care of yourself and rest.', exampleVi: 'Giữ gìn sức khỏe và nghỉ ngơi nhé.' },
    { id: 'c6', target: 'Let me know if you need anything.', meaning: 'Cần gì cứ nói tôi.', example: 'Let me know if you need anything from the office.', exampleVi: 'Cần gì ở văn phòng cứ nói tôi.' },
    { id: 'c7', target: 'I owe you one.', meaning: 'Tôi nợ bạn một lần.', example: 'Thanks so much. I owe you one!', exampleVi: 'Cảm ơn nhiều. Tôi nợ bạn một lần!' },
  ],

  drills: [
    { q: 'Báo không đến làm được:', options: ['I can’t come in today.', 'I don’t come in today.', 'I not come today.'], answer: 0, hint: 'can’t + động từ.' },
    { q: 'Nhờ làm thay:', options: ['Could you cover for me?', 'Could you cover me for?', 'Can you covering me?'], answer: 0, hint: 'cover for + người = làm thay.' },
    { q: 'I’ll be back ___ Monday.', options: ['on', 'at', 'in'], answer: 0, hint: 'on + ngày.' },
    { q: 'Đồng nghiệp ốm, bạn nói:', options: ['Take care of yourself.', 'Take an umbrella.', 'Take one tablet.'], answer: 0, hint: 'take care = giữ gìn.' },
  ],

  dialogue: {
    title: 'Gọi cho quản lý buổi sáng',
    lines: [
      ['Manager: Hello, this is Mrs. Tran.', 'Quản lý: Alô, bà Trần nghe.'],
      ['Vy: Good morning, Mrs. Tran. It’s Vy. I’m calling to say I can’t come in today.', 'Vy: Chào bà Trần. Vy đây. Tôi gọi để báo hôm nay không đến được.'],
      ['Manager: Oh, what’s wrong?', 'Quản lý: Ồ, bạn bị gì?'],
      ['Vy: I have a fever and a bad cough. I can’t talk much. The doctor says I should rest for two days.', 'Vy: Tôi bị sốt và ho nặng. Không nói được nhiều. Bác sĩ nói nên nghỉ hai ngày.'],
      ['Manager: I see. Take care of yourself. Can Minh cover for you?', 'Quản lý: Hiểu rồi. Giữ sức khỏe nhé. Minh làm thay bạn được không?'],
      ['Vy: Yes, I already asked him. He can take my shift. I’ll be back on Thursday.', 'Vy: Được, tôi hỏi anh ấy rồi. Anh ấy làm ca tôi được. Tôi sẽ quay lại thứ Năm.'],
      ['Manager: Good. Let me know if you need anything.', 'Quản lý: Tốt. Cần gì cứ nói.'],
      ['Vy: Thank you, Mrs. Tran.', 'Vy: Cảm ơn bà Trần.'],
    ],
    questions: [
      { q: 'Vy bị gì?', options: ['Sốt và ho nặng', 'Đau lưng', 'Đau bụng'], answer: 0, hint: '"a fever and a bad cough".' },
      { q: 'Bác sĩ khuyên gì?', options: ['Nghỉ 2 ngày', 'Đi làm bình thường', 'Uống cà phê'], answer: 0, hint: '"rest for two days".' },
      { q: 'Ai làm thay Vy?', options: ['Minh', 'Bà Trần', 'Không ai'], answer: 0, hint: '"He can take my shift."' },
      { q: 'Vy quay lại khi nào?', options: ['Thứ Năm', 'Thứ Ba', 'Tuần sau'], answer: 0, hint: '"I’ll be back on Thursday."' },
    ],
  },

  listening: {
    text: 'Hi Nam, it’s Chi. I’m not coming in today — my back hurts a lot and I can’t sit for long. Could you send the report to Mr. Lee by three, please? The file is on the shared drive. Also, it’s raining hard, so take an umbrella. I’ll be back tomorrow. I owe you one!',
    vi: 'Chào Nam, Chi đây. Hôm nay mình không đến — lưng đau nhiều, không ngồi lâu được. Bạn gửi báo cáo cho ông Lee trước ba giờ được không? File ở ổ chung. Với lại mưa to, mang ô nhé. Mai mình quay lại. Mình nợ bạn một lần!',
    questions: [
      { q: 'Chi bị gì?', options: ['Đau lưng', 'Sốt', 'Đau họng'], answer: 0, hint: '"my back hurts a lot".' },
      { q: 'Chi nhờ Nam làm gì?', options: ['Gửi báo cáo trước 3 giờ', 'Đi mua thuốc', 'Họp thay'], answer: 0, hint: '"send the report to Mr. Lee by three".' },
      { q: 'Khi nào Chi quay lại?', options: ['Ngày mai', 'Thứ Năm', 'Tuần sau'], answer: 0, hint: '"I’ll be back tomorrow."' },
    ],
  },

  write: {
    setup: 'Bạn bị ốm. Bạn nhắn cho đồng nghiệp trên chat công việc.',
    prompt: 'Viết 4 câu: báo không đến được + lý do, một việc bạn không làm được hôm nay, nhờ họ làm thay (Could you …), và hẹn ngày quay lại + cảm ơn.',
    model: ['Hi Lan, I can’t come in today — I have a fever and my head hurts.', 'I can’t join the 2 p.m. meeting. Could you take notes for me, please?', 'I’ll be back on Thursday. Thanks a lot — I owe you one!'],
    checklist: [
      'Có I can’t come in + lý do (I have a … / My … hurts).',
      'Có Could you …, please? nhờ việc cụ thể.',
      'Có I’ll be back on … và cảm ơn.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gọi cho quản lý báo ốm, rồi gọi đồng nghiệp nhờ làm thay.',
    roleA: 'Bạn — báo ốm với quản lý (triệu chứng, lời bác sĩ, ngày quay lại); gọi đồng nghiệp nhờ cover, giải thích việc cần làm.',
    roleB: 'Quản lý + đồng nghiệp — quản lý: hỏi What’s wrong?, dặn take care; đồng nghiệp: đồng ý, hỏi việc gì.',
    prompt: 'Nói thành tiếng các vai, không nhìn mẫu lần đầu. Đi hết hai cuộc gọi.',
    model: ['A: I’m calling to say I can’t come in today. I have a bad cold and a fever. — Manager: What did the doctor say? — A: I should rest for two days. I’ll be back on Friday. — Manager: OK, take care of yourself.', 'A: Hi Minh, could you cover for me this afternoon? — Minh: Sure. What do I need to do? — A: Just answer the phone and send the daily report by five.', 'A: Thanks so much. I owe you one!'],
    checklist: [
      'Cuộc gọi 1: triệu chứng + lời khuyên + ngày quay lại.',
      'Cuộc gọi 2: Could you cover for me? + việc cụ thể.',
      'Có câu cảm ơn/kết (I owe you one / Take care).',
    ],
  },
};
