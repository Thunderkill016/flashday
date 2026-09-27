// Chặng 6 · Bài 4 — Hỏi lại, xin nhắc lại, kết thúc hội thoại.
export default {
  id: 'a1-s6-l4',
  stage: 6,
  order: 4,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Xin lỗi, bạn nói gì?',
  canDo: 'Khi không nghe kịp/không hiểu: hỏi lại, nhờ nói chậm lại, nhờ đánh vần hoặc giải thích, xác nhận mình đã hiểu; và kết thúc cuộc trò chuyện lịch sự.',

  pattern: {
    name: 'Sorry, what did you say? / Could you speak slowly? / What does … mean?',
    rule:
      'Không nghe kịp: "Sorry?" (ngắn) / "What did you say?" / "Could you say that again, please?" Không hiểu từ: "What does + từ + mean?" Nhờ chậm lại: "Could you speak more slowly, please?" Nhờ viết: "Could you write it down?" Xác nhận: "So, the meeting is at nine, right?" Kết: "It was nice talking to you. See you!"',
    examples: [
      ['Sorry, what did you say?', 'Xin lỗi, bạn vừa nói gì?'],
      ['Could you speak more slowly, please?', 'Bạn nói chậm hơn được không?'],
      ['What does “reservation” mean?', '"Reservation" nghĩa là gì?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'Sorry?', meaning: 'Xin lỗi? (bạn nói gì)', example: 'Sorry? I didn’t hear you.', exampleVi: 'Xin lỗi? Tôi không nghe rõ.' },
    { id: 'c2', target: 'Could you say that again, please?', meaning: 'Bạn nhắc lại được không?', example: 'Could you say that again, please?', exampleVi: 'Bạn nhắc lại được không?' },
    { id: 'c3', target: 'Could you speak more slowly, please?', meaning: 'Bạn nói chậm hơn được không?', example: 'Sorry, could you speak more slowly, please?', exampleVi: 'Xin lỗi, bạn nói chậm hơn được không?' },
    { id: 'c4', target: 'What does … mean?', meaning: '… nghĩa là gì?', example: 'What does “busy” mean?', exampleVi: '"Busy" nghĩa là gì?' },
    { id: 'c5', target: 'Could you write it down?', meaning: 'Bạn viết ra được không?', example: 'Could you write it down, please?', exampleVi: 'Bạn viết ra giúp tôi được không?' },
    { id: 'c6', target: 'I see. / Got it.', meaning: 'Tôi hiểu rồi. / Rõ.', example: 'Oh, I see. Got it, thanks!', exampleVi: 'À, tôi hiểu. Rõ rồi, cảm ơn!' },
    { id: 'c7', target: 'So, …, right?', meaning: 'Vậy …, đúng không?', example: 'So, the class is at six, right?', exampleVi: 'Vậy lớp lúc sáu giờ, đúng không?' },
    { id: 'c8', target: 'It was nice talking to you.', meaning: 'Vui được nói chuyện với bạn.', example: 'I have to go. It was nice talking to you!', exampleVi: 'Tôi phải đi. Vui được nói chuyện với bạn!' },
  ],

  drills: [
    { q: 'Bạn không nghe rõ. Nói:', options: ['Sorry? Could you say that again?', 'I’m fine, thanks.', 'Good night.'], answer: 0, hint: 'Xin nhắc lại.' },
    { q: 'What ___ “borrow” mean?', options: ['does', 'is', 'do'], answer: 0, hint: 'What does + từ + mean?' },
    { q: 'Could you speak more ___, please?', options: ['slowly', 'slow', 'slower is'], answer: 0, hint: 'speak + slowly (trạng từ).' },
    { q: 'Xác nhận lại thông tin:', options: ['So, the bus is at eight, right?', 'What does bus mean?', 'Nice talking to you.'], answer: 0, hint: 'So, …, right? = … đúng không?' },
    { q: 'Kết thúc cuộc trò chuyện lịch sự:', options: ['It was nice talking to you. See you!', 'I’m tired now.', 'Bye.'], answer: 0, hint: 'Có lời kết + lời tạm biệt.' },
  ],

  dialogue: {
    title: 'Nghe không kịp ở quầy vé',
    lines: [
      ['Clerk: The platform is four, it leaves at four forty-five.', 'Nhân viên: Sân ga số bốn, xe chạy lúc 4:45.'],
      ['Lan: Sorry, what did you say? Could you speak more slowly, please?', 'Lan: Xin lỗi, bạn nói gì? Bạn nói chậm hơn được không?'],
      ['Clerk: Sure. Platform four. Four forty-five.', 'Nhân viên: Được. Sân ga bốn. 4:45.'],
      ['Lan: So, platform four, at four forty-five, right?', 'Lan: Vậy sân ga bốn, lúc 4:45, đúng không?'],
      ['Clerk: That’s right.', 'Nhân viên: Đúng rồi.'],
      ['Lan: And… what does “platform” mean?', 'Lan: Và… “platform” nghĩa là gì?'],
      ['Clerk: It’s where the train stops. Over there.', 'Nhân viên: Là nơi tàu dừng. Ở đằng kia.'],
      ['Lan: Oh, I see. Got it! Thanks a lot. Have a nice day!', 'Lan: À, hiểu rồi. Cảm ơn nhiều. Chúc ngày tốt!'],
    ],
    questions: [
      { q: 'Xe chạy lúc mấy giờ?', options: ['4:45', '4:15', '4:50'], answer: 0, hint: '"four forty-five".' },
      { q: 'Lan nhờ nhân viên làm gì?', options: ['Nói chậm hơn', 'Đi cùng', 'Gọi điện'], answer: 0, hint: '"speak more slowly".' },
      { q: '"Platform" nghĩa là gì?', options: ['Nơi tàu dừng', 'Quầy vé', 'Toa tàu'], answer: 0, hint: '"where the train stops".' },
    ],
  },

  listening: {
    text: 'Here is your key. Breakfast is on the second floor, from six thirty to ten. The password for the wifi is OCEAN2026. — Sorry, could you say the password again, please? — Sure. O-C-E-A-N, two, zero, two, six. — Got it, thanks!',
    vi: 'Đây là chìa phòng của bạn. Ăn sáng ở tầng hai, từ 6:30 đến 10 giờ. Mật khẩu wifi là OCEAN2026. — Xin lỗi, bạn nói lại mật khẩu được không? — Được. O-C-E-A-N, hai, không, hai, sáu. — Rõ, cảm ơn!',
    questions: [
      { q: 'Ăn sáng ở đâu, từ mấy giờ?', options: ['Tầng 2, từ 6:30', 'Tầng 1, từ 7:00', 'Tầng 2, từ 10:00'], answer: 0, hint: '"on the second floor, from six thirty".' },
      { q: 'Khách nhờ nhân viên làm gì?', options: ['Nói lại mật khẩu', 'Viết ra giấy', 'Nói chậm hơn'], answer: 0, hint: '"could you say the password again".' },
    ],
  },

  write: {
    setup: 'Trong lớp học, bạn không hiểu một từ giáo viên vừa nói và chưa chắc giờ bài tập.',
    prompt: 'Viết 3 câu bạn sẽ nói/hỏi: nhờ nhắc lại, hỏi nghĩa một từ, và xác nhận giờ nộp bài.',
    model: ['Sorry, could you say that again, please?', 'What does “homework” mean?', 'So, the homework is for Monday, right?'],
    checklist: [
      'Có Could you say that again / speak more slowly.',
      'Có What does “…” mean?',
      'Có So, …, right? để xác nhận.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn mua vé tàu nhưng nghe không kịp thông tin.',
    roleA: 'Bạn — nhờ nhắc lại, nhờ nói chậm, hỏi nghĩa một từ, xác nhận lại, kết thúc lịch sự.',
    roleB: 'Nhân viên — nói nhanh lần đầu: cửa 3, xe 10:15, giá 150.000, từ "departure".',
    prompt: 'Nói thành tiếng cả hai vai. Bạn phải dùng ít nhất 3 cụm "cứu hộ" khác nhau.',
    model: ['A: Sorry, what did you say? Could you speak more slowly, please? — B: Gate three, ten fifteen, one hundred and fifty thousand.', 'A: What does “departure” mean? — B: It’s when the train leaves. — A: I see. So, gate three at ten fifteen, right?', 'A: Got it. Thanks a lot. Have a nice day!'],
    checklist: [
      'Có nhờ nhắc lại + nhờ nói chậm.',
      'Có hỏi nghĩa từ + xác nhận "So, …, right?".',
      'Có câu kết lịch sự.',
    ],
  },
};
