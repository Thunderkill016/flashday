# 09 — Vietnamese L1 → English learner priors

**Usage rule: population tendencies are priors for *what to probe
first*, never diagnoses of an individual learner.** The learner model
diagnoses only from learner-specific evidence events; these priors may
inform curriculum ordering and which capabilities/functions to
instrument, nothing more.

## Phonological (strongest documented cluster)

Vietnamese phonology differs from English at exactly the points where
A1 listening/speaking tasks live:

- **Final consonants/clusters**: Vietnamese permits only unreleased
  /p, t, k/ and nasals in coda; English coda consonants and clusters
  are systematically deleted, glottalized, or vowel-inserted
  (Ha 2005; Schuberg/Masciarelli/Nguyen; Pham 2025 — 49.3% unreleased/
  glottalized variants). Comprehension consequence: spoken word-final
  morphology (plural -s, past -ed, possessive -'s) is hard to *hear*.
- **Consonant clusters**: clusters are absent in Vietnamese → cluster
  reduction in both perception and production (CTU case study).
- **Tense/lax vowel contrast** (ship/sheep type) — not contrastive in
  Vietnamese inventory.
- **Stress-timing vs syllable-timing**: Vietnamese is syllable-timed +
  tonal; English stress-timed rhythm and unstressed-syllable reduction
  are documented comprehension barriers.
- **Tonal-prosody transfer**: intonation contours interact with L1 tone
  space — reported but thinner evidence.

→ *Prior*: listening capabilities involving number/word-final morphology,
  reduced syllables, and cluster-bearing words deserve earlier and
  finer-grained probes. This matches existing `identify_spoken_number`
  function demand routing — the kernel's function attribution is exactly
  the right grain for this.

## Grammatical (moderate, classroom-EFL literature)

- **Articles** (a/an/the/zero): Vietnamese has no article system —
  determiner choice is a classic persistent L1-interference area.
- **Tense/aspect marking**: Vietnamese marks aspect lexically, not by
  obligatory tense inflection → tense marking and subject-verb
  agreement (3sg -s) are common error loci.
- **Word order**: Vietnamese SVO similar but NP-internal order differs
  (N-Adj vs Adj-N); classifier constructions differ.
- **Plural marking**: no obligatory plural → count/plural inflection
  weak.
- **Copula/auxiliary use**: differences in be/have/do support.

→ *Prior*: production/interaction tasks should attribute grammar
  functions at fine grain (e.g., `mark_plural`, `use_article`) so that
  errors open *attributed* gaps rather than generic failures.

## Pragmatic/behavioral

- **Confidence/face culture**: reluctance to produce publicly is
  documented in Vietnamese EFL contexts → production avoidance may
  masquerade as inability; interpret *missing* production evidence
  cautiously (absence ≠ inability).
- **Grammar-translation schooling background**: many adults arrive with
  explicit-rule knowledge but weak listening/speaking — the
  comprehension/modality split in the capability model is well-matched
  to this profile.

## What this does NOT justify

- No lower expectations, no watering-down, no "Vietnamese learners
  can't" — the evidence supports *probe placement* and *error
  attribution granularity*, not ability assumptions.
- No individual diagnosis from population stats — every prior above is
  a hypothesis to be confirmed or refuted per-learner by attributed
  evidence (exactly what `missingFunctions` provides).
