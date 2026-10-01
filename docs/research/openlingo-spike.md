# OpenLingo integration spike

Status: **SPIKE — no product migration approved**

Source audited: `pretzelai/openlingo@88b1408452de56e793b5542dd372fa930dec44ce`.

## Decision

Do **not** replace the FlashDay kernel with OpenLingo.

Use OpenLingo only as a candidate commodity shell/reference for:
- Next.js/React product shell;
- auth;
- course/unit rendering;
- exercise components;
- AI-provider plumbing;
- TTS/STT transport;
- audio caching;
- reading surfaces.

Keep FlashDay authoritative for:
- Capability and Mission contracts;
- append-only EvidenceEvent semantics;
- evaluation provenance;
- support provenance;
- learner-state projection;
- repair/support-demand routing;
- delayed retrieval;
- changed-context transfer;
- fresh assessment;
- Next For You decision policy and audit.

The integration boundary proven by this spike is:

```
OpenLingo exercise result
        |
        v
bridgeOpenLingoAttempt()
        |
        +--> FlashDay evaluateAttempt(TaskContract)
        |
        +--> FlashDay bindAttempt(TaskContract, Capability)
        |
        v
EvidenceEvent -> projection / learner model / Next For You
```

OpenLingo never gets to author capability, task purpose, freshness,
transfer, assessment, evaluator authority, or outcome.

## Why a straight fork is unsafe

At the audited revision OpenLingo records lesson attempts primarily as:
- exercise type;
- a boolean `correct`;
- user answer;
- lesson completion.

Its SRS is word-oriented SM-2. Those are useful product mechanics, but
none are substitutes for FlashDay's distinction:

```
activity != learning != retention != transfer != proficiency
```

A straight fork followed by incremental feature work would make the
OpenLingo data model the de-facto truth and silently discard FlashDay's
strongest differentiator.

## Speaking boundary

OpenLingo's speaking surface uses STT. A transcript can show what the ASR
decoded, but it is not sufficient evidence that the learner's speech was
intelligible or pronounced adequately.

Therefore the bridge records STT-backed speaking attempts but marks them
`attempt.observed=false`. They may support history/feedback, but cannot
mint independent, retained, transferred, or assessment credit.

A future acoustic/human evaluator must arrive as an explicit FlashDay
evaluation contract; it must not be introduced by toggling this flag.

## License audit

The repository root is MIT, copyright Pretzel AI GmbH (2026), so the
software can be used, modified, sublicensed and sold while preserving the
copyright/license notice.

However, the repo also ships dictionary/frequency/CEFR datasets under
`words/`. The audit found no clear dataset-level attribution/license
statement in the README/search surface. Therefore:

**Do not copy or redistribute OpenLingo dictionary datasets into FlashDay
until each dataset's provenance and license are independently verified.**

The bridge in this spike copies no OpenLingo source code or datasets.

## Stack comparison

OpenLingo:
- Next.js 16 / React 19 / TypeScript;
- PostgreSQL + Drizzle;
- Better Auth;
- Vercel AI SDK;
- OpenAI TTS/STT;
- Cloudflare R2;
- SM-2.

FlashDay today:
- Vite / vanilla modules;
- Firebase Auth + Firestore;
- FSRS;
- vNext evidence/learner/planner kernel.

Changing shell therefore also means changing framework, auth, persistence
and deployment assumptions. That migration is not justified until the
kernel bridge works and a product-shell spike shows concrete velocity
gain.

## Exit criteria for this spike

PASS only if all are true:
1. OpenLingo-style results can create valid FlashDay EvidenceEvents.
2. The UI cannot forge capability/purpose/transfer/outcome semantics.
3. OpenLingo's `correct` boolean is ignored/rejected as evidence authority.
4. support usage survives into evidence provenance.
5. STT transcript success cannot mint independent speaking evidence.
6. existing FlashDay tests remain green.

If this passes, the next experiment is a **separate shell prototype**:
one mission (recommended: developer daily stand-up) rendered with
OpenLingo-like React exercise components while calling this boundary.

Do not migrate auth/database/curriculum before that experiment proves a
measurable implementation advantage.
