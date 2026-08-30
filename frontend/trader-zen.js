(function(){
  const root=document.getElementById('traderZenRoot');
  if(!root)return;

  const practiceInfo={
    breathing:['Respiração consciente','Escolha um ritmo de 3 a 10 minutos para reduzir o ruído antes de operar.'],
    meditation:['Meditação guiada','Uma pausa breve para voltar ao presente e proteger sua qualidade de decisão.'],
    audio:['Áudios para relaxar','Sons da natureza para desacelerar, organizar a mente e recuperar presença.'],
    reflection:['Reflexões do Trader','Uma leitura curta para fortalecer disciplina, paciência e confiança no processo.'],
    forest:['Sons da Floresta','Uma trilha de floresta para criar um intervalo silencioso entre decisões.'],
    ocean:['Sons do Oceano','Ondas suaves para desacelerar e deixar o excesso de expectativa passar.'],
    rain:['Sons da Chuva','Chuva leve para uma pausa curta de recuperação mental.'],
    landscape:['Paisagens Tranquilas','Uma contemplação guiada para trocar urgência por perspectiva.'],
    affirmations:['Afirmações Positivas','Lembretes objetivos: processo primeiro, resultado como consequência.'],
    focus:['Foco e Concentração','Uma prática curta para voltar à única próxima ação que importa.'],
    gratitude:['Gratidão Diária','Feche o ciclo com presença, sem transformar o resultado em identidade.'],
    longterm:['Mentalidade de Longo Prazo','Reforce uma visão de longo prazo antes de olhar o próximo candle.']
  };

  function renderHome(){
    root.innerHTML=`<div class="zen-shell zen-home">
      <aside class="zen-side"><strong>Foco</strong><strong>Disciplina</strong><strong>Paciência</strong><strong>Resultados</strong></aside>
      <article class="zen-stage">
        <p class="zen-kicker">Mais que trading, um estilo de vida</p>
        <h1>TRADER <em>ZEN</em></h1>
        <h2>Respire. Observe. Confie no processo.</h2>
        <p class="zen-copy">Aqui é o seu momento de reconexão. Menos ruído, mais clareza. Grandes resultados nascem de uma mente em equilíbrio.</p>
        <button class="zen-action" type="button" onclick="openZenMoment()"><span class="zen-leaf">◒</span>INICIAR MOMENTO ZEN<span class="zen-arrow">›</span></button>
        <div class="zen-values"><div class="zen-value"><i>◒</i>Mais<span>Consciência</span></div><div class="zen-value"><i>♧</i>Mais<span>Disciplina</span></div><div class="zen-value"><i>▥</i>Mais<span>Resultados</span></div></div>
        <p class="zen-quote">“Um trader em paz, toma melhores decisões.”</p>
      </article>
      <aside class="zen-side right">Disciplina<br>hoje,<br>liberdade<br>sempre</aside>
    </div>`;
  }

  function renderMoment(selected){
    const info=selected&&practiceInfo[selected];
    const primary=[['breathing','◌','Exercícios de Respiração','Respire melhor, opere melhor.','3 - 10 MIN'],['meditation','♧','Meditações Guiadas','Mais presença, menos ansiedade.','5 - 20 MIN'],['audio','♫','Áudios para Relaxar','Sons da natureza, mente em calma.','DIVERSAS OPÇÕES'],['reflection','▤','Reflexões do Trader','Mensagens que fortalecem seu mindset.','LEITURA RÁPIDA']];
    const shortcuts=[['forest','☘','Sons da Floresta'],['ocean','≋','Sons do Oceano'],['rain','♨','Sons da Chuva'],['landscape','△','Paisagens Tranquilas'],['affirmations','☀','Afirmações Positivas'],['focus','◎','Foco e Concentração'],['gratitude','♡','Gratidão Diária'],['longterm','▥','Mentalidade de Longo Prazo']];
    root.innerHTML=`<div class="zen-moment-shell">
      <button class="zen-back" type="button" onclick="returnToZen()">← <span>Voltar</span></button>
      <aside class="zen-side zen-moment-side">Equilíbrio<br>hoje,<br>performance<br>sempre</aside>
      <header class="zen-moment-heading"><p class="zen-kicker">Paz interior, melhores decisões</p><h1>SEU MOMENTO <em>ZEN</em></h1><p>Escolha uma prática. Cuide da sua mente. Fortaleça o seu trader.</p></header>
      <section class="zen-practice-grid" aria-label="Práticas principais">${primary.map(([id,icon,title,description,meta])=>`<button class="zen-practice-card card-${id} ${selected===id?'selected':''}" type="button" onclick="selectZenPractice('${id}')"><span class="zen-practice-icon">${icon}</span><span class="zen-practice-arrow">›</span><strong>${title}</strong><small>${description}</small><em>${meta}</em></button>`).join('')}</section>
      <section class="zen-shortcut-grid" aria-label="Práticas rápidas">${shortcuts.map(([id,icon,title])=>`<button class="zen-shortcut ${selected===id?'selected':''}" type="button" onclick="selectZenPractice('${id}')"><i>${icon}</i><span>${title}</span></button>`).join('')}</section>
      <section class="zen-practice-detail ${info?'visible':''}" aria-live="polite">${info?`<div><small>PRÁTICA SELECIONADA</small><strong>${info[0]}</strong><p>${info[1]}</p></div><button type="button" onclick="beginZenPractice('${selected}')">Começar prática →</button>`:''}</section>
      <p class="zen-moment-quote">“Pequenas práticas diárias, grandes resultados ao longo da sua jornada.”</p>
    </div>`;
  }

  window.openZenMoment=function(){renderMoment()};
  window.returnToZen=function(){renderHome()};
  window.selectZenPractice=function(id){renderMoment(id)};
  window.beginZenPractice=function(id){const [title,description]=practiceInfo[id];if(typeof showToast==='function')showToast(`${title}: ${description}`)};
  renderHome();

  const originalGo=window.go;
  window.go=function(id){if(id==='zen')renderHome();return originalGo(id)};
})();
