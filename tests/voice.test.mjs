import assert from 'node:assert/strict';
import { pickEnglishVoice } from '../src/ui/views/runner.js';

const voice = (name, lang) => ({ name, lang });
const voices = [voice('Zulu', 'en-GB'), voice('Zulu', 'en-US'), voice('Alpha', 'en-US'), voice('French', 'fr-FR')];
assert.equal(pickEnglishVoice(voices).name, 'Alpha');
assert.equal(pickEnglishVoice([...voices].reverse()).name, 'Alpha');
assert.equal(pickEnglishVoice([voice('Other', 'en-AU'), voice('British', 'en_GB')]).name, 'British');
assert.equal(pickEnglishVoice([voice('Other', 'en-AU')]).name, 'Other');
assert.equal(pickEnglishVoice([voice('French', 'fr-FR')]), null);
assert.equal(pickEnglishVoice([]), null);
