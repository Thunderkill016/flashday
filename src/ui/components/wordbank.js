/*
 * Word bank (sentence unscramble) — the bridge between recognition and free
 * production that Duolingo/Babbel place between the two. Tap chips to build
 * the sentence; tap an answered chip to send it back. Distractor words come
 * from the drill's wrong options so the near-miss thinking is preserved.
 * Deterministic check — no AI needed.
 */
export function mountWordBank(el, items, { onDone } = {}) {
  for (const item of items) {
    const block = document.createElement('div');
    block.className = 'wb-item';

    const prompt = document.createElement('p');
    prompt.className = 'wb-prompt';
    prompt.textContent = item.prompt;
    block.appendChild(prompt);

    const answerLine = document.createElement('div');
    answerLine.className = 'wb-answer';
    answerLine.setAttribute('aria-label', 'Câu đang sắp');
    block.appendChild(answerLine);

    const bank = document.createElement('div');
    bank.className = 'wb-bank';
    block.appendChild(bank);

    const feedback = document.createElement('p');
    feedback.className = 'wb-feedback';
    feedback.hidden = true;
    block.appendChild(feedback);

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'btn-secondary wb-check';
    check.textContent = 'Kiểm tra';
    block.appendChild(check);

    const words = shuffle([...item.words, ...(item.extra || [])]);
    const chips = words.map((word) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'wb-chip';
      chip.dataset.word = word;
      chip.textContent = word;
      chip.addEventListener('click', () => {
        if (chip.parentElement === bank) answerLine.appendChild(chip);
        else bank.appendChild(chip);
        feedback.hidden = true;
        answerLine.classList.remove('wb-wrong');
      });
      bank.appendChild(chip);
      return chip;
    });

    check.addEventListener('click', () => {
      const built = [...answerLine.children].map((c) => c.dataset.word);
      if (!built.length) return;
      if (normalize(built.join(' ')) === normalize(item.answer)) {
        feedback.textContent = 'Đúng — câu hoàn chỉnh!';
        feedback.classList.add('wb-ok');
        feedback.hidden = false;
        check.disabled = true;
        for (const chip of answerLine.children) chip.disabled = true;
        answerLine.classList.add('wb-done');
        onDone?.(item);
      } else {
        feedback.textContent = 'Chưa đúng — đổi thứ tự các từ rồi thử lại.';
        feedback.classList.remove('wb-ok');
        feedback.hidden = false;
        answerLine.classList.add('wb-wrong');
      }
    });

    el.appendChild(block);
  }
}

function normalize(sentence) {
  return String(sentence)
    .toLowerCase()
    .replace(/[.,!?…]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
