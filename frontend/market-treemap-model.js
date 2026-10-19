/**
 * HEALTHY TREND TRADER - MARKET TREEMAP MODEL
 *
 * Modelo puro de cálculo e layout para o Mapa de Setores da B3:
 * 1. Algoritmo de Squarified Treemap (Bruls, Huizing, van Wijk)
 * 2. Mapeamento de cores da escala de variação percentual (-10% a +10%)
 * 3. Formatação monetária humanizada (tri, bi, mi) e percentual
 * 4. Filtragem, busca e agregação com deduplicação de classes de ações
 */

(function (root) {
  'use strict';

  // Escala de cores para retorno percentual:
  // -10%: #7f1d1d (Vermelho escuro)
  // -5%:  #b91c1c (Vermelho vivo)
  // -2%:  #dc2626 (Vermelho suave)
  //  0%:  #2d3748 (Cinza neutro / slate)
  // +2%:  #15803d (Verde suave)
  // +5%:  #16a34a (Verde intermediário)
  // +10%: #22c55e (Verde vibrante)
  const COLOR_STOPS = [
    { pct: -10, r: 127, g: 29, b: 29 },   // #7f1d1d
    { pct: -5,  r: 185, g: 28, b: 28 },   // #b91c1c
    { pct: -2,  r: 220, g: 38, b: 38 },   // #dc2626
    { pct: 0,   r: 45,  g: 55, b: 72 },   // #2d3748 (slate escuro neutro)
    { pct: 2,   r: 21,  g: 128, b: 61 },  // #15803d
    { pct: 5,   r: 22,  g: 163, b: 74 },  // #16a34a
    { pct: 10,  r: 34,  g: 197, b: 94 }   // #22c55e
  ];

  /**
   * Converte variação percentual em cor hexadecimal interpolada
   */
  function getColorForReturn(changePct) {
    if (changePct === null || changePct === undefined || !Number.isFinite(Number(changePct))) {
      return '#1e293b'; // Dado ausente: slate escuro
    }

    const val = Number(changePct);

    if (val <= COLOR_STOPS[0].pct) {
      const c = COLOR_STOPS[0];
      return `rgb(${c.r}, ${c.g}, ${c.b})`;
    }
    if (val >= COLOR_STOPS[COLOR_STOPS.length - 1].pct) {
      const c = COLOR_STOPS[COLOR_STOPS.length - 1];
      return `rgb(${c.r}, ${c.g}, ${c.b})`;
    }

    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
      const low = COLOR_STOPS[i];
      const high = COLOR_STOPS[i + 1];

      if (val >= low.pct && val <= high.pct) {
        const factor = (val - low.pct) / (high.pct - low.pct);
        const r = Math.round(low.r + factor * (high.r - low.r));
        const g = Math.round(low.g + factor * (high.g - low.g));
        const b = Math.round(low.b + factor * (high.b - low.b));
        return `rgb(${r}, ${g}, ${b})`;
      }
    }

    return '#2d3748';
  }

  /**
   * Algoritmo Squarified Treemap (Bruls, Huizing, van Wijk)
   *
   * Particiona um retângulo de dimensões `width` x `height` entre os itens informados,
   * garantindo proporção de aspecto (aspect ratio) o mais próxima possível de 1:1 (quadrado).
   *
   * @param {Array} items - Lista de objetos contendo a propriedade `weight` (ex: Market Cap)
   * @param {number} width - Largura do contêiner em pixels
   * @param {number} height - Altura do contêiner em pixels
   * @param {number} gap - Espaçamento entre as células em pixels (default: 2)
   * @returns {Array} Itens com coordenadas calculadas `{ ...item, x, y, w, h }`
   */
  function layoutTreemap(items, width, height, gap = 2) {
    if (!Array.isArray(items) || items.length === 0 || width <= 0 || height <= 0) {
      return [];
    }

    // Filtra pesos positivos e ordena decrescente
    const validItems = items
      .filter((it) => it && Number(it.weight || it.marketCap) > 0)
      .map((it) => ({
        ...it,
        weight: Number(it.weight || it.marketCap)
      }))
      .sort((a, b) => b.weight - a.weight);

    if (validItems.length === 0) return [];

    const totalWeight = validItems.reduce((acc, it) => acc + it.weight, 0);
    const totalArea = width * height;

    // Normaliza os pesos para unidades de área do contêiner
    const nodes = validItems.map((it) => ({
      ...it,
      area: (it.weight / totalWeight) * totalArea,
      x: 0,
      y: 0,
      w: 0,
      h: 0
    }));

    let currentRect = { x: 0, y: 0, w: width, h: height };
    let remaining = [...nodes];

    // Calcula o pior aspect ratio de uma linha/coluna candidata
    function worstAspectRatio(row, sideLength) {
      if (row.length === 0) return Infinity;
      const rowArea = row.reduce((s, n) => s + n.area, 0);
      const side = rowArea / sideLength;
      if (side <= 0) return Infinity;

      let worst = 0;
      for (const item of row) {
        const itemLen = item.area / side;
        const ratio = Math.max(side / itemLen, itemLen / side);
        if (ratio > worst) worst = ratio;
      }
      return worst;
    }

    // Posiciona e fixa a linha/coluna no retângulo corrente
    function layoutRow(row, container, isHorizontal) {
      const rowArea = row.reduce((s, n) => s + n.area, 0);

      if (isHorizontal) {
        const rowHeight = rowArea / container.w;
        let currX = container.x;
        for (const item of row) {
          const itemWidth = item.area / rowHeight;
          item.x = currX;
          item.y = container.y;
          item.w = itemWidth;
          item.h = rowHeight;
          currX += itemWidth;
        }
        container.y += rowHeight;
        container.h -= rowHeight;
      } else {
        const rowWidth = rowArea / container.h;
        let currY = container.y;
        for (const item of row) {
          const itemHeight = item.area / rowWidth;
          item.x = container.x;
          item.y = currY;
          item.w = rowWidth;
          item.h = itemHeight;
          currY += itemHeight;
        }
        container.x += rowWidth;
        container.w -= rowWidth;
      }
    }

    // Loop de particionamento guloso (Squarify)
    while (remaining.length > 0) {
      const isHorizontal = currentRect.w >= currentRect.h;
      const sideLength = isHorizontal ? currentRect.w : currentRect.h;

      if (sideLength <= 0) break;

      let row = [remaining[0]];
      let i = 1;

      while (i < remaining.length) {
        const nextItem = remaining[i];
        const currentWorst = worstAspectRatio(row, sideLength);
        const testRow = [...row, nextItem];
        const nextWorst = worstAspectRatio(testRow, sideLength);

        if (nextWorst <= currentWorst) {
          row.push(nextItem);
          i++;
        } else {
          break;
        }
      }

      layoutRow(row, currentRect, isHorizontal);
      remaining = remaining.slice(row.length);
    }

    // Aplica espaçamento sutil entre as células e arredonda coordenadas
    return nodes.map((n) => {
      const x = Math.round(n.x * 10) / 10;
      const y = Math.round(n.y * 10) / 10;
      const w = Math.max(0, Math.round((n.w - gap) * 10) / 10);
      const h = Math.max(0, Math.round((n.h - gap) * 10) / 10);

      return {
        ...n,
        x,
        y,
        w,
        h
      };
    });
  }

  /**
   * Formata Market Cap em formato humanizado (ex: R$ 352,1 bi, R$ 1,38 tri)
   */
  function formatMarketCap(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return 'R$ —';
    }
    const val = Number(value);
    if (val >= 1e12) {
      const formatted = (val / 1e12).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      return `R$ ${formatted} tri`;
    }
    if (val >= 1e9) {
      const formatted = (val / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return `R$ ${formatted} bi`;
    }
    if (val >= 1e6) {
      const formatted = (val / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return `R$ ${formatted} mi`;
    }
    return `R$ ${val.toLocaleString('pt-BR')}`;
  }

  /**
   * Formata variação com sinal explícito (ex: +1,32%, -0,73%)
   */
  function formatSignedPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return 'N/D';
    }
    const num = Number(value);
    const sign = num > 0 ? '+' : '';
    const formatted = num.toFixed(2).replace('.', ',');
    return `${sign}${formatted}%`;
  }

  /**
   * Formata preço de cotação (ex: R$ 67,42)
   */
  function formatPrice(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return '—';
    }
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
  }

  /**
   * Filtra uma lista de empresas por universo, setor e termo de busca
   */
  function filterStocks(stocks, filters = {}) {
    if (!Array.isArray(stocks)) return [];

    const universe = filters.universe || 'ALL';
    const sector = filters.sector || 'ALL';
    const search = (filters.search || '').trim().toLowerCase();

    return stocks.filter((stock) => {
      // Filtro de universo
      if (universe === 'IBOV' && !stock.isIbov) return false;
      if (universe === 'SMALL' && !stock.isSmallCap) return false;

      // Filtro de setor
      if (sector !== 'ALL' && stock.sector !== sector) return false;

      // Filtro de busca
      if (search) {
        const t = (stock.ticker || '').toLowerCase();
        const n = (stock.name || '').toLowerCase();
        const f = (stock.fullName || '').toLowerCase();
        const s = (stock.sector || '').toLowerCase();
        if (!t.includes(search) && !n.includes(search) && !f.includes(search) && !s.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Deduplica e calcula o Market Cap total consolidado por emissora (raiz de 4 letras)
   */
  function calculateDeduplicatedMarketCap(stocksList) {
    if (!Array.isArray(stocksList) || stocksList.length === 0) return 0;
    const seenRoots = new Set();
    let total = 0;
    for (const item of stocksList) {
      const root = item.root || item.ticker?.slice(0, 4) || item.ticker;
      if (!seenRoots.has(root)) {
        seenRoots.add(root);
        total += Number(item.companyMarketCap || item.marketCap || 0);
      }
    }
    return total;
  }

  const model = {
    COLOR_STOPS,
    getColorForReturn,
    layoutTreemap,
    formatMarketCap,
    formatSignedPercent,
    formatPrice,
    filterStocks,
    calculateDeduplicatedMarketCap
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = model;
  }
  root.MarketTreemapModel = model;
})(typeof window !== 'undefined' ? window : global);
