const assert=require('assert');
const D=require('../flashday-data.js');

{
  const db=D.createInitialDb(undefined,1000);
  assert.strictEqual(db.version,'repo-driven-2');
  assert.strictEqual(db.items.length,5);
  assert.deepStrictEqual(db.events,[]);
  assert.deepStrictEqual(db.captures,[]);
  assert.deepStrictEqual(db.transferAttempts,[]);
  assert.strictEqual(db.scheduler,'bespoke-language-policy+fsrs6');
  assert.strictEqual(db.fsrsProgress,null);
  assert.deepStrictEqual(db.transferAttempts,[]);
}

{
  const legacy={
    version:3,createdAt:10,
    items:[{id:'x',target:'hello',meaning:'xin chào',type:'word_sense'}],
    states:{x:{legacy:true}},
    events:[{id:'e1'}],captures:[{id:'c1',sentence:'hello there'}],
    bespokeCards:[{id:'b1'}],bespokeProgress:{ratings:{x:[]}},scheduler:'google-bespoke-port'
  };
  const db=D.migrateDb(legacy,2000);
  assert.strictEqual(db.version,'repo-driven-2');
  assert.strictEqual(db.items[0].id,'x');
  assert.strictEqual(db.events[0].id,'e1');
  assert.strictEqual(db.captures[0].id,'c1');
  assert.strictEqual(db.bespokeCards[0].id,'b1');
  assert.deepStrictEqual(db.bespokeProgress,{ratings:{x:[]}});
  assert.strictEqual(db.fsrsProgress,null);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(db,'states'),false,'legacy custom learner state must not enter active runtime schema');
}

{
  const db=D.createInitialDb([]);
  const item=D.addItem(db,{target:'  take care  ',meaning:'chăm sóc',type:'chunk',forms:['takes care']});
  assert.strictEqual(item.target,'take care');
  assert.deepStrictEqual(item.forms,['takes care']);
  assert.throws(()=>D.addItem(db,{target:'TAKE   CARE',meaning:'x'}),/đã tồn tại/i);
}

{
  const db=D.createInitialDb([]);
  const item=D.addItem(db,{
    target:'let me know',meaning:'hãy cho tôi biết',type:'expression',
    intent:'yêu cầu cập nhật',canDo:'Tôi có thể xin người khác báo lại.',
    exampleSentence:'Let me know when you arrive.',exampleTranslation:'Hãy cho tôi biết khi bạn tới.',origin:'source-captured'
  });
  assert.strictEqual(item.intent,'yêu cầu cập nhật');
  assert.strictEqual(item.canDo,'Tôi có thể xin người khác báo lại.');
  assert.strictEqual(item.origin,'source-captured');
}

{
  // F1: per-account local namespaces. Guest/preview data lives at the base
  // key; signing in claims it into the uid slot and empties the shared pool
  // so a second account on the same browser can never inherit it.
  const storage={ _m:new Map(),
    getItem(k){ return this._m.has(k)?this._m.get(k):null; },
    setItem(k,v){ this._m.set(k,String(v)); },
    removeItem(k){ this._m.delete(k); } };
  assert.strictEqual(D.dbKey(storage), D.DB_BASE_KEY, 'no owner marker → shared guest key');
  storage.setItem(D.DB_BASE_KEY, JSON.stringify({ items: [{ id: 'a-only' }] }));
  D.claimDbNamespace(storage, 'alice');
  assert.strictEqual(D.dbKey(storage), `${D.DB_BASE_KEY}:u:alice`, 'marker routes reads to the uid namespace');
  assert.deepStrictEqual(JSON.parse(storage.getItem(`${D.DB_BASE_KEY}:u:alice`)).items, [{ id: 'a-only' }], 'guest work claimed into the account');
  assert.strictEqual(storage.getItem(D.DB_BASE_KEY), null, 'shared pool cleared after claim');
  // A second account must not see alice's claimed data.
  D.claimDbNamespace(storage, 'bob');
  assert.strictEqual(D.dbKey(storage), `${D.DB_BASE_KEY}:u:bob`);
  assert.strictEqual(storage.getItem(`${D.DB_BASE_KEY}:u:bob`), null, 'bob gets a clean namespace — no alice leftovers');
  assert(storage.getItem(`${D.DB_BASE_KEY}:u:alice`) != null, "alice's namespace is untouched");
  // Sign-out returns to the (now empty) shared pool.
  D.releaseDbNamespace(storage);
  assert.strictEqual(D.dbKey(storage), D.DB_BASE_KEY);
  assert.strictEqual(storage.getItem(D.DB_BASE_KEY), null, 'sign-out lands on an empty guest pool, not alice data');
}

console.log('FlashDay data layer: 5 checks passed');
