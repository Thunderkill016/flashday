/* Thin shim (mission 008C): canonicalization, hashing and freeze helpers
 * are production runtime code in src/vnext/next-for-you/canonical.js
 * (browser-safe, no node:crypto). The legacy 32-bit `hash` stays here —
 * it is only a non-provenance label, never used for digests. */
export { canon, sha256, deepFreezeAll, deepFreezeShallow } from '../../src/vnext/next-for-you/canonical.js';

/* Legacy 32-bit tag — kept only for non-provenance labels. Never use
 * for fingerprints or decision identity (collision-prone). */
export const hash = (o) => {
  const s = typeof o === 'string' ? o : JSON.stringify(o);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(36);
};
