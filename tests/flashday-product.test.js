const assert=require('assert');
const P=require('../flashday-product.js');

{
  const unit=P.normalizeUnitDraft({
    target:'  I am on my way. ',meaning:' đang trên đường ',type:'chunk',
    contexts:['message'],intent:'báo đang tới',canDo:'Tôi có thể báo người đang chờ.',origin:'curated'
  });
  assert.strictEqual(unit.target,'I am on my way.');
  assert.strictEqual(unit.intent,'báo đang tới');
  assert.strictEqual(unit.origin,'curated');
}

{
  assert.throws(()=>P.normalizeUnitDraft({target:'',meaning:'x'}),/bắt buộc/i);
  const response=P.responseForMode('write',{text:'  I am on my way.  ',spoke:true});
  assert.deepStrictEqual(response,{text:'I am on my way.',spoke:true,recordedLocally:false});
}

{
  assert.strictEqual(P.hasObservableAttempt('listen',{text:'Tôi đang tới.'}),true);
  assert.strictEqual(P.hasObservableAttempt('read',{text:'   '}),false);
  assert.strictEqual(P.hasObservableAttempt('write',{text:'I am on my way.'}),true);
  assert.strictEqual(P.hasObservableAttempt('speak',{spoke:false,recordedLocally:true}),false);
  assert.strictEqual(P.hasObservableAttempt('speak',{spoke:true}),true);
  assert.strictEqual(P.isRevealShortcut({key:'Enter',ctrlKey:true}),true);
  assert.strictEqual(P.isRevealShortcut({key:'Enter',metaKey:true}),true);
  assert.strictEqual(P.isRevealShortcut({key:'Enter',ctrlKey:true,isComposing:true}),false);
  assert.strictEqual(P.isRevealShortcut({key:'Space',ctrlKey:true}),false);
}

{
  const review=P.reviewPayload({id:'r1',mode:'speak',cardId:'c1',unitIds:['u1'],ratings:{u1:3},answeredAt:2000},{spoke:true,recordedLocally:true});
  assert.strictEqual(review.response.spoke,true);
  assert.strictEqual(review.response.recordedLocally,true);
  assert.strictEqual(review.answeredAt,2000);
}

// ── Error loop: deterministic word-diff classification ─────────────────

const UNITS=[{unitId:'u1',label:'on my way',forms:['on my way','on the way']}];

{
  // exact: contractions normalize so "I'm on my way." === "I am on my way."
  const cls=P.classifyAttempt('I am on my way.',"I'm on my way",UNITS);
  assert.strictEqual(cls.stage,'exact');
  assert.strictEqual(cls.corrected,true);
  assert.deepStrictEqual(cls.errorTypes,[]);
}

{
  // missing target: attempt drops the tagged unit entirely
  const cls=P.classifyAttempt('I am on my way.','I am coming.',UNITS);
  assert.strictEqual(cls.stage,'miss');
  assert.strictEqual(cls.missingUnits.includes('u1'),true);
  assert.strictEqual(cls.errorTypes.includes('missing-target'),true);
  assert.strictEqual(cls.corrected,false);
  assert.match(P.primaryErrorHint(cls,UNITS),/on my way|on the way/);
}

{
  // accepted variant "on the way" counts as target produced — the my→the
  // substitution stays a 'close' surface diff, never missing-target
  const cls=P.classifyAttempt('I am on my way.','I am on the way.',UNITS);
  assert.strictEqual(cls.stage,'close');
  assert.strictEqual(cls.corrected,true);
  assert.strictEqual(cls.errorTypes.includes('missing-target'),false);
  assert.strictEqual(cls.errorTypes.includes('word-form'),true);
}

{
  // word substitution is one 'sub', not drop+insert
  const cls=P.classifyAttempt('She is running late.','She is coming late.',[]);
  assert.strictEqual(cls.stage,'close');
  assert.strictEqual(cls.errorTypes.includes('word-form'),true);
  const sub=cls.ops.find((op)=>op.type==='sub');
  assert.deepStrictEqual({expected:sub.expected,actual:sub.actual},{expected:'running',actual:'coming'});
}

{
  // pure reorder → word-order, not missing/extra
  const cls=P.classifyAttempt('I am on my way.','my on way I am.',UNITS);
  assert.strictEqual(cls.stage,'miss');
  assert.strictEqual(cls.errorTypes.includes('word-order'),true);
  assert.strictEqual(cls.errorTypes.includes('word-form'),false);
  assert.strictEqual(cls.errorTypes.includes('missing-words'),false);
}

{
  const empty=P.classifyAttempt('Hello.','   ',UNITS);
  assert.strictEqual(empty.stage,'empty');
  assert.strictEqual(empty.corrected,false);

  // normalizeError clamps junk before it reaches the append-only log
  const err=P.normalizeError({stage:'miss',types:['missing-target','nonsense','word-form'],missedUnits:['u1',''],firstAttempt:'x',finalAttempt:'y',corrected:true,retryCount:99});
  assert.deepStrictEqual(err.types,['missing-target','word-form']);
  assert.deepStrictEqual(err.missedUnits,['u1']);
  assert.strictEqual(err.retryCount,9);
}

console.log('FlashDay product contract: 10 checks passed');
