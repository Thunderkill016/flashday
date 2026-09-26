/*
 * Immersion Difficulty Engine — "Next for you".
 *
 * Groups source captures into sources, then joins each source's sentences
 * with the learner's LIVE knowledge state to estimate comprehensibility:
 * how much of this content can actually be understood right now, which units
 * inside it are being learned, and which are still new.
 *
 * Boundary: this module only measures and ranks. It never schedules reviews
 * (FSRS owns that) and never fabricates coverage — coverage comes from the
 * same tagKnownUnits matching that builds cards, so a token is "covered" only
 * when it is a real unit in the deck.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./bespoke-engine.js'),require('./bespoke-card-index.js'),require('./source-capture.js'),globalThis.FlashDayFsrs||null);
  else root.FlashDayImmersion=factory(root.BespokeSrs,root.BespokeCardIndex,root.FlashDaySourceCapture,root.FlashDayFsrs||null);
})(typeof globalThis!=='undefined'?globalThis:this,function(B,CI,SC,F){
  'use strict';
  if(!B||!CI||!SC)throw new Error('BespokeSrs, BespokeCardIndex and FlashDaySourceCapture are required');

  const ACTIVE_MODES=['listen','speak','read','write'];

  // Mean reading pace for sizing when a source has no timing metadata.
  const ESTIMATED_SECONDS_PER_SEGMENT=4;

  function sourceKey(capture){
    const c=SC.normalizeCapture(capture);
    return c.sourceTitle||c.subtitleFileName||c.file?.name||c.url||null;
  }

  function meaningfulChars(text){
    let count=0;
    for(const ch of String(text||''))if(/[\p{L}\p{N}]/u.test(ch))count++;
    return count;
  }

  // Per-unit knowledge rollup across the four skills. 'known' requires at
  // least one mode sitting in FSRS Review with nothing due — any due work
  // pulls it back to 'learning' so an overdue unit is never presented as
  // already understood. Untouched units are 'new'.
  function unitKnowledge(db,unitId,{nowMs=Date.now(),taskState=null}={}){
    const inDeck=(db.items||[]).some(item=>item.id===unitId);
    if(!inDeck)return 'new';
    if(typeof taskState==='function')return taskState(unitId);
    if(!F)return 'new';
    let sawState=false,anyDue=false,anyReview=false;
    for(const mode of ACTIVE_MODES){
      const memory=F.taskState(db,unitId,mode,nowMs);
      if(memory.isNew)continue;
      sawState=true;
      if(memory.isDue){anyDue=true;continue;}
      if(memory.card?.state===F.State.Review)anyReview=true;
    }
    if(!sawState)return 'new';
    if(anyReview&&!anyDue)return 'known';
    return 'learning';
  }

  function captureDuration(c){
    const start=Number(c.subtitle?.start),end=Number(c.subtitle?.end);
    if(Number.isFinite(start)&&Number.isFinite(end))return Math.max(0,end-start);
    return ESTIMATED_SECONDS_PER_SEGMENT;
  }

  // One capture: which characters sit inside known/learning/new units and
  // which sit outside the deck entirely. Coverage is char-weighted so a long
  // matched chunk counts for more than a short word.
  function assessCapture(db,capture,{nowMs=Date.now(),taskState=null}={}){
    const c=SC.normalizeCapture(capture);
    const sentence=c.sentence||'';
    const total=meaningfulChars(sentence);
    const tags=CI.tagKnownUnits(sentence,db.items||[]);
    let known=0,learning=0,fresh=0;
    const learningUnits=new Set(),newUnits=new Set(),knownUnits=new Set();
    for(const tag of tags){
      const weight=meaningfulChars(tag.occurance);
      const level=unitKnowledge(db,tag.unit_id,{nowMs,taskState});
      if(level==='known'){known+=weight;knownUnits.add(tag.unit_id);}
      else if(level==='learning'){learning+=weight;learningUnits.add(tag.unit_id);}
      else{fresh+=weight;newUnits.add(tag.unit_id);}
    }
    const covered=known+learning+fresh;
    return {
      id:c.id,sentence,nativeSentence:c.nativeSentence||'',
      mediaTimestamp:c.mediaTimestamp,subtitle:c.subtitle,
      total,known,learning,fresh,uncovered:Math.max(0,total-covered),
      unitIds:[...new Set(tags.map(tag=>tag.unit_id))],
      knownUnits:[...knownUnits],learningUnits:[...learningUnits],newUnits:[...newUnits],
      durationSeconds:captureDuration(c)
    };
  }

  // Coverage is measured against the deck, not claimed comprehension — a
  // sentence containing words nobody taught stays honestly "outside deck",
  // never silently counted as understood. Verdicts describe how productive a
  // source is as immersion material FOR THIS DECK right now.
  function verdictFor(coverage,knownShareOfCovered,learningCount,fresh){
    if(coverage<0.15)return {key:'thin',label:'Deck chưa phủ nguồn này'};
    if(learningCount>0)return {key:'good-fit',label:'Vừa sức — có unit đang học'};
    if(fresh>0)return {key:'stretch',label:'Có unit chưa ôn — đọc kèm dịch'};
    if(knownShareOfCovered>=0.9)return {key:'easy',label:'Thuộc gần hết — đọc lại củng cố'};
    return {key:'good-fit',label:'Vừa sức'};
  }

  // Aggregate a group of captures (one imported source) into a single
  // difficulty card. fitScore ranks for learning productivity: units being
  // learned dominate (each is a noticing opportunity), then coverage and how
  // much of the covered area is already comfortable.
  function assessSource(db,key,captures,{nowMs=Date.now(),taskState=null}={}){
    const parts=captures.map(c=>assessCapture(db,c,{nowMs,taskState}));
    const totals={total:0,known:0,learning:0,fresh:0,uncovered:0,seconds:0};
    const learningUnits=new Set(),newUnits=new Set(),knownUnits=new Set();
    for(const p of parts){
      totals.total+=p.total;totals.known+=p.known;totals.learning+=p.learning;
      totals.fresh+=p.fresh;totals.uncovered+=p.uncovered;totals.seconds+=p.durationSeconds;
      for(const id of p.learningUnits)learningUnits.add(id);
      for(const id of p.newUnits)newUnits.add(id);
      for(const id of p.knownUnits)knownUnits.add(id);
    }
    const total=totals.total||1;
    const coverage=totals.total>0?(totals.known+totals.learning+totals.fresh)/totals.total:0;
    const covered=totals.known+totals.learning+totals.fresh;
    const knownShare=covered>0?totals.known/covered:0;
    const verdict=verdictFor(coverage,knownShare,learningUnits.size,totals.fresh);
    // Units reviewed but never re-met in immersion are the biggest return —
    // a source containing them closes the loop, so they outrank plain
    // learning coverage.
    const encountered=new Set((db.encounters||[]).map(e=>e.unitId));
    const unmetLearning=[...learningUnits].filter(id=>!encountered.has(id)).length;
    const fitScore=Math.round(
      learningUnits.size*20
      +unmetLearning*12
      +knownShare*40
      +coverage*40
    );
    return {
      key,title:key,
      segments:parts.length,
      minutes:Math.max(1,Math.round(totals.seconds/60)),
      coverage,
      knownPct:Math.round((totals.known/total)*100),
      learningPct:Math.round((totals.learning/total)*100),
      newPct:Math.round((totals.fresh/total)*100),
      outsidePct:Math.round((totals.uncovered/total)*100),
      learningUnits:[...learningUnits],newUnits:[...newUnits],knownUnits:[...knownUnits],
      unmetLearning,
      verdict,fitScore,
      parts
    };
  }

  // Every imported source, ranked best-fit first. Ties prefer the denser
  // source (more chances to notice in the same sitting).
  function assessSources(db,{nowMs=Date.now(),taskState=null}={}){
    const groups=new Map();
    for(const capture of db.captures||[]){
      const key=sourceKey(capture);
      if(!key)continue;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(capture);
    }
    const out=[...groups.entries()].map(([key,captures])=>assessSource(db,key,captures,{nowMs,taskState}));
    out.sort((a,b)=>b.fitScore-a.fitScore||b.segments-a.segments||a.title.localeCompare(b.title));
    return out;
  }

  // Return-to-source: a deck unit the learner meets inside a REAL source line
  // is an immersion encounter — the loop closing back from RETRIEVE into
  // IMMERSION. Encounters are recorded per line on actual interaction
  // (line scrolled into view / played / word tapped), never in bulk at
  // source open — opening a 20-line transcript is not evidence the learner
  // met all 20 lines. Dedupe is per unit+capture+day: rereading the same
  // line today doesn't inflate the count, meeting it again tomorrow (or
  // inside a different line) is a real new encounter. One row keeps every
  // interaction kind observed that day (`kinds`) — provenance, not a count.
  function encounterDay(nowMs){
    return new Date(nowMs).toISOString().slice(0,10);
  }
  const ENCOUNTER_KINDS=Object.freeze(['line-viewed','line-played','word-tapped']);
  const ENCOUNTER_KIND_SET=new Set(ENCOUNTER_KINDS);
  function collectEncounters(db,captures,{nowMs=Date.now(),kind='line-viewed'}={}){
    const day=encounterDay(nowMs);
    const safeKind=ENCOUNTER_KIND_SET.has(kind)?kind:'line-viewed';
    const seen=new Set((db.encounters||[]).map(e=>`${e.unitId}|${e.captureId}|${encounterDay(Number(e.at)||0)}`));
    const out=[];
    for(const c of captures||[]){
      for(const tag of CI.tagKnownUnits(c.sentence||'',db.items||[])){
        const key=`${tag.unit_id}|${c.id}|${day}`;
        if(seen.has(key))continue;
        seen.add(key);
        out.push({id:`enc-${tag.unit_id}-${c.id}-${day}`,unitId:tag.unit_id,captureId:c.id,at:nowMs,kind:safeKind,kinds:[safeKind]});
      }
    }
    return out;
  }
  // How many distinct source lines a unit has been met in — the "your words
  // appear again" signal LingQ sells; separate from review rotation counts.
  function encounterCount(db,unitId){
    const seen=new Set();
    for(const e of db.encounters||[])if(e.unitId===unitId)seen.add(e.captureId);
    return seen.size;
  }

  // Parts of a sentence annotated by unit — the reader highlights what the
  // learner already knows differently from what is still being acquired.
  function annotatedParts(db,sentence,{nowMs=Date.now(),taskState=null}={}){
    const tags=CI.tagKnownUnits(sentence,db.items||[]);
    const parts=[];let cursor=0;
    for(const tag of tags){
      const start=Number.isInteger(tag.index)?tag.index:sentence.indexOf(tag.occurance,cursor);
      const end=start+tag.occurance.length;
      if(start<cursor)continue;
      if(start>cursor)parts.push({text:sentence.slice(cursor,start),unitId:null,knowledge:null});
      parts.push({text:sentence.slice(start,end),unitId:tag.unit_id,knowledge:unitKnowledge(db,tag.unit_id,{nowMs,taskState})});
      cursor=end;
    }
    if(cursor<sentence.length)parts.push({text:sentence.slice(cursor),unitId:null,knowledge:null});
    return parts;
  }

  return {sourceKey,unitKnowledge,assessCapture,assessSource,assessSources,annotatedParts,meaningfulChars,collectEncounters,encounterCount,encounterDay,ENCOUNTER_KINDS};
});
