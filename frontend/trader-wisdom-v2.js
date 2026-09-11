/* Editorial presentation over the original archive. No image is replaced. */
(function () {
  'use strict';
  const t = (pt,en) => window.appLanguage === 'en-US' ? en : pt;
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const state = {page:1,limit:12,sort:'featured',view:'grid',paths:[],loading:false,loaded:false,error:false,modalId:null};
  // Transcribed from these original images; Portuguese is an editorial translation.
  const annotations = {
    'tw-0001.jpg': {pt:'Quando você encontra seu nicho, não precisa de disciplina para fazer as coisas certas; não vai querer fazer outra coisa.'},
    'tw-0091.jpg': {pt:'A marca de um profissional é operar dentro do próprio círculo de competência e ignorar todo o resto.'},
    'tw-0006.png': {theme:'patience',quote:'Markets attracts those who want to make quick money but rewards only those who are comfortable getting rich slowly.',pt:'O mercado atrai quem quer ganhar dinheiro rápido, mas recompensa quem se sente confortável enriquecendo devagar.'},
    'tw-0007.jpg': {author:'Mark Twain',theme:'process',source:'AZ Quotes · atribuição no original',quote:'Continuous improvement is better than delayed perfection.',pt:'A melhoria contínua é melhor que a perfeição adiada.'},
    'tw-0008.jpg': {theme:'process',quote:'Your best teacher is your last mistake.',pt:'Seu melhor professor é o seu último erro.'},
    'tw-0009.jpg': {theme:'psychology',quote:'Be water, my friend.',pt:'Seja água, meu amigo.'},
    'tw-0010.jpg': {author:'Bruce Lee',theme:'mindset',source:'facebook.com/bruceleephotos · original',quote:'To understand is to connect. The more we understand, the greater and deeper will be our contact with all that is around us.',pt:'Entender é conectar. Quanto mais entendemos, maior e mais profundo é o contato com tudo ao nosso redor.'},
    'tw-0011.jpg': {author:'Stephen F. Lynch',theme:'wisdom',quote:'Free trade should not mean free labor.',pt:'Livre comércio não deveria significar trabalho gratuito.'},
    'tw-0012.jpg': {author:'Paul Tudor Jones',theme:'process',quote:'I always believe prices move first and fundamentals come second.',pt:'Sempre acreditei que os preços se movem primeiro e os fundamentos vêm depois.'},
    'tw-0013.jpg': {author:'Bob Jones',theme:'risk',quote:'No one will take as much care with your money as you will yourself.',pt:'Ninguém cuidará do seu dinheiro tão bem quanto você mesmo.'},
    'tw-0014.jpg': {author:'Larry Hite',theme:'psychology',quote:"I don't trade for excitement; I trade to win.",pt:'Eu não opero pela emoção; opero para vencer.'},
    'tw-0015.jpg': {theme:'process',quote:'No man knows how bad he is until he has tried very hard to be good.',pt:'Ninguém sabe o quanto precisa melhorar até se esforçar de verdade para ser bom.'},
    'tw-0016.jpg': {author:'Jesse Livermore',theme:'patience',quote:'One of the most helpful things that anybody can learn is to give up trying to catch the last eighth — or the first. These two are the most expensive eighths in the world.',pt:'Uma das lições mais úteis é desistir de tentar capturar o primeiro ou o último trecho de um movimento. Esses são os trechos mais caros do mundo.'},
    'tw-0017.jpg': {author:'Bruce Lee',theme:'mindset',quote:'If you always put limits on everything you do, it will spread into your work and into your life. There are no limits. There are only plateaus, and you must go beyond them.',pt:'Se você impõe limites a tudo o que faz, eles se espalham pelo trabalho e pela vida. Existem apenas platôs, e você precisa ir além deles.'},
    'tw-0018.jpg': {author:'Ed Seykota',theme:'process',quote:'Good traders trade. Good letter writers write letters.',pt:'Bons traders operam. Bons escritores de cartas escrevem cartas.'},
    'tw-0019.jpg': {author:'Sun Tzu',theme:'discipline',quote:'Victory is reserved for those who are willing to pay its price.',pt:'A vitória está reservada àqueles que estão dispostos a pagar o seu preço.'},
    'tw-0020.jpg': {theme:'wisdom',quote:'Wise people are not always silent, but they know when to be.',pt:'Pessoas sábias nem sempre ficam em silêncio, mas sabem quando devem ficar.'},
    'tw-0021.jpg': {theme:'process',quote:'The expert in anything was once a beginner.',pt:'Todo especialista já foi um iniciante.'},
    'tw-0022.jpg': {author:'Scott Adams',theme:'mindset',quote:'A person with a flexible schedule and average resources will be happier than a rich person who has everything except a flexible schedule. Step one in your search for happiness is to continually work toward having control of your schedule.',pt:'Uma pessoa com horários flexíveis e recursos medianos será mais feliz que uma pessoa rica que possui tudo, menos flexibilidade. O primeiro passo na busca pela felicidade é conquistar cada vez mais controle sobre o próprio tempo.'},
    'tw-0023.jpg': {author:'Dan Zanger',theme:'mindset',quote:'The market owes you nothing. Take full responsibility for everything that happens and your results will improve.',pt:'O mercado não lhe deve nada. Assuma total responsabilidade por tudo o que acontece e seus resultados melhorarão.'},
    'tw-0024.jpg': {theme:'discipline',quote:'Confidence comes from discipline and training.',pt:'A confiança nasce da disciplina e do treinamento.'},
    'tw-0025.jpg': {theme:'process',quote:'What most people think: one failure ends the journey. What successful people know: failure is part of the path to success.',pt:'O que a maioria pensa: uma falha encerra a jornada. O que as pessoas bem-sucedidas sabem: as falhas fazem parte do caminho até o sucesso.'},
    'tw-0026.jpg': {author:'C. S. Lewis',theme:'mindset',quote:'Hardships often prepare ordinary people for an extraordinary destiny.',pt:'As dificuldades frequentemente preparam pessoas comuns para um destino extraordinário.'},
    'tw-0027.jpg': {theme:'discipline',quote:'More important than the will to win is the will to prepare.',pt:'Mais importante que a vontade de vencer é a vontade de se preparar.'},
    'tw-0002.png': {author:'Paul Tudor Jones',theme:'psychology',quote:'Trading is very competitive and you have to be able to handle getting your butt kicked.',pt:'O trading é muito competitivo, e você precisa ser capaz de lidar com as derrotas.',source:'QuoteAddicts.com · acervo original'},
    'tw-0003.jpg': {author:'Oscar Wilde',theme:'mindset',quote:'Nowadays people know the price of everything and the value of nothing.',pt:'Hoje as pessoas sabem o preço de tudo e o valor de nada.'},
    'tw-0004.png': {theme:'mindset',quote:'Invest in yourself. Invest in your mind. Invest in your health. Invest in your happiness. Invest in your relationships. You are worth it.',pt:'Invista em você. Na sua mente, na sua saúde, na sua felicidade e nos seus relacionamentos. Você merece.'},
    'tw-0005.jpg': {author:'Denise Shull',theme:'risk',quote:'Traders who make money year in and year out (and there are plenty of them out there) always work the game in this order anyway – manage risk first, size opportunity second.',pt:'Traders que ganham dinheiro ano após ano seguem esta ordem: primeiro gerenciam o risco, depois dimensionam a oportunidade.'}
  };
  const labels = () => ({all:t('Todos','All'),process:t('Processo','Process'),risk:t('Risco','Risk'),psychology:t('Psicologia','Psychology'),discipline:t('Disciplina','Discipline'),patience:t('Paciência','Patience'),mindset:t('Mentalidade','Mindset'),wisdom:t('Sabedoria','Wisdom'),favorites:t('Favoritos','Favorites')});
  function items() {
    const known = new Map(traderWisdomItems.map(i=>[i.image,i]));
    const paths = [...new Set([...state.paths,...known.keys()])];
    return paths.map((image,index)=>{
      const file=image.split('/').pop(), base=known.get(image), extra=annotations[file];
      return {id:base?.id || image,image,number:file.match(/\d+/)?.[0] || String(index+1),index,searchText:window.traderWisdomSearchText?.[image] || '',...extra,...base};
    });
  }
  const favorite = id => traderWisdomState.favorites.includes(id);
  const detectedAuthor = i => /\bmark\s+minervini\b/i.test(i.searchText) ? 'Mark Minervini' : '';
  const author = i => i.author || detectedAuthor(i) || t('Autor não identificado','Unidentified author');
  function ocrMessage(value) {
    const text=String(value || '').replace(/\s+/g,' ').trim();
    if(!text)return '';
    // Prefer the quotation itself when the card also contains logos, topics or social UI.
    const quoted=text.match(/[“"]\s*([^“”"]{18,}?)\s*[”"](?=\s|$|[A-Z])/);
    const cleaned=(quoted?.[1] || text)
      .replace(/^.*?TRADING CARD\s*#?\d+\s*/i,'')
      .replace(/\s+TOPICS?:.*$/i,'')
      .trim();
    // OCR occasionally mistakes decorative art for symbols. Never expose a
    // severely corrupted fragment as editorial copy.
    const suspicious=(cleaned.match(/[{}\\|#@%=<>]/g)||[]).length;
    return suspicious > Math.max(3,cleaned.length/35) ? cleaned.replace(/[{}\\|#@%=<>]+/g,' ').replace(/\s+/g,' ').trim() : cleaned;
  }
  const excerpt = i => window.appLanguage === 'en-US' ? i.quote || i.reflection?.en || ocrMessage(i.searchText) : i.pt || i.reflection?.pt || i.quote || ocrMessage(i.searchText);
  function filtered() {
    const q=norm(traderWisdomState.query), theme=traderWisdomState.theme;
    return items().filter(i=>(!q || norm([i.author,i.quote,i.pt,i.reflection?.pt,i.reflection?.en,i.source,i.searchText,i.number,labels()[i.theme || 'wisdom'],...(i.tags || [])].join(' ')).includes(q)) && (theme==='all' || (theme==='favorites' ? favorite(i.id) : (i.theme || 'wisdom')===theme))).sort((a,b)=> state.sort==='featured' ? Number(Boolean(b.quote))-Number(Boolean(a.quote)) || a.index-b.index : state.sort==='author' ? author(a).localeCompare(author(b)) : state.sort==='favorites' ? Number(favorite(b.id))-Number(favorite(a.id)) || a.index-b.index : state.sort==='oldest' ? a.index-b.index : b.index-a.index);
  }
  function card(i) {
    const copy=excerpt(i), tag=labels()[i.theme || 'wisdom'];
    return `<article class="wv-card wv-art-${i.index%6}"><button class="wv-open" data-open="${esc(i.id)}" aria-label="${esc(t('Ler referência','Read reference')+' '+i.number)}"><span class="wv-quote-mark">“</span><span class="wv-excerpt">${esc(copy)}</span><span class="wv-author">${esc(author(i))}</span><span class="wv-tags"><span>${esc(tag)}</span><span>${i.quote || i.pt || i.reflection ? t('Ensinamento','Insight') : t('Texto do original','Original text')}</span></span></button><button class="wv-star" data-favorite="${esc(i.id)}" aria-pressed="${favorite(i.id)}" aria-label="${esc(t('Favoritar referência','Favorite reference')+' '+i.number)}">${favorite(i.id)?'★':'☆'}</button></article>`;
  }
  function results() {
    const root=document.querySelector('#traderWisdomRoot .wv-results'); if(!root)return;
    const all=filtered(),pages=Math.max(1,Math.ceil(all.length/state.limit));state.page=Math.min(state.page,pages);
    const start=(state.page-1)*state.limit,shown=all.slice(start,start+state.limit);
    const numbers=[...new Set([1,...Array.from({length:5},(_,n)=>state.page-2+n),pages])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);
    root.innerHTML=`${state.error?`<p class="wv-status">${t('Não foi possível carregar o acervo completo.','The full archive could not be loaded.')} <button data-retry>${t('Tentar novamente','Retry')}</button></p>`:''}<div class="wv-grid ${state.view==='list'?'wv-list':''}">${shown.map(card).join('') || `<p class="wv-empty">${state.loading?t('Carregando referências…','Loading references…'):t('Nenhuma referência encontrada.','No references found.')}</p>`}</div><div class="wv-pagination"><span>${t('Mostrando','Showing')} ${all.length?start+1:0}–${Math.min(start+state.limit,all.length)} ${t('de','of')} ${all.length.toLocaleString(window.appLanguage)} ${t('referências','references')}</span><nav aria-label="${t('Páginas da biblioteca','Library pages')}"><button data-page="${state.page-1}" ${state.page===1?'disabled':''}>←</button>${numbers.map((n,k)=>`${k && n>numbers[k-1]+1?'<span>…</span>':''}<button data-page="${n}" ${n===state.page?'aria-current="page"':''}>${n}</button>`).join('')}<button data-page="${state.page+1}" ${state.page===pages?'disabled':''}>→</button></nav><select data-size aria-label="${t('Referências por página','References per page')}">${[12,24,48].map(n=>`<option value="${n}" ${n===state.limit?'selected':''}>${n} ${t('por página','per page')}</option>`).join('')}</select></div>`;
  }
  async function load() {
    if(state.loading || state.loaded)return;state.loading=true;state.error=false;results();
    try {
      // Load metadata with the page, including when opened directly from disk.
      // Keep the JSON route as a fallback for an independently loaded component.
      let paths=window.traderWisdomAssetPaths;
      if(!Array.isArray(paths) || !paths.length){
        const r=await fetch('assets/wisdom-index.json');
        if(!r.ok)throw Error('Archive index unavailable');
        paths=(await r.json()).items;
      }
      if(!Array.isArray(paths) || !paths.length || paths.some(p=>typeof p!=='string' || !p.startsWith('assets/trader-wisdom/')))throw Error('Invalid archive index');
      state.paths=[...new Set(paths)];state.loaded=true;
    }
    catch {state.error=true;} finally {state.loading=false;render();}
  }
  function render() {
    const root=document.getElementById('traderWisdomRoot');if(!root)return;
    const daily=traderWisdomItems[Math.floor(Date.now()/86400000)%traderWisdomItems.length];
    root.innerHTML=`<main class="wv-page"><header class="wv-hero"><div class="wv-intro"><small>TRADER WISDOM</small><h1>${t('Sabedoria<br>do Trader','Trader<br>Wisdom')}</h1><p>${t('Uma coletânea de frases, princípios e aprendizados de grandes traders para inspirar, orientar e manter o foco no que realmente importa.','A collection of quotes, principles, and lessons from great traders to inspire, guide, and keep your focus on what truly matters.')}</p><div class="wv-stats"><span>♧ <b>${items().length.toLocaleString(window.appLanguage)}<small>${t('referências','references')}</small></b></span><span>♙ <b>${t('Grandes','Great')}<small>traders</small></b></span><span>♧ <b>${t('Disciplina','Discipline')}<small>${t('para o longo prazo','for the long term')}</small></b></span></div></div><blockquote><q>${esc(window.appLanguage === 'en-US' ? daily.quote : annotations[daily.image.split('/').pop()]?.pt || daily.quote)}</q><cite>— ${esc(daily.author)}</cite></blockquote></header><section class="wv-library"><div class="wv-toolbar"><label class="wv-search">⌕ <input data-search value="${esc(traderWisdomState.query)}" placeholder="${t('Buscar por autor, tema ou palavra-chave…','Search author, topic, or keyword…')}" aria-label="${t('Buscar na biblioteca','Search library')}"></label><nav class="wv-filters">${Object.entries(labels()).map(([key,label])=>`<button data-theme="${key}" aria-pressed="${traderWisdomState.theme===key}">${label}</button>`).join('')}</nav><select data-sort aria-label="${t('Ordenar referências','Sort references')}">${[['featured',t('Destaques','Highlights')],['newest',t('Mais recentes','Newest')],['oldest',t('Mais antigos','Oldest')],['author',t('Autor','Author')],['favorites',t('Favoritos','Favorites')]].map(([v,l])=>`<option value="${v}" ${state.sort===v?'selected':''}>${l}</option>`).join('')}</select><div class="wv-views"><button data-view="grid" aria-label="Grid" aria-pressed="${state.view==='grid'}">▦</button><button data-view="list" aria-label="${t('Lista','List')}" aria-pressed="${state.view==='list'}">☷</button></div></div><div class="wv-results"></div><footer class="wv-signature">${t('“Busque conhecimento, aplique com disciplina, colha liberdade.”','“Seek knowledge, apply it with discipline, reap freedom.”')}<small>HEALTHY TREND TRADER</small></footer></section></main>`;
    results();
    root.onclick=e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.open)open(b.dataset.open);
      if(b.dataset.favorite)toggle(b.dataset.favorite);
      if(b.dataset.theme){traderWisdomState.theme=b.dataset.theme;state.page=1;render();}
      if(b.dataset.view){state.view=b.dataset.view;render();}
      if(b.dataset.page){state.page=Number(b.dataset.page);results();}
      if(b.hasAttribute('data-retry'))load();
    };
    root.oninput=e=>{if(e.target.matches('[data-search]')){traderWisdomState.query=e.target.value;if(e.target.value.trim())traderWisdomState.theme='all';state.page=1;results();}};
    root.onchange=e=>{if(e.target.matches('[data-sort]'))state.sort=e.target.value;else if(e.target.matches('[data-size]'))state.limit=Number(e.target.value);else return;state.page=1;results();};
    if(!state.loaded&&!state.loading&&!state.error)load();
  }
  function toggle(id){const f=new Set(traderWisdomState.favorites);f.has(id)?f.delete(id):f.add(id);traderWisdomState.favorites=[...f];saveTraderWisdomState();results();if(state.modalId)fillModal();}
  let opener;
  function fillModal(){const d=document.getElementById('wv-dialog'),i=items().find(x=>x.id===state.modalId);if(!i)return;
    const list=filtered(),idx=list.findIndex(x=>x.id===i.id);
    d.innerHTML=`<header><div><small>${esc(labels()[i.theme||'wisdom'])} · #${esc(i.number)}</small><h2 id="wv-modal-title">${esc(author(i))}</h2></div><button data-close aria-label="${t('Fechar','Close')}">×</button></header><div class="wv-reader"><section><blockquote>${esc(excerpt(i))}</blockquote>${i.reflection?`<h3>${t('Reflexão','Reflection')}</h3><p>${esc(i.reflection[window.appLanguage==='en-US'?'en':'pt'])}</p>`:i.pt && window.appLanguage!=='en-US'?`<h3>Tradução editorial</h3><p>${esc(i.pt)}</p>`:''}<p class="wv-source">${esc(i.source || t('Acervo pessoal · imagem original','Personal collection · original image'))}</p></section><a href="${esc(encodeURI(i.image))}" target="_blank" rel="noopener"><img src="${esc(encodeURI(i.image))}" alt="${esc(t('Referência original','Original reference')+' #'+i.number)}"></a></div><footer><button data-prev ${idx<=0?'disabled':''}>← ${t('Anterior','Previous')}</button><button data-fav aria-pressed="${favorite(i.id)}">${favorite(i.id)?'★':'☆'} ${t('Favoritar','Favorite')}</button><button data-next ${idx<0||idx>=list.length-1?'disabled':''}>${t('Próximo','Next')} →</button></footer>`;
    d.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-close'))d.close();if(b.hasAttribute('data-fav'))toggle(i.id);if(b.hasAttribute('data-prev')&&idx>0){state.modalId=list[idx-1].id;fillModal();}if(b.hasAttribute('data-next')&&idx<list.length-1){state.modalId=list[idx+1].id;fillModal();}};
  }
  function open(id){opener=document.activeElement;state.modalId=id;let d=document.getElementById('wv-dialog');if(!d){d=document.createElement('dialog');d.id='wv-dialog';d.setAttribute('aria-labelledby','wv-modal-title');document.body.append(d);d.addEventListener('close',()=>{state.modalId=null;opener?.focus();});}fillModal();d.showModal();}
  renderTraderWisdom=render;
  renderTraderWisdomArchive=()=>{};
  loadTraderWisdomArchive=load;
  render();
})();
