(function () {
  const coverById = {
    'forca-verde': 'assets/forca-verde-banner.jpg',
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
    'forca-verde': {
      badge: 'Livro-Carro-Chefe (PDF HD + Kindle)',
      formatIco: '📗',
      rating: '5.0',
      reviews: 'Edição Oficial do Método',
      isFeatured: true,
      isAvailable: true,
      tagline: 'Swing Trade com Tendência',
      author: 'Daniel Gonçalves',
      commercialCopy: 'Um guia completo e prático para encontrar, operar e capturar grandes movimentos no mercado, com mais disciplina, paciência e resultados consistentes.',
      benefits: [
        'Encontre os Líderes: Seleção objetiva com Força Relativa (RS ≥ 80)',
        'Opere com o Ciclo: Direcionamento do capital nos regimes de alta',
        'Gatilhos Oficiais: Entradas de alta probabilidade (Inside Bar e 1-2-3 de Compra)',
        'Gestão de Risco: Position Sizing matemático e proteção de capital',
        'Venda na Força: Condução profissional para capturar múltiplos de risco'
      ],
      pillars: [
        { num: '01', icon: '📊', title: 'Encontre os Líderes', desc: 'Com Força Relativa (RS ≥ 80)' },
        { num: '02', icon: '📈', title: 'Ciclo de Mercado', desc: 'Sempre a favor do regime positivo' },
        { num: '03', icon: '🕯️', title: 'Gatilhos Oficiais', desc: 'Inside Bar e 1-2-3 de Compra' },
        { num: '04', icon: '🛡️', title: 'Gestão de Risco', desc: 'Position Sizing matemático' },
        { num: '05', icon: '🎯', title: 'Venda na Força', desc: 'Capture múltiplos de risco (R)' }
      ],
      chapters: [
        { num: 'I', title: 'Filosofia e Mentalidade do Trend Following', desc: 'Por que seguir tendências é o jogo com maior expectativa matemática no longo prazo.' },
        { num: 'II', title: 'Encontrando os Verdadeiros Líderes com Força Relativa', desc: 'Como o cálculo de RS histórico filtra os 20% melhores ativos da B3 antes que o grande movimento aconteça.' },
        { num: 'III', title: 'O Ciclo de Mercado e a Permissão Estatística', desc: 'O Ibovespa como termômetro: médias móveis 10 e 72 e regimes que autorizam ou vetam novas compras.' },
        { num: 'IV', title: 'Gatilhos Oficiais de Entrada: Inside Bar e 1-2-3 de Compra', desc: 'Padrões gráficos objetivos de rompimento e retorno à média sem margem para subjetividade.' },
        { num: 'V', title: 'Position Sizing e a Matemática do Risco', desc: 'A regra das 3 restrições (stop risk, volatilidade ATR e teto de capital) para blindar seu patrimônio.' },
        { num: 'VI', title: 'Condução da Posição e a Arte de Vender na Força', desc: 'Realização parcial a 2R, trailing stop pela média móvel e a captura de grandes múltiplos assimétricos.' }
      ],
      specs: {
        pages: '248 páginas ilustradas com gráficos reais',
        format: 'Digital (PDF HD + formato Kindle / ePub)',
        author: 'Daniel Gonçalves',
        access: 'Acesso vitalício imediato na sua Biblioteca'
      }
    },
    rubric: {
      badge: 'Livro Digital (PDF HD + Kindle)',
      formatIco: '📖',
      rating: '5.0',
      reviews: 'Em breve',
      isAvailable: false,
      tagline: 'O Guia Mestre de Oportunidades',
      benefits: [
        'Identificação precisa e pontuação ponderada de setups A',
        'Fórmula matemática de dimensionamento de lote (Position Sizing)'
      ]
    },
    cycle: {
      badge: 'eBook & Framework',
      formatIco: '🧭',
      rating: '4.9',
      reviews: 'Em breve',
      isAvailable: false,
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
      reviews: 'Em breve',
      isAvailable: false,
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
      reviews: 'Em breve',
      isAvailable: false,
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
      reviews: 'Em breve',
      isAvailable: false,
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
      reviews: 'Em breve',
      isAvailable: false,
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
      reviews: 'Em breve',
      isAvailable: false,
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
      reviews: 'Em breve',
      isAvailable: false,
      tagline: 'Filtros Fundamentalistas para Trend Following',
      benefits: [
        'Filtros objetivos de lucros consistentes, margens e ROE',
        'Alertas determinísticos de endividamento que salvam trades'
      ]
    }
  };

  // Garante a existência do livro Força Verde como item principal
  if (!healthyMaterials.some(m => m.id === 'forca-verde')) {
    healthyMaterials.unshift({
      id: 'forca-verde',
      title: 'Força Verde: Swing Trade com Tendência',
      type: 'Livro',
      price: 97,
      cover: 'assets/forca-verde-banner.jpg',
      description: 'Um guia completo e prático para encontrar, operar e capturar grandes movimentos no mercado, com mais disciplina, paciência e resultados consistentes.',
      available: true,
      isFlagship: true
    });
  }

  // Normaliza capas e disponibilidades
  healthyMaterials.forEach((material) => {
    material.cover = coverById[material.id] || material.cover;
    if (material.id === 'forca-verde') {
      material.available = true;
      material.isFlagship = true;
    } else if (material.available === undefined) {
      // Por padrão, materiais secundários ainda não lançados ficam indisponíveis
      material.available = false;
    }
  });

  let ownedIds = [];
  async function loadEntitlements() {
    if (!window.healthyTrendApi?.isAuthenticated()) {
      ownedIds = purchasedMaterials();
      renderMaterials();
      return;
    }
    try {
      const response = await window.healthyTrendApi.request('/api/materials');
      const apiOwned = (response.entitlements || []).map((item) => item.material_id);
      const localOwned = purchasedMaterials();
      ownedIds = Array.from(new Set([...apiOwned, ...localOwned]));
    } catch (error) {
      console.warn('Não foi possível carregar a biblioteca do servidor.', error);
      ownedIds = purchasedMaterials();
    }
    renderMaterials();
  }

  async function acquireMaterial(id) {
    const item = healthyMaterials.find((m) => m.id === id);
    if (!item) return;

    if (!item.available) {
      if (typeof showToast === 'function') {
        showToast('Material em produção editorial. Em breve disponível na Loja Trader.', 'info');
      }
      return;
    }

    // Salva localmente
    const owned = purchasedMaterials();
    if (!owned.includes(id)) {
      owned.push(id);
      savePurchasedMaterials(owned);
    }
    if (!ownedIds.includes(id)) {
      ownedIds.push(id);
    }

    // Persiste no backend se autenticado
    if (window.healthyTrendApi?.isAuthenticated()) {
      try {
        await window.healthyTrendApi.request('/api/materials/entitlements', {
          method: 'POST',
          body: JSON.stringify({ materialId: id })
        });
      } catch (error) {
        console.warn('Persistência no servidor pendente:', error);
      }
    }

    if (typeof showToast === 'function') {
      showToast('Parabéns! O livro Força Verde foi adicionado ao seu Acervo Pessoal.');
    }
    renderMaterials();
  }

  let materialsSort = 'recent';

  renderMaterials = function () {
    const root = document.getElementById('materialsRoot');
    if (!root) return;

    const owned = ownedIds;
    const isForcaVerdeOwned = owned.includes('forca-verde');
    const categories = ['Todos', 'Livros', 'Apresentações', 'Guias', 'Templates', 'Áudios', 'Cursos'];
    const categoryMap = {
      Livros: 'Livro',
      Apresentações: 'Apresentação',
      Guias: 'Guia',
      Templates: 'Template',
      Áudios: 'Áudio',
      Cursos: 'Curso'
    };
    const query = materialsQuery.toLocaleLowerCase('pt-BR');

    // Catálogo secundário exclui o produto carro-chefe para evitar duplicação com o Hero
    const secondaryMaterials = healthyMaterials.filter((item) => !item.isFlagship && item.id !== 'forca-verde');

    const visible = (materialsLibraryOnly
      ? healthyMaterials.filter((item) => owned.includes(item.id))
      : secondaryMaterials.filter((item) => {
          const inCategory = materialsFilter === 'Todos' || item.type === categoryMap[materialsFilter];
          return inCategory && (!query || Object.values(item).join(' ').toLocaleLowerCase('pt-BR').includes(query));
        })
    ).sort((a, b) => {
      if (materialsSort === 'price-asc') return a.price - b.price;
      if (materialsSort === 'price-desc') return b.price - a.price;
      return 0;
    });

    const fvMeta = materialDetails['forca-verde'];
    const isFvExpanded = materialsDetail === 'forca-verde';

    // HERO PRINCIPAL — LIVRO-CARRO-CHEFE "FORÇA VERDE"
    const heroSpotlightMarkup = !materialsLibraryOnly ? `
      <section class="materials-hero-spotlight forca-verde-flagship" aria-label="Destaque Editorial — Livro Força Verde">
        <div class="spotlight-content">
          <div class="spotlight-badge-row">
            <span class="spotlight-badge-gold">★ LIVRO-CARRO-CHEFE DO MÉTODO</span>
            <span class="spotlight-badge-type">eBook Digital (PDF HD + Kindle)</span>
            <span class="spotlight-rating">★★★★★ 5.0 <i>(Edição Oficial)</i></span>
          </div>

          <div class="flagship-title-group">
            <span class="flagship-kicker">LIVRO OFICIAL DO MÉTODO</span>
            <h1 class="flagship-title">FORÇA VERDE</h1>
            <p class="flagship-tagline">Swing Trade com Tendência</p>
            <div class="flagship-author-badge">
              <span class="author-label">Autor da Metodologia:</span>
              <strong class="author-name">Daniel Gonçalves</strong>
              <span class="verified-seal">✓ Verificado</span>
            </div>
          </div>

          <p class="spotlight-subtitle flagship-commercial-copy">
            Um guia completo e prático para encontrar, operar e capturar grandes movimentos no mercado, com mais disciplina, paciência e resultados consistentes.
          </p>

          <!-- Os 5 Pilares Fundamentais do Método (como na arte de capa) -->
          <div class="flagship-pillars-strip" aria-label="Os 5 Pilares do Método Força Verde">
            ${fvMeta.pillars.map((p) => `
              <div class="pillar-card">
                <div class="pillar-header">
                  <span class="pillar-icon">${p.icon}</span>
                  <span class="pillar-num">${p.num}</span>
                </div>
                <b class="pillar-title">${p.title}</b>
                <small class="pillar-sub">${p.desc}</small>
              </div>
            `).join('')}
          </div>

          <!-- Linha de Ação Principal (CTA & Detalhes) -->
          <div class="spotlight-action-row flagship-action-row">
            <button type="button" class="spotlight-cta-btn ${isForcaVerdeOwned ? 'is-acquired' : ''}" data-material-action="forca-verde">
              <span>${isForcaVerdeOwned ? 'Acessar Obra na Biblioteca ↗' : 'Garantir meu Exemplar — R$ 97,00'}</span>
              ${isForcaVerdeOwned ? '' : '<span class="cta-cart-ico">🛒</span>'}
            </button>

            <button type="button" class="spotlight-detail-btn" data-material-detail="forca-verde">
              <span>${isFvExpanded ? 'Ocultar detalhes' : 'Conhecer os detalhes da obra →'}</span>
            </button>

            <span class="spotlight-guarantee">
              🔒 Pagamento seguro • Acesso vitalício imediato na Biblioteca • Leitura em PDF HD + formato Kindle / ePub
            </span>
          </div>
        </div>

        <!-- Coluna Visual 3D com a Arte de Referência -->
        <div class="spotlight-book-stage flagship-stage">
          <div class="spotlight-ambient-glow flagship-glow"></div>
          <div class="spotlight-3d-book flagship-book-3d">
            <div class="spotlight-spine flagship-spine"></div>
            <div class="spotlight-front-wrap flagship-front-wrap">
              <img src="assets/forca-verde-banner.jpg" alt="Capa Oficial 3D — Livro Força Verde por Daniel Gonçalves" class="spotlight-cover-img flagship-cover-img" />
              <div class="spotlight-foil-reflection"></div>
            </div>
            <div class="spotlight-pages-rim"></div>
            <div class="spotlight-shadow flagship-shadow"></div>
          </div>
          <div class="flagship-stage-badge">
            <span>Edição Oficial · 248 Páginas · Healthy Trend Trader</span>
          </div>
        </div>
      </section>

      <!-- Gaveta Expansível de Detalhes do Força Verde -->
      ${isFvExpanded ? `
        <section class="flagship-details-drawer" id="forcaVerdeDetails">
          <div class="drawer-header">
            <div class="drawer-header-left">
              <span class="drawer-kicker">SUMÁRIO E ESTRUTURA DA OBRA</span>
              <h2>Por dentro do livro Força Verde</h2>
              <p>O mapa completo para transformar o trading em um processo sistemático, matemático e emocionalmente blindado.</p>
            </div>
            <button type="button" class="btn-drawer-close" data-material-detail="forca-verde">✕ Fechar</button>
          </div>

          <div class="drawer-grid">
            <div class="drawer-chapters-col">
              <h3>Sumário dos 6 Capítulos Essenciais:</h3>
              <div class="chapters-list">
                ${fvMeta.chapters.map((ch) => `
                  <div class="chapter-item">
                    <span class="chapter-badge">Capítulo ${ch.num}</span>
                    <div class="chapter-body">
                      <b>${ch.title}</b>
                      <p>${ch.desc}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="drawer-specs-col">
              <div class="specs-card">
                <h3>Ficha Técnica da Obra</h3>
                <dl class="specs-list">
                  <div><dt>Título:</dt><dd>Força Verde — Swing Trade com Tendência</dd></div>
                  <div><dt>Autor:</dt><dd>Daniel Gonçalves</dd></div>
                  <div><dt>Metodologia:</dt><dd>Healthy Trend Trader</dd></div>
                  <div><dt>Formato:</dt><dd>Livro Digital (PDF HD + Kindle / ePub)</dd></div>
                  <div><dt>Extensão:</dt><dd>248 páginas com estudos reais B3</dd></div>
                  <div><dt>Acesso:</dt><dd>Vitalício imediato na sua Biblioteca</dd></div>
                  <div><dt>Investimento:</dt><dd class="specs-price">R$ 97,00</dd></div>
                </dl>
                <button type="button" class="btn-specs-buy ${isForcaVerdeOwned ? 'is-acquired' : ''}" data-material-action="forca-verde">
                  ${isForcaVerdeOwned ? 'Acessar Obra na Biblioteca ↗' : 'Garantir meu Exemplar — R$ 97,00 🛒'}
                </button>
              </div>
            </div>
          </div>
        </section>
      ` : ''}
    ` : '';

    // CARD DOS MATERIAIS SECUNDÁRIOS
    const card = (item) => {
      const acquired = owned.includes(item.id);
      const isAvailable = item.available === true;
      const expanded = materialsDetail === item.id;
      const meta = materialDetails[item.id] || {
        badge: item.type,
        formatIco: '📖',
        rating: '5.0',
        reviews: isAvailable ? 'Edição oficial' : 'Em breve',
        tagline: 'Material Prático da Metodologia',
        benefits: ['Aplicação imediata no dia a dia', 'Conhecimento fundamentado no método']
      };

      return `<article class="material-card material-card-${item.id} ${acquired ? 'is-acquired' : ''} ${!isAvailable ? 'is-coming-soon' : ''}" data-network="${item.id}">
        <div class="material-book-stage">
          <div class="material-3d-book">
            <div class="card-book-spine"></div>
            <div class="card-book-cover-wrap">
              <img src="${item.cover}" alt="Capa de ${item.title}" class="card-book-front" style="${item.id === 'forca-verde' ? 'object-position: 78% 50%;' : ''}" />
              <span class="material-type-pill ${!isAvailable ? 'pill-coming-soon' : ''}">
                ${!isAvailable ? '⏳ EM BREVE' : `${meta.formatIco} ${meta.badge}`}
              </span>
              <div class="card-foil-sheen"></div>
            </div>
            <div class="card-book-pages"></div>
            <div class="card-book-shadow"></div>
          </div>
          ${!isAvailable ? '<div class="card-coming-soon-ribbon"><span>EM PRODUÇÃO</span></div>' : ''}
        </div>
        <div class="material-body">
          <div class="material-card-header">
            <div class="material-rating-row">
              <span class="rating-stars">★★★★★</span>
              <small class="rating-score">${meta.rating || '5.0'}</small>
              <small class="rating-label">${!isAvailable ? 'Em Breve' : (meta.reviews || 'Edição oficial')}</small>
            </div>
            <h3 class="material-card-title">${item.title}</h3>
            <p class="material-card-tagline">${meta.tagline}</p>
          </div>
          <ul class="material-card-benefits">
            ${meta.benefits.map((b) => `<li><span class="card-check">${!isAvailable ? '•' : '✓'}</span> <span>${b}</span></li>`).join('')}
          </ul>
          <div class="material-card-footer">
            <div class="material-pricing">
              <span class="price-label">${acquired ? 'Status da Obra' : (!isAvailable ? 'Disponibilidade' : 'Investimento Único')}</span>
              <strong class="material-price ${!isAvailable ? 'material-price-coming-soon' : ''}">
                ${acquired ? '✓ Na sua Biblioteca' : (!isAvailable ? 'Indisponível no momento' : moneyBR(item.price))}
              </strong>
            </div>
            <div class="material-actions">
              <button type="button" class="btn-card-detail" data-material-detail="${item.id}">
                ${expanded ? 'Ocultar' : 'Ver detalhes'}
              </button>
              ${!isAvailable ? `
                <button type="button" class="btn-card-disabled" disabled aria-disabled="true" title="Material em produção editorial. Em breve disponível para compra.">
                  <span>Em Breve</span>
                </button>
              ` : `
                <button type="button" class="btn-card-buy ${acquired ? 'access' : 'buy'}" data-material-action="${item.id}">
                  ${acquired ? '<span>Acessar</span> ↗' : '<span>Comprar</span> 🛒'}
                </button>
              `}
            </div>
          </div>
          ${expanded ? `<div class="material-detail">
            <p>${item.description}</p>
            ${!isAvailable ? `
              <div class="material-coming-soon-banner">
                <div class="cs-icon">⏳</div>
                <div class="cs-text">
                  <b>Material em produção editorial</b>
                  <p>Este material ainda não está disponível para aquisição ou acesso imediato. O lançamento oficial será comunicado aos membros da plataforma.</p>
                </div>
              </div>
            ` : ''}
            <div class="detail-benefits-full">
              <b>O que você vai dominar:</b>
              <ul>${meta.benefits.map((b) => `<li>✓ ${b}</li>`).join('')}</ul>
            </div>
            <small>${isAvailable ? 'Produto digital com acesso imediato e vitalício à sua Biblioteca.' : 'Produto digital em fase final de diagramação e revisão técnica.'}</small>
          </div>` : ''}
        </div>
      </article>`;
    };

    const libraryProducts = healthyMaterials.filter((item) => owned.includes(item.id));
    const library = libraryProducts.length
      ? libraryProducts.map((item) => `
          <div class="library-item">
            <div class="library-item-thumb">
              <img src="${item.cover}" alt="${item.title}" style="${item.id === 'forca-verde' ? 'object-position: 78% 50%;' : ''}">
            </div>
            <div>
              <b>${item.title}</b>
              <small>${item.type} · Acesso vitalício</small>
            </div>
            <button type="button" data-material-action="${item.id}">Abrir ↗</button>
          </div>
        `).join('')
      : '<p class="library-empty">Nenhum material adquirido ainda. Garanta seu exemplar de <b>Força Verde</b> no topo para iniciar seu acervo pessoal.</p>';

    root.innerHTML = `<main class="materials-page materials-v2">
      ${heroSpotlightMarkup}

      <section class="materials-toolbar">
        <nav class="materials-filters">
          ${categories.map((category) => `
            <button type="button" class="${!materialsLibraryOnly && materialsFilter === category ? 'active' : ''}" data-material-filter="${category}">
              ${category}
            </button>
          `).join('')}
        </nav>
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
            <h2>${materialsLibraryOnly ? 'Meu Acervo de Obras' : 'Catálogo de Materiais & Estudos Futuros'}</h2>
            <p>${materialsLibraryOnly ? 'Materiais adquiridos prontos para consulta imediata.' : 'Literatura técnica, frameworks operacionais e guias práticos em produção editorial.'}</p>
          </header>
          <div class="materials-grid">
            ${visible.map(card).join('') || '<div class="materials-empty">Nenhum material encontrado nesta seleção.</div>'}
          </div>
          <footer class="materials-method-footer">MÉTODO <i>·</i> PROCESSO <i>·</i> DISCIPLINA <i>·</i> LIBERDADE</footer>
        </div>

        <aside class="materials-library">
          <section class="materials-library-card">
            <header>
              <h2><span>🏛</span> Meu Acervo Pessoal</h2>
              <button type="button" data-material-library="${!materialsLibraryOnly}">
                ${materialsLibraryOnly ? 'Ver Catálogo Completo' : 'Filtrar Adquiridos (' + owned.length + ')'}
              </button>
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
              <span>Força</span>
              <span>Rubric</span>
              <span>Ciclo</span>
              <span>Risco</span>
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
    root.querySelectorAll('[data-material-filter]').forEach((button) => (button.onclick = () => {
      materialsLibraryOnly = false;
      materialsFilter = button.dataset.materialFilter;
      renderMaterials();
    }));
    root.querySelectorAll('[data-material-library]').forEach((button) => (button.onclick = () => {
      materialsLibraryOnly = button.dataset.materialLibrary === 'true';
      renderMaterials();
    }));
    root.querySelectorAll('[data-material-detail]').forEach((button) => (button.onclick = () => {
      materialsDetail = materialsDetail === button.dataset.materialDetail ? null : button.dataset.materialDetail;
      renderMaterials();
      if (materialsDetail === 'forca-verde') {
        document.getElementById('forcaVerdeDetails')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }));
    root.querySelectorAll('[data-material-action]').forEach((button) => (button.onclick = () => {
      const id = button.dataset.materialAction;
      if (owned.includes(id)) {
        accessMaterial(id);
      } else {
        acquireMaterial(id);
      }
    }));
    root.querySelector('[data-material-support]').onclick = () =>
      showToast('O suporte está disponível pelo WhatsApp no canto inferior direito.');

    const crumb = document.getElementById('crumb');
    if (crumb) crumb.textContent = window.appLanguage === 'en-US' ? 'Trader Store' : 'Loja do Trader';
    const navBtn = document.querySelector('.nav button[data-page="materials"]');
    if (navBtn) {
      const labelText = window.appLanguage === 'en-US' ? 'Trader Store' : 'Loja do Trader';
      const labelSpan = navBtn.querySelector('.sidebar-btn-label');
      if (labelSpan) {
        labelSpan.textContent = labelText;
        navBtn.setAttribute('data-label', labelText);
        Array.from(navBtn.childNodes).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) node.remove();
        });
      } else {
        const textNode = Array.from(navBtn.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim());
        if (textNode) {
          textNode.nodeValue = labelText;
        } else if (navBtn.lastChild && navBtn.lastChild.nodeType === Node.TEXT_NODE) {
          navBtn.lastChild.nodeValue = labelText;
        }
      }
    }
  };

  window.addEventListener('healthyTrend:authenticated', loadEntitlements);
  renderMaterials();
})();
