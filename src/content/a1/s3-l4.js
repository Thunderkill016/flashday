// Chặng 3 · Bài 4 — Thành phố của tôi.
export default {
  id: 'a1-s3-l4',
  stage: 3,
  order: 4,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Thành phố của tôi',
  canDo: 'Giới thiệu ngắn về nơi mình sống: lớn/nhỏ, có gì, thích gì ở đó; hỏi về thành phố của người khác.',

  pattern: {
    name: 'It’s a big city. / There are many … / I like it because …',
    rule:
      'Miêu tả bằng "It’s + a/an + tính từ + city/town" (It’s a small town). Tính từ đứng TRƯỚC danh từ (a big city, không nói "a city big"). Có gì: "There are many/lots of + danh từ số nhiều". Lý do: "I like it because + câu".',
    examples: [
      ['Hue is a small, quiet city.', 'Huế là một thành phố nhỏ, yên tĩnh.'],
      ['There are many old buildings and a river.', 'Có nhiều tòa nhà cổ và một con sông.'],
      ['I like it because the food is great.', 'Tôi thích nó vì đồ ăn rất ngon.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'I live in …, a big / small city', meaning: 'Tôi sống ở …, một thành phố lớn / nhỏ', example: 'I live in Can Tho, a small city in the south.', exampleVi: 'Tôi sống ở Cần Thơ, một thành phố nhỏ ở miền Nam.' },
    { id: 'c2', target: 'It’s famous for …', meaning: 'Nó nổi tiếng về …', example: 'Hoi An? It’s famous for its old town.', exampleVi: 'Hội An hả? Nó nổi tiếng với phố cổ.' },
    { id: 'c3', target: 'There are lots of …', meaning: 'Có rất nhiều …', example: 'There are lots of cafes and parks.', exampleVi: 'Có rất nhiều quán cà phê và công viên.' },
    { id: 'c4', target: 'busy / quiet / noisy / beautiful', meaning: 'đông đúc / yên tĩnh / ồn / đẹp', example: 'The city centre is busy and noisy.', exampleVi: 'Trung tâm thành phố đông và ồn.' },
    { id: 'c5', target: 'I like it because …', meaning: 'Tôi thích nó vì …', example: 'I like it because the people are friendly.', exampleVi: 'Tôi thích nó vì người dân thân thiện.' },
    { id: 'c6', target: 'What’s your city like?', meaning: 'Thành phố của bạn thế nào?', example: 'What’s your city like, Tom?', exampleVi: 'Thành phố của bạn thế nào, Tom?' },
    { id: 'c7', target: 'in the north / south / centre', meaning: 'ở miền Bắc / Nam / trung tâm', example: 'Hanoi is in the north of Vietnam.', exampleVi: 'Hà Nội ở miền Bắc Việt Nam.' },
    { id: 'c8', target: 'You should visit …', meaning: 'Bạn nên ghé thăm …', example: 'You should visit the night market.', exampleVi: 'Bạn nên ghé chợ đêm.' },
  ],

  drills: [
    { q: 'Thứ tự đúng:', options: ['a big city', 'a city big', 'city a big'], answer: 0, hint: 'Tính từ đứng trước danh từ.' },
    { q: 'There ___ lots of restaurants in my city.', options: ['are', 'is', 'have'], answer: 0, hint: 'restaurants (số nhiều) → are.' },
    { q: 'I like Hue ___ it’s quiet.', options: ['because', 'but', 'so'], answer: 0, hint: 'because = vì.' },
    { q: 'Hỏi về thành phố người kia:', options: ['What’s your city like?', 'What does your city like?', 'How is like your city?'], answer: 0, hint: 'What’s … like? = … thế nào?' },
  ],

  dialogue: {
    title: 'Bạn đến từ thành phố nào?',
    lines: [
      ['Emma: Where are you from in Vietnam, Duc?', 'Emma: Bạn ở đâu ở Việt Nam, Đức?'],
      ['Duc: Da Nang. It’s a city in the centre, by the sea.', 'Đức: Đà Nẵng. Một thành phố ở miền Trung, bên biển.'],
      ['Emma: What’s it like?', 'Emma: Nó thế nào?'],
      ['Duc: It’s not too big and it’s clean. There are beautiful beaches and lots of seafood restaurants.', 'Đức: Không quá lớn và sạch. Có bãi biển đẹp và rất nhiều nhà hàng hải sản.'],
      ['Emma: Sounds great. Is it busy?', 'Emma: Nghe hay đó. Có đông không?'],
      ['Duc: In summer, yes. Many tourists. But I like it because the people are friendly.', 'Đức: Mùa hè thì có. Nhiều du khách. Nhưng tôi thích vì người dân thân thiện.'],
      ['Emma: I want to visit!', 'Emma: Tôi muốn ghé thăm!'],
    ],
    questions: [
      { q: 'Đà Nẵng ở đâu?', options: ['Miền Trung, bên biển', 'Miền Bắc', 'Miền Nam'], answer: 0, hint: '"in the centre, by the sea".' },
      { q: 'Đà Nẵng có gì?', options: ['Bãi biển và nhà hàng hải sản', 'Núi và rừng', 'Nhiều nhà máy'], answer: 0, hint: '"beautiful beaches and lots of seafood restaurants".' },
      { q: 'Vì sao Đức thích Đà Nẵng?', options: ['Người dân thân thiện', 'Nhiều du khách', 'Rất lớn'], answer: 0, hint: '"because the people are friendly".' },
    ],
  },

  listening: {
    text: 'I live in Bristol. It’s a city in the west of England. It’s not very big, but it’s busy. There are lots of old streets, a river and a famous bridge. I like it because there is always music in the evening.',
    vi: 'Tôi sống ở Bristol. Một thành phố ở miền Tây nước Anh. Không lớn lắm nhưng đông. Có nhiều đường phố cổ, một con sông và một cây cầu nổi tiếng. Tôi thích vì buổi tối luôn có nhạc.',
    questions: [
      { q: 'Bristol ở đâu?', options: ['Miền Tây nước Anh', 'Miền Bắc nước Anh', 'Trung tâm London'], answer: 0, hint: '"in the west of England".' },
      { q: 'Vì sao người nói thích Bristol?', options: ['Luôn có nhạc buổi tối', 'Rất yên tĩnh', 'Rất lớn'], answer: 0, hint: '"there is always music in the evening".' },
    ],
  },

  write: {
    setup: 'Một bạn nước ngoài sắp du lịch Việt Nam hỏi về thành phố của bạn.',
    prompt: 'Viết 3–4 câu: thành phố ở đâu, lớn hay nhỏ, có gì, và một lý do bạn thích (hoặc một gợi ý "You should visit …").',
    model: ['I live in Hai Phong. It’s a big city in the north, near the sea.', 'There are lots of markets and a beautiful old opera house.', 'I like it because the food is cheap. You should visit Cat Ba island.'],
    checklist: [
      'Tính từ đứng trước danh từ (a big city).',
      'Có "There are lots of/many + số nhiều".',
      'Có "because" hoặc "You should visit".',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn nói chuyện với một bạn học người Úc về quê nhau.',
    roleA: 'Bạn — hỏi "What’s your city like?", rồi kể về thành phố của bạn (3–4 câu).',
    roleB: 'Bạn học — sống ở Perth: thành phố lớn, yên tĩnh, nhiều bãi biển, thích vì thời tiết đẹp.',
    prompt: 'Nói thành tiếng cả hai vai. Mỗi người có ít nhất một tính từ và một "because".',
    model: ['A: What’s your city like? — B: Perth is a big, quiet city. There are lots of beaches. I like it because the weather is great.', 'A: I live in Vinh. It’s a small city in the north. There are many parks. I like it because it’s quiet.'],
    checklist: [
      'Có câu hỏi What’s … like?',
      'Mỗi vai có ít nhất một tính từ miêu tả.',
      'Có "because + lý do".',
    ],
  },
};
