const assert=require('assert');
const D=require('../flashday-data.js');
const L=require('../learning-entry.js');
const SC=require('../source-capture.js');
const TI=require('../transcript-import.js');
const C=require('../flashday-cloud.js');

{
  const db=D.createInitialDb([],1000);
  const profile=L.ensureProfile(db);
  assert.equal(profile.skills.listen.level,null);
  L.setSkillLevel(db,'listen','A1',{now:1100});
  L.setSkillLevel(db,'read','A2',{now:1200});
  assert.equal(L.effectiveLevel(db.learningProfile,'listen'),'A1');
  assert.equal(L.effectiveLevel(db.learningProfile,'read'),'A2');
  assert.equal(db.learningProfile.skills.listen.basis,'self-reported');
  assert.equal(db.learningProfile.updatedAt,1200);
}

{
  const db=D.createInitialDb([],1000);
  L.setSkillLevel(db,'read','A2',{now:1100});
  assert.equal(L.assessContent(db.learningProfile,{skill:'read',contentLevel:'A2'}).status,'comfortable');
  assert.equal(L.assessContent(db.learningProfile,{skill:'read',contentLevel:'B1'}).status,'bridge');
  assert.equal(L.assessContent(db.learningProfile,{skill:'read',contentLevel:'B2'}).status,'stretch');
  assert.equal(L.assessContent(db.learningProfile,{skill:'listen',contentLevel:'B1'}).status,'unknown');
}

{
  const items=[
    {id:'u1',target:'Could you say that again?',forms:[],accepted:['Could you repeat that?'],meaning:'xin nói lại'},
    {id:'u2',target:"I'm on my way.",forms:['I am on my way.'],accepted:[],meaning:'đang trên đường'}
  ];
  assert.deepEqual(L.matchUnitsInText(items,'Could you repeat that?'),[], 'accepted synonyms must not define Unit identity');
  assert.deepEqual(L.matchUnitsInText(items,'I am on my way.').map(x=>x.unitId),['u2'], 'explicit forms must match the same Unit');
  // Canonical matching: contraction target ≡ expanded sentence, punctuation
  // inside a stored form cannot block a mid-sentence match, and word
  // boundaries are inherent (no 'art' inside 'started').
  assert.deepEqual(L.matchUnitsInText(items,"Wait, I am on my way to work.").map(x=>x.unitId),['u2'], 'contraction target must match expanded surface form mid-sentence');
  assert.deepEqual(L.matchUnitsInText([{id:'a',target:'art',forms:[],accepted:[]}],'She started the cart race.'),[], 'word boundary must block partial-token matches');
}

{
  const db=D.createInitialDb(undefined,1000);
  const before=db.items.length;
  const first=L.installGuidedModule(db,'a1-communication-repair',D);
  assert.equal(first.reused.length,1, 'seed say-again should be reused');
  assert.equal(first.added.length,3);
  assert.equal(db.items.length,before+3);
  assert(first.added.every(item=>item.origin==='curated'), 'guided units must stay compatible with cloud origin constraint');
  const second=L.installGuidedModule(db,'a1-communication-repair',D);
  assert.equal(second.added.length,0, 'guided install must be idempotent');
  assert.equal(second.state.installed,4);
  const installed=L.moduleState(db,'a1-communication-repair');
  assert.equal(installed.complete,true);
  db.events.push({id:'e1',unitIds:['say-again'],answeredAt:2000});
  assert.equal(L.moduleState(db,'a1-communication-repair').practiced,1);
}

{
  const db=D.createInitialDb(undefined,1000);
  const before=db.items.length;
  const stateBefore=L.clusterState(db,'a1-meeting-change');
  assert.equal(stateBefore.total,6, 'beginner path requires only its six core expressions');
  assert.equal(stateBefore.installed,1, 'existing say-again is reused');
  const result=L.installGuidedCluster(db,'a1-meeting-change',D);
  assert.equal(result.added.length,5);
  assert.equal(result.reused.length,1);
  assert.equal(db.items.length,before+5);
  assert.equal(result.state.complete,true);
  assert.equal(L.modulesForCluster('a1-meeting-change').length,1);
}

