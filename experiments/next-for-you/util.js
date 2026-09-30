/* Small shared helpers for the experiment layer. */
import { createHash } from 'node:crypto';

export function deepFreezeShallow(o) {
  if (o && typeof o === 'object') Object.freeze(o);
  return o;
}

/* Legacy 32-bit tag — kept only for non-provenance labels. Never use
 * for fingerprints or decision identity (collision-prone). */
export const hash = (o) => {
  const s = typeof o === 'string' ? o : JSON.stringify(o);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(36);
};

/* Canonical JSON: object keys sorted recursively so equal semantic
 * content always serializes identically regardless of field order. */
export function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
}

/* Collision-resistant digest (SHA-256) over the canonical form — the
 * correct tool for provenance identity. "Collision-resistant", not
 * "impossible". */
export const sha256 = (v) => createHash('sha256').update(canon(v)).digest('hex');

/* Deep freeze — for append-only log records. */
export function deepFreezeAll(o) {
  if (o && typeof o === 'object') {
    for (const v of Object.values(o)) deepFreezeAll(v);
    Object.freeze(o);
  }
  return o;
}
