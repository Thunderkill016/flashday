(function(){
  'use strict';

  const D=window.FlashDayData;
  const S=window.FlashDayStore;
  const L=window.FlashDayLearningEntry;
  const TI=window.FlashDayTranscriptImport;
  const IM=window.FlashDayImmersion;
  const KEY='flashday-memory-engine-repo-driven';
  const PROFILE_TABLE='learner_profiles';
  const $=(id)=>document.getElementById(id);
  const PROFILE_INPUTS={listen:'profileListen',speak:'profileSpeak',read:'profileRead',write:'profileWrite'};

  if(!D||!S||!L||!TI)return;

  const store=S.createPersistentStore({
    storage:localStorage,
    key:KEY,
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
      return `<article class="guided-cluster">
        <div class="guided-cluster-head">
          <div><span class="eyebrow">${esc(cluster.level)} · SITUATION CLUSTER</span><h4>${esc(cluster.title)}</h4><p>${esc(cluster.canDo)}</p></div>
          <span class="cluster-progress">${state.practiced}/${state.total} đã từng ôn</span>
        </div>
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
    root.innerHTML=L.TRANSFER_MISSIONS.map(mission=>{
      const cluster=L.clusterById(mission.clusterId);
      const clusterState=L.clusterState(db,mission.clusterId);
      const state=L.missionState(db,mission.id);
      const isReady=clusterState.complete;
      return `<article class="transfer-mission" data-transfer-mission="${esc(mission.id)}">
        <div class="transfer-heading"><div><span class="eyebrow">TRANSFER · ${esc(mission.level)}</span><h4>${esc(mission.title)}</h4><p>${esc(mission.canDo)}</p></div><span class="transfer-status">${esc(formatAttempt(state.latest))}</span></div>
        ${isReady?`<p class="mission-setup">${esc(mission.setup)}</p><blockquote>${esc(mission.incomingMessage)}</blockquote><p class="mission-instructions">${esc(mission.instructions)}</p><label class="field transfer-field" for="transferResponse-${esc(mission.id)}">Câu trả lời của bạn<textarea id="transferResponse-${esc(mission.id)}" maxlength="1600" placeholder="Write 2–3 short sentences in English…"></textarea></label><label class="transfer-check"><input type="checkbox" data-transfer-spoke="${esc(mission.id)}"> Tôi đã nói câu trả lời thành tiếng</label><button class="module-action transfer-reveal" type="button" data-transfer-reveal="${esc(mission.id)}" disabled>Xem mẫu sau khi đã thử</button><div class="transfer-model hidden" id="transferModel-${esc(mission.id)}"><strong>Mẫu để đối chiếu</strong>${mission.modelAnswer.map(line=>`<p>${esc(line)}</p>`).join('')}<ul>${mission.selfCheck.map(item=>`<li>${esc(item)}</li>`).join('')}</ul><label class="transfer-check"><input type="checkbox" data-transfer-self-review="${esc(mission.id)}"> Tôi đã so sánh lần thử với mẫu</label><button class="primary-btn transfer-save" type="button" data-transfer-save="${esc(mission.id)}">Lưu lần thử</button></div>`:`<p class="mission-locked">Thêm đủ ${clusterState.total} Unit của “${esc(cluster?.title||'lộ trình này')}” trước. Nhiệm vụ này không dùng để chấm điểm card.</p>`}
      </article>`;
    }).join('');
    root.querySelectorAll('[data-transfer-mission]').forEach(card=>bindTransferMission(card));
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
      const {result:attempt}=store.transact((db)=>L.submitTransferAttempt(db,{missionId,responseText,spoke,selfReviewed}));
      window.dispatchEvent(new CustomEvent('flashday:learning-state-changed'));
      renderTransferMissions();
      showInlineMessage(attempt.selfReviewed?'Đã lưu lần thử và việc tự đối chiếu mẫu.':'Đã lưu lần thử. Bạn có thể quay lại tự đối chiếu mẫu sau.',false);
    }catch(error){
      showInlineMessage(error.message,true);
    }
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

  // "Next for you": imported sources ranked by live comprehensibility — the
  // hub answers "what should I immerse in next" with knowledge state, not
  // vibes. Stats update themselves as units move new→learning→known.
  function renderSources(){
    const root=$('sourceRecommendations');if(!root)return;
    if(!IM){root.innerHTML='';return;}
    const db=store.refresh();
    const sources=IM.assessSources(db);
    if(!sources.length){root.innerHTML='';return;}
    root.innerHTML=`<div class="source-recs-head"><span class="eyebrow">NEXT FOR YOU</span><strong>Tiếp tục học từ tiếng Anh thật</strong><span>Độ phù hợp đo từ trạng thái ôn tập thật của bạn — phần ngoài deck được giữ nguyên, không giả vờ hiểu.</span></div>`+
      sources.map(source=>{
        const meta=`~${source.minutes} phút · deck phủ ${Math.round(source.coverage*100)}%`+(source.learningUnits.length?` · ${source.learningUnits.length} unit đang học`:'');
        return `<button type="button" class="source-rec" data-source-key="${esc(source.key)}">
          <span class="source-rec-top"><b>${esc(source.title)}</b><span class="verdict-pill verdict-${source.verdict.key}">${esc(source.verdict.label)}</span></span>
          <span class="source-rec-meta">${esc(meta)}</span>
          <span class="source-rec-bars"><i class="bar-known" style="width:${source.knownPct}%"></i><i class="bar-learning" style="width:${source.learningPct}%"></i><i class="bar-new" style="width:${source.newPct}%"></i></span>
        </button>`;
      }).join('');
    for(const button of root.querySelectorAll('.source-rec')){
      button.onclick=()=>openSource(button.dataset.sourceKey);
    }
  }

  let readerSourceKey=null;

  // Inline transcript reader — the immersion surface. Unit spans are tinted
  // by knowledge level so seeing a word mid-sentence doubles as a noticing
  // moment, not just decoration.
  function openSource(key){
    const panel=$('sourceReader');if(!panel||!IM)return;
    if(readerSourceKey===key){readerSourceKey=null;panel.classList.add('hidden');panel.innerHTML='';return;}
    readerSourceKey=key;
    const db=store.refresh();
    const captures=(db.captures||[]).filter(c=>IM.sourceKey(c)===key)
      .sort((a,b)=>(Number(a.subtitle?.index)||0)-(Number(b.subtitle?.index)||0)||(Number(a.mediaTimestamp)||0)-(Number(b.mediaTimestamp)||0));
    const summary=IM.assessSource(db,key,captures);
    panel.innerHTML=`<div class="source-reader-head">
        <div><strong>${esc(summary.title)}</strong><span>${summary.segments} câu · ~${summary.minutes} phút · deck phủ ${Math.round(summary.coverage*100)}%</span></div>
        <button type="button" class="ghost-btn" id="closeSourceReader">Đóng</button>
      </div>
      <div class="source-reader-body">${captures.map(c=>{
        const parts=IM.annotatedParts(db,c.sentence||'');
        const marked=parts.map(part=>part.unitId?`<mark class="token-${part.knowledge}" title="${esc((db.items||[]).find(i=>i.id===part.unitId)?.meaning||'')}">${esc(part.text)}</mark>`:esc(part.text)).join('');
        return `<div class="reader-line">
          <button type="button" class="reader-play" data-say="${esc(c.sentence||'')}" title="Nghe câu này">▶</button>
          <div class="reader-text"><p>${marked||esc(c.sentence||'')}</p>${c.nativeSentence?`<small>${esc(c.nativeSentence)}</small>`:''}</div>
        </div>`;
      }).join('')}</div>
      <p class="footer-note">Tô sáng: <mark class="token-known">đã thuộc</mark> <mark class="token-learning">đang học</mark> <mark class="token-new">trong bộ nhưng chưa ôn</mark> — phần không tô là từ ngoài deck.</p>`;
    panel.classList.remove('hidden');
    $('closeSourceReader').onclick=()=>{readerSourceKey=null;panel.classList.add('hidden');panel.innerHTML='';};
    for(const button of panel.querySelectorAll('.reader-play')){
      button.onclick=()=>speakSentence(button.dataset.say||'');
    }
  }

  async function importPersonalTranscript(){
    const file=$('transcriptFileInput')?.files?.[0];
    if(!file){showInlineMessage('Chọn file transcript JSON hoặc SRT trước.',true);return;}
    const button=$('importTranscriptBtn');
    if(button)button.disabled=true;
    try{
      const raw=await file.text();
      const isJson=file.name.toLowerCase().endsWith('.json')||file.type.includes('json');
      const segments=isJson?TI.parseJson(raw):TI.parseSrt(raw);
      const sourceLevel=$('importSourceLevel')?.value||'';
      const sourceTitle=$('importSourceTitle')?.value.trim()||file.name;
      const {result:transactionResult}=store.transact((db)=>{
        const result=TI.importIntoDb(db,segments,{
          sourceId:$('importUrlInput')?.value.trim()||file.name,
          sourceKind:'youtube',
          sourceTitle,
          estimatedLevel:sourceLevel,
          url:$('importUrlInput')?.value.trim()||'',
          fileName:$('importMediaNameInput')?.value.trim()||file.name,
          subtitleFileName:file.name,
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
      reloadHub({message,suitability});
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
      if(payload.message)showInlineMessage(payload.message,false);
      if(payload.suitability)renderSuitability(payload.suitability);
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
  if($('importTranscriptBtn'))$('importTranscriptBtn').onclick=importPersonalTranscript;
  restoreUi();
  window.addEventListener('flashday:supabase-ready',(event)=>connectProfileCloud(event.detail));
})();
