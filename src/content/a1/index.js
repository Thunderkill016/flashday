// A1 course index — 6 stages × 5 lessons. Lesson files are added per stage;
// validateCourse() in tests only requires the full 30 once length reaches 30.
import s1l1 from './s1-l1.js';
import s1l2 from './s1-l2.js';
import s1l3 from './s1-l3.js';
import s1l4 from './s1-l4.js';
import s1l5 from './s1-l5.js';
import s2l1 from './s2-l1.js';
import s2l2 from './s2-l2.js';
import s2l3 from './s2-l3.js';
import s2l4 from './s2-l4.js';
import s2l5 from './s2-l5.js';
import s3l1 from './s3-l1.js';
import s3l2 from './s3-l2.js';
import s3l3 from './s3-l3.js';
import s3l4 from './s3-l4.js';
import s3l5 from './s3-l5.js';
import s4l1 from './s4-l1.js';
import s4l2 from './s4-l2.js';
import s4l3 from './s4-l3.js';
import s4l4 from './s4-l4.js';
import s4l5 from './s4-l5.js';

export const STAGES = Object.freeze([
  { id: 1, title: 'Tôi và mọi người', blurb: 'Chào hỏi, thông tin liên hệ, gia đình, công việc.' },
  { id: 2, title: 'Ngày và giờ', blurb: 'Giờ, thói quen, hẹn gặp, tần suất.' },
  { id: 3, title: 'Nơi ở và đường đi', blurb: 'Nhà, chỉ đường, phương tiện, thành phố.' },
  { id: 4, title: 'Ăn uống và mua sắm', blurb: 'Gọi món, hỏi giá, đi chợ, quần áo.' },
  { id: 5, title: 'Sức khỏe, khả năng, việc làm', blurb: 'Cơ thể, can/can’t, yêu cầu lịch sự, thời tiết.' },
  { id: 6, title: 'Kế hoạch, tin nhắn, kể lại', blurb: 'Cuối tuần này, tin nhắn ngắn, hôm qua, hỏi lại.' },
]);

export const LESSONS = Object.freeze([
  s1l1, s1l2, s1l3, s1l4, s1l5,
  s2l1, s2l2, s2l3, s2l4, s2l5,
  s3l1, s3l2, s3l3, s3l4, s3l5,
  s4l1, s4l2, s4l3, s4l4, s4l5,
]);

export function lessonById(id) {
  return LESSONS.find((lesson) => lesson.id === id) || null;
}

export function lessonsForStage(stageId) {
  return LESSONS.filter((lesson) => lesson.stage === stageId).sort((a, b) => a.order - b.order);
}

export function nextLesson(id) {
  const index = LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? LESSONS[index + 1] || null : null;
}
