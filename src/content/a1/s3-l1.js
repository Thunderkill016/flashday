// Chặng 3 · Bài 1 — Nhà, phòng và đồ đạc (there is / there are).
export default {
  id: 'a1-s3-l1',
  stage: 3,
  order: 1,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Nhà của tôi',
  canDo: 'Miêu tả nhà/phòng mình: có mấy phòng, trong phòng có gì, đồ ở đâu; hỏi về nhà người khác.',

  pattern: {
    name: 'There is a … / There are two … / Is there …?',
    rule:
      '"There is + a/an + danh từ số ít" (There is a bed). "There are + số + danh từ số nhiều" (There are two windows). Hỏi: "Is there a …?" / "Are there any …?" Trả lời: "Yes, there is." / "No, there isn’t." / "Yes, there are." / "No, there aren’t."',
    examples: [
      ['There is a small kitchen.', 'Có một cái bếp nhỏ.'],
      ['There are three bedrooms.', 'Có ba phòng ngủ.'],
      ['Is there a balcony? — No, there isn’t.', 'Có ban công không? — Không có.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'There is a …', meaning: 'Có một …', example: 'There is a big window in my room.', exampleVi: 'Có một cửa sổ lớn trong phòng tôi.' },
    { id: 'c2', target: 'There are …', meaning: 'Có (nhiều) …', example: 'There are two chairs and a table.', exampleVi: 'Có hai cái ghế và một cái bàn.' },
    { id: 'c3', target: 'Is there a …?', meaning: 'Có … không?', example: 'Is there a bathroom upstairs?', exampleVi: 'Trên gác có phòng tắm không?' },
    { id: 'c4', target: 'I live in a house / a flat', meaning: 'Tôi sống trong nhà / căn hộ', example: 'I live in a small flat in the city.', exampleVi: 'Tôi sống trong một căn hộ nhỏ ở thành phố.' },
    { id: 'c5', target: 'living room / bedroom / kitchen / bathroom', meaning: 'phòng khách / phòng ngủ / bếp / phòng tắm', example: 'The kitchen is next to the living room.', exampleVi: 'Bếp ở cạnh phòng khách.' },
    { id: 'c6', target: 'next to / in front of / behind', meaning: 'cạnh / trước / sau', example: 'The sofa is in front of the TV.', exampleVi: 'Ghế sofa ở trước TV.' },
    { id: 'c7', target: 'on the left / on the right', meaning: 'bên trái / bên phải', example: 'My room is on the left.', exampleVi: 'Phòng tôi ở bên trái.' },
    { id: 'c8', target: 'My favourite room is …', meaning: 'Phòng tôi thích nhất là …', example: 'My favourite room is the kitchen.', exampleVi: 'Phòng tôi thích nhất là bếp.' },
  ],

  drills: [
    { q: 'There ___ two bedrooms in my flat.', options: ['is', 'are', 'am'], answer: 1, hint: 'two bedrooms (số nhiều) → are.' },
    { q: 'There ___ a sofa in the living room.', options: ['is', 'are', 'have'], answer: 0, hint: 'a sofa (số ít) → is.' },
    { q: '___ there a garden? — No, there isn’t.', options: ['Is', 'Are', 'Do'], answer: 0, hint: 'a garden → Is there.' },
    { q: 'The bathroom is ___ the bedroom. (cạnh)', options: ['next to', 'in front of', 'behind'], answer: 0, hint: 'next to = cạnh.' },
  ],

  dialogue: {
    title: 'Xem phòng trọ',
    lines: [
      ['Agent: This is the flat. There are two bedrooms and one bathroom.', 'Môi giới: Đây là căn hộ. Có hai phòng ngủ và một phòng tắm.'],
      ['Hoa: Is there a kitchen?', 'Hoa: Có bếp không?'],
      ['Agent: Yes. It’s small, but there is a fridge and a cooker.', 'Môi giới: Có. Nhỏ, nhưng có tủ lạnh và bếp nấu.'],
      ['Hoa: Where is the bathroom?', 'Hoa: Phòng tắm ở đâu?'],
      ['Agent: On the right, next to the big bedroom.', 'Môi giới: Bên phải, cạnh phòng ngủ lớn.'],
      ['Hoa: And is there a balcony?', 'Hoa: Có ban công không?'],
      ['Agent: No, there isn’t. But there are big windows.', 'Môi giới: Không. Nhưng có cửa sổ lớn.'],
    ],
    questions: [
      { q: 'Căn hộ có mấy phòng ngủ?', options: ['1', '2', '3'], answer: 1, hint: '"two bedrooms".' },
      { q: 'Trong bếp có gì?', options: ['Tủ lạnh và bếp nấu', 'Bàn và ghế', 'Máy giặt'], answer: 0, hint: '"a fridge and a cooker".' },
      { q: 'Phòng tắm ở đâu?', options: ['Bên trái', 'Bên phải, cạnh phòng ngủ lớn', 'Sau bếp'], answer: 1, hint: '"On the right, next to the big bedroom."' },
      { q: 'Có ban công không?', options: ['Có', 'Không, nhưng có cửa sổ lớn', 'Có hai cái'], answer: 1, hint: '"No, there isn’t. But there are big windows."' },
    ],
  },

  listening: {
    text: 'My room is small but I like it. There is a bed next to the window and a desk in front of the bed. There are two shelves with books. There isn’t a TV, but there is a big plant behind the door.',
    vi: 'Phòng tôi nhỏ nhưng tôi thích. Có một cái giường cạnh cửa sổ và một bàn học trước giường. Có hai kệ sách. Không có TV, nhưng có một cây lớn sau cửa.',
    questions: [
      { q: 'Giường ở đâu?', options: ['Cạnh cửa sổ', 'Sau cửa', 'Trước TV'], answer: 0, hint: '"a bed next to the window".' },
      { q: 'Trong phòng KHÔNG có gì?', options: ['TV', 'Bàn học', 'Kệ sách'], answer: 0, hint: '"There isn’t a TV".' },
    ],
  },

  write: {
    setup: 'Bạn đăng tin tìm bạn ở ghép và miêu tả căn hộ.',
    prompt: 'Viết 3 câu về nhà/phòng bạn: có mấy phòng, trong phòng khách/bếp có gì, một đồ vật ở vị trí nào.',
    model: ['I live in a small flat. There are two bedrooms and one bathroom.', 'In the living room there is a sofa and a TV.', 'The kitchen is next to the living room.'],
    checklist: [
      'Dùng "There is" với số ít, "There are" với số nhiều.',
      'Có ít nhất một từ chỉ vị trí (next to / in front of / behind / on the left).',
      'Không viết "have a room" thay cho "there is".',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn gọi hỏi về một phòng cho thuê trên mạng.',
    roleA: 'Bạn — hỏi có mấy phòng ngủ, có bếp/ban công không, phòng tắm ở đâu.',
    roleB: 'Chủ nhà — 1 phòng ngủ, có bếp nhỏ, không ban công, phòng tắm cạnh phòng ngủ.',
    prompt: 'Nói thành tiếng cả hai vai. Dùng "Is there / Are there" ít nhất 2 lần.',
    model: ['A: How many bedrooms are there? — B: There is one bedroom.', 'A: Is there a kitchen? — B: Yes, a small one. — A: Is there a balcony? — B: No, there isn’t.', 'A: Where is the bathroom? — B: Next to the bedroom.'],
    checklist: [
      'Có ít nhất 2 câu hỏi Is there / Are there.',
      'Trả lời ngắn đúng dạng (Yes, there is / No, there isn’t).',
      'Có một từ chỉ vị trí.',
    ],
  },
};
