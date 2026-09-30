/*
 * vNext curriculum checks (issue #57, R5).
 *
 * The authoring gate for the capability DAG + mission/task content —
 * contracts.js proves a task is well-formed; THIS layer proves the
 * curriculum is honest:
 *
 *   1. DAG validity — no duplicate ids, no dangling prerequisites,
 *      no cycles (delegated to validateGraph).
 *   2. Mission validity — delegated to validateMission, plus the R5
 *      evidence package: every claim-bearing TARGET capability owes
 *      practiced, delayed, held-out transfer and fresh-assessment
 *      coverage. Carriers may be rehearsed but must not carry
 *      fresh_transfer tasks (that would masquerade a target claim).
 *   3. Novelty integrity — prompt families are canonical
 *      pf.<capability>.<cueTopology>.<setting>.<register>.<channel>.vN
 *      ids that re-derive the task's contextSignature; the same family
 *      cannot mean two signatures; two families for one capability
 *      cannot share a signature; fresh families can never alias a
 *      practiced family; and a transfer task's declared changed
 *      dimensions must differ from EVERY practiced family on real
 *      signature fields — not merely in wording.
 *
 * Everything here is pure data validation — it runs in tests and in
 * content tooling, never inside the mission runner's hot path.
 */
import {
  ELICITING_PURPOSES,
  SIGNATURE_ID_FIELDS,
  SIGNATURE_FIELDS,
  validateMission
} from './contracts.js';
import { validateGraph } from './capabilities.js';

/* R5: prefer ~2 acquisition targets per mission; more than 3 makes
 * causal attribution of evidence weak — treated as an authoring error
 * so mission authors must split instead of bloating. */
export const MAX_TARGETS_PER_MISSION = 3;

/* TRANSFER_DIMENSIONS are the contract's v0 vocabulary; the signature
 * fields they map to are what the novelty checker actually verifies.
 * 'support_level', 'task_goal' and 'delay' are not context fields —
 * a transfer declaring ONLY those is not a context transfer at all. */
export const TRANSFER_DIM_FIELD = {
  wording: 'cueTopology',
  partner: 'interlocutorRole',
  setting: 'setting',
  medium: 'channel',
  response_form: 'responseTopology'
};

/* Parse a canonical prompt-family id:
 *   pf.<capabilityId>.<cueTopology>.<setting>.<register>.<channel>.vN
 * The capability id itself contains dots, so the signature fields are
 * read from the tail: the last 5 segments are
 * cue/setting/register/channel/vN and everything before is the cap id. */
export function parseFamilyId(promptFamily) {
  if (typeof promptFamily !== 'string' || !promptFamily.startsWith('pf.')) return null;
  const m = promptFamily.slice(3).match(/\.v(\d+)$/);
  if (!m) return null;
  const segs = promptFamily.slice(3, promptFamily.length - m[0].length).split('.');
  if (segs.length < 5) return null;
  const [cueTopology, setting, register, channel] = segs.splice(-4);
  const capabilityId = segs.join('.');
  if (!capabilityId) return null;
  return { capabilityId, cueTopology, setting, register, channel, version: Number(m[1]) };
}

const sigKey = (sig) =>
  JSON.stringify(SIGNATURE_FIELDS.map((f) => sig?.[f] ?? null));

const familyClass = (t) => t.freshness?.familyClass ?? 'practiced';

