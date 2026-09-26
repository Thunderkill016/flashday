/*
 * Browser-friendly port of the core indexing behavior from google/bespoke's
 * bespoke/card.py CardIndex plus deterministic import helpers for existing FlashDay data.
 *
 * Upstream CardIndex behavior preserved here:
 * - one Card may index under multiple unit ids
 * - unit id -> list of card ids
 * - cards(unit, limit) returns candidate sentence cards for DeckEngine
 *
 * FlashDay import helpers are clearly separated below; they are NOT upstream Bespoke code.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./bespoke-engine.js'),require('./flashday-product.js'));
  // Browser bundle imports card-index before flashday-product, so the product
  // module is resolved lazily at call time rather than captured at load time.
  else root.BespokeCardIndex=factory(root.BespokeSrs,function(){return root.FlashDayProduct;});
})(typeof globalThis!=='undefined'?globalThis:this,function(B,P){
  'use strict';
  if(!B)throw new Error('BespokeSrs is required');
  const product=()=>typeof P==='function'?P():P;

  class CardIndex{
    constructor(cards=[]){
      this._index={};
      this._cache={};
      for(const card of cards)this.add(card);
    }

    add(card){
      validateCard(card);
      for(const unitId of B.unitIds(card)){
        const ids=this._index[unitId]||(this._index[unitId]=[]);
        if(!ids.includes(card.id))ids.push(card.id);
      }
      this._cache[card.id]=card;
      return card;
    }

    remove(cardId){
      const card=this._cache[cardId];
      if(!card)return false;
      delete this._cache[cardId];
      for(const unitId of B.unitIds(card)){
        const ids=(this._index[unitId]||[]).filter(id=>id!==cardId);
        if(ids.length)this._index[unitId]=ids;else delete this._index[unitId];
      }
      return true;
    }

    cards(unitOrId,limit=null){
      const unitId=typeof unitOrId==='string'?unitOrId:unitOrId.id;
      let ids=[...(this._index[unitId]||[])];
      if(limit!=null&&ids.length>limit)ids=shuffle(ids).slice(0,limit);
      return ids.map(id=>this._cache[id]).filter(Boolean);
    }

    allCards(){return Object.values(this._cache);}
    size(unitOrId){const id=typeof unitOrId==='string'?unitOrId:unitOrId.id;return (this._index[id]||[]).length;}
    indexObject(){return JSON.parse(JSON.stringify(this._index));}
  }

  function validateCard(card){
    if(!card||!card.id||typeof card.sentence!=='string')throw new Error('Invalid Bespoke card');
    let sentenceIndex=0;
    for(const tag of card.unit_tags||[]){
      const start=tagIndex(card.sentence,tag,sentenceIndex);
      if(start<0)throw new Error(`Tag occurance '${tag.occurance}' not found in sentence after index ${sentenceIndex}`);
      sentenceIndex=start+tag.occurance.length;
    }
    return true;
  }

  // A tag that carries its own char offset (fresh tags do) is authoritative;
  // legacy tags without it still resolve by indexOf as before.
  function tagIndex(sentence,tag,fromIndex){
    if(Number.isInteger(tag.index)&&sentence.slice(tag.index,tag.index+tag.occurance.length)===tag.occurance)return tag.index;
    return sentence.indexOf(tag.occurance,fromIndex);
  }

  function splitIntoParts(card){
    validateCard(card);
    const parts=[];let sentenceIndex=0;
    for(const tag of card.unit_tags||[]){
      const start=tagIndex(card.sentence,tag,sentenceIndex);
      if(start>sentenceIndex)parts.push({occurance:card.sentence.slice(sentenceIndex,start),unit_id:''});
      parts.push({...tag});sentenceIndex=start+tag.occurance.length;
    }
    if(sentenceIndex<card.sentence.length)parts.push({occurance:card.sentence.slice(sentenceIndex),unit_id:''});
    return parts;
  }

  function taggingCoverage(sentence,unitTags){
    const meaningful=[...sentence].map((c,i)=>({c,i})).filter(x=>/[\p{L}\p{N}]/u.test(x.c));
    if(!meaningful.length)return 0;
    const covered=new Set();let cursor=0;
    for(const tag of unitTags||[]){
      const start=sentence.indexOf(tag.occurance,cursor);if(start<0)continue;
      for(let i=start;i<start+tag.occurance.length;i++)if(/[\p{L}\p{N}]/u.test(sentence[i]))covered.add(i);
      cursor=start+tag.occurance.length;
    }
    return covered.size/meaningful.length;
  }

  function shuffle(arr){
    const out=arr.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
  }

  // ---------------------------------------------------------------------------
  // FlashDay-specific deterministic importer. No LLM guessing happens here.
  // `forms` means true surface-form aliases of ONE unit. `accepted` is legacy
  // grader data and is intentionally NOT used to define unit identity/cards.
  // ---------------------------------------------------------------------------

  // Occurrences are matched on canonical token sequences, not raw substrings:
  // word boundaries are inherent ("art" never tags inside "start"), sentence
  // punctuation stored inside a form can't block a match ("I am on my way."
  // still matches "I am on my way to work."), and contractions compare under
  // the same expansion the attempt diff uses ("I'm" ≡ "i am"). The returned
  // occurance is always an exact slice of the original sentence so card
  // splitting/annotation keep working on real characters.
  function sentenceTokens(sentence){
    const P=product();
    const tokens=[];const re=/[\p{L}\p{N}'’]+/gu;let match;
    while((match=re.exec(String(sentence)))){
      const canon=P?.canonicalTokens?P.canonicalTokens(match[0]):[match[0].toLowerCase()];
      for(const part of canon)tokens.push({canon:part,start:match.index,end:match.index+match[0].length});
    }
    return tokens;
  }

  function formTokens(form){
    const P=product();
    const text=String(form);
    return P?.canonicalTokens?P.canonicalTokens(text):text.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function findOccurrence(sentence,forms,fromIndex=0){
    const tokens=sentenceTokens(sentence);let best=null;
    for(const form of forms.filter(Boolean)){
      const wanted=formTokens(form);
      if(!wanted.length||wanted.length>tokens.length)continue;
      for(let i=0;i+wanted.length<=tokens.length;i++){
        if(tokens[i].start<fromIndex)continue;
        if(!wanted.every((w,offset)=>tokens[i+offset].canon===w))continue;
        const start=tokens[i].start,end=tokens[i+wanted.length-1].end;
        const hit={index:start,length:end-start,occurance:String(sentence).slice(start,end)};
        if(best==null||hit.index<best.index||(hit.index===best.index&&hit.length>best.length))best=hit;
        break;
      }
    }
    return best;
  }

  function unitForms(item){
    return [item.target,...(Array.isArray(item.forms)?item.forms:[])].filter(Boolean);
  }

  function tagKnownUnits(sentence,items){
    const candidates=[];
    for(const item of items||[]){
      const hit=findOccurrence(sentence,unitForms(item),0);
      if(hit)candidates.push({...hit,unit_id:item.id});
    }
    candidates.sort((a,b)=>a.index-b.index||b.length-a.length);
    const tags=[];let cursor=0;
    for(const hit of candidates){
      if(hit.index<cursor)continue;
      tags.push({occurance:hit.occurance,unit_id:hit.unit_id,index:hit.index});cursor=hit.index+hit.length;
    }
    return tags;
  }

  function stableId(prefix,text){
    let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
    return `${prefix}_${(h>>>0).toString(16).padStart(8,'0')}`;
  }

  function cardFromSentence(sentence,nativeSentence,items,{id=null,notes=[],source=null}={}){
    const unit_tags=tagKnownUnits(sentence,items);if(!unit_tags.length)return null;
    const card={id:id||stableId('sentence',sentence),sentence,native_sentence:nativeSentence||'',audio_filename:'',slow_audio_filename:'',native_audio_filename:'',phonetic:null,unit_tags,notes:[...notes],source:source||null};
    validateCard(card);return card;
  }

  function baseCardFromItem(item){
    const form=item.target;
    const card={
      id:`flashday:${item.id}:fallback`,sentence:form,native_sentence:item.meaning,
      audio_filename:'',slow_audio_filename:'',native_audio_filename:'',phonetic:null,
      unit_tags:[{occurance:form,unit_id:item.id}],notes:['FlashDay fallback card: replace with a full source sentence in a real dataset.'],
      source:{type:'fallback',label:'Fallback phrase card'}
    };
    validateCard(card);return card;
  }

  function addUniqueCard(index,seenSentences,card){
    if(!card||seenSentences.has(card.sentence))return false;
    index.add(card);seenSentences.add(card.sentence);return true;
  }

  function importFlashDayItems(items,extraCards=[]){
    const index=new CardIndex();const seenSentences=new Set();

    // 1) Real/curated Bespoke-format sentence cards are the primary dataset.
    for(const card of extraCards||[])addUniqueCard(index,seenSentences,card);

    // 2) Existing FlashDay source sentence becomes a card only when a full native
    // translation is explicitly present. Never fabricate translation here.
    for(const item of items||[]){
      const sentence=item.source?.sentence?.trim();
      const native=item.source?.native_sentence||item.source?.translation||'';
      if(!sentence||!native||seenSentences.has(sentence))continue;
      const sourceCard=cardFromSentence(sentence,native,items,{source:item.source,notes:item.source?.note?[item.source.note]:[]});
      addUniqueCard(index,seenSentences,sourceCard);
    }

    // 3) A bare target phrase is only a transitional fallback for a unit that
    // has ZERO real sentence cards. This keeps the prototype usable without
    // polluting units that already have real context cards.
    for(const item of items||[]){
      if(index.size(item.id)>0)continue;
      addUniqueCard(index,seenSentences,baseCardFromItem(item));
    }
    return index;
  }

  return {CardIndex,validateCard,splitIntoParts,taggingCoverage,findOccurrence,unitForms,tagKnownUnits,cardFromSentence,baseCardFromItem,importFlashDayItems};
});
