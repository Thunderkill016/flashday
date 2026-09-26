const assert=require('assert');
const fs=require('fs');
const path=require('path');
const WLK=require('../word-lookup.js');

let checks=0;
function ok(){checks++;}

// youtubeVideoId — every URL shape learners realistically paste.
{
  const cases=[
    ['https://www.youtube.com/watch?v=abc123XYZ_-','abc123XYZ_-'],
    ['https://youtu.be/abc123XYZ_-','abc123XYZ_-'],
    ['https://www.youtube.com/shorts/abc123XYZ_-','abc123XYZ_-'],
    ['https://www.youtube.com/embed/abc123XYZ_-','abc123XYZ_-'],
    ['https://www.youtube.com/watch?v=abc123XYZ_-&t=42s','abc123XYZ_-'],
    ['https://example.com/not-youtube',null],
    ['',null],
    [null,null],
  ];
  for(const [url,expected]of cases)assert.strictEqual(WLK.youtubeVideoId(url),expected,url);
  ok();
}

// lookup() — mocked fetch + in-memory localStorage stand-in.
{
  const store=new Map();
  global.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
  const calls=[];
  global.fetch=async(url)=>{
    calls.push(url);
    if(url.includes('dictionaryapi.dev')){
      return {ok:true,json:async()=>[{meanings:[{partOfSpeech:'verb',definitions:[{definition:'to move quickly using legs'}]},{partOfSpeech:'noun',definitions:[{definition:'an act of running'}]}]}]};
    }
    if(url.includes('mymemory')){
      return {ok:true,json:async()=>({responseData:{translatedText:'đang chạy'},matches:[{translation:'đang chạy'},{translation:'chạy bộ'},{translation:'QUẢNG CÁO SPAM'}]})};
    }
    throw new Error('unexpected url '+url);
  };

  (async()=>{
    const r=await WLK.lookup('Running');
    assert.strictEqual(r.word,'running');
    assert.strictEqual(r.en.length,2);
    assert.strictEqual(r.en[0].pos,'verb');
    assert.strictEqual(r.vi.main,'đang chạy');
    // Alternative glosses dedupe against main + drop all-caps spam.
    assert.deepStrictEqual(r.vi.alternatives,['chạy bộ']);
    assert(!r.cached);
    ok();

    // Second lookup hits cache — no network.
    const before=calls.length;
    const r2=await WLK.lookup('running');
    assert.strictEqual(r2.cached,true);
    assert.strictEqual(calls.length,before,'cache hit must not refetch');
    ok();

    // Offline path returns cached data or empty shape — never throws.
    const r3=await WLK.lookup('unknown',{online:false});
    assert.strictEqual(r3.offline,true);
    assert.deepStrictEqual(r3.en,[]);
    ok();

    // API failure (non-ok) → lookup still resolves with empty results.
    global.fetch=async()=>({ok:false,status:500,json:async()=>({})});
    store.clear();
    const r4=await WLK.lookup('broken');
    assert.deepStrictEqual(r4.en,[]);
    assert.strictEqual(r4.vi,null);
    ok();
    console.log(`word-lookup: ${checks} checks passed`);
  })().catch(err=>{console.error(err);process.exit(1);});
}
