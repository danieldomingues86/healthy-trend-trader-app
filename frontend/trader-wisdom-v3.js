/* Evolves the existing archive, favorite IDs and navigation with approved copy. */
(function(){
 'use strict';
 const t=(pt,en)=>window.appLanguage==='en-US'?en:pt;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={page:1,limit:12,sort:'featured',view:'grid',category:'psychology',special:'all',modalId:null};
 const categories=()=>[
  ['psychology',t('Psicologia','Psychology'),t('Controle emocional, disciplina e a mentalidade certa para conquistar consistência.','Emotional control, discipline and the mindset for consistency.'),'brain'],
  ['risk',t('Risco e Gerenciamento','Risk Management'),t('Proteja seu capital. Gerencie perdas e dimensione oportunidades.','Protect your capital. Manage losses and size opportunities.'),'shield'],
  ['performance','Performance',t('Evolução, prática e consistência para o longo prazo.','Progress, practice and consistency for the long term.'),'growth'],
  ['strategy',t('Estratégia','Strategy'),t('Conhecimento, planejamento e clareza para suas decisões.','Knowledge, planning and clarity for your decisions.'),'book'],
  ['traders',t('Grandes Traders','Great Traders'),t('Ensinamentos e experiência dos autores presentes no acervo.','Lessons and experience from the authors in your collection.'),'person'],
  ['mindset',t('Mindset e Vida','Mindset & Life'),t('Propósito, perspectiva e sabedoria para a sua jornada.','Purpose, perspective and wisdom for your journey.'),'compass']
 ];
 const paths={brain:'M12 4C8 0 4 3 5 7C1 7 1 13 4 14C1 18 5 23 9 20C10 23 12 22 12 19V4M12 4C16 0 20 3 19 7C23 7 23 13 20 14C23 18 19 23 15 20C14 23 12 22 12 19M5 7L8 9M4 14L8 13M19 7L16 9M20 14L16 13',shield:'M12 2L21 6V12C21 17 16 21 12 23C8 21 3 17 3 12V6Z',growth:'M3 21V15H7V21M10 21V10H14V21M17 21V4H21V21M3 10L10 5L14 7L21 1',book:'M12 5C8 2 4 2 1 4V21C4 19 8 19 12 22C16 19 20 19 23 21V4C20 2 16 2 12 5V22',person:'M12 13A5 5 0 1 0 12 3A5 5 0 1 0 12 13M3 23V21C3 13 21 13 21 21V23Z',compass:'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M16 7L14 14L7 17L9 10Z',search:'M10 2A8 8 0 1 0 10 18A8 8 0 1 0 10 2M16 16L23 23'};
 const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">${name==='grid'?'<path d="M2 2H9V9H2ZM15 2H22V9H15ZM2 15H9V22H2ZM15 15H22V22H15Z"/>':name==='list'?'<path d="M2 4H22M2 12H22M2 20H22"/>':`<path d="${paths[name]||paths.book}"/>`}</svg>`;
 const records=()=>window.wisdomCatalog?.records||[];
 const favorites=()=>traderWisdomState.favorites||[];
 const favorite=id=>favorites().includes(id);
 const select=()=>WisdomLibrary.select(records(),{...state,query:traderWisdomState.query,favorites:favorites()});
 const author=r=>r.author||t('Autoria não informada','Author not provided');
 const text=r=>window.appLanguage==='en-US'?r.quote:(r.pt||r.quote);
 const tradingThemes=new Set(['risk','process','performance','strategy','discipline','traders']);
 let heroRecordId=null;
 function heroRecord(){
  const approved=records().filter(record=>!record.needsReview&&String(text(record)||'').trim());
  const trading=approved.filter(record=>{
   const theme=record.theme||WisdomLibrary.inferredTheme(record);
   return tradingThemes.has(theme)||/\b(trad(?:er|ing)?|mercado|market|ação|acoes|stock|risco|risk|setup|posição|position)\b/i.test(String(record.quote||''));
  });
  const pool=trading.length?trading:approved;
  const alternatives=pool.filter(record=>record.id!==heroRecordId);
  const selected=(alternatives.length?alternatives:pool)[Math.floor(Math.random()*(alternatives.length?alternatives.length:pool.length))];
  heroRecordId=selected?.id||null;
  return selected;
 }
 const heroQuote=record=>record?`<blockquote><q>${esc(text(record))}</q><cite>— ${esc(author(record))}</cite></blockquote>`:'';
 function refreshHeroQuote(){
  const quote=document.querySelector('#traderWisdomRoot .wv-hero blockquote');
  const selected=heroRecord();
  if(quote&&selected)quote.outerHTML=heroQuote(selected);
 }
 const tags=r=>{const theme=r.theme||WisdomLibrary.inferredTheme(r);return[...new Set([t(({psychology:'Psicologia',discipline:'Disciplina',patience:'Paciência',risk:'Risco',process:'Processo',performance:'Performance',strategy:'Estratégia',traders:'Grandes Traders',mindset:'Mindset e Vida',wisdom:'Sabedoria'})[theme]||'Sabedoria',theme||'Wisdom'),...(r.tags||[])])];};
 function card(r){
  const copy=text(r),long=copy.length>210;
  return `<article class="wv-card wv-art-${r.index%3}${r.needsReview?' wv-pending':''}"><button class="wv-open" data-open="${esc(r.id)}" aria-label="${esc(t('Ler referência','Read reference')+' '+r.number)}">${r.needsReview?`<img class="wv-original-preview" loading="lazy" src="${esc(encodeURI(r.image))}" alt="${t('Referência original preservada','Preserved original reference')}"><span class="wv-review-label">${t('Original preservado · ver referência','Original preserved · view reference')}</span><span class="wv-tags">${tags(r).map(tag=>`<span>${esc(tag)}</span>`).join('')}</span>`:`<span class="wv-quote-mark" aria-hidden="true">“</span><span class="wv-excerpt ${long?'wv-long':''}">${esc(copy)}</span><span class="wv-author">${esc(author(r))}</span><span class="wv-tags">${tags(r).map(tag=>`<span>${esc(tag)}</span>`).join('')}</span>${long?`<span class="wv-read-more">${t('Continuar lendo','Continue reading')} →</span>`:''}`}</button><button class="wv-star" data-favorite="${esc(r.id)}" aria-pressed="${favorite(r.id)}" aria-label="${esc(t('Favoritar referência','Favorite reference')+' '+r.number)}">${favorite(r.id)?'★':'☆'}</button></article>`;
 }
 function heading(){return categories().find(c=>c[0]===state.category)||[state.category,t('Toda a sabedoria','All wisdom'),t('Grandes ideias. Diferentes perspectivas para a sua jornada.','Great ideas. Different perspectives for your journey.'),'book'];}
 function results(){
  const root=document.querySelector('#traderWisdomRoot .wv-results');if(!root)return;
  const all=select(),pages=Math.max(1,Math.ceil(all.length/state.limit));state.page=Math.max(1,Math.min(state.page,pages));
  const start=(state.page-1)*state.limit,numbers=[...new Set([1,...Array.from({length:5},(_,n)=>state.page-2+n),pages])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b),h=heading();
  root.innerHTML=`<div class="wv-section-heading"><div class="wv-section-title">${icon(h[3])}<h2>${esc(h[1])}</h2><p>${esc(h[2])}</p></div><div class="wv-controls"><span role="status">${all.length.toLocaleString(window.appLanguage)} ${t('referências','references')}</span><select data-sort aria-label="${t('Ordenar referências','Sort references')}">${[['featured',t('Destaques','Highlights')],['newest',t('Mais recentes','Newest')],['oldest',t('Mais antigos','Oldest')],['author',t('Autor','Author')],['favorites',t('Favoritos','Favorites')]].map(([key,label])=>`<option value="${key}" ${state.sort===key?'selected':''}>${label}</option>`).join('')}</select><div class="wv-views"><button data-view="grid" aria-label="${t('Grade','Grid')}" aria-pressed="${state.view==='grid'}">${icon('grid')}</button><button data-view="list" aria-label="${t('Lista','List')}" aria-pressed="${state.view==='list'}">${icon('list')}</button></div></div></div><div class="wv-grid ${state.view==='list'?'wv-list':''}">${all.slice(start,start+state.limit).map(card).join('')||`<div class="wv-empty">${t('Nenhuma referência corresponde à busca e aos filtros.','No references match your search and filters.')} <button data-clear>${t('Limpar filtros','Clear filters')}</button></div>`}</div><div class="wv-pagination"><span>${t('Mostrando','Showing')} ${all.length?start+1:0}–${Math.min(start+state.limit,all.length)} ${t('de','of')} ${all.length.toLocaleString(window.appLanguage)}</span><nav aria-label="${t('Páginas da biblioteca','Library pages')}"><button data-page="${state.page-1}" ${state.page===1?'disabled':''}>←</button>${numbers.map((n,k)=>`${k&&n>numbers[k-1]+1?'<span>…</span>':''}<button data-page="${n}" ${n===state.page?'aria-current="page"':''}>${n}</button>`).join('')}<button data-page="${state.page+1}" ${state.page===pages?'disabled':''}>→</button></nav><select data-size aria-label="${t('Referências por página','References per page')}">${[12,24,48].map(n=>`<option value="${n}" ${state.limit===n?'selected':''}>${n} ${t('por página','per page')}</option>`).join('')}</select></div>`;
 }
 function render(){
  const root=document.getElementById('traderWisdomRoot');if(!root)return;
  if(!window.wisdomCatalog||!window.WisdomLibrary){root.innerHTML=`<p class="wv-empty">${t('Não foi possível carregar o catálogo. Atualize a página.','The catalog could not be loaded. Refresh the page.')}</p>`;return;}
  const approved=records().filter(r=>!r.needsReview),daily=heroRecord(),counts=window.wisdomCatalog.counts;
  root.innerHTML=`<div class="wv-page"><section class="wv-top"><header class="wv-hero"><div class="wv-intro"><h1>${t('Sabedoria<br>do Trader','Trader<br>Wisdom')}</h1><p>${t('Grandes ideias. Mentes extraordinárias.<br>Lições para a sua jornada.','Great ideas. Extraordinary minds.<br>Lessons for your journey.')}</p></div>${heroQuote(daily)}</header><div class="wv-searchbar"><label class="wv-search">${icon('search')}<input data-search value="${esc(traderWisdomState.query)}" placeholder="${t('Buscar sabedoria, autor ou tema…','Search wisdom, author or topic…')}" aria-label="${t('Buscar sabedoria, autor ou tema','Search wisdom, author or topic')}"></label><nav class="wv-shortcuts" aria-label="${t('Filtros da biblioteca','Library filters')}"><button data-category="all" aria-pressed="${state.category==='all'}">${t('Todos','All')}</button><button data-special="favorites" aria-pressed="${state.special==='favorites'}">☆ ${t('Favoritos','Favorites')}</button><button data-special="featured" aria-pressed="${state.special==='featured'}">${t('Destaques','Highlights')}</button></nav></div><nav class="wv-categories" aria-label="${t('Categorias de sabedoria','Wisdom categories')}">${categories().map(([key,label,,symbol])=>`<button class="wv-category wv-category-${key}" data-category="${key}" aria-pressed="${state.category===key}"><img src="assets/wisdom-category-${key}-v3.webp" alt="" width="320" height="400"><span class="wv-category-content">${icon(symbol)}<strong>${esc(label)}</strong><small>${approved.filter(r=>WisdomLibrary.inCategory(r,key)).length} ${t('referências','references')}</small><span class="wv-arrow" aria-hidden="true">›</span></span></button>`).join('')}</nav></section><section class="wv-library"><div class="wv-audit-status">${counts.total.toLocaleString(window.appLanguage)} ${t('originais preservados','originals preserved')} · ${counts.valid} ${t('transcrições aprovadas','approved transcriptions')} <button data-category="review" aria-pressed="${state.category==='review'}">${t('Ver originais em revisão','View originals under review')} (${counts.needsReview.toLocaleString(window.appLanguage)})</button></div><div class="wv-results"></div><footer class="wv-signature">${t('“Busque conhecimento, aplique com disciplina, colha liberdade.”','“Seek knowledge, apply it with discipline, reap freedom.”')}<small>HEALTHY TREND TRADER</small></footer></section></div>`;
  results();
  root.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
   if(b.dataset.open)open(b.dataset.open);else if(b.dataset.favorite)toggle(b.dataset.favorite);
   else if(b.dataset.category){state.category=b.dataset.category;if(state.category==='all')state.special='all';state.page=1;render();}
   else if(b.dataset.special){state.special=state.special===b.dataset.special?'all':b.dataset.special;state.page=1;render();}
   else if(b.dataset.view){state.view=b.dataset.view;results();}
   else if(b.dataset.page){state.page=Number(b.dataset.page);results();}
   else if(b.hasAttribute('data-clear')){state.category='all';state.special='all';traderWisdomState.query='';state.page=1;render();}
  };
  root.oninput=e=>{if(e.target.matches('[data-search]')){traderWisdomState.query=e.target.value;state.page=1;results();}};
  root.onchange=e=>{if(e.target.matches('[data-sort]'))state.sort=e.target.value;else if(e.target.matches('[data-size]'))state.limit=Number(e.target.value);else return;state.page=1;results();};
 }
 function toggle(id){const set=new Set(favorites());set.has(id)?set.delete(id):set.add(id);traderWisdomState.favorites=[...set];saveTraderWisdomState();results();if(state.modalId)fillModal();}
 let opener;
 function fillModal(){
  const d=document.getElementById('wv-dialog'),r=records().find(r=>r.id===state.modalId);if(!r)return;
  const list=select(),idx=list.findIndex(i=>i.id===r.id);
  d.innerHTML=`<header><div><small>${esc(r.needsReview?t('Transcrição em revisão','Transcription under review'):tags(r).join(' · '))}</small><h2 id="wv-modal-title">${esc(author(r))}</h2></div><button data-close aria-label="${t('Fechar','Close')}">×</button></header><div class="wv-reader"><section>${r.needsReview?`<p>${t('Esta transcrição aguarda conferência. Consulte a mensagem na imagem original.','This transcription awaits verification. Read the message in the original image.')}</p>`:`<blockquote>${esc(text(r))}</blockquote>${r.reflection?.[window.appLanguage==='en-US'?'en':'pt']?`<h3>${t('Reflexão','Reflection')}</h3><p>${esc(r.reflection[window.appLanguage==='en-US'?'en':'pt'])}</p>`:''}`}<p>${esc(r.source||t('Acervo pessoal · imagem original','Personal collection · original image'))}</p></section><a href="${esc(encodeURI(r.image))}" target="_blank" rel="noopener"><img src="${esc(encodeURI(r.image))}" alt="${esc(t('Referência original','Original reference')+' '+r.number)}"></a></div><footer><button data-prev ${idx<=0?'disabled':''}>← ${t('Anterior','Previous')}</button><button data-fav aria-pressed="${favorite(r.id)}">${favorite(r.id)?'★':'☆'} ${t('Favoritar','Favorite')}</button><button data-next ${idx<0||idx>=list.length-1?'disabled':''}>${t('Próximo','Next')} →</button></footer>`;
  d.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-close'))d.close();if(b.hasAttribute('data-fav'))toggle(r.id);if(b.hasAttribute('data-prev')&&idx>0){state.modalId=list[idx-1].id;fillModal();}if(b.hasAttribute('data-next')&&idx>=0&&idx<list.length-1){state.modalId=list[idx+1].id;fillModal();}};
 }
 function open(id){opener=document.activeElement;state.modalId=id;let d=document.getElementById('wv-dialog');if(!d){d=document.createElement('dialog');d.id='wv-dialog';d.setAttribute('aria-labelledby','wv-modal-title');document.body.append(d);d.addEventListener('close',()=>{state.modalId=null;const id=opener?.dataset?.open;const replacement=Array.from(document.querySelectorAll('#wisdom [data-open]')).find(b=>b.dataset.open===id);(replacement||document.querySelector('#wisdom [data-search]'))?.focus();});}fillModal();d.showModal();}
  function organiseOriginals(){
   const root=document.getElementById('traderWisdomRoot');if(!root)return;
   const catalog=window.wisdomCatalog;
   const audit=root.querySelector('.wv-audit-status');
   const auditText=catalog?`${catalog.counts.total.toLocaleString(window.appLanguage)} ${t('originais preservados e organizados por tema','originals preserved and organised by theme')} · ${catalog.counts.valid} ${t('transcrições editoriais','editorial transcriptions')}`:'';
   if(audit&&audit.textContent!==auditText)audit.textContent=auditText;
   root.querySelectorAll('.wv-category').forEach(button=>{const category=button.dataset.category,count=records().filter(record=>WisdomLibrary.inCategory(record,category)).length,small=button.querySelector('small'),label=`${count} ${t('referências','references')}`;if(small&&small.textContent!==label)small.textContent=label;});
   const dialog=document.getElementById('wv-dialog');
   if(dialog?.open){const small=dialog.querySelector('header small');if(small&&/revisão|review/i.test(small.textContent))small.textContent=t('Original preservado','Original preserved');const notice=dialog.querySelector('.wv-reader section > p');if(notice&&/transcrição|transcription/i.test(notice.textContent))notice.textContent=t('A referência está disponível em seu formato original.','This reference is available in its original format.');}
  }
  renderTraderWisdom=render;renderTraderWisdomArchive=()=>{};loadTraderWisdomArchive=async()=>render();render();organiseOriginals();
  const goBeforeWisdomQuote=window.go;
  if(typeof goBeforeWisdomQuote==='function')window.go=function(id){goBeforeWisdomQuote(id);if(id==='wisdom')refreshHeroQuote();};
  new MutationObserver(organiseOriginals).observe(document.getElementById('traderWisdomRoot'),{childList:true,subtree:true});
})();
