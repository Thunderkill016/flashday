// Chặng 4 · Bài 1 — Gọi món và hỏi giá.
export default {
  id: 'a1-s4-l1',
  stage: 4,
  order: 1,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Gọi món ở quán',
  canDo: 'Gọi đồ ăn/uống ở quán, hỏi giá, xin thêm/đổi một thứ đơn giản, và xin tính tiền.',

  pattern: {
    name: 'I’d like … / Can I have …, please? / How much is …?',
    rule:
      'Gọi món lịch sự: "I’d like + món" (I would like) hoặc "Can I have + món, please?". Hỏi giá: "How much is the + món?" (số ít) / "How much are the + món?" (số nhiều). Xin tính tiền: "Can I have the bill, please?" Hỏi có món không: "Do you have …?"',
    examples: [
      ['I’d like a coffee and a sandwich, please.', 'Cho tôi một cà phê và một sandwich.'],
      ['How much is the soup?', 'Súp bao nhiêu tiền?'],
      ['Can I have the bill, please?', 'Cho tôi tính tiền được không?'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'A table for two, please.', meaning: 'Cho bàn hai người.', example: 'Good evening. A table for two, please.', exampleVi: 'Chào buổi tối. Cho bàn hai người.' },
    { id: 'c2', target: 'I’d like …, please.', meaning: 'Cho tôi …', example: 'I’d like a bowl of pho, please.', exampleVi: 'Cho tôi một tô phở.' },
    { id: 'c3', target: 'Can I have …?', meaning: 'Cho tôi … được không?', example: 'Can I have some water?', exampleVi: 'Cho tôi chút nước được không?' },
    { id: 'c4', target: 'Do you have …?', meaning: 'Quán có … không?', example: 'Do you have iced tea?', exampleVi: 'Quán có trà đá không?' },
    { id: 'c5', target: 'How much is / are …?', meaning: '… bao nhiêu tiền?', example: 'How much is the chicken rice?', exampleVi: 'Cơm gà bao nhiêu tiền?' },
    { id: 'c6', target: 'Anything else?', meaning: 'Còn gì nữa không?', example: 'Anything else? — No, that’s all, thanks.', exampleVi: 'Còn gì nữa không? — Không, đủ rồi, cảm ơn.' },
    { id: 'c7', target: 'Can I have the bill, please?', meaning: 'Cho tôi tính tiền.', example: 'Excuse me, can I have the bill, please?', exampleVi: 'Xin lỗi, cho tôi tính tiền.' },
    { id: 'c8', target: 'No sugar, please.', meaning: 'Không đường nhé.', example: 'A black coffee, no sugar, please.', exampleVi: 'Một cà phê đen, không đường.' },
  ],

  drills: [
    { q: 'Gọi món lịch sự:', options: ['I’d like a coffee, please.', 'Give me coffee.', 'I want coffee now.'], answer: 0, hint: 'I’d like … please = lịch sự.' },
    { q: 'How much ___ the noodles?', options: ['are', 'is', 'do'], answer: 0, hint: 'noodles (số nhiều) → are.' },
    { q: 'Nhân viên hỏi "Anything else?" và bạn không cần gì thêm:', options: ['No, that’s all, thanks.', 'Yes, I’m fine.', 'How much is it?'], answer: 0, hint: 'that’s all = đủ rồi.' },
    { q: 'Xin tính tiền:', options: ['Can I have the bill, please?', 'Can I have the menu?', 'Can I have a table?'], answer: 0, hint: 'bill = hóa đơn.' },
  ],

  dialogue: {
    title: 'Ở quán cà phê',
    lines: [
      ['Waiter: Hello! What would you like?', 'Nhân viên: Chào! Bạn muốn dùng gì?'],
      ['Nga: I’d like an iced coffee, please. No sugar.', 'Nga: Cho tôi một cà phê đá. Không đường.'],
      ['Waiter: Sure. Anything to eat?', 'Nhân viên: Được. Có ăn gì không?'],
      ['Nga: Do you have banh mi?', 'Nga: Quán có bánh mì không?'],
      ['Waiter: Yes, with chicken or with egg.', 'Nhân viên: Có, bánh mì gà hoặc trứng.'],
      ['Nga: Chicken, please. How much is it?', 'Nga: Gà nhé. Bao nhiêu tiền?'],
      ['Waiter: The coffee is 30,000 and the banh mi is 25,000. Anything else?', 'Nhân viên: Cà phê 30 nghìn, bánh mì 25 nghìn. Còn gì nữa không?'],
      ['Nga: No, that’s all. Thank you.', 'Nga: Không, đủ rồi. Cảm ơn.'],
    ],
    questions: [
      { q: 'Nga gọi cà phê gì?', options: ['Cà phê đá không đường', 'Cà phê nóng có đường', 'Cà phê sữa'], answer: 0, hint: '"an iced coffee… No sugar."' },
      { q: 'Nga chọn bánh mì gì?', options: ['Gà', 'Trứng', 'Cả hai'], answer: 0, hint: '"Chicken, please."' },
      { q: 'Tổng tiền là bao nhiêu?', options: ['55.000', '30.000', '25.000'], answer: 0, hint: '30,000 + 25,000.' },
    ],
  },

  listening: {
    text: 'Good afternoon. Today we have chicken rice for 45,000 and beef noodles for 50,000. Drinks are 20,000. Sorry, we don’t have iced tea today, but we have lemon juice.',
    vi: 'Chào buổi chiều. Hôm nay quán có cơm gà 45 nghìn và phở bò 50 nghìn. Đồ uống 20 nghìn. Xin lỗi, hôm nay không có trà đá, nhưng có nước chanh.',
    questions: [
      { q: 'Phở bò giá bao nhiêu?', options: ['50.000', '45.000', '20.000'], answer: 0, hint: '"beef noodles for 50,000".' },
      { q: 'Hôm nay quán không có gì?', options: ['Trà đá', 'Nước chanh', 'Cơm gà'], answer: 0, hint: '"we don’t have iced tea today".' },
    ],
  },

  write: {
    setup: 'Bạn đặt đồ qua tin nhắn với một quán ăn (chat).',
    prompt: 'Viết 3 câu: gọi 1 món ăn + 1 đồ uống, một yêu cầu nhỏ (không đường / không hành…), hỏi giá.',
    model: ['Hi! I’d like a chicken rice and an iced tea, please.', 'No ice in the tea, please.', 'How much is it in total?'],
    checklist: [
      'Có I’d like / Can I have … please.',
      'Có một yêu cầu nhỏ (No …, please).',
      'Có câu hỏi giá How much …?',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn vào một quán ăn cùng một người bạn.',
    roleA: 'Khách — xin bàn hai người, gọi 2 món + 2 đồ uống, hỏi giá, xin tính tiền.',
    roleB: 'Nhân viên — chào, hỏi "Anything else?", báo giá, đưa hóa đơn.',
    prompt: 'Nói thành tiếng cả hai vai. Dùng ít nhất 2 câu lịch sự có "please".',
    model: ['A: A table for two, please. — B: Sure. What would you like?', 'A: I’d like a pho and a chicken rice, and two iced teas, please. — B: Anything else? — A: No, that’s all.', 'A: How much is it? … Can I have the bill, please?'],
    checklist: [
      'Có A table for two, please.',
      'Gọi món bằng I’d like / Can I have.',
      'Có hỏi giá và xin tính tiền.',
    ],
  },
};
