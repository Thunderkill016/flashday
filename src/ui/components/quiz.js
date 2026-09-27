/*
 * Shared quiz for drills / read / listen questions. One mounted DOM per quiz
 * — "Làm lại" re-enables the same inputs and hides the same feedback nodes;
 * nothing is rebuilt (rule 1).
 */
let mountCounter = 0;

export function mountQuiz(el, questions, { onSubmit, initialAnswers = {}, onAnswerChange, onExplain } = {}) {
  const mountStamp = `quiz-${++mountCounter}`;
  el.dataset.quizMount = mountStamp;
  el.classList.add('quiz');

  const answers = { ...initialAnswers };
  const feedback = document.createElement('div');
  feedback.className = 'quiz-feedback';
  feedback.hidden = true;

  const questionEls = questions.map((question, index) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'quiz-question';
    const legend = document.createElement('legend');
    legend.textContent = question.q;
    fieldset.appendChild(legend);

    const optionsEl = document.createElement('div');
    optionsEl.className = 'quiz-options';
    question.options.forEach((option, optionIndex) => {
      const label = document.createElement('label');
      label.className = 'quiz-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `${mountStamp}-q${index}`;
      input.value = String(optionIndex);
      if (Number(initialAnswers[index]) === optionIndex) input.checked = true;
      input.addEventListener('change', () => {
        answers[index] = optionIndex;
        submitBtn.disabled = !allAnswered();
        onAnswerChange?.({ ...answers });
      });
      const span = document.createElement('span');
      span.textContent = option;
      label.append(input, span);
      optionsEl.appendChild(label);
    });
    fieldset.appendChild(optionsEl);

    const hint = document.createElement('p');
    hint.className = 'quiz-hint';
    hint.hidden = true;
    if (question.hint) hint.textContent = `Gợi ý: ${question.hint}`;
    fieldset.appendChild(hint);

    // "Explain my answer" (Duolingo Max-style): after a wrong submit the
    // learner can ask the AI tutor why THEIR choice fails — the hint stays
    // for when AI is unavailable.
    let explainBtn = null;
    const explainOut = document.createElement('p');
    explainOut.className = 'quiz-explain';
    explainOut.hidden = true;
    fieldset.appendChild(explainOut);
    if (onExplain) {
      explainBtn = document.createElement('button');
      explainBtn.type = 'button';
      explainBtn.className = 'btn-secondary quiz-explain-btn';
      explainBtn.textContent = 'Giải thích với AI';
      explainBtn.hidden = true;
      explainBtn.addEventListener('click', async () => {
        explainBtn.disabled = true;
        explainBtn.textContent = 'AI đang nghĩ…';
        try {
          const answer = await onExplain(question, Number(answers[index]));
          if (explainOut.isConnected) {
            explainOut.textContent = answer;
            explainOut.hidden = false;
          }
        } catch {
          explainBtn.textContent = 'Giải thích với AI';
          explainBtn.disabled = false;
          return;
        }
        explainBtn.hidden = true;
      });
      fieldset.appendChild(explainBtn);
    }
    return { fieldset, optionsEl, hint, explainBtn, explainOut, inputs: () => [...optionsEl.querySelectorAll('input')] };
  });

  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'btn-primary quiz-submit';
  submitBtn.textContent = 'Kiểm tra';
  submitBtn.disabled = !allAnswered();

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-secondary quiz-retry';
  retryBtn.textContent = 'Làm lại';
  retryBtn.hidden = true;

  function allAnswered() {
    return questions.every((_, index) => answers[index] != null);
  }

  function setInputsDisabled(disabled) {
    for (const q of questionEls) for (const input of q.inputs()) input.disabled = disabled;
  }

  submitBtn.addEventListener('click', () => {
    if (!allAnswered()) return;
    let correct = 0;
    let hintsViewed = 0;
    questionEls.forEach((q, index) => {
      const isRight = Number(answers[index]) === Number(questions[index].answer);
      if (isRight) correct++;
      q.fieldset.dataset.result = isRight ? 'correct' : 'wrong';
      q.optionsEl.classList.toggle('is-correct', isRight);
      q.optionsEl.classList.toggle('is-wrong', !isRight);
      const showHint = !isRight && Boolean(questions[index].hint);
      q.hint.hidden = !showHint;
      if (showHint) hintsViewed++;
      if (q.explainBtn) q.explainBtn.hidden = isRight;
    });
    setInputsDisabled(true);
    submitBtn.hidden = true;
    retryBtn.hidden = false;
    feedback.hidden = false;
    // Banner feedback (Duolingo pattern): full-width color block + icon —
    // the emotional "I did it" / "try again" signal, not just a number.
    const passed = correct === questions.length;
    feedback.classList.toggle('pass', passed);
    feedback.classList.toggle('retry', !passed);
    feedback.innerHTML = passed
      ? `<strong>✓ Đúng ${correct}/${questions.length}</strong><span>Tốt lắm!</span>`
      : `<strong>⟳ Đúng ${correct}/${questions.length}</strong><span>Xem gợi ý rồi làm lại nhé.</span>`;
    onSubmit?.({ correct, total: questions.length, answers: { ...answers }, hintsViewed });
  });

  retryBtn.addEventListener('click', () => {
    setInputsDisabled(false);
    for (const q of questionEls) {
      delete q.fieldset.dataset.result;
      q.optionsEl.classList.remove('is-correct', 'is-wrong');
      q.hint.hidden = true;
      if (q.explainBtn) {
        q.explainBtn.hidden = true;
        q.explainBtn.disabled = false;
        q.explainBtn.textContent = 'Giải thích với AI';
      }
      q.explainOut.hidden = true;
      q.explainOut.textContent = '';
    }
    retryBtn.hidden = true;
    submitBtn.hidden = false;
    feedback.hidden = true;
    feedback.classList.remove('pass', 'retry');
  });

  el.append(...questionEls.map((q) => q.fieldset), submitBtn, retryBtn, feedback);
  return { get answers() { return { ...answers }; }, mountStamp };
}
