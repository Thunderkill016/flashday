/*
 * AI tutor for the lesson runner — on-device inference only.
 *
 * Backend: Chrome's built-in LanguageModel (Gemini Nano). It runs locally on
 * the learner's machine: free with no API key, no quota, no network calls,
 * and nothing leaves the device. Where the API does not exist (non-Chrome,
 * older Chrome, unsupported hardware) the tutor reports unavailable and
 * every caller falls back to the static flow.
 *
 * Tests inject a mock via `window.__FLASHDAY_TUTOR__`.
 *
 * Capabilities (each degrades invisibly on error):
 * - explainWrong: why a chosen quiz answer is wrong (Vietnamese, A1 level)
 * - reviewWriting: structured correction of the learner's free text
 * - generateDrills: fresh items on exactly the missed points
 * - generateVariant: a new dialogue reusing the same target chunks
 * - startRoleplay: a scripted-persona chat partner for the speak step
 * - assessPronunciation: tip text grounded in an ASR transcript diff
 *   (Nano is text-only — raw audio scoring is out of scope on-device)
 */

const CALL_TIMEOUT_MS = 60_000; // first call may include the model download
const SYSTEM_PROMPT =
  'Bạn là gia sư tiếng Anh cho học viên Việt mức A1 (mới bắt đầu). Trả lời ngắn gọn, đúng trình độ.';

let singleton = null;

export function getTutor(ctx) {
  if (typeof window !== 'undefined' && window.__FLASHDAY_TUTOR__) {
    return window.__FLASHDAY_TUTOR__;
  }
  if (!singleton) singleton = createTutor(ctx);
  return singleton;
}

// Test hook: deterministic canned responses so suites run hermetically.
export function createMockTutor(overrides = {}) {
  return {
    available: true,
    explainWrong: async () =>
      'Bạn chọn "is" nhưng chủ ngữ là "I" — "I" luôn đi với "am": I’m Mai.',
    reviewWriting: async () => ({
      correct: false,
      errors: [
        { said: 'i', fix: 'I', why: 'Chữ cái đầu câu và đại từ "I" luôn viết hoa.' }
      ],
      better: 'I’m Linh. I’m from Hue.',
      praise: 'Bạn đã nói đúng tên và quê mình.'
    }),
    assessPronunciation: async () => ({
      score: 86,
      unclear: ['meet'],
      tip: 'Nhấn rõ âm /t/ cuối “meet” — người Việt hay nuốt âm cuối.'
    }),
    generateDrills: async () => ({
      questions: [
        {
          q: 'She ___ from London.',
          options: ['is', 'am', 'are'],
          answer: 0,
          hint: 'she đi với is.'
        },
        {
          q: 'Bạn muốn đáp lại "Nice to meet you.":',
          options: ['Nice to meet you too.', 'I am Mai.', 'See you.'],
          answer: 0,
          hint: 'Thêm too = cũng vậy.'
        }
      ]
    }),
    generateVariant: async () => ({
      title: 'Ở quán cà phê',
      lines: [
        ['Emma: Hi! I’m Emma. What’s your name?', 'Emma: Chào! Mình là Emma. Bạn tên gì?'],
        ['Binh: I’m Binh. Nice to meet you.', 'Binh: Mình là Bình. Rất vui được gặp bạn.'],
        ['Emma: Nice to meet you too. Where are you from?', 'Emma: Mình cũng vậy. Bạn đến từ đâu?'],
        ['Binh: I’m from Hanoi. And you?', 'Binh: Mình đến từ Hà Nội. Còn bạn?'],
        ['Emma: I’m from Sydney, Australia.', 'Emma: Mình đến từ Sydney, Úc.']
      ],
      questions: [
        {
          q: 'Binh đến từ đâu?',
          options: ['Hà Nội', 'Sydney', 'Đà Nẵng'],
          answer: 0,
          hint: 'Binh nói: "I’m from Hanoi."'
        }
      ]
    }),
    startRoleplay: ({ partnerName = 'Sam' } = {}) => ({
      partnerName,
      history: [],
      start: async () => `Hi! I’m ${partnerName}. What’s your name?`,
      send: async (text) =>
        `Hi! I’m ${partnerName}. Nice to meet you. Where are you from?`,
      feedback: async () => ({
        items: [
          { check: 'Chào và giới thiệu tên', ok: true, note: 'Bạn đã chào và nói tên mình.' },
          { check: 'Hỏi tên và quê người kia', ok: true, note: 'Đã hỏi lại Sam.' },
          { check: 'Câu đáp lịch sự', ok: true, note: 'Có “Nice to meet you”.' }
        ],
        corrections: [],
        summary: 'Hội thoại đủ ý — mức A1.'
      })
    }),
    ...overrides
  };
}

/* ── On-device backend ─────────────────────────────────── */

function languageModelApi() {
  if (typeof window === 'undefined') return null;
  return window.LanguageModel || globalThis.ai?.languageModel || null;
}

