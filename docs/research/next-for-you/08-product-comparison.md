# 08 — Product comparison

Mechanics observed or documented; **product claims separated from
independent evidence**. No proprietary algorithms inferred.

| Product | Observed/documented mechanic | Product claim | Independent evidence status |
|---------|------------------------------|---------------|------------------------------|
| **Anki** | FSRS (DSR memory model) or SM-2 fixed-interval; user grades recall; per-card scheduling | Efficient retention | FSRS benchmark: strong *predictive* accuracy on 727M-review dataset; predicts recall, not learning-transfer |
| **Duolingo** | Birdbrain/HLR schedules review; skill-tree progression; spaced practice sessions; streak/gamification | "Personalized," "effective" | HLR +45% recall-prediction accuracy, +12% *engagement* (Settles & Meeder 2016 — engagement, not learning); independent efficacy studies are limited and mixed on proficiency outcomes |
| **Babbel** | Lesson-based, dialogue-driven, review manager | Conversation-first efficacy | Internal claims; thin independent evaluation |
| **Busuu** | Lesson sequence + community correction | CEFR alignment | Limited independent evidence |
| **Memrise** | Spaced repetition + video phrases, gamified | Learn real language | No strong independent efficacy evidence |
| **Clozemaster** | Massive cloze-item SRS | Vocabulary through context | Mechanism is contextualized retrieval — aligned with evidence, but no efficacy studies |
| **LingQ** | Input-driven, word-tracking, "known words" counting | Learn from content you love | Embeds frequency/incidental-learning thesis (Uchihara) in product form; no controlled efficacy trials |
| **Migaku / Language Reactor** | Immersion-tooling (subs, lookups), SRS export | Learn from real media | Capture+notice tooling; efficacy unmeasured; mechanic aligns with immersion-first product thesis |
| **Speak** | AI-conversation practice, ASR-based | Speaking fluency | No independent efficacy data; interaction-turn mechanic is defensible (output hypothesis) |
| **ELSA** | ASR pronunciation scoring, phoneme-level feedback | Accent/pronunciation improvement | ASR feedback granularity is real engineering; independent learning-outcome evidence thin |
| **ALEKS** | Knowledge Space Theory — probabilistic knowledge states, prerequisite-structured admission, periodic re-assessment cycle | Mastery-based math learning | KST is a formal prerequisite-state model; decades of deployment; efficacy mixed-to-positive in ITS metas |
| **Carnegie Learning / classic ITS** | Step-level model tracing, mastery bars, hint ladders | Proven ITS | VanLehn 2011: ITS d≈0.76; the granularity+scaffold-fade design is the transferable lesson |

## Practices worth adopting

- **Prerequisite-structured admission** (ALEKS/KST): new content is
  served only when prerequisites are met — kernel already does this via
  `prereqs` gating.
- **Periodic re-assessment as a distinct cycle** (ALEKS): assessment
  is a scheduled diagnostic pass, not a continuous overlay — bounds
  assessment spam by construction.
- **Per-item memory models** (Anki FSRS/HLR): recall-probability
  scheduling outperforms fixed intervals *for prediction* — a future
  vNext memory model should learn from FSRS's DSR formulation, but
  must target *capability* evidence, not card recall.
- **Context-rich practice items** (Clozemaster/LingQ): retrieval in
  context beats isolated items — the kernel's family/task-context
  design already embodies this.
- **Impasse-then-repair loops** (ITS convention): the product loop of
  fail → diagnose → substrate support → re-attempt matches
  prompt-based CF evidence.

## Practices to avoid

- **Engagement-as-objective** (streaks, XP-optimized scheduling):
  Duolingo's own published win was engagement, not measured learning.
- **Opaque single "mastery %" per skill**: loses the multi-dimensional
  honesty the learner model is built on (uncertainty, dependency,
  thinness).
- **Unbounded learner choice over content** (free exploration): the
  learner-control meta shows motivation gains but mixed/null cognitive
  gains — bounded choice within a pedagogically valid set preserves
  motivation without forfeiting sequencing.
- **Continuous assessment overlay**: measuring instead of teaching —
  diagnostic actions must be a *budgeted intent*.
- **Unattributed "AI personalization" claims**: no public evidence that
  opaque personalization outperforms transparent sequencing on learning.
