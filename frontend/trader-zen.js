(function(){
  const root=document.getElementById('traderZenRoot');
  if(!root)return;

  const copy={
    initial:{title:'INICIAR MOMENTO ZEN',message:'Aqui é o seu momento de reconexão. Menos ruído, mais clareza. Grandes resultados nascem de uma mente em equilíbrio.'},
    active:{title:'ENCERRAR MOMENTO ZEN',message:'Inspire com calma. Observe sem reagir. Confie no processo antes de agir.'}
  };

  function render(active=false){
    const state=active?copy.active:copy.initial;
    root.innerHTML=`<div class="zen-shell">
      <aside class="zen-side"><strong>Foco</strong><strong>Disciplina</strong><strong>Paciência</strong><strong>Resultados</strong></aside>
      <article class="zen-stage">
        <p class="zen-kicker">Mais que trading, um estilo de vida</p>
        <h1>TRADER <em>ZEN</em></h1>
        <h2>Respire. Observe. Confie no processo.</h2>
        <p class="zen-copy">${state.message}</p>
        <button class="zen-action" type="button" aria-pressed="${active}" onclick="toggleZenMoment()"><span class="zen-leaf">◒</span>${state.title}<span class="zen-arrow">›</span></button>
        <p class="zen-guidance ${active?'is-visible':''}" aria-live="polite">${active?'Respiração guiada: inspire por 4, segure por 4, expire por 6.':''}</p>
        <div class="zen-breathing ${active?'active':''}">${active?'Respire<br>com calma':''}</div>
        <div class="zen-values"><div class="zen-value"><i>◒</i>Mais<span>Consciência</span></div><div class="zen-value"><i>♧</i>Mais<span>Disciplina</span></div><div class="zen-value"><i>▥</i>Mais<span>Resultados</span></div></div>
        <p class="zen-quote">“Um trader em paz, toma melhores decisões.”</p>
      </article>
      <aside class="zen-side right">Disciplina<br>hoje,<br>liberdade<br>sempre</aside>
    </div>`;
  }

  window.toggleZenMoment=function(){render(!root.querySelector('.zen-breathing.active'))};
  render();

  const originalGo=window.go;
  window.go=function(id){if(id==='zen')render(false);return originalGo(id)};
})();
