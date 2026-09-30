/*
 * vNext localStorage-backed stores (issue #55).
 *
 * Same shapes as store-memory.js so the dev page and tests share the
 * contract. Keys are per-learner: `fd.vnext.{learnerId}.events` holds
 * the append-only log, `fd.vnext.{learnerId}.runs` the run records.
 * The append path dedupes identical re-deliveries and throws on
 * same-id/different-content — matching persist.js semantics.
 */
import { eventFingerprint, decisionFingerprint } from '../store-memory.js';

const eventsKey = (learnerId) => `fd.vnext.${learnerId}.events`;
const runsKey = (learnerId) => `fd.vnext.${learnerId}.runs`;

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export function createLocalEventStore(learnerId) {
  const key = eventsKey(learnerId);
  return {
    async append(events) {
      const byId = new Map(readJson(key, []).map((e) => [e.id, e]));
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
      writeJson(key, [...byId.values()]);
      return { appended, deduped };
    },
    async list() {
      const events = readJson(key, []);
      events.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return events;
    },
    async clear() {
      localStorage.removeItem(key);
    }
  };
}

export function createLocalRunStore(learnerId) {
  const key = runsKey(learnerId);
  const all = () => readJson(key, []);
  return {
    async getOpenRun(_learnerId, missionId) {
      const open = all()
        .filter((r) => r.missionId === missionId && r.status === 'open')
        .sort((a, b) => a.startedAt - b.startedAt || (a.id < b.id ? -1 : 1));
      return open[open.length - 1] ?? null;
    },
    async getRun(runId) {
      return all().find((r) => r.id === runId) ?? null;
    },
    async saveRun(run) {
      const runs = all().filter((r) => r.id !== run.id);
      runs.push({ ...run });
      writeJson(key, runs);
      return run;
    },
    async list() {
      return all();
    }
  };
}

/* 008C §11: consumed-decision audit trail — same append-only contract
 * as the event store, keyed by decisionId. */
export function createLocalDecisionStore(learnerId) {
  const key = `fd.vnext.${learnerId}.decisions`;
  const all = () => readJson(key, []);
  return {
    async append(record) {
      const byId = new Map(all().map((r) => [r.decisionId, r]));
      const existing = byId.get(record.decisionId);
      if (existing) {
        if (decisionFingerprint(existing) !== decisionFingerprint(record)) {
          throw new Error(`decision conflict '${record.decisionId}' — same id, different content; refusing to overwrite audit`);
        }
        return { appended: 0, deduped: 1 };
      }
      byId.set(record.decisionId, record);
      writeJson(key, [...byId.values()]);
      return { appended: 1, deduped: 0 };
    },
    async list() {
      return all().sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0) || (a.decisionId < b.decisionId ? -1 : 1));
    },
    async clear() {
      localStorage.removeItem(key);
    }
  };
}
