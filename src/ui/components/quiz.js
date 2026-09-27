/*
 * Shared quiz for drills / read / listen questions. One mounted DOM per quiz
 * — "Làm lại" re-enables the same inputs and hides the same feedback nodes;
 * nothing is rebuilt (rule 1).
 */
let mountCounter = 0;

export function mountQuiz(el, questions, { onSubmit, initialAnswers = {}, onAnswerChange } = {}) {
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
    return { fieldset, optionsEl, hint, inputs: () => [...optionsEl.querySelectorAll('input')] };
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
    });
    setInputsDisabled(true);
    submitBtn.hidden = true;
    retryBtn.hidden = false;
    feedback.hidden = false;
    feedback.textContent = `Đúng ${correct}/${questions.length}.`;
    onSubmit?.({ correct, total: questions.length, answers: { ...answers }, hintsViewed });
  });

  retryBtn.addEventListener('click', () => {
    setInputsDisabled(false);
    for (const q of questionEls) {
      delete q.fieldset.dataset.result;
      q.optionsEl.classList.remove('is-correct', 'is-wrong');
      q.hint.hidden = true;
    }
    retryBtn.hidden = true;
    submitBtn.hidden = false;
    feedback.hidden = true;
  });

  el.append(...questionEls.map((q) => q.fieldset), submitBtn, retryBtn, feedback);
  return { get answers() { return { ...answers }; }, mountStamp };
}
