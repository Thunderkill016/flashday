// Chặng 5 · Bài 3 — Ở chỗ làm: yêu cầu và xin phép lịch sự.
export default {
  id: 'a1-s5-l3',
  stage: 5,
  order: 3,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Nhờ việc và xin phép ở chỗ làm',
  canDo: 'Nhờ đồng nghiệp giúp một việc nhỏ, xin phép (nghỉ sớm, dùng phòng họp), đồng ý hoặc từ chối lịch sự.',

  pattern: {
    name: 'Could you …, please? / Can I …? / Sorry, I can’t because …',
    rule:
      'Nhờ việc: "Could you + động từ, please?" (lịch sự hơn "Can you"). Xin phép: "Can I + động từ?" / "Is it OK if I …?" Đồng ý: "Sure." / "Of course." / "No problem." Từ chối: "Sorry, I can’t. I’m busy right now." — luôn kèm lý do ngắn. Cảm ơn: "Thanks for your help."',
    examples: [
      ['Could you send me the file, please?', 'Bạn gửi tôi file được không?'],
      ['Can I leave early today? — Sure, no problem.', 'Hôm nay tôi về sớm được không? — Được, không sao.'],
      ['Sorry, I can’t help now. I have a meeting.', 'Xin lỗi, giờ tôi không giúp được. Tôi có họp.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'Could you …, please?', meaning: 'Bạn … giúp tôi được không?', example: 'Could you check this email, please?', exampleVi: 'Bạn xem email này giúp tôi được không?' },
    { id: 'c2', target: 'Can I …?', meaning: 'Tôi … được không? (xin phép)', example: 'Can I use the meeting room at two?', exampleVi: 'Tôi dùng phòng họp lúc hai giờ được không?' },
    { id: 'c3', target: 'Is it OK if I …?', meaning: 'Nếu tôi … có sao không?', example: 'Is it OK if I leave at four today?', exampleVi: 'Hôm nay tôi về lúc bốn giờ có sao không?' },
    { id: 'c4', target: 'Sure. / Of course. / No problem.', meaning: 'Được. / Dĩ nhiên. / Không sao.', example: 'Could you help me? — Sure, no problem.', exampleVi: 'Bạn giúp tôi được không? — Được, không sao.' },
    { id: 'c5', target: 'Sorry, I can’t. I …', meaning: 'Xin lỗi, tôi không thể. Tôi …', example: 'Sorry, I can’t. I have a call at three.', exampleVi: 'Xin lỗi, không được. Tôi có cuộc gọi lúc ba giờ.' },
    { id: 'c6', target: 'Maybe later?', meaning: 'Để lát nữa được không?', example: 'I’m busy now. Maybe later?', exampleVi: 'Giờ tôi bận. Để lát nữa nhé?' },
    { id: 'c7', target: 'Thanks for your help.', meaning: 'Cảm ơn bạn đã giúp.', example: 'Thanks for your help, Nam!', exampleVi: 'Cảm ơn bạn đã giúp, Nam!' },
    { id: 'c8', target: 'I need … by …', meaning: 'Tôi cần … trước …', example: 'I need the report by Friday.', exampleVi: 'Tôi cần báo cáo trước thứ Sáu.' },
  ],

  drills: [
    { q: 'Nhờ việc lịch sự nhất:', options: ['Could you print this, please?', 'Print this.', 'You print this now.'], answer: 0, hint: 'Could you … please?' },
    { q: 'Xin phép về sớm:', options: ['Can I leave early today?', 'Could you leave early?', 'I leave early.'], answer: 0, hint: 'Can I = tôi … được không.' },
    { q: 'Từ chối lịch sự:', options: ['Sorry, I can’t. I’m busy now.', 'No.', 'I don’t want.'], answer: 0, hint: 'Sorry + lý do.' },
    { q: 'Is it OK ___ I use your pen?', options: ['if', 'when', 'that'], answer: 0, hint: 'Is it OK if …?' },
  ],

  dialogue: {
    title: 'Trong văn phòng',
    lines: [
      ['Hoa: Nam, could you help me with the printer, please? It’s not working.', 'Hoa: Nam, bạn giúp tôi cái máy in được không? Nó không chạy.'],
      ['Nam: Sorry, I can’t right now. I have a call at ten. Maybe later?', 'Nam: Xin lỗi, giờ không được. Tôi có cuộc gọi lúc mười giờ. Lát nữa nhé?'],
      ['Hoa: Sure, no problem. Oh, and is it OK if I use the meeting room at two?', 'Hoa: Được, không sao. À, tôi dùng phòng họp lúc hai giờ có sao không?'],
      ['Nam: Of course. It’s free after one.', 'Nam: Dĩ nhiên. Sau một giờ là trống.'],
      ['Hoa: Great. Also, can I leave early today? My son is sick.', 'Hoa: Tốt. Với lại, hôm nay tôi về sớm được không? Con tôi ốm.'],
      ['Nam: Yes, of course. I hope he gets well soon.', 'Nam: Được, dĩ nhiên. Mong bé mau khỏe.'],
      ['Hoa: Thanks for your help, Nam.', 'Hoa: Cảm ơn bạn đã giúp, Nam.'],
    ],
    questions: [
      { q: 'Hoa nhờ Nam việc gì đầu tiên?', options: ['Sửa máy in', 'Gửi email', 'Đặt phòng họp'], answer: 0, hint: '"help me with the printer".' },
      { q: 'Vì sao Nam chưa giúp được?', options: ['Có cuộc gọi lúc 10 giờ', 'Đang ăn trưa', 'Không biết sửa'], answer: 0, hint: '"I have a call at ten."' },
      { q: 'Vì sao Hoa xin về sớm?', options: ['Con ốm', 'Có hẹn', 'Mệt'], answer: 0, hint: '"My son is sick."' },
    ],
  },

  listening: {
    text: 'Hi team, this is Mr. Lee. Could you all send me your weekly reports by Thursday, please? Also, can someone help Sara with the new computer this afternoon? And is it OK if we move Friday’s meeting to nine? Thanks for your help.',
    vi: 'Chào cả nhóm, ông Lee đây. Mọi người gửi báo cáo tuần cho tôi trước thứ Năm được không? Với lại, chiều nay ai giúp Sara cái máy tính mới được không? Và dời họp thứ Sáu sang chín giờ có sao không? Cảm ơn mọi người.',
    questions: [
      { q: 'Báo cáo cần gửi trước ngày nào?', options: ['Thứ Năm', 'Thứ Sáu', 'Thứ Hai'], answer: 0, hint: '"by Thursday".' },
      { q: 'Ông Lee muốn dời họp thứ Sáu sang mấy giờ?', options: ['9:00', '10:00', '2:00'], answer: 0, hint: '"move Friday’s meeting to nine".' },
    ],
  },

  write: {
    setup: 'Bạn nhắn cho đồng nghiệp trên chat công việc.',
    prompt: 'Viết 3 câu: nhờ một việc nhỏ (Could you …), nói bạn cần nó khi nào (by …), và cảm ơn.',
    model: ['Hi Minh, could you send me the photos from yesterday, please?', 'I need them by three today for the report.', 'Thanks for your help!'],
    checklist: [
      'Có Could you …, please?',
      'Có "by + thời gian".',
      'Có câu cảm ơn.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn ở chỗ làm: bạn cần nhờ đồng nghiệp và xin phép quản lý.',
    roleA: 'Bạn — nhờ đồng nghiệp một việc; bị từ chối một lần và đề nghị "Maybe later?"; rồi xin quản lý về sớm với lý do.',
    roleB: 'Đồng nghiệp + quản lý — đồng nghiệp: bận, có họp; quản lý: đồng ý.',
    prompt: 'Nói thành tiếng các vai. Mỗi lời từ chối có lý do; mỗi lời xin phép có lý do.',
    model: ['A: Could you check my email draft, please? — B: Sorry, I can’t now. I have a meeting. — A: No problem. Maybe later?', 'A: Can I leave at four today? I have a doctor’s appointment. — Manager: Sure, of course.', 'A: Thanks for your help.'],
    checklist: [
      'Có Could you … please? và Can I …?',
      'Từ chối và xin phép đều kèm lý do.',
      'Có Maybe later? hoặc Thanks for your help.',
    ],
  },
};
