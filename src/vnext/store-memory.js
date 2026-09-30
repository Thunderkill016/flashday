/*
 * vNext in-memory stores (issue #55).
 *
 * The session controller talks to two store shapes so the same contract
 * stack runs headless in tests, against localStorage in the dev page,
 * or against Firestore via persist.js:
 *
 *   eventStore.append(events) → { appended, deduped }
 *       identical re-delivery dedupes; same id + different content
 *       throws — evidence identity is not last-write-wins.
 *   eventStore.list() → events sorted (occurredAt, id)
 *
 *   runStore.getOpenRun(learnerId, missionId) → run | null
 *   runStore.saveRun(run) → run
 *
 * Runs are bookkeeping (status changes), not evidence — the mutable run
 * record never lives inside the append-only event log.
 */

const FINGERPRINT_FIELDS = [
  'id', 'learnerId', 'capabilityId', 'taskId', 'taskRevision', 'eventType',
  'modality', 'occurredAt', 'context', 'attempt', 'support', 'feedback',
  'evaluation', 'binding', 'missionRunId'
];

export function eventFingerprint(event) {
  return JSON.stringify(FINGERPRINT_FIELDS.map((k) => [k, event?.[k] ?? null]));
}

export function createMemoryEventStore(seed = []) {
  const byId = new Map();
  const store = {
    async append(events) {
      let appended = 0;
      let deduped = 0;
      for (const event of events) {
        const existing = byId.get(event.id);
        if (existing) {
          if (eventFingerprint(existing) !== eventFingerprint(event)) {
            throw new Error(`event conflict '${event.id}' — same id, different content; refusing to overwrite evidence`);
          }
          deduped++;
          continue;
        }
        byId.set(event.id, event);
        appended++;
      }
      return { appended, deduped };
    },
    async list() {
      return [...byId.values()].sort(
        (a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      );
    },
    async clear() { byId.clear(); }
  };
  if (seed.length) {
    for (const e of seed) byId.set(e.id, e);
  }
  return store;
}

export function createMemoryRunStore(seed = []) {
  const byId = new Map();
  for (const r of seed) byId.set(r.id, r);
  return {
    async getOpenRun(learnerId, missionId) {
      const open = [...byId.values()]
        .filter((r) => r.learnerId === learnerId && r.missionId === missionId && r.status === 'open')
        .sort((a, b) => a.startedAt - b.startedAt || (a.id < b.id ? -1 : 1));
      return open[open.length - 1] ?? null;
    },
    async getRun(runId) {
      return byId.get(runId) ?? null;
    },
    async saveRun(run) {
      byId.set(run.id, { ...run });
      return byId.get(run.id);
    },
    async list(learnerId) {
      return [...byId.values()].filter((r) => !learnerId || r.learnerId === learnerId);
    }
  };
}
