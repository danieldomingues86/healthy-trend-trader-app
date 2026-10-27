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
      commercialCopy: 'Aprenda a encontrar, operar e capturar grandes movimentos no mercado — com estratégia, disciplina e gestão de risco.',
      benefits: [
        'Encontre os Líderes: Seleção objetiva com Força Relativa (RS ≥ 80)',
        'Opere com o Ciclo: Direcionamento do capital nos regimes de alta',
        'Gatilhos Oficiais: Entradas de alta probabilidade (Inside Bar e 1-2-3 de Compra)',
        'Gestão de Risco: Position Sizing matemático e proteção de capital',
        'Venda na Força: Condução profissional para capturar múltiplos de risco'
      ],
      pillars: [
        { num: '01', titlePrefix: 'ENCONTRE ', titleHighlight: 'OS LÍDERES', title: 'Encontre os Líderes', desc: 'Com Força Relativa (RS ≥ 80)' },
        { num: '02', titlePrefix: 'LEIA O CICLO ', titleHighlight: 'DE MERCADO', title: 'Ciclo de Mercado', desc: 'Sempre a favor do regime positivo' },
        { num: '03', titlePrefix: 'GATILHOS ', titleHighlight: 'OFICIAIS', title: 'Gatilhos Oficiais', desc: 'Inside Bar e 1-2-3 de Compra' },
        { num: '04', titlePrefix: 'GESTÃO ', titleHighlight: 'DE RISCO', title: 'Gestão de Risco', desc: 'Posicionamento matemático e profissional' },
        { num: '05', titlePrefix: 'VENDA ', titleHighlight: 'NA FORÇA', title: 'Venda na Força', desc: 'Capture múltiplos de risco (R)' }
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
      isMethodKey: true,
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
      isMethodKey: true,
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
      isMethodKey: true,
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
  if (!healthyMaterials.some((m) => m.id === 'forca-verde')) {
    healthyMaterials.unshift({
      id: 'forca-verde',
      title: 'Força Verde: Swing Trade com Tendência',
      type: 'Livro',
      price: 97,
      cover: 'assets/forca-verde-banner.jpg',
      description: 'Aprenda a encontrar, operar e capturar grandes movimentos no mercado — com estratégia, disciplina e gestão de risco.',
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
        <!-- Backdrop Panorâmico Oficial Limpo -->
        <div class="hero-cinematic-bg" style="background-image: url('assets/forca-verde-hero-pure-art.png');"></div>
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
              Aprenda a encontrar, operar e capturar <span class="highlight-green">grandes movimentos</span> no mercado — com estratégia, disciplina e gestão de risco.
            </p>

            <!-- Linha de Ações (CTAs) -->
            <div class="spotlight-action-row flagship-action-row">
              <button type="button" class="btn-hero-primary spotlight-cta-btn ${isForcaVerdeOwned ? 'is-acquired' : ''}" data-material-action="forca-verde" title="${isForcaVerdeOwned ? 'Abrir leitura na Biblioteca' : 'Garantir exemplar oficial por R$ 97,00'}">
                <span class="btn-hero-icon">🛒</span>
                <span class="btn-hero-text">${isForcaVerdeOwned ? 'Acessar Obra na Biblioteca' : 'GARANTIR MEU EXEMPLAR'}</span>
                <span class="btn-hero-arrow">›</span>
              </button>

              <button type="button" class="btn-hero-secondary spotlight-detail-btn" data-material-detail="forca-verde">
                <span>${isFvExpanded ? 'Ocultar detalhes' : 'Conhecer o método'}</span>
                <span class="btn-hero-arrow">›</span>
              </button>
            </div>

            <div class="hero-microcopy">
              <span class="lock-icon">🔒</span>
              <span>Acesso imediato • PDF HD + Kindle</span>
            </div>
          </div>

          <!-- Coluna Direita: Mockup 3D Oficial Grande do Livro -->
          <div class="hero-cinematic-right spotlight-book-stage flagship-stage" data-material-detail="forca-verde" title="Clique para explorar o sumário da obra">
            <div class="hero-book-glow flagship-glow"></div>
            <div class="hero-book-wrap flagship-book-3d">
              <img src="assets/forca-verde-book-3d.png" alt="Capa Oficial 3D — Livro Força Verde por Daniel Gonçalves" class="hero-book-img spotlight-cover-img flagship-cover-img" />
              <div class="hero-book-sheen spotlight-foil-reflection"></div>
            </div>
            <div class="hero-book-shadow flagship-shadow"></div>
            <div class="flagship-stage-badge">
              <span>Edição Oficial · 248 Páginas · Daniel Gonçalves</span>
            </div>
          </div>
        </div>

        <!-- 2. FAIXA DE BENEFÍCIOS E PILARES DO MÉTODO (5 PILARES OFICIAIS) -->
        <div class="hero-pillars-strip flagship-pillars-strip" aria-label="Os 5 Pilares do Método Força Verde">
          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">ENCONTRE <span class="highlight-green">OS LÍDERES</span></strong>
              <span class="pillar-sub">Com Força Relativa (RS ≥ 80)</span>
            </div>
          </div>

          <div class="pillar-divider"></div>

          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12c3-6 6-6 9 0s6 6 9 0"/><path d="M17 6h4v4"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">LEIA O CICLO <span class="highlight-green">DE MERCADO</span></strong>
              <span class="pillar-sub">Sempre a favor do regime positivo</span>
            </div>
          </div>

          <div class="pillar-divider"></div>

          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
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
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">GESTÃO DE RISCO</strong>
              <span class="pillar-sub">Posicionamento matemático e profissional</span>
            </div>
          </div>

          <div class="pillar-divider"></div>

          <div class="pillar-col">
            <div class="pillar-icon-box">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </div>
            <div class="pillar-text">
              <strong class="pillar-title">VENDA NA FORÇA</strong>
              <span class="pillar-sub">Capture múltiplos de risco (R)</span>
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

    // 3. RENDERIZADOR DE CARDS DE PRODUTOS DO CATÁLOGO
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

      return `<article class="material-card store-product-card material-card-${item.id} ${acquired ? 'is-acquired' : ''} ${!isAvailable ? 'is-coming-soon' : ''}" data-network="${item.id}">
        <div class="material-book-stage">
          <div class="material-3d-book">
            <div class="card-book-spine"></div>
            <div class="card-book-cover-wrap">
              <img src="${item.cover}" alt="Capa de ${item.title}" class="card-book-front" />
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

    // 4. SEÇÃO DESTAQUES DA LOJA (DESTAQUES EDITORIAIS PRINCIPAIS)
    const showFeatured = !materialsLibraryOnly && !query && (materialsFilter === 'Todos' || materialsFilter === 'Livros');
    const rubricItem = healthyMaterials.find((m) => m.id === 'rubric');
    const riskItem = healthyMaterials.find((m) => m.id === 'risk');
    const cycleItem = healthyMaterials.find((m) => m.id === 'cycle');

    const featuredSectionMarkup = showFeatured && rubricItem ? `
      <section class="store-featured-section" aria-label="Destaques da Metodologia">
        <div class="store-section-header">
          <span class="section-kicker">SELEÇÃO ESPECIAL</span>
          <h2 class="section-title">Destaques da Metodologia</h2>
          <p class="section-desc">Frameworks técnicos e literatura essencial para transformar o trading em um sistema matemático e profissional.</p>
        </div>

        <div class="featured-editorial-layout">
          <!-- Card de Destaque Principal (Lead Feature) -->
          <article class="featured-lead-card">
            <div class="lead-card-stage">
              <img src="${rubricItem.cover}" alt="Capa de ${rubricItem.title}" class="lead-card-cover" />
              <div class="lead-stage-glow"></div>
            </div>
            <div class="lead-card-info">
              <div class="lead-badge-row">
                <span class="badge-featured-gold">★ METODOLOGIA OFICIAL</span>
                <span class="badge-featured-type">Livro & Framework</span>
                <span class="badge-featured-rating">★★★★★ 5.0 <i>(Em Breve)</i></span>
              </div>
              <h3 class="lead-title">${rubricItem.title}</h3>
              <p class="lead-tagline">O Guia Mestre de Oportunidades: pontuação ponderada de setups A, B e C, eliminando operações medíocres e aplicando a fórmula matemática de dimensionamento de lote (Position Sizing).</p>
              
              <div class="lead-benefits-grid">
                <div class="lead-benefit-pill">
                  <span class="benefit-ico">🎯</span>
                  <div>
                    <b>Pontuação de 0 a 100</b>
                    <small>Critérios objetivos e auditáveis</small>
                  </div>
                </div>
                <div class="lead-benefit-pill">
                  <span class="benefit-ico">📐</span>
                  <div>
                    <b>Position Sizing Real</b>
                    <small>Dimensionamento matemático</small>
                  </div>
                </div>
                <div class="lead-benefit-pill">
                  <span class="benefit-ico">🛡️</span>
                  <div>
                    <b>Zero Subjetividade</b>
                    <small>Filtro anti-impulso operacional</small>
                  </div>
                </div>
              </div>

              <div class="lead-card-footer">
                <div class="lead-status">
                  <span class="status-label">Disponibilidade</span>
                  <strong class="status-val">Em Produção Editorial</strong>
                </div>
                <div class="lead-actions">
                  <button type="button" class="btn-card-detail" data-material-detail="rubric">Ver Detalhes</button>
                  <button type="button" class="btn-card-disabled" disabled aria-disabled="true">Em Breve</button>
                </div>
              </div>
            </div>
          </article>

          <!-- Destaques Secundários em Grid Duplo -->
          <div class="featured-dual-grid">
            ${riskItem ? `
              <article class="featured-sub-card">
                <div class="sub-card-top">
                  <img src="${riskItem.cover}" alt="Capa de ${riskItem.title}" class="sub-card-thumb" />
                  <div>
                    <span class="sub-badge">🛡️ GUIA ESSENCIAL</span>
                    <h4 class="sub-title">${riskItem.title}</h4>
                    <span class="sub-rating">★★★★★ 5.0</span>
                  </div>
                </div>
                <p class="sub-copy">A Armadura Matemática do Capital: cálculo exato de R-Multiple, risco assimétrico positivo e condução de trailing stop pela EMA 10.</p>
                <div class="sub-footer">
                  <span class="sub-status">Em Breve</span>
                  <button type="button" class="btn-card-detail" data-material-detail="risk">Ver Detalhes</button>
                </div>
              </article>
            ` : ''}

            ${cycleItem ? `
              <article class="featured-sub-card">
                <div class="sub-card-top">
                  <img src="${cycleItem.cover}" alt="Capa de ${cycleItem.title}" class="sub-card-thumb" />
                  <div>
                    <span class="sub-badge">🧭 FRAMEWORK OFICIAL</span>
                    <h4 class="sub-title">${cycleItem.title}</h4>
                    <span class="sub-rating">★★★★★ 4.9</span>
                  </div>
                </div>
                <p class="sub-copy">O Termômetro dos 4 Regimes de Mercado: mapeamento do Ibovespa e S&P 500, protegendo o capital em transições defensivas.</p>
                <div class="sub-footer">
                  <span class="sub-status">Em Breve</span>
                  <button type="button" class="btn-card-detail" data-material-detail="cycle">Ver Detalhes</button>
                </div>
              </article>
            ` : ''}
          </div>
        </div>
      </section>
    ` : '';

    // 5. MEU ACERVO PESSOAL INTEGRADO
    const libraryProducts = healthyMaterials.filter((item) => owned.includes(item.id));
    const libraryItemsMarkup = libraryProducts.length
      ? libraryProducts.map((item) => `
          <div class="acervo-item-card">
            <div class="acervo-item-cover-wrap">
              <img src="${item.id === 'forca-verde' ? 'assets/forca-verde-book-3d.png' : item.cover}" alt="${item.title}" class="acervo-item-cover" />
            </div>
            <div class="acervo-item-content">
              <div class="acervo-item-header">
                <span class="acervo-item-tag">✓ Adquirido · Acesso Vitalício</span>
                <h4 class="acervo-item-title">${item.title}</h4>
                <small class="acervo-item-meta">${item.type} · Metodologia Oficial</small>
              </div>
              <div class="acervo-item-actions">
                <button type="button" class="btn-acervo-open" data-material-action="${item.id}">
                  <span>Abrir Obra</span> ↗
                </button>
              </div>
            </div>
          </div>
        `).join('')
      : `
        <div class="acervo-empty-state">
          <div class="acervo-empty-icon">🏛</div>
          <div class="acervo-empty-text">
            <h3>Sua estante pessoal de materiais</h3>
            <p>Você ainda não possui obras adquiridas na sua biblioteca. Ao garantir o livro <b>Força Verde</b> ou adquirir materiais oficiais do método, eles ficarão salvos aqui com acesso imediato e vitalício.</p>
          </div>
          <button type="button" class="btn-acervo-cta" data-material-action="forca-verde">Garantir Força Verde no Topo ↑</button>
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
          <button type="button" class="btn-store-library-shortcut ${materialsLibraryOnly ? 'active' : ''}" data-material-library="${!materialsLibraryOnly}" title="Visualizar apenas obras adquiridas na sua estante">
            <span>🏛</span> Meu Acervo <span class="badge-acervo-count">${owned.length}</span>
          </button>

          <label class="materials-search">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input id="materialsSearch" value="${safe(materialsQuery)}" placeholder="Buscar materiais...">
          </label>

          <select id="materialsSort" aria-label="Ordenar materiais">
            <option value="recent" ${materialsSort === 'recent' ? 'selected' : ''}>Mais recentes</option>
            <option value="price-asc" ${materialsSort === 'price-asc' ? 'selected' : ''}>Menor preço</option>
            <option value="price-desc" ${materialsSort === 'price-desc' ? 'selected' : ''}>Maior preço</option>
          </select>
        </div>
      </section>

      <!-- 3. Seção Destaques da Loja (quando aplicável) -->
      ${featuredSectionMarkup}

      <!-- 4. Catálogo Completo (Grade Editorial Full-Width) -->
      <section class="store-catalog-section" aria-label="Catálogo de Obras">
        <div class="store-section-header">
          <div class="section-header-row">
            <div>
              <span class="section-kicker">${materialsLibraryOnly ? 'SUA COLEÇÃO' : 'VITRINE COMPLETA'}</span>
              <h2 class="section-title">${materialsLibraryOnly ? 'Meu Acervo de Obras' : 'Catálogo de Materiais & Obras Futuras'}</h2>
              <p class="section-desc">${materialsLibraryOnly ? 'Materiais adquiridos prontos para consulta e leitura imediata.' : 'Literatura técnica, frameworks operacionais e manuais práticos da metodologia.'}</p>
            </div>
            <span class="store-results-count">${visible.length} ${visible.length === 1 ? 'material encontrado' : 'materiais encontrados'}</span>
          </div>
        </div>

        <div class="materials-grid store-full-grid">
          ${visible.map(card).join('') || '<div class="materials-empty">Nenhum material encontrado nesta seleção.</div>'}
        </div>
      </section>

      <!-- 5. Seção Meu Acervo Pessoal Integrada (quando no modo geral) -->
      ${!materialsLibraryOnly ? `
        <section class="store-my-library-section" id="myPersonalLibrarySection" aria-label="Meu Acervo Pessoal">
          <div class="store-section-header">
            <span class="section-kicker">SUA ESTANTE PESSOAL</span>
            <h2 class="section-title">🏛 Meu Acervo Pessoal</h2>
            <p class="section-desc">Seus materiais adquiridos com acesso vitalício imediato na plataforma.</p>
          </div>
          <div class="acervo-items-grid">
            ${libraryItemsMarkup}
          </div>
        </section>
      ` : ''}

      <!-- 6. Faixa Editorial de Suporte VIP WhatsApp -->
      <section class="store-support-banner" aria-label="Suporte VIP de Conhecimento">
        <div class="support-banner-content">
          <div class="support-banner-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/>
            </svg>
          </div>
          <div class="support-banner-text">
            <span class="support-kicker">SUPORTE VIP DE CONHECIMENTO</span>
            <h3 class="support-title">Dúvidas sobre os materiais ou aplicação prática?</h3>
            <p class="support-desc">Fale direto com nossa equipe pelo WhatsApp. Orientação sobre acesso aos arquivos, formatos digitais ou dúvidas da metodologia.</p>
          </div>
        </div>
        <button type="button" class="btn-support-whatsapp" data-material-support>
          <span>Falar no WhatsApp com Especialista</span>
          <span class="btn-arrow">→</span>
        </button>
      </section>

      <!-- 7. Citação Institucional e Rodapé Editorial -->
      <footer class="store-editorial-footer">
        <blockquote class="store-quote">
          “O melhor retorno sobre investimento no mercado financeiro começa pelo domínio profundo do seu método.”
        </blockquote>
        <div class="store-mantra">
          <span>MÉTODO</span> <i>·</i> <span>PROCESSO</span> <i>·</i> <span>DISCIPLINA</span> <i>·</i> <span>LIBERDADE</span>
        </div>
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
