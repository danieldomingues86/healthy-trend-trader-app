(function () {
  'use strict';
  if (typeof renderRelativeStrengthClassesPage !== 'function') return;

  const text = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const originalLabel = relativeClassLabel;
  const originalDescription = relativeClassDescription;
  const originalColor = relativeClassColor;
  relativeClassLabel = key => ({
    stock_ibov: text('Ações Ibovespa', 'Ibovespa stocks'),
    stock_other: text('Demais ações', 'Other stocks')
  })[key] || originalLabel(key);
  relativeClassDescription = key => ({
    stock_ibov: text('Somente componentes do Ibovespa. Todos competem no mesmo pelotão e usam o IBOV como benchmark.', 'Ibovespa constituents only. Every asset shares the same pack and uses IBOV as benchmark.'),
    stock_other: text('Ações fora do Ibovespa são separadas por benchmark. Small Caps usam o SMLL; os demais ativos usam o pelotão residual da B3.', 'Stocks outside Ibovespa are separated by benchmark. Small Caps use SMLL; remaining assets use the residual B3 peer group.')
  })[key] || originalDescription(key);
  relativeClassColor = key => ({ stock_ibov: '#238c64', stock_other: '#b48737' })[key] || originalColor(key);

  function equityTabs() {
    const nav = document.querySelector('#relativestrength .rs-class-tabs');
    if (!nav) return;
    const keys = ['stock_ibov', 'stock_other', 'fii', 'bdr'];
    nav.innerHTML = keys.map(key => {
      const item = relativeStrengthClassesState.classes[key] || {};
      const benchmark = key === 'stock_ibov' ? 'IBOV' : key === 'stock_other' ? 'SMLL + B3' : key === 'fii' ? 'IFIX' : text('Mercado internacional', 'International markets');
      return `<button type="button" class="rs-class-tab ${key} ${relativeStrengthClassesState.selected === key ? 'active' : ''}" onclick="selectRelativeStrengthClass('${key}')"><b>${relativeClassLabel(key)}</b><span>${benchmark}</span><small>${item.available ?? item.items?.length ?? 0} ${text('ativos no ranking', 'assets ranked')}</small></button>`;
    }).join('');
  }

  const baseRender = renderRelativeStrengthClassesPage;
  renderRelativeStrengthClassesPage = function () {
    if (relativeStrengthClassesState.selected === 'stock') relativeStrengthClassesState.selected = 'stock_ibov';
    baseRender();
    equityTabs();
  };

  const baseRows = renderRelativeStrengthClassRows;
  renderRelativeStrengthClassRows = function () {
    if (relativeStrengthClassesState.selected !== 'stock_other') return baseRows();
    const target = document.getElementById('relativeStrengthRows');
    if (!target) return;
    const items = relativeClassFilteredItems();
    let benchmark = '', bandKey = '';
    target.innerHTML = items.map((item, index) => {
      let headers = '';
      if (item.benchmark !== benchmark) {
        benchmark = item.benchmark;
        bandKey = '';
        headers += `<tr class="rs-benchmark-divider"><td colspan="8"><b>${benchmark}</b><span>${benchmark === 'SMLL' ? text('Small Caps comparadas ao índice Small Cap', 'Small Caps compared with the Small Cap index') : text('Ativos comparados somente ao pelotão residual da B3', 'Assets compared only with the residual B3 peer group')}</span></td></tr>`;
      }
      const band = relativeClassBandInfo(item.score);
      if (band.key !== bandKey) { headers += `<tr class="rs-band-divider rs-band-${band.key}"><td colspan="8">${band.title}</td></tr>`; bandKey = band.key; }
      const value = number => Number.isFinite(number) ? `${number >= 0 ? '+' : ''}${number.toFixed(1)}%` : '—';
      return `${headers}<tr class="rs-row-${band.key}"><td>${index + 1}</td><td><b>${item.symbol}</b><br><small>${item.name || item.symbol}</small></td><td>${item.sector || '—'}</td><td class="${item.m1 >= 0 ? 'rs-positive' : 'rs-negative'}">${value(item.m1)}</td><td class="${item.m3 >= 0 ? 'rs-positive' : 'rs-negative'}">${value(item.m3)}</td><td><span class="rs-score">${item.score}</span></td><td><span class="rs-template">${band.label}</span></td><td class="rs-table-chevron">›</td></tr>`;
    }).join('') || `<tr><td colspan="8"><div class="rs-class-empty">${relativeStrengthEmptyMessage()}</div></td></tr>`;
  };

  relativeStrengthClassesState.selected = 'stock_ibov';
  renderRelativeStrengthClassesPage();
}());
