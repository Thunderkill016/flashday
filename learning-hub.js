(function(){
  'use strict';

  const D=window.FlashDayData;
  const S=window.FlashDayStore;
  const L=window.FlashDayLearningEntry;
  const TI=window.FlashDayTranscriptImport;
  const IM=window.FlashDayImmersion;
  const WLK=window.FlashDayLookup;
  const CAT=window.FlashDayCatalog;
  const SC=window.FlashDaySourceCapture;
  const KEY='flashday-memory-engine-repo-driven';
  const PROFILE_TABLE='learner_profiles';
  const $=(id)=>document.getElementById(id);
  const PROFILE_INPUTS={listen:'profileListen',speak:'profileSpeak',read:'profileRead',write:'profileWrite'};

  if(!D||!S||!L||!TI)return;

  const store=S.createPersistentStore({
    storage:localStorage,
    key:()=>D.dbKey(localStorage),
    hydrate:(raw)=>D.migrateDb(raw),
    fallback:()=>D.createInitialDb()
  });

  let supabaseClient=null;
  let learner=null;
  let profileSyncTimer=null;

  function esc(value){
    return String(value??'').replace(/[&<>'"]/g,(char)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[char]);
  }

  function rememberUi(payload={}){
    sessionStorage.setItem('flashday-learning-hub-return',JSON.stringify({view:'capture',...payload}));
  }

  function reloadHub(payload){
    rememberUi(payload);
    window.location.reload();
  }

  function profileSummary(profile){
    const parts=L.SKILLS.map(skill=>{
      const level=L.effectiveLevel(profile,skill);
      const labels={listen:'Nghe',speak:'Nói',read:'Đọc',write:'Viết'};
      return `${labels[skill]} ${level||'?'}`;
    });
    return parts.join(' · ');
  }

  function renderProfile(){
    const db=store.refresh();
    const profile=L.ensureProfile(db);
    for(const [skill,id] of Object.entries(PROFILE_INPUTS)){
      const select=$(id);if(select)select.value=profile.skills?.[skill]?.level||'';
    }
    const summary=$('profileSummary');
    if(summary)summary.textContent=`${profileSummary(profile)} · self-report/placement evidence, không phải mastery score.`;

    const grid=document.querySelector('.profile-grid');
    if(grid&&!document.getElementById('saveProfileBtn')){
      const button=document.createElement('button');
      button.id='saveProfileBtn';button.type='button';button.className='module-action profile-save';button.textContent='Lưu trình độ';
      grid.insertAdjacentElement('afterend',button);
      button.onclick=saveProfile;
    }
  }

  async function saveProfile(){
    const now=Date.now();
    store.transact((db)=>{
      for(const [skill,id] of Object.entries(PROFILE_INPUTS)){
        L.setSkillLevel(db,skill,$(id)?.value||'',{basis:'self-reported',now});
      }
    });
    const canSync=!!(supabaseClient&&learner);
    const synced=canSync?await pushProfile().then(()=>true).catch(()=>false):false;
    const message=!canSync||synced
      ?(canSync?'Đã lưu profile theo 4 kỹ năng.':'Đã lưu profile trên thiết bị này.')
      :'Đã lưu trên thiết bị — chưa đồng bộ được lên tài khoản.';
    reloadHub({message});
  }

  function renderGuidedModules(){
    const root=$('guidedModules');if(!root)return;
    const db=store.refresh();
    root.innerHTML=L.GUIDED_CLUSTERS.map(cluster=>{
      const state=L.clusterState(db,cluster.id);
      const modules=L.modulesForCluster(cluster.id);
      const remaining=Math.max(0,state.total-state.installed);
      const buttonLabel=state.complete?'Đã thêm vào bộ học':remaining===state.total?`Thêm ${state.total} Unit vào bộ học`:`Thêm ${remaining} Unit còn lại`;
      const example=(cluster.workedExample?.turns||[]).map(turn=>`<li><b>${esc(turn.speaker)}:</b> ${esc(turn.text)}<small>${esc(turn.translation)}</small></li>`).join('');
      // Lesson loop state — step 1 is a NEW dialogue the learner reads and
      // comprehension-checks before the units and the transfer mission.
      const lesson=L.LESSON_DIALOGUES?.[cluster.id];
      const lessonImported=lesson&&(db.captures||[]).some(c=>String(c.sourceId)===lesson.sourceId);
      const checks=(db.comprehensionChecks||[]).filter(ch=>String(ch.sourceKey)===lesson?.sourceId);
      const scenarioChecks=(db.comprehensionChecks||[]).filter(ch=>String(ch.sourceKey)===`${lesson?.sourceId}:scenario`);
      const bestOf=(list)=>list.length?Math.max(...list.map(c=>Number(c.correct)||0)):null;
      const lessonChecked=checks.length>0;
      const mission=L.TRANSFER_MISSIONS.find(m=>m.clusterId===cluster.id);
      const missionTries=mission?L.missionState(db,mission.id).attempts:0;
      const evidence=[];
      if(checks.length)evidence.push(`kiểm hiểu tốt nhất ${bestOf(checks)}/${checks[0].total}`);
      if(scenarioChecks.length)evidence.push(`tình huống tốt nhất ${bestOf(scenarioChecks)}/${scenarioChecks[0].total}`);
      if(missionTries)evidence.push(`vận dụng ${missionTries} lần — tự đối chiếu`);
      const unitTries=(db.transferAttempts||[]).filter(a=>a&&a.kind==='unit').length;
      if(unitTries)evidence.push(`unit transfer ${unitTries} lần`);
      return `<article class="guided-cluster">
        <div class="guided-cluster-head">
          <div><span class="eyebrow">${esc(cluster.level)} · SITUATION CLUSTER</span><h4>${esc(cluster.title)}</h4><p>${esc(cluster.canDo)}</p></div>
          <span class="cluster-progress">${state.practiced}/${state.total} đã từng ôn</span>
        </div>
        ${lesson?`<div class="lesson-flow">
          <span class="lesson-step${lessonChecked?' done':lessonImported?' active':''}">${lessonChecked?'Đã làm kiểm hiểu':'1 · Đọc hội thoại & kiểm hiểu'}</span>
          <span class="lesson-step${state.complete?' done':state.installed?' active':''}">2 · Unit vào bộ ôn</span>
          <span class="lesson-step${missionTries?' done':''}">${missionTries?'Đã thử vận dụng':'3 · Vận dụng đổi giờ'}</span>
        </div>
        ${evidence.length?`<p class="lesson-evidence">Bằng chứng: ${esc(evidence.join(' · '))} — luyện tập tự đối chiếu, chưa phải đánh giá đạt.</p>`:''}
        <button class="module-action lesson-open" type="button" data-lesson-open="${esc(cluster.id)}">${lessonImported?'Đọc lại hội thoại dẫn nhập':'① Đọc hội thoại mới — rồi bấm Kiểm hiểu trong bài đọc'}</button>
        ${lesson.scenarioQuiz?.length?`<details class="lesson-scenario">
          <summary>Kiểm hiểu tình huống — ${lesson.scenarioQuiz.length} câu (giờ đầu, giờ chốt, địa điểm)</summary>
          <div class="lesson-quiz" data-scenario-quiz="${esc(cluster.id)}"></div>
        </details>`:''}`:''}
        <details class="guided-example">
          <summary>${esc(cluster.workedExample?.label||'Xem ví dụ')}</summary>
          <ol>${example}</ol>
        </details>
        <details class="guided-steps">
          <summary>5 bước nhỏ · ${state.installed}/${state.total} Unit có sẵn</summary>
          <ol>${modules.map(module=>`<li><strong>${esc(module.title)}</strong><span>${esc(module.canDo)}</span></li>`).join('')}</ol>
        </details>
        <p class="cluster-note">${esc(cluster.audioNote||'')}</p>
        <button class="module-action" type="button" data-guided-cluster="${esc(cluster.id)}" ${state.complete?'disabled':''}>${esc(buttonLabel)}</button>
      </article>`;
    }).join('');
    root.querySelectorAll('[data-guided-cluster]').forEach(button=>{
      button.onclick=()=>installCluster(button.dataset.guidedCluster);
    });
    root.querySelectorAll('[data-lesson-open]').forEach(button=>{
      button.onclick=()=>openLessonDialogue(button.dataset.lessonOpen);
    });
    root.querySelectorAll('[data-scenario-quiz]').forEach(box=>{
      renderScenarioQuiz(box,box.dataset.scenarioQuiz);
    });
  }

  // Step 1 of the lesson loop: import the cluster's intro dialogue as a
  // normal source — encounters, the comprehension check and word mining all
  // apply unchanged, and the dialogue stays in the library for re-reading.
  function openLessonDialogue(clusterId){
    const lesson=L.LESSON_DIALOGUES?.[clusterId];
    if(!lesson||!IM)return;
    const db=store.refresh();
    if(!(db.captures||[]).some(c=>String(c.sourceId)===lesson.sourceId)){
      const segments=lesson.lines.map(([text,translation],index)=>({
        start:index*5,end:index*5+4,index,text,translation
      }));
      store.transact((db)=>TI.importIntoDb(db,segments,{
        sourceId:lesson.sourceId,sourceKind:'lesson',sourceTitle:lesson.title,
        subtitleFileName:lesson.sourceId,
        resolveUnitIds:(sentence)=>L.matchUnitsInText(db.items||[],sentence).map(match=>match.unitId)
      }));
      reloadHub({message:'Đã thêm hội thoại dẫn nhập — đọc hết, bấm Kiểm hiểu, rồi tap từ chưa biết để lưu Unit.',openSource:lesson.sourceId});
      return;
    }
    openSource(lesson.sourceId);
  }

  function installCluster(clusterId){
    try{
      const {result}=store.transact((db)=>L.installGuidedCluster(db,clusterId,D));
      const message=result.added.length
        ? `Đã thêm ${result.added.length} Unit mới; ${result.reused.length} Unit có sẵn được dùng chung.`
        : 'Lộ trình này đã dùng toàn bộ Unit có sẵn, không tạo bản sao.';
      reloadHub({message});
    }catch(error){
      showInlineMessage(error.message,true);
    }
  }

  function formatAttempt(attempt){
    if(!attempt)return 'Chưa có lần thử.';
    const date=new Date(Number(attempt.submittedAt));
    const when=Number.isNaN(date.getTime())?'vừa xong':date.toLocaleDateString('vi-VN');
    return `${attempt.selfReviewed?'Đã tự đối chiếu mẫu':'Đã thử'} · ${when}`;
  }

  function renderTransferMissions(){
    const root=$('transferMissions');if(!root)return;
    const db=store.refresh();
    // Per-unit delayed transfer: derived from the first unassisted successful
    // Write event, due the next day. Learner produces a NEW sentence in a new
    // situation BEFORE seeing the model/example — honest "đã tự đối chiếu".
    const due=L.dueUnitTransfer(db);
    const unitHtml=due?`<article class="transfer-mission" data-unit-transfer="${esc(due.unitId)}">
      <div class="transfer-heading"><div><span class="eyebrow">TRANSFER · NGÀY HÔM SAU</span><h4>${esc(due.item.target||due.unitId)}</h4><p>${esc(due.item.intent||due.item.canDo||due.item.meaning||'')}</p></div><span class="transfer-status">Đến hạn</span></div>
      <p class="mission-setup">Gợi ý tình huống: ${esc(due.item.contexts?.[0]||due.item.meaning||'dùng cụm này trong một câu của riêng bạn.')}</p>
      <p class="mission-instructions">Viết MỘT câu tiếng Anh mới dùng “${esc(due.item.target||'')}” — đổi ít nhất một chi tiết (người, giờ, nơi, món); câu giống nguyên mẫu sẽ bị từ chối.</p>
      <label class="field transfer-field" for="unitTransferResponse">Câu của bạn<textarea id="unitTransferResponse" maxlength="1600" placeholder="Write one new sentence in English…"></textarea></label>
      <button class="module-action transfer-reveal" type="button" data-unit-reveal disabled>Xem câu mẫu sau khi đã thử</button>
      <div class="transfer-model hidden" id="unitTransferModel"><strong>Mẫu từ câu đã học — chỉ để đối chiếu</strong><p class="model-caveat">Tự đối chiếu theo checklist — đây là bài luyện, chưa phải đánh giá đạt.</p>${due.item.exampleSentence?`<p>${esc(due.item.exampleSentence)}</p>`:''}${due.item.exampleTranslation?`<p><em>${esc(due.item.exampleTranslation)}</em></p>`:''}<ul><li>Câu mới có dùng đúng cụm không?</li><li>Ngữ cảnh có khác câu gốc không?</li></ul><label class="transfer-check"><input type="checkbox" data-unit-self-review> Tôi đã so sánh câu của mình với mẫu</label><button class="primary-btn transfer-save" type="button" data-unit-save>Lưu — đã tự đối chiếu</button></div>
    </article>`:'';
    root.innerHTML=unitHtml+L.TRANSFER_MISSIONS.map(mission=>{
      const cluster=L.clusterById(mission.clusterId);
      const clusterState=L.clusterState(db,mission.clusterId);
      const state=L.missionState(db,mission.id);
      const isReady=clusterState.complete;
      return `<article class="transfer-mission" data-transfer-mission="${esc(mission.id)}">
        <div class="transfer-heading"><div><span class="eyebrow">TRANSFER · ${esc(mission.level)}</span><h4>${esc(mission.title)}</h4><p>${esc(mission.canDo)}</p></div><span class="transfer-status">${esc(formatAttempt(state.latest))}</span></div>
        ${isReady?`<p class="mission-setup">${esc(mission.setup)}</p><blockquote>${esc(mission.incomingMessage)}</blockquote><p class="mission-instructions">${esc(mission.instructions)}</p>${mission.requireFinalTimeConfirm?`<label class="field transfer-finaltime" for="finalTime-${esc(mission.id)}">Giờ cuối cùng bạn chốt<input type="text" id="finalTime-${esc(mission.id)}" maxlength="40" placeholder="vd: 7, 7:30, seven" autocomplete="off"></label>`:''}<label class="field transfer-field" for="transferResponse-${esc(mission.id)}">Câu trả lời của bạn<textarea id="transferResponse-${esc(mission.id)}" maxlength="1600" placeholder="Write 2–3 short sentences in English…"></textarea></label><label class="transfer-check"><input type="checkbox" data-transfer-spoke="${esc(mission.id)}"> Tôi đã nói câu trả lời thành tiếng</label><button class="module-action transfer-reveal" type="button" data-transfer-reveal="${esc(mission.id)}" disabled>Xem mẫu sau khi đã thử</button><div class="transfer-model hidden" id="transferModel-${esc(mission.id)}"><strong>Mẫu để đối chiếu</strong><p class="model-caveat">Tự đối chiếu theo checklist — đây là bài luyện, chưa phải đánh giá đạt.</p>${mission.modelAnswer.map(line=>`<p>${esc(line)}</p>`).join('')}<ul>${mission.selfCheck.map(item=>`<li>${esc(item)}</li>`).join('')}</ul><label class="transfer-check"><input type="checkbox" data-transfer-self-review="${esc(mission.id)}"> Tôi đã so sánh lần thử với mẫu</label><button class="primary-btn transfer-save" type="button" data-transfer-save="${esc(mission.id)}">Lưu lần thử</button></div>`:`<p class="mission-locked">Thêm đủ ${clusterState.total} Unit của “${esc(cluster?.title||'lộ trình này')}” trước. Nhiệm vụ này không dùng để chấm điểm card.</p>`}
      </article>`;
    }).join('');
    root.querySelectorAll('[data-transfer-mission]').forEach(card=>bindTransferMission(card));
    const unitCard=root.querySelector('[data-unit-transfer]');
    if(unitCard)bindUnitTransfer(unitCard,due);
  }

  function bindUnitTransfer(card,due){
    const response=card.querySelector('#unitTransferResponse');
    const reveal=card.querySelector('[data-unit-reveal]');
    response.oninput=()=>{reveal.disabled=!response.value.trim();};
    reveal.onclick=()=>{
      card.querySelector('[data-unit-save]')?.focus();
      card.querySelector('#unitTransferModel')?.classList.remove('hidden');
      reveal.classList.add('hidden');
    };
    card.querySelector('[data-unit-save]')?.addEventListener('click',()=>{
      try{
        const {result:attempt}=store.transact((db)=>L.submitUnitTransferAttempt(db,{
          unitId:due.unitId,sourceEventId:due.sourceEventId,
          responseText:response.value,
          selfReviewed:Boolean(card.querySelector('[data-unit-self-review]')?.checked)
        }));
        window.dispatchEvent(new CustomEvent('flashday:learning-state-changed'));
        renderTransferMissions();
        renderGuidedModules();
        showInlineMessage(attempt.selfReviewed?'Đã lưu — bạn đã tự đối chiếu câu mới với mẫu.':'Đã lưu lần thử. Bạn có thể quay lại đối chiếu sau.',false);
        // Close the loop: production returns to immersion. Offer a one-tap
        // path back to the source this unit was mined from so the learner
        // re-meets it in context.
        const cap=(store.refresh().captures||[]).find(c=>Array.isArray(c.linkedUnitIds)&&c.linkedUnitIds.includes(due.unitId));
        const srcKey=cap&&IM?IM.sourceKey(cap):null;
        if(srcKey&&$('transferMissions')){
          const back=document.createElement('button');
          back.type='button';back.className='ghost-btn transfer-return';
          back.textContent=`Đọc lại “${cap.sourceTitle||'nguồn'}” — gặp lại ${due.item.target||''} trong ngữ cảnh`;
          back.onclick=()=>{document.querySelector('[data-view="capture"]')?.click();openSource(srcKey);};
          $('transferMissions').appendChild(back);
        }
      }catch(error){
        cardMessage(card,error.message);
      }
    });
  }

  function bindTransferMission(card){
    const missionId=card.dataset.transferMission;
    const response=card.querySelector(`[id="transferResponse-${missionId}"]`);
    const spoke=card.querySelector('[data-transfer-spoke]');
    const reveal=card.querySelector('[data-transfer-reveal]');
    if(!response||!spoke||!reveal)return;
    const updateReveal=()=>{reveal.disabled=!response.value.trim()&&!spoke.checked;};
    response.oninput=updateReveal;
    spoke.onchange=updateReveal;
    reveal.onclick=()=>{
      // The can-do is confirmed BEFORE the model appears: the learner must
      // declare the final time, and a written attempt must state that same
      // time in a time position — a bare digit or number word won't do.
      const mission=L.missionById(missionId);
      if(mission?.requireFinalTimeConfirm){
        const gate=L.checkFinalTimeConfirm(mission,{
          declaredFinalTime:card.querySelector(`[id="finalTime-${missionId}"]`)?.value,
          responseText:response.value
        });
        if(!gate.ok){cardMessage(card,gate.error);return;}
      }
      card.querySelector('[data-transfer-save]')?.focus();
      card.querySelector('.transfer-model')?.classList.remove('hidden');
      reveal.classList.add('hidden');
    };
    card.querySelector('[data-transfer-save]')?.addEventListener('click',()=>saveTransferMission(missionId,card));
  }

  function saveTransferMission(missionId,card){
    try{
      const responseText=card.querySelector(`[id="transferResponse-${missionId}"]`)?.value||'';
      const spoke=Boolean(card.querySelector('[data-transfer-spoke]')?.checked);
      const selfReviewed=Boolean(card.querySelector('[data-transfer-self-review]')?.checked);
      const declaredFinalTime=card.querySelector(`[id="finalTime-${missionId}"]`)?.value||'';
      const {result:attempt}=store.transact((db)=>L.submitTransferAttempt(db,{missionId,responseText,spoke,selfReviewed,declaredFinalTime}));
      window.dispatchEvent(new CustomEvent('flashday:learning-state-changed'));
      renderTransferMissions();
      renderGuidedModules();
      showInlineMessage(attempt.selfReviewed?'Đã lưu lần thử và việc tự đối chiếu mẫu.':'Đã lưu lần thử. Bạn có thể quay lại tự đối chiếu mẫu sau.',false);
    }catch(error){
      cardMessage(card,error.message);
    }
  }

  // Transfer feedback must land inside the card the learner is looking at —
  // routing it to the import summary hides rejections inside a collapsed panel.
  function cardMessage(card,message){
    let note=card.querySelector('[data-card-msg]');
    if(!note){note=document.createElement('p');note.className='transfer-msg';note.dataset.cardMsg='';card.appendChild(note);}
    note.textContent=message;note.style.color='var(--fd-error)';
  }

  function sourceSkill(){return 'listen';}

  function renderSuitability(result){
    const box=$('sourceSuitability');if(!box)return;
    box.classList.remove('hidden');box.dataset.status=result.status;
    box.innerHTML=`<strong>${esc(result.label)}</strong><span>${esc(result.reason)}</span>`;
  }

  function showInlineMessage(message,isError=false){
    const summary=$('importSummary')||$('profileSummary');
    if(summary){summary.textContent=message;summary.style.color=isError?'var(--fd-error)':'';}
  }

  function speakSentence(text){
    if(!('speechSynthesis' in window)||!text)return;
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang='en-US';utterance.rate=0.92;
    window.speechSynthesis.speak(utterance);
  }

  // The library surface IS the home — LingQ lesson library, LR media catalog.
  // The last-opened source pins to the top as "Đọc tiếp" (Continue Studying),
  // the rest rank by live comprehensibility. An empty library shows the
  // fastest way in: one demo transcript or the import form right below.
  const LAST_SOURCE_KEY='flashday:last-source';
  // The continue-reading pin is learner state like the db itself — scope it
  // to the active namespace so one account's pin can't surface in another's.
  const lastSourceKey=()=>`${D.dbKey(localStorage)}:last-source`;
  function lastOpenedSource(){
    try{return localStorage.getItem(lastSourceKey())||'';}catch{return '';}
  }
  function renderSources(){
    const root=$('sourceRecommendations');if(!root)return;
    if(!IM){root.innerHTML='';return;}
    const db=store.refresh();
    const sources=IM.assessSources(db);
    const importShell=$('importShell');
    if(importShell)importShell.open=!sources.length;
    if(!sources.length){
      root.innerHTML=`<div class="source-recs-empty">
        <strong>Chưa có nguồn nào.</strong>
        <p>Dán transcript YouTube vào ô bên dưới — hoặc xem ngay vòng học hoàn chỉnh trên một đoạn hội thoại mẫu có sẵn unit trong deck.</p>
        <button type="button" class="ghost-btn" id="demoSourceBtn">Thử transcript mẫu →</button>
      </div>`;
      $('demoSourceBtn')?.addEventListener('click',importDemoSource);
      return;
    }
    const lastKey=lastOpenedSource();
    const ordered=[...sources].sort((a,b)=>((b.key===lastKey)-(a.key===lastKey)));
    root.innerHTML=`<div class="source-recs-head"><span class="eyebrow">NEXT FOR YOU</span><strong>Tiếp tục đọc & khám phá nguồn</strong><span>Độ phù hợp đo từ trạng thái ôn tập thật của bạn — phần ngoài deck được giữ nguyên, không giả vờ hiểu.</span></div>`+
      ordered.map(source=>{
        const isContinue=source.key===lastKey;
        const coveragePct=Math.round(source.coverage*100);
        const meta=`~${source.minutes} phút · deck phủ ${coveragePct}%`+(coveragePct<100?' · phần ngoài deck chưa có dữ liệu':'')+(source.learningUnits.length?` · ${source.learningUnits.length} unit đang học`:'')+(source.unmetLearning?` · ${source.unmetLearning} chưa gặp lại`:'');
        return `<button type="button" class="source-rec${isContinue?' source-rec-continue':''}" data-source-key="${esc(source.key)}">
          <span class="source-rec-top"><span class="source-rec-name">${isContinue?'<span class="continue-chip">Đọc tiếp</span>':''}<b>${esc(source.title)}</b></span><span class="verdict-pill verdict-${source.verdict.key}">${esc(source.verdict.label)}</span></span>
          <span class="source-rec-meta">${esc(meta)}</span>
          <span class="source-rec-bars"><i class="bar-known" style="width:${source.knownPct}%"></i><i class="bar-learning" style="width:${source.learningPct}%"></i><i class="bar-new" style="width:${source.newPct}%"></i></span>
        </button>`;
      }).join('');
    for(const button of root.querySelectorAll('.source-rec')){
      button.onclick=()=>openSource(button.dataset.sourceKey);
    }
  }

  // Bundled starter catalog — content exists before the learner has imported
  // anything (the "library is never empty" layer: LingQ mini-stories, DS
  // catalog). Items the learner already added are hidden, not greyed out.
  function renderStarterCatalog(){
    const root=$('starterCatalog');if(!root)return;
    if(!CAT?.ITEMS){root.innerHTML='';return;}
    const db=store.refresh();
    const importedIds=new Set((db.captures||[]).map(c=>String(c.sourceId||'')));
    const remaining=CAT.ITEMS.filter(item=>!importedIds.has(item.id));
    if(!remaining.length){root.innerHTML='';return;}
    root.innerHTML=`<div class="starter-catalog-head"><span class="eyebrow">THƯ VIỆN GỢI Ý</span><span>Bundle sẵn — thêm vào là đọc ngay, không cần tải về hay chuẩn bị.</span></div>
      <div class="starter-catalog-row">${remaining.map(item=>`
        <button type="button" class="catalog-card" data-catalog-id="${esc(item.id)}">
          <span class="catalog-card-top"><b>${esc(item.title)}</b><span class="level-pill">${esc(item.level)}</span></span>
          <span class="catalog-card-meta">~${item.minutes} phút · ${item.lines.length} câu · ${esc(item.source.name)}</span>
        </button>`).join('')}</div>`;
    for(const card of root.querySelectorAll('.catalog-card')){
      card.onclick=()=>{
        const item=CAT.ITEMS.find(i=>i.id===card.dataset.catalogId);
        if(item)installCatalogItem(item);
      };
    }
  }

  function installCatalogItem(item){
    const segments=item.lines.map(([text,translation],index)=>({
      start:index*4,end:index*4+3.2,index,text,translation
    }));
    store.transact((db)=>TI.importIntoDb(db,segments,{
      sourceId:item.id,sourceKind:'transcript',sourceTitle:item.title,
      estimatedLevel:item.level,subtitleFileName:item.id,url:item.source.url||'',
      resolveUnitIds:(sentence)=>L.matchUnitsInText(db.items||[],sentence).map(match=>match.unitId)
    }));
    reloadHub({message:`Đã thêm “${item.title}” từ thư viện gợi ý — đọc và bấm từ để lưu Unit.`,openSource:item.id});
  }

  let readerSourceKey=null;
  let readerCaptures=[];
  // Per-line encounter tracking — the learner "meets" a deck unit again only
  // when they actually reach its line: scrolled into view, played aloud, or
  // tapped to mine. Opening a source alone records nothing.
  let lineObserver=null;
  let encounterFlushTimer=null;
  const pendingEncounters=new Map(); // captureId -> Set of encounter kinds seen
  function queueEncounter(captureId,kind){
    if(!captureId)return;
    const key=String(captureId);
    let kinds=pendingEncounters.get(key);
    if(!kinds){kinds=new Set();pendingEncounters.set(key,kinds);}
    kinds.add(kind);
    window.clearTimeout(encounterFlushTimer);
    encounterFlushTimer=window.setTimeout(flushEncounters,400);
  }
  function flushEncounters(){
    window.clearTimeout(encounterFlushTimer);
    if(!pendingEncounters.size)return;
    const pending=[...pendingEncounters.entries()];
    pendingEncounters.clear();
    const today=IM.encounterDay(Date.now());
    const {result:changed}=store.transact(d=>{
      d.encounters=d.encounters||[];
      let added=0;
      for(const [captureId,kinds] of pending){
        const capture=readerCaptures.find(c=>String(c.id)===captureId);
        if(!capture)continue;
        for(const kind of kinds){
          // collectEncounters dedupes unit+capture+day against d.encounters as
          // it grows, so a second kind on the same line merges kinds into the
          // existing row instead of writing a duplicate.
          const created=IM.collectEncounters(d,[capture],{kind});
          d.encounters.push(...created);
          added+=created.length;
        }
        // Union every observed kind into today's rows for this line — whether
        // they were just created or recorded earlier in the session.
        for(const e of d.encounters){
          if(String(e.captureId)!==captureId||IM.encounterDay(Number(e.at)||0)!==today)continue;
          const list=Array.isArray(e.kinds)?e.kinds:(e.kinds=[e.kind].filter(Boolean));
          for(const kind of kinds)if(!list.includes(kind))list.push(kind);
          if(!e.kind)e.kind=list[0];
        }
      }
      return {result:added};
    });
    if(changed)window.dispatchEvent(new CustomEvent('flashday:learning-state-changed'));
  }
  // YouTube-embedded playback — real source audio instead of browser TTS when
  // the source carries a YouTube URL (LingQ/LR parity for "play the real
  // media"). TTS remains the fallback and is honestly labeled.
  let readerPlayer=null;
  let readerPlayerVideoId='';
  let readerPlayerReady=false;
  // Monotonic guard so a slow lookup for word A cannot overwrite the panel
  // after the learner has already tapped word B.
  let captureLookupSeq=0;

  function destroyReaderPlayer(){
    try{readerPlayer?.destroy?.();}catch{}
    readerPlayer=null;readerPlayerVideoId='';readerPlayerReady=false;
  }

  function closeReader(){
    const panel=$('sourceReader');
    flushEncounters();
    lineObserver?.disconnect();lineObserver=null;
    destroyReaderPlayer();
    readerSourceKey=null;
    readerCaptures=[];
    if(panel){panel.classList.add('hidden');panel.classList.remove('quiz-active');panel.innerHTML='';}
  }

  // Comprehension spot-check — "đã đọc" ≠ "hiểu". Each question shows a
  // source line and asks for its meaning among sibling distractors; the
  // result is a learner record, not a scheduler input.
  function toggleComprehensionQuiz(key){
    const box=$('readerQuiz');if(!box)return;
    const reader=$('sourceReader');
    if(!box.classList.contains('hidden')){box.classList.add('hidden');box.innerHTML='';reader?.classList.remove('quiz-active');return;}
    const db=store.refresh();
    const quiz=IM.comprehensionQuiz(db,readerCaptures,{count:5});
    if(!quiz.available){
      box.innerHTML=`<div class="quiz-empty">${esc(quiz.reason)}</div>`;
      box.classList.remove('hidden');
      return;
    }
    const picked=new Map();
    box.innerHTML=`<div class="quiz-head"><strong>Kiểm tra hiểu bài</strong><span>Chọn nghĩa đúng cho từng dòng — chỉ các dòng có bản dịch mới được hỏi.</span></div>`+
      quiz.questions.map((q,qi)=>`<div class="quiz-q" data-qi="${qi}">
        <p class="quiz-sentence">${esc(q.sentence)}</p>
        <div class="quiz-opts">${q.options.map(opt=>`<button type="button" class="quiz-opt" data-opt="${esc(opt)}">${esc(opt)}</button>`).join('')}</div>
      </div>`).join('')+
      `<button type="button" class="primary-btn" id="quizSubmit" disabled>Nộp — chấm thử</button><div id="quizResult"></div>`;
    box.classList.remove('hidden');
    // Hide the line translations while the check runs — a visible answer
    // column makes the quiz measure eyeballing, not comprehension.
    reader?.classList.add('quiz-active');
    box.querySelectorAll('.quiz-opt').forEach(btn=>btn.onclick=()=>{
      const q=btn.closest('.quiz-q');
      q.querySelectorAll('.quiz-opt').forEach(b=>b.classList.remove('picked'));
      btn.classList.add('picked');
      picked.set(Number(q.dataset.qi),btn.dataset.opt);
      $('quizSubmit').disabled=picked.size<quiz.questions.length;
    });
    $('quizSubmit').onclick=()=>{
      let correct=0;
      for(const [qi,opt] of picked){
        const q=quiz.questions[qi];
        const qEl=box.querySelector(`.quiz-q[data-qi="${qi}"]`);
        const ok=opt===q.answer;
        if(ok)correct++;
        qEl?.classList.add(ok?'quiz-right':'quiz-wrong');
        qEl?.querySelectorAll('.quiz-opt').forEach(b=>{
          b.disabled=true;
          if(b.dataset.opt===q.answer)b.classList.add('quiz-answer');
        });
      }
      const record={id:SC.stableId('comp',[key,Date.now()].join('|')),sourceKey:key,correct,total:quiz.questions.length,at:Date.now()};
      store.transact((db)=>{db.comprehensionChecks=Array.isArray(db.comprehensionChecks)?db.comprehensionChecks:[];db.comprehensionChecks.push(record);return {result:true};});
      $('quizSubmit').disabled=true;
      $('quizResult').innerHTML=`<p class="quiz-score">Đúng ${correct}/${quiz.questions.length} dòng — ${correct===quiz.questions.length?'chọn đúng hết trong lần này (bản dịch đã hiện lại — đọc lại để củng cố).':correct>0?'có dòng chưa chắc nghĩa — đọc lại dòng đánh dấu đỏ.':'chưa nắm được nghĩa — đọc lại kèm dịch rồi thử lại.'}</p>`;
      reader?.classList.remove('quiz-active');
      window.dispatchEvent(new CustomEvent('flashday:learning-state-changed'));
      renderGuidedModules();
    };
  }

  // Situation comprehension for a lesson cluster: whole-scenario questions
  // (initial time / final agreed time / place) with hints on wrong answers.
  // Records share the append-only comprehensionChecks log under the
  // '<lesson>:scenario' key — still practice evidence, not assessment.
  function renderScenarioQuiz(box,clusterId){
    const lesson=L.LESSON_DIALOGUES?.[clusterId];
    const questions=lesson?.scenarioQuiz;
    if(!box||!questions?.length)return;
    const key=`${lesson.sourceId}:scenario`;
    const picked=new Map();
    box.innerHTML=questions.map((q,qi)=>`<div class="quiz-q sq-q" data-qi="${qi}">
      <p class="quiz-sentence">${qi+1}. ${esc(q.q)}</p>
      <div class="quiz-opts">${q.options.map((opt,oi)=>`<button type="button" class="quiz-opt" data-oi="${oi}">${esc(opt)}</button>`).join('')}</div>
      <p class="sq-hint hidden"></p>
    </div>`).join('')+
    `<button type="button" class="primary-btn sq-submit" disabled>Nộp — chấm thử</button><div class="sq-result"></div>`;
    const submit=box.querySelector('.sq-submit');
    box.querySelectorAll('.quiz-opt').forEach(btn=>btn.onclick=()=>{
      const q=btn.closest('.sq-q');
      q.querySelectorAll('.quiz-opt').forEach(b=>b.classList.remove('picked'));
      btn.classList.add('picked');
      picked.set(Number(q.dataset.qi),Number(btn.dataset.oi));
      submit.disabled=picked.size<questions.length;
    });
    submit.onclick=()=>{
      let correct=0;
      for(const q of box.querySelectorAll('.sq-q')){
        const qi=Number(q.dataset.qi);
        const ok=picked.get(qi)===questions[qi].answer;
        if(ok)correct++;
        q.classList.add(ok?'quiz-right':'quiz-wrong');
        q.querySelectorAll('.quiz-opt').forEach((b,oi)=>{
          b.disabled=true;
          if(oi===questions[qi].answer)b.classList.add('quiz-answer');
        });
        // Wrong answers get the explanation + a retry instead of a dead mark.
        const hint=q.querySelector('.sq-hint');
        if(!ok&&hint){hint.textContent=questions[qi].hint;hint.classList.remove('hidden');}
      }
      const record={id:SC.stableId('comp',[key,Date.now()].join('|')),sourceKey:key,correct,total:questions.length,at:Date.now()};
      store.transact((db)=>{db.comprehensionChecks=Array.isArray(db.comprehensionChecks)?db.comprehensionChecks:[];db.comprehensionChecks.push(record);return {result:true};});
      submit.disabled=true;
      const done=correct===questions.length;
      box.querySelector('.sq-result').innerHTML=`<p class="quiz-score">Đúng ${correct}/${questions.length} — ${done?'nắm được tình huống của hội thoại này trong lần này.':'đọc lại hội thoại rồi thử lại các câu đỏ.'}</p>${done?'':'<button type="button" class="ghost-btn sq-retry">Làm lại</button>'}`;
      box.querySelector('.sq-retry')?.addEventListener('click',()=>renderScenarioQuiz(box,clusterId));
      window.dispatchEvent(new CustomEvent('flashday:learning-state-changed'));
      renderGuidedModules();
    };
  }
  const READER_THEMES=['dark','light','warm'];
  const READER_SIZES=['normal','large'];
  function readerPrefs(){
    try{
      const raw=JSON.parse(localStorage.getItem('flashday:reader-prefs')||'{}');
      return {theme:READER_THEMES.includes(raw.theme)?raw.theme:'dark',size:READER_SIZES.includes(raw.size)?raw.size:'normal'};
    }catch{return {theme:'dark',size:'normal'};}
  }
  function saveReaderPrefs(prefs){
    try{localStorage.setItem('flashday:reader-prefs',JSON.stringify(prefs));}catch{}
  }

  // LingQ-style click-to-mine: an untagged word in the reader is one click
  // away from becoming a tracked unit with its source sentence attached.
  function wordSpans(text){
    return text.split(/(\s+)/).map((token)=>{
      if(/^\s*$/.test(token))return esc(token);
      const clean=token.replace(/^[^\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+$/gu,'');
      if(!clean||!/[\p{L}]/u.test(clean))return esc(token);
      return `<span class="tok-word" data-word="${esc(clean)}">${esc(token)}</span>`;
    }).join('');
  }

  function renderLookupResult(slot,result){
    if(!slot)return;
    const defs=(result.en||[]).map(e=>`<p class="wc-def">${e.pos?`<b>${esc(e.pos)}</b> `:''}${esc(e.def)}</p>`).join('');
    const glosses=[result.vi?.main,...(result.vi?.alternatives||[])].filter(Boolean);
    const chips=glosses.length
      ?`<div class="wc-glosses">${glosses.map(g=>`<button type="button" class="wc-gloss" data-gloss="${esc(g)}">${esc(g)}</button>`).join('')}</div>
        <p class="field-note wc-mt-note">Bản dịch máy — kiểm tra trước khi lưu. Bấm để điền vào ô nghĩa.</p>`
      :'';
    slot.innerHTML=(defs||chips)
      ?`${defs}${chips}`
      :`<p class="field-note wc-mt-note">Không tra được từ điển — nhập nghĩa thủ công.</p>`;
    for(const chip of slot.querySelectorAll('.wc-gloss')){
      chip.onclick=()=>{const input=$('wcMeaning');if(input){input.value=chip.dataset.gloss;input.focus();}};
    }
  }

  function openWordCapture(word,capture){
    const box=$('wordCapturePanel');if(!box)return;
    box.classList.remove('hidden');
    // A mined sentence only becomes a real review card once the capture has a
    // full-sentence translation — otherwise the unit falls back to a bare
    // phrase card. Ask for the translation up front; never fabricate it.
    const needsSentenceTranslation=Boolean(capture?.sentence)&&!capture?.nativeSentence;
    box.innerHTML=`<div class="word-capture">
      <p class="field-note" style="margin:0">Lưu từ/cụm này thành Unit — câu nguồn đi kèm tự động.</p>
      <div class="field"><label for="wcTarget">Từ / cụm tiếng Anh</label><input id="wcTarget" value="${esc(word)}"></div>
      <div id="wcLookup" class="wc-lookup"><p class="field-note wc-mt-note">Đang tra từ điển…</p></div>
      <div class="field"><label for="wcMeaning">Nghĩa tiếng Việt</label><input id="wcMeaning" placeholder="ví dụ: đang trên đường tới"></div>
      ${capture?.sentence?`<p class="wc-sentence">${esc(capture.sentence)}</p>`:''}
      ${needsSentenceTranslation?`<div class="field"><label for="wcSentenceTranslation">Dịch cả câu trên (để tạo card có ngữ cảnh)</label><input id="wcSentenceTranslation" placeholder="ví dụ: Tôi đang trên đường tới."></div><p class="field-note" style="margin:0">Không có bản dịch câu → unit chỉ có card cụm từ, chưa ôn trong ngữ cảnh.</p>`:''}
      <div class="secondary-actions"><button id="wcSave" class="primary-btn" type="button">Lưu unit</button><button id="wcCancel" class="ghost-btn" type="button">Huỷ</button></div>
    </div>`;
    $('wcMeaning').focus();
    // Instant-meaning lookup (the LingQ/LR/Migaku table-stakes gap). Machine
    // glosses are labeled as such and only become the meaning after the
    // learner accepts or edits one — mirroring LingQ's hint-acceptance flow.
    const seq=++captureLookupSeq;
    const lookupSlot=$('wcLookup');
    if(WLK?.lookup){
      WLK.lookup(word).then(result=>{
        if(seq!==captureLookupSeq||!lookupSlot.isConnected)return;
        renderLookupResult(lookupSlot,result);
      }).catch(()=>{
        if(seq!==captureLookupSeq||!lookupSlot.isConnected)return;
        lookupSlot.innerHTML='<p class="field-note wc-mt-note">Không tra được từ điển — nhập nghĩa thủ công.</p>';
      });
    }else if(lookupSlot){
      lookupSlot.innerHTML='';
    }
    $('wcCancel').onclick=()=>{captureLookupSeq++;box.classList.add('hidden');box.innerHTML='';};
    $('wcSave').onclick=()=>{
      try{
        const target=$('wcTarget').value.trim();
        const meaning=$('wcMeaning').value.trim();
        const sentenceTranslation=$('wcSentenceTranslation')?.value.trim()||'';
        if(!meaning){$('wcMeaning').focus();return;}
        let linkedExisting=false;
        store.transact((db)=>{
          let unitId;
          const existing=(db.items||[]).find(i=>D.normalizeKey(i.target)===D.normalizeKey(target));
          if(existing){
            // Re-mining a known unit in a new context attaches the context —
            // LingQ-style — instead of failing on "already exists".
            unitId=existing.id;linkedExisting=true;
          }else{
            unitId=D.addItem(db,{
              target,meaning,
              type:target.includes(' ')?'chunk':'word_sense',
              origin:'source-captured',
              exampleSentence:capture?.sentence||'',
              exampleTranslation:sentenceTranslation||capture?.nativeSentence||'',
              contexts:capture?.sourceTitle?[capture.sourceTitle]:[]
            }).id;
          }
          // The capture row is the unit's provenance: link it so encounters on
          // this line credit the unit, memory search finds it via the source
          // sentence, and cardsFromCaptures can build its context card.
          if(capture){
            const row=(db.captures||[]).find(c=>String(c.id)===String(capture.id));
            if(row){
              row.linkedUnitIds=[...new Set([...(row.linkedUnitIds||[]),unitId])];
              if(sentenceTranslation&&!row.nativeSentence)row.nativeSentence=sentenceTranslation;
              row.updatedAt=Date.now();
            }
          }
          return {result:true};
        });
        captureLookupSeq++;
        box.classList.add('hidden');box.innerHTML='';
        // The review/memory views hold their own db copy — notify them the
        // learner state changed so the mined unit appears without a reload.
        window.dispatchEvent(new CustomEvent('flashday:learning-state-changed'));
        showInlineMessage(linkedExisting
          ?`“${target}” đã có trong deck — đã gắn thêm ngữ cảnh này.`
          :sentenceTranslation||capture?.nativeSentence
            ?`Đã lưu “${target}” — câu nguồn có bản dịch, sẽ ôn trong ngữ cảnh.`
            :`Đã lưu “${target}” — chưa có dịch câu nên tạm thời chỉ ôn dạng cụm từ.`);
        // Close+reopen refreshes highlights so the newly mined unit shows as
        // a marked token right where the learner tapped it.
        const key=readerSourceKey;
        if(key){openSource(key);openSource(key);}
      }catch(error){showInlineMessage(error.message,true);}
    };
  }

  // Inline transcript reader — the immersion surface. Unit spans are tinted
  // by knowledge level so seeing a word mid-sentence doubles as a noticing
  // moment, not just decoration.
  function openSource(key){
    const panel=$('sourceReader');if(!panel||!IM)return;
    if(readerSourceKey===key){closeReader();return;}
    // Switching sources flushes the old source's queued encounters while its
    // capture list is still loaded — otherwise a quick A→B switch would drop
    // the last line the learner touched in A.
    flushEncounters();
    lineObserver?.disconnect();lineObserver=null;
    readerSourceKey=key;
    const db=store.refresh();
    readerCaptures=(db.captures||[]).filter(c=>IM.sourceKey(c)===key)
      .sort((a,b)=>(Number(a.subtitle?.index)||0)-(Number(b.subtitle?.index)||0)||(Number(a.mediaTimestamp)||0)-(Number(b.mediaTimestamp)||0));
    const summary=IM.assessSource(db,key,readerCaptures);
    const videoId=WLK?.youtubeVideoId?WLK.youtubeVideoId(readerCaptures[0]?.url||''):null;
    try{localStorage.setItem(lastSourceKey(),key);}catch{}
    const prefs=readerPrefs();
    panel.dataset.theme=prefs.theme;
    panel.dataset.size=prefs.size;
    panel.innerHTML=`<div class="source-reader-head">
        <div><strong>${esc(summary.title)}</strong><span>${summary.segments} câu · ~${summary.minutes} phút · deck phủ ${Math.round(summary.coverage*100)}%</span></div>
        <div class="reader-controls">
          <button type="button" class="reader-ctl hidden" id="readerJumpStudy" title="Tới dòng có unit đang học">↳ unit đang học</button>
          <button type="button" class="reader-ctl" id="readerSizeToggle" title="Đổi cỡ chữ">A${prefs.size==='large'?'−':'+'}</button>
          ${READER_THEMES.map(t=>`<button type="button" class="reader-ctl${t===prefs.theme?' active':''}" data-rtheme="${t}">${{dark:'Tối',light:'Sáng',warm:'Ấm'}[t]}</button>`).join('')}
          <button type="button" class="reader-ctl" id="readerQuizBtn" title="Đối chiếu nghĩa của các dòng">Kiểm hiểu</button>
          <button type="button" class="ghost-btn" id="closeSourceReader">Đóng</button>
        </div>
      </div>
      ${videoId?`<div class="reader-player"><div id="readerPlayerEl"></div></div>`:''}
      <div class="source-reader-body">${readerCaptures.map((c,lineIndex)=>{
        const parts=IM.annotatedParts(db,c.sentence||'');
        const marked=parts.map(part=>part.unitId
          ?`<mark class="token-${part.knowledge}" title="${esc((db.items||[]).find(i=>i.id===part.unitId)?.meaning||'')}">${esc(part.text)}</mark>`
          :wordSpans(part.text)).join('');
        return `<div class="reader-line" data-capture="${esc(c.id)}">
          <button type="button" class="reader-play" data-say="${esc(c.sentence||'')}" data-ts="${Number(c.mediaTimestamp)||0}" title="${videoId?'Nghe audio gốc từ video':'Nghe giọng máy đọc'}">▶</button>
          <div class="reader-text"><p data-line="${lineIndex}">${marked||esc(c.sentence||'')}</p>${c.nativeSentence?`<small>${esc(c.nativeSentence)}</small>`:''}</div>
        </div>`;
      }).join('')}</div>
      <div id="wordCapturePanel" class="hidden"></div>
      <div id="readerQuiz" class="hidden"></div>
      <p class="footer-note">Chữ trơn = đã thuộc hoặc ngoài deck · <mark class="token-learning">đang học</mark> <mark class="token-new">mới vào deck</mark>. <b>Bấm từ bất kỳ để lưu thành Unit.</b></p>`;
    panel.classList.remove('hidden');
    $('closeSourceReader').onclick=closeReader;
    $('readerQuizBtn').onclick=()=>toggleComprehensionQuiz(key);
    const rerender=()=>{openSource(key);openSource(key);};
    $('readerSizeToggle').onclick=()=>{
      const current=readerPrefs();
      saveReaderPrefs({...current,size:current.size==='large'?'normal':'large'});
      rerender();
    };
    for(const button of panel.querySelectorAll('[data-rtheme]')){
      button.onclick=()=>{
        saveReaderPrefs({...readerPrefs(),theme:button.dataset.rtheme});
        rerender();
      };
    }
    // Lines become encounters on real contact: scrolled into view (60%+ of
    // the line visible inside the reader), played aloud, or tapped to mine.
    if('IntersectionObserver' in window){
      lineObserver?.disconnect();
      const body=panel.querySelector('.source-reader-body');
      lineObserver=new IntersectionObserver((entries)=>{
        for(const entry of entries)if(entry.isIntersecting)queueEncounter(entry.target.dataset.capture,'line-viewed');
      },{root:body,threshold:0.6});
      for(const line of panel.querySelectorAll('.reader-line'))lineObserver.observe(line);
    }
    // Real source audio first: when the source has a YouTube video, the line
    // play button seeks the embedded player to the subtitle timestamp. TTS
    // stays the fallback for sources without media.
    if(videoId){
      readerPlayerVideoId=videoId;
      WLK.ensureYouTubeApi().then((YT)=>{
        if(readerSourceKey!==key||readerPlayerVideoId!==videoId)return;
        readerPlayer=new YT.Player('readerPlayerEl',{videoId,playerVars:{rel:0},events:{onReady:()=>{readerPlayerReady=true;}}});
      }).catch(()=>{readerPlayerVideoId='';});
    }
    for(const button of panel.querySelectorAll('.reader-play')){
      button.onclick=()=>{
        const line=button.closest('.reader-line');
        const capture=readerCaptures.find(c=>String(c.id)===String(line?.dataset.capture));
        const canSeek=readerPlayer&&readerPlayerReady&&readerPlayerVideoId&&typeof readerPlayer.seekTo==='function';
        if(canSeek&&capture&&Number.isFinite(Number(capture.mediaTimestamp))){
          readerPlayer.seekTo(Number(capture.mediaTimestamp),true);
          readerPlayer.playVideo?.();
        }else{
          speakSentence(button.dataset.say||'');
        }
        queueEncounter(line?.dataset.capture,'line-played');
      };
    }
    for(const word of panel.querySelectorAll('.tok-word')){
      word.onclick=()=>{
        const line=word.closest('.reader-line');
        const lineIdx=line?.querySelector('[data-line]');
        const capture=lineIdx?readerCaptures[Number(lineIdx.dataset.line)]:null;
        queueEncounter(line?.dataset.capture,'word-tapped');
        openWordCapture(word.dataset.word,capture);
      };
      word.onkeydown=(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();word.click();}};
    }
    // Return-to-source lands on the first line that still contains a unit
    // being acquired — the line worth re-reading, not the document top.
    const studyLine=panel.querySelector('.reader-line mark.token-learning, .reader-line mark.token-new')?.closest('.reader-line');
    const jumpBtn=$('readerJumpStudy');
    if(studyLine&&jumpBtn){
      jumpBtn.classList.remove('hidden');
      jumpBtn.onclick=()=>studyLine.scrollIntoView({block:'center',behavior:'smooth'});
    }
  }

  // One-click starter for an empty library (Refold "beginner content"
  // pattern): a short dialogue written around the seed deck units so the
  // reader immediately shows highlights, taps mine real captures, and the
  // review loop can start without any external transcript.
  const DEMO_SOURCE_TITLE='Demo — nhắn tin hẹn gặp';
  const DEMO_LINES=[
    ['Hey, are you almost here?','Này, cậu gần tới chưa?'],
    ["Sorry, I'm running late. I'm on my way.",'Xin lỗi, tớ đang bị trễ. Tớ đang trên đường tới.'],
    ['No problem. Can you pick up an order for me on the way?','Không sao. Cậu lấy giúp tớ một đơn hàng trên đường được không?'],
    ['Sure — sorry, could you say that again?','Được chứ — xin lỗi, cậu nói lại được không?'],
    ['Can you pick up an order for me? The shop closes at six.','Cậu lấy giúp tớ một đơn hàng được không? Quán đóng cửa lúc sáu giờ.'],
    ["Got it. I'll be there in ten minutes.",'Hiểu rồi. Tớ sẽ tới trong mười phút.']
  ];
  function importDemoSource(){
    const segments=DEMO_LINES.map(([text,translation],index)=>({
      start:index*4,end:index*4+3.2,index,text,translation
    }));
    store.transact((db)=>TI.importIntoDb(db,segments,{
      sourceId:'demo-meetup',sourceKind:'transcript',sourceTitle:DEMO_SOURCE_TITLE,
      subtitleFileName:'demo-meetup',
      resolveUnitIds:(sentence)=>L.matchUnitsInText(db.items||[],sentence).map(match=>match.unitId)
    }));
    reloadHub({message:'Đã thêm transcript mẫu — đọc thử và bấm từ bất kỳ để lưu thành Unit.',openSource:'demo-meetup'});
  }

  async function importPersonalTranscript(){
    const file=$('transcriptFileInput')?.files?.[0];
    const pasted=$('importPasteInput')?.value?.trim()||'';
    if(!file&&!pasted){showInlineMessage('Chọn file transcript JSON/SRT hoặc dán transcript vào ô dưới.',true);return;}
    const button=$('importTranscriptBtn');
    if(button)button.disabled=true;
    try{
      const raw=file?await file.text():pasted;
      const isJson=file&&(file.name.toLowerCase().endsWith('.json')||file.type.includes('json'));
      // Paste path uses parsePlain (YouTube copy format or plain lines);
      // file path keeps the strict JSON/SRT parsers.
      const segments=file?(isJson?TI.parseJson(raw):TI.parseSrt(raw)):TI.parsePlain(raw);
      const sourceLevel=$('importSourceLevel')?.value||'';
      const sourceTitle=$('importSourceTitle')?.value.trim()||file?.name||'Transcript dán';
      // Identity: the video URL or file name when present; otherwise a
      // content hash so two different pasted sources sharing a title do not
      // collapse into one group (sourceKey collision fix).
      const sourceId=$('importUrlInput')?.value.trim()||file?.name||SC.stableId('src',[sourceTitle,segments[0]?.text||'',segments.length].join('|'));
      const {result:transactionResult}=store.transact((db)=>{
        const result=TI.importIntoDb(db,segments,{
          sourceId,
          sourceKind:'youtube',
          sourceTitle,
          estimatedLevel:sourceLevel,
          url:$('importUrlInput')?.value.trim()||'',
          fileName:$('importMediaNameInput')?.value.trim()||file?.name||'',
          subtitleFileName:file?.name||'dán transcript',
          audioBasePath:$('importAudioBaseInput')?.value.trim()||'',
          contextRadius:1,
          paddingMs:200,
          resolveUnitIds:(sentence)=>L.matchUnitsInText(db.items||[],sentence).map(match=>match.unitId)
        });
        const suitability=L.assessContent(db.learningProfile,{skill:sourceSkill(),contentLevel:sourceLevel});
        return {result,suitability};
      });
      const {result,suitability}=transactionResult;
      const message=`${result.total} segments · ${result.added} mới · ${result.ready} có translation · ${result.linkedSegments} segment gặp lại ${result.linkedUnitIds.length} Unit đã có.`;
      // Post-import transition: land in the reader on the new source (LingQ
      // "View lesson"), never back at a form or straight into review.
      const newSourceKey=IM?IM.sourceKey({sourceId,sourceTitle,subtitleFileName:file?.name||'dán transcript',file:{name:$('importMediaNameInput')?.value.trim()||file?.name||''},url:$('importUrlInput')?.value.trim()||''}):null;
      reloadHub({message:`${message} Đã thêm — bắt đầu đọc và bấm từ bất kỳ để lưu Unit.`,suitability,openSource:newSourceKey||sourceTitle});
    }catch(error){
      showInlineMessage(`Import lỗi: ${error.message}`,true);
      if(button)button.disabled=false;
    }
  }

  function restoreUi(){
    let payload=null;
    try{payload=JSON.parse(sessionStorage.getItem('flashday-learning-hub-return')||'null');}catch(_error){}
    if(!payload)return;
    sessionStorage.removeItem('flashday-learning-hub-return');
    window.setTimeout(()=>{
      document.querySelector('[data-view="capture"]')?.click();
      // Success message lands where the learner now is — the reader — not
      // inside the import form, which auto-collapses once the library fills.
      if(payload.openSource){
        openSource(payload.openSource);
        if(payload.message){
          const reader=$('sourceReader');
          const notice=document.createElement('p');
          notice.className='reader-notice';
          notice.textContent=payload.message;
          reader?.querySelector('.source-reader-body')?.prepend(notice);
        }
        $('sourceReader')?.scrollIntoView({block:'start',behavior:'smooth'});
      }else{
        if(payload.message)showInlineMessage(payload.message,false);
        if(payload.suitability)renderSuitability(payload.suitability);
      }
    },0);
  }

  async function pullProfile(){
    if(!supabaseClient||!learner)return;
    const {data,error}=await supabaseClient.from(PROFILE_TABLE).select('payload,updated_at').eq('owner_id',learner.id).maybeSingle();
    if(error)throw error;
    const local=L.normalizeProfile(store.refresh().learningProfile||{});
    const remote=L.normalizeProfile(data?.payload||{});
    const localAt=Number(local.updatedAt||0),remoteAt=Number(remote.updatedAt||0);
    if(data&&remoteAt>=localAt){
      store.transact((db)=>{db.learningProfile=remote;});
      renderProfile();
    }else if(localAt>0){
      await pushProfile();
    }
  }

  async function pushProfile(){
    if(!supabaseClient||!learner)return;
    const profile=L.normalizeProfile(store.refresh().learningProfile||{});
    if(!profile.updatedAt)return;
    const {error}=await supabaseClient.from(PROFILE_TABLE).upsert({owner_id:learner.id,payload:profile,updated_at:new Date(profile.updatedAt).toISOString()},{onConflict:'owner_id'});
    if(error)throw error;
  }

  async function connectProfileCloud(detail){
    supabaseClient=detail?.client||null;if(!supabaseClient)return;
    const {data}=await supabaseClient.auth.getSession();
    learner=data?.session?.user||null;
    window.clearTimeout(profileSyncTimer);
    profileSyncTimer=window.setTimeout(()=>pullProfile().catch(()=>undefined),700);
    supabaseClient.auth.onAuthStateChange((event,session)=>{
      // INITIAL_SESSION replays the session getSession() already pulled above.
      if(event==='INITIAL_SESSION')return;
      learner=session?.user||null;
      if(learner){
        window.clearTimeout(profileSyncTimer);
        profileSyncTimer=window.setTimeout(()=>pullProfile().catch(()=>undefined),700);
      }
    });
  }

  renderProfile();
  renderGuidedModules();
  renderTransferMissions();
  renderSources();
  renderStarterCatalog();
  if($('importTranscriptBtn'))$('importTranscriptBtn').onclick=importPersonalTranscript;
  // YouTube transcript auto-fetch — closes the "bring content with little
  // preparation" gap. The fetched text lands in the paste box so the learner
  // reviews/edits before it becomes captures.
  const urlInput=$('importUrlInput'),fetchBtn=$('ytFetchBtn');
  if(urlInput&&fetchBtn&&WLK){
    urlInput.addEventListener('input',()=>{fetchBtn.disabled=!WLK.youtubeVideoId(urlInput.value);});
    fetchBtn.onclick=async()=>{
      const videoId=WLK.youtubeVideoId(urlInput.value);
      if(!videoId)return;
      fetchBtn.disabled=true;fetchBtn.textContent='Đang lấy…';
      try{
        const {title,segments}=await WLK.fetchYouTubeTranscript(videoId);
        const paste=$('importPasteInput');
        if(paste)paste.value=segments.map(s=>{
          const t=Math.floor(s.start);
          return `[${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}] ${s.text}`;
        }).join('\n');
        const titleField=$('importSourceTitle');
        if(titleField&&!titleField.value.trim()&&title)titleField.value=title;
        showInlineMessage(`Đã lấy ${segments.length} câu từ video — kiểm tra rồi bấm “Phân tích & mở để đọc”.`);
      }catch(error){
        showInlineMessage(`${error.message||'Không lấy được transcript'} — mở video → Show transcript → copy → dán tay vẫn được.`,true);
      }finally{
        fetchBtn.textContent='Lấy transcript';
        fetchBtn.disabled=!WLK.youtubeVideoId(urlInput.value);
      }
    };
  }
  restoreUi();
  window.addEventListener('flashday:supabase-ready',(event)=>connectProfileCloud(event.detail));
})();