{
  const db=D.createInitialDb([],1000);
  assert.throws(()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer'}),/viết câu trả lời|nói thành tiếng/i);
  const attempt=L.submitTransferAttempt(db,{
    id:'transfer-1',missionId:'a1-meeting-change-transfer',responseText:'No problem. See you at seven.',declaredFinalTime:'seven',selfReviewed:true
  },2000);
  assert.equal(attempt.submittedAt,2000);
  assert.equal(db.transferAttempts.length,1);
  const state=L.missionState(db,'a1-meeting-change-transfer');
  assert.equal(state.attempts,1);
  assert.equal(state.hasSelfReview,true);
  assert.equal(attempt.grading,'self-check');
}

// Final-time gate (structured): the declared time must equal the
// SCENARIO's agreed time (expectedFinalTime:'7:00') and appear in the
// response. "See you at six" + declare 6 only proves the inputs match —
// not that the learner understood the agreed time is seven.
{
  const db=D.createInitialDb([],1000);
  // Missing declaration
  assert.throws(
    ()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'No problem. See you at seven.'}),
    /giờ cuối cùng/i
  );
  // Declared a different time than the scenario agreed → rejected even if
  // the response consistently states it (counter-proposal is a separate
  // mission, not this can-do).
  assert.throws(
    ()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'See you at six.',declaredFinalTime:'6'}),
    /giờ cuối cùng trong tình huống/i
  );
  assert.throws(
    ()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'How about eight? See you at eight.',declaredFinalTime:'8 pm'}),
    /giờ cuối cùng trong tình huống/i
  );
  // Declared seven but response never states it
  assert.throws(
    ()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'No problem, that is fine.',declaredFinalTime:'seven'}),
    /chưa xác nhận giờ/i
  );
  // Non-times cannot satisfy the gate
  assert.throws(
    ()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'I have two cats.',declaredFinalTime:'two'}),
    /giờ cuối cùng trong tình huống|chưa xác nhận/i
  );
  const ok=L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'No problem. See you at seven then.',declaredFinalTime:'7'});
  assert.equal(ok.finalTime,'7:00');
  assert.equal(ok.scenarioTimeMatch,true);
  assert.equal(ok.grading,'self-check');
  // The model-answer pattern "Seven works for me." must pass — the hour
  // word as subject confirms the time.
  const verb=L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'Seven works for me.',declaredFinalTime:'seven'});
  assert.equal(verb.finalTime,'7:00');
  // A bare digit in a non-time position does not confirm anything.
  assert.throws(
    ()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'I have 7 cats.',declaredFinalTime:'7'}),
    /chưa xác nhận giờ/i
  );
  // Loose 12h compare: the scenario says "seven" without am/pm, so both
  // meridiem spellings satisfy it.
  const pm=L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'Great. See you at 7 pm.',declaredFinalTime:'19:00'});
  assert.equal(pm.finalTime,'19:00');
  // Spoken-only: declared time still required and must match the scenario.
  assert.throws(()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',spoke:true}),/giờ cuối cùng/i);
  assert.throws(()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',spoke:true,declaredFinalTime:'8'}),/tình huống/i);
  const spoken=L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',spoke:true,declaredFinalTime:'19:00'});
  assert.equal(spoken.finalTime,'19:00');
  assert.equal(spoken.scenarioTimeMatch,true);
}

// Meridiem strictness: only when the scenario pins am/pm does '7 am'
// fail against a '7 pm' agreement.
{
  const strictMission={expectedFinalTime:'19:00',meridiemStrict:true};
  const looseMission={expectedFinalTime:'19:00',meridiemStrict:false};
  // Loose: 'seven' ↔ 19:00 acceptable (scenario didn't specify am/pm).
  assert.equal(L.checkFinalTimeConfirm(looseMission,{declaredFinalTime:'seven'}).ok,true);
  // Strict: declaring '7 am' against a '7 pm' scenario must fail.
  assert.equal(L.checkFinalTimeConfirm(strictMission,{declaredFinalTime:'7 am'}).ok,false);
  assert.equal(L.checkFinalTimeConfirm(strictMission,{declaredFinalTime:'7 pm'}).ok,true);
  // Strict also applies to the response text.
  assert.equal(L.checkFinalTimeConfirm(strictMission,{declaredFinalTime:'7 pm',responseText:'See you at 7 am.'}).ok,false);
  assert.equal(L.confirmsTime('See you at 7 am.','19:00',true),false);
  assert.equal(L.confirmsTime('See you at 7 am.','19:00',false),true);
}

{
  // Clock-time extraction — time positions only.
  assert.deepEqual(L.extractClockTimes('See you at seven.'),['7:00']);
  assert.deepEqual(L.extractClockTimes('See you at 7 pm.'),['19:00']);
  assert.deepEqual(L.extractClockTimes('How about 8:30?'),['8:30']);
  assert.deepEqual(L.extractClockTimes('Can we move it to four thirty?'),['4:30']);
  assert.deepEqual(L.extractClockTimes('Sounds good, noon works.'),['12:00']);
  // Hour word as the subject naming the agreed time — this pattern is in
  // the model answer itself ("Seven works for me.").
  assert.deepEqual(L.extractClockTimes('Seven works for me.'),['7:00']);
  assert.deepEqual(L.extractClockTimes('Eight thirty is fine.'),['8:30']);
  assert.deepEqual(L.extractClockTimes('See you at seven thirty pm.'),['19:30']);
  assert.deepEqual(L.extractClockTimes('I have two cats.'),[]);
  // Bare digits are no longer enough — position matters for digits too.
  assert.deepEqual(L.extractClockTimes('I have 7 cats.'),[]);
  assert.deepEqual(L.extractClockTimes('My phone is 12345.'),[]);
  // Malformed times are not truncated into valid-looking ones.
  assert.deepEqual(L.extractClockTimes('See you at 7:99.'),[]);
  assert.deepEqual(L.extractClockTimes('Sorry, I am not sure that works for me.'),[]);
  assert.deepEqual(L.extractClockTimes(''),[]);
  // Standalone time-input parsing for the declared-final-time field.
  assert.equal(L.parseTimeInput('seven'),'7:00');
  assert.equal(L.parseTimeInput('seven pm'),'19:00');
  assert.equal(L.parseTimeInput('7:30'),'7:30');
  assert.equal(L.parseTimeInput('7 pm'),'19:00');
  assert.equal(L.parseTimeInput('four thirty'),'4:30');
  assert.equal(L.parseTimeInput('half past four'),'4:30');
  assert.equal(L.parseTimeInput('quarter to seven'),'6:45');
  assert.equal(L.parseTimeInput('noon'),'12:00');
  assert.equal(L.parseTimeInput('7:99'),null);
  assert.equal(L.parseTimeInput('abc'),null);
  assert.equal(L.parseTimeInput(''),null);
}

// Lesson dialogue integrity: cold input exists for the meeting cluster,
// every line has a translation, and its final time differs from the
// worked example / mission (seven) so the mission stays unmemorized.
{
  const lesson=L.LESSON_DIALOGUES['a1-meeting-change'];
  assert.ok(lesson,'lesson dialogue for a1-meeting-change');
  assert.ok(lesson.sourceId&&lesson.title);
  assert.ok(lesson.lines.length>=6);
  for(const [text,translation] of lesson.lines){
    assert.ok(text&&text.trim(),'lesson line needs English text');
    assert.ok(translation&&translation.trim(),'lesson line needs a Vietnamese translation');
  }
  const joined=lesson.lines.map(([t])=>t.toLowerCase()).join(' ');
  assert.equal(joined.includes('seven'),false,'lesson must not pre-teach the mission answer');
  assert.ok(joined.includes('four'),'lesson should establish its own final time');
}

{
  const db=D.createInitialDb([],1000);
  D.addItem(db,{id:'way',target:"I'm on my way.",meaning:'đang trên đường',forms:['I am on my way.'],exampleSentence:"I'm on my way.",exampleTranslation:'Tôi đang trên đường.'});
  const segments=[{start:5,end:7,text:"I'm on my way.",translation:'Tôi đang trên đường.'}];
  const result=TI.importIntoDb(db,segments,{
    sourceId:'yt-demo',sourceKind:'youtube',sourceTitle:'Demo video',estimatedLevel:'A2',url:'https://youtube.com/watch?v=demo',
    resolveUnitIds:(sentence)=>L.matchUnitsInText(db.items,sentence).map(match=>match.unitId)
  });
  assert.equal(result.added,1);
  assert.equal(result.linkedSegments,1);
  assert.deepEqual(result.linkedUnitIds,['way']);
  const capture=db.captures[0];
  assert.equal(capture.sourceKind,'youtube');
  assert.equal(capture.sourceTitle,'Demo video');
  assert.equal(capture.estimatedLevel,'A2');
  assert.deepEqual(capture.linkedUnitIds,['way']);
  const snapshot=SC.sourceSnapshot(capture);
  assert.deepEqual(snapshot.linkedUnitIds,['way']);
  assert.equal(snapshot.sourceKind,'youtube');
}

{
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.'}).sourceKind,'manual');
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.',url:'https://youtu.be/demo'}).sourceKind,'youtube');
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.',subtitleFileName:'demo.srt'}).sourceKind,'transcript');
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.',audio:{ref:'hello.mp3'}}).sourceKind,'audio');
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.',sourceKind:'article',url:'https://example.com/post'}).sourceKind,'article');
}

{
  const local={learningProfile:{updatedAt:2000,skills:{read:{level:'A2'}}}};
  const remote={learningProfile:{updatedAt:1000,skills:{read:{level:'A1'}}}};
  assert.equal(C.mergeLearningProfile(local.learningProfile,remote.learningProfile).skills.read.level,'A2');
  remote.learningProfile.updatedAt=3000;
  assert.equal(C.mergeLearningProfile(local.learningProfile,remote.learningProfile).skills.read.level,'A1');
}

{
  const db=D.createInitialDb([],1000);
  L.setOverallLevel(db,'A1',{now:1200});
  const migrated=D.migrateDb(JSON.parse(JSON.stringify(db)),2000);
  assert.equal(migrated.learningProfile.overallLevel,'A1');
}

{
  // Delayed per-unit transfer: derives ONE task per unit from its first
  // UNASSISTED successful Write event, due the next day — never sooner.
  const DAY=24*60*60*1000;
  const T0=1_700_000_000_000;
  const db=D.createInitialDb([],1000);
  const item=D.addItem(db,{target:'on my way',meaning:'đang trên đường'});
  assert.equal(L.dueUnitTransfer(db,T0+2*DAY),null,'no write event → no transfer task');
  db.events=[{id:'e1',mode:'write',cardId:'c1',unitIds:[item.id],ratings:{[item.id]:3},answeredAt:T0}];
  assert.equal(L.dueUnitTransfer(db,T0+3600000),null,'transfer must not be available before the delay');
  assert.equal(L.dueUnitTransfer(db,T0+DAY-1),null);
  const due=L.dueUnitTransfer(db,T0+DAY);
  assert.equal(due.unitId,item.id);
  assert.equal(due.sourceEventId,'e1');
  assert.equal(due.dueAt,T0+DAY);
  const attempt=L.submitUnitTransferAttempt(db,{unitId:item.id,sourceEventId:'e1',responseText:'I was on my way home when it rained.',selfReviewed:true},T0+DAY+1000);
  assert.equal(attempt.kind,'unit');
  assert.equal(attempt.unitId,item.id);
  assert.equal(attempt.sourceEventId,'e1');
  assert.equal(L.dueUnitTransfer(db,T0+DAY+1000),null,'a submitted unit transfer must not reappear');
  assert.throws(()=>L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:'again.'},T0+DAY+2000),/đã được lưu/);
}

