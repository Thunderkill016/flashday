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
  assert.equal(stateBefore.total,20, 'the meeting-change pilot must be a complete 20-Unit situation cluster');
  assert.equal(stateBefore.installed,3, 'shared seed Units should count as available without being duplicated');
  const result=L.installGuidedCluster(db,'a1-meeting-change',D);
  assert.equal(result.added.length,17);
  assert.equal(result.reused.length,3);
  assert.equal(db.items.length,before+17);
  assert.equal(result.state.complete,true);
  assert.equal(L.modulesForCluster('a1-meeting-change').length,5);
}

{
  const db=D.createInitialDb([],1000);
  assert.throws(()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer'}),/viết câu trả lời|nói thành tiếng/i);
  const attempt=L.submitTransferAttempt(db,{
    id:'transfer-1',missionId:'a1-meeting-change-transfer',responseText:'No problem. See you at seven.',selfReviewed:true
  },2000);
  assert.equal(attempt.submittedAt,2000);
  assert.equal(db.transferAttempts.length,1);
  const state=L.missionState(db,'a1-meeting-change-transfer');
  assert.equal(state.attempts,1);
  assert.equal(state.hasSelfReview,true);
  assert.equal(attempt.grading,'self-check');
}

// Final-time gate: the can-do is "confirm the final time" — a written
// attempt that never states a time cannot demonstrate it (F5 honesty fix).
{
  const db=D.createInitialDb([],1000);
  assert.throws(
    ()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'No problem, that is fine.'}),
    /giờ cuối cùng/i
  );
  assert.throws(
    ()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'Sorry, I cannot make it.'}),
    /giờ cuối cùng/i
  );
  // Any time expression counts — the learner may counter-propose.
  const ok=L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'No problem. See you at 7 pm.'});
  assert.equal(ok.responseText.includes('7 pm'),true);
  const counter=L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',responseText:'Seven is hard for me — how about eight? See you at eight.'});
  assert.equal(counter.grading,'self-check');
  // Spoken-only attempts stay allowed but remain self-check evidence.
  const spoken=L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer',spoke:true});
  assert.equal(spoken.grading,'self-check');
}

{
  assert.equal(L.mentionsTime('See you at seven.'),true);
  assert.equal(L.mentionsTime('How about 8:30?'),true);
  assert.equal(L.mentionsTime('Sounds good, noon works.'),true);
  assert.equal(L.mentionsTime('No problem at all.'),false);
  assert.equal(L.mentionsTime(''),false);
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

console.log('FlashDay learning entry: 50 guided/personal/transfer checks passed');
