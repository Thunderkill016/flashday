import assert from 'node:assert/strict';
import { checkTimeGate, formatMinutes, parseDeclaredTime } from '../src/core/time-gate.js';

const gate = { type: 'time', expected: '7:00', strict: false };
const text = 'I start work at 7.';

assert.equal(parseDeclaredTime('7'), 7 * 60);
assert.equal(parseDeclaredTime('7:00'), 7 * 60);
assert.equal(parseDeclaredTime('seven'), 7 * 60);
assert.equal(parseDeclaredTime('seven thirty'), 7 * 60 + 30);
assert.equal(parseDeclaredTime('7 pm'), 19 * 60);
assert.equal(formatMinutes(7 * 60), '07:00');

// pass: 7 and 'seven' both normalise to 07:00 and the text mentions the time
assert.equal(checkTimeGate({ gate, declaredTime: '7', responseText: text }).ok, true);
assert.equal(checkTimeGate({ gate, declaredTime: 'seven', responseText: 'It is at seven.' }).ok, true);
// fail: wrong hour, unparseable minutes
assert.equal(checkTimeGate({ gate, declaredTime: '6', responseText: text }).ok, false);
assert.equal(checkTimeGate({ gate, declaredTime: '7:99', responseText: text }).ok, false);
// strict mode: '7 am' (07:00) must not satisfy a 19:00 gate
const strict = { type: 'time', expected: '19:00', strict: true };
assert.equal(checkTimeGate({ gate: strict, declaredTime: '7 am', responseText: 'I finish at 7.' }).ok, false);
assert.equal(checkTimeGate({ gate: strict, declaredTime: '19:00', responseText: 'I finish at 19:00.' }).ok, true);
// non-strict: 19:00 ≡ 7:00 mod 12
assert.equal(checkTimeGate({ gate, declaredTime: '19:00', responseText: 'I start at 19:00.' }).ok, true);
// declared time must appear in the response text
assert.equal(checkTimeGate({ gate, declaredTime: '7', responseText: 'I like coffee.' }).ok, false);
// no gate → always ok
assert.equal(checkTimeGate({ gate: null, declaredTime: '', responseText: '' }).ok, true);

console.log('FlashDay time gate: 12 checks passed');
