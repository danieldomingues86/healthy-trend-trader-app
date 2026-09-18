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

  const materialDetails = {
    rubric: {
      badge: 'Livro Digital (PDF HD + Kindle)',
      formatIco: '📖',
      rating: '5.0',
      reviews: 'Mais vendido da metodologia',
      isFeatured: true,
      tagline: 'O Guia Mestre de Oportunidades',
      benefits: [
        'Identificação precisa e pontuação ponderada de setups A+',
        'Fórmula matemática de dimensionamento de lote (Position Sizing)'
      ]
    },
    cycle: {
      badge: 'eBook & Framework',
      formatIco: '🧭',
      rating: '4.9',
      reviews: 'Essencial para o mercado atual',
      tagline: 'O Termômetro dos 4 Regimes de Mercado',
      benefits: [
        'Mapeamento objetivo dos 4 regimes do Ibovespa e S&P 500',
        'Blindagem do capital durante transições defensivas'
      ]
    },
    risk: {
      badge: 'Guia de Bolso',
      formatIco: '🛡️',
      rating: '5.0',
      reviews: 'Mais elogiado por traders',
      tagline: 'A Armadura Matemática do Capital',
      benefits: [
        'Cálculo exato de R-Multiple e risco assimétrico positivo',
        'Regras estritas de trailing stop e condução segura'
      ]
    },
    earnings: {
      badge: 'Playbook Operacional',
      formatIco: '📊',
      rating: '4.8',
      reviews: 'Estudos de caso reais da B3',
      tagline: 'Operações Estratégicas em Balanços',
      benefits: [
        'Estratégias de antecipação e reação a resultados trimestrais',
        'Como evitar ser pego em gaps de baixa devastadores'
      ]
    },
    checklist: {
      badge: 'Template Editável',
      formatIco: '⚡',
      rating: '4.9',
      reviews: 'Pronto para uso diário',
      tagline: 'Checklist Executivo do Trader de Tendência',
      benefits: [
        'Rotina sequencial pré-abertura, pregão e pós-fechamento',
        'Filtro anti-impulso para eliminar 90% dos erros operacionais'
      ]
    },
    zen: {
      badge: 'Manual de Mentalidade',
      formatIco: '🧘',
      rating: '5.0',
      reviews: 'Psicologia e autocontrole',
      tagline: 'Pausas Conscientes e Maestria Emocional',
      benefits: [
        'Protocolo de descompressão neural pós-perda ou stop',
        'Como eliminar o FOMO e a tentação de overtrading'
      ]
    },
    audio: {
      badge: 'Áudio Binaural HD (320kbps)',
      formatIco: '🎧',
      rating: '4.9',
      reviews: 'Imersão de alta frequência',
      tagline: 'Condicionamento Neural Pré-Pregão',
      benefits: [
        'Frequências alfa e teta para estado de fluxo mental profundo',
        'Áudios de ativação de disciplina antes do pregão'
      ]
    },
    fundamentals: {
      badge: 'Guia Prático',
      formatIco: '🌱',
      rating: '4.8',
      reviews: 'Análise de qualidade de balanço',
      tagline: 'Filtros Fundamentalistas para Trend Following',
      benefits: [
        'Filtros objetivos de lucros consistentes, margens e ROE',
        'Alertas determinísticos de endividamento que salvam trades'
      ]
    }
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

    const isRubricOwned = owned.includes('rubric');

    // Hero Spotlight Markup (renders when not in library-only mode)
    const heroSpotlightMarkup = !materialsLibraryOnly ? `
      <section class="materials-hero-spotlight">
        <div class="spotlight-content">
          <div class="spotlight-badge-row">
            <span class="spotlight-badge-gold">★ Destaque Editorial da Metodologia</span>
            <span class="spotlight-rating">★ 5.0 <i>(Mais vendido)</i></span>
          </div>
          <h1 class="spotlight-title">Trading Rubric: O Guia Mestre de Oportunidades</h1>
          <p class="spotlight-subtitle">O manual definitivo para classificar a qualidade de cada ativo, eliminar o achismo e só arriscar capital quando os 6 pilares matemáticos estiverem totalmente alinhados.</p>
          <ul class="spotlight-benefits">
            <li><span class="benefit-check">✓</span> <span><b>Identificação precisa de setups A+:</b> método objetivo para filtrar ruído do mercado.</span></li>
            <li><span class="benefit-check">✓</span> <span><b>Fórmula de Position Sizing:</b> defina exatamente o tamanho do lote antes da ordem.</span></li>
            <li><span class="benefit-check">✓</span> <span><b>Acesso Imediato:</b> formato PDF de alta resolução + compatível com Kindle / ePub.</span></li>
          </ul>
          <div class="spotlight-action-row">
            <button type="button" class="spotlight-cta-btn ${isRubricOwned ? 'is-acquired' : ''}" data-material-action="rubric">
              <span>${isRubricOwned ? 'Acessar na Biblioteca ↗' : 'Adquirir Obra — R$ 97,00'}</span>
              ${isRubricOwned ? '' : '<span class="cta-cart-ico">🛒</span>'}
            </button>
            <button type="button" class="spotlight-detail-btn" data-material-detail="rubric">
              <span>${materialsDetail === 'rubric' ? 'Ocultar detalhes' : 'Espiar por dentro →'}</span>
            </button>
            <span class="spotlight-guarantee">🔒 Pagamento seguro • Acesso vitalício imediato</span>
          </div>
        </div>
        <div class="spotlight-book-stage">
          <div class="spotlight-ambient-glow"></div>
          <div class="spotlight-3d-book">
            <div class="spotlight-spine"></div>
            <div class="spotlight-front-wrap">
              <img src="assets/materials-rubric-cover-v1.png" alt="Capa Trading Rubric 3D" class="spotlight-cover-img" />
              <div class="spotlight-foil-reflection"></div>
            </div>
            <div class="spotlight-pages-rim"></div>
            <div class="spotlight-shadow"></div>
          </div>
        </div>
      </section>
    ` : '';

    const card = (item) => {
      const acquired = owned.includes(item.id);
      const expanded = materialsDetail === item.id;
      const meta = materialDetails[item.id] || {
        badge: item.type,
        formatIco: '📖',
        rating: '5.0',
        reviews: 'Edição oficial',
        tagline: 'Material Prático da Metodologia',
        benefits: ['Aplicação imediata no dia a dia', 'Conhecimento fundamentado no método']
      };

      return `<article class="material-card material-card-${item.id} ${acquired ? 'is-acquired' : ''}" data-network="${item.id}">
        <div class="material-book-stage">
          <div class="material-3d-book">
            <div class="card-book-spine"></div>
            <div class="card-book-cover-wrap">
              <img src="${item.cover}" alt="Capa editorial de ${item.title}" class="card-book-front" />
              <span class="material-type-pill">${meta.formatIco} ${meta.badge}</span>
              <div class="card-foil-sheen"></div>
            </div>
            <div class="card-book-pages"></div>
            <div class="card-book-shadow"></div>
          </div>
        </div>
        <div class="material-body">
          <div class="material-card-header">
            <div class="material-rating-row">
              <span class="rating-stars">★★★★★</span>
              <small class="rating-score">${meta.rating}</small>
              <small class="rating-label">${meta.reviews}</small>
            </div>
            <h3 class="material-card-title">${item.title}</h3>
            <p class="material-card-tagline">${meta.tagline}</p>
          </div>
          <ul class="material-card-benefits">
            ${meta.benefits.map((b) => `<li><span class="card-check">✓</span> <span>${b}</span></li>`).join('')}
          </ul>
          <div class="material-card-footer">
            <div class="material-pricing">
              <span class="price-label">${acquired ? 'Status da Obra' : 'Investimento Único'}</span>
              <strong class="material-price">${acquired ? '✓ Na sua Biblioteca' : moneyBR(item.price)}</strong>
            </div>
            <div class="material-actions">
              <button type="button" class="btn-card-detail" data-material-detail="${item.id}">${expanded ? 'Ocultar' : 'Ver detalhes'}</button>
              <button type="button" class="btn-card-buy ${acquired ? 'access' : 'buy'}" data-material-action="${item.id}">
                ${acquired ? '<span>Acessar</span> ↗' : '<span>Comprar</span> 🛒'}
              </button>
            </div>
          </div>
          ${expanded ? `<div class="material-detail">
            <p>${item.description}</p>
            <div class="detail-benefits-full">
              <b>O que você vai dominar:</b>
              <ul>${meta.benefits.map((b) => `<li>✓ ${b}</li>`).join('')}</ul>
            </div>
            <small>Produto digital com acesso imediato e vitalício à sua Biblioteca.</small>
          </div>` : ''}
        </div>
      </article>`;
    };

    const libraryProducts = healthyMaterials.filter((item) => owned.includes(item.id));
    const library = libraryProducts.length
      ? libraryProducts.map((item) => `<div class="library-item"><div class="library-item-thumb"><img src="${item.cover}" alt="${item.title}"></div><div><b>${item.title}</b><small>${item.type} · Acesso vitalício</small></div><button type="button" data-material-action="${item.id}">Abrir ↗</button></div>`).join('')
      : '<p class="library-empty">Nenhum material adquirido ainda. Explore as obras ao lado para montar seu acervo de estudos.</p>';

    root.innerHTML = `<main class="materials-page materials-v2">
      ${heroSpotlightMarkup}

      <section class="materials-toolbar">
        <nav class="materials-filters">${categories.map((category) => `<button type="button" class="${!materialsLibraryOnly && materialsFilter === category ? 'active' : ''}" data-material-filter="${category}">${category}</button>`).join('')}</nav>
        <div class="materials-tools">
          <label class="materials-search">⌕ <input id="materialsSearch" value="${safe(materialsQuery)}" placeholder="Buscar materiais..."></label>
          <select id="materialsSort" aria-label="Ordenar materiais">
            <option value="recent" ${materialsSort === 'recent' ? 'selected' : ''}>Mais recentes</option>
            <option value="price-asc" ${materialsSort === 'price-asc' ? 'selected' : ''}>Menor preço</option>
            <option value="price-desc" ${materialsSort === 'price-desc' ? 'selected' : ''}>Maior preço</option>
          </select>
        </div>
      </section>

      <section class="materials-layout">
        <div class="materials-catalog">
          <header class="materials-heading">
            <h2>${materialsLibraryOnly ? 'Meu Acervo de Obras' : 'Catálogo de Obras & Ferramentas'}</h2>
            <p>${materialsLibraryOnly ? 'Materiais adquiridos prontos para consulta imediata.' : 'Literatura técnica, frameworks operacionais e guias práticos do método Healthy Trend Trader.'}</p>
          </header>
          <div class="materials-grid">${visible.map(card).join('') || '<div class="materials-empty">Nenhum material encontrado nesta seleção.</div>'}</div>
          <footer class="materials-method-footer">MÉTODO <i>·</i> PROCESSO <i>·</i> DISCIPLINA <i>·</i> LIBERDADE</footer>
        </div>

        <aside class="materials-library">
          <section class="materials-library-card">
            <header>
              <h2><span>🏛</span> Meu Acervo Pessoal</h2>
              <button type="button" data-material-library="${!materialsLibraryOnly}">${materialsLibraryOnly ? 'Ver Catálogo Completo' : 'Filtrar Adquiridos (' + owned.length + ')'}</button>
            </header>
            <small>Sua estante de materiais do método.</small>
            <div class="library-items-list">${library}</div>
          </section>

          <section class="materials-promo">
            <div class="materials-promo-copy">
              <span class="promo-kicker">INVESTIMENTO EM VOCÊ</span>
              <h2>Mais conhecimento.<br>Mais consistência.</h2>
              <p>O melhor retorno sobre investimento no mercado financeiro começa pelo domínio profundo do seu método.</p>
              <button type="button" data-material-library="false">Explorar catálogo →</button>
            </div>
            <div class="materials-book-spines">
              <span>Rubric</span>
              <span>Ciclo</span>
              <span>Risco</span>
              <span>Zen</span>
            </div>
          </section>

          <section class="materials-support">
            <div class="support-icon">💬</div>
            <div>
              <b>Suporte VIP de Conhecimento</b>
              <p>Dúvidas sobre os materiais, acesso aos arquivos ou aplicação no software? Fale direto com nossa equipe.</p>
              <button type="button" data-material-support>Acessar suporte via WhatsApp</button>
            </div>
          </section>

          <section class="materials-footer-art">
            <em>“Um trader melhor<br>a cada dia.”</em>
          </section>
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
    if (crumb) crumb.textContent = window.appLanguage === 'en-US' ? 'Trader Store' : 'Loja do Trader';
    const navLabel = document.querySelector('.nav button[data-page="materials"]');
    if (navLabel && navLabel.lastChild) navLabel.lastChild.nodeValue = window.appLanguage === 'en-US' ? 'Trader Store' : 'Loja do Trader';
  };

  window.addEventListener('healthyTrend:authenticated', loadEntitlements);
  renderMaterials();
})();
