/*
 * Scenario glyph per lesson — the visual anchor every top product uses.
 * Keyword-matched on title + canDo + stage so all 30 lessons get one
 * without a schema change; 📗 is the neutral fallback.
 */
const SCENE_ICONS = [
  [/gặp|chào|giới thiệu|quen/i, '👋'],
  [/ăn|món|cơm|nhà hàng/i, '🍜'],
  [/uống|cà phê|trà|nước/i, '🥤'],
  [/mua|chợ|cửa hàng|giá|tiền/i, '🛒'],
  [/xe|đi lại|đường|bus|tàu|ga /i, '🚌'],
  [/giờ|hẹn|thời gian|lịch/i, '⏰'],
  [/nhà|phòng|ở /i, '🏠'],
  [/sức khỏe|bác sĩ|bệnh|đau|thuốc/i, '🏥'],
  [/việc|công ty|làm/i, '💼'],
  [/thời tiết|mưa|nắng|lạnh/i, '🌤️'],
  [/gia đình|bố|mẹ|anh|chị|em|con/i, '👨‍👩‍👧'],
  [/sở thích|chơi|thể thao|phim|nhạc|đọc/i, '🎮'],
  [/du lịch|khách sạn|máy bay|thành phố/i, '✈️'],
  [/tuần trước|hôm qua|đã |quá khứ/i, '📅'],
  [/kế hoạch|sẽ |cuối tuần|tương lai/i, '🗓️'],
  [/checkpoint|ôn chặng/i, '🏁']
];

export function lessonIcon(lesson) {
  const haystack = `${lesson.title} ${lesson.canDo || ''} ${lesson.stage || ''}`;
  for (const [pattern, icon] of SCENE_ICONS) {
    if (pattern.test(haystack)) return icon;
  }
  return '📗';
}
