(function () {
  const coverById = {
    rubric: 'assets/materials-rubric-cover-v1.png',
    cycle: 'assets/materials-market-cover-v1.png',
    risk: 'assets/materials-risk-cover-v1.png',
    earnings: 'assets/materials-earnings-cover-v1.png',
    checklist: 'assets/materials-checklist-cover-v1.png',
    zen: 'assets/materials-zen-cover-v1.png',
    audio: 'assets/materials-audio-cover-v1.png',
    fundamentals: 'assets/materials-fundamentals-cover-v1.png'
  };

  healthyMaterials.forEach((material) => {
    material.cover = coverById[material.id] || material.cover;
  });

  let ownedIds = [];
  async function loadEntitlements() {
    if (!window.healthyTrendApi?.isAuthenticated()) { ownedIds = []; renderMaterials(); return; }
    try {
      const response = await window.healthyTrendApi.request('/api/materials');
      ownedIds = (response.entitlements || []).map((item) => item.material_id);
    } catch (error) { console.warn('Não foi possível carregar a biblioteca.', error); ownedIds = []; }
    renderMaterials();
  }
  async function acquireMaterial(id) {
    if (!window.healthyTrendApi?.isAuthenticated()) { showToast('Entre no workspace para adquirir um material.'); return; }
    try {
      await window.healthyTrendApi.request('/api/materials/entitlements', { method: 'POST', body: JSON.stringify({ materialId: id }) });
      if (!ownedIds.includes(id)) ownedIds.push(id);
      showToast('Material adicionado à sua Biblioteca.');
      renderMaterials();
    } catch (error) { showToast(error.message || 'Não foi possível atualizar sua Biblioteca.'); }
  }

  const journey = [
    ['▥', 'Mercado', 'Entenda o ambiente'],
    ['◇', 'Qualidade', 'Avalie oportunidades'],
    ['♢', 'Risco', 'Proteja seu capital'],
    ['↗', 'Execução', 'Opere com disciplina'],
    ['▰', 'Performance', 'Construa resultados']
  ];
  let materialsSort = 'recent';

  renderMaterials = function () {
    const root = document.getElementById('materialsRoot');
    if (!root) return;

    const owned = ownedIds;
    const categories = ['Todos', 'Livros', 'Apresentações', 'Guias', 'Templates', 'Áudios', 'Cursos'];
    const categoryMap = { Livros: 'Livro', Apresentações: 'Apresentação', Guias: 'Guia', Templates: 'Template', Áudios: 'Áudio', Cursos: 'Curso' };
    const query = materialsQuery.toLocaleLowerCase('pt-BR');
    const visible = healthyMaterials.filter((item) => {
      const inView = materialsLibraryOnly ? owned.includes(item.id) : materialsFilter === 'Todos' || item.type === categoryMap[materialsFilter];
      return inView && (!query || Object.values(item).join(' ').toLocaleLowerCase('pt-BR').includes(query));
    }).sort((a, b) => materialsSort === 'price-asc' ? a.price - b.price : materialsSort === 'price-desc' ? b.price - a.price : 0);

    const card = (item) => {
      const acquired = owned.includes(item.id);
      const expanded = materialsDetail === item.id;
      return `<article class="material-card material-card-${item.id}" data-network="${item.id}">
        <div class="material-cover">
          <img src="${item.cover}" alt="Capa editorial de ${item.title}">
          <span class="material-type">${item.type}</span>
          <div class="material-cover-copy"><span>THE HEALTHY TREND TRADER</span><h3>${item.title}</h3><small>DISCIPLINA · PROCESSO · RESULTADOS</small></div>
        </div>
        <div class="material-body">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <div class="material-meta"><span>${item.type}</span><strong class="material-price">${acquired ? 'Adquirido' : moneyBR(item.price)}</strong></div>
          <div class="material-actions">
            <button type="button" data-material-detail="${item.id}">${expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</button>
            <button type="button" class="${acquired ? 'access' : 'buy'}" data-material-action="${item.id}">${acquired ? 'Acessar material' : '<span>🛒</span> Comprar'}</button>
          </div>
          ${expanded ? '<div class="material-detail">Produto digital vendido individualmente. A assinatura da plataforma não libera este conteúdo; após a compra, ele permanece na sua biblioteca.</div>' : ''}
        </div>
      </article>`;
    };

    const libraryProducts = healthyMaterials.filter((item) => owned.includes(item.id)).slice(0, 3);
    const library = libraryProducts.length
      ? libraryProducts.map((item) => `<div class="library-item"><img src="${item.cover}" alt=""><div><b>${item.title}</b><small>${item.type} · Adquirido</small></div><button type="button" data-material-action="${item.id}">Acessar</button></div>`).join('')
      : '<p class="library-empty">Seus materiais adquiridos aparecerão aqui.</p>';

    root.innerHTML = `<main class="materials-page materials-v2">
      <section class="materials-hero">
        <div class="materials-hero-copy">
          <div class="materials-eyebrow">Biblioteca premium</div>
          <h1>Healthy Trend<br>Trader Materials</h1>
          <p>Conteúdos, ferramentas e materiais que fazem parte do método Healthy Trend Trader. Leve o seu desenvolvimento mais longe.</p>
        </div>
        <blockquote>“Conhecimento<br>aplicado<br>transforma<br>resultados.”</blockquote>
        <div class="materials-journey" aria-label="Jornada do conhecimento">
          <svg viewBox="0 0 1000 84" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,68 C110,67 125,24 238,30 S350,70 438,45 S535,4 630,25 S752,73 842,52 S930,36 1000,50" />
            ${[160, 355, 540, 735, 920].map((x, index) => `<circle cx="${x}" cy="${[39, 53, 22, 57, 44][index]}" r="8"/><circle class="journey-core" cx="${x}" cy="${[39, 53, 22, 57, 44][index]}" r="3"/>`).join('')}
          </svg>
          <div class="materials-journey-stages">${journey.map(([icon, title, subtitle]) => `<div class="journey-stage"><i>${icon}</i><div><b>${title}</b><small>${subtitle}</small></div></div>`).join('')}</div>
        </div>
      </section>

      <section class="materials-toolbar">
        <nav class="materials-filters">${categories.map((category) => `<button type="button" class="${!materialsLibraryOnly && materialsFilter === category ? 'active' : ''}" data-material-filter="${category}">${category}</button>`).join('')}</nav>
        <div class="materials-tools"><label class="materials-search">⌕ <input id="materialsSearch" value="${safe(materialsQuery)}" placeholder="Buscar materiais..."></label><select id="materialsSort" aria-label="Ordenar materiais"><option value="recent" ${materialsSort === 'recent' ? 'selected' : ''}>Mais recentes</option><option value="price-asc" ${materialsSort === 'price-asc' ? 'selected' : ''}>Menor preço</option><option value="price-desc" ${materialsSort === 'price-desc' ? 'selected' : ''}>Maior preço</option></select></div>
      </section>

      <section class="materials-layout">
        <div class="materials-catalog">
          <header class="materials-heading"><h2>${materialsLibraryOnly ? 'Minha Biblioteca' : 'Explore os materiais'}</h2><p>${materialsLibraryOnly ? 'Produtos adquiridos e prontos para acessar.' : 'Ferramentas e conhecimentos práticos para aplicar o método no seu dia a dia.'}</p></header>
          <div class="materials-grid">${visible.map(card).join('') || '<div class="materials-empty">Nenhum material encontrado nesta seleção.</div>'}</div>
          <footer class="materials-method-footer">MÉTODO <i>·</i> PROCESSO <i>·</i> DISCIPLINA <i>·</i> LIBERDADE</footer>
        </div>

        <aside class="materials-library">
          <section class="materials-library-card">
            <header><h2><span>▤</span> Minha Biblioteca</h2><button type="button" data-material-library="${!materialsLibraryOnly}">${materialsLibraryOnly ? 'Explorar materiais' : 'Ver todos →'}</button></header>
            <small>Seus materiais adquiridos.</small>${library}
          </section>
          <section class="materials-promo">
            <div class="materials-promo-copy"><h2>Mais<br>conhecimento.<br>Mais resultados.</h2><p>Invista no que realmente importa: no seu desenvolvimento.</p><button type="button" data-material-library="false">Explorar materiais →</button></div>
            <div class="materials-book-spines"><span>Mercado</span><span>Disciplina</span><span>Gestão de risco</span><span>Execução</span><span>Liberdade</span></div>
          </section>
          <section class="materials-support"><div class="support-icon">?</div><div><b>Dúvidas?</b><p>Em caso de dúvidas sobre os materiais, acesso ou pagamento, acesse nosso suporte.</p><button type="button" data-material-support>Acessar suporte</button></div></section>
          <section class="materials-footer-art"><em>“Um trader melhor<br>a cada dia.”</em></section>
        </aside>
      </section>
    </main>`;

    root.querySelector('#materialsSearch').oninput = (event) => {
      materialsQuery = event.target.value;
      renderMaterials();
      document.getElementById('materialsSearch')?.focus();
    };
    root.querySelector('#materialsSort').onchange = (event) => {
      materialsSort = event.target.value;
      renderMaterials();
    };
    root.querySelectorAll('[data-material-filter]').forEach((button) => button.onclick = () => {
      materialsLibraryOnly = false;
      materialsFilter = button.dataset.materialFilter;
      renderMaterials();
    });
    root.querySelectorAll('[data-material-library]').forEach((button) => button.onclick = () => {
      materialsLibraryOnly = button.dataset.materialLibrary === 'true';
      renderMaterials();
    });
    root.querySelectorAll('[data-material-detail]').forEach((button) => button.onclick = () => {
      materialsDetail = materialsDetail === button.dataset.materialDetail ? null : button.dataset.materialDetail;
      renderMaterials();
    });
    root.querySelectorAll('[data-material-action]').forEach((button) => button.onclick = () => {
      const id = button.dataset.materialAction;
      owned.includes(id) ? accessMaterial(id) : acquireMaterial(id);
    });
    root.querySelector('[data-material-support]').onclick = () => showToast('O suporte está disponível pelo WhatsApp no canto inferior direito.');
    const crumb = document.getElementById('crumb');
    if (crumb) crumb.textContent = 'Healthy Trend Trader Materials';
    const navLabel = document.querySelector('.nav button[data-page="materials"]');
    if (navLabel && navLabel.lastChild) navLabel.lastChild.nodeValue = 'Healthy Trend Trader Materials';
  };

  window.addEventListener('healthyTrend:authenticated', loadEntitlements);
  renderMaterials();
})();
