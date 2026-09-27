/*
 * AI tutor for the lesson runner — fully on-device, no API key.
 *
 * Backend: Transformers.js running `onnx-community/Qwen3-1.7B-ONNX` in the
 * browser (WebGPU first, WASM CPU fallback). Qwen3-1.7B is the strongest
 * browser-viable instruct model on Hugging Face for this job — multilingual
 * (Vietnamese + English), no HF token needed, ~1.1 GB at q4f16, cached by the
 * browser after first download. Free, unlimited, private, offline-capable.
 *
 * Everything degrades invisibly: if model load or generation fails the tutor
 * marks itself dead and every caller falls back to the static flow — no dead
 * buttons, no broken runner.
 *
 * Tests inject a mock via `window.__FLASHDAY_TUTOR__`.
 *
 * Capabilities:
 * - explainWrong: why a chosen quiz answer is wrong (Vietnamese, A1 level)
 * - reviewWriting: structured correction of the learner's free text
 * - generateDrills: fresh items on exactly the missed points
 * - generateVariant: a new dialogue reusing the same target chunks
 * - startRoleplay: a scripted-persona chat partner for the speak step
 * - assessPronunciation: tip text grounded in an ASR transcript diff
 *   (text-only model — raw audio scoring is out of scope in-browser)
 */

// Generation budget: WASM CPU does ~5–15 tok/s for a 1.7B q4 model.
const GEN_TIMEOUT_MS = 90_000;
const MODEL_ID = 'onnx-community/Qwen3-1.7B-ONNX';
const SYSTEM_PROMPT =
  'Bạn là gia sư tiếng Anh cho học viên Việt mức A1 (mới bắt đầu). Trả lời ngắn gọn, đúng trình độ.';
// Qwen3 thinking mode wastes the whole token budget on hidden reasoning for
// short tutoring turns — suppress it via the /no_think switch plus a
// post-processing strip for any residual <think> block.
const NO_THINK = '\n/no_think';

const TOKEN_BUDGET = {
  explain: 160,
  writing: 320,
  tip: 120,
  drills: 420,
  variant: 520,
  roleplayTurn: 80,
  feedback: 350
};

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

/* ── On-device backend (Transformers.js + ONNX) ────────── */

