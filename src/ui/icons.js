/*
 * Scenario glyph per lesson — the visual anchor every top product uses.
 * Keyword-matched on title + canDo + stage so all 30 lessons get one
 * without a schema change; 📗 is the neutral fallback. Order matters:
 * specific topics first (health before "mua thuốc" reads as shopping,
 * daily routine before the generic "đi làm" inside work vocabulary).
 */
const SCENE_ICONS = [
  [/đánh vần|số điện thoại|email|chữ cái/i, '\u{1F524}'],
  [/tin nhắn|nhắn tin/i, '\u{1F4AC}'],
  [/sức khỏe|bác sĩ|bệnh|đau|ốm|thuốc|khỏe/i, '\u{1F3E5}'],
  [/bơi|lái xe|khả năng/i, '\u{1F4AA}'],
  [/hôm qua|quá khứ|tuần trước|vừa rồi/i, '\u{1F4C5}'],
  [/kế hoạch|sắp tới|cuối tuần này|định/i, '\u{1F5D3}\u{FE0F}'],
  [/xe|đi lại|đường|bus|tàu|vé|đi bằng/i, '\u{1F68C}'],
  [/giờ|hẹn|một ngày|ngày bình thường|bao lâu|thường xuyên/i, '\u{23F0}'],
  [/nghề|công ty|đồng nghiệp|phòng họp|chỗ làm|phỏng vấn/i, '\u{1F4BC}'],
  [/nhà của|phòng trọ|căn hộ|nhà mình/i, '\u{1F3E0}'],
  [/thành phố|phố/i, '\u{1F3D9}\u{FE0F}'],
  [/gọi món|quán|nhà hàng|cà phê/i, '\u{1F35C}'],
  [/mua|chợ|cửa hàng|giá|tiền|quần áo|thanh toán/i, '\u{1F6D2}'],
  [/ăn|món|cơm|uống|đồ ăn|đồ uống/i, '\u{1F35C}'],
  [/thời tiết|mưa|nắng|lạnh|trời/i, '\u{1F324}\u{FE0F}'],
  [/gia đình|bố mẹ|anh chị|con cái|cha mẹ|tuổi/i, '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}'],
  [/sở thích|chơi|thể thao|phim|nhạc|đọc sách/i, '\u{1F3AE}'],
  [/gặp|chào|quen|giới thiệu/i, '\u{1F44B}']
];

export function lessonIcon(lesson) {
  // Checkpoints get the flag regardless of topic keywords — their job is
  // consolidation, not a new scenario.
  if (lesson.kind === 'checkpoint' || /checkpoint/i.test(lesson.title)) return '\u{1F3C1}';
  const haystack = `${lesson.title} ${lesson.canDo || ''} ${lesson.stage || ''}`;
  for (const [pattern, icon] of SCENE_ICONS) {
    if (pattern.test(haystack)) return icon;
  }
  return '\u{1F4D7}';
}
