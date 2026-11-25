/**
 * ManualBlocks — Biblioteca de componentes visuais, didáticos e interativos para o Manual 2.0
 * Renderiza blocos modulares no Flipbook com suporte completo a temas, acessibilidade e responsividade.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ManualBlocks = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPicture(baseName, alt, extraClass) {
    var webpPath = 'assets/manual-learning/' + baseName + '.webp';
    var jpgPath = 'assets/manual-learning/' + baseName + '.jpg';
    var cls = extraClass ? ' ' + extraClass : '';
    return [
      '<picture class="ht-block-picture' + cls + '">',
      '  <source srcset="' + webpPath + '" type="image/webp">',
      '  <img src="' + jpgPath + '" alt="' + esc(alt) + '" loading="lazy" class="ht-block-img" onerror="this.onerror=null;this.classList.add(\'is-fallback\');">',
      '</picture>'
    ].join('\n');
  }

  // Helper para cálculo trigonométrico de fatias radiais do SVG
  function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  function describeArc(x, y, innerRadius, outerRadius, startAngle, endAngle) {
    var startOuter = polarToCartesian(x, y, outerRadius, endAngle);
    var endOuter = polarToCartesian(x, y, outerRadius, startAngle);
    var startInner = polarToCartesian(x, y, innerRadius, endAngle);
    var endInner = polarToCartesian(x, y, innerRadius, startAngle);

    var largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', startInner.x.toFixed(2), startInner.y.toFixed(2),
      'L', startOuter.x.toFixed(2), startOuter.y.toFixed(2),
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x.toFixed(2), endOuter.y.toFixed(2),
      'L', endInner.x.toFixed(2), endInner.y.toFixed(2),
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x.toFixed(2), startInner.y.toFixed(2),
      'Z'
    ].join(' ');
  }

  // Ícones 3D/Vetoriais dos Cards de Princípios
  function getPrincipleSvg(kind) {
    if (kind === 'shield' || kind === 0) {
      return [
        '<svg viewBox="0 0 64 64" width="46" height="46" class="ht-principle-svg" aria-hidden="true">',
        '  <defs>',
        '    <linearGradient id="htShieldGrad" x1="0" y1="0" x2="1" y2="1">',
        '      <stop offset="0%" stop-color="#34d399"/>',
        '      <stop offset="55%" stop-color="#10b981"/>',
        '      <stop offset="100%" stop-color="#047857"/>',
        '    </linearGradient>',
        '    <filter id="htIconDrop" x="-15%" y="-15%" width="130%" height="135%">',
        '      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#064e3b" flood-opacity="0.22"/>',
        '    </filter>',
        '  </defs>',
        '  <g filter="url(#htIconDrop)">',
        '    <path d="M32 6 L54 14 V31 C54 45.5 44.2 55.4 32 59 C19.8 55.4 10 45.5 10 31 V14 L32 6 Z" fill="url(#htShieldGrad)" stroke="#a7f3d0" stroke-width="2"/>',
        '    <path d="M32 10 L50 16.8 V30.5 C50 42.4 41.8 50.8 32 54.2 V10 Z" fill="#ffffff" fill-opacity="0.12"/>',
        '    <path d="M23 32.5 L29.2 38.8 L42 25.5" fill="none" stroke="#ffffff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>',
        '  </g>',
        '</svg>'
      ].join('');
    }
    if (kind === 'brain' || kind === 1) {
      return [
        '<svg viewBox="0 0 64 64" width="46" height="46" class="ht-principle-svg" aria-hidden="true">',
        '  <defs>',
        '    <linearGradient id="htBrainGradL" x1="0" y1="0" x2="1" y2="1">',
        '      <stop offset="0%" stop-color="#93c5fd"/>',
        '      <stop offset="55%" stop-color="#3b82f6"/>',
        '      <stop offset="100%" stop-color="#1d4ed8"/>',
        '    </linearGradient>',
        '    <linearGradient id="htBrainGradR" x1="0" y1="0" x2="1" y2="1">',
        '      <stop offset="0%" stop-color="#60a5fa"/>',
        '      <stop offset="60%" stop-color="#2563eb"/>',
        '      <stop offset="100%" stop-color="#1e40af"/>',
        '    </linearGradient>',
        '  </defs>',
        '  <g filter="url(#htIconDrop)">',
        '    <path d="M31 14 C23 14 17 19 17 25 C13 26.5 11 31 12.5 36 C11 40.5 14 46 19.5 47.5 C21 51.5 26 53.5 31 51.5 Z" fill="url(#htBrainGradL)" stroke="#bfdbfe" stroke-width="1.5"/>',
        '    <path d="M33 14 C41 14 47 19 47 25 C51 26.5 53 31 51.5 36 C53 40.5 50 46 44.5 47.5 C43 51.5 38 53.5 33 51.5 Z" fill="url(#htBrainGradR)" stroke="#bfdbfe" stroke-width="1.5"/>',
        '    <path d="M22 25 C25 23 28 25 28 28 M19 35 C23 33 26 35 27 38 M22 43 C25 41 28 42 29 45" fill="none" stroke="#eff6ff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>',
        '    <path d="M42 25 C39 23 36 25 36 28 M45 35 C41 33 38 35 37 38 M42 43 C39 41 36 42 35 45" fill="none" stroke="#eff6ff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>',
        '  </g>',
        '</svg>'
      ].join('');
    }
    if (kind === 'consistency' || kind === 'chart' || kind === 2) {
      return [
        '<svg viewBox="0 0 64 64" width="46" height="46" class="ht-principle-svg" aria-hidden="true">',
        '  <defs>',
        '    <linearGradient id="htBarGrad" x1="0" y1="0" x2="0" y2="1">',
        '      <stop offset="0%" stop-color="#34d399"/>',
        '      <stop offset="100%" stop-color="#059669"/>',
        '    </linearGradient>',
        '  </defs>',
        '  <g filter="url(#htIconDrop)">',
        '    <rect x="14" y="38" width="9" height="16" rx="2.5" fill="url(#htBarGrad)"/>',
        '    <rect x="27.5" y="29" width="9" height="25" rx="2.5" fill="url(#htBarGrad)"/>',
        '    <rect x="41" y="19" width="9" height="35" rx="2.5" fill="url(#htBarGrad)"/>',
        '    <path d="M13 30 Q26 24 44 10" fill="none" stroke="#065f46" stroke-width="4" stroke-linecap="round"/>',
        '    <path d="M36 9 H45.5 V18.5" fill="none" stroke="#065f46" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
        '  </g>',
        '</svg>'
      ].join('');
    }
    // Default / Target (Probabilidade)
    return [
      '<svg viewBox="0 0 64 64" width="46" height="46" class="ht-principle-svg" aria-hidden="true">',
      '  <defs>',
      '    <linearGradient id="htTargetGrad" x1="0" y1="0" x2="1" y2="1">',
      '      <stop offset="0%" stop-color="#fbbf24"/>',
      '      <stop offset="55%" stop-color="#f59e0b"/>',
      '      <stop offset="100%" stop-color="#d97706"/>',
      '    </linearGradient>',
      '  </defs>',
      '  <g filter="url(#htIconDrop)">',
      '    <circle cx="30" cy="34" r="21" fill="url(#htTargetGrad)"/>',
      '    <circle cx="30" cy="34" r="14.5" fill="#ffffff"/>',
      '    <circle cx="30" cy="34" r="9" fill="url(#htTargetGrad)"/>',
      '    <circle cx="30" cy="34" r="3.8" fill="#ffffff"/>',
      '    <line x1="31" y1="33" x2="52" y2="12" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round"/>',
      '    <polygon points="30,34 38,31 33,26" fill="#1e293b"/>',
      '    <polygon points="48,10 55,9 54,16 49,15" fill="#0d9488"/>',
      '  </g>',
      '</svg>'
    ].join('');
  }

  // Ícones vetoriais brancos desenhados dentro de cada fatia da Roda dos 6 Pilares
  function getPillarSliceSvgIcon(idx, x, y) {
    var tx = x.toFixed(1);
    var ty = y.toFixed(1);
    if (idx === 0) {
      // 1. Operação Diária: Barras ascendentes + seta
      return [
        '<g transform="translate(' + tx + ',' + ty + ')" class="ht-slice-svg-ico">',
        '  <rect x="-11" y="1" width="4.5" height="9" rx="1" fill="#ffffff"/>',
        '  <rect x="-4" y="-4" width="4.5" height="14" rx="1" fill="#ffffff"/>',
        '  <rect x="3" y="-9" width="4.5" height="19" rx="1" fill="#ffffff"/>',
        '  <path d="M-12 -2 L3 -13 M-2 -13 H4 V-7" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
        '</g>'
      ].join('');
    }
    if (idx === 1) {
      // 2. Análise de Mercado: Lupa
      return [
        '<g transform="translate(' + tx + ',' + ty + ')" class="ht-slice-svg-ico">',
        '  <circle cx="-2" cy="-2" r="8.5" fill="none" stroke="#ffffff" stroke-width="2.6"/>',
        '  <line x1="4.5" y1="4.5" x2="11" y2="11" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>',
        '  <path d="M-6 0 L-3 -3 L0 -1 L4 -5" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
        '</g>'
      ].join('');
    }
    if (idx === 2) {
      // 3. Carteira e Risco: Camadas / Stack
      return [
        '<g transform="translate(' + tx + ',' + ty + ')" class="ht-slice-svg-ico">',
        '  <polygon points="0,-10 12,-4 0,2 -12,-4" fill="#ffffff"/>',
        '  <polyline points="-12,1 0,7 12,1" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
        '  <polyline points="-12,6 0,12 12,6" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
        '</g>'
      ].join('');
    }
    if (idx === 3) {
      // 4. Desempenho e Simulações: Gráfico de barras
      return [
        '<g transform="translate(' + tx + ',' + ty + ')" class="ht-slice-svg-ico">',
        '  <rect x="-10" y="0" width="5" height="10" rx="1" fill="#ffffff"/>',
        '  <rect x="-2.5" y="-8" width="5" height="18" rx="1" fill="#ffffff"/>',
        '  <rect x="5" y="-4" width="5" height="14" rx="1" fill="#ffffff"/>',
        '</g>'
      ].join('');
    }
    if (idx === 4) {
      // 5. Mentalidade & Zen: Flor de Lótus
      return [
        '<g transform="translate(' + tx + ',' + ty + ')" class="ht-slice-svg-ico">',
        '  <path d="M0 -10 C4 -4 4 4 0 9 C-4 4 -4 -4 0 -10 Z" fill="#ffffff"/>',
        '  <path d="M0 9 C-5 7 -11 1 -10 -5 C-5 -4 -2 1 0 9 Z" fill="#ffffff" fill-opacity="0.92"/>',
        '  <path d="M0 9 C5 7 11 1 10 -5 C5 -4 2 1 0 9 Z" fill="#ffffff" fill-opacity="0.92"/>',
        '  <path d="M-13 5 C-8 9 8 9 13 5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>',
        '</g>'
      ].join('');
    }
    // 6. Recursos & Governança: Engrenagem
    return [
      '<g transform="translate(' + tx + ',' + ty + ')" class="ht-slice-svg-ico">',
      '  <circle cx="0" cy="0" r="5" fill="none" stroke="#ffffff" stroke-width="2.8"/>',
      '  <path d="M0 -11 V-8 M0 8 V11 M-11 0 H-8 M8 0 H11 M-7.8 -7.8 L-5.6 -5.6 M5.6 5.6 L7.8 7.8 M7.8 -7.8 L5.6 -5.6 M-5.6 5.6 L-7.8 7.8" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/>',
      '</g>'
    ].join('');
  }

  function renderLightbulbSvg() {
    return [
      '<svg viewBox="0 0 48 48" width="38" height="38" class="ht-lightbulb-svg" aria-hidden="true">',
      '  <defs>',
      '    <radialGradient id="htBulbGlow" cx="50%" cy="38%" r="55%">',
      '      <stop offset="0%" stop-color="#fef08a"/>',
      '      <stop offset="55%" stop-color="#facc15"/>',
      '      <stop offset="100%" stop-color="#eab308"/>',
      '    </radialGradient>',
      '  </defs>',
      '  <circle cx="24" cy="20" r="18" fill="#fef08a" fill-opacity="0.35"/>',
      '  <path d="M24 6 C16.3 6 10 12.1 10 19.6 C10 24.4 12.6 28.6 16.5 31 L17.5 35.5 H30.5 L31.5 31 C35.4 28.6 38 24.4 38 19.6 C38 12.1 31.7 6 24 6 Z" fill="url(#htBulbGlow)" stroke="#ca8a04" stroke-width="1.5"/>',
      '  <path d="M18 14 C19.5 11.5 22 10.5 24.5 10.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>',
      '  <rect x="18.5" y="36" width="11" height="3.2" rx="1.5" fill="#94a3b8" stroke="#64748b" stroke-width="1"/>',
      '  <rect x="20" y="39.8" width="8" height="3" rx="1.5" fill="#64748b"/>',
      '</svg>'
    ].join('');
  }

  function renderLaptopMockupSvg() {
    return [
      '<div class="ht-laptop-mockup-frame" aria-hidden="true">',
      '  <div class="ht-laptop-screen-bezel">',
      '    <div class="ht-laptop-camera"></div>',
      '    <svg viewBox="0 0 380 215" class="ht-laptop-ui-svg" role="img" aria-label="Interface do Healthy Trend Trader com os 6 Pilares">',
      '      <defs>',
      '        <linearGradient id="htLapBg" x1="0" y1="0" x2="1" y2="1">',
      '          <stop offset="0%" stop-color="#0b241c"/>',
      '          <stop offset="100%" stop-color="#05130e"/>',
      '        </linearGradient>',
      '        <linearGradient id="htChartArea" x1="0" y1="0" x2="0" y2="1">',
      '          <stop offset="0%" stop-color="#10b981" stop-opacity="0.32"/>',
      '          <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>',
      '        </linearGradient>',
      '      </defs>',
      '      <rect width="380" height="215" rx="6" fill="url(#htLapBg)"/>',
      '      <!-- SIDEBAR DOS 6 PILARES -->',
      '      <rect width="122" height="215" fill="#0f2d23"/>',
      '      <line x1="122" y1="0" x2="122" y2="215" stroke="#1e4638" stroke-width="1"/>',
      '      <!-- Logo Header -->',
      '      <rect x="11" y="18" width="3" height="6" rx="1" fill="#34d399"/>',
      '      <rect x="15.5" y="15" width="3" height="9" rx="1" fill="#34d399"/>',
      '      <rect x="20" y="11" width="3" height="13" rx="1" fill="#10b981"/>',
      '      <text x="27" y="21" font-size="7.5" font-weight="800" fill="#ecfdf5" font-family="system-ui, sans-serif">Healthy Trend Trader</text>',
      '      <!-- 6 Pillar Menu Items -->',
      '      <g transform="translate(10, 36)">',
      '        <rect x="0" y="0" width="102" height="20" rx="4" fill="#164e3b"/>',
      '        <circle cx="10" cy="10" r="5" fill="#10b981"/>',
      '        <text x="20" y="13" font-size="7.2" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">Operação Diária</text>',
      '      </g>',
      '      <g transform="translate(10, 62)">',
      '        <circle cx="10" cy="10" r="5" fill="#3b82f6" fill-opacity="0.85"/>',
      '        <text x="20" y="13" font-size="7.2" font-weight="600" fill="#cbd5e1" font-family="system-ui, sans-serif">Análise de Mercado</text>',
      '      </g>',
      '      <g transform="translate(10, 88)">',
      '        <circle cx="10" cy="10" r="5" fill="#8b5cf6" fill-opacity="0.85"/>',
      '        <text x="20" y="13" font-size="7.2" font-weight="600" fill="#cbd5e1" font-family="system-ui, sans-serif">Carteira &amp; Risco</text>',
      '      </g>',
      '      <g transform="translate(10, 114)">',
      '        <circle cx="10" cy="10" r="5" fill="#f59e0b" fill-opacity="0.85"/>',
      '        <text x="20" y="13" font-size="7.2" font-weight="600" fill="#cbd5e1" font-family="system-ui, sans-serif">Desempenho</text>',
      '      </g>',
      '      <g transform="translate(10, 140)">',
      '        <circle cx="10" cy="10" r="5" fill="#14b8a6" fill-opacity="0.85"/>',
      '        <text x="20" y="13" font-size="7.2" font-weight="600" fill="#cbd5e1" font-family="system-ui, sans-serif">Mentalidade &amp; Zen</text>',
      '      </g>',
      '      <g transform="translate(10, 166)">',
      '        <circle cx="10" cy="10" r="5" fill="#64748b" fill-opacity="0.85"/>',
      '        <text x="20" y="13" font-size="7.2" font-weight="600" fill="#cbd5e1" font-family="system-ui, sans-serif">Recursos</text>',
      '      </g>',
      '      <!-- MAIN WORKSPACE AREA -->',
      '      <rect x="132" y="12" width="236" height="18" rx="4" fill="#123529" stroke="#1e4638" stroke-width="0.8"/>',
      '      <rect x="140" y="19" width="52" height="4" rx="2" fill="#94a3b8" fill-opacity="0.6"/>',
      '      <circle cx="356" cy="21" r="3.5" fill="#34d399"/>',
      '      <!-- Candlestick Chart Panel -->',
      '      <rect x="132" y="36" width="236" height="118" rx="5" fill="#091d16" stroke="#1b4334" stroke-width="1"/>',
      '      <line x1="140" y1="62" x2="360" y2="62" stroke="#14382b" stroke-width="0.6" stroke-dasharray="2 2"/>',
      '      <line x1="140" y1="92" x2="360" y2="92" stroke="#14382b" stroke-width="0.6" stroke-dasharray="2 2"/>',
      '      <line x1="140" y1="122" x2="360" y2="122" stroke="#14382b" stroke-width="0.6" stroke-dasharray="2 2"/>',
      '      <path d="M142 136 Q180 112 205 104 T255 108 T310 74 T356 48 L356 146 L142 146 Z" fill="url(#htChartArea)"/>',
      '      <path d="M142 136 Q180 112 205 104 T255 108 T310 74 T356 48" fill="none" stroke="#10b981" stroke-width="1.8"/>',
      '      <!-- Candlesticks -->',
      '      <g stroke-width="1.2">',
      '        <line x1="148" y1="128" x2="148" y2="142" stroke="#ef4444"/><rect x="145.5" y="131" width="5" height="7" rx="1" fill="#ef4444"/>',
      '        <line x1="158" y1="118" x2="158" y2="134" stroke="#10b981"/><rect x="155.5" y="121" width="5" height="9" rx="1" fill="#10b981"/>',
      '        <line x1="168" y1="110" x2="168" y2="126" stroke="#10b981"/><rect x="165.5" y="113" width="5" height="9" rx="1" fill="#10b981"/>',
      '        <line x1="178" y1="114" x2="178" y2="128" stroke="#ef4444"/><rect x="175.5" y="117" width="5" height="7" rx="1" fill="#ef4444"/>',
      '        <line x1="188" y1="100" x2="188" y2="118" stroke="#10b981"/><rect x="185.5" y="103" width="5" height="11" rx="1" fill="#10b981"/>',
      '        <line x1="198" y1="92" x2="198" y2="108" stroke="#10b981"/><rect x="195.5" y="95" width="5" height="9" rx="1" fill="#10b981"/>',
      '        <line x1="208" y1="95" x2="208" y2="110" stroke="#ef4444"/><rect x="205.5" y="98" width="5" height="8" rx="1" fill="#ef4444"/>',
      '        <line x1="218" y1="101" x2="218" y2="115" stroke="#ef4444"/><rect x="215.5" y="103" width="5" height="8" rx="1" fill="#ef4444"/>',
      '        <line x1="228" y1="106" x2="228" y2="120" stroke="#ef4444"/><rect x="225.5" y="109" width="5" height="7" rx="1" fill="#ef4444"/>',
      '        <line x1="238" y1="98" x2="238" y2="114" stroke="#10b981"/><rect x="235.5" y="101" width="5" height="9" rx="1" fill="#10b981"/>',
      '        <line x1="248" y1="90" x2="248" y2="105" stroke="#10b981"/><rect x="245.5" y="93" width="5" height="9" rx="1" fill="#10b981"/>',
      '        <line x1="258" y1="84" x2="258" y2="98" stroke="#10b981"/><rect x="255.5" y="86" width="5" height="9" rx="1" fill="#10b981"/>',
      '        <line x1="268" y1="88" x2="268" y2="101" stroke="#ef4444"/><rect x="265.5" y="90" width="5" height="7" rx="1" fill="#ef4444"/>',
      '        <line x1="278" y1="78" x2="278" y2="94" stroke="#10b981"/><rect x="275.5" y="81" width="5" height="10" rx="1" fill="#10b981"/>',
      '        <line x1="288" y1="68" x2="288" y2="85" stroke="#10b981"/><rect x="285.5" y="71" width="5" height="11" rx="1" fill="#10b981"/>',
      '        <line x1="298" y1="72" x2="298" y2="86" stroke="#ef4444"/><rect x="295.5" y="75" width="5" height="7" rx="1" fill="#ef4444"/>',
      '        <line x1="308" y1="60" x2="308" y2="77" stroke="#10b981"/><rect x="305.5" y="63" width="5" height="11" rx="1" fill="#10b981"/>',
      '        <line x1="318" y1="52" x2="318" y2="68" stroke="#10b981"/><rect x="315.5" y="55" width="5" height="10" rx="1" fill="#10b981"/>',
      '        <line x1="328" y1="44" x2="328" y2="60" stroke="#10b981"/><rect x="325.5" y="47" width="5" height="10" rx="1" fill="#10b981"/>',
      '        <line x1="338" y1="48" x2="338" y2="62" stroke="#ef4444"/><rect x="335.5" y="50" width="5" height="7" rx="1" fill="#ef4444"/>',
      '        <line x1="348" y1="40" x2="348" y2="56" stroke="#10b981"/><rect x="345.5" y="43" width="5" height="10" rx="1" fill="#34d399"/>',
      '      </g>',
      '      <!-- Bottom 3 Metric Cards -->',
      '      <rect x="132" y="160" width="94" height="44" rx="4" fill="#0f2d23" stroke="#1e4638" stroke-width="0.8"/>',
      '      <rect x="140" y="168" width="38" height="3.5" rx="1.5" fill="#94a3b8" fill-opacity="0.7"/>',
      '      <rect x="140" y="177" width="52" height="5" rx="2.5" fill="#10b981"/>',
      '      <rect x="140" y="185" width="64" height="5" rx="2.5" fill="#34d399"/>',
      '      <rect x="140" y="193" width="76" height="5" rx="2.5" fill="#059669"/>',
      '      <rect x="232" y="160" width="64" height="44" rx="4" fill="#0f2d23" stroke="#1e4638" stroke-width="0.8"/>',
      '      <rect x="240" y="168" width="30" height="3.5" rx="1.5" fill="#94a3b8" fill-opacity="0.7"/>',
      '      <rect x="240" y="177" width="44" height="5" rx="2.5" fill="#10b981"/>',
      '      <rect x="240" y="185" width="34" height="5" rx="2.5" fill="#14b8a6"/>',
      '      <rect x="240" y="193" width="48" height="5" rx="2.5" fill="#38bdf8"/>',
      '      <rect x="302" y="160" width="66" height="44" rx="4" fill="#0f2d23" stroke="#1e4638" stroke-width="0.8"/>',
      '      <rect x="310" y="168" width="32" height="3.5" rx="1.5" fill="#94a3b8" fill-opacity="0.7"/>',
      '      <rect x="310" y="177" width="46" height="5" rx="2.5" fill="#10b981"/>',
      '      <rect x="310" y="185" width="40" height="5" rx="2.5" fill="#6ee7b7"/>',
      '      <rect x="310" y="193" width="50" height="5" rx="2.5" fill="#34d399"/>',
      '    </svg>',
      '  </div>',
      '  <div class="ht-laptop-base"><div class="ht-laptop-notch"></div></div>',
      '</div>'
    ].join('\n');
  }

  var blockRenderers = {
    // 1. HERO BLOCK: Suporta tanto o Split Editorial Hero (Cap 1.1) quanto o Hero Compacto (Cap 1.2)
    'hero': function (block) {
      var isSplit = block.variant === 'split-editorial' || Boolean(block.philosophyHeading || block.titleHighlight);

      var titleHtml = '';
      if (block.titlePrefix && block.titleHighlight) {
        titleHtml = '<h1 class="ht-hero-title">' + esc(block.titlePrefix) + ' <em class="ht-hero-title-highlight">' + esc(block.titleHighlight) + '</em></h1>';
      } else {
        titleHtml = '<h1 class="ht-hero-title">' + esc(block.title) + '</h1>';
      }

      if (isSplit) {
        return [
          '<div class="ht-block ht-block-hero is-split-editorial">',
          '  <div class="ht-hero-split-grid">',
          '    <div class="ht-hero-split-copy">',
          block.kicker ? '      <span class="ht-hero-kicker">' + esc(block.kicker) + '</span>' : '',
          '      ' + titleHtml,
          block.subtitle ? '      <p class="ht-hero-subtitle">' + esc(block.subtitle) + '</p>' : '',
          '      <div class="ht-hero-divider" aria-hidden="true"><span class="ht-hero-divider-bar"></span></div>',
          block.lead ? '      <p class="ht-hero-lead-inline">' + esc(block.lead) + '</p>' : '',
          block.philosophyHeading ? [
            '      <div class="ht-hero-philosophy">',
            '        <h3 class="ht-philosophy-heading">' + esc(block.philosophyHeading) + '</h3>',
            block.philosophyText ? '        <p class="ht-philosophy-text">' + esc(block.philosophyText) + '</p>' : '',
            '      </div>'
          ].join('\n') : '',
          '    </div>',
          block.image ? [
            '    <div class="ht-hero-split-art">',
            '      ' + renderPicture(block.image, block.title || 'Healthy Trend Trader', 'ht-hero-split-pic'),
            '    </div>'
          ].join('\n') : '',
          '  </div>',
          '</div>'
        ].join('\n');
      }

      return [
        '<div class="ht-block ht-block-hero">',
        '  <div class="ht-hero-header">',
        block.kicker ? '    <span class="ht-hero-kicker">' + esc(block.kicker) + '</span>' : '',
        '    ' + titleHtml,
        block.subtitle ? '    <p class="ht-hero-subtitle">' + esc(block.subtitle) + '</p>' : '',
        '    <div class="ht-hero-divider" aria-hidden="true"><span class="ht-hero-divider-bar"></span></div>',
        '  </div>',
        block.image ? '  <div class="ht-hero-media">' + renderPicture(block.image, block.title, 'ht-hero-pic') + '</div>' : '',
        '</div>'
      ].join('\n');
    },

    // 2. LEAD BLOCK: Parágrafo de destaque conceitual
    'lead': function (block) {
      return [
        '<div class="ht-block ht-block-lead">',
        '  <p class="ht-lead-text">' + esc(block.text) + '</p>',
        '</div>'
      ].join('\n');
    },

    // 3. QUOTE BLOCK: Citação editorial com ênfase
    'quote': function (block) {
      return [
        '<div class="ht-block ht-block-quote">',
        '  <div class="ht-quote-mark" aria-hidden="true">“</div>',
        '  <blockquote class="ht-quote-content">',
        '    <p>' + esc(block.quote) + '</p>',
        block.author ? '    <cite>— ' + esc(block.author) + '</cite>' : '',
        '  </blockquote>',
        '</div>'
      ].join('\n');
    },

    // 4. PRINCIPLES BLOCK: Cards dos Princípios Fundamentais (3 ou 4 colunas com ícones 3D SVG)
    'principles': function (block) {
      var items = Array.isArray(block.principles) ? block.principles : [];
      var colClass = items.length === 4 ? 'cols-4' : 'cols-3';
      var html = [
        '<div class="ht-block ht-block-principles">',
        block.heading ? '  <div class="ht-principles-header"><h3 class="ht-block-heading">' + esc(block.heading) + '</h3>' + (block.description ? '<p class="ht-block-sub">' + esc(block.description) + '</p>' : '') + '</div>' : '',
        '  <div class="ht-principles-grid ' + colClass + '">'
      ];

      items.forEach(function (p, idx) {
        var svgArt = getPrincipleSvg(p.svgIcon || idx);
        html.push([
          '    <div class="ht-principle-card is-centered-card">',
          '      <div class="ht-principle-art-wrap">',
          '        ' + svgArt,
          '      </div>',
          '      <div class="ht-principle-body">',
          '        <h4 class="ht-principle-name">' + esc(p.name) + '</h4>',
          '        <p class="ht-principle-desc">' + esc(p.description) + '</p>',
          '      </div>',
          '    </div>'
        ].join('\n'));
      });

      html.push('  </div>');
      html.push('</div>');
      return html.join('\n');
    },

    // 5. STORY BLOCK: Storytelling Impulsivo vs. Disciplinado
    'story': function (block) {
      var left = block.left || {};
      var right = block.right || {};

      return [
        '<div class="ht-block ht-block-story">',
        block.heading ? '  <div class="ht-story-header"><h3 class="ht-block-heading">' + esc(block.heading) + '</h3>' + (block.subtitle ? '<p class="ht-block-sub">' + esc(block.subtitle) + '</p>' : '') + '</div>' : '',
        block.image ? '  <div class="ht-story-media">' + renderPicture(block.image, block.heading || 'História', 'ht-story-pic') + '</div>' : '',
        '  <div class="ht-story-comparison-grid">',
        '    <div class="ht-story-side impulsive">',
        '      <div class="ht-story-badge">⚠️ ' + esc(left.title || 'O Trader Impulsivo') + '</div>',
        '      <ul class="ht-story-list">',
        (Array.isArray(left.points) ? left.points.map(function (pt) { return '<li><span class="ht-story-bullet">✕</span> ' + esc(pt) + '</li>'; }).join('\n') : ''),
        '      </ul>',
        left.outcome ? '      <div class="ht-story-outcome"><strong>Resultado:</strong> ' + esc(left.outcome) + '</div>' : '',
        '    </div>',
        '    <div class="ht-story-side disciplined">',
        '      <div class="ht-story-badge">🛡️ ' + esc(right.title || 'O Trader Disciplinado') + '</div>',
        '      <ul class="ht-story-list">',
        (Array.isArray(right.points) ? right.points.map(function (pt) { return '<li><span class="ht-story-bullet">✓</span> ' + esc(pt) + '</li>'; }).join('\n') : ''),
        '      </ul>',
        right.outcome ? '      <div class="ht-story-outcome"><strong>Resultado:</strong> ' + esc(right.outcome) + '</div>' : '',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 6. VISUAL CALLOUT BLOCK: Banner panorâmico de montanha / jornada com frase de impacto
    'visual-callout': function (block) {
      var isMountainBanner = block.variant === 'mountain-banner' || block.image === 'mlx-mountain-hiker-banner';
      if (isMountainBanner) {
        return [
          '<div class="ht-block ht-block-visual-callout is-mountain-banner">',
          '  <div class="ht-vc-banner-media">' + renderPicture(block.image || 'mlx-mountain-hiker-banner', block.quote || 'Você não precisa prever o mercado. Precisa aprender a reagir corretamente a ele.', 'ht-vc-banner-pic') + '</div>',
          '  <span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">' + esc(block.quote) + '</span>',
          '</div>'
        ].join('\n');
      }

      return [
        '<div class="ht-block ht-block-visual-callout">',
        block.image ? '  <div class="ht-vc-media">' + renderPicture(block.image, block.quote || 'Visual Callout', 'ht-vc-pic') + '</div>' : '',
        '  <div class="ht-vc-overlay">',
        block.quote ? '    <p class="ht-vc-quote">“' + esc(block.quote) + '”</p>' : '',
        block.author ? '    <span class="ht-vc-author">— ' + esc(block.author) + '</span>' : '',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 7. PILLAR WHEEL BLOCK: Infográfico Radial Interativo dos 6 Pilares + Lista Numerada Completa (1 a 6)
    'pillar-wheel': function (block, ctx) {
      var pillars = Array.isArray(block.pillars) ? block.pillars : [];
      var activePillarId = (ctx && ctx.activePillarId) || (pillars[0] ? pillars[0].id : 'pilar-1');

      var total = pillars.length || 6;
      var cx = 180;
      var cy = 180;
      var innerR = 62;
      var outerR = 166;
      var step = 360 / total;

      var gradDefs = [
        ['htSliceGrad0', '#22c55e', '#0d8a5e'],
        ['htSliceGrad1', '#3898ec', '#1d64b8'],
        ['htSliceGrad2', '#7c5ce6', '#5234a8'],
        ['htSliceGrad3', '#fbbf24', '#d97706'],
        ['htSliceGrad4', '#2dd4bf', '#0d9488'],
        ['htSliceGrad5', '#4f7cc4', '#2b4f8c']
      ];

      var slicesSvg = pillars.map(function (p, idx) {
        // Fatia 0 centrada no topo (0 graus na convenção polarToCartesian onde 0 = 12h)
        var startA = idx * step - (step / 2);
        var endA = startA + step;
        var pathData = describeArc(cx, cy, innerR, outerR, startA, endA);
        var midA = startA + (step / 2);
        var centerPos = polarToCartesian(cx, cy, (innerR + outerR) / 2, midA);
        var isActive = p.id === activePillarId;

        var labelLines = Array.isArray(p.wheelLabels)
          ? p.wheelLabels
          : [
              (idx + 1) + '. ' + (p.name.split(' ')[0] || ''),
              p.name.split(' ').slice(1).join(' ')
            ];

        var iconSvg = getPillarSliceSvgIcon(idx, centerPos.x, centerPos.y - 14);
        var gradId = gradDefs[idx] ? gradDefs[idx][0] : 'htSliceGrad0';

        return [
          '<g class="ht-wheel-slice-group ' + (isActive ? 'is-active' : '') + '" data-action="select-pillar" data-pillar-id="' + p.id + '" tabindex="0" role="button" aria-label="' + esc((idx + 1) + '. ' + p.name) + '">',
          '  <path d="' + pathData + '" fill="url(#' + gradId + ')" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" class="ht-wheel-slice" />',
          '  ' + iconSvg,
          '  <text x="' + centerPos.x.toFixed(1) + '" y="' + (centerPos.y + 7).toFixed(1) + '" text-anchor="middle" font-size="11.2" font-weight="800" fill="#ffffff" class="ht-wheel-slice-label">' + esc(labelLines[0]) + '</text>',
          labelLines[1] ? '  <text x="' + centerPos.x.toFixed(1) + '" y="' + (centerPos.y + 20).toFixed(1) + '" text-anchor="middle" font-size="11.2" font-weight="800" fill="#ffffff" class="ht-wheel-slice-label">' + esc(labelLines[1]) + '</text>' : '',
          '</g>'
        ].join('\n');
      }).join('\n');

      var numberedCardsHtml = pillars.map(function (p, idx) {
        var isSel = p.id === activePillarId;
        var badgeColor = p.color || (gradDefs[idx] ? gradDefs[idx][2] : '#10b981');
        return [
          '<div class="ht-pillar-list-item ' + (isSel ? 'is-active' : '') + '" data-action="select-pillar" data-pillar-id="' + p.id + '" tabindex="0" role="button" aria-pressed="' + (isSel ? 'true' : 'false') + '">',
          '  <span class="ht-pillar-list-num" style="background:' + badgeColor + ';">' + (p.number || (idx + 1)) + '</span>',
          '  <div class="ht-pillar-list-copy">',
          '    <div class="ht-pillar-list-head">',
          '      <h4 class="ht-pillar-list-title">' + esc(p.name) + '</h4>',
          p.route ? '      <button type="button" class="ht-pillar-list-open" data-action="launch-route" data-route="' + p.route + '" title="Abrir ' + esc(p.name) + '">Abrir →</button>' : '',
          '    </div>',
          '    <p class="ht-pillar-list-desc">' + esc(p.shortDescription || p.description) + '</p>',
          '  </div>',
          '</div>'
        ].join('\n');
      }).join('\n');

      return [
        '<div class="ht-block ht-block-pillar-wheel" id="htPillarWheelBlock">',
        '  <div class="ht-wheel-showcase-grid">',
        '    <div class="ht-wheel-graphic-wrap">',
        '      <svg viewBox="0 0 360 360" class="ht-wheel-svg" role="img" aria-label="Infográfico dos 6 Pilares do Sistema">',
        '        <defs>',
        '          <filter id="htWheelShadow" x="-15%" y="-15%" width="130%" height="130%">',
        '            <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#0f2922" flood-opacity="0.18" />',
        '          </filter>',
        '          <filter id="htHubShadow" x="-20%" y="-20%" width="140%" height="140%">',
        '            <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0f2922" flood-opacity="0.16" />',
        '          </filter>',
        gradDefs.map(function (g) {
          return '          <linearGradient id="' + g[0] + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + g[1] + '"/><stop offset="100%" stop-color="' + g[2] + '"/></linearGradient>';
        }).join('\n'),
        '        </defs>',
        '        <g filter="url(#htWheelShadow)">',
        slicesSvg,
        '        </g>',
        '        <!-- HUB CENTRAL -->',
        '        <circle cx="' + cx + '" cy="' + cy + '" r="' + (innerR - 3) + '" fill="#ffffff" stroke="#e2ece8" stroke-width="3" filter="url(#htHubShadow)" class="ht-wheel-hub" />',
        '        <g transform="translate(' + cx + ',' + (cy - 18) + ')">',
        '          <rect x="-13" y="3" width="5" height="9" rx="1" fill="#10b981"/>',
        '          <rect x="-5" y="-2" width="5" height="14" rx="1" fill="#059669"/>',
        '          <rect x="3" y="-8" width="5" height="20" rx="1" fill="#047857"/>',
        '          <path d="M-14 0 L4 -12 M-1 -12 H5 V-6" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
        '        </g>',
        '        <text x="' + cx + '" y="' + (cy + 10) + '" text-anchor="middle" font-size="14" font-weight="800" fill="#0f2922" class="ht-wheel-hub-label">Healthy</text>',
        '        <text x="' + cx + '" y="' + (cy + 25) + '" text-anchor="middle" font-size="12.5" font-weight="800" fill="#0f2922" class="ht-wheel-hub-sub">Trend Trader</text>',
        '      </svg>',
        '    </div>',
        '    <!-- COLUNA DIREITA: OS 6 PILARES NUMERADOS -->',
        '    <div class="ht-wheel-pillars-stack" id="htWheelDetails">',
        numberedCardsHtml,
        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 8. CENTRAL IDEA & METHOD TIP BLOCK: Caixa com Lâmpada 3D ("A IDEIA CENTRAL" / "Dica do Método")
    'central-idea': function (block) {
      return [
        '<div class="ht-block ht-block-central-idea">',
        '  <div class="ht-central-idea-icon" aria-hidden="true">' + renderLightbulbSvg() + '</div>',
        '  <div class="ht-central-idea-body">',
        '    <h4 class="ht-central-idea-title">' + esc(block.title || 'A IDEIA CENTRAL') + '</h4>',
        '    <p class="ht-central-idea-text">' + esc(block.text || block.tip) + '</p>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    'method-tip': function (block) {
      return [
        '<div class="ht-block ht-block-central-idea ht-block-tip">',
        '  <div class="ht-central-idea-icon ht-tip-icon" aria-hidden="true">' + renderLightbulbSvg() + '</div>',
        '  <div class="ht-central-idea-body ht-tip-body">',
        '    <h4 class="ht-central-idea-title ht-tip-title">' + esc(block.title || 'A IDEIA CENTRAL') + '</h4>',
        '    <p class="ht-central-idea-text ht-tip-text">' + esc(block.tip || block.text) + '</p>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 8B. DID YOU KNOW BLOCK ("Você sabia?")
    'did-you-know': function (block) {
      return [
        '<div class="ht-block ht-block-learning ht-learning-did-you-know">',
        '  <div class="ht-learning-badge-row">',
        '    <span class="ht-learning-pill is-cyan">🔎 VOCÊ SABIA?</span>',
        block.title ? '    <strong class="ht-learning-title">' + esc(block.title) + '</strong>' : '',
        '  </div>',
        '  <p class="ht-learning-text">' + esc(block.text) + '</p>',
        '</div>'
      ].join('\n');
    },

    // 8C. COMMON ERROR BLOCK ("Erro comum")
    'common-error': function (block) {
      return [
        '<div class="ht-block ht-block-learning ht-learning-common-error">',
        '  <div class="ht-learning-badge-row">',
        '    <span class="ht-learning-pill is-crimson">⚠️ ERRO COMUM</span>',
        block.title ? '    <strong class="ht-learning-title">' + esc(block.title) + '</strong>' : '',
        '  </div>',
        '  <p class="ht-learning-text">' + esc(block.text) + '</p>',
        block.consequence ? '  <div class="ht-learning-meta"><strong>Consequência:</strong> ' + esc(block.consequence) + '</div>' : '',
        block.correction ? '  <div class="ht-learning-meta is-good"><strong>Como evitar:</strong> ' + esc(block.correction) + '</div>' : '',
        '</div>'
      ].join('\n');
    },

    // 8D. WARNING BLOCK ("Atenção")
    'warning': function (block) {
      return [
        '<div class="ht-block ht-block-learning ht-learning-warning">',
        '  <div class="ht-learning-badge-row">',
        '    <span class="ht-learning-pill is-amber">⚡ ATENÇÃO</span>',
        block.title ? '    <strong class="ht-learning-title">' + esc(block.title) + '</strong>' : '',
        '  </div>',
        '  <p class="ht-learning-text">' + esc(block.text) + '</p>',
        '</div>'
      ].join('\n');
    },

    // 8E. FUNDAMENTAL RULE BLOCK ("Regra fundamental")
    'fundamental-rule': function (block) {
      return [
        '<div class="ht-block ht-block-learning ht-learning-fundamental-rule">',
        '  <div class="ht-learning-badge-row">',
        '    <span class="ht-learning-pill is-emerald">🛡️ REGRA FUNDAMENTAL</span>',
        block.title ? '    <strong class="ht-learning-title">' + esc(block.title) + '</strong>' : '',
        '  </div>',
        '  <p class="ht-learning-text">' + esc(block.text) + '</p>',
        '</div>'
      ].join('\n');
    },

    // 9. QUIZ BLOCK: Teste de Fixação "PARE E PENSE" com layout horizontal/compacto e feedback imediato
    'quiz': function (block, ctx) {
      var quizId = block.id || 'quiz-default';
      var savedQuiz = (ctx && ctx.quizzes && ctx.quizzes[quizId]) || null;
      var hasAnswered = savedQuiz && savedQuiz.hasAnswered;
      var isCorrect = savedQuiz && savedQuiz.isCorrect;
      var selectedIdx = (savedQuiz && typeof savedQuiz.selectedOptionIndex === 'number')
        ? savedQuiz.selectedOptionIndex
        : (typeof block.defaultSelectedIndex === 'number' ? block.defaultSelectedIndex : null);

      var options = Array.isArray(block.options) ? block.options : [];
      var buttonLabel = block.buttonLabel || 'Ver Resposta';

      return [
        '<div class="ht-block ht-block-quiz is-pare-e-pense ' + (hasAnswered ? (isCorrect ? 'is-correct' : 'is-incorrect') : '') + '" id="' + quizId + '" data-quiz-id="' + quizId + '">',
        '  <div class="ht-quiz-top-bar">',
        '    <div class="ht-quiz-pare-badge">',
        '      <svg viewBox="0 0 36 32" width="28" height="25" class="ht-quiz-bubble-svg" aria-hidden="true">',
        '        <path d="M6 3 H30 A4 4 0 0 1 34 7 V20 A4 4 0 0 1 30 24 H14 L7 30 V24 H6 A4 4 0 0 1 2 20 V7 A4 4 0 0 1 6 3 Z" fill="#ffffff" stroke="#0d8a5e" stroke-width="2.4" stroke-linejoin="round"/>',
        '        <text x="18" y="18.5" text-anchor="middle" font-size="14" font-weight="900" fill="#0d8a5e">?</text>',
        '      </svg>',
        '      <span class="ht-quiz-pare-pill">' + esc(block.badge || 'PARE E PENSE') + '</span>',
        '    </div>',
        '    <h3 class="ht-quiz-question">' + esc(block.question) + '</h3>',
        '  </div>',
        '  <div class="ht-quiz-interactive-row">',
        '    <div class="ht-quiz-options" role="radiogroup" aria-label="' + esc(block.question) + '">',
        options.map(function (opt, idx) {
          var optText = typeof opt === 'string' ? opt : opt.text;
          var isChecked = selectedIdx === idx;
          var optClass = isChecked ? 'is-selected' : '';
          return [
            '      <label class="ht-quiz-option ' + optClass + '" data-action="quiz-select" data-quiz-id="' + quizId + '" data-opt-idx="' + idx + '">',
            '        <input type="radio" name="' + quizId + '" value="' + idx + '" data-action="quiz-select" data-quiz-id="' + quizId + '" data-opt-idx="' + idx + '" ' + (isChecked ? 'checked' : '') + ' />',
            '        <span class="ht-quiz-radio-custom" aria-hidden="true"></span>',
            '        <span class="ht-quiz-option-text">' + esc(optText) + '</span>',
            '      </label>'
          ].join('\n');
        }).join('\n'),
        '    </div>',
        '    <div class="ht-quiz-actions">',
        '      <button type="button" class="ht-quiz-submit-btn" data-action="quiz-submit" data-quiz-id="' + quizId + '">',
        '        ' + esc(hasAnswered && !isCorrect ? 'Tentar Novamente' : buttonLabel) + ' <span aria-hidden="true">›</span>',
        '      </button>',
        '    </div>',
        '  </div>',
        hasAnswered ? [
          '  <div class="ht-quiz-feedback ' + (isCorrect ? 'correct' : 'incorrect') + '" role="alert">',
          '    <div class="ht-feedback-head">',
          '      <span class="ht-feedback-ico">' + (isCorrect ? '✅' : '💡') + '</span>',
          '      <strong class="ht-feedback-title">' + (isCorrect ? 'Excelente reflexão!' : 'Análise do Método:') + '</strong>',
          '    </div>',
          '    <p class="ht-feedback-text">' + esc(savedQuiz.feedback) + '</p>',
          '  </div>'
        ].join('\n') : '',
        '</div>'
      ].join('\n');
    },

    // 10. IN-PRACTICE & SOFTWARE-TOOL BLOCK: Conexão com o software real + Mockup de Laptop e Botão CTA
    'in-practice': function (block) {
      return [
        '<div class="ht-block ht-block-in-practice is-laptop-showcase">',
        '  <div class="ht-practice-pill-wrap">',
        '    <span class="ht-practice-badge">',
        '      <svg viewBox="0 0 20 16" width="14" height="12" aria-hidden="true" style="margin-right:5px;vertical-align:-1px;"><rect x="2" y="1" width="16" height="11" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="0" y1="14.5" x2="20" y2="14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        '      ' + esc(block.badge || 'NA PRÁTICA'),
        '    </span>',
        '  </div>',
        '  <div class="ht-practice-showcase-grid">',
        '    <div class="ht-practice-laptop-col">',
        '      ' + renderLaptopMockupSvg(),
        block.image ? '      <div class="ht-practice-hidden-media" style="display:none;" aria-hidden="true">' + renderPicture(block.image, block.title || 'Na Prática', 'ht-practice-pic') + '</div>' : '',
        '    </div>',
        '    <div class="ht-practice-copy-col">',
        '      <h3 class="ht-practice-title">' + esc(block.title || 'Veja os pilares no software') + '</h3>',
        block.description ? '      <p class="ht-practice-desc">' + esc(block.description) + '</p>' : '',
        block.route ? [
          '      <div class="ht-practice-action">',
          '        <button type="button" class="ht-practice-btn" data-action="launch-route" data-route="' + block.route + '">',
          '          <span>' + esc(block.buttonLabel || 'Abrir o Healthy Trend Trader') + '</span>',
          '          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="margin-left:6px;"><path d="M13 9v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M10 2h4v4M7 9l7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          '        </button>',
          '      </div>'
        ].join('\n') : '',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    'software-tool': function (block) {
      return blockRenderers['in-practice']({
        badge: block.badge || 'FERRAMENTA NO SOFTWARE',
        title: block.title,
        description: block.description,
        image: block.image,
        route: block.route,
        buttonLabel: block.buttonLabel || 'Acessar Ferramenta Agora'
      });
    },

    // 10B. FLOWCHART BLOCK: Diagrama de Processo / Fluxograma Visual
    'flowchart': function (block) {
      var steps = Array.isArray(block.steps) ? block.steps : [];
      return [
        '<div class="ht-block ht-block-flowchart">',
        block.title ? '  <h4 class="ht-flowchart-title">' + esc(block.title) + '</h4>' : '',
        block.subtitle ? '  <p class="ht-flowchart-sub">' + esc(block.subtitle) + '</p>' : '',
        '  <div class="ht-flowchart-track">',
        steps.map(function (st, idx) {
          var isObj = st && typeof st === 'object';
          var stTitle = isObj ? st.title : String(st);
          var stDesc = isObj ? st.description : '';
          var stColor = (isObj && st.color) || '#0d8a5e';
          return [
            '    <div class="ht-flow-node">',
            '      <div class="ht-flow-step-num" style="background:' + stColor + ';">' + (idx + 1) + '</div>',
            '      <div class="ht-flow-step-body">',
            '        <strong class="ht-flow-step-title">' + esc(stTitle) + '</strong>',
            stDesc ? '        <span class="ht-flow-step-desc">' + esc(stDesc) + '</span>' : '',
            '      </div>',
            '    </div>',
            idx < steps.length - 1 ? '    <div class="ht-flow-arrow" aria-hidden="true">→</div>' : ''
          ].join('\n');
        }).join('\n'),
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 10C. REVEAL CARDS BLOCK: Cards Interativos Revelados por Clique
    'reveal-cards': function (block) {
      var cards = Array.isArray(block.cards) ? block.cards : [];
      return [
        '<div class="ht-block ht-block-reveal-cards">',
        block.title ? '  <h4 class="ht-reveal-heading">' + esc(block.title) + '</h4>' : '',
        '  <div class="ht-reveal-grid">',
        cards.map(function (c, idx) {
          return [
            '    <details class="ht-reveal-card">',
            '      <summary class="ht-reveal-front">',
            '        <span class="ht-reveal-num">' + (idx + 1) + '</span>',
            '        <strong class="ht-reveal-q">' + esc(c.front || c.title) + '</strong>',
            '        <span class="ht-reveal-hint">Revelar ▾</span>',
            '      </summary>',
            '      <div class="ht-reveal-back">',
            '        <p>' + esc(c.back || c.text) + '</p>',
            '      </div>',
            '    </details>'
          ].join('\n');
        }).join('\n'),
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 11. CHALLENGE BLOCK: Desafio prático do capítulo
    'challenge': function (block) {
      var steps = Array.isArray(block.steps) ? block.steps : [];
      return [
        '<div class="ht-block ht-block-challenge">',
        '  <div class="ht-challenge-head">',
        '    <span class="ht-challenge-icon">🎯</span>',
        '    <div>',
        '      <h4 class="ht-challenge-title">' + esc(block.title || 'Desafio do Capítulo') + '</h4>',
        '      <span class="ht-challenge-sub">' + esc(block.subtitle || 'Atividade Prática') + '</span>',
        '    </div>',
        '  </div>',
        block.text ? '  <p class="ht-challenge-intro">' + esc(block.text) + '</p>' : '',
        '  <ol class="ht-challenge-steps">',
        steps.map(function (st) {
          return '    <li>' + esc(st) + '</li>';
        }).join('\n'),
        '  </ol>',
        '</div>'
      ].join('\n');
    },

    // 12. VISUAL SUMMARY BLOCK: Síntese gráfica dos aprendizados
    'visual-summary': function (block) {
      var items = Array.isArray(block.items) ? block.items : [];
      return [
        '<div class="ht-block ht-block-visual-summary">',
        '  <div class="ht-summary-header">',
        '    <span class="ht-summary-ico">📊</span>',
        '    <h4 class="ht-summary-title">' + esc(block.title || 'Resumo Visual dos Fundamentos') + '</h4>',
        '  </div>',
        '  <div class="ht-summary-cards">',
        items.map(function (it) {
          return [
            '    <div class="ht-summary-card">',
            '      <span class="ht-summary-card-ico">' + (it.icon || '📌') + '</span>',
            '      <h5 class="ht-summary-card-title">' + esc(it.title) + '</h5>',
            '      <p class="ht-summary-card-text">' + esc(it.text) + '</p>',
            '    </div>'
          ].join('\n');
        }).join('\n'),
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 13. WHAT YOU LEARNED: Checklist de objetivos atingidos
    'what-you-learned': function (block) {
      var items = Array.isArray(block.items) ? block.items : [];
      return [
        '<div class="ht-block ht-block-what-you-learned">',
        '  <h4 class="ht-learned-title">✨ ' + esc(block.title || 'O que você aprendeu:') + '</h4>',
        '  <ul class="ht-learned-list">',
        items.map(function (it) {
          return '    <li><span class="ht-learned-check">✓</span> ' + esc(it) + '</li>';
        }).join('\n'),
        '  </ul>',
        '</div>'
      ].join('\n');
    },

    // 14. CONQUEST BADGE: Gamificação e reconhecimento
    'conquest-badge': function (block, ctx) {
      var isUnlocked = ctx && ctx.achievements && ctx.achievements.some(function (a) {
        return a.id === block.achievementId && a.unlocked;
      });
      return [
        '<div class="ht-block ht-block-conquest-badge ' + (isUnlocked ? 'is-unlocked' : 'is-locked') + '">',
        '  <div class="ht-conquest-icon-wrap">',
        '    <span class="ht-conquest-icon">' + (block.icon || '🏆') + '</span>',
        '  </div>',
        '  <div class="ht-conquest-content">',
        '    <span class="ht-conquest-label">' + (isUnlocked ? 'CONQUISTA DESBLOQUEADA' : 'MARCO DE APRENDIZAGEM') + '</span>',
        '    <h4 class="ht-conquest-title">' + esc(block.title) + '</h4>',
        '    <p class="ht-conquest-sub">' + esc(block.description) + '</p>',
        '  </div>',
        '</div>'
      ].join('\n');
    }
  };

  /**
   * Renderiza uma página completa de blocos do Manual 2.0.
   * @param {Object} page - Estrutura da página (com blocks: [...])
   * @param {boolean} isRightPage - Se é página ímpar/direita
   * @param {Object} context - { activePillarId, quizzes, achievements, ... }
   */
  function render(page, isRightPage, context) {
    if (!page) return '';
    var blocks = Array.isArray(page.blocks) ? page.blocks : [];
    var ctx = context || {};

    var renderedBlocks = blocks.map(function (b) {
      var renderer = blockRenderers[b.type];
      if (typeof renderer === 'function') {
        return renderer(b, ctx);
      }
      return '';
    }).filter(Boolean).join('\n');

    var layoutClass = page.layoutClass ? ' ' + page.layoutClass : '';

    return [
      '<div class="ht-visual-learning-page' + layoutClass + '">',
      renderedBlocks,
      '</div>'
    ].join('\n');
  }

  return {
    render: render,
    blockRenderers: blockRenderers,
    getPrincipleSvg: getPrincipleSvg,
    getPillarSliceSvgIcon: getPillarSliceSvgIcon
  };
}));
