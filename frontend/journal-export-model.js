(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.JournalExportModel = model;
}(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const AI_DEFAULT_INSTRUCTIONS = 'Analise este Diário do Trader procurando padrões recorrentes entre contexto de mercado, qualidade da execução, respeito ao plano, estado emocional e intensidade emocional. Identifique comportamentos que aparecem nos melhores e piores dias, possíveis gatilhos emocionais, violações recorrentes do processo e mudanças ao longo do período. Baseie suas conclusões somente nos dados fornecidos.';

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatDateBR(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return 'Data não informada';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateStr;
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }

  function getWeekdayBR(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return '';
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d), 12);
    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return weekdays[date.getDay()] || '';
  }

  function getTodayStr(refDate = new Date()) {
    return `${refDate.getFullYear()}-${pad(refDate.getMonth() + 1)}-${pad(refDate.getDate())}`;
  }

  function marketStateLabel(state) {
    if (state === 'up') return 'Saudável';
    if (state === 'transition') return 'Transição';
    if (state === 'down') return 'Down';
    return state || 'Não informado';
  }

  function planRespectedLabel(plan) {
    if (plan === 'yes') return 'Respeitado';
    if (plan === 'partial') return 'Parcialmente respeitado';
    if (plan === 'no') return 'Não respeitado';
    return plan || 'Não informado';
  }

  function impactLabel(impact) {
    if (impact === 'yes') return 'Sim';
    if (impact === 'some') return 'Um pouco';
    if (impact === 'no') return 'Não';
    return impact || 'Não informado';
  }

  function intensityLabel(intensity) {
    if (intensity == null || intensity === '') return 'Não informada';
    const n = Number(intensity);
    if (n === 1) return '1/5 (Calmo)';
    if (n === 5) return '5/5 (Muito ativado)';
    return `${n}/5`;
  }

  function isRecordEmpty(record) {
    if (!record) return true;
    const t = record.technical || {};
    const e = record.emotional || {};
    const s = record.shared || {};
    const hasTech = Boolean(t.marketState || (t.session && t.session.trim()) || t.executionScore != null || t.planRespected || (t.tradeIds && t.tradeIds.length));
    const hasEmot = Boolean((e.states && e.states.length) || e.intensity != null || (e.note && e.note.trim()) || e.impact || (e.impactNote && e.impactNote.trim()));
    const hasShared = Boolean((s.lesson && s.lesson.trim()) || (s.patterns && s.patterns.trim()) || (s.observations && s.observations.trim()));
    return !hasTech && !hasEmot && !hasShared;
  }

  /**
   * Filter records according to period and options.
   */
  function filterRecords(records, options = {}) {
    if (!Array.isArray(records)) return [];
    const now = options.referenceDate ? new Date(options.referenceDate) : new Date();
    const todayStr = getTodayStr(now);
    const activeMonth = options.activeMonth || todayStr.slice(0, 7);
    const period = options.period || 'current_month';

    let startDate = null;
    let endDate = null;

    if (period === 'today') {
      startDate = todayStr;
      endDate = todayStr;
    } else if (period === 'current_month') {
      startDate = `${activeMonth}-01`;
      endDate = `${activeMonth}-31`;
    } else if (period === 'last_30_days') {
      const past = new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000));
      startDate = getTodayStr(past);
      endDate = todayStr;
    } else if (period === 'last_3_months') {
      const past = new Date(now.getTime() - (89 * 24 * 60 * 60 * 1000));
      startDate = getTodayStr(past);
      endDate = todayStr;
    } else if (period === 'current_year') {
      const year = activeMonth.slice(0, 4) || String(now.getFullYear());
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else if (period === 'custom') {
      startDate = options.startDate || '1970-01-01';
      endDate = options.endDate || '2099-12-31';
    }

    const filtered = records.filter(r => {
      if (!r || !r.date) return false;
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      if (options.skipEmpty && isRecordEmpty(r)) return false;
      return true;
    });

    // Default: reverse chronological order (newest first)
    filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return filtered;
  }

  /**
   * Format filtered records into Markdown.
   */
  function toMarkdown(records, options = {}) {
    const periodLabel = options.periodLabel || 'Período selecionado';
    const forAi = options.forAi !== false;
    const content = options.content || 'all'; // 'all' | 'technical' | 'emotional'
    const instructions = options.instructions || AI_DEFAULT_INSTRUCTIONS;

    const lines = [];
    lines.push('HEALTHY TREND TRADER');
    lines.push('DIÁRIO DO TRADER');
    lines.push(`Período: ${periodLabel}`);
    lines.push(`Total de registros: ${records.length} dia(s)`);
    lines.push('');

    if (records.length === 0) {
      lines.push('Nenhum registro encontrado para o período selecionado.');
      lines.push('');
    }

    records.forEach(r => {
      const dateFormatted = formatDateBR(r.date);
      const weekday = getWeekdayBR(r.date);
      const t = r.technical || {};
      const e = r.emotional || {};
      const s = r.shared || {};

      lines.push('========================================');
      lines.push(`${dateFormatted}${weekday ? ' — ' + weekday : ''}`);
      lines.push('========================================');
      lines.push('');

      const includeTech = content === 'all' || content === 'technical';
      const includeEmot = content === 'all' || content === 'emotional';

      if (includeTech) {
        lines.push('DIÁRIO TÉCNICO');
        lines.push('');
        lines.push('Contexto do mercado:');
        lines.push(marketStateLabel(t.marketState));
        lines.push('');
        lines.push('Observações:');
        lines.push((t.session && t.session.trim()) || '[Sem observações registradas]');
        lines.push('');
        lines.push('Qualidade da execução:');
        lines.push(t.executionScore != null ? `${t.executionScore}/10` : 'Não informada');
        lines.push('');
        lines.push('Plano:');
        lines.push(planRespectedLabel(t.planRespected));
        lines.push('');

        if (Array.isArray(t.tradeIds) && t.tradeIds.length > 0) {
          lines.push('Trades vinculados:');
          lines.push(t.tradeIds.join(', '));
          lines.push('');
        }
      }

      if (includeTech && includeEmot) {
        lines.push('----------------------------------------');
        lines.push('');
      }

      if (includeEmot) {
        lines.push('DIÁRIO EMOCIONAL');
        lines.push('');
        lines.push('Estados emocionais:');
        lines.push((Array.isArray(e.states) && e.states.length) ? e.states.join(' / ') : 'Nenhum estado registrado');
        lines.push('');
        lines.push('Intensidade emocional:');
        lines.push(intensityLabel(e.intensity));
        lines.push('');
        lines.push('O que estava acontecendo comigo:');
        lines.push((e.note && e.note.trim()) || '[Sem notas emocionais]');
        lines.push('');
        lines.push('Minhas emoções interferiram na execução?');
        const imp = impactLabel(e.impact);
        const impNote = e.impactNote && e.impactNote.trim() ? ` — ${e.impactNote.trim()}` : '';
        lines.push(`${imp}${impNote}`);
        lines.push('');
      }

      if (s.lesson && s.lesson.trim()) {
        lines.push('Lição do dia:');
        lines.push(s.lesson.trim());
        lines.push('');
      }

      if (s.patterns && s.patterns.trim()) {
        lines.push('Padrões e soluções:');
        lines.push(s.patterns.trim());
        lines.push('');
      }
    });

    if (forAi && records.length > 0) {
      lines.push('========================================');
      lines.push('INSTRUÇÕES PARA A IA');
      lines.push('========================================');
      lines.push(instructions);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format filtered records into Plain Text.
   */
  function toPlainText(records, options = {}) {
    return toMarkdown(records, options);
  }

  /**
   * Format filtered records into JSON.
   */
  function toJson(records, options = {}) {
    const periodLabel = options.periodLabel || 'Período selecionado';
    const forAi = options.forAi !== false;
    const content = options.content || 'all';
    const instructions = options.instructions || AI_DEFAULT_INSTRUCTIONS;

    const payload = {
      app: 'Healthy Trend Trader',
      title: 'Diário do Trader',
      exportedAt: new Date().toISOString(),
      period: periodLabel,
      recordsCount: records.length,
      content,
      records: records.map(r => {
        const item = {
          date: r.date,
          dateFormatted: formatDateBR(r.date),
          weekday: getWeekdayBR(r.date)
        };

        if (content === 'all' || content === 'technical') {
          item.technical = {
            marketState: r.technical?.marketState || null,
            marketStateLabel: marketStateLabel(r.technical?.marketState),
            session: r.technical?.session || '',
            executionScore: r.technical?.executionScore ?? null,
            planRespected: r.technical?.planRespected || null,
            planRespectedLabel: planRespectedLabel(r.technical?.planRespected),
            linkedTrades: r.technical?.tradeIds || []
          };
        }

        if (content === 'all' || content === 'emotional') {
          item.emotional = {
            states: r.emotional?.states || [],
            intensity: r.emotional?.intensity ?? null,
            intensityLabel: intensityLabel(r.emotional?.intensity),
            note: r.emotional?.note || '',
            impact: r.emotional?.impact || null,
            impactLabel: impactLabel(r.emotional?.impact),
            impactNote: r.emotional?.impactNote || ''
          };
        }

        item.shared = {
          lesson: r.shared?.lesson || '',
          patterns: r.shared?.patterns || ''
        };

        return item;
      })
    };

    if (forAi) {
      payload.aiInstructions = instructions;
    }

    return JSON.stringify(payload, null, 2);
  }

  function escapeCsvCell(val) {
    if (val == null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  }

  /**
   * Format filtered records into CSV with UTF-8 BOM.
   */
  function toCsv(records, options = {}) {
    const content = options.content || 'all';
    const headers = ['Data', 'Dia da Semana'];

    if (content === 'all' || content === 'technical') {
      headers.push('Contexto do Mercado', 'Qualidade da Execucao', 'Plano Respeitado', 'Observacoes Tecnicas');
    }

    if (content === 'all' || content === 'emotional') {
      headers.push('Estados Emocionais', 'Intensidade Emocional', 'Interferencia Emocional', 'Detalhes Interferencia', 'O Que Estava Acontecendo');
    }

    headers.push('Licao do Dia', 'Padroes e Solucoes');

    const rows = [headers.map(escapeCsvCell).join(';')];

    records.forEach(r => {
      const t = r.technical || {};
      const e = r.emotional || {};
      const s = r.shared || {};
      const row = [
        formatDateBR(r.date),
        getWeekdayBR(r.date)
      ];

      if (content === 'all' || content === 'technical') {
        row.push(
          marketStateLabel(t.marketState),
          t.executionScore != null ? String(t.executionScore) : '',
          planRespectedLabel(t.planRespected),
          t.session || ''
        );
      }

      if (content === 'all' || content === 'emotional') {
        row.push(
          (e.states || []).join(' / '),
          e.intensity != null ? String(e.intensity) : '',
          impactLabel(e.impact),
          e.impactNote || '',
          e.note || ''
        );
      }

      row.push(
        s.lesson || '',
        s.patterns || ''
      );

      rows.push(row.map(escapeCsvCell).join(';'));
    });

    // Return with UTF-8 BOM so Excel opens with proper accents
    return '\uFEFF' + rows.join('\r\n');
  }

  /**
   * Main export dispatcher.
   */
  function formatExport(records, options = {}) {
    const format = (options.format || 'markdown').toLowerCase();
    if (format === 'json') return toJson(records, options);
    if (format === 'csv') return toCsv(records, options);
    if (format === 'text' || format === 'txt') return toPlainText(records, options);
    return toMarkdown(records, options);
  }

  /**
   * Suggested file name based on period and format.
   */
  function getExportFilename(options = {}) {
    const format = (options.format || 'markdown').toLowerCase();
    const period = options.period || 'current_month';
    const activeMonth = options.activeMonth || getTodayStr().slice(0, 7);
    const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : format === 'text' || format === 'txt' ? 'txt' : 'md';

    let base = `diario-trader-${activeMonth}`;
    if (period === 'today') {
      base = `diario-trader-${options.referenceDate ? getTodayStr(new Date(options.referenceDate)) : getTodayStr()}`;
    } else if (period === 'last_30_days') {
      base = `diario-trader-ultimos-30-dias`;
    } else if (period === 'last_3_months') {
      base = `diario-trader-ultimos-3-meses`;
    } else if (period === 'current_year') {
      base = `diario-trader-${activeMonth.slice(0, 4)}`;
    } else if (period === 'custom') {
      base = `diario-trader-${options.startDate || 'inicio'}_${options.endDate || 'fim'}`;
    } else if (period === 'all') {
      base = `diario-trader-historico-completo`;
    }

    return `${base}.${ext}`;
  }

  return {
    AI_DEFAULT_INSTRUCTIONS,
    formatDateBR,
    getWeekdayBR,
    getTodayStr,
    marketStateLabel,
    planRespectedLabel,
    impactLabel,
    intensityLabel,
    isRecordEmpty,
    filterRecords,
    toMarkdown,
    toPlainText,
    toJson,
    toCsv,
    formatExport,
    getExportFilename
  };
}));