{
  // Unit-use gate: a transfer that never produces the target cannot close
  // the produce step. Accepted/forms variants still count as the unit.
  const T0=1_700_000_000_000;
  const db=D.createInitialDb([],1000);
  const item=D.addItem(db,{target:'on my way',meaning:'đang trên đường',forms:['I am on my way']});
  db.events=[{id:'e1',mode:'write',cardId:'c1',unitIds:[item.id],ratings:{[item.id]:3},answeredAt:T0}];
  assert.throws(
    ()=>L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:'I went home early yesterday.'}),
    /chưa dùng/,'a sentence without the unit is not a transfer'
  );
  const ok=L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:'Sorry, I am on my way now.'});
  assert.equal(ok.unitId,item.id,'a form variant satisfies the unit-use gate');
}

{
  // F5: a verbatim copy of the unit's stored example is recall, not transfer —
  // the produce step needs a sentence carrying NEW detail.
  const T0=1_700_000_000_000;
  const db=D.createInitialDb([],1000);
  const item=D.addItem(db,{target:"I'm on my way.",meaning:'đang trên đường',
    exampleSentence:"I'm on my way. I'll be there in ten minutes."});
  db.events=[{id:'e1',mode:'write',cardId:'c1',unitIds:[item.id],ratings:{[item.id]:3},answeredAt:T0}];
  assert.throws(
    ()=>L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:"I'm on my way. I'll be there in ten minutes."}),
    /trùng nguyên/,'verbatim copy of the example is not a new production'
  );
  assert.throws(
    ()=>L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:"So — I'm on my way. I'll be there in ten minutes."}),
    /trùng nguyên/,'copy + padding is still a copy'
  );
  const ok=L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:"Sorry, I'm on my way to the airport — traffic is bad."});
  assert.equal(ok.unitId,item.id,'a sentence with changed detail passes');
}

