// Chặng 1 · Bài 4 — Nghề nghiệp và nơi làm việc.
export default {
  id: 'a1-s1-l4',
  stage: 1,
  order: 4,
  kind: 'lesson',
  contentVersion: 1,
  title: 'Nghề nghiệp và nơi làm việc',
  canDo: 'Nói mình làm nghề gì, làm ở đâu; hỏi nghề và nơi làm của người khác.',

  pattern: {
    name: 'I’m a … / I work at … / What do you do?',
    rule:
      '"What do you do?" = bạn làm nghề gì. Trả lời "I’m a/an + nghề" (a teacher, an engineer — an trước nguyên âm). Nơi làm: "I work at/in + nơi". Học sinh/sinh viên: "I’m a student."',
    examples: [
      ['What do you do?', 'Bạn làm nghề gì?'],
      ['I’m a nurse. I work at a hospital.', 'Tôi là y tá. Tôi làm ở bệnh viện.'],
      ['She’s an engineer.', 'Cô ấy là kỹ sư.'],
    ],
  },

  chunks: [
    { id: 'c1', target: 'What do you do?', meaning: 'Bạn làm nghề gì?', example: 'So, what do you do, Tom?', exampleVi: 'Vậy bạn làm nghề gì, Tom?' },
    { id: 'c2', target: 'I’m a … / I’m an …', meaning: 'Tôi là … (nghề)', example: 'I’m a teacher.', exampleVi: 'Tôi là giáo viên.' },
    { id: 'c3', target: 'I work at …', meaning: 'Tôi làm ở …', example: 'I work at a bank.', exampleVi: 'Tôi làm ở ngân hàng.' },
    { id: 'c4', target: 'Where do you work?', meaning: 'Bạn làm việc ở đâu?', example: 'Where do you work now?', exampleVi: 'Giờ bạn làm việc ở đâu?' },
    { id: 'c5', target: 'I’m a student.', meaning: 'Tôi là sinh viên/học sinh.', example: 'I’m a student at Hue University.', exampleVi: 'Tôi là sinh viên Đại học Huế.' },
    { id: 'c6', target: 'I like my job.', meaning: 'Tôi thích công việc của mình.', example: 'It’s busy, but I like my job.', exampleVi: 'Bận, nhưng tôi thích công việc của mình.' },
    { id: 'c7', target: 'What about you?', meaning: 'Còn bạn thì sao?', example: 'I’m a driver. What about you?', exampleVi: 'Tôi là tài xế. Còn bạn thì sao?' },
  ],

  drills: [
    { q: 'I’m ___ engineer.', options: ['a', 'an', '—'], answer: 1, hint: 'engineer bắt đầu bằng nguyên âm → an.' },
    { q: 'What ___ you do?', options: ['do', 'are', 'is'], answer: 0, hint: 'Hỏi nghề: What do you do?' },
    { q: 'She’s a nurse. She works ___ a hospital.', options: ['at', 'to', 'on'], answer: 0, hint: 'work at + nơi làm.' },
    { q: 'Hỏi lại người kia sau khi bạn trả lời:', options: ['What about you?', 'How old are you?', 'Where are you from?'], answer: 0, hint: 'What about you? = còn bạn?' },
  ],

  dialogue: {
    title: 'Nói chuyện trong giờ nghỉ',
    lines: [
      ['Anna: So, Minh, what do you do?', 'Anna: Vậy, Minh, bạn làm nghề gì?'],
      ['Minh: I’m a chef. I work at a small restaurant near the river.', 'Minh: Tôi là đầu bếp. Tôi làm ở một nhà hàng nhỏ gần sông.'],
      ['Anna: Oh nice! Do you like it?', 'Anna: Ồ hay! Bạn có thích không?'],
      ['Minh: Yes, I like my job. It’s busy, but fun. What about you?', 'Minh: Có, tôi thích công việc. Bận nhưng vui. Còn bạn?'],
      ['Anna: I’m a teacher. I work at an English school.', 'Anna: Tôi là giáo viên. Tôi làm ở một trường tiếng Anh.'],
      ['Minh: And is your husband a teacher too?', 'Minh: Chồng bạn cũng là giáo viên à?'],
      ['Anna: No, he’s an engineer. He works at home.', 'Anna: Không, anh ấy là kỹ sư. Anh ấy làm ở nhà.'],
    ],
    questions: [
      { q: 'Minh làm nghề gì?', options: ['Đầu bếp', 'Giáo viên', 'Kỹ sư'], answer: 0, hint: '"I’m a chef."' },
      { q: 'Anna làm việc ở đâu?', options: ['Nhà hàng', 'Trường tiếng Anh', 'Ở nhà'], answer: 1, hint: '"I work at an English school."' },
      { q: 'Chồng Anna làm ở đâu?', options: ['Ở nhà', 'Nhà hàng', 'Bệnh viện'], answer: 0, hint: '"He works at home."' },
    ],
  },

  listening: {
    text: 'Hi, I’m David. I’m a doctor and I work at a big hospital in Hanoi. My wife is a designer. She works at a small company.',
    vi: 'Chào, tôi là David. Tôi là bác sĩ và làm ở một bệnh viện lớn ở Hà Nội. Vợ tôi là nhà thiết kế. Cô ấy làm ở một công ty nhỏ.',
    questions: [
      { q: 'David làm nghề gì?', options: ['Bác sĩ', 'Nhà thiết kế', 'Y tá'], answer: 0, hint: '"I’m a doctor."' },
      { q: 'Vợ David làm ở đâu?', options: ['Bệnh viện', 'Công ty nhỏ', 'Trường học'], answer: 1, hint: '"She works at a small company."' },
    ],
  },

  write: {
    setup: 'Bạn cập nhật hồ sơ trên một ứng dụng học ngoại ngữ, phần "Work".',
    prompt: 'Viết 2 câu: bạn làm nghề gì (hoặc là sinh viên) và làm/học ở đâu.',
    model: ['I’m an accountant.', 'I work at a small company in Da Nang.'],
    checklist: [
      'Có "I’m a/an + nghề" hoặc "I’m a student".',
      'Có "I work at / I study at + nơi".',
      'a/an đúng theo âm đầu của nghề.',
    ],
    gate: null,
  },

  speak: {
    setup: 'Tiệc sinh nhật của bạn chung. Bạn gặp một người lần đầu và bắt chuyện về công việc.',
    roleA: 'Bạn — hỏi nghề và nơi làm của người kia, rồi kể về mình.',
    roleB: 'Người mới — tên Jane, là y tá, làm ở bệnh viện thành phố.',
    prompt: 'Nói thành tiếng cả hai vai. Hỏi "What do you do?" và "Where do you work?"; kết bằng "What about you?".',
    model: ['A: What do you do, Jane? — B: I’m a nurse. I work at the city hospital.', 'B: What about you? — A: I’m a student. I study at Hue University.'],
    checklist: [
      'Đã hỏi nghề VÀ nơi làm.',
      'Đã nói về mình bằng "I’m a/an …".',
      'Có "What about you?" để chuyển lượt.',
    ],
  },
};
