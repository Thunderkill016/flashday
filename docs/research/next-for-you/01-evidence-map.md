# 01 — Evidence map

Grading scale: **STRONG** (multiple high-quality studies/meta-analyses,
delayed outcomes, population/task match plausible) · **MODERATE**
(meta-analysis or replicated studies, weaker population/delay match) ·
**TENTATIVE** (single studies, proxies, or cross-domain transfer) ·
**UNSUPPORTED** (asserted without evidence) · **CONTRADICTED**
(credible counter-evidence exists).

Population reality check: almost no study used Vietnamese adult A1
learners in a mobile self-study product. Nearest populations: university
EFL learners (mostly East Asian), K-12 ITS studies, adult lab
participants. Transfer confidence is stated per-row.

| # | Mechanism / claim | Grade | Best evidence | Relevance / transfer caveat |
|---|-------------------|-------|---------------|-----------------------------|
| 1 | Retrieval practice > restudy for durable learning | **STRONG** | Adesope et al. 2017 meta (RoEd); Rowland 2014 meta | Core kernel loop already embodies this (RETIREVE). Pop. broad incl. L2 vocab (Barcroft 2007, Kang 2013) |
| 2 | Spaced > massed for L2 | **STRONG** | Kim & Webb 2022 meta (98 ES, 48 exp, N=3411); Latimier et al. spaced-retrieval meta g=0.74 | Directly supports delayed_retrieval rule. L2-specific |
| 3 | Longer spacing > shorter for delayed retention | **MODERATE** | Kim & Webb 2022 (longer better at delayed, not immediate) | Supports `minLag`-style gates; optimal lag is outcome-dependent, not a magic constant |
| 4 | Expanding > equal interval schedules | **CONTRADICTED** (as a required design) | Latimier et al. g=0.034 (no diff); Nakata 2015 equal≈expanding; advantage only with many exposures | Do NOT bake expanding-schedule assumption into policy; current fixed-lag gate is not refuted |
| 5 | Retrieval effort: more within-session retrievals → better retention, but worse *per-minute* efficiency | **MODERATE** | Nakata 2017 (5-7 retrievals best absolute; 1 retrieval best efficiency) | Cuts both ways: supports delay/spacing AND warns against over-drilling — time-efficiency is real |
| 6 | Interleaved > blocked for L2 grammar at delay | **MODERATE** | Nakata & Suzuki 2019 (1-wk delayed, lower-scorers benefit most); Pan et al. (systematic+random both needed) | Supports mixing capabilities rather than serial mastery-blocking |
| 7 | Interleaving universally better | **CONTRADICTED** | Brunmair & Richter 2019 meta: g=0.42 overall but **words g=-0.39 (blocking better)** | Vocabulary (FlashDay's A1 core) may NOT benefit from interleaving; do not assume |
| 8 | Desirable difficulty helps only when WM not overloaded | **MODERATE** | Chen et al. 2018 (Frontiers): DD effects vanish under high element-interactivity | Novice status raises overload *risk*; element-interactivity is task/material-dependent — hard retrieval may be *undesirable* on novel material; challenge must be load-aware |
| 9 | Optimal challenge exists ("challenge point") | **MODERATE** | Guadagnoli & Lee 2004; Wilson et al. 2019 (~85%/15% for binary tasks — narrow) | Region-of-proximal-learning principle is real; no defensible universal % — reject fake thresholds |
| 10 | Corrective feedback aids L2 development; prompts > recasts | **STRONG** | Lyster & Saito 2010 classroom CF meta; Brown 2016 meta | Supports remediation-with-repair design (prompts elicit self-repair vs just hearing correction) |
| 11 | Immediate > delayed CF for proceduralization | **MODERATE** | Fu & Li 2020 empirical (immediate>delayed); Li 2020 replication-agenda review; Quinn & Nakata 2017 review; Ellis 2006 explicit>implicit | Supports retry/remediation soon after failure — but see #12 boundary |
| 12 | Failure → immediate correction always | **CONTRADICTED** as universal rule | Metcalfe hypercorrection: high-confidence errors correct better; interference-perseveration hypothesis; delay-retention literature | Need error *type* (confidence/misconception vs slip) — model currently has `missingFunctions` but no error-severity dimension |
| 13 | Learner choice boosts motivation; effect on *learning* mixed | **MODERATE** | Patall 2008 meta (motivation↑); Karich 2014 learner-control meta (cognitive mixed) | Choice is a motivation lever, not a learning guarantee — offer within pedagogy-bounded candidate sets |
| 14 | ITS ≈ human tutoring effectiveness | **MODERATE** | VanLehn 2011: human d=0.79, ITS d=0.76; K-12 ITS meta 2025 g=0.271 | Fine-grained adaptive sequencing is achievable without human tutor; plateau at step-grain |
| 15 | Impasse/error is where learning happens; over-helping prevents it | **MODERATE** | VanLehn "What Makes a Tutorial Event Effective" | Validates retry/remediation existence; warns against support-demand over-issuance creating dependency |
| 16 | Max-information item selection reduces test length | **STRONG** (in psychometrics domain) | CAT/IRT literature: MFI gold standard | Directly informs diagnostic-value leg of policy; but measurement ≠ teaching — keep separate |
| 17 | HLR/decay models predict recall better than fixed schedules | **MODERATE** | Settles & Meeder 2016 (+45% error reduction); MEMORIZE 2019; FSRS benchmarks | A vNext memory model would improve scheduling; but HLR's deployment win was *engagement*, not measured learning |
| 18 | Repetition→incidental vocab learning (frequency effect) | **STRONG** | Uchihara et al. 2019 r=0.34; Webb/Uchihara/Yanagisawa meta 9-18% gains | Exposure rule (7/8) has real learning value, not just prerequisite bookkeeping |
| 19 | Spacing benefits *low-ability* learners most in the wild | **MODERATE** | MOOC spacing study (npj Sci Learn 2020): largest gains for lower-ability/less-engaged | Distribution is a safety net for struggling learners — reinforces retrieval priority |
| 20 | AI personalization of *content* improves L2 outcomes | **MODERATE** | Xu & Wang 2024 g=0.812; chatbot meta g=0.608; Wu 2024 System (context/instruction moderate effects) | Content-level adaptivity works; but these are content/interaction studies, not sequence-policy studies |
| 21 | Learned sequence policies (bandits/RL) beat rule policies on *learning* | **TENTATIVE→WEAK** | LinUCB study improved *completion* not learning; MathBot bandit ≈ random policy; offline-bandit work is retrospective | No demonstrated learning-gain superiority; high complexity + reward-hacking risk. Data-hungry |
| 22 | Meaning-focused input + output + form-focus + fluency balance (4 strands) | **MODERATE** | Nation 2007 framework; Swain output functions; task-repetition meta (fluency consistent) | Supports multimodal, multi-purpose curriculum already in kernel; argues against retrieval-only diets |
| 23 | Pushed output forces noticing/gap-detection | **MODERATE** | Swain 1985/1995; Izumi 2002 | Justifies production/interaction purposes beyond exposure+retrieval |
| 24 | Task repetition improves fluency (consistently), CAF mixed | **MODERATE** | TR meta-analysis 2025 | Fluency practice has real value but kernel has no fluency contract — keep FLUENT reserved |
| 25 | Vietnamese learners: final-consonant/cluster deletion, tense-lax vowels, stress-timing, articles/tense/word-order | **MODERATE** | Multiple phonology studies + EFL error literature | Use as *prior hypotheses* only — never diagnose an individual from population stats |
| 26 | Learner-controlled instruction improves cognitive outcomes | **CONTRADICTED/weak** | Karich 2014 meta: motivation yes, cognitive mixed/null | Full self-direction is not a defensible policy; bounded choice within pedagogical set may still help motivation |
| 27 | Fatigue degrades within-session performance; breaks/micro-sessions help | **TENTATIVE** | Vigilance literature; micro-break study; Guo 6-9min engagement optimum | No fatigue signal in kernel yet; session composition is an open design gap |
| 28 | Diagnostic probing has teaching value itself (pretesting effect) | **MODERATE** | Pretesting literature (test-before-study boosts later encoding) | Supports rule 8's diagnostic-probe-first design for new targets |

## What is NOT evidenced

- Any universal challenge percentage (85%, "desirable" difficulty
  threshold) — **UNSUPPORTED** for this domain.
- That engagement metrics proxy learning — **CONTRADICTED** by the
  engagement-vs-learning distinction running through Duolingo HLR,
  LinUCB, and product literature.
- That more personalization is always better — **UNSUPPORTED**;
  learner-control meta shows cognitive outcomes mixed.
- Expanding schedules as a requirement — **CONTRADICTED** as default.
- That vocabulary should be interleaved — **CONTRADICTED** for words
  specifically (Brunmair & Richter).

## Confidence statement

High-confidence pillars for policy design: retrieval>restudy, spacing,
CF-with-repair, frequency-driven exposure value, diagnostic probing.
Real contradictions/boundaries: interleaving is domain-limited, desirable
difficulty is load-limited, expanding schedules are not required,
immediate correction is not universally optimal, engagement≠learning,
and learned sequence policies have no demonstrated learning advantage.
