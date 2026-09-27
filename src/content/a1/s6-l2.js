// Chặng 6 · Bài 2 — Tin nhắn ngắn: mời, nhận lời, từ chối.
export default {
  id: 'a1-s6-l2',
  stage: 6,
  order: 2,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Nhắn tin mời và trả lời',
  canDo: 'Viết tin nhắn ngắn để mời ai đó, nhận lời hoặc từ chối lịch sự kèm lý do, và đề nghị dịp khác.',

  pattern: {
    name: 'Would you like to …? / I’d love to. / Sorry, I can’t. Maybe …?',
    rule:
      'Mời lịch sự: "Would you like to + động từ?" hoặc "Do you want to …?" (thân mật). Nhận: "I’d love to." / "Sure, sounds great." Từ chối: "Sorry, I can’t. I + lý do." rồi đề nghị: "Maybe next week?" / "How about Sunday instead?" Tin nhắn ngắn: bỏ chủ ngữ được ("Can’t tonight, sorry!").',
    examples: [
      ['Would you like to have dinner on Friday?', 'Bạn có muốn ăn tối thứ Sáu không?'],
      ['I’d love to. What time?', 'Tôi rất muốn. Mấy giờ?'],
      ['Sorry, I can’t on Friday. I have class. Maybe Saturday?', 'Xin lỗi, thứ Sáu không được. Tôi có lớp. Thứ Bảy nhé?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'Would you like to …?', meaning: 'Bạn có muốn … không?', example: 'Would you like to come to my birthday party?', exampleVi: 'Bạn có muốn đến tiệc sinh nhật tôi không?' },
    { id: 'c2', target: 'Are you free …?', meaning: 'Bạn rảnh … không?', example: 'Are you free on Saturday night?', exampleVi: 'Tối thứ Bảy bạn rảnh không?' },
    { id: 'c3', target: 'Sounds great!', meaning: 'Nghe hay đó!', example: 'A picnic? Sounds great!', exampleVi: 'Picnic hả? Nghe hay đó!' },
    { id: 'c4', target: 'Sorry, I can’t. I have …', meaning: 'Xin lỗi, không được. Tôi có …', example: 'Sorry, I can’t. I have work that day.', exampleVi: 'Xin lỗi, không được. Ngày đó tôi có việc.' },
    { id: 'c5', target: 'Maybe another time?', meaning: 'Để dịp khác nhé?', example: 'I’m busy this week. Maybe another time?', exampleVi: 'Tuần này tôi bận. Để dịp khác nhé?' },
    { id: 'c6', target: 'Thanks for the invitation.', meaning: 'Cảm ơn đã mời.', example: 'Thanks for the invitation, but I can’t.', exampleVi: 'Cảm ơn đã mời, nhưng tôi không đi được.' },
    { id: 'c7', target: 'See you there!', meaning: 'Gặp ở đó nhé!', example: 'Seven at the cafe. See you there!', exampleVi: 'Bảy giờ ở quán. Gặp ở đó nhé!' },
    { id: 'c8', target: 'Let me check and get back to you.', meaning: 'Để tôi xem rồi báo lại.', example: 'Let me check and get back to you tonight.', exampleVi: 'Để tôi xem rồi tối báo lại.' },
  ],

  drills: [
    { q: 'Mời lịch sự:', options: ['Would you like to come?', 'Do you like to come?', 'Would you come like?'], answer: 0, hint: 'Would you like to + động từ?' },
    { q: 'Nhận lời:', options: ['I’d love to.', 'I love it.', 'I would like.'], answer: 0, hint: 'I’d love to = rất muốn (đi).' },
    { q: 'Từ chối lịch sự đủ ý:', options: ['Sorry, I can’t. I have class. Maybe Sunday?', 'No.', 'I can’t.'], answer: 0, hint: 'Sorry + lý do + đề nghị khác.' },
    { q: 'Thanks ___ the invitation.', options: ['for', 'to', 'at'], answer: 0, hint: 'thanks for + danh từ.' },
  ],

  dialogue: {
    title: 'Nhóm chat mời sinh nhật',
    lines: [
      ['Mai: Hi all! It’s my birthday on Saturday. Would you like to come to dinner at my place? 7 p.m.', 'Mai: Chào mọi người! Thứ Bảy là sinh nhật mình. Mọi người có muốn đến ăn tối ở nhà mình không? 7 giờ tối.'],
      ['Tom: I’d love to! What can I bring?', 'Tom: Mình rất muốn! Mang gì được?'],
      ['Mai: Just yourself! Maybe a drink.', 'Mai: Đến là được! Có thể mang đồ uống.'],
      ['Anna: Sorry, I can’t on Saturday. I have work until 9. Thanks for the invitation, though!', 'Anna: Xin lỗi, thứ Bảy mình không được. Mình làm đến 9 giờ. Nhưng cảm ơn đã mời!'],
      ['Mai: No problem, Anna. Maybe coffee on Sunday instead?', 'Mai: Không sao, Anna. Chủ nhật đi cà phê thay vào đó nhé?'],
      ['Anna: Sounds great! Let me check and get back to you tonight.', 'Anna: Nghe hay đó! Để mình xem rồi tối báo lại.'],
      ['Tom: See you Saturday, Mai!', 'Tom: Gặp thứ Bảy nhé, Mai!'],
    ],
    questions: [
      { q: 'Mai mời gì?', options: ['Ăn tối sinh nhật thứ Bảy 7 giờ', 'Cà phê thứ Sáu', 'Picnic Chủ nhật'], answer: 0, hint: '"dinner at my place? 7 p.m."' },
      { q: 'Vì sao Anna không đến được?', options: ['Làm việc đến 9 giờ', 'Đi xa', 'Bị ốm'], answer: 0, hint: '"I have work until 9."' },
      { q: 'Mai đề nghị gì với Anna?', options: ['Cà phê Chủ nhật', 'Ăn tối Chủ nhật', 'Hoãn tiệc'], answer: 0, hint: '"Maybe coffee on Sunday instead?"' },
    ],
  },

  listening: {
    text: 'Hi Duc, it’s Emma. Would you like to go to the cinema on Friday night? There’s a new film at eight. If you can’t, maybe Sunday afternoon? Let me know. Bye!',
    vi: 'Chào Đức, Emma đây. Tối thứ Sáu bạn có muốn đi xem phim không? Có phim mới lúc tám giờ. Nếu không được thì chiều Chủ nhật nhé? Báo mình biết. Chào!',
    questions: [
      { q: 'Emma mời đi đâu?', options: ['Xem phim tối thứ Sáu', 'Ăn tối thứ Bảy', 'Đi biển'], answer: 0, hint: '"go to the cinema on Friday night".' },
      { q: 'Dịp thay thế là gì?', options: ['Chiều Chủ nhật', 'Tối thứ Bảy', 'Sáng thứ Sáu'], answer: 0, hint: '"maybe Sunday afternoon?"' },
    ],
  },

  write: {
    setup: 'Một người bạn nhắn: "Would you like to have lunch on Wednesday at 12?" — nhưng thứ Tư bạn bận.',
    prompt: 'Viết 3 câu trả lời: cảm ơn, từ chối lịch sự kèm lý do, và đề nghị một dịp khác cụ thể (ngày + giờ).',
    model: ['Thanks for the invitation!', 'Sorry, I can’t on Wednesday — I have a meeting at 12.', 'How about Thursday at 12:30 instead?'],
    checklist: [
      'Có câu cảm ơn.',
      'Có Sorry, I can’t + lý do.',
      'Có đề nghị dịp khác với ngày + giờ.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gọi mời một người bạn đi ăn tối cuối tuần.',
    roleA: 'Bạn — mời (Would you like to …?), bị từ chối một lần, đề nghị dịp khác, chốt.',
    roleB: 'Bạn của bạn — thứ Bảy bận (có việc gia đình), Chủ nhật rảnh; nhận lời dịp hai.',
    prompt: 'Nói thành tiếng cả hai vai. Có cả nhận lời và từ chối kèm lý do.',
    model: ['A: Would you like to have dinner on Saturday? — B: Sorry, I can’t. I have a family dinner. Thanks for asking!', 'A: No problem. How about Sunday at seven instead? — B: Sounds great! I’d love to.', 'A: See you there!'],
    checklist: [
      'Có Would you like to …?',
      'Có từ chối + lý do và một đề nghị khác.',
      'Có nhận lời (I’d love to / Sounds great).',
    ],
  },
};