function createTutor() {
  let dead = false;
  let statusSink = null;
  let generator = null;
  let generatorPromise = null;

  const tutor = {
    // Broadly available: WASM runs anywhere a modern browser does. Only a
    // proven load/generation failure flips this off.
    get available() {
      return typeof window !== 'undefined' && !dead;
    },

    // Runner registers a text sink for model-download progress.
    setStatusSink(fn) {
      statusSink = typeof fn === 'function' ? fn : null;
    },

    async explainWrong({ stepLabel, question, options, chosenIndex, correctIndex, hint, source }) {
      return chat({
        budget: TOKEN_BUDGET.explain,
        user: [
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
      const raw = await chat({
        budget: TOKEN_BUDGET.writing,
        json: true,
        user: [
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
      return parseJson(raw);
    },

    // Text-only model: the caller passes the ASR transcript + the diff it
    // already computed; the model writes the targeted pronunciation tip.
    async assessPronunciation({ target, transcript, missed }) {
      const raw = await chat({
        budget: TOKEN_BUDGET.tip,
        json: true,
        user: [
          'Học viên Việt A1 đọc một câu tiếng Anh; máy nhận giọng nghe được phần sau.',
          'Viết 1 câu tiếng Việt chỉ ra điểm phát âm cần sửa nhất (người Việt hay nuốt âm cuối).',
          `Câu mẫu: "${target}"`,
          `Máy nghe được: "${transcript}"`,
          missed?.length ? `Từ thiếu/lệch: ${missed.join(', ')}` : 'Đã nghe đủ các từ.'
        ].join('\n')
      });
      return parseJson(raw);
    },

    async generateDrills({ lessonTitle, sourceText, wrong }) {
      const count = Math.min(3, Math.max(2, wrong.length));
      const raw = await chat({
        budget: TOKEN_BUDGET.drills,
        json: true,
        user: [
          `Tạo đúng ${count} câu trắc nghiệm MỚI luyện các điểm học viên vừa sai (không chép lại câu cũ).`,
          'Mỗi câu 3 options, chỉ 1 đáp án đúng; distractor gần đúng nhưng sai rõ. hint: tiếng Việt 1 câu.',
          `Bài: ${lessonTitle}`,
          `Ngôn ngữ đã dạy: ${sourceText}`,
          'Các câu đã sai:',
          ...wrong.map((w) => `- Hỏi: ${w.question} | Chọn: "${w.chosen}" | Đúng: "${w.correct}"`)
        ].join('\n')
      });
      return parseJson(raw);
    },

    async generateVariant({ canDo, patternName, chunkTargets, currentTitle, countLines }) {
      const raw = await chat({
        budget: TOKEN_BUDGET.variant,
        json: true,
        user: [
          'Viết hội thoại tiếng Anh A1 MỚI (tình huống và tên nhân vật khác) dùng cùng mẫu câu mục tiêu.',
          `lines: ${countLines} lượt, mỗi lượt [câu tiếng Anh, bản dịch Việt].`,
          'questions: 2 câu hỏi đọc-hiểu tiếng Việt, đáp án nằm trong hội thoại, 3 options, 1 đáp án đúng.',
          `Mục tiêu bài: ${canDo}`,
          `Mẫu chính: ${patternName}`,
          `Cụm phải tái dùng: ${chunkTargets.join(' | ')}`,
          `KHÔNG lặp tình huống đã có: ${currentTitle}`
        ].join('\n')
      });
      return parseJson(raw);
    },

    startRoleplay({ scenario, roleA, roleB, partnerName, checklist, targetPhrases }) {
      const history = [];
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            `Đóng vai "${partnerName}" trong hội thoại tiếng Anh cho học viên A1.`,
            `Tình huống: ${scenario}`,
            `Vai học viên: ${roleA}. Vai bạn: ${roleB}.`,
            'Chỉ dùng tiếng Anh rất đơn giản (A1, tối đa 2 câu mỗi lượt); nói tự nhiên; không giải thích ngữ pháp trừ khi được hỏi; nếu học viên sai nặng thì trả lời ý chính rồi kèm sửa ngắn trong ngoặc bằng tiếng Việt; ở lại trong tình huống. Bắt đầu: chào trước.'
          ].join('\n')
        }
      ];

      return {
        partnerName,
        history,
        async start() {
          const reply = await chat({
            budget: TOKEN_BUDGET.roleplayTurn,
            history: messages
          });
          history.push({ role: 'partner', text: reply });
          return reply;
        },
        async send(learnerText) {
          history.push({ role: 'learner', text: learnerText });
          const reply = await chat({
            budget: TOKEN_BUDGET.roleplayTurn,
            history: messages,
            lastUser: learnerText
          });
          history.push({ role: 'partner', text: reply });
          return reply;
        },
        async feedback() {
          const transcript = history
            .map((t) => `${t.role === 'learner' ? 'Học viên' : partnerName}: ${t.text}`)
            .join('\n');
          const raw = await chat({
            budget: TOKEN_BUDGET.feedback,
            json: true,
            user: [
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
          return parseJson(raw);
        }
      };
    }
  };

  async function ensureGenerator() {
    if (generator) return generator;
    if (!generatorPromise) {
      generatorPromise = (async () => {
        const { pipeline } = await import('@huggingface/transformers');
        const progress = ({ status, file, progress: pct }) => {
          if (status === 'progress' && typeof pct === 'number') {
            statusSink?.(`Đang tải model AI lần đầu… ${Math.round(pct)}% (${file ?? ''})`);
          } else if (status === 'ready') {
            statusSink?.('Model AI sẵn sàng.');
          }
        };
        try {
          return await pipeline('text-generation', MODEL_ID, {
            device: 'webgpu',
            dtype: 'q4f16',
            progress_callback: progress
          });
        } catch {
          // WebGPU absent (Firefox, older Chrome, no discrete GPU) — WASM CPU
          // still runs everywhere, just slower per token.
          return await pipeline('text-generation', MODEL_ID, {
            device: 'wasm',
            dtype: 'q4',
            progress_callback: progress
          });
        }
      })();
    }
    return generatorPromise;
  }

  // One chat completion. `history` keeps a live conversation for roleplay;
  // one-shot calls pass `user` and get an isolated context.
  async function chat({ budget, user, history, lastUser, json }) {
    if (dead) throw new Error('AI unavailable');
    try {
      const gen = await ensureGenerator();
      generator = gen;
      let messages;
      if (history) {
        if (lastUser !== undefined) history.push({ role: 'user', content: lastUser });
        messages = history;
      } else {
        messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: user }
        ];
      }
      const out = await timed(
        gen(messages, {
          max_new_tokens: budget,
          do_sample: false,
          // Ask the chat template to skip thinking; /no_think + strip below
          // cover versions that ignore the kwarg.
          enable_thinking: false
        })
      );
      const reply = out?.[0]?.generated_text?.at(-1)?.content ?? '';
      if (history) history.push({ role: 'assistant', content: reply });
      return stripThinking(reply);
    } catch (error) {
      dead = true;
      throw error;
    }
  }

  function timed(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), GEN_TIMEOUT_MS)
      )
    ]);
  }

  return tutor;
}

function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
}

// Small models sometimes wrap JSON in prose or code fences — extract the
// first balanced object instead of trusting the whole reply.
function parseJson(text) {
  const cleaned = stripThinking(text).replace(/```(?:json)?/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON in reply');
  return JSON.parse(cleaned.slice(start, end + 1));
}