export function checkCurriculum({ capabilities = [], missions = [], tasks = [] }) {
  const problems = [];
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  /* ── 1. DAG validity ─────────────────────────────────────── */
  for (const prob of validateGraph(capabilities)) problems.push(`graph: ${prob}`);

  /* ── 2. Mission validity + evidenceability ───────────────── */
  for (const mission of missions) {
    const tag = mission?.id ?? '?';
    for (const prob of validateMission(mission, tasks, capabilities)) problems.push(`${tag}: ${prob}`);

    const missionTasks = (mission?.taskIds ?? []).map((id) => taskById.get(id)).filter(Boolean);
    const targets = mission?.targetCapabilities ?? [];
    if (targets.length > MAX_TARGETS_PER_MISSION) {
      problems.push(`${tag}: ${targets.length} target capabilities — missions claim at most ${MAX_TARGETS_PER_MISSION} (prefer 2; split the rest into carriers or a later mission)`);
    }
    for (const capId of targets) {
      const capTasks = missionTasks.filter((t) => t.capabilityId === capId);
      const taught = capTasks.some((t) => ELICITING_PURPOSES.has(t.purpose) && familyClass(t) === 'practiced');
      if (!taught) problems.push(`${tag}: target '${capId}' has no practiced-family eliciting task — there is nothing to retain`);
      if (!capTasks.some((t) => t.purpose === 'delayed_retrieval')) {
        problems.push(`${tag}: target '${capId}' has no delayed_retrieval task — retention cannot be evidenced`);
      }
      if (mission?.transferPlan?.required && !capTasks.some((t) => familyClass(t) === 'fresh_transfer')) {
        problems.push(`${tag}: target '${capId}' has no fresh_transfer task — transfer cannot be evidenced`);
      }
      if (mission?.assessmentPlan?.required &&
          !missionTasks.some((t) => t.purpose === 'assessment' && (t.assessment?.capabilitySample ?? []).includes(capId))) {
        problems.push(`${tag}: target '${capId}' is not in any assessment capabilitySample — fresh assessment cannot be evidenced`);
      }
    }
    for (const capId of mission?.carrierCapabilities ?? []) {
      const capTasks = missionTasks.filter((t) => t.capabilityId === capId);
      if (!capTasks.length) {
        problems.push(`${tag}: carrier '${capId}' has no tasks — a dead declaration only invites planner intents the mission cannot serve`);
      }
      if (capTasks.some((t) => familyClass(t) === 'fresh_transfer')) {
        problems.push(`${tag}: carrier '${capId}' carries a fresh_transfer task — held-out transfer credit is reserved for claim-bearing targets`);
      }
    }
  }

  /* ── 3a. Signature presence + canonical family ids ───────── */
  for (const t of tasks) {
    const tag = `task '${t.id}'`;
    if (t.contextSignature == null) {
      problems.push(`${tag}: missing contextSignature — a family without an auditable signature cannot prove novelty`);
    }
    const fam = parseFamilyId(t.promptFamily);
    if (!fam) {
      problems.push(`${tag}: promptFamily '${t.promptFamily}' is not canonical pf.<cap>.<cue>.<setting>.<register>.<channel>.vN form`);
    } else {
      if (fam.capabilityId !== t.capabilityId) {
        problems.push(`${tag}: family id names capability '${fam.capabilityId}' but the task declares '${t.capabilityId}'`);
      }
      for (const f of SIGNATURE_ID_FIELDS) {
        if (t.contextSignature != null && fam[f] !== t.contextSignature[f]) {
          problems.push(`${tag}: family id ${f} '${fam[f]}' contradicts contextSignature.${f} '${t.contextSignature[f]}'`);
        }
      }
    }
  }

  /* ── 3b. Family coherence + per-capability novelty ───────── */
  const byFamily = new Map();
  for (const t of tasks) {
    if (!byFamily.has(t.promptFamily)) byFamily.set(t.promptFamily, []);
    byFamily.get(t.promptFamily).push(t);
  }
  for (const [fam, members] of byFamily) {
    const sigs = new Set(members.map((t) => sigKey(t.contextSignature)));
    if (sigs.size > 1) {
      problems.push(`prompt family '${fam}' spans ${sigs.size} different signatures — same-family tasks must describe the same context`);
    }
    const classes = new Set(members.map(familyClass));
    if (classes.size > 1) {
      problems.push(`prompt family '${fam}' mixes freshness classes (${[...classes].join(', ')}) — teaching and held-out testing cannot share a family`);
    }
  }

  const capIds = [...new Set(tasks.map((t) => t.capabilityId))];
  for (const capId of capIds) {
    const capTasks = tasks.filter((t) => t.capabilityId === capId);
    const sigByFamily = new Map();
    for (const t of capTasks) {
      if (!t.contextSignature) continue;
      const key = sigKey(t.contextSignature);
      const other = sigByFamily.get(key);
      if (other && other !== t.promptFamily) {
        problems.push(`capability '${capId}': families '${other}' and '${t.promptFamily}' have identical signatures — fake novelty`);
      } else {
        sigByFamily.set(key, t.promptFamily);
      }
    }
  }

  /* ── 3c. Transfer deltas must be real signature deltas ───── */
  for (const t of tasks.filter((t) => t.purpose === 'transfer')) {
    const dims = t.transfer?.changedDimensions ?? [];
    const mappable = dims.filter((d) => TRANSFER_DIM_FIELD[d]);
    if (!mappable.length) {
      problems.push(`transfer task '${t.id}' declares no signature-mappable changed dimension (${dims.join(', ') || 'none'}) — delay/support_level/task_goal alone are not a context transfer`);
      continue;
    }
    const practiced = tasks.filter(
      (p) => p.capabilityId === t.capabilityId && p.id !== t.id && familyClass(p) === 'practiced'
    );
    for (const d of mappable) {
      const field = TRANSFER_DIM_FIELD[d];
      if (!t.contextSignature?.[field]) {
        problems.push(`transfer task '${t.id}' declares '${d}' but its signature lacks '${field}'`);
        continue;
      }
      for (const p of practiced) {
        if (!p.contextSignature?.[field]) {
          problems.push(`practiced task '${p.id}' has no signature.${field} — transfer task '${t.id}' cannot prove its declared '${d}' delta against family '${p.promptFamily}'`);
          continue;
        }
        if (p.contextSignature[field] === t.contextSignature[field]) {
          problems.push(`transfer task '${t.id}' declares changed dimension '${d}' but signature.${field} '${t.contextSignature[field]}' equals practiced family '${p.promptFamily}' — the declared delta does not exist`);
        }
      }
    }
  }

  return problems;
}
