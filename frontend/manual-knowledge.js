(function () {
  'use strict';
  const root = document.getElementById('manual');
  if (!root || root.querySelector('.knowledge-center')) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const paths = {
    mountain: '<path d="m2 22 9-14 5 7 7-12 11 19-8-6-5 4-5-8-5 8-3-3z"/>',
    search: '<circle cx="14" cy="14" r="9"/><path d="m21 21 9 9"/>',
    rocket: '<path d="M13 22 8 28l-2 2 1-7 5-4M20 12l-2-5 7-3 6-1-1 6-3 7-5-2M12 20C16 9 24 4 31 3c-1 8-6 16-17 20zM17 24l-1 7 6-5 1-6"/><circle cx="23" cy="11" r="3"/><path d="m9 25-4 6"/>',
    book: '<path d="M17 7C12 3 7 3 3 5v23c5-2 10-2 14 2 4-4 9-4 14-2V5c-5-2-10-2-14 2v23M7 9c3-1 5-1 7 1M20 10c3-2 5-2 7-1M7 14c3-1 5-1 7 1M20 15c3-2 5-2 7-1"/>',
    brain: '<path d="M16 7c-1-6-8-5-8 1-5 0-6 7-2 9-4 4-1 9 3 9 0 6 7 6 7 1V7ZM20 7c1-6 8-5 8 1 5 0 6 7 2 9 4 4 1 9-3 9 0 6-7 6-7 1V7ZM9 10l3 4-3 4m19-8-3 4 3 4M10 23l6-2m10 2-6-2"/>',
    globe: '<circle cx="17" cy="17" r="13"/><ellipse cx="17" cy="17" rx="6" ry="13"/><path d="M4 17h26M7 9c6 4 14 4 20 0M7 25c6-4 14-4 20 0"/>',
    chart: '<path d="M5 29V21h3v8M13 29V16h3v13M21 29V10h3v19M29 29V4h3v25"/>',
    shield: '<path d="M17 3c5 4 9 5 12 5v10c0 6-7 11-12 14C12 29 5 24 5 18V8c4 0 8-1 12-5z"/>',
    fire: '<path d="M18 2c3 10 13 13 10 22-1 5-5 8-11 8S5 28 5 22c0-6 5-11 7-15-1 8 3 9 4 12 4-6 4-10 2-17z"/><path d="M17 22c-5 5-4 9 1 10 5-2 5-6-1-10z"/>',
    target: '<circle cx="16" cy="19" r="12"/><circle cx="16" cy="19" r="7"/><circle cx="16" cy="19" r="2"/><path d="m16 19 14-15m-6 1 1 5 6 1M29 2v5h5"/>',
    star: '<circle cx="17" cy="17" r="13"/><path d="m17 8 3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z"/>',
    cycle: '<path d="M27 9a12 12 0 1 0 2 13M25 3l4 8-9-1"/><path d="m17 9-4 11 8-4z"/>',
    trend: '<path d="M3 27 10 16l6 5L27 5m-7 1 8-2 1 9M7 31V20M15 29V21M23 25V11"/>',
    pulse: '<path d="M2 18h6l4-12 6 23 4-15 3 4h8"/>',
    layers: '<path d="m17 3 14 8-14 8L3 11zM4 18l13 8 13-8M4 25l13 8 13-8"/>',
    gauge: '<circle cx="17" cy="19" r="12"/><path d="M17 7V2m-4 0h8M17 11v9l5 3M6 5 3 8"/>',
    peel: '<path d="M5 29V18h5v11m5 0V12h5v17m5 0V6h5v23M4 13 29 2m-7 0h9v8"/>',
    ramp: '<path d="M3 30h8V20h9V10h11V3M4 15 28 2m-7 0h9v8"/>',
    chat: '<path d="M6 27 3 32l9-4c16 5 25-16 13-23C13-2-3 13 6 27z"/><circle cx="11" cy="15" r=".7"/><circle cx="17" cy="15" r=".7"/><circle cx="23" cy="15" r=".7"/>',
    play: '<rect x="3" y="6" width="28" height="23" rx="5"/><path d="m14 12 9 6-9 6z"/>',
    arrow: '<path d="m12 7 10 10-10 10"/>',
  };
  const icon = name => `<svg class="kc-icon" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
  const software = [
    ['today','Visão Geral','Seu centro de comando.','manual-dashboard','Veja o mercado, o risco da conta e a próxima ação. Comece pelas posições que precisam de atenção.'],
    ['newtrade','Novo Trade','Planeje e registre operações.','manual-newtrade','Defina entrada, stop e ATR. Avalie a Rubric e confira a quantidade calculada antes de registrar a operação.'],
    ['positions','Posições','Acompanhe e gerencie.','manual-positions','Abra a posição para consultar a linha do tempo, atualizar o stop e registrar reduções ou encerramento.'],
    ['portfolioheat','Portfolio Heat','Controle o risco da carteira.','manual-risk','Confira o risco agregado das posições e compare com o limite definido na sua Política de Risco.'],
    ['marketcycle','Ciclo de Mercado','Entenda o ambiente.','manual-permission','Leia o regime do mercado e a atualização dos dados. Use o contexto antes de procurar uma oportunidade.'],
    ['relativestrength','Força Relativa','Encontre líderes.',null,'Compare os ativos dentro do seu universo. Força relativa indica liderança; a entrada ainda depende do setup.'],
    ['fundamentals','Fundamentalista','Analise a qualidade.',null,'Pesquise o ticker e consulte seus fundamentos atuais. Use a análise como evidência adicional na Rubric.'],
    ['analytics','Painel da Verdade','Descubra onde você tem edge.','manual-analytics','Revise os resultados das operações registradas e procure padrões de qualidade e execução.'],
    ['journal','Diário','Registre e evolua.','manual-journal','Registre o processo técnico e emocional. O vínculo com uma posição é opcional, inclusive em dias sem operar.'],
    ['zen','Trader Zen','Proteja o trader.',null,'Escolha uma prática, acompanhe a sessão e retorne ao processo com atenção. As práticas concluídas compõem seu histórico.'],
  ];
  const concepts = [
    ['star','Empilhamento de Probabilidades','Vários edges, uma decisão.','Empilhamento de Probabilidades'],
    ['shield','Trading Rubric','A qualidade do setup.','Trading Rubric'],
    ['cycle','Ciclo de Mercado','Up, Down ou Transição.','Market Cycle'],
    ['mountain','Contexto Diário','Tendência, volatilidade e estrutura.','Contexto Diário'],
    ['trend','Força Relativa','Leaders e laggards.','Força Relativa'],
    ['chart','Fundamentos','Qualidade por trás do preço.','Score Fundamentalista'],
    ['pulse','Volatilidade / ATR','Medindo o risco.','ATR'],
    ['layers','Position Sizing','Transformando risco em posição.','Position Sizing'],
    ['fire','Portfolio Heat','O risco total da carteira.','Portfolio Heat'],
    ['gauge','Ongoing Risk','Proteção contínua.','Ongoing Risk'],
    ['peel','Peel-Off','Redução quando necessário.','Peel-Off'],
    ['ramp','Risk Ramp-Up','Aumente a exposição gradualmente.','Risk Ramp-Up'],
  ];
  const faq = [
    ['Por que meu Position Size ficou menor?','O tamanho respeita os limites de risco pelo stop, volatilidade e capital. A menor quantidade prevalece, com ajuste ao lote e validação do Portfolio Heat. Confira a camada limitante no planejamento.'],
    ['Posso registrar um dia sem operar?','Sim. Registre observações, decisões e emoções no Diário mesmo sem operações. Vincular um trade é opcional; um dia de espera também faz parte do processo.'],
    ['O que acontece se meu Setup não for A+?','A Rubric classifica a oportunidade conforme os critérios e pesos da política ativa. Grades diferentes podem permitir menos risco ou nenhum risco. Confira a classificação e o risco liberado antes de executar.'],
    ['Quando devo reduzir meu risco?','Revise a exposição quando o contexto se deteriorar ou os limites da política forem atingidos. Em posições abertas, acompanhe o Ongoing Risk e os alertas de proteção.'],
    ['O que significa Portfolio Heat?','É o risco agregado do portfólio, apresentado em relação à equity e ao limite da política. Ele mostra quanto risco já está comprometido e a capacidade para novas posições.'],
    ['Como o Rubric influencia meu risco?','Os critérios e pesos formam o score e a grade. A política converte essa qualidade em risco permitido, respeitando o perfil ativo. Stop, ATR, capital e Heat ainda limitam a posição final.'],
    ['Qual a diferença entre risco inicial e Ongoing Risk?','O risco inicial é a distância entre entrada e stop inicial multiplicada pela quantidade. O Ongoing Risk acompanha a distância entre preço atual e stop para a quantidade que ainda está aberta.'],
    ['Quando ocorre Peel-Off?','É uma redução de proteção quando o Ongoing Risk excede o limite definido. O sistema indica a redução necessária; a execução deve ser registrada. Não é uma realização de lucro automática.'],
    ['Como funciona o Risk Ramp-Up?','A exposição aumenta gradualmente conforme as condições e regras do método. Consulte o perfil ativo e os limites da Política de Risco; um score alto não autoriza ultrapassá-los.'],
    ['Onde altero patrimônio e percentuais do método?','Registre saldos e movimentações em Patrimônio. Ajuste os perfis, pesos e limites na Política de Risco e as preferências em Configurações.'],
  ];
  const steps = [
    ['globe','MARKET','Posso operar?','Analise o ciclo de mercado e obtenha permissão.','marketcycle'],
    ['chart','EDGE STACKING','A qualidade está presente?','Use o Rubric e os demais filtros de seleção.','newtrade'],
    ['shield','RISK','Quanto merece arriscar?','Calcule o Position Size com base na qualidade.','newtrade'],
    ['fire','PORTFOLIO HEAT','Minha carteira suporta?','Verifique o risco total do portfólio.','portfolioheat'],
    ['target','EXECUTION','Execute. Sem improvisar.','Siga o plano e registre a operação.','positions'],
  ];
  const legacy = document.createElement('details');
  legacy.className = 'kc-legacy'; legacy.id = 'knowledge-library';
  const legacySummary = document.createElement('summary'); legacySummary.textContent = 'Biblioteca completa · capítulos, fórmulas e guias anteriores';
  legacy.append(legacySummary);
  const legacyBody = document.createElement('div'); legacyBody.className = 'kc-legacy-body';
  while (root.firstChild) legacyBody.append(root.firstChild);
  legacy.append(legacyBody);
  const sectionHeading = (eyebrow,title,description,aside='') => `<header class="kc-section-heading"><div><span class="kc-eyebrow">${eyebrow}</span><h2>${title}</h2><p>${description}</p></div>${aside ? `<small>${aside}</small>` : ''}</header>`;
  root.innerHTML = `<div class="knowledge-center">
    <section class="kc-hero" aria-labelledby="knowledge-title"><div class="kc-hero-copy"><span class="kc-eyebrow">MANUAL</span><h1 id="knowledge-title">Central de<br>Conhecimento</h1><p class="kc-subtitle">Domine o software. Entenda o método.<br>Execute com intenção.</p><p class="kc-hero-description">Tudo o que você precisa para transformar o Healthy Trend Trader<br class="kc-wide-only"> em uma rotina de decisões consistentes.</p></div><p class="kc-hero-motto">MELHORES<br>TRADERS<br>CONSTROEM<br>MELHORES<br>DECISÕES</p></section>
    <div class="kc-body"><section class="kc-search-section" aria-label="Buscar conhecimento"><form class="kc-search" role="search">${icon('search')}<input type="search" id="knowledgeSearch" placeholder="O que você quer aprender hoje?" aria-label="O que você quer aprender hoje?" autocomplete="off"><kbd>Ctrl K</kbd></form><div class="kc-popular"><span>Perguntas populares:</span>${['Como calcular minha mão?','O que é Portfolio Heat?','Quando um setup é A+?','Como funciona o Rubric?','Por que meu risco foi reduzido?'].map((q,i)=>`<button type="button" data-popular="${i}">${q}</button>`).join('')}</div><section class="kc-search-results" aria-live="polite" hidden></section></section>
    <nav class="kc-doors" aria-label="Trilhas de aprendizado">${[['rocket','COMEÇAR AGORA','Aprenda o fluxo completo do método em poucos minutos.','knowledge-system','green'],['book','EXPLORAR O SOFTWARE','Entenda cada ferramenta da plataforma.','knowledge-software','blue'],['brain','DOMINAR O MÉTODO','Aprenda os conceitos por trás das decisões.','knowledge-method','gold']].map(([i,t,d,target,c])=>`<a class="kc-door ${c}" href="#${target}">${icon(i)}<div><h2>${t}</h2><p>${d}</p></div>${icon('arrow')}</a>`).join('')}</nav>
    <section class="kc-panel kc-system" id="knowledge-system">${sectionHeading('O HEALTHY TRADING SYSTEM','Do contexto à execução. Sempre na mesma ordem.','Um processo claro para tomar melhores decisões e proteger seu capital.','WAIT → CONFIRM → EXECUTE')}<div class="kc-process">${steps.map(([i,t,q,d,route],n)=>`<button class="kc-step" type="button" data-guide="${route}"><span class="kc-step-number">0${n+1}</span>${icon(i)}<h3>${t}</h3><strong>${q}</strong><p>${d}</p>${n<4?'<span class="kc-connector" aria-hidden="true">→</span>':''}</button>`).join('')}</div><div class="kc-system-bottom"><blockquote>“Você nunca começa pela vontade de operar.<br>Você conquista o direito de assumir risco.”</blockquote><div class="kc-signature">${icon('mountain')}<span>DISCIPLINA HOJE.<br>LIBERDADE SEMPRE.</span></div></div><p class="kc-author">Healthy Trend Trader</p></section>
    <section class="kc-panel" id="knowledge-software">${sectionHeading('EXPLORE O SOFTWARE','Conheça cada ferramenta da plataforma','Clique em uma tela para acessar seu guia completo, exemplos e dicas de uso.','MAIS QUE FERRAMENTAS.<br>UM SISTEMA INTEGRADO.')}<div class="kc-software-grid">${software.map(([id,title,description])=>`<button class="kc-screen" type="button" data-guide="${id}"><div class="kc-screen-window"><img src="assets/manual-knowledge/${id}.jpg" alt="Captura da tela ${title} do Healthy Trend Trader" loading="lazy" width="560" height="315"></div><div class="kc-screen-copy"><h3>${title}</h3><p>${description}</p>${icon('arrow')}</div></button>`).join('')}</div></section>
    <section class="kc-panel" id="knowledge-method">${sectionHeading('DOMINE O MÉTODO','Os conceitos que fundamentam suas decisões','Entenda o porquê de cada etapa e como os conceitos se conectam.','“CONHECIMENTO APLICADO<br>É APENAS INFORMAÇÃO.”'.replace('É APENAS','VAI ALÉM DA'))}<div class="kc-concept-grid">${concepts.map(([i,t,d],n)=>`<button class="kc-concept" type="button" data-concept="${n}">${icon(i)}<div><h3>${t}</h3><p>${d}</p></div></button>`).join('')}</div></section>
    <section class="kc-panel kc-rubric" id="knowledge-rubric">${sectionHeading('TRADING RUBRIC · EVIDÊNCIAS EM CONJUNTO','Vários edges. Uma decisão consciente.','A qualidade orienta a exposição, dentro da sua política de risco.')}<div class="kc-rubric-flow"><div class="kc-evidence">${['Ciclo de Mercado','Contexto Diário','Força Relativa','Fundamentos','Volatilidade','Execução'].map(t=>`<span>${t}<i aria-hidden="true">+</i></span>`).join('')}</div><svg class="kc-confluence" viewBox="0 0 140 230" preserveAspectRatio="none" aria-hidden="true">${[15,55,95,135,175,215].map(y=>`<path d="M0 ${y} C75 ${y} 55 115 140 115"/>`).join('')}</svg><button type="button" class="kc-rubric-core" data-concept="1"><small>EXEMPLO ILUSTRATIVO</small><strong>A+ <span>92/100</span></strong><b>HIGH CONVICTION</b><span>Entenda o Rubric →</span></button><div class="kc-rubric-outcomes"><p><b>Mais edges alinhados</b><span>Maior qualidade → maior confiança<br>→ exposição adequada.</span></p><p><b>Menos edges alinhados</b><span>Maior incerteza → risco reduzido<br>ou nenhuma operação.</span></p><small>Score ilustrativo. A classificação real segue a política ativa e não representa probabilidade de ganho.</small></div></div></section>
    <nav class="kc-support" aria-label="Mais formas de aprender"><a href="#knowledge-library" class="kc-support-card">${icon('play')}<div><span class="kc-eyebrow">TUTORIAIS E EXEMPLOS</span><h3>Aprenda vendo</h3><p>Exemplos práticos e simulações para fixar o conhecimento.</p></div>${icon('arrow')}</a><a href="#knowledge-faq" class="kc-support-card">${icon('chat')}<div><span class="kc-eyebrow">FAQ</span><h3>Perguntas frequentes</h3><p>Respostas rápidas para as dúvidas mais comuns da plataforma e do método.</p></div>${icon('arrow')}</a><article class="kc-support-card kc-coming-soon" aria-label="Ask Healthy, em breve">${icon('chat')}<div><span class="kc-eyebrow">ASK HEALTHY</span><h3>Pergunte qualquer coisa</h3><p>Respostas baseadas no seu método, regras e documentação do sistema.</p></div><span class="kc-soon">EM BREVE</span></article></nav>
    <section class="kc-panel kc-faq" id="knowledge-faq">${sectionHeading('RESPOSTAS PARA CONTINUAR','Perguntas frequentes','Abra apenas a dúvida que você quer resolver.')}<div class="kc-faq-grid">${faq.map(([q,a],i)=>`<details id="knowledge-faq-${i}"><summary>${q}<span aria-hidden="true">+</span></summary><p>${a}</p></details>`).join('')}</div></section>
    <div id="knowledge-library-mount"></div><footer class="kc-footer"><span>${icon('mountain')}<b>HEALTHY TREND TRADER</b><em>V4 PREMIUM</em></span><p>Processo antes do resultado. <i>|</i> Conhecimento gera clareza. <i>|</i> Disciplina gera liberdade.</p></footer></div>
    <dialog class="kc-reader" aria-labelledby="kc-reader-title"><header><span class="kc-eyebrow">CENTRAL DE CONHECIMENTO</span><button type="button" data-close-reader aria-label="Fechar guia">×</button></header><div class="kc-reader-content"></div></dialog>
  </div>`;
  root.querySelector('#knowledge-library-mount').append(legacy);
  // Keep every existing definition, example and glossary interaction inside the Manual.
  const glossaryRoot = document.getElementById('glossaryRoot');
  const glossarySection = document.createElement('details');
  glossarySection.id = 'knowledge-glossary';
  glossarySection.className = 'kc-glossary';
  glossarySection.innerHTML = '<summary>Todos os conceitos do método · Glossário completo</summary>';
  if (glossaryRoot) glossarySection.append(glossaryRoot);
  root.querySelector('#knowledge-method').after(glossarySection);
  const previousGo = window.go;
  window.go = function(id, ...args) {
    if (id !== 'glossary') return previousGo.call(this, id, ...args);
    const result = previousGo.call(this, 'manual', ...args);
    glossarySection.open = true;
    if (typeof renderGlossary === 'function') renderGlossary();
    requestAnimationFrame(() => scrollToSection('knowledge-glossary'));
    return result;
  };
  const reader = root.querySelector('.kc-reader');
  const content = root.querySelector('.kc-reader-content');
  const search = root.querySelector('#knowledgeSearch');
  const results = root.querySelector('.kc-search-results');
  let returnFocus;
  function showReader(html) { returnFocus = document.activeElement; content.innerHTML = html; reader.showModal(); reader.scrollTop = 0; }
  function guide(id) {
    const entry = software.find(item=>item[0]===id); if (!entry) return;
    const [,title,,source,description] = entry;
    const original = source && legacy.querySelector('#'+source);
    const additionalGuides = {
      relativestrength: ['Escolha o universo de ativos e compare sua força relativa. Confira a data de atualização antes de interpretar a classificação.', 'Use os líderes para organizar sua pesquisa. Depois avalie o contexto técnico e a Rubric em Novo Trade; liderança não substitui um gatilho de entrada.'],
      fundamentals: ['Pesquise o código do ativo e confira os indicadores disponíveis. Campos sem dados devem permanecer sem avaliação, sem presumir qualidade.', 'Use a consulta atual para entender a empresa e complementar a seleção. Volte ao planejamento para revisar a dimensão fundamentalista e os demais critérios da Rubric.'],
      zen: ['Escolha a prática adequada ao seu momento e acompanhe as instruções da sessão.', 'Conclua a prática para registrar seu histórico. Antes de voltar à operação, retome seu plano e confira se está em condição de executá-lo.']
    };
    const paragraphs = original ? [...original.querySelectorAll('p')].map(p=>p.textContent).filter(p=>p && !/checklist A\+ antes|classificada como rejeitada/.test(p)) : (additionalGuides[id] || []);
    showReader(`<h2 id="kc-reader-title">${title}</h2><p class="kc-reader-lead">${description}</p><img class="kc-reader-screen" src="assets/manual-knowledge/${id}.jpg" alt="Tela ${title}"><span class="kc-eyebrow">COMO USAR</span>${paragraphs.length?paragraphs.map(p=>`<p>${esc(p)}</p>`).join(''):'<p>Consulte a informação da tela, confira seu contexto e siga para a próxima etapa do processo. Mantenha a Política de Risco como referência para suas decisões.</p>'}<button class="kc-open-tool" type="button" data-route="${id}">Abrir ${title} →</button>`);
  }
  function concept(index) {
    const entry=concepts[index]; if(!entry)return;
    const [,title,description,term]=entry;
    const glossary=typeof methodGlossary!=='undefined'?methodGlossary:[];
    const item=glossary.find(x=>normalize(x.term)===normalize(term)) || glossary.find(x=>normalize(x.term).includes(normalize(term)));
    const fallback={definition:description,role:'Considere este conceito em conjunto com os demais critérios e com a sua Política de Risco.'};
    const data=item||fallback;
    showReader(`<div class="kc-reader-symbol">${icon(entry[0])}</div><h2 id="kc-reader-title">${title}</h2><p class="kc-reader-lead">${esc(data.definition)}</p><h3>Por que existe</h3><p>${esc(data.role)}</p>${data.not?`<h3>Não confundir</h3><p>${esc(data.not)}</p>`:''}<button class="kc-open-tool" type="button" data-glossary="${esc(item?.term||term)}">Explorar no Glossário →</button>`);
  }
  function scrollToSection(id) {
    const target=document.getElementById(id); if(!target)return;
    if(target===legacy)legacy.open=true;
    if(target.tagName==='DETAILS')target.open=true;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
    target.classList.remove('kc-highlight'); void target.offsetWidth; target.classList.add('kc-highlight');
    setTimeout(()=>target.classList.remove('kc-highlight'),1800);
  }
  const catalog=[...(typeof methodGlossary!=='undefined'?methodGlossary:[]).map((item,id)=>({title:item.term,text:[item.definition,item.role,item.not].join(' '),type:'glossary',id})),...software.map(([id,title,,source,text])=>({title,text,type:'guide',id})),...concepts.map(([,title,text],id)=>({title,text,type:'concept',id})),...faq.map(([title,text],id)=>({title,text,type:'faq',id})),...Array.from(legacy.querySelectorAll('.manual-section:not(.manual-faq)')).map(section=>({title:section.querySelector('h2')?.textContent||'Guia completo',text:section.textContent,type:'legacy',id:section.id}))];
  function findContent() {
    const query=normalize(search.value.trim()); results.hidden=!query; if(!query){results.innerHTML='';return;}
    const tokens=query.split(/\s+/).filter(Boolean);
    const matches=catalog.filter(item=>tokens.every(token=>normalize(item.title+' '+item.text).includes(token))).slice(0,12);
    results.innerHTML=matches.length?`<p>${matches.length} resultado(s)</p>${matches.map(item=>`<button type="button" data-result-type="${item.type}" data-result-id="${item.id}"><b>${esc(item.title)}</b><span>${esc(item.text.slice(0,130))}…</span>${icon('arrow')}</button>`).join('')}`:'<p>Nenhum conteúdo encontrado. Tente “risco”, “diário”, “ATR” ou “Rubric”.</p>';
  }
  search.addEventListener('input',findContent);
  root.querySelector('.kc-search').addEventListener('submit',event=>{event.preventDefault();findContent();});
  reader.addEventListener('close',()=>returnFocus?.focus());
  reader.addEventListener('click',event=>{if(event.target===reader){const r=reader.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)reader.close();}});
  root.addEventListener('click',event=>{
    const button=event.target.closest('button,a');if(!button)return;
    if(button.hasAttribute('data-close-reader'))reader.close();
    else if(button.dataset.guide)guide(button.dataset.guide);
    else if(button.dataset.concept!==undefined)concept(Number(button.dataset.concept));
    else if(button.dataset.route){reader.close();go(button.dataset.route);}
    else if(button.dataset.glossary){reader.close();if(typeof glossaryQuery!=='undefined')glossaryQuery=button.dataset.glossary;if(typeof glossaryCategory!=='undefined')glossaryCategory='Todos';go('glossary');if(typeof renderGlossary==='function')renderGlossary();}
    else if(button.dataset.popular!==undefined){const targets=[0,4,2,5,3];scrollToSection('knowledge-faq-'+targets[Number(button.dataset.popular)]);}
    else if(button.dataset.resultType){const id=button.dataset.resultId;switch(button.dataset.resultType){case 'glossary':glossaryQuery=methodGlossary[Number(id)].term;glossaryCategory='Todos';go('glossary');break;case 'guide':guide(id);break;case 'concept':concept(Number(id));break;case 'faq':scrollToSection('knowledge-faq-'+id);break;case 'legacy':legacy.open=true;legacy.querySelectorAll('.manual-section').forEach(s=>s.style.display='');scrollToSection(id);break;}}
    else if(button.hash?.startsWith('#knowledge-')){event.preventDefault();scrollToSection(button.hash.slice(1));}
  });
  // Existing chapter and in-manual links keep their identifiers and open the library when targeted.
  root.querySelectorAll('[data-manual-target]').forEach(button=>button.addEventListener('click',()=>{legacy.open=true;}));
  document.addEventListener('keydown',event=>{if(root.classList.contains('active')&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();search.focus();search.scrollIntoView({block:'center'});}});
}());



