/*
 * FlashDay learning-entry model.
 *
 * Product boundary:
 * - Guided Path and My Content are two content entry points, not two engines.
 * - CEFR values here are learner/content descriptors, never inferred from card
 *   completion alone.
 * - Unit identity uses target + explicit forms only. accepted[] is response
 *   compatibility and must not silently merge synonym expressions.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./flashday-product.js'));
  // Resolved lazily: the bundler may evaluate this module before the product
  // module assigns its global.
  else root.FlashDayLearningEntry=factory(function(){return root.FlashDayProduct;});
})(typeof globalThis!=='undefined'?globalThis:this,function(P){
  'use strict';
  const product=()=>typeof P==='function'?P():P;

  const PROFILE_VERSION=1;
  const CEFR_LEVELS=Object.freeze(['A1','A2','B1','B2','C1','C2']);
  const SKILLS=Object.freeze(['listen','speak','read','write']);
  const PROFILE_BASES=new Set(['unrated','self-reported','placement','human-reviewed']);
  const SOURCE_KINDS=new Set(['youtube','article','audio','transcript','manual']);

  const GUIDED_CLUSTERS=Object.freeze([
    {
      id:'a1-meeting-change',level:'A1',title:'Hẹn gặp và đổi kế hoạch',
      canDo:'Tôi có thể hiểu một kế hoạch đơn giản, đề xuất giờ hẹn, báo có thay đổi và xác nhận lại thời gian mới.',
      moduleIds:['a1-communication-repair','a1-simple-plans','a1-meeting-propose','a1-meeting-change','a1-meeting-confirm'],
      workedExample:{
        label:'Mẫu hội thoại ngắn',
        turns:[
          {speaker:'Linh',text:'Are you free on Saturday?',translation:'Bạn rảnh thứ Bảy không?'},
          {speaker:'Alex',text:'How about six?',translation:'Sáu giờ thì sao?'},
          {speaker:'Linh',text:'That works for me.',translation:'Giờ đó hợp với tôi.'},
          {speaker:'Linh',text:'Sorry, something came up. Can we move it to seven?',translation:'Xin lỗi, tôi có việc đột xuất. Mình chuyển sang bảy giờ được không?'},
          {speaker:'Alex',text:'No problem. See you at seven.',translation:'Không sao. Hẹn gặp lúc bảy giờ.'}
        ]
      },
      audioNote:'Bản pilot này dùng text và TTS để luyện; chưa có audio nguồn được kiểm duyệt cho từng Unit.'
    }
  ]);

  const GUIDED_MODULES=Object.freeze([
    {
      id:'a1-communication-repair',clusterId:'a1-meeting-change',order:1,level:'A1',title:'Khi chưa hiểu',
      canDo:'Tôi có thể báo rằng mình chưa hiểu và lịch sự xin người khác nói lại hoặc nói chậm hơn.',
      units:[
        {id:'say-again',type:'expression',target:'Could you say that again?',meaning:'Bạn có thể nói lại được không?',forms:[],accepted:['Can you say that again?','Could you repeat that?','Can you repeat that?'],contexts:['Bạn không nghe rõ người đối diện.'],tags:['survival','conversation'],intent:'Yêu cầu người khác lặp lại lời vừa nói.',canDo:'Tôi có thể lịch sự xin nghe lại khi chưa hiểu.',exampleSentence:'Could you say that again? I did not catch the last part.',exampleTranslation:'Bạn có thể nói lại được không? Tôi không nghe kịp phần cuối.'},
        {id:'dont-understand',type:'expression',target:"I don't understand.",meaning:'Tôi không hiểu.',forms:['I do not understand.'],accepted:[],contexts:['Bạn cần nói rõ rằng mình chưa hiểu điều vừa nghe hoặc đọc.'],tags:['survival','conversation'],intent:'Báo rằng mình chưa hiểu.',canDo:'Tôi có thể nói rõ rằng mình chưa hiểu.',exampleSentence:"Sorry, I don't understand. Could you explain it again?",exampleTranslation:'Xin lỗi, tôi không hiểu. Bạn có thể giải thích lại được không?'},
        {id:'speak-more-slowly',type:'expression',target:'Could you speak more slowly?',meaning:'Bạn có thể nói chậm hơn không?',forms:[],accepted:['Can you speak more slowly?'],contexts:['Người đối diện nói quá nhanh.'],tags:['survival','conversation'],intent:'Yêu cầu người khác giảm tốc độ nói.',canDo:'Tôi có thể lịch sự xin người khác nói chậm hơn.',exampleSentence:'Could you speak more slowly? I am still learning English.',exampleTranslation:'Bạn có thể nói chậm hơn không? Tôi vẫn đang học tiếng Anh.'},
        {id:'what-does-that-mean',type:'expression',target:'What does that mean?',meaning:'Điều đó nghĩa là gì?',forms:[],accepted:[],contexts:['Bạn nghe hoặc đọc một từ/cụm mà chưa hiểu.'],tags:['survival','conversation'],intent:'Hỏi nghĩa của điều vừa nghe hoặc đọc.',canDo:'Tôi có thể hỏi nghĩa khi gặp điều chưa hiểu.',exampleSentence:'What does that mean? I have not heard that expression before.',exampleTranslation:'Điều đó nghĩa là gì? Tôi chưa từng nghe cụm đó trước đây.'}
      ]
    },
    {
      id:'a1-simple-plans',clusterId:'a1-meeting-change',order:2,level:'A1',title:'Chốt một kế hoạch đơn giản',
      canDo:'Tôi có thể hỏi thời gian, xác nhận một giờ hẹn và báo mình đang trên đường hoặc sẽ tới muộn.',
      units:[
        {id:'what-time',type:'expression',target:'What time?',meaning:'Mấy giờ?',forms:[],accepted:[],contexts:['Bạn biết sẽ gặp nhau nhưng chưa biết giờ.'],tags:['daily','plans'],intent:'Hỏi thời gian của một kế hoạch.',canDo:'Tôi có thể hỏi giờ của một kế hoạch đơn giản.',exampleSentence:'What time? Is six okay?',exampleTranslation:'Mấy giờ? Sáu giờ được không?'},
        {id:'see-you-at-six',type:'chunk',target:'See you at six.',meaning:'Hẹn gặp bạn lúc sáu giờ.',forms:[],accepted:[],contexts:['Hai người vừa thống nhất gặp nhau lúc sáu giờ.'],tags:['daily','plans'],intent:'Xác nhận giờ gặp.',canDo:'Tôi có thể xác nhận một giờ hẹn đơn giản.',exampleSentence:'Great. See you at six.',exampleTranslation:'Tuyệt. Hẹn gặp bạn lúc sáu giờ.'},
        {id:'on-my-way',type:'chunk',target:"I'm on my way.",meaning:'Tôi đang trên đường tới.',forms:['I am on my way.'],accepted:["I'm on the way",'I am on the way'],contexts:['Một người đang đợi và hỏi bạn đang ở đâu.'],tags:['daily','message'],intent:'Báo cho người khác biết tôi đang di chuyển tới.',canDo:'Tôi có thể nhắn rằng tôi đang trên đường tới điểm hẹn.',exampleSentence:"I'm on my way. I'll be there in ten minutes.",exampleTranslation:'Tôi đang trên đường. Tôi sẽ tới trong mười phút.'},
        {id:'running-late',type:'chunk',target:"I'm running late.",meaning:'Tôi đang bị trễ / sắp đến muộn.',forms:['I am running late.'],accepted:[],contexts:['Cuộc hẹn sắp bắt đầu nhưng bạn vẫn còn trên đường.'],tags:['daily','message'],intent:'Xin lỗi và báo sẽ tới muộn.',canDo:'Tôi có thể báo người đang chờ rằng tôi sẽ tới muộn.',exampleSentence:"Sorry, I'm running late. I'll be there soon.",exampleTranslation:'Xin lỗi, tôi đang đến muộn. Tôi sẽ tới sớm thôi.'}
      ]
    },
    {
      id:'a1-meeting-propose',clusterId:'a1-meeting-change',order:3,level:'A1',title:'Đề xuất và đồng ý giờ hẹn',
      canDo:'Tôi có thể hỏi người khác có rảnh không, đề xuất giờ và phản hồi khi giờ đó phù hợp.',
      units:[
        {id:'are-you-free-on-saturday',type:'expression',target:'Are you free on Saturday?',meaning:'Bạn rảnh thứ Bảy không?',forms:[],accepted:[],contexts:['Bạn muốn hẹn một người vào thứ Bảy.'],tags:['daily','plans'],intent:'Hỏi người khác có rảnh vào một ngày cụ thể.',canDo:'Tôi có thể hỏi người khác có rảnh để gặp.',exampleSentence:'Are you free on Saturday? We could get coffee.',exampleTranslation:'Bạn rảnh thứ Bảy không? Mình có thể đi uống cà phê.'},
        {id:'what-time-works-for-you',type:'expression',target:'What time works for you?',meaning:'Giờ nào phù hợp với bạn?',forms:[],accepted:[],contexts:['Bạn đã đồng ý gặp nhưng cần để người kia chọn giờ phù hợp.'],tags:['daily','plans'],intent:'Hỏi giờ phù hợp với người khác.',canDo:'Tôi có thể hỏi giờ phù hợp với người khác.',exampleSentence:'What time works for you on Saturday?',exampleTranslation:'Thứ Bảy giờ nào phù hợp với bạn?'},
        {id:'how-about-six',type:'expression',target:'How about six?',meaning:'Sáu giờ thì sao?',forms:[],accepted:[],contexts:['Bạn muốn đề xuất gặp lúc sáu giờ.'],tags:['daily','plans'],intent:'Đề xuất một lựa chọn thời gian.',canDo:'Tôi có thể đề xuất một giờ hẹn đơn giản.',exampleSentence:'How about six? The cafe is open then.',exampleTranslation:'Sáu giờ thì sao? Quán cà phê lúc đó mở.'},
        {id:'that-works-for-me',type:'expression',target:'That works for me.',meaning:'Giờ đó hợp với tôi.',forms:[],accepted:[],contexts:['Người kia vừa đề xuất giờ hoặc địa điểm bạn đồng ý.'],tags:['daily','plans'],intent:'Đồng ý với một đề xuất.',canDo:'Tôi có thể xác nhận một đề xuất phù hợp với mình.',exampleSentence:'Six is great. That works for me.',exampleTranslation:'Sáu giờ rất ổn. Giờ đó hợp với tôi.'}
      ]
    },
    {
      id:'a1-meeting-change',clusterId:'a1-meeting-change',order:4,level:'A1',title:'Khi kế hoạch thay đổi',
      canDo:'Tôi có thể báo có việc đột xuất, xin dời lịch và đề xuất giờ mới.',
      units:[
        {id:'something-came-up',type:'expression',target:'Something came up.',meaning:'Tôi có việc đột xuất.',forms:[],accepted:[],contexts:['Bạn đã có lịch hẹn nhưng bất ngờ có việc cần xử lý.'],tags:['daily','plans'],intent:'Báo có việc bất ngờ làm ảnh hưởng kế hoạch.',canDo:'Tôi có thể báo ngắn gọn rằng có việc đột xuất.',exampleSentence:'Sorry, something came up. I need to leave early.',exampleTranslation:'Xin lỗi, tôi có việc đột xuất. Tôi cần về sớm.'},
        {id:'i-need-to-reschedule',type:'expression',target:'I need to reschedule.',meaning:'Tôi cần dời lịch.',forms:[],accepted:[],contexts:['Bạn không thể giữ giờ hẹn cũ.'],tags:['daily','plans'],intent:'Báo cần đổi lịch hẹn.',canDo:'Tôi có thể lịch sự nói rằng mình cần dời lịch.',exampleSentence:'I need to reschedule our meeting.',exampleTranslation:'Tôi cần dời lịch cuộc hẹn của chúng ta.'},
        {id:'can-we-move-it-to-seven',type:'expression',target:'Can we move it to seven?',meaning:'Mình chuyển sang bảy giờ được không?',forms:[],accepted:[],contexts:['Bạn muốn dời giờ hẹn từ sáu sang bảy giờ.'],tags:['daily','plans'],intent:'Đề xuất giờ mới cho một kế hoạch đã có.',canDo:'Tôi có thể đề xuất dời một cuộc hẹn sang giờ mới.',exampleSentence:'Can we move it to seven? I will be late.',exampleTranslation:'Mình chuyển sang bảy giờ được không? Tôi sẽ đến muộn.'},
        {id:'does-seven-work-for-you-instead',type:'expression',target:'Does seven work for you instead?',meaning:'Bảy giờ thay vào đó có phù hợp với bạn không?',forms:[],accepted:[],contexts:['Bạn muốn kiểm tra giờ mới có phù hợp với người kia.'],tags:['daily','plans'],intent:'Hỏi người kia có đồng ý với giờ mới không.',canDo:'Tôi có thể lịch sự kiểm tra một giờ thay thế.',exampleSentence:'Does seven work for you instead?',exampleTranslation:'Bảy giờ thay vào đó có phù hợp với bạn không?'}
      ]
    },
    {
      id:'a1-meeting-confirm',clusterId:'a1-meeting-change',order:5,level:'A1',title:'Xác nhận và phối hợp',
      canDo:'Tôi có thể phản hồi một thay đổi, xác nhận giờ mới và nhắn tình trạng đến nơi.',
      units:[
        {id:'no-problem',type:'expression',target:'No problem.',meaning:'Không sao.',forms:[],accepted:[],contexts:['Người kia xin thay đổi kế hoạch và bạn đồng ý.'],tags:['daily','plans'],intent:'Trấn an và đồng ý với thay đổi nhỏ.',canDo:'Tôi có thể phản hồi thân thiện khi người khác đổi kế hoạch.',exampleSentence:'No problem. Seven is fine.',exampleTranslation:'Không sao. Bảy giờ được.'},
        {id:'see-you-at-seven',type:'chunk',target:'See you at seven.',meaning:'Hẹn gặp lúc bảy giờ.',forms:[],accepted:[],contexts:['Hai người vừa chốt giờ hẹn mới là bảy giờ.'],tags:['daily','plans'],intent:'Xác nhận giờ gặp mới.',canDo:'Tôi có thể xác nhận lại một giờ hẹn đã đổi.',exampleSentence:'Great, see you at seven.',exampleTranslation:'Tuyệt, hẹn gặp lúc bảy giờ.'},
        {id:'let-me-know-when-you-get-there',type:'expression',target:'Let me know when you get there.',meaning:'Nhắn tôi khi bạn tới nhé.',forms:[],accepted:[],contexts:['Bạn muốn người kia báo khi đã tới nơi hẹn.'],tags:['daily','plans'],intent:'Yêu cầu một cập nhật khi đến nơi.',canDo:'Tôi có thể nhờ người khác báo khi họ tới nơi.',exampleSentence:'Let me know when you get there, and I will come outside.',exampleTranslation:'Nhắn tôi khi bạn tới nhé, rồi tôi sẽ ra ngoài.'},
        {id:'ill-be-there-in-ten-minutes',type:'chunk',target:"I'll be there in ten minutes.",meaning:'Tôi sẽ tới đó trong mười phút.',forms:['I will be there in ten minutes.'],accepted:[],contexts:['Bạn đang trên đường và muốn nói rõ thời gian tới nơi.'],tags:['daily','plans'],intent:'Báo ước lượng thời gian đến.',canDo:'Tôi có thể nói mình sẽ đến nơi trong bao lâu.',exampleSentence:"I'm on my way. I'll be there in ten minutes.",exampleTranslation:'Tôi đang trên đường. Tôi sẽ tới đó trong mười phút.'}
      ]
    }
  ]);

  const TRANSFER_MISSIONS=Object.freeze([
    {
      id:'a1-meeting-change-transfer',clusterId:'a1-meeting-change',level:'A1',title:'Đổi giờ hẹn vào phút chót',
      canDo:'Tôi có thể phản hồi một thay đổi và chốt lại giờ hẹn mới bằng 2–3 câu đơn giản.',
      setup:'Bạn và Alex đã hẹn gặp lúc 6 giờ ở quán cà phê. Bây giờ Alex nhắn:',
      incomingMessage:'Sorry, something came up. Can we move it to seven?',
      instructions:'Trả lời bằng tiếng Anh: đồng ý hoặc đề xuất giờ khác, rồi xác nhận lại giờ cuối cùng. Bạn có thể viết hoặc nói thành tiếng.',
      // The can-do is "confirm the final time" — a text attempt that never
      // states a time cannot demonstrate it. Spoken-only attempts stay
      // allowed but carry grading:'self-check' either way.
      requireFinalTimeConfirm:true,
      modelAnswer:['No problem. Seven works for me.', 'Great. See you at seven.'],
      selfCheck:['Bạn có phản hồi về việc đổi lịch không?', 'Bạn có nói rõ giờ cuối cùng không?', 'Câu trả lời có phù hợp với tình huống, không chỉ chép một từ đơn lẻ?']
    }
  ]);

  // Cold input for the cluster's lesson loop — a NEW invitation exchange the
  // learner hasn't memorized (the worked example ends at seven; the mission
  // also uses seven, so this dialogue deliberately picks different details).
  // Imported as a source so the reader, encounter tracking, comprehension
  // check and word mining all apply unchanged.
  const LESSON_DIALOGUES=Object.freeze({
    'a1-meeting-change':{
      sourceId:'lesson:a1-meeting-change',
      title:'Hẹn cà phê cuối tuần — hội thoại dẫn nhập',
      lines:[
        ['Hey, are you free this Sunday?','Này, Chủ nhật này bạn rảnh không?'],
        ['I think so. What did you have in mind?','Chắc là rảnh. Bạn định làm gì?'],
        ['Want to get coffee at that new place near the market?','Đi uống cà phê ở quán mới gần chợ không?'],
        ['Sounds good. How about two?','Nghe được. Hai giờ thì sao?'],
        ['Two is a bit early for me. Can we do four?','Hai giờ hơi sớm với tôi. Bốn giờ được không?'],
        ['Four works for me.','Bốn giờ hợp với tôi.'],
        ['Oh wait — sorry, something came up. Can we move it to four thirty?','Ối khoan — xin lỗi, tôi có việc đột xuất. Mình dời sang bốn giờ rưỡi được không?'],
        ['No problem. So — see you at four thirty, at the new cafe.','Không sao. Vậy hẹn gặp lúc bốn giờ rưỡi, ở quán mới nhé.'],
        ['See you then. Let me know when you get there.','Hẹn gặp bạn. Nhắn tôi khi bạn tới nhé.']
      ]
    }
  });

  function normalizeLevel(value){
    const level=String(value||'').toUpperCase().trim();
    return CEFR_LEVELS.includes(level)?level:null;
  }

  function normalizeBasis(value){
    const basis=String(value||'unrated').trim();
    return PROFILE_BASES.has(basis)?basis:'unrated';
  }

  function normalizeProfile(raw={}){
    const skills={};
    for(const skill of SKILLS){
      const source=raw?.skills?.[skill]||{};
      skills[skill]={
        level:normalizeLevel(source.level),
        basis:normalizeBasis(source.basis),
        updatedAt:Number.isFinite(Number(source.updatedAt))?Number(source.updatedAt):null
      };
    }
    return {
      version:PROFILE_VERSION,
      overallLevel:normalizeLevel(raw?.overallLevel),
      skills,
      updatedAt:Number.isFinite(Number(raw?.updatedAt))?Number(raw.updatedAt):null
    };
  }

  function ensureProfile(db){
    if(!db||typeof db!=='object')throw new Error('FlashDay DB is required');
    db.learningProfile=normalizeProfile(db.learningProfile||{});
    return db.learningProfile;
  }

  function setSkillLevel(db,skill,level,{basis='self-reported',now=Date.now()}={}){
    if(!SKILLS.includes(skill))throw new Error(`Unknown skill: ${skill}`);
    const profile=ensureProfile(db);
    const normalized=normalizeLevel(level);
    profile.skills[skill]={level:normalized,basis:normalized?normalizeBasis(basis):'unrated',updatedAt:Number(now)};
    profile.updatedAt=Number(now);
    return profile;
  }

  function setOverallLevel(db,level,{basis='self-reported',now=Date.now()}={}){
    const profile=ensureProfile(db);
    const normalized=normalizeLevel(level);
    profile.overallLevel=normalized;
    profile.updatedAt=Number(now);
    if(normalized){
      for(const skill of SKILLS){
        if(!profile.skills[skill].level){
          profile.skills[skill]={level:normalized,basis:normalizeBasis(basis),updatedAt:Number(now)};
        }
      }
    }
    return profile;
  }

  function effectiveLevel(profile,skill){
    const normalized=normalizeProfile(profile||{});
    return normalizeLevel(normalized.skills?.[skill]?.level)||normalized.overallLevel||null;
  }

  function assessContent(profile,{skill='read',contentLevel=null}={}){
    const learnerLevel=effectiveLevel(profile,skill);
    const sourceLevel=normalizeLevel(contentLevel);
    if(!SKILLS.includes(skill))throw new Error(`Unknown skill: ${skill}`);
    if(!learnerLevel||!sourceLevel){
      return {status:'unknown',skill,learnerLevel,contentLevel:sourceLevel,gap:null,label:'Chưa đủ dữ liệu',reason:'Cần level của learner và level ước lượng của nguồn; FlashDay không tự bịa CEFR từ card activity.'};
    }
    const gap=CEFR_LEVELS.indexOf(sourceLevel)-CEFR_LEVELS.indexOf(learnerLevel);
    if(gap<=0)return {status:'comfortable',skill,learnerLevel,contentLevel:sourceLevel,gap,label:'Phù hợp để học trực tiếp',reason:'Nguồn không cao hơn level hiện khai báo cho kỹ năng này.'};
    if(gap===1)return {status:'bridge',skill,learnerLevel,contentLevel:sourceLevel,gap,label:'Cầu nối — hơi khó',reason:'Nguồn cao hơn một bậc CEFR; nên ưu tiên đoạn/Unit quen và giữ hỗ trợ context.'};
    return {status:'stretch',skill,learnerLevel,contentLevel:sourceLevel,gap,label:'Khá khó so với hiện tại',reason:'Nguồn cao hơn ít nhất hai bậc CEFR; chưa nên biến toàn bộ nguồn thành bài học.'};
  }

  function normalizePhrase(value){
    return String(value||'')
      .toLowerCase()
      .replace(/[’‘]/g,"'")
      .replace(/[^a-z0-9']+/g,' ')
      .trim()
      .replace(/\s+/g,' ');
  }

  function identityForms(item){
    return [item?.target,...(Array.isArray(item?.forms)?item.forms:[])]
      .map(normalizePhrase).filter(Boolean);
  }

  function canonTokens(text){
    const canon=product()?.canonicalTokens;
    if(canon)return canon(String(text??''));
    const normalized=normalizePhrase(text);
    return normalized?normalized.split(' '):[];
  }

  // Unit identity matching shares the diff's canonicalization: word boundaries
  // are inherent, punctuation inside a stored form cannot block a match, and
  // contractions expand ("I'm" ≡ "i am") — one definition of "present" across
  // import linking, reader tagging and attempt grading.
  function phraseAppears(text,phrase){
    const haystack=canonTokens(text),needle=canonTokens(phrase);
    if(!haystack.length||!needle.length||needle.length>haystack.length)return false;
    for(let start=0;start+needle.length<=haystack.length;start++){
      if(needle.every((token,offset)=>haystack[start+offset]===token))return true;
    }
    return false;
  }

  function matchUnitsInText(items,text){
    const matches=[];
    for(const item of Array.isArray(items)?items:[]){
      if(identityForms(item).some(form=>phraseAppears(text,form))){
        matches.push({unitId:String(item.id),target:String(item.target||''),meaning:String(item.meaning||'')});
      }
    }
    return matches;
  }

  function normalizeSourceKind(value){
    const kind=String(value||'transcript').toLowerCase().trim();
    return SOURCE_KINDS.has(kind)?kind:'transcript';
  }

  function moduleById(id){return GUIDED_MODULES.find(module=>module.id===id)||null;}
  function clusterById(id){return GUIDED_CLUSTERS.find(cluster=>cluster.id===id)||null;}
  function missionById(id){return TRANSFER_MISSIONS.find(mission=>mission.id===id)||null;}
  function modulesForCluster(clusterId){
    return GUIDED_MODULES
      .filter(module=>module.clusterId===clusterId)
      .sort((left,right)=>Number(left.order||0)-Number(right.order||0));
  }

  function unitDraftsForModules(moduleIds){
    const seen=new Set();const drafts=[];
    for(const moduleId of moduleIds||[]){
      const module=moduleById(moduleId);
      if(!module)continue;
      for(const draft of module.units){
        const id=String(draft.id||'');
        if(!id||seen.has(id))continue;
        seen.add(id);drafts.push(draft);
      }
    }
    return drafts;
  }

  function findExistingUnit(db,draft){
    const byId=(db.items||[]).find(item=>String(item.id)===String(draft.id));
    if(byId)return byId;
    const target=normalizePhrase(draft.target);
    return (db.items||[]).find(item=>normalizePhrase(item.target)===target)||null;
  }

  function moduleState(db,moduleId){
    const module=moduleById(moduleId);
    if(!module)throw new Error(`Unknown guided module: ${moduleId}`);
    const linked=module.units.map(draft=>findExistingUnit(db,draft)).filter(Boolean);
    const linkedIds=new Set(linked.map(item=>String(item.id)));
    const practicedIds=new Set();
    for(const event of Array.isArray(db.events)?db.events:[]){
      for(const unitId of Array.isArray(event?.unitIds)?event.unitIds:[]){
        if(linkedIds.has(String(unitId)))practicedIds.add(String(unitId));
      }
    }
    return {moduleId:module.id,level:module.level,total:module.units.length,installed:linked.length,practiced:practicedIds.size,complete:linked.length===module.units.length};
  }

  function clusterState(db,clusterId){
    const cluster=clusterById(clusterId);
    if(!cluster)throw new Error(`Unknown guided cluster: ${clusterId}`);
    const modules=modulesForCluster(cluster.id);
    const drafts=unitDraftsForModules(cluster.moduleIds);
    const linked=drafts.map(draft=>findExistingUnit(db,draft)).filter(Boolean);
    const linkedIds=new Set(linked.map(item=>String(item.id)));
    const practicedIds=new Set();
    for(const event of Array.isArray(db?.events)?db.events:[]){
      for(const unitId of Array.isArray(event?.unitIds)?event.unitIds:[]){
        if(linkedIds.has(String(unitId)))practicedIds.add(String(unitId));
      }
    }
    return {
      clusterId:cluster.id,level:cluster.level,total:drafts.length,installed:linked.length,
      practiced:practicedIds.size,complete:linked.length===drafts.length,
      modules:modules.map(module=>moduleState(db,module.id))
    };
  }

  function installGuidedModule(db,moduleId,dataApi){
    const module=moduleById(moduleId);
    if(!module)throw new Error(`Unknown guided module: ${moduleId}`);
    if(!dataApi||typeof dataApi.addItem!=='function')throw new Error('FlashDayData.addItem is required');
    const added=[],reused=[];
    for(const draft of module.units){
      const existing=findExistingUnit(db,draft);
      if(existing){reused.push(existing);continue;}
      added.push(dataApi.addItem(db,{
        ...draft,
        difficulty:module.level,
        origin:'curated',
        tags:[...(draft.tags||[]),`guided:${module.id}`,`cefr:${module.level}`]
      }));
    }
    return {module,state:moduleState(db,moduleId),added,reused};
  }

  function installGuidedCluster(db,clusterId,dataApi){
    const cluster=clusterById(clusterId);
    if(!cluster)throw new Error(`Unknown guided cluster: ${clusterId}`);
    const added=[];const reused=[];
    for(const moduleId of cluster.moduleIds){
      const result=installGuidedModule(db,moduleId,dataApi);
      added.push(...result.added);reused.push(...result.reused);
    }
    return {cluster,state:clusterState(db,clusterId),added,reused};
  }

  function normalizeTransferAttempt(raw={},now=Date.now()){
    const missionId=cleanMissionValue(raw.missionId,120);
    if(!missionById(missionId))throw new Error('Transfer mission không hợp lệ.');
    const responseText=cleanMissionValue(raw.responseText,1600);
    const spoke=Boolean(raw.spoke);
    if(!responseText&&!spoke)throw new Error('Hãy viết câu trả lời hoặc xác nhận rằng bạn đã nói thành tiếng trước khi lưu.');
    const submittedAt=Number.isFinite(Number(raw.submittedAt))?Number(raw.submittedAt):Number(now);
    return {
      id:cleanMissionValue(raw.id,200)||`transfer_${submittedAt}_${Math.random().toString(36).slice(2,10)}`,
      missionId,responseText,spoke,selfReviewed:Boolean(raw.selfReviewed),submittedAt,
      // Explicit honesty flag: pass/fail here is the learner's own
      // checklist, not an assessment of communicative success.
      grading:'self-check'
    };
  }

  function cleanMissionValue(value,maxLength){return String(value??'').trim().slice(0,maxLength);}

  const TIME_TOKENS=new Set([
    'one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','noon','midnight',"o'clock",'am','pm','morning',
    'afternoon','evening','tonight','half','quarter','minutes','hour'
  ]);

  function mentionsTime(text){
    const tokens=canonTokens(text||'');
    return tokens.some(token=>/\d/.test(token)||TIME_TOKENS.has(token));
  }

  function submitTransferAttempt(db,raw={},now=Date.now()){
    if(!db||typeof db!=='object')throw new Error('FlashDay DB is required');
    const attempt=normalizeTransferAttempt(raw,now);
    const mission=missionById(attempt.missionId);
    // Text attempts must demonstrate the "confirm the final time" can-do;
    // a spoken-only attempt can't be text-checked and stays self-check
    // evidence by flag alone.
    if(mission?.requireFinalTimeConfirm&&attempt.responseText&&!mentionsTime(attempt.responseText)){
      throw new Error('Câu trả lời cần xác nhận lại giờ cuối cùng — vd: "See you at seven."');
    }
    db.transferAttempts=Array.isArray(db.transferAttempts)?db.transferAttempts:[];
    if(db.transferAttempts.some(item=>String(item?.id)===attempt.id))throw new Error('Lần thử này đã được lưu.');
    db.transferAttempts.push(attempt);
    return attempt;
  }

  // ── Delayed per-unit transfer ─────────────────────────────────────────
  // One transfer task per Unit, derived from its FIRST unassisted successful
  // Write event and due the next day. Transfer deliberately lives outside
  // FSRS — it is evidence that a memory can be used in a new situation, not
  // another recognition review.
  const UNIT_TRANSFER_DELAY_MS=24*60*60*1000; // first production → next-day transfer

  function firstUnassistedWriteEvent(db,unitId){
    const events=Array.isArray(db?.events)?db.events:[];
    return events.find(event=>{
      if(String(event?.mode)!=='write')return false;
      if(!Array.isArray(event?.unitIds)||!event.unitIds.includes(unitId))return false;
      if(Number(event?.ratings?.[unitId])<2)return false; // FSRS success = Hard or better
      // New events carry the M3 evidence split — unaidedUnits is the
      // authoritative "produced without aid" list. Older events fall back to
      // inferring assistance from the error record and peek telemetry.
      if(event?.evidence&&typeof event.evidence==='object'){
        return Boolean(event.evidence.aided)===false
          &&(Array.isArray(event.evidence.unaidedUnits)?event.evidence.unaidedUnits.includes(unitId):false);
      }
      // Per-unit assistance: error.missedUnits is the union of first/final
      // diff misses and self-rated misses — if this unit is in it, its recall
      // was aided regardless of what happened to other units on the card.
      if(Array.isArray(event?.error?.missedUnits)&&event.error.missedUnits.includes(unitId))return false;
      if(event?.telemetry?.sourceViewedPreReveal)return false; // peeked at source = aided
      return true;
    })||null;
  }

  function dueUnitTransfer(db,now=Date.now()){
    const items=Array.isArray(db?.items)?db.items:[];
    const attempts=Array.isArray(db?.transferAttempts)?db.transferAttempts:[];
    const done=new Set(attempts.filter(a=>a&&a.kind==='unit').map(a=>String(a.unitId)));
    let best=null;
    for(const item of items){
      const unitId=String(item?.id||'');
      if(!unitId||done.has(unitId))continue;
      const event=firstUnassistedWriteEvent(db,unitId);
      if(!event)continue;
      const dueAt=Number(event.answeredAt)+UNIT_TRANSFER_DELAY_MS;
      if(!Number.isFinite(dueAt)||dueAt>now)continue;
      if(!best||dueAt<best.dueAt)best={unitId,item,dueAt,sourceEventId:String(event.id||'')||null};
    }
    return best;
  }

  function submitUnitTransferAttempt(db,raw={},now=Date.now()){
    if(!db||typeof db!=='object')throw new Error('FlashDay DB is required');
    const unitId=cleanMissionValue(raw.unitId,160);
    const item=(Array.isArray(db?.items)?db.items:[]).find(entry=>String(entry?.id)===unitId);
    if(!unitId||!item)throw new Error('Unit transfer không hợp lệ.');
    const responseText=cleanMissionValue(raw.responseText,1600);
    if(!responseText)throw new Error('Hãy viết câu mới trước khi lưu.');
    db.transferAttempts=Array.isArray(db.transferAttempts)?db.transferAttempts:[];
    if(db.transferAttempts.some(a=>a&&a.kind==='unit'&&String(a.unitId)===unitId))throw new Error('Transfer cho Unit này đã được lưu.');
    // A transfer only counts if the unit is actually in the new sentence —
    // otherwise "writing any English" would close the produce step without
    // producing the target. Forms/accepted variants count as the unit.
    const forms=[item.target,...(Array.isArray(item.forms)?item.forms:[]),...(Array.isArray(item.accepted)?item.accepted:[])].filter(Boolean);
    if(!forms.some(form=>phraseAppears(responseText,form)))
      throw new Error(`Câu chưa dùng “${item.target}” — viết lại có cụm này.`);
    // Verbatim copies of a sentence the learner already saw are recall, not
    // transfer — the mission exists to produce the unit in NEW detail.
    // Rejected shapes: exact copy, or the stored sentence embedded whole
    // (copy + extra padding). A response that changes any detail passes.
    const responseNorm=canonTokens(responseText).join(' ');
    const referenceSentences=[
      item.exampleSentence,
      item.source?.sentence,
      ...(Array.isArray(db.captures)?db.captures:[])
        .filter(c=>Array.isArray(c?.linkedUnitIds)&&c.linkedUnitIds.map(String).includes(unitId))
        .map(c=>c?.sentence)
    ].filter(Boolean);
    const unitFormsNorm=new Set(forms.map(f=>canonTokens(f).join(' ')));
    for(const ref of referenceSentences){
      const refNorm=canonTokens(ref).join(' ');
      // A "reference" that is just the bare unit can never be evidence of a
      // copy — it is the required material itself.
      if(!refNorm||unitFormsNorm.has(refNorm))continue;
      if(responseNorm===refNorm||responseNorm.includes(refNorm)||refNorm.includes(responseNorm)){
        throw new Error('Câu trùng nguyên câu mẫu — hãy đổi chi tiết (người, giờ, nơi, món) rồi lưu lại.');
      }
    }
    const submittedAt=Number.isFinite(Number(raw.submittedAt))?Number(raw.submittedAt):Number(now);
    const attempt={
      id:cleanMissionValue(raw.id,200)||`unit-transfer_${submittedAt}_${Math.random().toString(36).slice(2,10)}`,
      kind:'unit',unitId,sourceEventId:cleanMissionValue(raw.sourceEventId,160)||null,
      responseText,selfReviewed:Boolean(raw.selfReviewed),submittedAt,
      // Same honesty flag as mission attempts: this gate checks the unit
      // appears in a NEW sentence, not that the sentence is semantically
      // right — the learner self-checks against the checklist.
      grading:'self-check'
    };
    db.transferAttempts.push(attempt);
    return attempt;
  }

  function missionState(db,missionId){
    const mission=missionById(missionId);
    if(!mission)throw new Error(`Unknown transfer mission: ${missionId}`);
    const attempts=(Array.isArray(db?.transferAttempts)?db.transferAttempts:[])
      .filter(attempt=>String(attempt?.missionId)===mission.id)
      .sort((left,right)=>Number(left.submittedAt||0)-Number(right.submittedAt||0));
    const latest=attempts.length?attempts[attempts.length-1]:null;
    return {missionId:mission.id,attempts:attempts.length,latest,hasSelfReview:Boolean(latest?.selfReviewed)};
  }

  return {
    PROFILE_VERSION,CEFR_LEVELS,SKILLS,GUIDED_CLUSTERS,GUIDED_MODULES,TRANSFER_MISSIONS,LESSON_DIALOGUES,
    normalizeLevel,normalizeProfile,ensureProfile,setSkillLevel,setOverallLevel,effectiveLevel,
    assessContent,normalizePhrase,identityForms,phraseAppears,matchUnitsInText,normalizeSourceKind,
    moduleById,clusterById,missionById,modulesForCluster,moduleState,clusterState,installGuidedModule,installGuidedCluster,
    normalizeTransferAttempt,submitTransferAttempt,missionState,mentionsTime,
    UNIT_TRANSFER_DELAY_MS,dueUnitTransfer,submitUnitTransferAttempt
  };
});