{
  // Evidence-first eligibility: when an event carries the M3 split, the
  // unaidedUnits list is the authority — self-report cannot launder aided
  // recall into a transfer trigger.
  const DAY=24*60*60*1000,T0=1_700_000_000_000;
  const db=D.createInitialDb([],1000);
  const item=D.addItem(db,{target:'on my way',meaning:'đang trên đường'});
  // self-rated Good but evidence says the unit was produced only after aid
  db.events=[{id:'e1',mode:'write',cardId:'c1',unitIds:[item.id],ratings:{[item.id]:3},answeredAt:T0,
    evidence:{kind:'word-diff',aided:true,unaidedUnits:[],aidedUnits:[item.id]}}];
  assert.equal(L.dueUnitTransfer(db,T0+2*DAY),null,'aided-evidence units must not trigger transfer even when rated Good');
  db.events[0].evidence={kind:'word-diff',aided:false,unaidedUnits:[item.id],aidedUnits:[]};
  assert(L.dueUnitTransfer(db,T0+2*DAY),'unaided-evidence unit earns the delayed transfer');
}

{
  // Assisted production must NOT trigger transfer: unit missed in the diff,
  // or learner peeked at the source before revealing.
  const DAY=24*60*60*1000;
  const T0=1_700_000_000_000;
  const db=D.createInitialDb([],1000);
  const item=D.addItem(db,{target:'on my way',meaning:'đang trên đường'});
  db.events=[{id:'e1',mode:'write',cardId:'c1',unitIds:[item.id],ratings:{[item.id]:2},answeredAt:T0,error:{stage:'miss',missedUnits:[item.id],finalMissing:[],corrected:true,retryCount:1}}];
  assert.equal(L.dueUnitTransfer(db,T0+2*DAY),null,'unit corrected via retry is aided recall — no transfer');
  const db2=D.createInitialDb([],1000);
  const item2=D.addItem(db2,{target:'on my way',meaning:'đang trên đường'});
  db2.events=[{id:'e1',mode:'write',cardId:'c1',unitIds:[item2.id],ratings:{[item2.id]:3},answeredAt:T0,telemetry:{sourceViewedPreReveal:true}}];
  assert.equal(L.dueUnitTransfer(db2,T0+2*DAY),null,'peeking at the source pre-reveal is aided — no transfer');
  // A failed write does not count either
  const db3=D.createInitialDb([],1000);
  const item3=D.addItem(db3,{target:'on my way',meaning:'đang trên đường'});
  db3.events=[{id:'e1',mode:'write',cardId:'c1',unitIds:[item3.id],ratings:{[item3.id]:1},answeredAt:T0}];
  assert.equal(L.dueUnitTransfer(db3,T0+2*DAY),null,'a failed write rating must not trigger transfer');
}

