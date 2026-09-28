// Chặng 1 · Bài 1 — Gặp người mới (mission format, issue #33).
// ONE can-do: gặp một người mới → chào → nói tên mình → hỏi tên họ → đáp
// lời chào lịch sự. Không dạy nguồn gốc ("Where are you from?") ở đây —
// đó là một slice khác của curriculum khi được re-sequence.
//
// Flow của runner mission: Xem tình huống → Hiểu ý → Học từng cụm → Nhớ
// lại có hỗ trợ → Hội thoại ngắn → Tự làm (unaided attempt trước, hint/
// model sau). Mỗi stage ghi một lesson event riêng — evidence phân biệt
// được "tự làm được" vs "làm được sau gợi ý".

export default {
  id: 'a1-s1-l1',
  stage: 1,
  order: 1,
  kind: 'lesson',
  format: 'mission',
  contentVersion: 3,
  title: 'Gặp người mới',
  canDo: 'Gặp một người mới: chào, nói tên mình, hỏi tên họ và đáp lời chào lịch sự.',

  chunks: [
    {
      id: 'c1',
      target: 'Hi, I’m …',
      meaning: 'Chào, mình là …',
      example: 'Hi, I’m Linh.',
      exampleVi: 'Chào, mình là Linh.',
    },
    {
      id: 'c2',
      target: 'What’s your name?',
      meaning: 'Tên bạn là gì?',
      example: 'Hi! What’s your name?',
      exampleVi: 'Chào! Tên bạn là gì?',
    },
    {
      id: 'c3',
      target: 'Nice to meet you.',
      meaning: 'Rất vui được gặp bạn.',
      example: 'Nice to meet you, Linh.',
      exampleVi: 'Rất vui được gặp bạn, Linh.',
    },
    {
      id: 'c4',
      target: 'Nice to meet you too.',
      meaning: 'Mình cũng rất vui được gặp bạn.',
      example: 'Nice to meet you too, Mia.',
      exampleVi: 'Mình cũng rất vui được gặp bạn, Mia.',
    },
  ],

  mission: {
    title: 'Gặp Mia',
    scene:
      'Buổi học tiếng Anh đầu tiên của bạn. Bạn ngồi xuống cạnh một bạn ' +
      'tên Mia — bạn ấy quay sang chào bạn. Nghe và đọc đoạn hội thoại này.',
    // `covers` là chunk nào thực sự vang lên trong câu — listening task chỉ
    // được mint cho chunk đã nghe, không phải mọi chunk của bài.
    lines: [
      {
        speaker: 'Mia',
        en: 'Hi! I’m Mia. What’s your name?',
        vi: 'Chào! Mình là Mia. Tên bạn là gì?',
        covers: ['c1', 'c2'],
      },
      {
        speaker: 'Linh',
        en: 'Hi, I’m Linh.',
        vi: 'Chào, mình là Linh.',
        covers: ['c1'],
        you: true,
      },
      {
        speaker: 'Mia',
        en: 'Nice to meet you.',
        vi: 'Rất vui được gặp bạn.',
        covers: ['c3'],
      },
      {
        speaker: 'Linh',
        en: 'Nice to meet you too.',
        vi: 'Mình cũng rất vui được gặp bạn.',
        covers: ['c4'],
        you: true,
      },
    ],

    // UNDERSTAND: 2 câu kiểm ý chính — không phải kiểm tra từ vựng.
    gist: [
      {
        q: 'Mia và Linh đang làm gì?',
        options: ['Chào hỏi và làm quen', 'Mua đồ uống', 'Hỏi đường đi'],
        answer: 0,
        hint: 'Họ vừa gặp nhau lần đầu — nghe "Nice to meet you".',
      },
      {
        q: 'Linh nói tên mình thế nào?',
        options: ['Hi, I’m Linh.', 'Nice to meet you.', 'What’s your name?'],
        answer: 0,
        hint: 'Nghe lại lượt của Linh: "Hi, I’m Linh."',
      },
    ],

    // GUIDED RETRIEVAL: cue tiếng Việt → tự gõ lại cụm tiếng Anh.
    // answer là câu hoàn chỉnh để chấm; learner gõ, không chọn đáp án.
    retrieval: [
      { chunkId: 'c1', cue: 'Chào và nói tên mình là Linh', answer: 'Hi, I’m Linh.' },
      { chunkId: 'c2', cue: 'Hỏi tên người kia', answer: 'What’s your name?' },
      { chunkId: 'c3', cue: 'Nói lời lịch sự: "rất vui được gặp bạn"', answer: 'Nice to meet you.' },
      { chunkId: 'c4', cue: 'Đáp lại: "mình cũng rất vui được gặp bạn"', answer: 'Nice to meet you too.' },
    ],

    // MICRO-INTERACTION: Mia nói trước — learner sắp câu trả lời bằng
    // word bank (scaffold). Cùng can-do, nhưng trong khung hội thoại.
    interact: {
      partner: 'Mia',
      setup:
        'Trước giờ học, Mia quay sang bắt chuyện với bạn. Sắp các từ ' +
        'thành câu để trả lời bạn ấy.',
      turns: [
        {
          them: 'Hi! I’m Mia. What’s your name?',
          themVi: 'Chào! Mình là Mia. Tên bạn là gì?',
          you: 'Hi, I’m Linh.',
        },
        {
          them: 'Nice to meet you.',
          themVi: 'Rất vui được gặp bạn.',
          you: 'Nice to meet you too.',
        },
      ],
    },

    // EXIT TASK: người mới (Sam), tình huống mới. Lượt đầu KHÔNG có mẫu —
    // attempt đóng băng rồi mới hiện feedback: gợi ý theo từng mục thiếu →
    // retry → mẫu đầy đủ chỉ khi vẫn còn thiếu. `produces` là chunk learner
    // phải tự nói trong lượt đó — production card chỉ mint cho chunk thật
    // sự được nói (c3 là lời của Sam, không phải của learner). Mỗi check
    // là một yếu tố giao tiếp bắt buộc, chấm deterministic trên text —
    // xem src/core/mission-checks.js cho grammar của match patterns.
    exit: {
      setup:
        'Sau giờ học, một người khác — Sam — bắt chuyện với bạn ở quán ' +
        'cà phê. Lần này tự bạn nói: chào, nói tên mình và hỏi tên Sam.',
      partner: 'Sam',
      turns: [
        {
          them: 'Hi!',
          themVi: 'Chào!',
          model: 'Hi, I’m Linh. What’s your name?',
          produces: ['c1', 'c2'],
          checks: [
            {
              key: 'greet',
              label: 'Chào lại',
              match: ['hi', 'hello', 'hey'],
              hint: 'Bắt đầu bằng một lời chào: "Hi!" hoặc "Hello!"',
            },
            {
              key: 'name',
              label: 'Nói tên mình',
              match: ['i am *', 'my name is *', 'call me *'],
              hint: 'Nói tên mình bằng "I’m <tên>." — ví dụ "I’m Linh."',
            },
            {
              key: 'ask',
              label: 'Hỏi tên họ',
              match: [
                'what is your name',
                'and your name',
                'what about you',
                'tell me your name',
                'your name please',
              ],
              hint: 'Hỏi tên họ bằng "What’s your name?"',
            },
          ],
        },
        {
          them: 'I’m Sam. Nice to meet you.',
          themVi: 'Mình là Sam. Rất vui được gặp bạn.',
          model: 'Nice to meet you too.',
          produces: ['c4'],
          checks: [
            {
              key: 'polite',
              label: 'Đáp lời lịch sự',
              match: ['meet you too', 'nice to meet you', 'you too'],
              hint: 'Đáp lại bằng "Nice to meet you too."',
            },
          ],
        },
      ],
    },
  },
};
