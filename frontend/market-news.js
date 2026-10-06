/**
 * HEALTHY TREND TRADER - MARKET NEWS (NOTÍCIAS)
 * Centro de Contexto e Inteligência de Mercado
 * 
 * Filosofia: "A notícia explica o contexto. O gráfico decide a operação."
 */

(function (root) {
  'use strict';

  const state = {
    filters: {
      market: 'todos',
      category: 'todas',
      search: '',
      watchlistOnly: false
    },
    activeModalStoryId: null,
    clockInterval: null,
    loadingFeed: false,
    feedLoaded: false,
    feedMeta: null
  };

  /**
   * Obtém a lista de tickers presentes na Watchlist real do usuário
   */
  function getUserWatchlistTickers() {
    try {
      const raw = localStorage.getItem('healthy-trend-watchlist-v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => String(item.ticker || item.symbol || '').toUpperCase()).filter(Boolean);
        }
      }
    } catch (e) {}

    // Fallback padrão se watchlist estiver vazia
    return ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOG', 'PETR4', 'VALE3', 'WEGE3', 'TOTS3'];
  }

  /**
   * Gera SVG de Sparkline discreto e elegante
   */
  function generateSparklineSvg(data = [], trend = 'up', width = 64, height = 24, customColor = null) {
    if (!Array.isArray(data) || data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * w;
      const y = height - padding - ((val - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const stroke = customColor || (trend === 'up' ? '#10b981' : '#ef4444');
    const lastX = (padding + w).toFixed(1);
    const lastY = (height - padding - ((data[data.length - 1] - min) / range) * h).toFixed(1);

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${lastX}" cy="${lastY}" r="2" fill="${stroke}" />
      </svg>
    `;
  }

  /**
   * Formata data e hora atual no padrão da aplicação
   */
  function getCurrentFormattedDateTime() {
    const now = new Date();
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const dayName = days[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return {
      dateFormatted: `${dayName}, ${day} de ${month} de ${year}`,
      timeFormatted: `${hours}:${minutes}`
    };
  }

  /**
   * Renderiza a página completa no elemento raiz
   */
  function render() {
    const rootEl = document.getElementById('marketNewsRoot');
    if (!rootEl) return;

    const Model = root.MarketNewsModel;
    if (!Model) {
      rootEl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Carregando Inteligência de Mercado...</div>';
      return;
    }
    if (!state.feedLoaded && !state.loadingFeed) void loadLiveNews();

    const userWatchlist = getUserWatchlistTickers();
    const filteredData = Model.filterStories({
      market: state.filters.market,
      category: state.filters.category,
      search: state.filters.search,
      watchlistOnly: state.filters.watchlistOnly,
      userWatchlistTickers: userWatchlist
    });

    const sessionInfo = Model.getMarketSessionInfo();
    const dateTime = getCurrentFormattedDateTime();

    rootEl.innerHTML = `
      <div class="news-page">
        <!-- 1. HEADER DA PÁGINA -->
        ${renderHeader(dateTime, sessionInfo)}

        <!-- 2. FILTROS HORIZONTAIS -->
        ${renderFilters(Model, userWatchlist)}

        <!-- 3. GRID ROW 1: DESTAQUE, PRINCIPAIS, IMPACTO -->
        <div class="news-grid-row-1">
          <!-- Coluna 1: Destaque Principal (Hero) -->
          ${renderFeaturedStory(filteredData.featured)}

          <!-- Coluna 2: Principais Destaques (Top 5) -->
          ${renderTopStories(filteredData.topStories)}

          <!-- Coluna 3: Impacto nos Mercados -->
          ${renderMarketIndicators(filteredData.indicators)}
        </div>

        <!-- 4. GRID ROW 2: WATCHLIST, ÚLTIMAS, SETORES + AVISO -->
        <div class="news-grid-row-2">
          <!-- Coluna 1: Notícias da minha Watchlist -->
          ${renderWatchlistNews(filteredData.watchlistStories)}

          <!-- Coluna 2: Últimas Notícias -->
          ${renderLatestNews(filteredData.latestStories)}

          <!-- Coluna 3: Setores + Aviso Educacional -->
          <div class="news-col-3-stack">
            ${renderSectorsOverview(filteredData.sectors)}
            ${renderEducationalNotice()}
          </div>
        </div>

        <!-- 5. MODAL DE LEITURA COMPLETA -->
        ${renderStoryModal(Model)}
      </div>
    `;

    bindEvents(rootEl);
    startClockTimer();
  }

  /**
   * 1. Renderiza o Header
   */
  function renderHeader(dateTime, sessionInfo) {
    return `
      <div class="news-header-wrap">
        <div class="news-header-title-box">
          <h1>Notícias</h1>
          <p>Fique por dentro do que realmente importa para o seu trading</p>
        </div>

        <div class="news-header-meta-box">
          <!-- Campo de Busca -->
          <div class="news-search-bar">
            <span class="news-search-icon">🔍</span>
            <input 
              type="text" 
              class="news-search-input" 
              id="newsSearchInput" 
              placeholder="Buscar notícias, ativos ou temas..." 
              value="${escapeHtml(state.filters.search)}"
            />
          </div>

          <!-- Relógio e Data -->
          <div class="news-header-time-info">
            <span>${dateTime.dateFormatted}</span>
            <span class="news-clock-time" id="newsLiveClock">${dateTime.timeFormatted}</span>
            <small class="news-feed-status">${feedStatus()}</small>
          </div>

          <!-- Status do Mercado -->
          <div class="news-market-status-pill" title="${sessionInfo.sessionText}">
            <span class="news-status-dot"></span>
            <span>${sessionInfo.statusLabel}</span>
          </div>
        </div>
      </div>
    `;
  }

  function feedStatus() {
    if (state.loadingFeed) return 'Atualizando notícias…';
    if (!state.feedMeta?.updatedAt) return 'Feed indisponível; exibindo contexto local.';
    const at = new Date(state.feedMeta.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${state.feedMeta.stale ? 'Último feed disponível' : 'Atualizado'} ${at} · GDELT + fontes originais`;
  }

  async function loadLiveNews() {
    state.loadingFeed = true;
    try {
      const response = root.healthyTrendApi
        ? await root.healthyTrendApi.request('/api/market-news')
        : await fetch('/api/market-news').then(result => result.json());
      if (Array.isArray(response.stories) && response.stories.length) {
        root.MarketNewsModel?.setLiveStories(response.stories);
        state.feedMeta = response;
      }
    } catch (error) {
      state.feedMeta = { error: error.message };
    } finally {
      state.loadingFeed = false;
      state.feedLoaded = true;
      render();
    }
  }

  /**
   * 2. Renderiza a barra de filtros
   */
  function renderFilters(Model, userWatchlist) {
    const markets = Model.MARKETS || [];
    const categories = Model.CATEGORIES || [];

    const marketPills = markets.map(m => `
      <button 
        type="button" 
        class="news-filter-pill ${state.filters.market === m.id ? 'active' : ''}" 
        data-filter-market="${m.id}">
        ${m.label}
      </button>
    `).join('');

    const categoryPills = categories.map(c => `
      <button 
        type="button" 
        class="news-filter-pill ${state.filters.category.toLowerCase() === c.label.toLowerCase() || (state.filters.category === 'todas' && c.id === 'todas') ? 'active' : ''}" 
        data-filter-category="${c.label}">
        ${c.label}
      </button>
    `).join('');

    return `
      <div class="news-filters-row">
        <!-- Card Mercado -->
        <div class="news-filter-card">
          <div class="news-filter-label">Mercado</div>
          <div class="news-filter-pills">
            ${marketPills}
          </div>
        </div>

        <!-- Card Categoria -->
        <div class="news-filter-card">
          <div class="news-filter-label">Categoria</div>
          <div class="news-filter-pills">
            ${categoryPills}
          </div>
        </div>

        <!-- Card Watchlist Toggle -->
        <div class="news-filter-card watchlist-toggle-card">
          <div class="news-filter-label">Relacionadas à minha Watchlist</div>
          <div class="news-toggle-wrapper" id="newsWatchlistToggleWrap" title="Filtra apenas notícias de ativos da sua Watchlist (${userWatchlist.join(', ')})">
            <div class="news-toggle-switch ${state.filters.watchlistOnly ? 'active' : ''}" id="newsWatchlistSwitch">
              <span class="news-toggle-handle"></span>
            </div>
            <span class="news-toggle-text">Mostrar apenas notícias dos meus ativos</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 3. Coluna 1 — Destaque Principal (Hero Card)
   */
  function renderFeaturedStory(story) {
    if (!story) return '';
    return `
      <div class="news-hero-card" id="newsHeroCard" data-open-story="${story.id}" style="background-image: url('${story.image || 'assets/news-hero-fed.jpg'}');">
        <div class="news-hero-overlay"></div>
        <div class="news-hero-content">
          <span class="news-hero-badge">${story.categoryBadge || story.category || 'MACROECONOMIA'}</span>
          <h2 class="news-hero-headline">${story.title}</h2>
          <p class="news-hero-summary">${story.summary}</p>
          <div class="news-hero-meta">
            ${story.source} • ${story.date || story.time}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 4. Coluna 2 — Principais Destaques
   */
  function renderTopStories(topStories = []) {
    const itemsHtml = topStories.map(story => {
      let thumbHtml = '';
      if (story.thumbnail) {
        thumbHtml = `<img src="${story.thumbnail}" alt="" class="news-top-thumb" onerror="this.style.display='none'" />`;
      } else {
        thumbHtml = `<div class="news-top-thumb" style="display:flex;align-items:center;justify-content:center;color:#6ee7b7;font-weight:800;font-size:11px;">#</div>`;
      }

      return `
        <div class="news-top-item" data-open-story="${story.id}">
          <span class="news-top-rank">${story.rank || '01'}</span>
          ${thumbHtml}
          <div class="news-top-info">
            <div class="news-top-headline">${story.title}</div>
            <div class="news-top-meta">${story.source} • ${story.time}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="news-top-card">
        <div class="news-card-header">
          <h2>Principais Destaques</h2>
          <a class="news-card-link-more" id="newsTopVerTodos">Ver todos →</a>
        </div>
        <div class="news-top-list">
          ${itemsHtml || '<div style="color:var(--muted);font-size:12px;padding:10px;">Nenhum destaque para o filtro.</div>'}
        </div>
      </div>
    `;
  }

  /**
   * 5. Coluna 3 — Impacto nos Mercados
   */
  function renderMarketIndicators(indicators = []) {
    const itemsHtml = indicators.map(ind => {
      const isUp = ind.trend === 'up';
      const arrow = isUp ? '↑' : '↓';
      const changeClass = isUp ? 'up' : 'down';
      const sparklineSvg = generateSparklineSvg(ind.sparkline, ind.trend, 64, 22, ind.accentColor);

      return `
        <div class="news-market-item" data-nav-ticker="${ind.symbol}">
          <span class="news-market-name">${ind.name}</span>
          <div class="news-market-sparkline">${sparklineSvg}</div>
          <div class="news-market-values">
            <div class="news-market-price">${ind.value}</div>
            <div class="news-market-change ${changeClass}">${arrow} ${ind.changeFormatted}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="news-markets-card">
        <div class="news-card-header">
          <h2>Impacto nos Mercados</h2>
          <span style="color:var(--muted);font-size:13px;cursor:pointer;">›</span>
        </div>
        <div class="news-markets-list">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  /**
   * 6. Linha 2 — Notícias da minha Watchlist
   */
  function renderWatchlistNews(watchlistStories = []) {
    const rowsHtml = watchlistStories.map(story => {
      const impactClass = (story.impact || 'Neutro').toLowerCase();

      return `
        <tr data-open-story="${story.id}">
          <td class="news-wl-asset-cell">
            <div class="news-wl-ticker-logo" style="background:${story.logoBg || '#1e382b'}; color:${story.logoColor || '#34d399'};">
              ${story.ticker.slice(0, 2)}
            </div>
            <span class="news-wl-ticker-name" data-nav-ticker="${story.ticker}" title="Clique para ver o gráfico">${story.ticker}</span>
          </td>
          <td class="news-wl-headline-cell">
            ${story.headline}
          </td>
          <td>
            <span class="news-impact-badge ${impactClass}">${story.impact || 'Neutro'}</span>
          </td>
          <td style="color:#94a3b8; font-size:11.5px; white-space:nowrap;">
            ${story.time}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="news-watchlist-card">
        <div class="news-card-header">
          <h2>Notícias da minha Watchlist</h2>
          <span style="color:var(--muted);font-size:13px;cursor:pointer;">›</span>
        </div>
        <div class="news-wl-table-wrap">
          <table class="news-wl-table">
            <thead>
              <tr>
                <th style="width: 14%;">Ativo</th>
                <th>Notícia</th>
                <th style="width: 14%;">Impacto</th>
                <th style="width: 10%;">Data</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">Nenhuma notícia para os ativos da sua Watchlist neste filtro.</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="news-wl-footer">
          <a id="newsVerTodasWatchlist">Ver todas as notícias da minha Watchlist →</a>
        </div>
      </div>
    `;
  }

  /**
   * 7. Linha 2 — Últimas Notícias
   */
  function renderLatestNews(latestStories = []) {
    const itemsHtml = latestStories.map(story => `
      <div class="news-latest-item" data-open-story="${story.id}">
        <span class="news-latest-time">${story.time}</span>
        <span class="news-latest-headline">${story.headline}</span>
        <span class="news-latest-cat-badge">${story.categoryBadge || story.category}</span>
      </div>
    `).join('');

    return `
      <div class="news-latest-card">
        <div class="news-card-header">
          <h2>Últimas Notícias</h2>
          <span style="color:var(--muted);font-size:13px;cursor:pointer;">›</span>
        </div>
        <div class="news-latest-list">
          ${itemsHtml || '<div style="color:var(--muted);font-size:12px;padding:12px;">Nenhuma notícia recente encontrada.</div>'}
        </div>
      </div>
    `;
  }

  /**
   * 8. Linha 2 — Notícias por Setor
   */
  function renderSectorsOverview(sectors = []) {
    const itemsHtml = sectors.map(sec => {
      const sparkSvg = generateSparklineSvg(sec.sparkline, sec.trend, 48, 16);
      return `
        <div class="news-sector-item" data-filter-sector="${sec.name}">
          <div class="news-sector-left">
            <span class="news-sector-icon">${sec.icon}</span>
            <span class="news-sector-name">${sec.name}</span>
          </div>
          <div class="news-sector-right">
            <span class="news-sector-count">${sec.count}</span>
            <div class="news-sector-sparkline">${sparkSvg}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="news-sectors-card">
        <div class="news-card-header">
          <h2>Notícias por Setor</h2>
          <span style="color:var(--muted);font-size:13px;cursor:pointer;">›</span>
        </div>
        <div class="news-sectors-list">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  /**
   * 9. Linha 2 — Aviso Educacional
   */
  function renderEducationalNotice() {
    return `
      <div class="news-edu-card">
        <div class="news-edu-icon">💡</div>
        <div class="news-edu-body">
          <h4>Notícias não são sinais de entrada.</h4>
          <p>Use as notícias para compreender o contexto. A decisão operacional permanece baseada no gráfico Diário e nas regras do seu setup.</p>
        </div>
      </div>
    `;
  }

  /**
   * 10. Modal de Leitura Completa da Notícia
   */
  function renderStoryModal(Model) {
    if (!state.activeModalStoryId) return '';
    const story = Model.getStoryById(state.activeModalStoryId);
    if (!story) return '';

    const tickersHtml = (story.tickers || []).map(t => `
      <span class="news-modal-ticker-tag" data-nav-ticker="${t}">
        📈 $${t}
      </span>
    `).join('');

    const formattedContent = (story.content || story.summary || '')
      .split('\n\n')
      .map(p => {
        if (p.startsWith('**') && p.includes(':**')) {
          const parts = p.split(':**');
          const title = parts[0].replace('**', '');
          const rest = parts.slice(1).join(':**');
          return `<div class="news-modal-tech-box"><span class="news-modal-tech-title">${title}</span><p class="news-modal-tech-text">${rest.trim()}</p></div>`;
        }
        return `<p>${escapeHtml(p)}</p>`;
      })
      .join('');

    return `
      <div class="news-modal-overlay open" id="newsStoryModalOverlay">
        <div class="news-modal-box">
          <div class="news-modal-header">
            <div class="news-modal-tags">
              <span class="news-modal-cat-tag">${story.category || 'Mercado'}</span>
              ${story.impact ? `<span class="news-impact-badge ${story.impact.toLowerCase()}">${story.impact}</span>` : ''}
            </div>
            <button class="news-modal-close-btn" type="button" id="newsStoryModalClose">×</button>
          </div>

          <h2 class="news-modal-title">${story.title}</h2>

          <div class="news-modal-meta">
            <span><b>Fonte:</b> ${story.source || 'Agência'}</span>
            <span>•</span>
            <span>${story.date || story.time || 'Hoje'}</span>
          </div>

          ${story.image ? `
            <div class="news-modal-image-wrap">
              <img src="${story.image}" alt="${escapeHtml(story.title)}" />
            </div>
          ` : ''}

          <div class="news-modal-content">
            ${formattedContent}
          </div>

          ${tickersHtml ? `
            <div class="news-modal-tickers-row">
              <span style="font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;">Ativos Relacionados:</span>
              ${tickersHtml}
            </div>
          ` : ''}

          <div class="news-modal-footer">
            ${story.sourceUrl ? `<a class="secondary" href="${escapeHtml(story.sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir matéria original ↗</a>` : ''}
            ${story.tickers && story.tickers[0] ? `
              <button class="primary" type="button" data-nav-ticker="${story.tickers[0]}">
                Ver Gráfico de ${story.tickers[0]} →
              </button>
            ` : ''}
            <button class="secondary" type="button" id="newsStoryModalDismiss">Fechar</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Associa eventos do DOM
   */
  function bindEvents(container) {
    // 1. Busca textual
    const searchInput = container.querySelector('#newsSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        render();
        // Mantém o foco no input
        const updatedInput = container.querySelector('#newsSearchInput');
        if (updatedInput) {
          updatedInput.focus();
          updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
        }
      });
    }

    // 2. Filtro de Mercado
    container.querySelectorAll('[data-filter-market]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.filters.market = btn.dataset.filterMarket;
        render();
      });
    });

    // 3. Filtro de Categoria
    container.querySelectorAll('[data-filter-category]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.filters.category = btn.dataset.filterCategory;
        render();
      });
    });

    // 4. Toggle Watchlist
    const toggleWrap = container.querySelector('#newsWatchlistToggleWrap');
    if (toggleWrap) {
      toggleWrap.addEventListener('click', (e) => {
        e.stopPropagation();
        state.filters.watchlistOnly = !state.filters.watchlistOnly;
        render();
      });
    }

    // 5. Clique em setor na lista de setores para filtrar
    container.querySelectorAll('[data-filter-sector]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        state.filters.category = item.dataset.filterSector;
        render();
      });
    });

    // 6. Abrir modal de notícia
    container.querySelectorAll('[data-open-story]').forEach(card => {
      card.addEventListener('click', (e) => {
        // Se clicou em um ticker com navegação própria, não abre modal
        if (e.target.closest('[data-nav-ticker]')) return;
        const id = card.dataset.openStory;
        if (id) {
          state.activeModalStoryId = id;
          render();
        }
      });
    });

    // 7. Navegação para gráfico do ativo (Ticker)
    const navigateToTicker = (ticker) => {
      if (!ticker) return;
      let targetTicker = String(ticker).trim().toUpperCase();
      if (targetTicker === 'NDX') targetTicker = 'QQQ';
      state.activeModalStoryId = null;
      if (typeof window !== 'undefined') {
        window.__pendingChartsTicker = targetTicker;
      }
      if (typeof root.go === 'function') {
        root.go('charts', targetTicker);
      }
      if (typeof window.loadTickerChart === 'function') {
        window.loadTickerChart(targetTicker);
      }
    };

    container.querySelectorAll('[data-nav-ticker]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const ticker = el.dataset.navTicker;
        if (ticker) {
          navigateToTicker(ticker);
        }
      });
    });

    // 8. Botão "Ver todas as notícias da minha Watchlist"
    const btnVerWl = container.querySelector('#newsVerTodasWatchlist');
    if (btnVerWl) {
      btnVerWl.addEventListener('click', (e) => {
        e.stopPropagation();
        state.filters.watchlistOnly = true;
        render();
      });
    }

    // 9. Botão "Ver todos" no Top Stories
    const btnVerTop = container.querySelector('#newsTopVerTodos');
    if (btnVerTop) {
      btnVerTop.addEventListener('click', (e) => {
        e.stopPropagation();
        state.filters.category = 'todas';
        state.filters.market = 'todos';
        state.filters.watchlistOnly = false;
        state.filters.search = '';
        render();
      });
    }

    // 10. Fechar modal de notícia
    const closeModal = (e) => {
      e?.stopPropagation();
      state.activeModalStoryId = null;
      render();
    };

    container.querySelector('#newsStoryModalClose')?.addEventListener('click', closeModal);
    container.querySelector('#newsStoryModalDismiss')?.addEventListener('click', closeModal);
    container.querySelector('#newsStoryModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'newsStoryModalOverlay') {
        closeModal(e);
      }
    });
  }

  /**
   * Mantém o relógio do header atualizado a cada minuto
   */
  function startClockTimer() {
    if (state.clockInterval) return;
    state.clockInterval = setInterval(() => {
      const clockEl = document.getElementById('newsLiveClock');
      if (clockEl) {
        const dt = getCurrentFormattedDateTime();
        clockEl.textContent = dt.timeFormatted;
      }
    }, 60000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Exporta objeto global
  root.MarketNews = {
    render,
    refresh: () => { state.feedLoaded = false; return loadLiveNews(); }
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
