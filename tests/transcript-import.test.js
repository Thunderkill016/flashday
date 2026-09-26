const assert=require('assert');
const TI=require('../transcript-import.js');
const SC=require('../source-capture.js');
const A=require('../bespoke-adapter.js');

let checks=0;const ok=()=>checks++;

{
  const srt=`1\n00:00:01,250 --> 00:00:03,500\nWhere are you?\n\n2\n00:00:04,000 --> 00:00:06,750\nI'm on my way.\n`;
  const segments=TI.parseSrt(srt);
  assert.strictEqual(segments.length,2);
  assert.strictEqual(segments[0].start,1.25);
  assert.strictEqual(segments[1].end,6.75);
  assert.strictEqual(segments[1].text,"I'm on my way.");
  ok();
}

{
  const json=JSON.stringify({segments:[{start:2,end:4,text:"I'm running late.",translation:'Tôi sẽ đến muộn.',pronunciation:'aɪm ˈrʌnɪŋ leɪt',audio_file:'late.mp3'}]});
  const segments=TI.parseJson(json);
  assert.strictEqual(segments[0].translation,'Tôi sẽ đến muộn.');
  assert.strictEqual(segments[0].pronunciation,'aɪm ˈrʌnɪŋ leɪt');
  assert.strictEqual(segments[0].audioFile,'late.mp3');
  ok();
}

{
  const clip=TI.clipWindow({start:1.234,end:2.345,text:'x'},{durationSeconds:10,paddingMs:200});
  assert.strictEqual(clip.startMs,1034);
  assert.strictEqual(clip.endMs,2545);
  assert.strictEqual(clip.paddingStart,.2);
  ok();
}

{
  const segments=[
    {start:0,end:1,text:'Where are you?',translation:'Bạn ở đâu?'},
    {start:1.2,end:2.6,text:"I'm on my way.",translation:'Tôi đang trên đường.',pronunciation:'aɪm ɒn maɪ weɪ',audio_file:'seg2.mp3'},
    {start:2.8,end:4,text:'Okay, see you soon.',translation:'Được, gặp lại sớm.'},
  ];
  const captures=TI.segmentsToCaptures(segments,{url:'https://example.test/video',fileName:'lesson.mp4',subtitleFileName:'lesson-en.srt',audioBasePath:'media',contextRadius:1});
  assert.strictEqual(captures.length,3);
  const c=captures[1];
  assert.strictEqual(c.url,'https://example.test/video');
  assert.strictEqual(c.subtitleFileName,'lesson-en.srt');
  assert.strictEqual(c.surroundingSubtitles.length,2);
  assert.strictEqual(c.audio.ref,'media/seg2.mp3');
  assert.strictEqual(c.pronunciation,'aɪm ɒn maɪ weɪ');
  assert(SC.isCardReady(c));
  ok();
}

{
  const items=[{id:'on-way',target:"I'm on my way.",meaning:'Tôi đang trên đường.',type:'chunk'}];
  const db={items,events:[],captures:[]};
  const result=TI.importIntoDb(db,[
    {start:1,end:2,text:'Unrelated sentence.',translation:'Câu không liên quan.'},
    {start:2,end:3,text:"I'm on my way.",translation:'Tôi đang trên đường.',pronunciation:'aɪm ɒn maɪ weɪ',audio_file:'on-way.mp3'},
  ],{fileName:'lesson.mp4',audioBasePath:'media'});
  assert.strictEqual(result.added,2);
  assert.strictEqual(result.ready,2);
  const engine=A.buildEngine(db);
  // Only the segment that contains the known Unit becomes a Bespoke card.
  assert.strictEqual(engine.cardIndex.size('on-way'),1);
  const card=engine.cardIndex.cards('on-way')[0];
  assert.strictEqual(card.sentence,"I'm on my way.");
  assert.strictEqual(card.audio.ref,'media/on-way.mp3');
  assert.strictEqual(card.audio_filename,'media/on-way.mp3');
  assert.strictEqual(card.phonetic,'aɪm ɒn maɪ weɪ');
  assert.notStrictEqual(card.source.type,'fallback');
  ok();
}

assert.strictEqual(TI.formatTimestamp(3661.125),'01:01:01,125');
ok();

{
  // YouTube "Show transcript" copy shape: timestamp on its own line, text next.
  const yt=`0:00\nwelcome back to the channel\n0:05\ntoday we're looking at phones\n1:12\nlet's dive in`;
  const segments=TI.parsePlain(yt);
  assert.strictEqual(segments.length,3);
  assert.strictEqual(segments[0].start,0);
  assert.strictEqual(segments[1].start,5);
  assert.strictEqual(segments[1].text,"today we're looking at phones");
  assert.strictEqual(segments[2].start,72);
  ok();
}

{
  // Inline "0:05 text" shape and bracketed timestamps also parse.
  const pasted=`[0:02] hello there\n1:30 second line\nplain prose line`;
  const segments=TI.parsePlain(pasted);
  assert.strictEqual(segments.length,3);
  assert.strictEqual(segments[0].start,2);
  assert.strictEqual(segments[0].text,'hello there');
  assert.strictEqual(segments[1].start,90);
  assert.strictEqual(segments[2].text,'plain prose line');
  ok();
}

{
  // Empty and timestamp-free text still yields one segment per line.
  assert.deepStrictEqual(TI.parsePlain(''),[]);
  const prose=TI.parsePlain('First line.\n\nSecond line.');
  assert.strictEqual(prose.length,2);
  assert.strictEqual(prose[0].text,'First line.');
  ok();
}

console.log(`Transcript import: ${checks} audio2anki-derived checks passed`);
