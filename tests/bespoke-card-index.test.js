const assert=require('assert');
const B=require('../bespoke-engine.js');
const CI=require('../bespoke-card-index.js');
const SC=require('../source-capture.js');
const A=require('../bespoke-adapter.js');

let checks=0;
function ok(){checks++;}

{
  const multi={
    id:'multi',sentence:"I'm on my way, but I'm running late.",native_sentence:'Tôi đang trên đường nhưng sẽ đến muộn.',
    audio_filename:'',slow_audio_filename:'',native_audio_filename:'',phonetic:null,
    unit_tags:[
      {occurance:"I'm on my way",unit_id:'on-way'},
      {occurance:"I'm running late",unit_id:'late'},
    ],notes:[]
  };
  const index=new CI.CardIndex([multi]);
  assert.strictEqual(index.size('on-way'),1);
  assert.strictEqual(index.size('late'),1);
  assert.strictEqual(index.cards('on-way')[0].id,'multi');
  assert.strictEqual(index.cards('late')[0].id,'multi');
  const parts=CI.splitIntoParts(multi);
  assert(parts.some(p=>p.unit_id==='on-way'));
  assert(parts.some(p=>p.unit_id==='late'));
  ok();
}

{
  const unit={id:'u',name:'u',definition:'u',difficulty:'A1'};
  const mk=id=>({id,sentence:id,native_sentence:id,audio_filename:'',slow_audio_filename:'',native_audio_filename:'',phonetic:null,unit_tags:[{occurance:id,unit_id:'u'}],notes:[]});
  const index=new CI.CardIndex([mk('c1'),mk('c2')]);
  const engine=new B.DeckEngine({unitsWithCards:[unit],unitLookup:{u:unit},cardProvider:(id,limit)=>index.cards(id,limit)});
  engine.setModes([B.Mode.READ]);
  const first=engine.draw(100);
  assert.strictEqual(first.card.id,'c1');
  engine.logUsage('c1',false,100);
  const second=engine.draw(100);
  assert.strictEqual(second.card.id,'c2','recent card usage penalty should rotate candidate cards');
  ok();
}

{
  // Legacy accepted answers are NOT unit identity. A synonym must not silently
  // become another card for the same unit.
  const items=[{id:'x',target:'Could you say that again?',meaning:'Bạn có thể nói lại không?',accepted:['Could you repeat that?'],type:'expression'}];
  const index=CI.importFlashDayItems(items);
  assert.strictEqual(index.size('x'),1);
  assert.strictEqual(index.cards('x')[0].sentence,'Could you say that again?');
  assert.strictEqual(index.cards('x')[0].source.type,'fallback');
  assert.deepStrictEqual(CI.tagKnownUnits('Could you repeat that?',items),[]);
  ok();
}

{
  // Explicit surface-form aliases are allowed when they really are the same unit.
  const items=[{id:'on-way',target:"I'm on my way",forms:['I am on my way'],meaning:'Tôi đang trên đường'}];
  const tags=CI.tagKnownUnits('I am on my way now.',items);
  assert.strictEqual(tags.length,1);
  assert.strictEqual(tags[0].unit_id,'on-way');
  ok();
}

{
  // Canonical token matching: a contraction target ≡ its expanded surface
  // form, sentence punctuation stored inside a form cannot block a match,
  // word boundaries are inherent, and tags carry their real char offset.
  const items=[
    {id:'on-way',target:"I'm on my way.",forms:['I am on my way.'],meaning:'đang tới'},
    {id:'art',target:'art',meaning:'nghệ thuật'}
  ];
  const tags=CI.tagKnownUnits('Wait, I am on my way to work.',items);
  assert.deepStrictEqual(tags.map(t=>t.unit_id),['on-way']);
  assert.strictEqual(tags[0].occurance,'I am on my way');
  assert.strictEqual(tags[0].index,6,'tag must carry its real char offset');
  assert.strictEqual(tags[0].occurance,'Wait, I am on my way to work.'.slice(6,6+tags[0].occurance.length));
  assert.deepStrictEqual(CI.tagKnownUnits('She started the cart race.',items),[], "'art' must not tag inside 'started'/'cart'");
  const contract=CI.tagKnownUnits("I'm on my way to work.",[{id:'x',target:'I am on my way',forms:[],meaning:'x'}]);
  assert.strictEqual(contract[0].occurance,"I'm on my way",'expanded form must match contracted surface');
  ok();
}

{
  // Real sentence card replaces the bare fallback for that unit.
  const items=[{id:'pickup',target:'pick up an order',meaning:'nhận một đơn hàng'}];
  const real=CI.cardFromSentence('I need to pick up an order before six.','Tôi cần nhận một đơn trước sáu giờ.',items,{id:'real-pickup'});
  const index=CI.importFlashDayItems(items,[real]);
  assert.strictEqual(index.size('pickup'),1);
  assert.strictEqual(index.cards('pickup')[0].id,'real-pickup');
  assert(!index.cards('pickup').some(c=>c.source?.type==='fallback'));
  ok();
}

