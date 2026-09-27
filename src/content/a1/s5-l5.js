// Chặng 5 · Bài 5 — Checkpoint: gọi báo nghỉ và nhờ việc.
// Reuses 5.1–5.4: illness, can/can’t, polite requests, weather as small talk.
// cover/shift/owe/will are gone — requests run on Could you …, please? and
// the return plan on can (I can come back on …), both taught earlier.
export default {
  id: 'a1-s5-l5',
  stage: 5,
  order: 5,
  kind: 'checkpoint',
  contentVersion: 2,
  title: 'Checkpoint · Gọi báo nghỉ và nhờ việc',
  canDo: 'Gọi/nhắn cho chỗ làm để báo ốm, nói mình không làm được gì hôm nay, nhờ đồng nghiệp một việc cụ thể, và nói ngày quay lại được.',

  chunks: [
    { id: 'c1', target: 'I’m calling to say …', meaning: 'Tôi gọi để báo …', example: 'I’m calling to say I can’t come in today.', exampleVi: 'Tôi gọi để báo hôm nay không đến được.' },
    { id: 'c2', target: 'I can’t come in today.', meaning: 'Hôm nay tôi không đến làm được.', example: 'Sorry, I can’t come in today. I’m sick.', exampleVi: 'Xin lỗi, hôm nay tôi không đến được. Tôi ốm.' },
    { id: 'c3', target: 'Could you …, please?', meaning: 'Bạn … giúp tôi được không?', example: 'Could you send the report for me, please?', exampleVi: 'Bạn gửi báo cáo giúp tôi được không?' },
    { id: 'c4', target: 'I can come back on …', meaning: 'Tôi có thể quay lại vào …', example: 'I can come back on Thursday.', exampleVi: 'Tôi có thể quay lại thứ Năm.' },
    { id: 'c5', target: 'You should …', meaning: 'Bạn nên …', example: 'You should rest and drink water.', exampleVi: 'Bạn nên nghỉ và uống nước.' },
    { id: 'c6', target: 'Take care of yourself.', meaning: 'Giữ gìn sức khỏe nhé.', example: 'Take care of yourself and rest.', exampleVi: 'Giữ gìn sức khỏe và nghỉ ngơi nhé.' },
    { id: 'c7', target: 'Thanks for your help.', meaning: 'Cảm ơn bạn đã giúp.', example: 'Thanks for your help, Minh!', exampleVi: 'Cảm ơn bạn đã giúp, Minh!' },
  ],

  drills: [
    { q: 'Báo không đến làm được:', options: ['I can’t come in today.', 'I don’t come in today.', 'I not come today.'], answer: 0, hint: 'can’t + động từ.' },
    { q: 'Nhờ đồng nghiệp gửi báo cáo:', options: ['Could you send the report, please?', 'Could you to send the report?', 'Send report could you?'], answer: 0, hint: 'Could you + động từ, please?' },
    { q: '"I can come back ___ Thursday."', options: ['on', 'at', 'in'], answer: 0, hint: 'on + ngày.' },
    { q: 'Đồng nghiệp ốm, bạn nói:', options: ['Take care of yourself.', 'Take an umbrella.', 'Take one tablet.'], answer: 0, hint: 'take care = giữ gìn.' },
  ],

  dialogue: {
    title: 'Gọi cho quản lý buổi sáng',
    lines: [
      ['Manager: Hello, this is Mrs. Tran.', 'Quản lý: Alô, bà Trần nghe.'],
      ['Vy: Good morning, Mrs. Tran. It’s Vy. I’m calling to say I can’t come in today.', 'Vy: Chào bà Trần. Vy đây. Tôi gọi để báo hôm nay không đến được.'],
      ['Manager: Oh, what’s wrong?', 'Quản lý: Ồ, bạn bị gì?'],
      ['Vy: I have a fever and a bad cough. I can’t talk much. The doctor says I should rest for two days.', 'Vy: Tôi bị sốt và ho nặng. Không nói được nhiều. Bác sĩ nói nên nghỉ hai ngày.'],
      ['Manager: I see. Take care of yourself. Can Minh help with your work today?', 'Quản lý: Hiểu rồi. Giữ sức khỏe nhé. Minh có giúp việc của bạn hôm nay được không?'],
      ['Vy: Yes, Minh can help. I can come back on Thursday.', 'Vy: Được, Minh giúp được. Tôi có thể quay lại thứ Năm.'],
      ['Manager: Good. Get well soon, Vy!', 'Quản lý: Tốt. Mau khỏe nhé, Vy!'],
      ['Vy: Thank you, Mrs. Tran.', 'Vy: Cảm ơn bà Trần.'],
    ],
    questions: [
      { q: 'Vy bị gì?', options: ['Sốt và ho nặng', 'Đau lưng', 'Đau bụng'], answer: 0, hint: '"a fever and a bad cough".' },
      { q: 'Bác sĩ khuyên gì?', options: ['Nghỉ 2 ngày', 'Đi làm bình thường', 'Uống cà phê'], answer: 0, hint: '"rest for two days".' },
      { q: 'Ai giúp việc của Vy hôm nay?', options: ['Minh', 'Bà Trần', 'Không ai'], answer: 0, hint: '"Minh can help."' },
      { q: 'Vy quay lại khi nào?', options: ['Thứ Năm', 'Thứ Ba', 'Tuần sau'], answer: 0, hint: '"I can come back on Thursday."' },
    ],
  },

  listening: {
    text: 'Hi Nam, it’s Chi. I’m not coming in today — my back hurts a lot and I can’t sit for long. Could you send the report to Mr. Lee by three, please? The file is in my email. Also, it’s raining hard, so take an umbrella. I can come back tomorrow. Thanks for your help!',
    vi: 'Chào Nam, Chi đây. Hôm nay mình không đến — lưng đau nhiều, không ngồi lâu được. Bạn gửi báo cáo cho ông Lee trước ba giờ được không? File trong email của mình. Với lại mưa to, mang ô nhé. Mai mình quay lại được. Cảm ơn bạn đã giúp!',
    questions: [
      { q: 'Chi bị gì?', options: ['Đau lưng', 'Sốt', 'Đau họng'], answer: 0, hint: '"my back hurts a lot".' },
      { q: 'Chi nhờ Nam làm gì?', options: ['Gửi báo cáo trước 3 giờ', 'Đi mua thuốc', 'Họp thay'], answer: 0, hint: '"send the report to Mr. Lee by three".' },
      { q: 'Khi nào Chi quay lại?', options: ['Ngày mai', 'Thứ Năm', 'Tuần sau'], answer: 0, hint: '"I can come back tomorrow."' },
    ],
  },

  write: {
    setup: 'Bạn bị ốm. Bạn nhắn cho đồng nghiệp trên chat công việc.',
    prompt: 'Viết 4 câu: báo không đến được + lý do, một việc bạn không làm được hôm nay, nhờ họ một việc (Could you …), và hẹn ngày quay lại + cảm ơn.',
    model: ['Hi Lan, I can’t come in today — I have a fever and my head hurts.', 'I can’t join the 2 p.m. meeting. Could you take notes for me, please?', 'I can come back on Thursday. Thanks for your help!'],
    checklist: [
      'Có I can’t come in + lý do (I have a … / My … hurts).',
      'Có Could you …, please? nhờ việc cụ thể.',
      'Có I can come back on … và cảm ơn.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gọi cho quản lý báo ốm, rồi gọi đồng nghiệp nhờ việc.',
    roleA: 'Bạn — báo ốm với quản lý (triệu chứng, lời bác sĩ, ngày quay lại); gọi đồng nghiệp nhờ một việc cụ thể hôm nay, giải thích việc cần làm.',
    roleB: 'Quản lý + đồng nghiệp — quản lý: hỏi What’s wrong?, dặn take care; đồng nghiệp: đồng ý, hỏi việc gì.',
    prompt: 'Nói thành tiếng các vai, không nhìn mẫu lần đầu. Đi hết hai cuộc gọi.',
    model: ['A: I’m calling to say I can’t come in today. I have a bad cold and a fever. — Manager: What does the doctor say? — A: I should rest for two days. I can come back on Friday. — Manager: OK, take care of yourself.', 'A: Hi Minh, could you send the daily report to Mr. Lee by five today, please? — Minh: Sure, no problem. — A: Thanks for your help!', 'A: See you on Friday, Minh!'],
    checklist: [
      'Cuộc gọi 1: triệu chứng + lời khuyên + ngày quay lại (I can come back on …).',
      'Cuộc gọi 2: Could you …, please? + việc cụ thể + by + giờ.',
      'Có câu cảm ơn/kết (Thanks for your help / Take care).',
    ],
  },
};
