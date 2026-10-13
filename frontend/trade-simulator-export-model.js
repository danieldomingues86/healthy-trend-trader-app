/**
 * HEALTHY TREND TRADER — TRADE SIMULATOR EXPORT MODEL
 *
 * Módulo de exportação de trades simulados para estudos isolados:
 * - DOC (.doc): Documento editável Microsoft Word com 1 trade por página (page-break / mso-break-type).
 * - PDF / HTML Imprimível (.pdf): Documento pronto para leitura, impressão e PDF com 1 trade por página.
 * - ENEX (.enex): Arquivo de exportação do Evernote com 1 nota independente por trade (ENML estrito).
 * - CSV (.csv): Formato tabular consolidado compatível com Excel e LLMs.
 *
 * Regras fundamentais:
 * - 1 trade por página (DOC/PDF) ou 1 trade por nota (ENEX).
 * - Dados reais da simulação sem invenção de dados ausentes ("—" para ausentes).
 * - Gráfico vetorial SVG em DOC e PDF/Impressão; tabela estruturada de níveis em ENEX (respeitando DTD Evernote).
 * - Compatível com Node.js (test runner) e browsers globais.
 */

(function (root, factory) {
  const model = factory(
    typeof require === 'function' ? require('./trade-simulator-model.js') : (root.TradeSimulatorModel || null)
  );
  if (typeof module === 'object' && module.exports) {
    module.exports = model;
  } else {
    root.TradeSimulatorExportModel = model;
  }
}(typeof window === 'undefined' ? globalThis : window, function (TradeSimulatorModel) {
  'use strict';

  function getModel() {
    if (TradeSimulatorModel) return TradeSimulatorModel;
    if (typeof window !== 'undefined' && window.TradeSimulatorModel) return window.TradeSimulatorModel;
    if (typeof globalThis !== 'undefined' && globalThis.TradeSimulatorModel) return globalThis.TradeSimulatorModel;
    return null;
  }

  // ==========================================
  // HELPERS DE FORMATAÇÃO E ESCAPE
  // ==========================================

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeXml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function formatMoney(val) {
    if (val == null || isNaN(val)) return '—';
    return 'R$ ' + Number(val).toFixed(2).replace('.', ',');
  }

  function formatR(val) {
    if (val == null || isNaN(val)) return '—';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2).replace('.', ',')}R`;
  }

  function formatPct(val) {
    if (val == null || isNaN(val)) return '—';
    return Number(val).toFixed(2).replace('.', ',') + '%';
  }

  function formatDateBR(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '—';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateStr;
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }

  function formatDurationDays(days) {
    if (days == null || isNaN(days)) return '—';
    const d = Math.round(Number(days));
    if (d === 0) return 'Mesmo dia (0 d)';
    if (d === 1) return '1 dia';
    return `${d} dias`;
  }

  /**
   * Converte data ISO/string para o formato UTC estrito do Evernote: YYYYMMDDTHHMMSSZ
   */
  function toEvernoteDate(dateStr) {
    if (!dateStr) {
      const now = new Date();
      return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${y}${m}${d}T120000Z`;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      }
    } catch (_) {}
    const now = new Date();
    return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function getStatusLabel(status) {
    const m = getModel();
    if (m && m.STATUS_LABELS && m.STATUS_LABELS[status]) {
      return m.STATUS_LABELS[status];
    }
    const map = {
      WAITING_ENTRY: 'Aguardando entrada',
      IN_OPERATION: 'Em operação',
      CLOSED_GAIN: 'Encerrado (Gain)',
      CLOSED_LOSS: 'Encerrado (Loss)',
      NOT_TRIGGERED: 'Não acionado'
    };
    return map[status] || status || '—';
  }

  function getStatusColor(status) {
    switch (status) {
      case 'CLOSED_GAIN':
        return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
      case 'CLOSED_LOSS':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
      case 'IN_OPERATION':
        return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' };
      case 'WAITING_ENTRY':
        return { bg: '#fffbeb', text: '#92400e', border: '#fde68a' };
      case 'NOT_TRIGGERED':
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  }

  function getGradeBadgeColor(grade) {
    const g = String(grade || '').toUpperCase();
    if (g === 'A+' || g.startsWith('A+')) return { bg: '#14532d', text: '#86efac', border: '#22c55e' };
    if (g.startsWith('A')) return { bg: '#064e3b', text: '#6ee7b7', border: '#10b981' };
    if (g.startsWith('B')) return { bg: '#78350f', text: '#fde68a', border: '#f59e0b' };
    if (g.startsWith('C')) return { bg: '#713f12', text: '#fed7aa', border: '#ea580c' };
    return { bg: '#7f1d1d', text: '#fecaca', border: '#ef4444' };
  }

  function resolveVisionAtivo(sim) {
    if (sim && sim.visionAtivo && sim.visionAtivo.relativeStrength) {
      return sim.visionAtivo;
    }
    const m = getModel();
    if (m && typeof m.getTradeVisionAtivo === 'function') {
      return m.getTradeVisionAtivo(sim);
    }
    return null;
  }

  function resolveCandles(sim) {
    const m = getModel();
    if (m && typeof m.generateSimulationSnapshotCandles === 'function') {
      return m.generateSimulationSnapshotCandles(sim);
    }
    return Array.isArray(sim.candles) ? sim.candles : [];
  }

  function calculateDurationDays(sim) {
    if (sim.durationDays != null) return sim.durationDays;
    const m = getModel();
    if (m && typeof m.calculateTradeDurationDays === 'function') {
      return m.calculateTradeDurationDays(sim);
    }
    if (sim.entryDate && sim.exitDate) {
      const d1 = new Date(sim.entryDate).getTime();
      const d2 = new Date(sim.exitDate).getTime();
      if (!isNaN(d1) && !isNaN(d2)) {
        return Math.max(0, Math.round((d2 - d1) / (24 * 3600 * 1000)));
      }
    }
    return null;
  }

  // ==========================================
  // GERADOR DO GRÁFICO VETORIAL SVG DO TRADE
  // ==========================================

  function generateTradeSnapshotSvg(sim, options = {}) {
    if (!sim) return '';
    const candles = resolveCandles(sim);
    if (!candles || !candles.length) {
      return '<div style="color: #64748b; text-align: center; padding: 24px; font-size: 11px;">Candles indisponíveis para este trade.</div>';
    }

    const entry = Number(sim.entryPrice) || 0;
    const stop = Number(sim.stopLoss) || 0;
    const risk = Math.max(0.01, Math.abs(entry - stop));
    const scenario = sim.managementScenario || '2R';
    const isPyramid = scenario === 'PYRAMID_1R_2R';
    const isExtended = scenario === '2.5R';
    const targetMult = isExtended ? 2.5 : 2.0;
    const targetExitPrice = Number((entry + targetMult * risk).toFixed(2));
    const target1R = Number((entry + risk).toFixed(2));

    const svgW = options.width || 880;
    const svgH = options.height || 360;
    const padLeft = 40;
    const padRight = 130;
    const padTop = 32;
    const padBottom = 35;
    const plotW = svgW - padLeft - padRight;
    const plotH = svgH - padTop - padBottom;

    let allPrices = [entry, stop, target1R, targetExitPrice];
    candles.forEach(c => {
      allPrices.push(Number(c.high), Number(c.low));
      if (c.ema9) allPrices.push(Number(c.ema9));
      if (c.ema30) allPrices.push(Number(c.ema30));
    });
    if (sim.executedEntryPrice) allPrices.push(Number(sim.executedEntryPrice));
    if (sim.exitPrice) allPrices.push(Number(sim.exitPrice));

    let minP = Math.min(...allPrices);
    let maxP = Math.max(...allPrices);
    const pMargin = (maxP - minP) * 0.08 || 1;
    minP -= pMargin;
    maxP += pMargin;

    function getY(p) {
      if (maxP === minP) return padTop + plotH / 2;
      return padTop + plotH - ((p - minP) / (maxP - minP)) * plotH;
    }

    const n = candles.length;
    const colW = plotW / n;
    const bodyW = Math.max(4, Math.min(20, colW * 0.65));

    function getX(idx) {
      return padLeft + (idx + 0.5) * colW;
    }

    // Linhas de Grade Horizontal
    let gridLinesSvg = '';
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minP + (i / gridSteps) * (maxP - minP);
      const y = getY(p);
      gridLinesSvg += `
        <line x1="${padLeft}" y1="${y}" x2="${padLeft + plotW}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${svgW - 5}" y="${y + 4}" fill="#64748b" font-size="9" text-anchor="end" font-family="monospace">R$ ${p.toFixed(2)}</text>
      `;
    }

    const yExit = getY(targetExitPrice);
    const yT1 = getY(target1R);
    const yEnt = getY(entry);
    const yStp = getY(stop);

    const isGain = sim.status === 'CLOSED_GAIN';
    const isLoss = sim.status === 'CLOSED_LOSS';

    let targetLabel = isGain ? '★ +2R ATINGIDO' : `ALVO 2R: ${targetExitPrice.toFixed(2)}`;
    let targetBg = isGain ? '#10b981' : '#064e3b';
    let targetStroke = '#10b981';

    if (isExtended) {
      targetLabel = isGain ? '★ +2,5R ATINGIDO' : `ALVO 2,5R: ${targetExitPrice.toFixed(2)}`;
      targetBg = isGain ? '#f59e0b' : '#78350f';
      targetStroke = '#f59e0b';
    } else if (isPyramid) {
      targetLabel = isGain ? '★ ALVO (+3R CONSOL.)' : `ALVO 2R: ${targetExitPrice.toFixed(2)}`;
      targetBg = isGain ? '#0284c7' : '#0c4a6e';
      targetStroke = '#0284c7';
    }

    const t1BadgeLabel = (isPyramid && sim.scaleIn && sim.scaleIn.executed)
      ? '▶ ADIÇÃO (+1R FEITA)'
      : `ALVO 1R: R$ ${target1R.toFixed(2)}`;
    const t1BadgeBg = (isPyramid && sim.scaleIn && sim.scaleIn.executed) ? '#0284c7' : '#134e4a';
    const t1BadgeColor = (isPyramid && sim.scaleIn && sim.scaleIn.executed) ? '#ffffff' : '#5eead4';

    const refLinesSvg = `
      <!-- Alvo Saída -->
      <line x1="${padLeft}" y1="${yExit}" x2="${padLeft + plotW}" y2="${yExit}" stroke="${targetStroke}" stroke-width="1.5" stroke-dasharray="4,4" />
      <g transform="translate(${padLeft + plotW + 6}, ${yExit - 9})">
        <rect width="120" height="18" rx="4" fill="${targetBg}" />
        <text x="60" y="13" fill="#ffffff" font-size="9" font-weight="700" text-anchor="middle" font-family="system-ui, Arial, sans-serif">
          ${targetLabel}
        </text>
      </g>

      <!-- Alvo 1R -->
      <line x1="${padLeft}" y1="${yT1}" x2="${padLeft + plotW}" y2="${yT1}" stroke="${isPyramid ? '#0284c7' : '#14b8a6'}" stroke-width="1.2" stroke-dasharray="3,3" />
      <g transform="translate(${padLeft + plotW + 6}, ${yT1 - 9})">
        <rect width="120" height="18" rx="4" fill="${t1BadgeBg}" />
        <text x="60" y="13" fill="${t1BadgeColor}" font-size="9" font-weight="700" text-anchor="middle" font-family="system-ui, Arial, sans-serif">
          ${t1BadgeLabel}
        </text>
      </g>

      <!-- Entrada -->
      <line x1="${padLeft}" y1="${yEnt}" x2="${padLeft + plotW}" y2="${yEnt}" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="5,4" />
      <g transform="translate(${padLeft + plotW + 6}, ${yEnt - 9})">
        <rect width="120" height="18" rx="4" fill="#0369a1" />
        <text x="60" y="13" fill="#ffffff" font-size="9" font-weight="700" text-anchor="middle" font-family="system-ui, Arial, sans-serif">
          ▶ ENTRADA: R$ ${entry.toFixed(2)}
        </text>
      </g>

      <!-- Stop Loss -->
      <line x1="${padLeft}" y1="${yStp}" x2="${padLeft + plotW}" y2="${yStp}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />
      <g transform="translate(${padLeft + plotW + 6}, ${yStp - 9})">
        <rect width="120" height="18" rx="4" fill="${isLoss ? '#ef4444' : '#7f1d1d'}" />
        <text x="60" y="13" fill="#ffffff" font-size="9" font-weight="700" text-anchor="middle" font-family="system-ui, Arial, sans-serif">
          ${isLoss ? '✕ STOP EXECUTADO' : 'STOP: R$ ' + stop.toFixed(2)}
        </text>
      </g>
    `;

    let ema9Path = '';
    let ema30Path = '';
    candles.forEach((c, idx) => {
      const cx = getX(idx);
      if (c.ema9) {
        const cy9 = getY(c.ema9);
        ema9Path += idx === 0 ? `M ${cx} ${cy9}` : ` L ${cx} ${cy9}`;
      }
      if (c.ema30) {
        const cy30 = getY(c.ema30);
        ema30Path += idx === 0 ? `M ${cx} ${cy30}` : ` L ${cx} ${cy30}`;
      }
    });

    const emaSvg = `
      ${ema30Path ? `<path d="${ema30Path}" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.85" />` : ''}
      ${ema9Path ? `<path d="${ema9Path}" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-opacity="0.9" />` : ''}
    `;

    let candlesSvg = '';
    let calloutsSvg = '';

    candles.forEach((c, idx) => {
      const cx = getX(idx);
      const cOpen = Number(c.open);
      const cClose = Number(c.close);
      const cHigh = Number(c.high);
      const cLow = Number(c.low);
      const isBull = cClose >= cOpen;
      const color = isBull ? '#10b981' : '#ef4444';

      const yH = getY(cHigh);
      const yL = getY(cLow);
      const yO = getY(cOpen);
      const yC = getY(cClose);
      const topY = Math.min(yO, yC);
      const bodyH = Math.max(2, Math.abs(yO - yC));

      candlesSvg += `<line x1="${cx}" y1="${yH}" x2="${cx}" y2="${yL}" stroke="${color}" stroke-width="1.2" />`;
      candlesSvg += `<rect x="${cx - bodyW / 2}" y="${topY}" width="${bodyW}" height="${bodyH}" fill="${color}" rx="1" />`;

      if (idx % 2 === 0 || c.isSignal || c.isEntry || c.isExit) {
        const dText = String(c.time || '').slice(5).replace('-', '/');
        candlesSvg += `<text x="${cx}" y="${svgH - 10}" fill="#64748b" font-size="8.5" text-anchor="middle" font-family="monospace">${dText}</text>`;
      }

      if (c.isSignal) {
        calloutsSvg += `
          <g transform="translate(${cx}, ${yL + 14})">
            <polygon points="0,-5 -4,0 4,0" fill="#38bdf8" />
            <rect x="-40" y="0" width="80" height="15" rx="3" fill="#0284c7" />
            <text x="0" y="11" fill="#ffffff" font-size="8" font-weight="700" text-anchor="middle" font-family="system-ui, Arial, sans-serif">🎯 GATILHO</text>
          </g>
        `;
      }

      if (c.isEntry) {
        calloutsSvg += `
          <g transform="translate(${cx}, ${yL + 16})">
            <polygon points="0,-5 -4,0 4,0" fill="#10b981" />
            <rect x="-42" y="0" width="84" height="15" rx="3" fill="#059669" />
            <text x="0" y="11" fill="#ffffff" font-size="8" font-weight="700" text-anchor="middle" font-family="system-ui, Arial, sans-serif">▶ ENTRADA</text>
          </g>
        `;
      }

      if (c.isTarget2R || (c.isExit && isGain)) {
        calloutsSvg += `
          <g transform="translate(${cx}, ${yH - 22})">
            <rect x="-50" y="0" width="100" height="16" rx="3" fill="#10b981" />
            <polygon points="0,21 -4,16 4,16" fill="#10b981" />
            <text x="0" y="11" fill="#ffffff" font-size="8" font-weight="800" text-anchor="middle" font-family="system-ui, Arial, sans-serif">★ +2R ATINGIDO</text>
          </g>
        `;
      } else if (c.isStop || (c.isExit && isLoss)) {
        calloutsSvg += `
          <g transform="translate(${cx}, ${yL + 16})">
            <polygon points="0,-5 -4,0 4,0" fill="#ef4444" />
            <rect x="-42" y="0" width="84" height="15" rx="3" fill="#dc2626" />
            <text x="0" y="11" fill="#ffffff" font-size="8" font-weight="700" text-anchor="middle" font-family="system-ui, Arial, sans-serif">✕ STOP LOSS</text>
          </g>
        `;
      }
    });

    const legendSvg = `
      <g transform="translate(${padLeft + 10}, 16)">
        <line x1="0" y1="5" x2="16" y2="5" stroke="#06b6d4" stroke-width="2" />
        <text x="22" y="9" fill="#06b6d4" font-size="9" font-weight="600" font-family="system-ui, Arial, sans-serif">EMA 9</text>
        
        <line x1="75" y1="5" x2="91" y2="5" stroke="#f59e0b" stroke-width="2" />
        <text x="97" y="9" fill="#f59e0b" font-size="9" font-weight="600" font-family="system-ui, Arial, sans-serif">EMA 30</text>
      </g>
    `;

    return `
      <svg class="sim-snapshot-chart-svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" style="max-width: ${svgW}px; background: #06150f; border-radius: 8px; display: block; margin: 0 auto;">
        <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#06150f" rx="8" />
        ${gridLinesSvg}
        ${refLinesSvg}
        ${emaSvg}
        ${candlesSvg}
        ${calloutsSvg}
        ${legendSvg}
      </svg>
    `;
  }

  // ==========================================
  // RENDERIZADOR DE ESTRUTURA DO GATILHO (HTML)
  // ==========================================

  function renderStructureHtml(sim) {
    if (!sim || !sim.structure) return '';
    const st = sim.structure;
    const isDouble = st.ibCount === 2 || sim.triggerName === 'Double Inside Bar';

    return `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 11px;">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span>📦 Estrutura Gráfica &amp; Compressão (${escapeHtml(sim.triggerName)})</span>
          ${st.totalCompressionPct != null ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Contração: ${st.totalCompressionPct}%</span>` : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 4px 6px; color: #64748b;">Candle-mãe</td>
            <td style="padding: 4px 6px; font-weight: 600;">Máx: ${formatMoney(st.motherCandle?.high)} • Mín: ${formatMoney(st.motherCandle?.low)} (Range: ${formatMoney(st.motherCandle?.range)})</td>
          </tr>
          ${st.ib1 ? `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 4px 6px; color: #64748b;">Inside Bar 1</td>
            <td style="padding: 4px 6px; font-weight: 600;">Máx: ${formatMoney(st.ib1.high)} • Mín: ${formatMoney(st.ib1.low)} (Range: ${formatMoney(st.ib1.range)} | Contração: ${st.ib1.compressionPct || '—'}%)</td>
          </tr>` : ''}
          ${isDouble && st.ib2 ? `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 4px 6px; color: #64748b;">Inside Bar 2</td>
            <td style="padding: 4px 6px; font-weight: 600;">Máx: ${formatMoney(st.ib2.high)} • Mín: ${formatMoney(st.ib2.low)} (Range: ${formatMoney(st.ib2.range)} | Contração: ${st.ib2.compressionPct || '—'}%)</td>
          </tr>` : ''}
          ${sim.ttt1R != null || sim.ttt2R != null ? `
          <tr>
            <td style="padding: 4px 6px; color: #64748b;">Time to Target (TTT)</td>
            <td style="padding: 4px 6px; font-weight: 600;">+1R: ${sim.ttt1R != null ? sim.ttt1R + ' barras' : '—'} • +2R: ${sim.ttt2R != null ? sim.ttt2R + ' barras' : '—'} • +3R: ${sim.ttt3R != null ? sim.ttt3R + ' barras' : '—'}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  }

  // ==========================================
  // RENDERIZADOR DA VISÃO DO ATIVO / RUBRIC (HTML)
  // ==========================================

  function renderVisionAtivoHtml(sim) {
    const vision = resolveVisionAtivo(sim);
    if (!vision) return '';

    return `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 11px;">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span>🎯 Visão do Ativo (Trading Rubric no Momento da Entrada)</span>
          <span style="font-size: 12px; font-weight: 800; color: #166534;">Nota: ${escapeHtml(vision.grade || sim.grade || '—')}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 4px; color: #64748b; width: 25%;"><b>Força Relativa:</b></td>
            <td style="padding: 4px; color: #0f172a;">${escapeHtml(vision.relativeStrength?.text || '—')}</td>
            <td style="padding: 4px; color: #64748b; width: 25%;"><b>Ciclo de Mercado:</b></td>
            <td style="padding: 4px; color: #0f172a;">${escapeHtml(vision.marketCycle?.regime || '—')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 4px; color: #64748b;"><b>Tendência (MMs):</b></td>
            <td style="padding: 4px; color: #0f172a;">${escapeHtml(vision.trend?.formula || '—')}</td>
            <td style="padding: 4px; color: #64748b;"><b>Estrutura:</b></td>
            <td style="padding: 4px; color: #0f172a;">${escapeHtml(vision.structure?.label || '—')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 4px; color: #64748b;"><b>Gatilho:</b></td>
            <td style="padding: 4px; color: #0f172a;">${escapeHtml(vision.trigger?.display || sim.triggerName || '—')}</td>
            <td style="padding: 4px; color: #64748b;"><b>Volatilidade:</b></td>
            <td style="padding: 4px; color: #0f172a;">${escapeHtml(vision.volatility?.text || '—')}</td>
          </tr>
          <tr>
            <td style="padding: 4px; color: #64748b;"><b>Fundamentos:</b></td>
            <td style="padding: 4px; color: #0f172a;">${escapeHtml(vision.fundamentals?.evaluation || '—')}</td>
            <td style="padding: 4px; color: #64748b;"><b>Contexto:</b></td>
            <td style="padding: 4px; color: #0f172a;">${escapeHtml(vision.context?.title || '—')}</td>
          </tr>
        </table>
      </div>
    `;
  }

  // ==========================================
  // RENDERIZADOR DA TIMELINE DE EVENTOS (HTML)
  // ==========================================

  function renderTimelineHtml(sim) {
    if (!sim || !Array.isArray(sim.timeline) || !sim.timeline.length) return '';

    return `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 11px;">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px;">⏱️ Linha do Tempo da Operação</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; text-align: left;">
              <th style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1; width: 90px;">Data</th>
              <th style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1; width: 140px;">Evento</th>
              <th style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1;">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${sim.timeline.map(t => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 8px; color: #64748b; font-family: monospace;">${formatDateBR(t.date)}</td>
                <td style="padding: 5px 8px; font-weight: 600; color: #0f172a;">${escapeHtml(t.label || t.type)}</td>
                <td style="padding: 5px 8px; color: #334155;">${escapeHtml(t.desc || '')} ${t.price ? `• ${formatMoney(t.price)}` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ==========================================
  // FORMATAÇÃO DE UM TRADE INDIVIDUAL PARA DOC / PRINT
  // ==========================================

  function renderSingleTradeHtml(sim, options = {}) {
    const isDoc = options.format === 'doc';
    const statusLabel = getStatusLabel(sim.status);
    const statusCol = getStatusColor(sim.status);
    const gradeCol = getGradeBadgeColor(sim.grade);
    const duration = calculateDurationDays(sim);

    const entry = Number(sim.entryPrice) || 0;
    const stop = Number(sim.stopLoss) || 0;
    const risk = Math.max(0, Math.abs(entry - stop));
    const graphicRiskPct = entry > 0 ? ((risk / entry) * 100) : null;
    const target1R = entry > 0 ? (entry + risk) : null;
    const target2R = entry > 0 ? (entry + 2 * risk) : null;

    const resultColor = sim.resultR > 0 ? '#16a34a' : (sim.resultR < 0 ? '#dc2626' : '#475569');

    return `
      <div class="trade-page" style="${options.isLast ? '' : 'page-break-after: always; break-after: page;'} mso-break-type: section-break; margin-bottom: 24px; padding-bottom: 16px;">
        <!-- Cabeçalho do Trade -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
          <tr>
            <td style="vertical-align: middle;">
              <div style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                ${escapeHtml(sim.symbol)}
                <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-left: 6px;">${escapeHtml(sim.companyName || '')}</span>
              </div>
              <div style="font-size: 11px; color: #475569; margin-top: 3px;">
                <b>Gatilho:</b> ${escapeHtml(sim.triggerName)} • <b>Setor:</b> ${escapeHtml(sim.sector || 'Geral')} • <b>Data do Sinal:</b> ${formatDateBR(sim.signalDate)}
              </div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="display: inline-block; background: ${gradeCol.bg}; color: ${gradeCol.text}; border: 1px solid ${gradeCol.border}; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: 6px; margin-right: 6px;">
                GRADE ${escapeHtml(sim.grade || '—')}
              </span>
              <span style="display: inline-block; background: ${statusCol.bg}; color: ${statusCol.text}; border: 1px solid ${statusCol.border}; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px;">
                ${escapeHtml(statusLabel)}
              </span>
            </td>
          </tr>
        </table>

        <!-- Grid de Métricas Principais da Operação -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff;">
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; width: 25%; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Entrada Planejada</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formatMoney(sim.entryPrice)}</div>
            </td>
            <td style="padding: 8px; width: 25%; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Entrada Executada</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formatMoney(sim.executedEntryPrice)}</div>
            </td>
            <td style="padding: 8px; width: 25%; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Stop Loss Inicial</div>
              <div style="font-size: 14px; font-weight: 700; color: #dc2626; margin-top: 2px;">${formatMoney(sim.stopLoss)}</div>
            </td>
            <td style="padding: 8px; width: 25%;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Risco Gráfico</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formatMoney(risk)} (${formatPct(graphicRiskPct)})</div>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Alvo +1R</div>
              <div style="font-size: 14px; font-weight: 700; color: #059669; margin-top: 2px;">${formatMoney(target1R)}</div>
            </td>
            <td style="padding: 8px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Alvo +2R (Saída Base)</div>
              <div style="font-size: 14px; font-weight: 700; color: #16a34a; margin-top: 2px;">${formatMoney(target2R)}</div>
            </td>
            <td style="padding: 8px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Preço de Saída / Atual</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formatMoney(sim.exitPrice || sim.currentPrice)}</div>
            </td>
            <td style="padding: 8px;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Duração da Posição</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formatDurationDays(duration)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Resultado (R)</div>
              <div style="font-size: 15px; font-weight: 800; color: ${resultColor}; margin-top: 2px;">${formatR(sim.resultR)}</div>
            </td>
            <td style="padding: 8px; border-right: 1px solid #e2e8f0; background: #f0fdf4;">
              <div style="font-size: 9.5px; color: #166534; text-transform: uppercase; font-weight: 700;">MFE (Max Fav. Excursion)</div>
              <div style="font-size: 14px; font-weight: 700; color: #16a34a; margin-top: 2px;">${formatR(sim.mfeR)}</div>
            </td>
            <td style="padding: 8px; border-right: 1px solid #e2e8f0; background: #fef2f2;">
              <div style="font-size: 9.5px; color: #991b1b; text-transform: uppercase; font-weight: 700;">MAE (Max Adv. Excursion)</div>
              <div style="font-size: 14px; font-weight: 700; color: #dc2626; margin-top: 2px;">${formatR(sim.maeR)}</div>
            </td>
            <td style="padding: 8px;">
              <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Motivo de Saída / Status</div>
              <div style="font-size: 12px; font-weight: 600; color: #334155; margin-top: 2px;">${escapeHtml(sim.exitReason || statusLabel)}</div>
            </td>
          </tr>
        </table>

        <!-- Gráfico Vetorial SVG do Trade -->
        <div style="margin: 12px 0; border: 1px solid #0f172a; border-radius: 8px; overflow: hidden; background: #06150f;">
          ${generateTradeSnapshotSvg(sim, { width: 880, height: 320 })}
        </div>

        <!-- Estrutura Gráfica / Compressão (quando aplicável) -->
        ${renderStructureHtml(sim)}

        <!-- Visão do Ativo (Trading Rubric no Momento da Entrada) -->
        ${renderVisionAtivoHtml(sim)}

        <!-- Linha do Tempo da Operação -->
        ${renderTimelineHtml(sim)}

        <!-- Rodapé da Página -->
        <div style="margin-top: 14px; text-align: right; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px;">
          Healthy Trend Trader • Simulação de Trades • Estudo de ${escapeHtml(sim.symbol)} (${formatDateBR(sim.signalDate)})
        </div>
      </div>
    `;
  }

  // ==========================================
  // EXPORTAÇÃO PARA MICROSOFT WORD (.DOC)
  // ==========================================

  function toDoc(simulations, options = {}) {
    const list = Array.isArray(simulations) ? simulations : [];
    const dateStr = new Date().toLocaleDateString('pt-BR');

    const tradesHtml = list.map((sim, idx) => {
      const isLast = idx === list.length - 1;
      const tradeHtml = renderSingleTradeHtml(sim, { format: 'doc', isLast });
      if (idx === 0) return tradeHtml;
      return `<br clear="all" style="page-break-before: always; mso-break-type: section-break;" />\n${tradeHtml}`;
    }).join('\n');

    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Healthy Trend Trader — Estudo de Trades Simulados</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 210mm 297mm;
            margin: 15mm 15mm 15mm 15mm;
            mso-header-margin: 10mm;
            mso-footer-margin: 10mm;
            mso-paper-source: 0;
          }
          div.Section1 {
            page: Section1;
          }
          body {
            font-family: 'Segoe UI', Calibri, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.4;
            font-size: 11pt;
            margin: 0;
            padding: 0;
          }
          .trade-page {
            page-break-after: always;
            mso-break-type: section-break;
            clear: both;
          }
          table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${list.length === 0 ? '<p>Nenhum trade simulado selecionado para exportação.</p>' : tradesHtml}
        </div>
      </body>
      </html>
    `.trim();
  }

  // ==========================================
  // EXPORTAÇÃO PARA IMPRESSÃO / PDF (.HTML)
  // ==========================================

  function toPrintableHtml(simulations, options = {}) {
    const list = Array.isArray(simulations) ? simulations : [];
    const dateStr = new Date().toLocaleDateString('pt-BR');

    const tradesHtml = list.map((sim, idx) => {
      const isLast = idx === list.length - 1;
      return renderSingleTradeHtml(sim, { format: 'print', isLast });
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estudo de Trades Simulados — Healthy Trend Trader</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #f8fafc;
            margin: 0;
            padding: 0;
            line-height: 1.4;
          }
          .no-print {
            background: #064e3b;
            color: #ffffff;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .no-print button {
            background: #10b981;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .no-print button:hover {
            background: #059669;
          }
          .no-print button.secondary {
            background: rgba(255,255,255,0.15);
            margin-left: 8px;
          }
          .print-container {
            max-width: 1000px;
            margin: 24px auto;
            background: #ffffff;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            border-radius: 12px;
          }
          .trade-page {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @media print {
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .print-container {
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .trade-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              min-height: 98vh;
              box-sizing: border-box;
            }
            .trade-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div>
            <span style="font-weight: 800; font-size: 16px;">Healthy Trend Trader</span>
            <span style="opacity: 0.8; font-size: 13px; margin-left: 10px;">Estudo de Trades Simulados (${list.length} trades selecionados)</span>
          </div>
          <div>
            <button onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
            <button class="secondary" onclick="window.close()">✕ Fechar</button>
          </div>
        </div>

        <div class="print-container">
          ${list.length === 0 ? '<p style="text-align:center; padding: 40px; color: #64748b;">Nenhum trade para imprimir.</p>' : tradesHtml}
        </div>
      </body>
      </html>
    `.trim();
  }

  // ==========================================
  // EXPORTAÇÃO PARA EVERNOTE (.ENEX)
  // ==========================================

  function formatTradeForEnex(sim) {
    const statusLabel = getStatusLabel(sim.status);
    const duration = calculateDurationDays(sim);
    const vision = resolveVisionAtivo(sim);

    const entry = Number(sim.entryPrice) || 0;
    const stop = Number(sim.stopLoss) || 0;
    const risk = Math.max(0, Math.abs(entry - stop));
    const graphicRiskPct = entry > 0 ? ((risk / entry) * 100) : null;
    const target1R = entry > 0 ? (entry + risk) : null;
    const target2R = entry > 0 ? (entry + 2 * risk) : null;

    const resultColor = sim.resultR > 0 ? '#16a34a' : (sim.resultR < 0 ? '#dc2626' : '#475569');
    const resultStr = formatR(sim.resultR);

    const noteTitle = `${sim.symbol} — ${sim.triggerName} [Grade ${sim.grade || '—'}] (${resultStr !== '—' ? resultStr : statusLabel})`;

    const createdDate = toEvernoteDate(sim.signalDate || sim.entryDate);
    const updatedDate = toEvernoteDate(sim.exitDate || sim.entryDate || sim.signalDate);

    // Estrutura XML ENML estrita dentro de CDATA
    const enmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/en-note.dtd">
<en-note style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.4;">
  <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
    <div style="font-size: 24px; font-weight: bold; color: #0f172a;">
      ${escapeXml(sim.symbol)} <span style="font-size: 14px; color: #64748b;">${escapeXml(sim.companyName || '')}</span>
    </div>
    <div style="font-size: 12px; color: #475569; margin-top: 4px;">
      <b>Gatilho:</b> ${escapeXml(sim.triggerName)} | <b>Nota:</b> Grade ${escapeXml(sim.grade || '—')} | <b>Status:</b> ${escapeXml(statusLabel)} | <b>Setor:</b> ${escapeXml(sim.sector || 'Geral')}
    </div>
    <div style="font-size: 12px; color: #475569; margin-top: 2px;">
      <b>Data do Sinal:</b> ${formatDateBR(sim.signalDate)} | <b>Data de Entrada:</b> ${formatDateBR(sim.entryDate)} | <b>Data de Saída:</b> ${formatDateBR(sim.exitDate)} | <b>Duração:</b> ${formatDurationDays(duration)}
    </div>
  </div>

  <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; border: 1px solid #cbd5e1; width: 100%; margin-bottom: 16px; font-size: 12px;">
    <tr style="background-color: #f1f5f9;">
      <th style="text-align: left; width: 25%;">Parâmetro</th>
      <th style="text-align: left; width: 25%;">Valor Planejado</th>
      <th style="text-align: left; width: 25%;">Parâmetro</th>
      <th style="text-align: left; width: 25%;">Valor Executado</th>
    </tr>
    <tr>
      <td><b>Entrada Planejada:</b></td>
      <td>${formatMoney(sim.entryPrice)}</td>
      <td><b>Entrada Executada:</b></td>
      <td>${formatMoney(sim.executedEntryPrice)}</td>
    </tr>
    <tr>
      <td><b>Stop Loss Inicial:</b></td>
      <td style="color: #dc2626;">${formatMoney(sim.stopLoss)}</td>
      <td><b>Stop Atual / Saída:</b></td>
      <td>${formatMoney(sim.currentStop)}</td>
    </tr>
    <tr>
      <td><b>Alvo +1R:</b></td>
      <td style="color: #059669;">${formatMoney(target1R)}</td>
      <td><b>Alvo +2R:</b></td>
      <td style="color: #16a34a;">${formatMoney(target2R)}</td>
    </tr>
    <tr>
      <td><b>Risco Gráfico:</b></td>
      <td>${formatMoney(risk)} (${formatPct(graphicRiskPct)})</td>
      <td><b>Preço de Saída / Atual:</b></td>
      <td>${formatMoney(sim.exitPrice || sim.currentPrice)}</td>
    </tr>
    <tr style="background-color: #f8fafc;">
      <td><b>Resultado (R):</b></td>
      <td style="font-weight: bold; color: ${resultColor}; font-size: 14px;">${resultStr}</td>
      <td><b>Motivo de Saída:</b></td>
      <td>${escapeXml(sim.exitReason || statusLabel)}</td>
    </tr>
    <tr>
      <td><b>MFE (Máx. Favorável):</b></td>
      <td style="color: #16a34a; font-weight: bold;">${formatR(sim.mfeR)}</td>
      <td><b>MAE (Máx. Adversa):</b></td>
      <td style="color: #dc2626; font-weight: bold;">${formatR(sim.maeR)}</td>
    </tr>
  </table>

  ${sim.structure ? `
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 11px;">
    <div style="font-weight: bold; margin-bottom: 6px;">📦 Estrutura de Compressão (${escapeXml(sim.triggerName)})</div>
    <div>Candle-mãe: Máx ${formatMoney(sim.structure.motherCandle?.high)} / Mín ${formatMoney(sim.structure.motherCandle?.low)} (Range: ${formatMoney(sim.structure.motherCandle?.range)})</div>
    ${sim.structure.ib1 ? `<div>Inside Bar 1: Máx ${formatMoney(sim.structure.ib1.high)} / Mín ${formatMoney(sim.structure.ib1.low)} (Contração: ${sim.structure.ib1.compressionPct || '—'}%)</div>` : ''}
    ${sim.structure.ib2 ? `<div>Inside Bar 2: Máx ${formatMoney(sim.structure.ib2.high)} / Mín ${formatMoney(sim.structure.ib2.low)} (Contração: ${sim.structure.ib2.compressionPct || '—'}%)</div>` : ''}
    ${sim.ttt1R != null || sim.ttt2R != null ? `<div>Time to Target: +1R em ${sim.ttt1R ?? '—'} barras | +2R em ${sim.ttt2R ?? '—'} barras | +3R em ${sim.ttt3R ?? '—'} barras</div>` : ''}
  </div>` : ''}

  ${vision ? `
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 11px;">
    <div style="font-weight: bold; margin-bottom: 6px;">🎯 Trading Rubric no Momento da Entrada (Grade ${escapeXml(vision.grade || sim.grade || '—')})</div>
    <div>• Força Relativa: ${escapeXml(vision.relativeStrength?.text || '—')}</div>
    <div>• Ciclo de Mercado: ${escapeXml(vision.marketCycle?.regime || '—')}</div>
    <div>• Tendência: ${escapeXml(vision.trend?.formula || '—')}</div>
    <div>• Estrutura: ${escapeXml(vision.structure?.label || '—')}</div>
    <div>• Volatilidade: ${escapeXml(vision.volatility?.text || '—')}</div>
    <div>• Fundamentos: ${escapeXml(vision.fundamentals?.evaluation || '—')}</div>
    <div>• Contexto Geral: ${escapeXml(vision.context?.title || '—')}</div>
  </div>` : ''}

  ${Array.isArray(sim.timeline) && sim.timeline.length ? `
  <div style="margin-bottom: 16px; font-size: 11px;">
    <div style="font-weight: bold; margin-bottom: 6px;">⏱️ Linha do Tempo de Execução</div>
    <ul>
      ${sim.timeline.map(t => `<li><b>${formatDateBR(t.date)}</b> — ${escapeXml(t.label || t.type)}: ${escapeXml(t.desc || '')} ${t.price ? `(${formatMoney(t.price)})` : ''}</li>`).join('')}
    </ul>
  </div>` : ''}

  <hr/>
  <div style="font-size: 10px; color: #94a3b8; text-align: right;">
    Healthy Trend Trader • Simulação de Trades • Estudo de ${escapeXml(sim.symbol)}
  </div>
</en-note>`;

    return `
  <note>
    <title>${escapeXml(noteTitle)}</title>
    <content><![CDATA[${enmlContent}]]></content>
    <created>${createdDate}</created>
    <updated>${updatedDate}</updated>
    <tag>HealthyTrendTrader</tag>
    <tag>Simulador</tag>
    <tag>${escapeXml(sim.symbol)}</tag>
    <tag>${escapeXml(sim.triggerName)}</tag>
    <tag>Grade ${escapeXml(sim.grade || '—')}</tag>
    <tag>${escapeXml(statusLabel)}</tag>
    <note-attributes>
      <author>Healthy Trend Trader</author>
      <source>Simulador de Trades</source>
    </note-attributes>
  </note>
    `.trim();
  }

  function toEnex(simulations, options = {}) {
    const list = Array.isArray(simulations) ? simulations : [];
    const exportDate = toEvernoteDate();

    const notesXml = list.map(sim => formatTradeForEnex(sim)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/xml/item.dtd">
<en-export export-date="${exportDate}" application="Healthy Trend Trader" version="1.0">
${notesXml}
</en-export>`.trim();
  }

  // ==========================================
  // EXPORTAÇÃO PARA CSV TABULAR
  // ==========================================

  function toCsv(simulations, options = {}) {
    const list = Array.isArray(simulations) ? simulations : [];
    if (!list.length) return '';

    const headers = [
      'Ativo', 'Gatilho', 'Nota', 'Setor', 'Data do Sinal',
      'Preço Entrada', 'Stop Loss', 'Status', 'Duração (Dias)', 'Preço Executado', 'Data Entrada',
      'Preço Saída', 'Data Saída', 'Motivo Saída', 'Resultado (R)', 'MFE (R)', 'MAE (R)'
    ];

    const rows = list.map(s => [
      s.symbol,
      s.triggerName,
      s.grade || '—',
      s.sector || '—',
      s.signalDate || '—',
      s.entryPrice != null ? s.entryPrice.toFixed(2).replace('.', ',') : '',
      s.stopLoss != null ? s.stopLoss.toFixed(2).replace('.', ',') : '',
      getStatusLabel(s.status),
      calculateDurationDays(s) ?? '',
      s.executedEntryPrice != null ? s.executedEntryPrice.toFixed(2).replace('.', ',') : '',
      s.entryDate || '',
      s.exitPrice != null ? s.exitPrice.toFixed(2).replace('.', ',') : '',
      s.exitDate || '',
      s.exitReason || '',
      s.resultR != null ? s.resultR.toFixed(2).replace('.', ',') : '',
      s.mfeR != null ? s.mfeR.toFixed(2).replace('.', ',') : '',
      s.maeR != null ? s.maeR.toFixed(2).replace('.', ',') : ''
    ]);

    return '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');
  }

  // ==========================================
  // EXPORTAÇÃO DA API PÚBLICA DO MODEL
  // ==========================================

  return {
    toDoc,
    toPrintableHtml,
    toEnex,
    toCsv,
    formatTradeForEnex,
    generateTradeSnapshotSvg,
    formatMoney,
    formatR,
    formatPct,
    formatDateBR,
    formatDurationDays,
    toEvernoteDate,
    escapeHtml,
    escapeXml,
    getStatusLabel,
    getStatusColor,
    getGradeBadgeColor,
    resolveVisionAtivo,
    resolveCandles,
    calculateDurationDays
  };
}));