{
  const items=[
    {id:'on-way',target:"I'm on my way",meaning:'Tôi đang trên đường',type:'chunk'},
    {id:'late',target:"I'm running late",meaning:'Tôi đang đến muộn',type:'chunk'},
  ];
  const card={
    id:'cross',sentence:"I'm on my way, but I'm running late.",native_sentence:'Tôi đang trên đường nhưng sẽ đến muộn.',
    audio_filename:'',slow_audio_filename:'',native_audio_filename:'',phonetic:null,
    unit_tags:[{occurance:"I'm on my way",unit_id:'on-way'},{occurance:"I'm running late",unit_id:'late'}],notes:[]
  };
  const db={items,events:[],bespokeCards:[card],captures:[]};
  const engine=A.buildEngine(db);
  assert.strictEqual(engine.cardIndex.size('on-way'),1);
  assert.strictEqual(engine.cardIndex.size('late'),1);
  A.finalizeCard(db,{engine,mode:B.Mode.READ,unitId:'on-way',card},{'on-way':3,late:1},{nowMs:100000});
  assert.strictEqual(db.bespokeProgress.ratings['on-way'][0].score,3);
  assert.strictEqual(db.bespokeProgress.ratings.late[0].score,1);
  assert.strictEqual(db.events[0].unitIds.length,2);
  assert.strictEqual(A.hasCompleteRatings(card,{'on-way':3,late:1}),true);
  assert.strictEqual(A.hasCompleteRatings(card,{'on-way':3,late:0}),false);
  ok();
}

{
  const sentence='I listen to music and pick up an order.';
  const items=[
    {id:'listen',target:'listen to music'},
    {id:'pickup',target:'pick up an order'},
  ];
  const tags=CI.tagKnownUnits(sentence,items);
  assert.deepStrictEqual(tags.map(t=>t.unit_id),['listen','pickup']);
  const card=CI.cardFromSentence(sentence,'Tôi nghe nhạc và nhận một đơn hàng.',items);
  assert(card);
  assert(CI.taggingCoverage(card.sentence,card.unit_tags)>0.7);
  ok();
}

{
  // asbplayer-inspired capture contract must preserve source/media provenance.
  const items=[{id:'late',target:"I'm running late",meaning:'Tôi sẽ đến muộn'}];
  const raw={
    sentence:"Sorry, I'm running late. I'll be there soon.",
    nativeSentence:'Xin lỗi, tôi sẽ đến muộn. Tôi sẽ tới sớm thôi.',
    url:'https://example.test/watch?v=1',mediaTimestamp:83.4,subtitleFileName:'episode-en.srt',
    subtitle:{text:"Sorry, I'm running late. I'll be there soon.",start:82.1,end:86.2,track:1,index:42},
    surroundingSubtitles:[{text:'Where are you?',start:79,end:81},{text:'No problem.',start:86.3,end:88}],
    audio:{ref:'audio/clip-42.ogg',start:82.1,end:86.2,paddingStart:.12,paddingEnd:.12},
    image:{ref:'images/frame-42.jpg'},
  };
  const capture=SC.normalizeCapture(raw);
  const card=SC.toBespokeCard(capture,items);
  assert(card);
  assert.strictEqual(card.capture_id,capture.id);
  assert.strictEqual(card.url,raw.url);
  assert.strictEqual(card.media_timestamp,83.4);
  assert.strictEqual(card.subtitle.start,82.1);
  assert.strictEqual(card.surrounding_subtitles.length,2);
  assert.strictEqual(card.audio.ref,'audio/clip-42.ogg');
  assert.strictEqual(card.image.ref,'images/frame-42.jpg');
  assert.deepStrictEqual(B.unitIds(card),['late']);

  const db={items,events:[],captures:[capture]};
  const engine=A.buildEngine(db);
  assert.strictEqual(engine.cardIndex.size('late'),1);
  assert.strictEqual(engine.cardIndex.cards('late')[0].capture_id,capture.id);
  ok();
}

{
  // F2: a curated unit's exampleSentence/exampleTranslation is reviewed real
  // context — it must become a sentence card, not leave the unit on the bare
  // fallback. No translation → still fallback; never fabricate one.
  const items=[{id:'on-way',target:"I'm on my way.",meaning:'Tôi đang trên đường tới.',
    exampleSentence:"I'm on my way. I'll be there in ten minutes.",
    exampleTranslation:'Tôi đang trên đường. Tôi sẽ tới trong mười phút.'}];
  const index=CI.importFlashDayItems(items);
  assert.strictEqual(index.size('on-way'),1);
  assert.strictEqual(index.cards('on-way')[0].sentence,"I'm on my way. I'll be there in ten minutes.");
  assert.strictEqual(index.cards('on-way')[0].source.type,'curated-example');
  const noTrans=[{id:'no-trans',target:'see you',meaning:'hẹn gặp',exampleSentence:'See you tomorrow.'}];
  assert.strictEqual(CI.importFlashDayItems(noTrans).cards('no-trans')[0].source.type,'fallback');
  ok();
}

console.log(`Bespoke/source capture: ${checks} repo-driven checks passed`);