function createTutor() {
  let dead = false;
  let statusSink = null;

  const tutor = {
    // Sync gate for mounting AI controls: the API surface exists and no call
    // has proven the device unsupported. availability() resolves async, so a
    // 'downloadable' device still renders — the first call drives it.
    get available() {
      return Boolean(languageModelApi()) && !dead;
    },

    // Optional: callers pass a text sink for "downloading model…" progress.
    setStatusSink(fn) {
      statusSink = typeof fn === 'function' ? fn : null;
    },

    async explainWrong({ stepLabel, question, options, chosenIndex, correctIndex, hint, source }) {
      return oneShot({
        schema: null,
        prompt: [
          'Học viên làm trắc nghiệm và chọn sai. Giải thích NGẮN (tối đa 3 câu) bằng tiếng Việt: vì sao lựa chọn của học viên sai và vì sao đáp án đúng đúng.',
          `Bước: ${stepLabel}`,
          `Câu hỏi: ${question}`,
          `Các lựa chọn: ${options.map((o, i) => `${i + 1}. ${o}`).join(' | ')}`,
          `Học viên chọn: "${options[chosenIndex]}"`,
          `Đáp án đúng: "${options[correctIndex]}"`,
          hint ? `Gợi ý của bài: ${hint}` : '',
          source ? `Văn bản bài học: ${source}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      });
    },

    async reviewWriting({ setup, prompt, modelLines, learnerText }) {
      const raw = await oneShot({
        schema: {
          type: 'object',
          properties: {
            correct: { type: 'boolean' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  said: { type: 'string' },
                  fix: { type: 'string' },
                  why: { type: 'string' }
                },
                required: ['said', 'fix', 'why']
              }
            },
            better: { type: 'string' },
            praise: { type: 'string' }
          },
          required: ['correct', 'errors', 'better', 'praise']
        },
        prompt: [
          'Chấm bài viết của học viên A1.',
          'errors: tối đa 3 lỗi quan trọng; "said" trích đúng chỗ viết sai, "fix" bản sửa, "why" giải thích tiếng Việt 1 câu.',
          'better: phiên bản tự nhiên hơn của chính bài học viên, tối đa 2 câu, trình độ A1.',
          'praise: 1 câu tiếng Việt ghi nhận điều làm đúng.',
          `Tình huống: ${setup}`,
          `Yêu cầu: ${prompt}`,
          `Bài mẫu: ${modelLines.join(' / ')}`,
          `Bài học viên: ${learnerText}`
        ].join('\n')
      });
      return JSON.parse(raw);
    },

    // Nano is text-only: the caller passes the ASR transcript + the diff it
    // already computed; the model writes the targeted pronunciation tip.
    async assessPronunciation({ target, transcript, missed }) {
      const raw = await oneShot({
        schema: {
          type: 'object',
          properties: { tip: { type: 'string' } },
          required: ['tip']
        },
        prompt: [
          'Học viên Việt A1 đọc một câu tiếng Anh; máy nhận giọng nghe được phần sau.',
          'Viết 1 câu tiếng Việt chỉ ra điểm phát âm cần sửa nhất (người Việt hay nuốt âm cuối).',
          `Câu mẫu: "${target}"`,
          `Máy nghe được: "${transcript}"`,
          missed?.length ? `Từ thiếu/lệch: ${missed.join(', ')}` : 'Đã nghe đủ các từ.'
        ].join('\n')
      });
      return JSON.parse(raw);
    },

    async generateDrills({ lessonTitle, sourceText, wrong }) {
      const count = Math.min(3, Math.max(2, wrong.length));
      const raw = await oneShot({
        schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  q: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  answer: { type: 'integer' },
                  hint: { type: 'string' }
                },
                required: ['q', 'options', 'answer', 'hint']
              }
            }
          },
          required: ['questions']
        },
        prompt: [
          `Tạo đúng ${count} câu trắc nghiệm MỚI luyện các điểm học viên vừa sai (không chép lại câu cũ).`,
          'Mỗi câu 3 options, chỉ 1 đáp án đúng; distractor gần đúng nhưng sai rõ. hint: tiếng Việt 1 câu.',
          `Bài: ${lessonTitle}`,
          `Ngôn ngữ đã dạy: ${sourceText}`,
          'Các câu đã sai:',
          ...wrong.map((w) => `- Hỏi: ${w.question} | Chọn: "${w.chosen}" | Đúng: "${w.correct}"`)
        ].join('\n')
      });
      return JSON.parse(raw);
    },

    async generateVariant({ canDo, patternName, chunkTargets, currentTitle, countLines }) {
      const raw = await oneShot({
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            lines: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  q: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  answer: { type: 'integer' },
                  hint: { type: 'string' }
                },
                required: ['q', 'options', 'answer', 'hint']
              }
            }
          },
          required: ['title', 'lines', 'questions']
        },
        prompt: [
          'Viết hội thoại tiếng Anh A1 MỚI (tình huống và tên nhân vật khác) dùng cùng mẫu câu mục tiêu.',
          `lines: ${countLines} lượt, mỗi lượt [câu tiếng Anh, bản dịch Việt].`,
          'questions: 2 câu hỏi đọc-hiểu tiếng Việt, đáp án nằm trong hội thoại, 3 options, 1 đáp án đúng.',
          `Mục tiêu bài: ${canDo}`,
          `Mẫu chính: ${patternName}`,
          `Cụm phải tái dùng: ${chunkTargets.join(' | ')}`,
          `KHÔNG lặp tình huống đã có: ${currentTitle}`
        ].join('\n')
      });
      return JSON.parse(raw);
    },

    startRoleplay({ scenario, roleA, roleB, partnerName, checklist, targetPhrases }) {
      let session = null;
      const history = [];

      async function ensureSession() {
        if (!session) {
          session = await createSession({
            initialPrompts: [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'system',
                content: [
                  `Đóng vai "${partnerName}" trong hội thoại tiếng Anh cho học viên A1.`,
                  `Tình huống: ${scenario}`,
                  `Vai học viên: ${roleA}. Vai bạn: ${roleB}.`,
                  'Chỉ dùng tiếng Anh rất đơn giản (A1, tối đa 2 câu mỗi lượt); nói tự nhiên; không giải thích ngữ pháp trừ khi được hỏi; nếu học viên sai nặng thì trả lời ý chính rồi kèm sửa ngắn trong ngoặc bằng tiếng Việt; ở lại trong tình huống.'
                ].join('\n')
              }
            ]
          });
        }
        return session;
      }

      return {
        partnerName,
        history,
        async start() {
          const s = await ensureSession();
          const reply = await timed(s.prompt('(Hội thoại bắt đầu — bạn chào trước.)'));
          history.push({ role: 'partner', text: reply.trim() });
          return reply.trim();
        },
        async send(learnerText) {
          const s = await ensureSession();
          history.push({ role: 'learner', text: learnerText });
          const reply = await timed(s.prompt(learnerText));
          history.push({ role: 'partner', text: reply.trim() });
          return reply.trim();
        },
        async feedback() {
          const transcript = history
            .map((t) => `${t.role === 'learner' ? 'Học viên' : partnerName}: ${t.text}`)
            .join('\n');
          const raw = await oneShot({
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      check: { type: 'string' },
                      ok: { type: 'boolean' },
                      note: { type: 'string' }
                    },
                    required: ['check', 'ok', 'note']
                  }
                },
                corrections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      said: { type: 'string' },
                      better: { type: 'string' }
                    },
                    required: ['said', 'better']
                  }
                },
                summary: { type: 'string' }
              },
              required: ['items', 'corrections', 'summary']
            },
            prompt: [
              'Chấm một hội thoại luyện nói tiếng Anh của học viên A1 (người Việt).',
              'items: chấm từng mục checklist; "check" chép nguyên mục; "note" tiếng Việt tối đa 1 câu.',
              'corrections: tối đa 3 lỗi đáng sửa nhất; bỏ qua nếu không có.',
              'summary: 1-2 câu tiếng Việt nhận xét, khuyến khích.',
              'Checklist:',
              ...checklist.map((c) => `- ${c}`),
              'Mẫu câu mục tiêu:',
              ...targetPhrases.map((p) => `- ${p}`),
              'Hội thoại:',
              transcript
            ].join('\n')
          });
          return JSON.parse(raw);
        }
      };
    }
  };

  async function createSession({ initialPrompts }) {
    const LM = languageModelApi();
    if (!LM) throw new Error('No on-device model');
    const availability = await LM.availability();
    if (availability === 'unavailable') {
      dead = true;
      throw new Error('On-device model unavailable');
    }
    // 'downloadable'/'downloading' resolve inside create(); monitor keeps the
    // learner informed during the one-time multi-GB download.
    return LM.create({
      initialPrompts,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          statusSink?.(`Đang tải model on-device lần đầu… ${Math.round((e.loaded || 0) * 100)}%`);
        });
      }
    });
  }

  function timed(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), CALL_TIMEOUT_MS)
      )
    ]);
  }

  // One-shot helper: session per call so contexts never bleed between tasks;
  // destroyed immediately after — Nano sessions hold memory.
  async function oneShot({ prompt, schema }) {
    if (dead) throw new Error('AI unavailable');
    const session = await createSession({
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }]
    });
    try {
      return await timed(
        session.prompt(prompt, schema ? { responseConstraint: schema } : undefined)
      );
    } catch (error) {
      if (String(error?.message || '').match(/unavailable|not supported/i)) dead = true;
      throw error;
    } finally {
      session.destroy?.();
    }
  }

  return tutor;
}
