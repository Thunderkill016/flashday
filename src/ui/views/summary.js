// Kết quả buổi học — placeholder until Phase 3 renders real attempts.
export function mount(root, { params }) {
  root.innerHTML = `
    <section class="view-section">
      <h1>Kết quả buổi học</h1>
      <p class="view-placeholder">Tổng kết bài ${params?.lessonId || ''} sẽ hiện ở đây.</p>
    </section>`;
}

export function unmount() {}
