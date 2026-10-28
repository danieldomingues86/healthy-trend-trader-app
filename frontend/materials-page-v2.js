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
      badge: '★ LIVRO OFICIAL DO MÉTODO',
      formatIco: '📗',
      rating: '5.0',
      reviews: 'Edição Oficial',
      isFeatured: true,
      isAvailable: true,
      tagline: 'SWING TRADE COM TENDÊNCIA',
      author: 'Daniel Gonçalves',
      shortDesc: 'Um guia completo e prático para encontrar, operar e capturar grandes movimentos no mercado, com mais disciplina, paciência e resultados consistentes.',
      commercialCopy: 'Aprenda a encontrar, operar e capturar grandes movimentos no mercado — com estratégia, disciplina e gestão de risco.',
      benefits: [
        'Encontre os Líderes: Seleção objetiva com Força Relativa (RS ≥ 80)',
        'Opere com o Ciclo: Direcionamento do capital nos regimes de alta',
        'Gatilhos Oficiais: Entradas de alta probabilidade (Inside Bar e 1-2-3 de Compra)',
        'Gestão de Risco: Position Sizing matemático e proteção de capital',
        'Venda na Força: Condução profissional para capturar múltiplos de risco'
      ],
      pillars: [
        { num: '01', titlePrefix: 'ENCONTRE ', titleHighlight: 'OS LÍDERES', title: 'Encontre os Líderes', desc: 'com Força Relativa (RS ≥ 80)' },
        { num: '02', titlePrefix: 'LEIA O CICLO ', titleHighlight: 'DE MERCADO', title: 'Ciclo de Mercado', desc: 'no seu favor' },
        { num: '03', titlePrefix: 'GATILHOS ', titleHighlight: 'OFICIAIS', title: 'Gatilhos Oficiais', desc: 'Inside Bar e 1-2-3 de Compra' },
        { num: '04', titlePrefix: 'GESTÃO ', titleHighlight: 'DE RISCO', title: 'Gestão de Risco', desc: 'profissional e matemática' },
        { num: '05', titlePrefix: 'VENDA ', titleHighlight: 'NA FORÇA', title: 'Venda na Força', desc: 'capture múltiplos de risco (R)' }
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
      badge: '★ LIVRO',
      formatIco: '📖',
      rating: '5.0',
      reviewCount: 120,
      reviews: 'Em breve',
      isAvailable: false,
      isMethodKey: true,
      tagline: 'O Guia Mestre de Oportunidades',
      shortDesc: 'Estratégia completa do método.',
      benefits: [
        'Identificação de oportunidades com Força Relativa',
        'Fórmula matemática de posicionamento (Position Sizing)',
        'Exemplos práticos e estudos de caso'
      ]
    },
    cycle: {
      badge: '★ GUIA',
      formatIco: '🧭',
      rating: '4.9',
      reviewCount: 86,
      reviews: 'Em breve',
      isAvailable: false,
      isMethodKey: true,
      tagline: 'O Termômetro dos 4 Regimes de Mercado',
      shortDesc: 'Mapeamento dos regimes de mercado.',
      benefits: [
        'Mapeamento objetivo dos 4 regimes do Ibovespa e S&P 500',
        'Blindagem do capital durante transições defensivas'
      ]
    },
    risk: {
      badge: '★ LIVRO',
      formatIco: '🛡️',
      rating: '5.0',
      reviewCount: 74,
      reviews: 'Em breve',
      isAvailable: false,
      isMethodKey: true,
      tagline: 'A Armadura Matemática do Capital',
      shortDesc: 'Position Sizing e controle do capital.',
      benefits: [
        'Cálculo exato de R-Multiple e risco assimétrico positivo',
        'Regras estritas de trailing stop e condução pela EMA 10'
      ]
    },
    earnings: {
      badge: '★ GUIA',
      formatIco: '📊',
      rating: '4.8',
      reviewCount: 62,
      reviews: 'Em breve',
      isAvailable: false,
      tagline: 'Operações Estratégicas em Balanços',
      shortDesc: 'Estratégias práticas para balanços.',
      benefits: [
        'Estratégias de antecipação e reação a resultados trimestrais',
        'Como evitar ser pego em gaps de baixa devastadores'
      ]
    },
    checklist: {
      badge: 'TEMPLATE',
      formatIco: '⚡',
      rating: '4.9',
      reviewCount: 45,
      reviews: 'Em breve',
      isAvailable: false,
      tagline: 'Checklist Executivo do Trader de Tendência',
      shortDesc: 'Rotina completa de execução.',
      benefits: [
        'Rotina sequencial pré-abertura, pregão e pós-fechamento',
        'Filtro anti-impulso para eliminar 90% dos erros operacionais'
      ]
    },
    zen: {
      badge: 'CURSO',
      formatIco: '🧘',
      rating: '5.0',
      reviewCount: 58,
      reviews: 'Em breve',
      isAvailable: false,
      tagline: 'Pausas Conscientes e Maestria Emocional',
      shortDesc: 'Disciplina e controle emocional.',
      benefits: [
        'Protocolo de descompressão neural pós-perda ou stop',
        'Como eliminar o FOMO e a tentação de overtrading'
      ]
    },
    audio: {
      badge: 'ÁUDIO',
      formatIco: '🎧',
      rating: '4.9',
      reviewCount: 39,
      reviews: 'Em breve',
      isAvailable: false,
      tagline: 'Condicionamento Neural Pré-Pregão',
      shortDesc: 'Condicionamento mental pré-pregão.',
      benefits: [
        'Frequências alfa e teta para estado de fluxo mental profundo',
        'Áudios de ativação de disciplina antes do pregão'
      ]
    },
    fundamentals: {
      badge: '★ GUIA',
      formatIco: '🌱',
      rating: '4.8',
      reviewCount: 33,
      reviews: 'Em breve',
      isAvailable: false,
      tagline: 'Filtros Fundamentalistas para Trend Following',
      shortDesc: 'Fundamentos para Trend Following.',
      benefits: [
        'Filtros objetivos de lucros consistentes, margens e ROE',
        'Alertas determinísticos de endividamento que salvam trades'
      ]
    }
  };

  // Garante a existência do livro Força Verde como item principal
  if (!healthyMaterials.some((m) => m.id === 'forca-verde')) {
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

    // 1. HERO CINEMATOGRÁFICO DO FORÇA VERDE (PRIMEIRA DOBRA OBRIGATÓRIA)
    const heroSpotlightMarkup = !materialsLibraryOnly ? `
      <section class="materials-hero-cinematic materials-hero-spotlight forca-verde-flagship" aria-label="Destaque Editorial — Livro Força Verde">
        <!-- Backdrop Panorâmico Oficial Limpo com Iluminação Cinematográfica (Ambientação Pura sem livro no fundo) -->
        <div class="hero-cinematic-bg" style="background-image: url('assets/forca-verde-ambient-backdrop.jpg');"></div>
        <div class="hero-cinematic-vignette"></div>

        <div class="hero-cinematic-body">
          <!-- Coluna Esquerda: Tipografia Monumental, Proposta de Valor e Ações -->
          <div class="hero-cinematic-left spotlight-content">
            <div class="spotlight-badge-row">
              <span class="spotlight-badge-gold">★ LIVRO OFICIAL DO MÉTODO</span>
              <span class="spotlight-rating">★★★★★ 5.0 <i>(Edição Oficial)</i></span>
            </div>

            <div class="flagship-title-group">
              <h1 class="flagship-title">
                <span class="title-forca">FORÇA</span>
                <span class="title-verde">VERDE</span>
              </h1>
              <p class="flagship-tagline">SWING TRADE COM TENDÊNCIA</p>
            </div>

            <p class="spotlight-subtitle flagship-commercial-copy">
              Um guia completo e prático para encontrar, operar e capturar grandes movimentos no mercado, com mais disciplina, paciência e resultados consistentes.
            </p>

            <!-- Linha de Ações (CTAs) -->
            <div class="spotlight-action-row flagship-action-row">
              <button type="button" class="btn-hero-primary spotlight-cta-btn ${isForcaVerdeOwned ? 'is-acquired' : ''}" data-material-action="forca-verde" title="${isForcaVerdeOwned ? 'Abrir leitura na Biblioteca' : 'Garantir exemplar oficial por R$ 97,00'}">
                <span class="btn-hero-icon">🛒</span>
                <span class="btn-hero-text">${isForcaVerdeOwned ? 'Acessar Obra na Biblioteca' : 'GARANTIR MEU EXEMPLAR'}</span>
                <span class="btn-hero-arrow">→</span>
              </button>

              <button type="button" class="btn-hero-secondary spotlight-detail-btn" data-material-detail="forca-verde">
                <span class="btn-hero-play-icon">▶</span>
                <span>${isFvExpanded ? 'Ocultar detalhes' : 'Conhecer o método'}</span>
              </button>
            </div>

            <div class="hero-microcopy">
              <span class="hero-microcopy-item"><span class="lock-icon">🔒</span> Acesso imediato</span>
              <span class="hero-microcopy-item"><span class="doc-icon">📄</span> PDF HD</span>
              <span class="hero-microcopy-item"><span class="device-icon">📱</span> Formato Kindle</span>
              <span class="hero-microcopy-item"><span class="book-icon">📖</span> Leitura na Biblioteca</span>
            </div>
          </div>

          <!-- Coluna Direita: Mockup 3D Oficial Grande do Livro (Transparência Pura sem Camadas Extras) -->
          <div class="hero-cinematic-right spotlight-book-stage flagship-stage" data-material-detail="forca-verde" title="Clique para explorar o sumário da obra">
            <div class="hero-book-wrap flagship-book-3d">
              <img src="assets/forca-verde-book-3d.png" alt="Capa Oficial 3D — Livro Força Verde por Daniel Gonçalves" class="hero-book-img spotlight-cover-img flagship-cover-img" />
            </div>
          </div>
        </div>

        <!-- 2. FAIXA DE BENEFÍCIOS E PILARES DO MÉTODO (5 PILARES OFICIAIS INTEGRADOS) -->
        <div class="hero-pillars-strip flagship-pillars-strip" aria-label="Os 5 Pilares do Método Força Verde">
          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">ENCONTRE <span class="highlight-green">OS LÍDERES</span></strong>
              <span class="pillar-sub">com Força Relativa (RS ≥ 80)</span>
            </div>
          </div>

          <div class="pillar-divider"></div>

          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">LEIA O CICLO <span class="highlight-green">DE MERCADO</span></strong>
              <span class="pillar-sub">no seu favor</span>
            </div>
          </div>

          <div class="pillar-divider"></div>

          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <rect x="4" y="6" width="3" height="12" rx="0.5"/>
                <line x1="5.5" y1="3" x2="5.5" y2="21" stroke="currentColor" stroke-width="1.5"/>
                <rect x="10.5" y="9" width="3" height="6" rx="0.5"/>
                <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="1.5"/>
                <rect x="17" y="5" width="3" height="14" rx="0.5"/>
                <line x1="18.5" y1="2" x2="18.5" y2="22" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">GATILHOS OFICIAIS</strong>
              <span class="pillar-sub">Inside Bar e 1-2-3 de Compra</span>
            </div>
          </div>

          <div class="pillar-divider"></div>

          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">GESTÃO DE RISCO</strong>
              <span class="pillar-sub">profissional e matemática</span>
            </div>
          </div>

          <div class="pillar-divider"></div>

          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">VENDA NA FORÇA</strong>
              <span class="pillar-sub">capture múltiplos de risco (R)</span>
            </div>
          </div>
        </div>
      </section>

      <!-- GAVETA EXPANSÍVEL DE DETALHES DO FORÇA VERDE -->
      ${isFvExpanded ? `
        <section class="flagship-details-drawer" id="forcaVerdeDetails" aria-label="Sumário da Obra Força Verde">
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

    // 3. RENDERIZADOR DE CARDS DE PRODUTOS DO CATÁLOGO (ESTILO PREMIUM ELEGANTE)
    const card = (item) => {
      const acquired = owned.includes(item.id);
      const isAvailable = item.available === true;
      const meta = materialDetails[item.id] || {
        badge: item.type,
        formatIco: '📖',
        rating: '5.0',
        reviewCount: 50,
        reviews: isAvailable ? 'Edição oficial' : 'Em breve',
        tagline: 'Material Prático da Metodologia',
        shortDesc: item.description,
        benefits: ['Aplicação imediata no dia a dia', 'Conhecimento fundamentado no método']
      };

      return `<article class="material-card store-product-card store-catalog-card material-card-${item.id} ${acquired ? 'is-acquired' : ''} ${!isAvailable ? 'is-coming-soon' : ''}" data-network="${item.id}">
        <!-- Estágio da Capa com Badge e Selo EM BREVE (se indisponível) -->
        <div class="card-cover-stage">
          <div class="card-cover-wrapper">
            <img src="${item.cover}" alt="Capa de ${item.title}" class="card-book-front card-cover-img" />
            <span class="material-type-pill card-category-badge">
              ${meta.badge || item.type}
            </span>
            ${!isAvailable ? `
              <div class="stamp-coming-soon pill-coming-soon" aria-label="Material em produção editorial — Em Breve">
                <span>EM BREVE</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Corpo do Card -->
        <div class="material-body card-body">
          <div class="material-card-header">
            <h3 class="material-card-title card-title">${item.title}</h3>
            <p class="material-card-tagline card-subtitle">${meta.shortDesc || item.description}</p>
          </div>

          <!-- Linha de Avaliação / Estrelas -->
          <div class="card-rating-row">
            ${isAvailable ? `
              <span class="rating-stars">★★★★★</span>
              <span class="rating-score">${meta.rating || '5.0'}</span>
              <span class="rating-count">(${meta.reviewCount || 100})</span>
            ` : `
              <span class="rating-stars rating-stars-dimmed">★★★★★</span>
              <span class="rating-label-cs">Material em produção editorial</span>
            `}
          </div>

          <!-- Rodapé com Ações -->
          <div class="card-actions-row">
            ${!isAvailable ? `
              <button type="button" class="btn-card-disabled" disabled aria-disabled="true" title="Material em produção editorial. Em breve disponível para compra.">
                <span>Em breve</span>
              </button>
            ` : `
              <button type="button" class="btn-card-detail" data-material-detail="${item.id}">
                Ver detalhes
              </button>
              <button type="button" class="btn-card-buy ${acquired ? 'access' : 'buy'}" data-material-action="${item.id}">
                ${acquired ? '<span>Acessar</span>' : '<span>Garantir</span>'}
              </button>
            `}
          </div>
        </div>
      </article>`;
    };

    // 4. SEÇÃO DESTAQUES DA METODOLOGIA (GRID COM 3 CARDS, SELO EM BREVE E FONTE ÚNICA DA VERDADE)
    const showFeatured = !materialsLibraryOnly && !query && (materialsFilter === 'Todos' || materialsFilter === 'Livros');
    const rubricItem = healthyMaterials.find((m) => m.id === 'rubric');
    const riskItem = healthyMaterials.find((m) => m.id === 'risk');
    const cycleItem = healthyMaterials.find((m) => m.id === 'cycle');

    const featuredSectionMarkup = showFeatured && rubricItem ? `
      <section class="store-featured-section" aria-label="Destaques da Metodologia">
        <div class="store-section-header featured-header-row">
          <div>
            <span class="section-kicker">— SELEÇÃO ESPECIAL</span>
            <h2 class="section-title">DESTAQUES DA METODOLOGIA</h2>
            <p class="section-desc">Materiais essenciais para transformar o trading em um sistema matemático e profissional.</p>
          </div>
          <button type="button" class="btn-view-all-materials" data-material-filter="Todos">
            Ver todos os materiais →
          </button>
        </div>

        <div class="featured-editorial-layout featured-tri-grid">
          <!-- Card de Destaque 1 (Trading Rubric - Em Breve conforme referência) -->
          <article class="featured-lead-card featured-highlight-card">
            <div class="highlight-card-stage lead-card-stage">
              <img src="${rubricItem.cover}" alt="Capa de ${rubricItem.title}" class="highlight-card-cover lead-card-cover" />
              <span class="highlight-badge">★ LIVRO</span>
              <div class="stamp-coming-soon pill-coming-soon" aria-label="Material em produção editorial — Em Breve">
                <span>EM BREVE</span>
              </div>
            </div>
            <div class="highlight-card-body lead-card-info">
              <h3 class="highlight-title lead-title">${rubricItem.title}</h3>
              <p class="highlight-desc lead-tagline">O guia completo do método Healthy Trend Trader. Estratégia, disciplina e prática para capturar grandes movimentos no mercado.</p>
            </div>
          </article>

          <!-- Destaques Secundários em Grid Duplo Integrado -->
          <div class="featured-dual-grid" style="display: contents;">
            ${cycleItem ? `
              <article class="featured-sub-card featured-highlight-card">
                <div class="highlight-card-stage sub-card-stage">
                  <img src="${cycleItem.cover}" alt="Capa de ${cycleItem.title}" class="highlight-card-cover sub-card-cover" />
                  <span class="highlight-badge sub-badge">★ GUIA</span>
                  <div class="stamp-coming-soon pill-coming-soon" aria-label="Material em produção editorial — Em Breve">
                    <span>EM BREVE</span>
                  </div>
                </div>
                <div class="highlight-card-body sub-card-body">
                  <h3 class="highlight-title sub-title">${cycleItem.title}</h3>
                  <p class="highlight-desc sub-desc">Mapeamento objetivo dos regimes de mercado do Ibovespa e S&P 500, para operar sempre a favor do cenário.</p>
                </div>
              </article>
            ` : ''}

            ${riskItem ? `
              <article class="featured-sub-card featured-highlight-card">
                <div class="highlight-card-stage sub-card-stage">
                  <img src="${riskItem.cover}" alt="Capa de ${riskItem.title}" class="highlight-card-cover sub-card-cover" />
                  <span class="highlight-badge sub-badge">★ APRESENTAÇÃO</span>
                  <div class="stamp-coming-soon pill-coming-soon" aria-label="Material em produção editorial — Em Breve">
                    <span>EM BREVE</span>
                  </div>
                </div>
                <div class="highlight-card-body sub-card-body">
                  <h3 class="highlight-title sub-title">${riskItem.title}</h3>
                  <p class="highlight-desc sub-desc">Cálculo exato de R-Múltiplo, sizing matemático e regras práticas de proteção do capital.</p>
                </div>
              </article>
            ` : ''}
          </div>
        </div>
      </section>
    ` : '';

    // 5. MEU ACERVO PESSOAL INTEGRADO
    const acquiredList = healthyMaterials.filter((item) => owned.includes(item.id));
    // Se o usuário já tiver obras adquiridas, renderiza as obras reais;
    // Se ainda não tiver nenhuma obra adquirida, exibe as 4 obras de demonstração do acervo (ou mensagem explicativa)
    const libraryItemsMarkup = acquiredList.length
      ? acquiredList.map((item) => `
          <div class="acervo-item-card">
            <div class="acervo-item-cover-wrap">
              <img src="${item.id === 'forca-verde' ? 'assets/forca-verde-book-3d.png' : item.cover}" alt="${item.title}" class="acervo-item-cover" />
            </div>
            <div class="acervo-item-info">
              <h4 class="acervo-item-title">${item.title}</h4>
              <span class="acervo-item-type">${item.type}</span>
              <button type="button" class="btn-acervo-open" data-material-action="${item.id}">Abrir</button>
            </div>
          </div>
        `).join('')
      : `
          <!-- Obras do Acervo (Acesso Vitalício) -->
          <div class="acervo-item-card">
            <div class="acervo-item-cover-wrap">
              <img src="assets/forca-verde-book-3d.png" alt="Força Verde" class="acervo-item-cover" />
            </div>
            <div class="acervo-item-info">
              <h4 class="acervo-item-title">Força Verde</h4>
              <span class="acervo-item-type">Ebook Oficial</span>
              <button type="button" class="btn-acervo-open" data-material-action="forca-verde">Abrir</button>
            </div>
          </div>

          <div class="acervo-item-card">
            <div class="acervo-item-cover-wrap">
              <img src="assets/materials-risk-cover-v1.png" alt="Gestão de Risco" class="acervo-item-cover" />
            </div>
            <div class="acervo-item-info">
              <h4 class="acervo-item-title">Gestão de Risco</h4>
              <span class="acervo-item-type">Guia Prático</span>
              <button type="button" class="btn-acervo-open" data-material-detail="risk">Abrir</button>
            </div>
          </div>

          <div class="acervo-item-card">
            <div class="acervo-item-cover-wrap">
              <img src="assets/materials-earnings-cover-v1.png" alt="Playbook de Earnings" class="acervo-item-cover" />
            </div>
            <div class="acervo-item-info">
              <h4 class="acervo-item-title">Playbook de Earnings</h4>
              <span class="acervo-item-type">Apresentação</span>
              <button type="button" class="btn-acervo-open" data-material-detail="earnings">Abrir</button>
            </div>
          </div>
        `;

    // MONTAGEM GERAL DA PÁGINA (ESTRUTURA EDITORIAL COMMERCIAL EM FLUXO COMPLETO)
    root.innerHTML = `<main class="materials-page materials-v2">
      <!-- 1. Hero Cinematográfico Força Verde -->
      ${heroSpotlightMarkup}

      <!-- 2. Barra de Navegação Comercial por Categorias e Ferramentas -->
      <section class="store-nav-strip">
        <nav class="materials-filters" aria-label="Filtro de Categorias">
          ${categories.map((category) => {
            const count = category === 'Todos'
              ? secondaryMaterials.length
              : secondaryMaterials.filter((i) => i.type === categoryMap[category]).length;
            const isActive = !materialsLibraryOnly && materialsFilter === category;
            return `
              <button type="button" class="${isActive ? 'active' : ''}" data-material-filter="${category}">
                <span>${category}</span>
                <small class="category-count">(${count})</small>
              </button>
            `;
          }).join('')}
        </nav>

        <div class="store-nav-tools">
          <label class="materials-search">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input id="materialsSearch" value="${safe(materialsQuery)}" placeholder="Buscar materiais...">
          </label>

          <select id="materialsSort" aria-label="Ordenar materiais">
            <option value="recent" ${materialsSort === 'recent' ? 'selected' : ''}>Mais recentes ⌵</option>
            <option value="price-asc" ${materialsSort === 'price-asc' ? 'selected' : ''}>Menor preço</option>
            <option value="price-desc" ${materialsSort === 'price-desc' ? 'selected' : ''}>Maior preço</option>
          </select>
        </div>
      </section>

      <!-- 3. Seção Destaques da Metodologia -->
      ${featuredSectionMarkup}

      <!-- 4. Catálogo Completo de Materiais (Grade de 4 Colunas) -->
      <section class="store-catalog-section" aria-label="Catálogo de Obras">
        <div class="store-section-header">
          <span class="section-kicker">TODOS OS MATERIAIS</span>
          <h2 class="section-title">Catálogo Completo de Materiais</h2>
          <p class="section-desc">Livros, guias, templates, apresentações, áudios e cursos para aprofundar seu conhecimento.</p>
        </div>

        <div class="materials-grid store-full-grid">
          ${visible.map(card).join('') || '<div class="materials-empty">Nenhum material encontrado nesta seleção.</div>'}
        </div>
      </section>

      <!-- 5. Seção Meu Acervo Pessoal & Suporte VIP (Integrada em Linha Dupla) -->
      ${!materialsLibraryOnly ? `
        <section class="store-bottom-split-section" aria-label="Acervo Pessoal e Suporte">
          <!-- Coluna Esquerda: Meu Acervo Pessoal -->
          <div class="store-my-library-section" id="myPersonalLibrarySection">
            <div class="acervo-header-row">
              <div class="acervo-title-group">
                <div class="acervo-icon-box">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                    <path d="M6 6h10M6 10h10"/>
                  </svg>
                </div>
                <div>
                  <h3 class="acervo-title">Meu Acervo Pessoal</h3>
                  <p class="acervo-desc">Seus materiais adquiridos com acesso vitalício na plataforma.</p>
                </div>
              </div>
              <button type="button" class="btn-store-library-shortcut btn-acervo-all" data-material-library="true">
                Ver todo o meu acervo →
              </button>
            </div>

            <div class="acervo-items-grid">
              ${libraryItemsMarkup}
            </div>
          </div>

          <!-- Coluna Direita: Suporte VIP de Conhecimento -->
          <div class="store-support-banner" aria-label="Suporte VIP de Conhecimento">
            <div class="support-header-group">
              <div class="support-icon-box">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
              </div>
              <h3 class="support-title">Suporte VIP de Conhecimento</h3>
              <p class="support-desc">Dúvidas sobre os materiais, acesso aos arquivos ou aplicação no software? Fale direto com nossa equipe.</p>
            </div>
            <button type="button" class="btn-support-whatsapp" data-material-support>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/>
              </svg>
              <span>Falar no WhatsApp →</span>
            </button>
          </div>
        </section>
      ` : ''}

      <!-- 6. Rodapé Editorial Premium -->
      <footer class="store-editorial-footer">
        <div class="footer-pillars-list">
          <div class="footer-pillar-item">
            <span class="footer-pillar-ico">📊</span>
            <div>
              <strong>MÉTODO</strong>
              <small>Regras claras e objetivas</small>
            </div>
          </div>
          <div class="footer-pillar-item">
            <span class="footer-pillar-ico">⚙</span>
            <div>
              <strong>PROCESSO</strong>
              <small>Disciplina na execução</small>
            </div>
          </div>
          <div class="footer-pillar-item">
            <span class="footer-pillar-ico">🛡</span>
            <div>
              <strong>DISCIPLINA</strong>
              <small>Gestão emocional</small>
            </div>
          </div>
          <div class="footer-pillar-item">
            <span class="footer-pillar-ico">🌿</span>
            <div>
              <strong>LIBERDADE</strong>
              <small>Mais tempo para o que importa</small>
            </div>
          </div>
        </div>

        <div class="footer-quote-wrap">
          <span class="footer-quote">“Um trader melhor a cada dia.”</span>
          <span class="footer-brand">— Healthy Trend Trader</span>
        </div>

        <!-- Botão Flutuante do WhatsApp Conforme Referência -->
        <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" class="store-whatsapp-float" aria-label="Falar no WhatsApp" title="Fale com nosso Suporte VIP">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </footer>
    </main>`;

    // Eventos e Interações
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
      if (materialsLibraryOnly) {
        document.querySelector('.store-catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }));

    root.querySelectorAll('[data-material-detail]').forEach((button) => (button.onclick = () => {
      const targetId = button.dataset.materialDetail;
      materialsDetail = materialsDetail === targetId ? null : targetId;
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
