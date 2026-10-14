(function (root) {
  'use strict';

  const RM = root.RebuildModeModel;

  function renderRebuildPage() {
    if (typeof root.go === 'function') {
      root.go('mission');
      return;
    }
    const rootEl = document.getElementById('rebuildRoot');
    if (!rootEl && typeof root.renderMissionPage === 'function') {
      root.renderMissionPage();
      return;
    }

    const state = RM ? RM.getRebuildState() : { isActive: false, maxRiskPct: 0.001 };

    const html = `
      <div style="max-width:1200px;margin:0 auto;padding:24px 28px 60px;color:#f1f5f9;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <button type="button" onclick="go('tradertraining')" style="background:transparent;border:none;color:#94a3b8;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;">
            ← Treinamento
          </button>
          <span style="font-size:12px;font-weight:700;color:${state.isActive ? '#facc15' : '#64748b'};">
            ${state.isActive ? '● REBUILD MODE ATIVADO' : '○ REBUILD MODE DESATIVADO'}
          </span>
        </div>

        <div class="card" style="background:#091a14;border:1px solid ${state.isActive ? 'rgba(234, 179, 8, 0.4)' : 'rgba(34, 197, 94, 0.2)'};border-radius:24px;padding:32px;box-shadow:0 16px 40px rgba(0,0,0,0.5);margin-bottom:24px;">
          <div class="card-head" style="margin-bottom:20px;">
            <div>
              <div style="font-size:11px;font-weight:900;letter-spacing:0.12em;color:#34d399;text-transform:uppercase;">PROTOCOLO DE RECUPERAÇÃO</div>
              <h1 style="font-size:32px;margin:6px 0 8px;font-weight:900;color:#ffffff;">Rebuild Mode</h1>
              <p style="color:#cbd5e1;font-size:15px;max-width:720px;line-height:1.5;margin:0;">
                O Rebuild Mode é um estado de segurança para proteger o capital e recuperar a estabilidade emocional do trader após drawdowns ou sequências de perdas.
              </p>
            </div>
            <div>
              <button type="button" onclick="window.toggleRebuildMode()" class="primary" style="background:${state.isActive ? '#b45309' : '#059669'};color:#ffffff;padding:12px 24px;font-size:14px;border-radius:12px;font-weight:800;cursor:pointer;border:none;">
                ${state.isActive ? 'Desativar Rebuild Mode' : 'Ativar Rebuild Mode'}
              </button>
            </div>
          </div>

          <div class="grid" style="grid-template-columns:repeat(3, 1fr);gap:18px;margin-top:28px;">
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
              <div style="font-size:24px;margin-bottom:8px;">🛡️</div>
              <b style="color:#ffffff;font-size:16px;display:block;margin-bottom:6px;">Risco Reduzido Obrigatório</b>
              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
                O risco máximo por trade é travado em <b>0,10% a 0,25%</b>. Isso remove a pressão financeira e permite focar exclusivamente na execução técnica.
              </p>
            </div>

            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
              <div style="font-size:24px;margin-bottom:8px;">🎯</div>
              <b style="color:#ffffff;font-size:16px;display:block;margin-bottom:6px;">Um Trade por Vez</b>
              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
                É terminantemente proibido abrir múltiplas posições. Você só abre a próxima operação quando a atual estiver totalmente encerrada.
              </p>
            </div>

            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
              <div style="font-size:24px;margin-bottom:8px;">🌄</div>
              <b style="color:#ffffff;font-size:16px;display:block;margin-bottom:6px;">Integrado com a Missão</b>
              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
                Crie uma <a href="javascript:void(0)" onclick="go('mission')" style="color:#34d399;font-weight:700;">Missão</a> para percorrer uma jornada com meta clara (ex: 20 trades disciplinados) e comemore ao final.
              </p>
            </div>
          </div>
        </div>

        <div style="background:rgba(16,38,28,0.7);border:1px solid rgba(52,211,153,0.2);border-radius:18px;padding:22px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <b style="color:#ffffff;font-size:15px;display:block;">Deseja iniciar sua jornada de foco agora?</b>
            <span style="color:#94a3b8;font-size:13px;">Acesse a tela Missão para definir seu objetivo e acompanhar o caminho passo a passo.</span>
          </div>
          <button type="button" onclick="go('mission')" style="background:#059669;color:#ffffff;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:800;cursor:pointer;">
            Ir para a Missão →
          </button>
        </div>
      </div>
    `;

    rootEl.innerHTML = html;
  }

  window.toggleRebuildMode = function () {
    if (!RM) return;
    const current = RM.getRebuildState();
    if (current.isActive) {
      RM.deactivateRebuild();
    } else {
      RM.activateRebuild({ maxRiskPct: 0.001 });
    }
    renderRebuildPage();
    if (typeof root.renderMissionPage === 'function') {
      root.renderMissionPage();
    }
  };

  root.renderRebuildPage = renderRebuildPage;
})(typeof window !== 'undefined' ? window : this);
