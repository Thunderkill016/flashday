/* Small shared helpers for the experiment layer. */

export function deepFreezeShallow(o) {
  if (o && typeof o === 'object') Object.freeze(o);
  return o;
}

export const hash = (o) => {
  const s = typeof o === 'string' ? o : JSON.stringify(o);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(36);
};