{
  // A unit assisted on a card where ANOTHER unit was missed stays eligible:
  // assistance is tracked per unit, not per event.
  const DAY=24*60*60*1000;
  const T0=1_700_000_000_000;
  const db=D.createInitialDb([],1000);
  const a=D.addItem(db,{target:'on my way',meaning:'đang trên đường'});
  const b=D.addItem(db,{target:'running late',meaning:'sắp trễ'});
  db.events=[{id:'e1',mode:'write',cardId:'c1',unitIds:[a.id,b.id],ratings:{[a.id]:3,[b.id]:2},answeredAt:T0,error:{stage:'miss',missedUnits:[b.id],finalMissing:[],corrected:true,retryCount:1}}];
  const due=L.dueUnitTransfer(db,T0+2*DAY);
  assert.equal(due.unitId,a.id,'clean unit on a partially-assisted card must still transfer');
  // earliest due wins when several units qualify
  db.events.push({id:'e2',mode:'write',cardId:'c2',unitIds:[b.id],ratings:{[b.id]:3},answeredAt:T0-DAY});
  assert.equal(L.dueUnitTransfer(db,T0+2*DAY).unitId,b.id,'earliest due unit must be selected first');
}

{
  // Regression: a mined sentence + its translation becomes a REAL review card
  // tagged to the mined unit — not just the bare-phrase fallback.
  const db=D.createInitialDb([],1000);
  const item=D.addItem(db,{target:'on my way',meaning:'đang trên đường'});
  SC.addCapture(db,{sentence:'I am on my way home.',nativeSentence:'Tôi đang về nhà.',mediaTimestamp:1});
  const cards=SC.cardsFromCaptures(db.captures,db.items);
  assert.equal(cards.length,1,'a translated capture must produce a sentence card');
  assert.equal(cards[0].unit_tags.some((tag)=>tag.unit_id===item.id),true,'the card must be tagged to the mined unit');
  const noTranslation=D.createInitialDb([],1000);
  D.addItem(noTranslation,{target:'on my way',meaning:'đang trên đường'});
  SC.addCapture(noTranslation,{sentence:'I am on my way home.',mediaTimestamp:1});
  assert.equal(SC.cardsFromCaptures(noTranslation.captures,noTranslation.items).length,0,'no translation → no fabricated card');
}


