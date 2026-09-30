/*
 * vNext mission UI copy (issue #55).
 *
 * Vietnamese-first scaffolding for the mission surface. Two honesty
 * rules baked into the wording (GPT R4 on #49):
 *
 *   - Purpose framing tells the learner what kind of step this is
 *     without leaking engine vocabulary (no INDEPENDENT/TRANSFERRED).
 *   - Progress copy describes OBSERVED evidence — "bạn đã làm được X
 *     lần không cần gợi ý" — never "bạn đã thành thạo / đã học xong".
 */

export const PURPOSE_FRAME = {
  diagnostic: {
    label: 'Kiểm tra đầu vào',
    hint: 'Cứ trả lời tự nhiên — phần này chỉ để biết bạn đang ở đâu, chưa cần đúng.'
  },
  input: { label: 'Xem mẫu', hint: 'Xem và nghe đoạn hội thoại mẫu.' },
  notice: { label: 'Để ý', hint: 'Để ý câu mới trong mẫu.' },
  retrieval: {
    label: 'Nhớ lại',
    hint: 'Trả lời từ trí nhớ — gợi ý có sẵn nếu bạn cần, nhưng hệ thống sẽ ghi là đã dùng trợ giúp.'
  },
  production: { label: 'Tự nói', hint: 'Tự nói câu của bạn.' },
  interaction: {
    label: 'Hội thoại',
    hint: 'Đáp lại lượt của bạn trong cuộc trò chuyện.'
  },
  remediation: {
    label: 'Ôn lại',
    hint: 'Xem kỹ mẫu rồi thử lại — lần thử này được ghi là có hỗ trợ.'
  },
  delayed_retrieval: {
    label: 'Sau một khoảng nghỉ',
    hint: 'Bạn còn nhớ không? Trả lời mà không xem lại bài cũ.'
  },
  transfer: {
    label: 'Tình huống mới',
    hint: 'Hoàn cảnh khác với lúc luyện — vận dụng thử.'
  },
  assessment: {
    label: 'Kiểm tra cuối',
    hint: 'Làm hoàn toàn một mình — kết quả được giữ lại làm mốc đánh giá.'
  }
};

/* Communicative function → display content. Models/hints here are the
 * canonical A1 targets; a per-task `ui` field may override the
 * situation line but never the functions themselves. */
export const FUNCTION_MODEL = {
  greet: 'Hi!',
  ask_name: "What's your name?",
  state_own_name: "I'm <name>.",
  ask_repeat: 'Sorry?',
  respond_to_introduction: 'Nice to meet you too.',
  signal_nonunderstanding: "I don't understand.",
  order_item: 'A coffee, please.'
};

export const FUNCTION_HINT = {
  greet: 'Bắt đầu bằng “H…”',
  ask_name: 'Câu hỏi có “What is your …”',
  state_own_name: '“I’m …” + tên của bạn',
  ask_repeat: 'Chỉ cần “S…?” hoặc “Can you repeat …”',
  respond_to_introduction: '“Nice to meet you …”',
  signal_nonunderstanding: '“I don’t …”',
  order_item: '“A coffee, please” hoặc “Can I have …?”'
};

export const CAP_LABEL = {
  'listen.greeting_basic': 'Nghe lời chào',
  'listen.identity_question_basic': 'Nghe câu hỏi tên',
  'listen.drink_order_question_basic': 'Nghe câu hỏi gọi đồ uống',
  'speak.say_own_name': 'Nói tên của mình',
  'interact.greet': 'Chào lại',
  'interact.ask_name': 'Hỏi tên người khác',
  'interact.respond_to_introduction': 'Đáp lại lời giới thiệu',
  'interact.ask_repeat': 'Xin người khác nhắc lại',
  'interact.signal_nonunderstanding': 'Báo là chưa hiểu',
  'interact.order_drink': 'Gọi một thức uống',
  'read.simple_sign_or_menu_item': 'Đọc biển/menu đơn giản',
  'write.personal_info_short': 'Viết thông tin cá nhân ngắn'
};

/* Per-task situation lines — only where the contract stimulus needs
 * learner-facing context. Everything else derives from the task. */
export const TASK_SITUATION = {
  'task.meet.transfer.street': 'Bạn gặp một người lạ ngoài phố — không phải ngữ cảnh lớp học nữa.',
  'task.meet.assessment.checkpoint': 'Một người mới bắt chuyện với bạn — làm trọn cả lượt trò chuyện.',
  'task.drink.transfer.stall': 'Quầy nước ngoài chợ — người bán hỏi theo cách khác.',
  'task.drink.assessment.checkpoint': 'Một quán cà phê mới — tự gọi đồ uống trọn vẹn.'
};

export const MISSION_INTRO = {
  'mission.meet_new_person': {
    title: 'Gặp một người mới',
    blurb: 'Bạn gặp một người lần đầu. Mục tiêu: chào hỏi, nói tên mình và hỏi được tên họ.',
    startLabel: 'Bắt đầu'
  },
  'mission.order_drink': {
    title: 'Gọi một thức uống',
    blurb: 'Bạn đứng trước quầy cà phê. Mục tiêu: hiểu câu hỏi của người bán và gọi được một thức uống.',
    startLabel: 'Bắt đầu'
  }
};

/* Honest progress lines — each maps to observed evidence only. */
export function progressCopy(entry) {
  const lines = [];
  if (entry.baselinePassed) {
    lines.push('Bạn đã làm được phần này ngay từ lần kiểm tra đầu.');
  }
  if (entry.unaidedCount > 0) {
    lines.push(`Bạn đã tự làm được ${entry.unaidedCount} lần, không cần gợi ý.`);
  } else if (entry.state === 'SUPPORTED' || entry.milestones?.supported) {
    lines.push('Bạn đã làm được khi có trợ giúp.');
  } else if (entry.state === 'EXPOSED' || entry.milestones?.exposed) {
    lines.push('Bạn đã xem/nghe phần này.');
  } else {
    lines.push('Bạn chưa làm phần này.');
  }
  if (entry.milestones?.retained) {
    lines.push('Bạn làm lại được sau một khoảng nghỉ.');
  }
  if (entry.milestones?.transferred) {
    lines.push('Bạn dùng được trong một tình huống mới.');
  }
  if ((entry.consecutiveFailures ?? 0) >= 2 && !entry.baselinePassed) {
    lines.push('Phần này cần ôn lại trước lần kiểm tra tiếp.');
  }
  return lines;
}

export const SUMMARY_COPY = {
  idle: 'Bạn đã đi hết kế hoạch của nhiệm vụ này.',
  blocked: 'Hệ thống cần thêm bài để tiếp tục — phần đã làm vẫn được lưu đúng.',
  ready: 'Đang có bước tiếp theo.'
};

export const FEEDBACK_COPY = {
  success: 'Đúng — lượt này được ghi lại.',
  partial: 'Được một phần — xem mẫu rồi hệ thống sẽ cho thử lại.',
  fail: 'Chưa đúng — xem mẫu rồi hệ thống sẽ cho thử lại.',
  supportedNote: 'Lượt này có dùng trợ giúp — hệ thống ghi là “làm được khi có hỗ trợ”, không tính là tự làm.',
  unaidedNote: 'Lượt này bạn làm hoàn toàn một mình.'
};

export const SUPPORT_LABEL = {
  hint: 'Gợi ý',
  modelAnswer: 'Xem mẫu',
  transcript: 'Hiện phần chữ',
  translation: 'Dịch',
  repeat: 'Nghe lại'
};
