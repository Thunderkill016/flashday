/*
 * FlashDay persistent state gateway.
 *
 * The API follows the proven vanilla-store shape used by mature state libraries:
 * getState / setState-like transactions / subscribe. The important FlashDay
 * addition is refresh-before-transaction because the legacy review runtime can
 * still write the same localStorage record directly. A secondary feature must
 * never commit an old snapshot over newer review history.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory();
  else root.FlashDayStore=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}

  function createPersistentStore({storage,key,hydrate,fallback}){
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw new Error('Storage adapter is required');
    if(!key)throw new Error('Storage key is required');
    if(typeof hydrate!=='function')throw new Error('hydrate() is required');
    if(typeof fallback!=='function')throw new Error('fallback() is required');

    // `key` may be a resolver so the active account namespace is read fresh
    // on every access — sign-in/sign-out must not strand writes in the
    // previous owner's slot.
    const resolveKey=typeof key==='function'?key:()=>key;

    const listeners=new Set();

    function readLatest(){
      try{
        const raw=storage.getItem(resolveKey());
        if(raw)return hydrate(JSON.parse(raw));
      }catch(_error){}
      return hydrate(fallback());
    }

    let state=readLatest();

    function emit(previous){
      for(const listener of listeners)listener(state,previous);
    }

    function getState(){return state;}

    function refresh(){
      const previous=state;
      state=readLatest();
      return state;
    }

    function persist(next){
      storage.setItem(resolveKey(),JSON.stringify(next));
    }

    function transact(mutator){
      if(typeof mutator!=='function')throw new Error('Transaction mutator is required');
      const latest=readLatest();
      const draft=clone(latest);
      const result=mutator(draft);
      const previous=state;
      state=hydrate(draft);
      persist(state);
      emit(previous);
      return {state,result};
    }

    function replace(next,{persistState=true}={}){
      const previous=state;
      state=hydrate(clone(next));
      if(persistState)persist(state);
      emit(previous);
      return state;
    }

    function reset(){
      return replace(fallback());
    }

    function subscribe(listener){
      if(typeof listener!=='function')throw new Error('Listener is required');
      listeners.add(listener);
      return ()=>listeners.delete(listener);
    }

    return {getState,refresh,transact,replace,reset,subscribe};
  }

  return {createPersistentStore};
});