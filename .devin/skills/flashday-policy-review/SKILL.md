---
name: flashday-policy-review
description: Counterexample-first review for FlashDay semantic/state-machine work — vNext learner-state, evidence, policy, correction, curriculum, and claim-bearing semantics
triggers:
  - user
  - model
permissions:
  deny:
    - edit
    - mcp__github-mcp-server__merge_pull_request
    - mcp__github-mcp-server__push_files
    - mcp__github-mcp-server__create_or_update_file
    - mcp__github-mcp-server__delete_file
    - mcp__vercel__*
---

Review FlashDay semantic and state-machine changes by falsification, not
assent. Apply this to `src/vnext/` learner-state, evidence, policy,
correction, curriculum, the FSRS learning core, and anything that mints
a claim about the learner.

## Method

Read the invariant's source of truth first (ADR, mission file, contract
test). Then hunt for a counterexample in code, data, and tests — write
the failing test, or explain precisely why the case cannot occur. Only
after that search may you accept a claim.

## Output format — required, per claim

```
CURRENT CLAIM          what the code/spec asserts, stated precisely
INVARIANT              the rule it must preserve (cite file/doc)
COUNTEREXAMPLE         a concrete input/state that would break it —
                       search for one before accepting anything
PROOF OBLIGATION       what must actually be shown (not what was shown)
FAILURE MODE           how it fails in production if the claim is wrong
MINIMAL PATCH          the smallest change that closes the gap
ADVERSARIAL REGRESSION the test that would have caught it — name the
                       exact file it belongs in
CONTROL-POLICY PARITY  whether the control path and the policy path
                       behave identically where they must; any
                       divergence is a finding
WHAT THIS PROVES       the claim the evidence genuinely supports
WHAT THIS DOES NOT PROVE the claim it cannot support
```

## Rejected reasoning — findings, not debatable

- "The task exists in the registry ⇒ it is reachable." Registration is
  not reachability; trace the serve path end to end.
- "Tests are green ⇒ semantics are correct." Tests prove only what they
  assert; name the invariant they do NOT assert.
- "A state was served once ⇒ it can be served again." Prove re-emission
  by the scheduler/policy, not a single path.
- "No counterexample found ⇒ none exists." Report the search you ran —
  the cases enumerated, the inputs tried — never the time spent.
- Reviewer agreement is not proof. Two readers missing the same case is
  still one missed case.
