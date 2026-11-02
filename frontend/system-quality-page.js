/**
 * Healthy Trend Trader — System Quality Page Controller (#systemquality)
 * Controlador oficial da tela: Qualidade Estatística do Sistema (Dados & Performance).
 *
 * Princípios fundamentais:
 * - Utiliza estritamente os resultados reais dos trades encerrados (synchronizedTrades).
 * - Nunca incorpora nem se mistura com dados hipotéticos do Simulador.
 * - Suporta filtros de período (30d, 90d, 12m, todo o histórico).
 * - Sincroniza dinamicamente os 4 cards superiores, distribuição em R, Rolling SQN e interpretação.
 */

(function (root) {
  'use strict';

  const state = {
    period: 'all'
  };

  function getRootElement() {
    return document.getElementById('systemquality');
  }

  function getClosedTrades() {
    try {
      const allTrades = Array.isArray(root.synchronizedTrades) ? root.synchronizedTrades : [];
      const now = Date.now();
      const periodDays = Number(state.period || 0);

      return allTrades.filter(trade => {
        if (!trade || trade.status !== 'closed') return false;

        if (periodDays > 0) {
          const events = Array.isArray(trade.events) ? trade.events : [];
          const closeEvent = [...events].reverse().find(e => e.type === 'close');
          const closedAt = new Date(closeEvent?.at || trade.updated_at || trade.created_at || 0).getTime();
          if (closedAt < now - periodDays * 86400000) return false;
        }

        return true;
      });
    } catch (_) {
      return [];
    }
  }

  function bindEvents(container) {
    if (!container) return;

    container.querySelectorAll('[data-sqn-period]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const p = btn.dataset.sqnPeriod;
        if (p && state.period !== p) {
          state.period = p;
          renderSystemQualityPage();
        }
      });
    });
  }

  function renderSystemQualityPage() {
    const rootEl = getRootElement();
    if (!rootEl) return;

    const sqnView = root.SystemQualityAnalytics;
    const sqnModel = root.SystemQualityAnalyticsModel;

    if (!sqnView || !sqnModel) {
      rootEl.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--text-muted,#94a3b8);">
          Carregando módulos de inteligência estatística...
        </div>
      `;
      return;
    }

    const closed = getClosedTrades();
    const report = sqnModel.calculateSystemQualityAnalytics(closed);

    rootEl.innerHTML = sqnView.generateSystemQualityPageHtml(report, state.period);
    bindEvents(rootEl);
  }

  root.renderSystemQualityPage = renderSystemQualityPage;
  root.SystemQualityPageController = {
    render: renderSystemQualityPage,
    getState: () => ({ ...state }),
    setPeriod: (period) => {
      state.period = period;
      renderSystemQualityPage();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