// Preserve minutes and meridiem through extraction and the actual mission gate.
{
  const mission=L.TRANSFER_MISSIONS[0];
  for(const [text,expected] of [
    ['7:30pm','19:30'],['7:05pm','19:05'],['7:30 pm','19:30'],
    ['12:05am','0:05'],['12:05pm','12:05'],['19:30','19:30']
  ]){
    assert.deepEqual(L.extractClockTimes(`See you at ${text}.`),[expected]);
    assert.equal(L.checkFinalTimeConfirm(mission,{declaredFinalTime:'7',responseText:`See you at ${text}.`}).ok,false);
    assert.equal(L.confirmsTime(`See you at ${text}.`,expected,true),true);
  }
  for(const text of ['7:99pm','25:30pm','7:5pm','13:30pm']){
    assert.deepEqual(L.extractClockTimes(`See you at ${text}.`),[]);
  }
  assert.equal(L.checkFinalTimeConfirm(mission,{declaredFinalTime:'7',responseText:'See you at 7:00pm.'}).ok,true);
}

console.log('FlashDay learning entry: guided/personal/transfer regressions passed');

// Surface matching must abstain when the learner has multiple meanings.
{
  const items=[{id:'bank-money',target:'bank',meaning:'ngân hàng'},
    {id:'bank-river',target:'bank',meaning:'bờ sông'}];
  assert.deepEqual(L.matchUnitsInText(items,'I went to the bank.'),[]);
  assert.deepEqual(L.matchUnitsInText([items[0]],'I went to the bank.').map(item=>item.unitId),['bank-money']);
}

