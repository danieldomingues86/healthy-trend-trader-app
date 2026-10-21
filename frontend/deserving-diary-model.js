/**
 * HEALTHY TREND TRADER - DIÁRIO DO MERECIMENTO MODEL
 * 
 * Modelo de domínio para registro, revisão e análise da experiência
 * psicológica ao embolsar lucros no gráfico Diário.
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DeservingDiaryModel = factory();
  }
})(typeof window !== 'undefined' ? window : global, function () {
  'use strict';

  const EMOTIONS = [
    {
      id: 'tranquil_satisfied',
      label: 'Tranquilo e satisfeito',
      category: 'positive',
      icon: 'smile',
      color: '#10b981',
      description: 'Sensação de paz, dever cumprido e contentamento sereno.'
    },
    {
      id: 'surprised_speed',
      label: 'Surpreso com a rapidez',
      category: 'neutral',
      icon: 'zap',
      color: '#f59e0b',
      description: 'Quando o alvo é atingido em poucos candles e a velocidade impressiona.'
    },
    {
      id: 'anxious_tense',
      label: 'Ansioso ou tenso',
      category: 'tension',
      icon: 'frown',
      color: '#f97316',
      description: 'Dificuldade de relaxar mesmo com o resultado financeiro positivo.'
    },
    {
      id: 'greed_more',
      label: 'Com vontade de ganhar mais',
      category: 'tension',
      icon: 'trending-up',
      color: '#eab308',
      description: 'Impulso de segurar a posição além do alvo técnico estipulado.'
    },
    {
      id: 'fear_giveback',
      label: 'Medo de devolver o lucro',
      category: 'tension',
      icon: 'shield-alert',
      color: '#ef4444',
      description: 'Receio constante de que o mercado reverta antes de liquidar.'
    },
    {
      id: 'pride_discipline',
      label: 'Orgulho da disciplina',
      category: 'positive',
      icon: 'award',
      color: '#059669',
      description: 'Reconhecimento de ter executado rigorosamente o plano de trading.'
    },
    {
      id: 'guilt_uncomfortable',
      label: 'Desconforto ou culpa',
      category: 'tension',
      icon: 'alert-circle',
      color: '#8b5cf6',
      description: 'Sensação de não merecer um ganho expressivo ou rápido.'
    },
    {
      id: 'other',
      label: 'Outro',
      category: 'neutral',
      icon: 'message-circle',
      color: '#6b7280',
      description: 'Outra emoção ou reflexão subjetiva particular.'
    }
  ];

  const RESULT_TYPES = [
    { id: 'target_reached', label: 'Alvo atingido e lucro embolsado' },
    { id: 'plan_executed', label: 'Lucro realizado conforme o plano' },
    { id: 'partial_taken', label: 'Realização parcial do lucro' },
    { id: 'positive_experience', label: 'Outra experiência positiva' }
  ];

  const INSPIRATION_QUOTES = [
    {
      id: 'quote-1',
      title: 'O dinheiro pode chegar rápido, e está tudo bem.',
      body: 'Eu não preciso estranhar um resultado positivo só porque ele veio depressa. Se eu seguir meu plano e atingir meu objetivo, posso embolsar meu lucro, sentir satisfação e continuar meu dia em paz.'
    },
    {
      id: 'quote-2',
      title: 'Eu posso realizar um lucro de acordo com meu plano e sentir satisfação.',
      body: 'Seguir as regras não é apenas proteger o capital nas perdas, é também ter a serenidade de recolher os ganhos sem culpa ou ansiedade.'
    },
    {
      id: 'quote-3',
      title: 'Não preciso prolongar uma operação para provar que poderia ganhar mais.',
      body: 'O mercado continuará existindo amanhã. Cada alvo respeitado fortalece a minha identidade como operador disciplinado, consistente e próspero.'
    },
    {
      id: 'quote-4',
      title: 'Eu valorizo a disciplina de seguir meu processo.',
      body: 'O resultado financeiro é a consequência natural de um processo bem executado. Meu foco é me tornar o profissional que merece esse resultado.'
    },
    {
      id: 'quote-5',
      title: 'A recompensa celebra o momento; o diário registra o aprendizado.',
      body: 'Observar minhas emoções ao ganhar me ensina tanto quanto ao perder. Aprender a receber com serenidade é o alicerce da verdadeira longevidade no trading.'
    }
  ];

  const EMOTIONS_BY_ID = new Map(EMOTIONS.map(e => [e.id, e]));

  /**
   * Valida e sanitiza payload de registro do Diário do Merecimento
   */
  function validateEntryPayload(payload = {}) {
    const errors = [];
    const now = new Date();
    const defaultDate = now.toISOString().slice(0, 10);

    let entryDate = String(payload.entryDate || payload.entry_date || defaultDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      entryDate = defaultDate;
    }

    let ticker = String(payload.ticker || '').trim().toUpperCase();
    if (ticker.length > 50) {
      ticker = ticker.slice(0, 50);
    }

    let resultType = String(payload.resultType || payload.result_type || 'target_reached').trim();
    if (!RESULT_TYPES.some(r => r.id === resultType)) {
      resultType = 'target_reached';
    }

    let emotions = Array.isArray(payload.emotions) ? payload.emotions : [];
    emotions = emotions
      .map(e => String(e).trim())
      .filter(e => EMOTIONS_BY_ID.has(e));

    let emotionIntensity = null;
    const rawIntensity = payload.emotionIntensity != null ? payload.emotionIntensity : payload.emotion_intensity;
    if (rawIntensity !== '' && rawIntensity != null && !Number.isNaN(Number(rawIntensity))) {
      const num = Math.round(Number(rawIntensity));
      if (num >= 0 && num <= 10) {
        emotionIntensity = num;
      }
    }

    const thought = String(payload.thought || '').trim().slice(0, 4000);
    const professionalAction = String(payload.professionalAction || payload.professional_action || '').trim().slice(0, 4000);
    const learning = String(payload.learning || '').trim().slice(0, 4000);
    const gratitude = String(payload.gratitude || '').trim().slice(0, 4000);
    const revisitQuote = String(payload.revisitQuote || payload.revisit_quote || '').trim().slice(0, 1000);

    const attachmentUrl = payload.attachmentUrl || payload.attachment_url || null;
    const attachmentName = payload.attachmentName || payload.attachment_name || null;
    const attachmentSize = payload.attachmentSize != null ? Number(payload.attachmentSize) : (payload.attachment_size != null ? Number(payload.attachment_size) : null);
    const tradeId = payload.tradeId || payload.trade_id || null;

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: {
        entryDate,
        tradeId,
        ticker,
        resultType,
        emotions,
        emotionIntensity,
        thought,
        professionalAction,
        learning,
        gratitude,
        revisitQuote,
        attachmentUrl: typeof attachmentUrl === 'string' && attachmentUrl.length > 0 ? attachmentUrl : null,
        attachmentName: typeof attachmentName === 'string' && attachmentName.length > 0 ? attachmentName : null,
        attachmentSize: Number.isFinite(attachmentSize) && attachmentSize > 0 ? attachmentSize : null
      }
    };
  }

  /**
   * Calcula as métricas de evolução emocional com base nos registros reais.
   * Não inventa conclusões se não houver dados suficientes.
   */
  function calculateEvolution(entries = [], period = '30d') {
    if (!Array.isArray(entries)) entries = [];

    const now = new Date();
    let cutoffDate = null;
    if (period === '30d') {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    const filtered = entries.filter(e => {
      if (!cutoffDate) return true;
      const d = new Date(e.entryDate || e.entry_date);
      return !Number.isNaN(d.getTime()) && d >= cutoffDate;
    });

    const totalCount = filtered.length;

    // Frequência de emoções
    const emotionFrequencies = {};
    EMOTIONS.forEach(em => { emotionFrequencies[em.id] = 0; });

    let anxietySum = 0;
    let anxietyCount = 0;
    let tranquilitySum = 0;
    let tranquilityCount = 0;
    let planAdherenceCount = 0;

    filtered.forEach(entry => {
      const ems = Array.isArray(entry.emotions) ? entry.emotions : [];
      const intensity = typeof entry.emotionIntensity === 'number' ? entry.emotionIntensity : (typeof entry.emotion_intensity === 'number' ? entry.emotion_intensity : 5);

      ems.forEach(emId => {
        if (emotionFrequencies[emId] !== undefined) {
          emotionFrequencies[emId]++;
        }
      });

      const hasAnxiety = ems.some(em => ['anxious_tense', 'fear_giveback', 'guilt_uncomfortable', 'greed_more'].includes(em));
      const hasTranquility = ems.some(em => ['tranquil_satisfied', 'pride_discipline'].includes(em));

      if (hasAnxiety) {
        anxietySum += intensity;
        anxietyCount++;
      }
      if (hasTranquility) {
        tranquilitySum += intensity;
        tranquilityCount++;
      }

      // Plano seguido: se relatou ação profissional válida ou resultado conforme o plano
      const profAction = String(entry.professionalAction || entry.professional_action || '').trim();
      const resType = String(entry.resultType || entry.result_type || '');
      if (profAction.length > 5 || resType === 'plan_executed' || resType === 'target_reached') {
        planAdherenceCount++;
      }
    });

    const anxietyAvg = anxietyCount > 0 ? Number((anxietySum / anxietyCount).toFixed(1)) : (totalCount > 0 ? 0 : 0);
    const tranquilityAvg = tranquilityCount > 0 ? Number((tranquilitySum / tranquilityCount).toFixed(1)) : (totalCount > 0 ? 0 : 0);
    const planExecutionPct = totalCount > 0 ? Math.round((planAdherenceCount / totalCount) * 100) : 100;

    // Pontos cronológicos para o gráfico de evolução
    // Ordena do mais antigo para o mais recente
    const sortedChronological = [...filtered].sort((a, b) => {
      const da = new Date(a.entryDate || a.entry_date || 0).getTime();
      const db = new Date(b.entryDate || b.entry_date || 0).getTime();
      return da - db;
    });

    const chartPoints = sortedChronological.map(e => {
      const ems = Array.isArray(e.emotions) ? e.emotions : [];
      const intensity = typeof e.emotionIntensity === 'number' ? e.emotionIntensity : (typeof e.emotion_intensity === 'number' ? e.emotion_intensity : 5);
      const rawDate = String(e.entryDate || e.entry_date || '').slice(0, 10);
      const parts = rawDate.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : rawDate;

      const hasAnxiety = ems.some(em => ['anxious_tense', 'fear_giveback', 'guilt_uncomfortable', 'greed_more'].includes(em));
      const hasTranquility = ems.some(em => ['tranquil_satisfied', 'pride_discipline'].includes(em));

      return {
        date: rawDate,
        label,
        ticker: e.ticker || '',
        intensity,
        anxiety: hasAnxiety ? intensity : (hasTranquility ? Math.max(0, 10 - intensity) : 3),
        tranquility: hasTranquility ? intensity : (hasAnxiety ? Math.max(0, 10 - intensity) : 7)
      };
    });

    return {
      period,
      totalCount,
      anxietyAvg,
      tranquilityAvg,
      planExecutionPct,
      emotionFrequencies,
      hasEnoughData: totalCount >= 2,
      chartPoints
    };
  }

  /**
   * Formata data para apresentação em português
   */
  function formatDateBr(dateStr) {
    if (!dateStr) return '';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Retorna metadados de uma emoção por ID
   */
  function getEmotionMeta(emotionId) {
    return EMOTIONS_BY_ID.get(emotionId) || {
      id: emotionId,
      label: emotionId,
      category: 'neutral',
      color: '#6b7280',
      icon: 'message-circle'
    };
  }

  /**
   * Retorna frase inspiradora por índice ou aleatória
   */
  function getInspirationQuote(index = null) {
    if (typeof index === 'number' && index >= 0 && index < INSPIRATION_QUOTES.length) {
      return INSPIRATION_QUOTES[index];
    }
    const idx = Math.floor(Math.random() * INSPIRATION_QUOTES.length);
    return INSPIRATION_QUOTES[idx];
  }

  return {
    EMOTIONS,
    RESULT_TYPES,
    INSPIRATION_QUOTES,
    validateEntryPayload,
    calculateEvolution,
    formatDateBr,
    getEmotionMeta,
    getInspirationQuote
  };
});
