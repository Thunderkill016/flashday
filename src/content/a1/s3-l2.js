// Chặng 3 · Bài 2 — Hỏi và chỉ đường.
export default {
  id: 'a1-s3-l2',
  stage: 3,
  order: 2,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Xin lỗi, … ở đâu?',
  canDo: 'Hỏi đường đến một nơi gần, hiểu và đưa chỉ dẫn đơn giản (đi thẳng, rẽ trái/phải, ở cạnh/đối diện).',

  pattern: {
    name: 'Excuse me, where is …? / Go straight, turn left …',
    rule:
      'Hỏi: "Excuse me, where is the + nơi?" hoặc "Is there a + nơi + near here?". Chỉ đường bằng mệnh lệnh: "Go straight." "Turn left/right at the + mốc." "It’s on your left/right." "It’s opposite / next to the + mốc." Kết: "You can’t miss it." (dễ thấy lắm).',
    examples: [
      ['Excuse me, where is the bank?', 'Xin lỗi, ngân hàng ở đâu?'],
      ['Go straight and turn left at the church.', 'Đi thẳng rồi rẽ trái ở nhà thờ.'],
      ['It’s opposite the school.', 'Nó ở đối diện trường học.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'Excuse me, where is the …?', meaning: 'Xin lỗi, … ở đâu?', example: 'Excuse me, where is the post office?', exampleVi: 'Xin lỗi, bưu điện ở đâu?' },
    { id: 'c2', target: 'Is there a … near here?', meaning: 'Gần đây có … không?', example: 'Is there a pharmacy near here?', exampleVi: 'Gần đây có hiệu thuốc không?' },
    { id: 'c3', target: 'Go straight.', meaning: 'Đi thẳng.', example: 'Go straight for two minutes.', exampleVi: 'Đi thẳng khoảng hai phút.' },
    { id: 'c4', target: 'Turn left / right at the …', meaning: 'Rẽ trái / phải ở …', example: 'Turn right at the traffic lights.', exampleVi: 'Rẽ phải ở đèn giao thông.' },
    { id: 'c5', target: 'It’s on your left / right.', meaning: 'Nó ở bên trái / phải bạn.', example: 'It’s on your left, next to the bank.', exampleVi: 'Nó ở bên trái bạn, cạnh ngân hàng.' },
    { id: 'c6', target: 'opposite the …', meaning: 'đối diện …', example: 'The cafe is opposite the park.', exampleVi: 'Quán cà phê đối diện công viên.' },
    { id: 'c7', target: 'It’s about … minutes on foot.', meaning: 'Đi bộ khoảng … phút.', example: 'It’s about five minutes on foot.', exampleVi: 'Đi bộ khoảng năm phút.' },
    { id: 'c8', target: 'Thanks a lot!', meaning: 'Cảm ơn nhiều!', example: 'Thanks a lot! — You’re welcome.', exampleVi: 'Cảm ơn nhiều! — Không có gì.' },
  ],

  drills: [
    { q: 'Mở đầu khi hỏi đường người lạ:', options: ['Excuse me,', 'Hello, I’m Mai,', 'How are you,'], answer: 0, hint: 'Excuse me = xin lỗi (để hỏi).' },
    { q: '___ left at the bank.', options: ['Turn', 'Go', 'Take'], answer: 0, hint: 'turn left/right = rẽ.' },
    { q: 'The school is ___ the park. (đối diện)', options: ['opposite', 'next to', 'behind'], answer: 0, hint: 'opposite = đối diện.' },
    { q: 'Is there a bank ___ here?', options: ['near', 'next', 'at'], answer: 0, hint: 'near here = gần đây.' },
  ],

  dialogue: {
    title: 'Tìm bưu điện',
    lines: [
      ['Tourist: Excuse me, where is the post office?', 'Du khách: Xin lỗi, bưu điện ở đâu?'],
      ['Nam: The post office? Go straight on this street.', 'Nam: Bưu điện hả? Đi thẳng đường này.'],
      ['Nam: Then turn left at the bank. It’s next to a big supermarket.', 'Nam: Rồi rẽ trái ở ngân hàng. Nó ở cạnh một siêu thị lớn.'],
      ['Tourist: Is it far?', 'Du khách: Có xa không?'],
      ['Nam: No, about five minutes on foot.', 'Nam: Không, đi bộ khoảng năm phút.'],
      ['Tourist: Turn left at the bank, next to the supermarket. Thanks a lot!', 'Du khách: Rẽ trái ở ngân hàng, cạnh siêu thị. Cảm ơn nhiều!'],
      ['Nam: You’re welcome. You can’t miss it.', 'Nam: Không có gì. Dễ thấy lắm.'],
    ],
    questions: [
      { q: 'Rẽ trái ở đâu?', options: ['Ngân hàng', 'Siêu thị', 'Bưu điện'], answer: 0, hint: '"turn left at the bank".' },
      { q: 'Bưu điện ở cạnh gì?', options: ['Siêu thị lớn', 'Ngân hàng', 'Công viên'], answer: 0, hint: '"next to a big supermarket".' },
      { q: 'Đi bộ mất bao lâu?', options: ['5 phút', '15 phút', '50 phút'], answer: 0, hint: '"about five minutes on foot".' },
    ],
  },

  listening: {
    text: 'To get to the museum from the station, go straight for about ten minutes. Turn right at the church. The museum is on your left, opposite a small park. It opens at nine.',
    vi: 'Để đến bảo tàng từ nhà ga, đi thẳng khoảng mười phút. Rẽ phải ở nhà thờ. Bảo tàng ở bên trái bạn, đối diện một công viên nhỏ. Mở lúc chín giờ.',
    questions: [
      { q: 'Rẽ phải ở đâu?', options: ['Nhà thờ', 'Nhà ga', 'Công viên'], answer: 0, hint: '"Turn right at the church."' },
      { q: 'Bảo tàng đối diện gì?', options: ['Công viên nhỏ', 'Nhà thờ', 'Nhà ga'], answer: 0, hint: '"opposite a small park".' },
    ],
  },

  write: {
    setup: 'Một người bạn nước ngoài sắp đến nhà bạn lần đầu, từ trạm xe buýt gần nhất.',
    prompt: 'Viết 3 câu chỉ đường từ trạm xe buýt đến nhà bạn (có 2 chỉ dẫn và 1 mốc/vị trí).',
    model: ['From the bus stop, go straight for two minutes.', 'Turn left at the pharmacy.', 'My house is on your right, opposite a small cafe.'],
    checklist: [
      'Có ít nhất 2 mệnh lệnh chỉ đường (Go straight / Turn left…).',
      'Có mốc (at the + nơi) và vị trí cuối (on your left/right hoặc opposite/next to).',
      'Câu mệnh lệnh không có chủ ngữ "You".',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn đang ở gần chợ. Một du khách hỏi đường đến ngân hàng.',
    roleA: 'Du khách — hỏi đường, hỏi có xa không, nhắc lại chỉ dẫn để chắc.',
    roleB: 'Bạn — chỉ: đi thẳng, rẽ phải ở đèn giao thông, ngân hàng bên trái, cạnh hiệu thuốc, đi bộ 3 phút.',
    prompt: 'Nói thành tiếng cả hai vai. Du khách nhắc lại chỉ dẫn trước khi cảm ơn.',
    model: ['A: Excuse me, is there a bank near here? — B: Yes. Go straight and turn right at the traffic lights.', 'B: The bank is on your left, next to the pharmacy. About three minutes on foot.', 'A: Turn right at the lights, on the left. Thanks a lot!'],
    checklist: [
      'Có câu hỏi mở đầu bằng Excuse me.',
      'Chỉ dẫn có mốc và vị trí cuối.',
      'Du khách đã nhắc lại chỉ dẫn.',
    ],
  },
};
