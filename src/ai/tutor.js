/*
 * AI tutor for the lesson runner — Firebase AI Logic (Gemini Developer API)
 * on the same Firebase app the client already created. The SDK loads lazily
 * so learners without AI support never pay the bundle cost.
 *
 * Three capabilities, each with a deterministic fallback in the caller:
 * - explainWrong: why a chosen quiz answer is wrong (Vietnamese, A1 level)
 * - reviewWriting: structured correction of the learner's free text
 * - startRoleplay: a scripted-persona chat partner for the speak step
 *
 * Tests inject a mock via `window.__FLASHDAY_TUTOR__`; when no client/config
 * exists the tutor reports itself unavailable and callers keep static flows.
 */

// gemini-3.8-flash: free-tier supported, fast enough for in-lesson latency.
const MODEL_NAME = 'gemini-3.8-flash';
const CALL_TIMEOUT_MS = 15_000;

let singleton = null;

export function getTutor(ctx) {
  if (typeof window !== 'undefined' && window.__FLASHDAY_TUTOR__) {
    return window.__FLASHDAY_TUTOR__;
  }
  if (!singleton) singleton = createTutor(ctx);
  return singleton;
}

// Test hook: swap in a mock; reset between page contexts by reassigning.
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
    startRoleplay: ({ partnerName = 'Sam' } = {}) => ({
      partnerName,
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

function createTutor(ctx) {
  let modelPromise = null;
  let dead = false;

  async function model() {
    if (!modelPromise) {
      modelPromise = (async () => {
        const [{ getApp }, ai] = await Promise.all([
          import('firebase/app'),
          import('firebase/ai')
        ]);
        const service = ai.getAI(getApp(), {
          backend: new ai.GoogleAIBackend()
        });
        return ai.getGenerativeModel(service, {
          model: MODEL_NAME,
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
        });
      })();
    }
    return modelPromise;
  }

  function timeout(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), CALL_TIMEOUT_MS)
      )
    ]);
  }

  async function generate(m, prompt) {
    if (dead) throw new Error('AI unavailable');
    try {
      const result = await timeout(m.generateContent(prompt));
      return result.response.text();
    } catch (error) {
      dead = true;
      throw error;
    }
  }

  const tutor = {
    get available() {
      return Boolean(ctx?.client) && !dead;
    },

    async explainWrong({ stepLabel, question, options, chosenIndex, correctIndex, hint, source }) {
      const m = await model();
      return generate(
        m,
        [
          'Bạn là gia sư tiếng Anh cho người Việt mức A1 (mới bắt đầu).',
          'Học viên làm bài trắc nghiệm và chọn sai. Hãy giải thích NGẮN (tối đa 3 câu) bằng tiếng Việt: vì sao lựa chọn của học viên sai, và vì sao đáp án đúng đúng. Không liệt kê lại toàn bộ lựa chọn.',
          '',
          `Bước: ${stepLabel}`,
          `Câu hỏi: ${question}`,
          `Các lựa chọn: ${options.map((o, i) => `${i + 1}. ${o}`).join(' | ')}`,
          `Học viên chọn: "${options[chosenIndex]}"`,
          `Đáp án đúng: "${options[correctIndex]}"`,
          hint ? `Gợi ý của bài: ${hint}` : '',
          source ? `Văn bản bài học liên quan: ${source}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      );
    },

    async reviewWriting({ setup, prompt, modelLines, learnerText }) {
      const m = await model();
      const raw = await generate(
        m,
        [
          'Bạn là gia sư tiếng Anh chấm bài viết cho người Việt mức A1.',
          'Trả về CHỈ một JSON object (không markdown, không lời dẫn) với dạng:',
          '{"correct": boolean, "errors": [{"said": string, "fix": string, "why": string}], "better": string, "praise": string}',
          '- correct: true nếu bài đạt yêu cầu và không có lỗi ngữ pháp/chính tả đáng kể.',
          '- errors: tối đa 3 lỗi quan trọng nhất; "said" trích đúng chỗ học viên viết, "fix" là bản sửa, "why" giải thích bằng tiếng Việt tối đa 1 câu.',
          '- better: một phiên bản tự nhiên hơn của chính bài học viên (giữ ý của họ), tối đa 2 câu, trình độ A1.',
          '- praise: một câu tiếng Việt ghi nhận điều học viên làm đúng.',
          '',
          `Tình huống: ${setup}`,
          `Yêu cầu: ${prompt}`,
          `Bài mẫu tham khảo: ${modelLines.join(' / ')}`,
          `Bài học viên: ${learnerText}`
        ].join('\n')
      );
      return JSON.parse(stripJsonFence(raw));
    },

    startRoleplay({ scenario, roleA, roleB, partnerName, partnerOrigin, checklist, targetPhrases }) {
      let chat = null;
      const history = [];

      async function ensureChat() {
        if (!chat) {
          const m = await model();
          chat = m.startChat({
            history: [
              {
                role: 'user',
                parts: [
                  {
                    text: [
                      `Đóng vai "${partnerName}" trong một cuộc hội thoại tiếng Anh cho học viên A1 (mới học).`,
                      `Tình huống: ${scenario}`,
                      `Vai của học viên: ${roleA}. Vai của bạn: ${roleB}.`,
                      'Luật: chỉ dùng tiếng Anh rất đơn giản (trình độ A1, tối đa 2 câu mỗi lượt); nói tự nhiên như người mới quen; KHÔNG giải thích ngữ pháp trừ khi học viên hỏi; nếu học viên viết sai nặng thì trả lời ý chính rồi kèm sửa ngắn trong ngoặc bằng tiếng Việt; ở lại trong tình huống.',
                      `Bắt đầu bằng lời chào tự nhiên của ${partnerName}.`
                    ].join('\n')
                  }
                ]
              }
            ]
          });
        }
        return chat;
      }

      return {
        partnerName,
        history,
        // Kickoff turn: the persona greets first so the learner answers a
        // real opener instead of talking into a blank chat.
        async start() {
          const session = await ensureChat();
          const result = await timeout(
            session.sendMessage('(Hội thoại bắt đầu — bạn chào trước.)')
          );
          const reply = result.response.text().trim();
          history.push({ role: 'partner', text: reply });
          return reply;
        },
        async send(learnerText) {
          const session = await ensureChat();
          history.push({ role: 'learner', text: learnerText });
          try {
            const result = await timeout(session.sendMessage(learnerText));
            const reply = result.response.text().trim();
            history.push({ role: 'partner', text: reply });
            return reply;
          } catch (error) {
            dead = true;
            throw error;
          }
        },
        async feedback() {
          const m = await model();
          const transcript = history
            .map((t) => `${t.role === 'learner' ? 'Học viên' : partnerName}: ${t.text}`)
            .join('\n');
          const raw = await generate(
            m,
            [
              'Chấm một hội thoại luyện nói tiếng Anh của học viên A1 (người Việt).',
              'Trả về CHỈ một JSON object (không markdown):',
              '{"items": [{"check": string, "ok": boolean, "note": string}], "corrections": [{"said": string, "better": string}], "summary": string}',
              '- items: chấm từng mục checklist bên dưới; "check" chép nguyên mục; "note" tiếng Việt tối đa 1 câu.',
              '- corrections: tối đa 3 lỗi tiếng Anh đáng sửa nhất mà học viên đã viết/nói; bỏ qua nếu không có.',
              '- summary: 1-2 câu tiếng Việt nhận xét tổng, khuyến khích.',
              '',
              'Checklist:',
              ...checklist.map((c) => `- ${c}`),
              '',
              'Mẫu câu mục tiêu của bài:',
              ...targetPhrases.map((p) => `- ${p}`),
              '',
              'Hội thoại:',
              transcript
            ].join('\n')
          );
          return JSON.parse(stripJsonFence(raw));
        }
      };
    }
  };

  return tutor;
}

function stripJsonFence(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (match ? match[1] : trimmed).trim();
}