// Delayed transfer requires valid, chronologically earliest review evidence.
{
  const start=1_700_000_000_000;
  const due=start+L.UNIT_TRANSFER_DELAY_MS;
  const item={id:'trace-unit',target:'hello',meaning:'xin chào'};
  const event={id:'source',mode:'write',unitIds:[item.id],ratings:{[item.id]:3},answeredAt:start};
  const db={items:[item],events:[],transferAttempts:[]};
  assert.throws(()=>L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:'Hello from Hanoi.'},due),/Chưa có lượt/);
  for(const grade of [undefined,NaN,0,1,5,Infinity]){
    db.events=[{...event,ratings:{[item.id]:grade}}];
    assert.equal(L.dueUnitTransfer(db,due),null);
  }
  db.events=[{...event,answeredAt:null}];
  assert.equal(L.dueUnitTransfer(db,due),null);
  db.events=[{...event,id:'later',answeredAt:start+1000},event];
  assert.equal(L.dueUnitTransfer(db,due).sourceEventId,'source');
  assert.throws(()=>L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:'Hello from Hanoi.',submittedAt:due},start),/24 giờ/);
  assert.throws(()=>L.submitUnitTransferAttempt(db,{unitId:item.id,responseText:'Hello from Hanoi.',sourceEventId:'invented'},due),/không khớp/);
  const first=L.submitUnitTransferAttempt(db,{id:'first',unitId:item.id,responseText:'Hello from Hanoi.',submittedAt:0},due);
  assert.equal(first.submittedAt,due);
  assert.equal(first.sourceEventId,'source');
  assert.equal(first.evidenceBasis,'legacy-review');
  assert.equal(L.dueUnitTransfer(db,due).previousAttempt.id,'first');
  assert.throws(()=>L.submitUnitTransferAttempt(db,{id:'first',unitId:item.id,responseText:'Hello from Hue.'},due),/đã được lưu/);
  L.submitUnitTransferAttempt(db,{id:'second',unitId:item.id,responseText:'Hello from Hue.',selfReviewed:true},due+1000);
  assert.equal(db.transferAttempts.length,2);
  assert.equal(L.dueUnitTransfer(db,due+1000),null);
}

// Revised beginner path must not erase older optional vocabulary or review history.
{
  const db=D.createInitialDb([],1000);
  for(const id of ['a1-communication-repair','a1-simple-plans','a1-meeting-propose','a1-meeting-change','a1-meeting-confirm'])L.installGuidedModule(db,id,D);
  const before=JSON.parse(JSON.stringify(db.items));
  db.events.push({id:'legacy-review',unitIds:['something-came-up'],answeredAt:1234});
  const result=L.installGuidedCluster(db,'a1-meeting-change',D);
  assert.equal(result.added.length,1);
  assert.equal(result.reused.length,5);
  assert.deepEqual(db.items.slice(0,before.length),before);
  assert.equal(db.events[0].unitIds[0],'something-came-up');
  assert.equal(L.installGuidedCluster(db,'a1-meeting-change',D).added.length,0);
  const core=L.modulesForCluster('a1-meeting-change').flatMap(m=>m.units);
  assert(!core.some(u=>u.id==='something-came-up'));
  assert(core.every(u=>u.exampleSentence&&u.exampleTranslation));
  const lesson=L.LESSON_DIALOGUES['a1-meeting-change'];
  assert.notEqual(lesson.sourceId,'lesson:a1-meeting-change','new text cannot reuse old reading evidence key');
  assert.equal(lesson.contentVersion,2);
  assert(lesson.lines.some(([line])=>line.includes('See you at four thirty')));
  for(const quiz of [lesson.scenarioQuiz,L.clusterById('a1-meeting-change').preparation.practiceQuiz]){
    for(const q of quiz){assert(q.options[q.answer]);assert(q.hint);}
  }
  const catalog=require('../starter-catalog').ITEMS;
  const beginner=catalog.filter(item=>item.level==='A1');
  assert.equal(beginner.length,2);
  assert(beginner.every(item=>item.id.endsWith('-v2')&&item.goal&&item.lines.every(pair=>pair.length===2&&pair.every(Boolean))));
}
