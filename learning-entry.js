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
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./flashday-product.js'),require('./a1-curriculum.js'));
  // Resolved lazily: the bundler may evaluate this module before the product
  // module assigns its global.
  else root.FlashDayLearningEntry=factory(function(){return root.FlashDayProduct;},root.FlashDayA1Curriculum);
})(typeof globalThis!=='undefined'?globalThis:this,function(P,curriculum){
  'use strict';
  const product=()=>typeof P==='function'?P():P;

  const PROFILE_VERSION=1;
  const CEFR_LEVELS=Object.freeze(['A1','A2','B1','B2','C1','C2']);
  const SKILLS=Object.freeze(['listen','speak','read','write']);
  const PROFILE_BASES=new Set(['unrated','self-reported','placement','human-reviewed']);
  const SOURCE_KINDS=new Set(['youtube','article','audio','transcript','manual']);

  const GUIDED_CLUSTERS=Object.freeze([
    ...curriculum.clusters.filter(lesson=>lesson.id!=='a1-review'),
    {
      id:'a1-meeting-change',level:'A1',stage:'5 · Đi lại và hẹn gặp',kind:'lesson',title:'Đọc tin hẹn gặp và xác nhận giờ',
      canDo:'Với câu ngắn và được đọc lại, tôi có thể tìm giờ, nơi hẹn và viết một lời xác nhận đơn giản.',
      moduleIds:['a1-meeting-basics'],
      levelBasis:'Mục tiêu A1 · biên soạn nội bộ, chưa thẩm định độc lập',
      scopeNote:'Một bài đọc và viết có hỗ trợ; chưa phải khóa A1 đầy đủ hay bài kiểm tra nghe/nói.',
      preparation:{
        prerequisite:'Bạn cần nhận ra số 1–12. Nếu chưa quen, dùng bảng giờ dưới đây và đọc lại từng dòng; không cần làm nhanh.',
        glossary:['two = 2; four = 4; six = 6; seven = 7','four thirty = 4:30; thirty = 30 phút','Sunday = Chủ nhật; cafe = quán cà phê; market = chợ','near = gần; meet = gặp; sorry = xin lỗi'],
        patterns:['Hỏi giờ: What time? — Mấy giờ?','Đề xuất: How about six? / Can we meet at seven?','Xác nhận: OK. See you at seven. — Đồng ý. Hẹn gặp lúc bảy giờ.','Dùng at trước giờ: at seven; dùng on trước ngày: on Sunday.','Giờ cũ và giờ mới khác nhau: đọc lời đồng ý cuối cùng. Không chọn số đầu tiên chỉ vì thấy nó trước.'],
        worked:['Đề xuất: How about six? → 6:00.','Đổi giờ: Can we meet at seven? → hỏi 7:00.','Đồng ý: OK. See you at seven. → giờ cuối là 7:00.'],
        coaching:{mistake:'Không lấy giờ đề xuất đầu tiên làm giờ đã chốt. Đọc câu đồng ý cuối cùng.',pronunciation:'Phân biệt six và seven; đọc lại giờ người nghe hiểu rồi xác nhận.',recall:'Ngày sau dùng tin hẹn mới có một lần đổi giờ; nhắn lại giờ cuối và nơi gặp trước khi xem mẫu.'},
        practiceQuiz:[
          {q:'Điền chỗ trống: See you ___ seven.',options:['on','at','in'],answer:1,hint:'Trong mẫu này, at đứng trước giờ; on đứng trước ngày.'},
          {q:'Bạn chưa nghe rõ giờ hẹn. Chọn câu xin nhắc lại.',options:['No problem.','See you at seven.','Could you say that again?'],answer:2,hint:'Could you say that again? là lời xin người kia nói lại.'},
          {q:'Đổi câu mẫu See you at six. thành hẹn lúc 8 giờ.',options:['See you at eight.','See you on eight.','See you at six.'],answer:0,hint:'Giữ See you at và thay six bằng eight (8).'}
        ]
      },
      workedExample:{
        label:'Mẫu hội thoại ngắn',
        turns:[
          {speaker:'Linh',text:'How about six?',translation:'Sáu giờ thì sao?'},
          {speaker:'Alex',text:'Sorry. Can we meet at seven?',translation:'Xin lỗi. Mình gặp lúc bảy giờ được không?'},
          {speaker:'Linh',text:'No problem. See you at seven.',translation:'Không sao. Hẹn gặp lúc bảy giờ.'}
        ]
      },
      audioNote:'Bản pilot này dùng text và TTS để luyện; chưa có audio nguồn được kiểm duyệt cho từng Unit.'
    }
    ,...curriculum.clusters.filter(lesson=>lesson.id==='a1-review')
  ].sort((a,b)=>curriculum.courseOrder.indexOf(a.id)-curriculum.courseOrder.indexOf(b.id)));

  const GUIDED_MODULES=Object.freeze([
    ...curriculum.modules,
    {
      "id": "a1-meeting-basics",
      "clusterId": "a1-meeting-change",
      "order": 0,
      "level": "A1",
      "title": "Sáu câu dùng trong bài",
      "canDo": "Hỏi giờ, đề xuất giờ, xin nhắc lại và xác nhận giờ gặp.",
      "units": [
        {
          "id": "say-again",
          "type": "expression",
          "target": "Could you say that again?",
          "meaning": "Bạn có thể nói lại được không?",
          "forms": [],
          "accepted": [
            "Can you say that again?",
            "Could you repeat that?",
            "Can you repeat that?"
          ],
          "contexts": ["Bạn không nghe rõ người đối diện."],
          "tags": ["survival", "conversation"],
          "intent": "Yêu cầu người khác lặp lại lời vừa nói.",
          "canDo": "Tôi có thể lịch sự xin nghe lại khi chưa hiểu.",
          "exampleSentence": "Could you say that again?",
          "exampleTranslation": "Bạn có thể nói lại được không?"
        },
        {
          "id": "what-time",
          "type": "expression",
          "target": "What time?",
          "meaning": "Mấy giờ?",
          "forms": [],
          "accepted": [],
          "contexts": ["Bạn biết sẽ gặp nhau nhưng chưa biết giờ."],
          "tags": ["daily", "plans"],
          "intent": "Hỏi thời gian của một kế hoạch.",
          "canDo": "Tôi có thể hỏi giờ của một kế hoạch đơn giản.",
          "exampleSentence": "What time?",
          "exampleTranslation": "Mấy giờ?"
        },
        {
          "id": "how-about-six",
          "type": "expression",
          "target": "How about six?",
          "meaning": "Sáu giờ thì sao?",
          "forms": [],
          "accepted": [],
          "contexts": ["Bạn muốn đề xuất gặp lúc sáu giờ."],
          "tags": ["daily", "plans"],
          "intent": "Đề xuất một lựa chọn thời gian.",
          "canDo": "Tôi có thể đề xuất một giờ hẹn đơn giản.",
          "exampleSentence": "How about six?",
          "exampleTranslation": "Sáu giờ thì sao?"
        },
        {
          "id": "can-we-meet-at-seven",
          "type": "expression",
          "target": "Can we meet at seven?",
          "meaning": "Mình gặp lúc bảy giờ được không?",
          "forms": [],
          "accepted": [],
          "contexts": ["Bạn muốn gặp bạn mình lúc bảy giờ."],
          "tags": ["daily", "plans"],
          "intent": "Hỏi về một giờ gặp.",
          "canDo": "Tôi có thể hỏi một giờ gặp bằng câu ngắn.",
          "exampleSentence": "Can we meet at seven?",
          "exampleTranslation": "Mình gặp lúc bảy giờ được không?"
        },
        {
          "id": "no-problem",
          "type": "expression",
          "target": "No problem.",
          "meaning": "Không sao.",
          "forms": [],
          "accepted": [],
          "contexts": ["Người kia xin thay đổi kế hoạch và bạn đồng ý."],
          "tags": ["daily", "plans"],
          "intent": "Trấn an và đồng ý với thay đổi nhỏ.",
          "canDo": "Tôi có thể phản hồi thân thiện khi người khác đổi kế hoạch.",
          "exampleSentence": "No problem.",
          "exampleTranslation": "Không sao."
        },
        {
          "id": "see-you-at-seven",
          "type": "chunk",
          "target": "See you at seven.",
          "meaning": "Hẹn gặp lúc bảy giờ.",
          "forms": [],
          "accepted": [],
          "contexts": ["Hai người vừa chốt giờ hẹn mới là bảy giờ."],
          "tags": ["daily", "plans"],
          "intent": "Xác nhận giờ gặp mới.",
          "canDo": "Tôi có thể xác nhận lại một giờ hẹn đã đổi.",
          "exampleSentence": "See you at seven.",
          "exampleTranslation": "Hẹn gặp lúc bảy giờ."
        }
      ]
    },
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
    ...curriculum.missions,
    {id:'a1-meeting-speaking',clusterId:'a1-meeting-change',level:'A1',title:'Nói hai vai: hẹn gặp',canDo:'Hỏi giờ, xin nhắc lại và xác nhận giờ/nơi.',setup:'A muốn gặp thứ Ba ở công viên lúc sáu giờ. B chỉ rảnh lúc tám giờ. Trao đổi ngắn rồi chốt giờ và nơi; đổi vai.',incomingMessage:'Người nghe có thể xin nói chậm hoặc nhắc lại.',instructions:'Nói rồi ghi lại câu xác nhận của bạn và thông tin người nghe hiểu được. Nếu không có bạn luyện, ghi rõ tự luyện.',modelAnswer:['Can we meet at eight?','OK. See you at eight at the park.'],selfCheck:['Đã hỏi và trả lời.','Chốt đúng tám giờ và công viên.','Ghi rõ có người nghe hay tự luyện.'],skill:'speak',requireWritten:true,requireSpoken:true},

    {
      id:'a1-meeting-change-transfer',clusterId:'a1-meeting-change',level:'A1',title:'Viết lời xác nhận giờ hẹn',
      canDo:'Tôi có thể phản hồi một thay đổi và chốt lại giờ hẹn mới bằng 1–2 câu ngắn.',
      setup:'Bạn và Alex đã hẹn gặp lúc 6 giờ ở quán cà phê. Bây giờ Alex nhắn:',
      incomingMessage:'Sorry. Can we meet at seven?',
      instructions:'Trả lời bằng tiếng Anh: phản hồi tin đổi lịch và xác nhận lại giờ cuối cùng là 7 giờ (bài này luyện xác nhận — đề xuất giờ khác là một nhiệm vụ riêng). Bạn có thể viết hoặc nói thành tiếng.',
      // The can-do is "confirm the FINAL time the scenario agreed on" —
      // declared time must equal expectedFinalTime AND appear in the
      // response. Loose 12-hour compare: the incoming message says "seven"
      // without am/pm, so '7 pm' and '7 am' both satisfy it. A mission that
      // specifies meridiem must set meridiemStrict:true.
      requireFinalTimeConfirm:true,expectedFinalTime:'7:00',meridiemStrict:false,
      modelAnswer:['OK. See you at seven.', 'No problem. See you at seven.'],
      selfCheck:['Bạn có phản hồi về việc đổi lịch không?', 'Bạn có nói rõ giờ cuối cùng không?', 'Câu trả lời có phù hợp với tình huống, không chỉ chép một từ đơn lẻ?']
    }
  ]);

  // ── Clock-time extraction ─────────────────────────────────────────────
  // A response "confirms the final time" only if a plausible clock time is
  // stated in a time position — not merely by containing any digit or any
  // number word ("I have two cats", "My phone is 12345" must not pass).
  const HOUR_WORDS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,noon:12,midnight:0};
  const MIN_WORDS={five:5,ten:10,fifteen:15,twenty:20,thirty:30,forty:40,fifty:50,half:30,quarter:15};
  const AT_TIME=new Set(['at','to','for','until','till','by','around','about','before','after','past','from']);
  const TIME_MARK=new Set(["o'clock",'oclock','am','pm','sharp']);

  function normTime(hour,minute){
    return `${hour}:${String(minute||0).padStart(2,'0')}`;
  }

  // Parse a standalone time expression the learner typed into the
  // "giờ cuối cùng" field: bare '7', 'seven', '7:30', 'four thirty',
  // 'half past four', 'quarter to seven' → canonical 'h:mm'.
  function parseTimeInput(raw){
    const str=String(raw||'').trim().toLowerCase();
    if(!str)return null;
    // '7:30' / '19.45' / '8h30' — the ':' is real here (raw input, not tokens)
    let m=str.match(/\b([01]?\d|2[0-3])\s*[:.h]\s*([0-5]\d)\s*(am|pm)?\b/);
    if(m){let h=+m[1];if(m[3]==='pm'&&h<12)h+=12;if(m[3]==='am'&&h===12)h=0;return normTime(h,+m[2]);}
    // A time separator with minutes that don't parse ('7:99', '25:30') is
    // malformed input — not silently a bare hour.
    if(/\d\s*[:.h]\s*\d/.test(str))return null;
    // '7pm' / '11 pm'
    m=str.match(/\b(1[0-2]|0?[1-9])\s*(am|pm)\b/);
    if(m){let h=+m[1];if(m[2]==='pm'&&h<12)h+=12;if(m[2]==='am'&&h===12)h=0;return normTime(h,0);}
    const tokens=canonTokens(str);
    let hour=null,minute=0,pendingMin=null;
    for(let i=0;i<tokens.length;i++){
      const t=tokens[i];
      if(t==='noon')return normTime(12,0);
      if(t==='midnight')return normTime(0,0);
      if(/^\d{1,2}$/.test(t)){
        const h=+t;
        if(hour==null&&h<=24){hour=h;continue;}
        if(hour!=null&&minute===0&&h<60){minute=h;continue;}
        continue;
      }
      if(HOUR_WORDS[t]!=null&&hour==null){hour=HOUR_WORDS[t];continue;}
      if(MIN_WORDS[t]!=null){
        if(hour!=null){const add=MIN_WORDS[t];minute=minute>=20&&add<10?minute+add:add;}
        else pendingMin=MIN_WORDS[t]; // leading 'half/quarter' of 'half past four'
        continue;
      }
      // trailing meridiem on word times: 'seven pm' → 19:00
      if(t==='pm'&&hour!=null&&hour<12)hour+=12;
      if(t==='am'&&hour===12)hour=0;
    }
    if(hour==null)return null;
    if(pendingMin!=null&&minute===0)minute=pendingMin;
    const toIdx=tokens.indexOf('to');
    if(toIdx>0&&MIN_WORDS[tokens[toIdx-1]]!=null){
      const mins=MIN_WORDS[tokens[toIdx-1]];
      hour=(hour-1+24)%24;minute=60-mins;
    }
    return normTime(hour,minute);
  }

  // "Seven works for me" / "Seven is fine" — the hour word is the subject
  // naming the agreed time, a real confirmation pattern in the can-do.
  const TIME_VERBS=new Set(['works','work','is','suits','fine','good','ok','okay','better']);

  // Preserve explicit clocks (including attached meridiem); other numbers
  // require a time position or confirmation pattern. Invalid explicit clocks
  // are consumed whole, never truncated into a valid-looking bare hour.
  function extractClockTimes(text){
    // Preserve explicit clock expressions before word normalization: splitting
    // 7:05pm would turn the minutes into a second hour and lose the meridiem.
    const tokens=String(text||'').toLowerCase().match(/\d+[:.h]\d+(?:\s*(?:am|pm)\b)?|[a-z0-9']+/g)||[];
    const times=[];
    for(let i=0;i<tokens.length;i++){
      const t=tokens[i];
      const clock=t.match(/^(\d+)[:.h](\d+)\s*(am|pm)?$/);
      if(clock){
        let hour=Number(clock[1]);
        const minute=Number(clock[2]);
        const meridiem=clock[3];
        // Consume malformed clocks as a whole; never fall back to their hour.
        if(hour>23||clock[2].length!==2||minute>59||meridiem&&(hour<1||hour>12))continue;
        if(meridiem==='pm'&&hour<12)hour+=12;
        if(meridiem==='am'&&hour===12)hour=0;
        times.push(normTime(hour,minute));
        continue;
      }
      const dm=t.match(/^(\d{1,2})(am|pm)?$/);
      if(dm){
        let h=+dm[1];
        if(h>24||dm[2]&&h>12)continue;
        const prev=tokens[i-1]||'',next=tokens[i+1]||'';
        if(/^\d{2,}$/.test(next)&&(+next>=60||next.length>2))continue;
        let minute=null,j=i+1;
        if(/^\d{2}$/.test(next)&&+next<60){minute=+next;j++;}
        let mer=dm[2]||null;
        if(!mer&&(tokens[j]==='am'||tokens[j]==='pm')){mer=tokens[j];j++;}
        const positioned=AT_TIME.has(prev)||minute!=null||mer!=null||TIME_MARK.has(tokens[j])||TIME_VERBS.has(next);
        if(!positioned)continue;
        if(mer==='pm'&&h<12)h+=12;
        if(mer==='am'&&h===12)h=0;
        i=j-1;
        times.push(normTime(h,minute||0));
        continue;
      }
      const hw=HOUR_WORDS[t];
      if(hw==null)continue;
      if(t==='noon'){times.push(normTime(12,0));continue;}
      if(t==='midnight'){times.push(normTime(0,0));continue;}
      const prev=tokens[i-1]||'',next=tokens[i+1]||'';
      let minute=null,consumed=0;
      if(MIN_WORDS[next]!=null){minute=MIN_WORDS[next];consumed=1;}
      else if(/^\d{2}$/.test(next)&&+next<60){minute=+next;consumed=1;}
      if(minute!=null&&[20,30,40,50].includes(minute)&&MIN_WORDS[tokens[i+2]]!=null&&MIN_WORDS[tokens[i+2]]<10){minute+=MIN_WORDS[tokens[i+2]];consumed=2;}
      // 'seven thirty pm' — the meridiem lands after the minute word
      const afterMin=tokens[i+1+consumed];
      const mer=(next==='am'||next==='pm')?next:(consumed&&(afterMin==='am'||afterMin==='pm')?afterMin:null);
      const positioned=AT_TIME.has(prev)||TIME_MARK.has(next)||minute!=null||TIME_VERBS.has(next)||mer!=null;
      if(!positioned)continue;
      let hour=hw;
      if(mer==='pm'&&hour<12)hour+=12;
      if(mer==='am'&&hour===12)hour=0;
      if(prev==='to'&&MIN_WORDS[tokens[i-2]]!=null){times.push(normTime((hour-1+24)%24,60-MIN_WORDS[tokens[i-2]]));continue;}
      if(prev==='past'&&MIN_WORDS[tokens[i-2]]!=null)minute=MIN_WORDS[tokens[i-2]];
      times.push(normTime(hour,minute==null?0:minute));
    }
    return times;
  }

  // Agreement between a declared/expected time and the times a text
  // actually states. strict=true → exact 'h:mm' (scenario pinned am/pm);
  // otherwise 12-hour compare ("8 pm" declared ≡ "at eight" written).
  function confirmsTime(text,expected,strict=false){
    const times=extractClockTimes(text);
    if(strict)return times.includes(expected);
    const as12=(t)=>{const[h,m]=String(t).split(':').map(Number);return normTime(h%12||12,m);};
    return times.map(as12).includes(as12(expected));
  }

  function timesAgree(a,b,strict=false){
    if(strict)return a===b;
    const as12=(t)=>{const[h,m]=String(t).split(':').map(Number);return normTime(h%12||12,m);};
    return as12(a)===as12(b);
  }

  // Shared gate for the final-time can-do — used by the reveal button and
  // by submitTransferAttempt so client and record rules can't drift.
  // Returns {ok,declared,error}; ok implies declared parses and matches the
  // scenario's expected final time (when the mission defines one).
  function checkFinalTimeConfirm(mission,raw={}){
    const declared=parseTimeInput(raw.declaredFinalTime);
    if(!declared)return {ok:false,declared:null,error:'Điền giờ cuối cùng bạn muốn chốt (vd: 7, 7:30, seven).'};
    const expected=mission?.expectedFinalTime;
    const strict=Boolean(mission?.meridiemStrict);
    if(expected&&!timesAgree(declared,expected,strict)){
      return {ok:false,declared,error:`Giờ cuối cùng trong tình huống là ${expected} — đọc lại tin nhắn rồi khai đúng giờ.`};
    }
    const text=String(raw.responseText||'').trim();
    if(text&&!confirmsTime(text,declared,strict)){
      return {ok:false,declared,error:`Câu trả lời chưa xác nhận giờ ${declared} đã khai — vd: "See you at seven."`};
    }
    return {ok:true,declared,error:null};
  }

  // Cold input for the cluster's lesson loop — a NEW invitation exchange the
  // learner hasn't memorized (the worked example ends at seven; the mission
  // also uses seven, so this dialogue deliberately picks different details).
  // Imported as a source so the reader, encounter tracking, comprehension
  // check and word mining all apply unchanged.
  const LESSON_DIALOGUES=Object.freeze({
    ...curriculum.dialogues,
    'a1-meeting-change':{
      sourceId:'lesson:a1-meeting-change:v2',
      contentVersion:2,
      title:'Hẹn cà phê cuối tuần — hội thoại dẫn nhập',
      lines:[
        ['Linh: Coffee on Sunday? At the new cafe near the market?', 'Linh: Chủ nhật đi uống cà phê nhé? Ở quán mới gần chợ nhé?'],
        ['Alex: Yes. What time?', 'Alex: Được. Mấy giờ?'],
        ['Linh: How about two?', 'Linh: Hai giờ thì sao?'],
        ['Alex: Sorry. Can we meet at four thirty?', 'Alex: Xin lỗi. Mình gặp lúc bốn giờ rưỡi được không?'],
        ['Linh: OK. See you at four thirty.', 'Linh: Đồng ý. Hẹn gặp lúc bốn giờ rưỡi.'],
        ['Alex: See you at the cafe.', 'Alex: Hẹn gặp ở quán cà phê.']
      ],
      listening:{
        text:'Hi, this is Alex. Can we meet on Monday at five thirty? The cafe is next to the station.',
        translation:'Chào, Alex đây. Mình gặp vào thứ Hai lúc năm giờ rưỡi được không? Quán cà phê ở cạnh ga.',
        questions:[
          {q:'Giờ được đề xuất?',options:['5:00','5:30','3:50'],answer:1,hint:'five thirty = 5:30.'},
          {q:'Quán cà phê ở cạnh đâu?',options:['Ga','Chợ','Trường'],answer:0,hint:'next to the station.'}
        ]
      },
      // Situation comprehension — separate from the line-by-line quiz: does
      // the learner know what was agreed, not just what each line means?
      scenarioQuiz:[
        {q:'Ban đầu hai người định gặp mấy giờ?',options:['2:00','4:00','4:30','7:00'],answer:0,hint:'“How about two?” là đề xuất đầu tiên — 2:00.'},
        {q:'Giờ cuối cùng hai người chốt là mấy giờ?',options:['2:00','4:00','4:30','7:00'],answer:2,hint:'“Can we meet at four thirty?” rồi “See you at four thirty” → 4:30.'},
        {q:'Hai người hẹn gặp ở đâu?',options:['Quán cà phê mới gần chợ','Công viên','Trường học','Nhà Alex'],answer:0,hint:'“the new cafe near the market” — quán mới gần chợ.'}
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
    // Text presence alone cannot disambiguate two meanings of one spelling.
    // Leave those captures unlinked until the learner selects a meaning.
    return matches.filter(match=>matches.filter(other=>normalizePhrase(other.target)===normalizePhrase(match.target)).length===1);
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
      .filter(module=>clusterById(clusterId)?.moduleIds.includes(module.id))
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
    return (db.items||[]).find(item=>normalizePhrase(item.target)===target
      &&String(item.meaning||'').trim().toLowerCase()===String(draft.meaning||'').trim().toLowerCase())||null;
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
      clusterId:cluster.id,level:cluster.level,total:drafts.length,installed:linked.length,unitIds:[...linkedIds],
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

  function submitTransferAttempt(db,raw={},now=Date.now()){
    if(!db||typeof db!=='object')throw new Error('FlashDay DB is required');
    const attempt=normalizeTransferAttempt(raw,now);
    const mission=missionById(attempt.missionId);
    if(mission.requireWritten&&!attempt.responseText)throw new Error('Cần viết câu trả lời hoặc ghi lại câu đã nói theo yêu cầu bài.');
    if(mission.requireSpoken&&!attempt.spoke)throw new Error('Hãy thực hành nói thành tiếng trước khi lưu bài nói.');
    attempt.skill=mission.skill||'integrated';
    // Structured check for the "confirm the final time" can-do: the
    // declared time must equal the scenario's agreed time AND appear in
    // the written response. Matching declaration alone ("See you at six" +
    // declare 6) only proves the two inputs agree — not that the learner
    // understood the agreed time is seven.
    if(mission?.requireFinalTimeConfirm){
      const gate=checkFinalTimeConfirm(mission,{declaredFinalTime:raw.declaredFinalTime,responseText:attempt.responseText});
      if(!gate.ok)throw new Error(gate.error);
      attempt.finalTime=gate.declared;
      // Recorded evidence: the declared time matched the scenario's agreed
      // time. Whole-sentence quality still stays grading:'self-check'.
      attempt.scenarioTimeMatch=Boolean(mission.expectedFinalTime);
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
    return events.filter(event=>{
      if(!String(event?.id||'').trim())return false;
      if(!Number.isFinite(event?.answeredAt)||event.answeredAt<0)return false;
      if(String(event?.mode)!=='write')return false;
      if(!Array.isArray(event?.unitIds)||!event.unitIds.includes(unitId))return false;
      const grade=Number(event?.ratings?.[unitId]);
      if(!Number.isInteger(grade)||grade<2||grade>4)return false; // valid FSRS success = Hard through Easy
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
    }).sort((left,right)=>Number(left.answeredAt)-Number(right.answeredAt)||String(left.id).localeCompare(String(right.id)))[0]||null;
  }

  function isReviewedUnitTransfer(attempt,unitId,eventId,dueAt){
    return attempt?.kind==='unit'&&String(attempt.unitId)===unitId
      &&attempt.selfReviewed===true&&String(attempt.sourceEventId)===String(eventId)
      &&Number.isFinite(Number(attempt.submittedAt))&&Number(attempt.submittedAt)>=dueAt;
  }

  function dueUnitTransfer(db,now=Date.now()){
    const items=Array.isArray(db?.items)?db.items:[];
    const attempts=Array.isArray(db?.transferAttempts)?db.transferAttempts:[];
    let best=null;
    for(const item of items){
      const unitId=String(item?.id||'');
      if(!unitId)continue;
      const event=firstUnassistedWriteEvent(db,unitId);
      if(!event)continue;
      const dueAt=Number(event.answeredAt)+UNIT_TRANSFER_DELAY_MS;
      if(!Number.isFinite(dueAt)||dueAt>now)continue;
      if(attempts.some(a=>isReviewedUnitTransfer(a,unitId,event.id,dueAt)))continue;
      if(!best||dueAt<best.dueAt){
        const previousAttempt=attempts.filter(a=>a?.kind==='unit'&&String(a.unitId)===unitId)
          .sort((left,right)=>Number(right.submittedAt)-Number(left.submittedAt))[0]||null;
        best={unitId,item,dueAt,sourceEventId:String(event.id),previousAttempt};
      }
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
    const sourceEvent=firstUnassistedWriteEvent(db,unitId);
    if(!sourceEvent)throw new Error('Chưa có lượt viết đúng không hỗ trợ để mở vận dụng trễ.');
    const dueAt=Number(sourceEvent.answeredAt)+UNIT_TRANSFER_DELAY_MS;
    if(db.transferAttempts.some(a=>isReviewedUnitTransfer(a,unitId,sourceEvent.id,dueAt)))throw new Error('Transfer cho Unit này đã được lưu và tự đối chiếu.');
    if(!Number.isFinite(Number(now))||Number(now)<dueAt)throw new Error('Chưa tới thời điểm vận dụng trễ — cần đủ 24 giờ sau lượt viết nguồn.');
    if(raw.sourceEventId&&String(raw.sourceEventId)!==String(sourceEvent.id))throw new Error('Lượt viết nguồn không khớp nhiệm vụ vận dụng.');
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
    // Use actual submission time; an imported/requested timestamp cannot bypass the delay.
    const submittedAt=Number(now);
    const attempt={
      id:cleanMissionValue(raw.id,200)||`unit-transfer_${submittedAt}_${Math.random().toString(36).slice(2,10)}`,
      kind:'unit',unitId,sourceEventId:String(sourceEvent.id),dueAt,
      evidenceBasis:sourceEvent.evidence?'explicit-unaided':'legacy-review',
      responseText,selfReviewed:Boolean(raw.selfReviewed),submittedAt,
      // Same honesty flag as mission attempts: this gate checks the unit
      // appears in a NEW sentence, not that the sentence is semantically
      // right — the learner self-checks against the checklist.
      grading:'self-check'
    };
    if(db.transferAttempts.some(previous=>String(previous.id)===attempt.id))throw new Error('Lần thử này đã được lưu.');
    db.transferAttempts.push(attempt);
    return attempt;
  }

  // Activity coverage only. Never derive a CEFR level from these counters.
  function coursePracticeState(db){
    const checks=Array.isArray(db?.comprehensionChecks)?db.comprehensionChecks:[];
    const attempts=Array.isArray(db?.transferAttempts)?db.transferAttempts:[];
    const lessons=GUIDED_CLUSTERS.map(cluster=>{
      const source=LESSON_DIALOGUES[cluster.id]?.sourceId;
      const lessonChecks=checks.filter(record=>record.sourceKey===`${source}:scenario`);
      const listening=checks.filter(record=>record.sourceKey===`${source}:listening`&&Number(record.completedPlays)>0);
      const missions=TRANSFER_MISSIONS.filter(mission=>mission.clusterId===cluster.id);
      const writeIds=new Set(missions.filter(mission=>mission.skill!=='speak').map(mission=>mission.id));
      const speakIds=new Set(missions.filter(mission=>mission.skill==='speak').map(mission=>mission.id));
      return {id:cluster.id,read:lessonChecks.length>0,listen:listening.length>0,
        write:attempts.some(attempt=>writeIds.has(attempt.missionId)&&String(attempt.responseText||'').trim()),
        speak:attempts.some(attempt=>speakIds.has(attempt.missionId)&&attempt.spoke===true&&String(attempt.responseText||'').trim())};
    });
    return {total:lessons.length,lessons,counts:Object.fromEntries(SKILLS.map(skill=>[skill,lessons.filter(lesson=>lesson[skill]).length])),basis:'activity-only'};
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
    A1_FOUNDATIONS:curriculum.foundations,A1_STAGES:curriculum.stages,PROFILE_VERSION,CEFR_LEVELS,SKILLS,GUIDED_CLUSTERS,GUIDED_MODULES,TRANSFER_MISSIONS,LESSON_DIALOGUES,
    normalizeLevel,normalizeProfile,ensureProfile,setSkillLevel,setOverallLevel,effectiveLevel,
    assessContent,normalizePhrase,identityForms,phraseAppears,matchUnitsInText,normalizeSourceKind,
    moduleById,clusterById,missionById,modulesForCluster,moduleState,clusterState,installGuidedModule,installGuidedCluster,
    coursePracticeState,normalizeTransferAttempt,submitTransferAttempt,missionState,extractClockTimes,parseTimeInput,confirmsTime,checkFinalTimeConfirm,
    UNIT_TRANSFER_DELAY_MS,dueUnitTransfer,submitUnitTransferAttempt
  };
});
