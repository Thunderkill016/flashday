// Chặng 4 · Bài 4 — Thích / không thích, hỏi ý kiến về đồ ăn.
export default {
  id: 'a1-s4-l4',
  stage: 4,
  order: 4,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Bạn thích ăn gì?',
  canDo: 'Nói mình thích/không thích món gì và vì sao (ngon, cay, ngọt), hỏi ý người khác và gợi ý một món.',

  pattern: {
    name: 'I like / don’t like … / Do you like …? / It’s too spicy.',
    rule:
      '"I like + danh từ số nhiều hoặc không đếm được" (I like noodles, I like coffee). Phủ định: "I don’t like …". Hỏi: "Do you like …?" — "Yes, I do." / "No, I don’t." Lý do: "because it’s + spicy/sweet/salty/delicious". Gợi ý: "You should try + món." / "Let’s have + món."',
    examples: [
      ['I like seafood, but I don’t like beef.', 'Tôi thích hải sản, nhưng không thích thịt bò.'],
      ['Do you like spicy food? — No, I don’t. It’s too hot for me.', 'Bạn thích đồ cay không? — Không. Cay quá với tôi.'],
      ['You should try bun cha. It’s delicious.', 'Bạn nên thử bún chả. Ngon lắm.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'Do you like …?', meaning: 'Bạn thích … không?', example: 'Do you like Vietnamese food?', exampleVi: 'Bạn thích đồ ăn Việt không?' },
    { id: 'c2', target: 'Yes, I do. / No, I don’t.', meaning: 'Có. / Không.', example: 'Do you like fish? — Yes, I do.', exampleVi: 'Bạn thích cá không? — Có.' },
    { id: 'c3', target: 'I don’t like …', meaning: 'Tôi không thích …', example: 'I don’t like very sweet drinks.', exampleVi: 'Tôi không thích đồ uống quá ngọt.' },
    { id: 'c4', target: 'My favourite food is …', meaning: 'Món tôi thích nhất là …', example: 'My favourite food is pho.', exampleVi: 'Món tôi thích nhất là phở.' },
    { id: 'c5', target: 'spicy / sweet / salty / sour', meaning: 'cay / ngọt / mặn / chua', example: 'This soup is a bit salty.', exampleVi: 'Súp này hơi mặn.' },
    { id: 'c6', target: 'It’s delicious!', meaning: 'Ngon quá!', example: 'Try this. It’s delicious!', exampleVi: 'Thử cái này đi. Ngon quá!' },
    { id: 'c7', target: 'You should try …', meaning: 'Bạn nên thử …', example: 'You should try the spring rolls.', exampleVi: 'Bạn nên thử chả giò.' },
    { id: 'c8', target: 'Let’s have …', meaning: 'Mình ăn … nhé', example: 'Let’s have seafood tonight.', exampleVi: 'Tối nay mình ăn hải sản nhé.' },
  ],

  drills: [
    { q: '___ you like spicy food?', options: ['Do', 'Are', 'Is'], answer: 0, hint: 'like (động từ thường) → Do you like?' },
    { q: 'Trả lời ngắn cho "Do you like fish?":', options: ['No, I don’t.', 'No, I’m not.', 'No, I not.'], answer: 0, hint: 'Do → don’t.' },
    { q: 'I ___ like coffee.', options: ['don’t', 'not', 'am not'], answer: 0, hint: 'don’t + động từ.' },
    { q: 'Gợi ý người khác thử món:', options: ['You should try pho.', 'You try pho should.', 'Should pho you try.'], answer: 0, hint: 'You should + động từ.' },
    { q: 'Món có nhiều ớt thì:', options: ['spicy', 'sweet', 'sour'], answer: 0, hint: 'spicy = cay.' },
  ],

  dialogue: {
    title: 'Chọn quán ăn tối',
    lines: [
      ['Tom: I’m hungry. Let’s have dinner. Do you like seafood, Mai?', 'Tom: Tôi đói. Mình ăn tối nhé. Bạn thích hải sản không, Mai?'],
      ['Mai: Yes, I do! My favourite food is grilled fish.', 'Mai: Có! Món tôi thích nhất là cá nướng.'],
      ['Tom: Great. Is it spicy? I don’t like very spicy food.', 'Tom: Tuyệt. Có cay không? Tôi không thích đồ quá cay.'],
      ['Mai: No, it’s not spicy. It’s a bit sweet and salty.', 'Mai: Không cay. Hơi ngọt và mặn.'],
      ['Tom: Perfect. And you should try the mango salad. It’s sour and delicious.', 'Tom: Hoàn hảo. Và bạn nên thử gỏi xoài. Chua và ngon.'],
      ['Mai: OK! Let’s go to the place near the river.', 'Mai: Được! Mình đến quán gần sông nhé.'],
    ],
    questions: [
      { q: 'Món Mai thích nhất?', options: ['Cá nướng', 'Gỏi xoài', 'Phở'], answer: 0, hint: '"My favourite food is grilled fish."' },
      { q: 'Tom không thích gì?', options: ['Đồ quá cay', 'Hải sản', 'Đồ ngọt'], answer: 0, hint: '"I don’t like very spicy food."' },
      { q: 'Gỏi xoài có vị gì?', options: ['Chua', 'Cay', 'Mặn'], answer: 0, hint: '"It’s sour and delicious."' },
    ],
  },

  listening: {
    text: 'Hi, I’m Sofia from Spain. I love Vietnamese food. My favourite is banh xeo because it’s crispy. I don’t like durian — the smell is too strong for me! And I can’t eat very spicy food.',
    vi: 'Chào, tôi là Sofia từ Tây Ban Nha. Tôi rất thích đồ ăn Việt. Món thích nhất là bánh xèo vì giòn. Tôi không thích sầu riêng — mùi quá nặng với tôi! Và tôi không ăn được đồ quá cay.',
    questions: [
      { q: 'Món Sofia thích nhất?', options: ['Bánh xèo', 'Sầu riêng', 'Phở'], answer: 0, hint: '"My favourite is banh xeo".' },
      { q: 'Vì sao Sofia không thích sầu riêng?', options: ['Mùi quá nặng', 'Quá cay', 'Quá ngọt'], answer: 0, hint: '"the smell is too strong".' },
    ],
  },

  write: {
    setup: 'Một bạn nước ngoài sắp đến Việt Nam hỏi bạn nên ăn gì.',
    prompt: 'Viết 3 câu: món bạn thích nhất và vì sao, một món bạn không thích, và một gợi ý "You should try …".',
    model: ['My favourite food is bun bo because it’s a bit spicy and very tasty.', 'I don’t like durian.', 'You should try banh mi — it’s cheap and delicious!'],
    checklist: [
      'Có My favourite food is … because …',
      'Có I don’t like …',
      'Có You should try …',
    ],
    gate: null,
  },

  speak: {
    setup: 'Bạn và một đồng nghiệp nước ngoài chọn món ăn trưa.',
    roleA: 'Bạn — hỏi người kia thích gì, không thích gì; gợi ý 1 món và tả vị.',
    roleB: 'Đồng nghiệp — thích gà, không thích đồ cay, hỏi lại "Is it spicy?".',
    prompt: 'Nói thành tiếng cả hai vai. Có hỏi–đáp ngắn (Do you like …? — Yes, I do / No, I don’t).',
    model: ['A: Do you like chicken? — B: Yes, I do. But I don’t like spicy food.', 'A: You should try chicken rice. It’s not spicy — a bit sweet. — B: Is it spicy? — A: No. Let’s have that!'],
    checklist: [
      'Có Do you like …? và trả lời ngắn đúng.',
      'Có một từ chỉ vị (spicy/sweet/salty/sour).',
      'Có gợi ý You should try / Let’s have.',
    ],
  },
};
