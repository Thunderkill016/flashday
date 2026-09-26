/*
 * FlashDay adapter around google/bespoke language/card policy plus FSRS timing.
 *
 * Responsibility boundary:
 * - Bespoke: Unit model, four language modes, CardIndex and language/card context policy.
 * - FSRS: due/retrievability/next interval for each Unit x Mode memory.
 * - FlashDay review events: durable history used to rebuild both caches.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./bespoke-engine.js'),require('./bespoke-card-index.js'),require('./source-capture.js'),globalThis.FlashDayFsrs||null);
  else root.FlashDayBespoke=factory(root.BespokeSrs,root.BespokeCardIndex,root.FlashDaySourceCapture,root.FlashDayFsrs||null);
})(typeof globalThis!=='undefined'?globalThis:this,function(B,CI,SC,F){
  'use strict';
  if(!B||!CI||!SC)throw new Error('BespokeSrs, BespokeCardIndex and FlashDaySourceCapture are required');

  const ACTIVE_MODES=[B.Mode.LISTEN,B.Mode.SPEAK,B.Mode.READ,B.Mode.WRITE];
  const VALID_DIFFICULTIES=new Set(Object.values(B.Difficulty));
  const DIFFICULTY_ORDER={A1:0,A2:1,B1:2,B2:3,C1:4,C2:5};
  const VALID_AUDIO_KINDS=new Set(['source-audio','linked-audio','browser-tts','none']);
  const BESPOKE_SOURCE='google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e';
  const HYBRID_SCHEDULER='bespoke-language-policy+fsrs6';
  const MODE_META={
    listen:{label:'Nghe',front:'Nghe câu rồi thử nhớ nội dung.'},
    speak:{label:'Nói',front:'Nói câu tiếng Anh từ câu tiếng Việt.'},
    read:{label:'Đọc',front:'Đọc câu tiếng Anh rồi thử hiểu.'},
    write:{label:'Viết',front:'Viết câu tiếng Anh từ câu tiếng Việt.'},
  };

  function normalizedDifficulty(value){return VALID_DIFFICULTIES.has(value)?value:B.Difficulty.A1;}
  function unitFromItem(item){return {id:item.id,name:item.target,definition:item.meaning,difficulty:normalizedDifficulty(item.difficulty)};}
  function difficultyOrdinal(value){return DIFFICULTY_ORDER[value]??0;}

  function stepMs(step){
    const match=String(step||'').trim().match(/^(\d+(?:\.\d+)?)(m|h|d)$/i);
    if(!match)return 0;
    const value=Number(match[1]);
    const unit=match[2].toLowerCase();
    const multiplier=unit==='m'?60000:unit==='h'?3600000:86400000;
    return Number.isFinite(value)?value*multiplier:0;
  }

  // Do not introduce another new memory when an existing short-term FSRS step
  // is about to come due. The window is derived from the configured FSRS
  // learning/relearning steps instead of inventing a second timing constant.
  function introductionGuardMs(){
    if(!F?.FSRS_PARAMETERS?.enable_short_term)return 0;
    const steps=[...(F.FSRS_PARAMETERS.learning_steps||[]),...(F.FSRS_PARAMETERS.relearning_steps||[])];
    return Math.max(0,...steps.map(stepMs));
  }

  function bespokeScore(score){
    const value=Number(score);
    // Bespoke upstream only defines 0..3. If FlashDay later exposes FSRS Easy=4,
    // record it as a Bespoke success while preserving the original 4 for FSRS.
    return value===4?3:value;
  }

  function datasetCards(db){
    const explicit=Array.isArray(db.bespokeCards)?db.bespokeCards:[];
    const captured=SC.cardsFromCaptures(db.captures||[],db.items||[]);
    return [...explicit,...captured];
  }

  function createEngine(db,{loadProgress=true}={}){
    const units=(db.items||[]).map(unitFromItem);
    const unitLookup=Object.fromEntries(units.map(u=>[u.id,u]));
    const cardIndex=CI.importFlashDayItems(db.items||[],datasetCards(db));
    const translations=Object.fromEntries((db.items||[]).map(i=>[i.id,i.meaning]));
    const engine=new B.DeckEngine({
      targetLanguageCode:'en',nativeLanguageCode:'vi',unitsWithCards:units,
      translations,unitLookup,cardProvider:(unitId,limit)=>cardIndex.cards(unitId,limit)
    });
    engine.setModes(ACTIVE_MODES);
    if(loadProgress&&db.bespokeProgress){
      try{engine.loadObject(db.bespokeProgress);engine.setModes(ACTIVE_MODES);}catch(_e){}
    }
    engine.cardIndex=cardIndex;
    return engine;
  }

  function buildEngine(db){return createEngine(db,{loadProgress:true});}

  function schedulerSource(){return F?`${F.FSRS_SOURCE} + ${BESPOKE_SOURCE}`:BESPOKE_SOURCE;}

  function saveEngine(db,engine){
    db.bespokeProgress=engine.saveObject();
    db.scheduler=F?HYBRID_SCHEDULER:'google-bespoke-port';
    db.schedulerSource=schedulerSource();
  }

  function rebuildProgressFromEvents(db){
    const engine=createEngine(db,{loadProgress:false});
    const events=[...(Array.isArray(db.events)?db.events:[])]
      .filter(event=>ACTIVE_MODES.includes(event?.mode)&&Number.isFinite(Number(event?.answeredAt)))
      .sort((a,b)=>Number(a.answeredAt)-Number(b.answeredAt));

    for(const event of events){
      const time=Number(event.answeredAt)/1000;
      for(const unitId of Array.isArray(event.unitIds)?event.unitIds:[]){
        const score=Number(event.ratings?.[unitId]??0);
        if(score!==1&&score!==2&&score!==3&&score!==4)continue;
        const unit=engine.unitLookup[unitId];
        if(!unit)continue;
        engine.rate(unit,event.mode,bespokeScore(score),time);
      }
      if(event.cardId)engine.logUsage(String(event.cardId),Boolean(event.isReported),time);
    }
    saveEngine(db,engine);
    if(F)F.rebuildDbProgress(db);
    return engine;
  }

  function taskPairs(engine){
    const out=[];
    for(const unit of engine.unitsWithCards){
      if(!engine.getCardsForUnit(unit.id,1).length)continue;
      for(const mode of ACTIVE_MODES)out.push({unitId:unit.id,mode});
    }
    return out;
  }

  // Bespoke's upstream scoreCard mixes card/context quality with its own urgency
  // scheduler. In hybrid mode FSRS owns memory timing, so this scorer keeps the
  // non-timing parts only: reported-card penalty, recent-card rotation, avoiding
  // unknown extra units and content-difficulty compatibility.
  function hybridCardScore(engine,card,mode,nowMs){
    const currentTime=Number(nowMs)/1000;
    let score=0.0;
    for(const usage of (engine.cardIdUses[card.id]||[])){
      if(usage.is_reported)score-=B.DeckEngine.REPORT_PENALTY;
      const days=(currentTime-Number(usage.time))/B.DAY;
      if(days>=0.0)score-=B.DeckEngine.CARD_USAGE_FACTOR*Math.exp(-B.DeckEngine.CARD_USAGE_DECAY*days);
    }

    for(const unitId of B.unitIds(card)){
      const state=engine.ratingStates[unitId]||new B.RatingState();
      if(!state.isTouched())score-=B.DeckEngine.UNTOUCHED_PENALTY;
      else if(!state.isIntroduced(mode))score-=B.DeckEngine.UNINTRODUCED_PENALTY;
      const unit=engine.unitLookup[unitId]||engine.unitsWithCards.find(u=>u.id===unitId);
      const unitDiff=unit?.difficulty||B.Difficulty.A1;
      if(unitDiff===engine.difficulty)score+=B.DeckEngine.DIFFICULTY_MATCH_BONUS;
      else if(difficultyOrdinal(unitDiff)>difficultyOrdinal(engine.difficulty))score+=B.DeckEngine.DIFFICULTY_PENALTY;
    }
    return score;
  }

  function scoreCards(engine,cards,mode,nowMs){
    let best=cards[0],bestScore=hybridCardScore(engine,best,mode,nowMs);
    for(let i=1;i<cards.length;i++){
      const score=hybridCardScore(engine,cards[i],mode,nowMs);
      if(score>bestScore){best=cards[i];bestScore=score;}
    }
    return best;
  }

  function chooseBestCard(engine,unitId,mode,nowMs){
    const cards=engine.getCardsForUnit(unitId,1000);
    if(!cards.length)throw new Error(`Unit ${unitId} chưa có card hợp lệ.`);
    return scoreCards(engine,cards,mode,nowMs);
  }

  // Durable per-(unit,mode) review history is what makes context rotation
  // replayable — the last card served for this task is read back from events,
  // never from a volatile cache.
  function lastTaskEvent(db,unitId,mode){
    const events=Array.isArray(db?.events)?db.events:[];
    for(let i=events.length-1;i>=0;i--){
      const event=events[i];
      if(event&&event.mode===mode&&Array.isArray(event.unitIds)&&event.unitIds.includes(unitId))return event;
    }
    return null;
  }

  // Context rotation: when a unit has several cards (one per source capture),
  // never serve the same card twice in a row for the same unit+mode while a
  // different context exists. Retrieval under varying context is what turns
  // card-memorization into transferable knowledge.
  function pickCardForTask(db,engine,unitId,mode,nowMs){
    let cards=engine.getCardsForUnit(unitId,1000);
    if(!cards.length)throw new Error(`Unit ${unitId} chưa có card hợp lệ.`);
    const last=lastTaskEvent(db,unitId,mode);
    const lastCardId=last?.cardId?String(last.cardId):null;
    if(lastCardId&&cards.length>1){
      const rest=cards.filter(card=>String(card.id)!==lastCardId);
      if(rest.length)cards=rest;
    }
    const card=scoreCards(engine,cards,mode,nowMs);
    const rotation=!last?'first':(String(card.id)!==lastCardId?'rotated':'repeated');
    return {card,rotation};
  }

  // Production ladder: retrieval modes open easy→hard so a unit is recognized
  // (read/listen) before it must be produced (write/speak). FSRS still owns
  // WHEN a task returns; this only orders WHICH unseen mode opens first.
  const MODE_LADDER=['read','listen','write','speak'];

  // Cross-skill knowledge is allowed to influence WHAT to introduce next, but
  // never mutates another mode's FSRS memory state. Prefer finishing another
  // skill for a Unit already encountered — on the easiest remaining rung —
  // before opening an entirely new Unit.
  function chooseIntroductionTask(db,engine,unseen,nowMs){
    const byUnit=new Map();
    for(const task of unseen){
      const list=byUnit.get(task.unitId)||[];
      list.push(task);byUnit.set(task.unitId,list);
    }
    for(const tasks of byUnit.values()){
      tasks.sort((a,b)=>MODE_LADDER.indexOf(a.mode)-MODE_LADDER.indexOf(b.mode));
    }
    for(const unit of engine.unitsWithCards){
      const tasks=byUnit.get(unit.id);
      if(!tasks)continue;
      const hasAnyMode=ACTIVE_MODES.some(mode=>F.hasState(db,unit.id,mode));
      if(!hasAnyMode)continue;
      const match=tasks[0];
      return {...match,reason:'cross-skill-continuity',memory:F.taskState(db,match.unitId,match.mode,nowMs)};
    }
    const firstUnit=engine.unitsWithCards.find(unit=>byUnit.has(unit.id));
    const fallback=firstUnit?byUnit.get(firstUnit.id)[0]:unseen[0];
    return {...fallback,reason:'ordered-introduction',memory:F.taskState(db,fallback.unitId,fallback.mode,nowMs)};
  }

  function chooseHybridTask(db,engine,nowMs){
    if(!F)return null;
    F.ensureProgress(db);
    const tasks=taskPairs(engine);
    const due=F.rankDueTasks(db,tasks,nowMs);
    if(due.length)return {unitId:due[0].unitId,mode:due[0].mode,reason:'fsrs-due',memory:due[0]};

    const unseen=F.newTasks(db,tasks);
    const nextDue=F.nextDueAt(db,tasks);
    if(unseen.length){
      // The guard exists to avoid cramming brand-new memories on top of an
      // imminent short-term step. It must NOT block opening another mode of a
      // unit already encountered — that adds no new memory load and blocking
      // it was a study dead end when unseen units remained behind the guard.
      const fresh=[],continuation=[];
      for(const task of unseen){
        const seenUnit=ACTIVE_MODES.some(mode=>F.hasState(db,task.unitId,mode));
        (seenUnit?continuation:fresh).push(task);
      }
      if(continuation.length)return chooseIntroductionTask(db,engine,continuation,nowMs);
      const guardMs=introductionGuardMs();
      const waitMs=nextDue==null?Infinity:Number(nextDue)-Number(nowMs);
      if(fresh.length&&guardMs>0&&waitMs>0&&waitMs<=guardMs){
        const minutes=Math.max(1,Math.ceil(waitMs/60000));
        throw new Error(`FSRS có lượt ôn ngắn hạn sau khoảng ${minutes} phút. FlashDay tạm không mở Unit × kỹ năng mới để tránh dồn bài.`);
      }
      return chooseIntroductionTask(db,engine,fresh.length?fresh:unseen,nowMs);
    }

    if(nextDue!=null){
      const waitMs=Math.max(0,nextDue-nowMs);
      const minutes=Math.max(1,Math.ceil(waitMs/60000));
      throw new Error(`FSRS chưa có Unit × kỹ năng nào đến hạn. Lần gần nhất sau khoảng ${minutes} phút.`);
    }
    throw new Error('FSRS chưa tìm thấy Unit × kỹ năng có thể học.');
  }

  function selectNext(db,nowMs=Date.now()){
    const engine=buildEngine(db);
    if(F){
      const picked=chooseHybridTask(db,engine,nowMs);
      const {card,rotation}=pickCardForTask(db,engine,picked.unitId,picked.mode,nowMs);
      return {mode:picked.mode,unitId:picked.unitId,card,engine,memory:picked.memory,selectionReason:picked.reason,rotation};
    }
    const picked=engine.draw(nowMs/1000);
    // Even without FSRS, upstream's internal card choice is replaced by
    // pickCardForTask so the no-repeat-context guarantee applies in both paths.
    const {card,rotation}=pickCardForTask(db,engine,picked.unitId,picked.mode,nowMs);
    return {mode:picked.mode,unitId:picked.unitId,card,engine,selectionReason:'bespoke-only',rotation};
  }

  function initialRatings(card){return Object.fromEntries(B.unitIds(card).map(id=>[id,0]));}
  function cycleRating(current){return current===0?3:current===3?1:0;}
  function allSuccess(card){return Object.fromEntries(B.unitIds(card).map(id=>[id,3]));}
  function hasCompleteRatings(card,ratings){return B.unitIds(card).every((unitId)=>Number(ratings?.[unitId]??0)!==0);}

  function normalizeStimulus(stimulus={}){
    const audioKind=VALID_AUDIO_KINDS.has(stimulus.audioKind)?stimulus.audioKind:'none';
    return {audioKind};
  }

  function reviewEventId(nowMs){
    try{
      if(globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')return `review_${globalThis.crypto.randomUUID()}`;
    }catch(_e){}
    return `review_${nowMs}_${Math.random().toString(36).slice(2,12)}`;
  }

  // Learning telemetry: raw UI timestamps in, derived latencies out. The event
  // log must let us tell "recalled in 900ms, unaided" apart from "needed the
  // source panel and 40s" — a binary remembered flag cannot capture that.
  function normalizeTelemetry(raw={},nowMs){
    const at=(value)=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.round(n):null;};
    const presentedAt=at(raw.presentedAt);
    const firstAttemptAt=at(raw.firstAttemptAt);
    const revealedAt=at(raw.revealedAt);
    const answeredAt=at(nowMs);
    return {
      presentedAt,
      firstAttemptAt,
      revealedAt,
      recallLatencyMs:presentedAt!=null&&revealedAt!=null?Math.max(0,revealedAt-presentedAt):null,
      attemptLatencyMs:presentedAt!=null&&firstAttemptAt!=null?Math.max(0,firstAttemptAt-presentedAt):null,
      gradingMs:revealedAt!=null&&answeredAt!=null?Math.max(0,answeredAt-revealedAt):null,
      sourceViewedPreReveal:Boolean(raw.sourceViewedPreReveal),
      audioPlays:Math.max(0,Math.min(99,Math.round(Number(raw.audioPlays)||0)))
    };
  }

  // Output-error record for the append-only log (Speak-style retry loop):
  // keeps the first failed attempt, the final attempt, and which tagged
  // units stayed missing — enough for recurring-error memory later.
  const ERROR_STAGES=new Set(['exact','close','miss','empty','self-check']);
  const ERROR_TYPE_SET=new Set(['missing-target','word-form','missing-words','extra-words','word-order','self-check']);
  function normalizeError(raw){
    if(raw==null)return null;
    const src=(raw&&typeof raw==='object')?raw:{};
    const types=(Array.isArray(src.types)?src.types:[]).map((t)=>String(t||'').slice(0,40)).filter((t)=>ERROR_TYPE_SET.has(t)).slice(0,8);
    const missedUnits=(Array.isArray(src.missedUnits)?src.missedUnits:[]).map((id)=>String(id||'').slice(0,160)).filter(Boolean).slice(0,24);
    const finalMissing=(Array.isArray(src.finalMissing)?src.finalMissing:[]).map((id)=>String(id||'').slice(0,160)).filter(Boolean).slice(0,24);
    return {
      stage:ERROR_STAGES.has(src.stage)?src.stage:'',
      types,
      missedUnits,
      finalMissing,
      firstAttempt:String(src.firstAttempt||'').slice(0,1200),
      finalAttempt:String(src.finalAttempt||'').slice(0,1200),
      corrected:Boolean(src.corrected),
      retryCount:Math.max(0,Math.min(9,Math.round(Number(src.retryCount)||0)))
    };
  }

  // Recurring-error memory: which production error types and which units
  // keep failing — derived from the event log so cloud sync replays it
  // exactly like FSRS/Bespoke progress caches.
  function errorStats(db){
    const byType={};const byUnit={};
    for(const event of db.events||[]){
      const error=event?.error;
      if(!error)continue;
      const at=Number(event.answeredAt)||0;
      for(const type of error.types||[]){
        const bucket=byType[type]||(byType[type]={count:0,lastAt:0});
        bucket.count++;if(at>bucket.lastAt)bucket.lastAt=at;
      }
      for(const unitId of error.missedUnits||[]){
        const bucket=byUnit[unitId]||(byUnit[unitId]={count:0,lastAt:0,correctedCount:0});
        bucket.count++;if(at>bucket.lastAt)bucket.lastAt=at;
        if(error.corrected)bucket.correctedCount++;
      }
    }
    return {byType,byUnit};
  }

  function finalizeCard(db,selection,ratings,{isReported=false,response={},stimulus={},telemetry={},error=null,nowMs=Date.now()}={}){
    const engine=selection.engine||buildEngine(db);const applied={};
    const unitIds=B.unitIds(selection.card);
    // Snapshot each Unit x Mode FSRS state before the rating lands so the event
    // preserves difficulty/stability movement, not just the grade.
    const memory={};
    if(F){
      for(const unitId of unitIds){
        const before=F.storedCard(db,unitId,selection.mode);
        memory[unitId]={grade:F.ratingFromBespokeScore(Number(ratings?.[unitId]??0)),before:before?F.serializeCard(before):null,after:null};
      }
    }
    // Aided-recall guard: the word diff is objective evidence, self-report
    // cannot override it. A unit the attempt ever missed can never receive
    // unaided 'Good' credit — still absent in the final attempt means the
    // recall failed ('Again'); produced only after seeing the correction is
    // aided recall ('Hard' at best). The corrected attempt still lives in
    // the event as practice evidence.
    const missedUnits=new Set(Array.isArray(error?.missedUnits)?error.missedUnits.map(String):[]);
    const finalMissing=new Set(Array.isArray(error?.finalMissing)?error.finalMissing.map(String):[]);
    for(const unitId of unitIds){
      let score=Number(ratings?.[unitId]??0);
      if(finalMissing.has(unitId))score=Math.min(score,1);
      else if(missedUnits.has(unitId))score=Math.min(score,2);
      const unit=engine.unitLookup[unitId]||{id:unitId,name:unitId,definition:unitId,difficulty:B.Difficulty.A1};
      engine.rate(unit,selection.mode,bespokeScore(score),nowMs/1000);applied[unitId]=score;
    }
    engine.logUsage(selection.card.id,isReported,nowMs/1000);saveEngine(db,engine);
    const fsrsUpdates=F?F.applyRatings(db,selection.mode,applied,nowMs):[];
    for(const update of fsrsUpdates)if(memory[update.unitId])memory[update.unitId].after=update.card;
    const event={
      id:reviewEventId(nowMs),
      mode:selection.mode,cardId:selection.card.id,unitIds,ratings:applied,
      sentence:selection.card.sentence,nativeSentence:selection.card.native_sentence,
      captureId:selection.card.capture_id||null,source:selection.card.source||null,
      // 'first' = never reviewed in this mode · 'rotated' = a different context
      // was deliberately served · 'repeated' = only one context exists for it.
      rotation:['first','rotated','repeated'].includes(selection.rotation)?selection.rotation:'first',
      isReported,response:{
        text:String(response?.text||'').trim().slice(0,1200),
        spoke:Boolean(response?.spoke),
        recordedLocally:Boolean(response?.recordedLocally),
        asrConfirmed:Boolean(response?.asrConfirmed)
      },
      stimulus:normalizeStimulus(stimulus),
      telemetry:normalizeTelemetry(telemetry,nowMs),
      error:normalizeError(error),
      memory,
      answeredAt:nowMs,
      scheduler:F?HYBRID_SCHEDULER:'google-bespoke-port',
      memoryScheduler:F?F.FSRS_SOURCE:null,
      languagePolicy:BESPOKE_SOURCE,
      fsrsGrades:F?Object.fromEntries(Object.entries(applied).map(([unitId,score])=>[unitId,F.ratingFromBespokeScore(score)])):{}
    };
    // Do not truncate the event history: both scheduler caches are rebuildable
    // from this append-only log. If storage becomes a problem, archive explicitly.
    db.events=db.events||[];db.events.push(event);
    return {event,engine,fsrsUpdates};
  }

  function bespokeModeStatus(state,mode){
    if(state.isMature(mode))return 'Vững';
    if(state.isKnown(mode))return 'Quen';
    if(state.isIntroduced(mode))return 'Đang học';
    if(state.isTouched())return 'Đã gặp';
    return 'Mới';
  }

  // Rendering paths already hold a freshly built engine (from selectNext or a
  // per-render build) — pass it in to avoid re-indexing every capture per unit.
  function itemStatus(db,itemId,nowMs=Date.now(),engine=null){
    engine=engine||buildEngine(db);const state=engine.ratingStates[itemId]||new B.RatingState();
    return ACTIVE_MODES.map(mode=>{
      if(!F)return {mode,label:MODE_META[mode].label,status:bespokeModeStatus(state,mode),urgency:state.urgency(mode,nowMs/1000),ratings:state.ratings().filter(r=>r.mode===mode).length};
      const memory=F.taskState(db,itemId,mode,nowMs);
      let status='Mới';
      if(!memory.isNew){
        if(memory.isDue)status='Đến hạn';
        else if(memory.card?.state===F.State.Learning||memory.card?.state===F.State.Relearning)status='Đang học';
        else status='Đã lên lịch';
      }
      return {mode,label:MODE_META[mode].label,status,ratings:state.ratings().filter(r=>r.mode===mode).length,dueAt:memory.dueAt,retrievability:memory.retrievability,fsrsState:memory.card?.state??null};
    });
  }

  function deckStats(db,nowMs=Date.now(),engine=null){
    engine=engine||buildEngine(db);
    const base=engine.stats(nowMs/1000);
    if(!F)return base;
    const memory=F.stats(db,taskPairs(engine),nowMs);
    return {waiting:memory.due,known:base.known,mature:base.mature,fsrs:memory};
  }
  function cardParts(card){return CI.splitIntoParts(card);}
  function cardCountForUnit(db,unitId,engine=null){return (engine||buildEngine(db)).cardIndex.size(unitId);}

  // How many distinct contexts (cards) this unit has actually been reviewed
  // in — the visible payoff of context rotation, derived from durable events.
  function seenContextCount(db,unitId){
    const seen=new Set();
    for(const event of Array.isArray(db?.events)?db.events:[]){
      if(event?.cardId&&Array.isArray(event.unitIds)&&event.unitIds.includes(unitId))seen.add(String(event.cardId));
    }
    return seen.size;
  }

  return {ACTIVE_MODES,MODE_LADDER,MODE_META,normalizedDifficulty,normalizeStimulus,normalizeTelemetry,buildEngine,saveEngine,rebuildProgressFromEvents,selectNext,initialRatings,cycleRating,allSuccess,hasCompleteRatings,finalizeCard,normalizeError,errorStats,itemStatus,deckStats,cardParts,cardCountForUnit,datasetCards,taskPairs,chooseHybridTask,chooseIntroductionTask,hybridCardScore,introductionGuardMs,bespokeScore,lastTaskEvent,pickCardForTask,seenContextCount,HYBRID_SCHEDULER,BESPOKE_SOURCE,hasFsrs:Boolean(F)};
});
