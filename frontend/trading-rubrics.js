(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TradingRubrics=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  let LiquidityGateModel = (typeof globalThis !== 'undefined' && globalThis && globalThis.LiquidityGateModel) || null;
  if (!LiquidityGateModel && typeof require === 'function') {
    try {
      LiquidityGateModel = require('./liquidity-gate-model');
    } catch {}
  }
  const DEFAULT_VOLATILITY_POLICY = Object.freeze({
    strategyType: 'VOLATILITY_TRADING',
    version: 'volatility-v1',
    criteria: [
      { key: 'primaryTrend', label: 'Tendência Primária (SMA 200)', description: 'Fechamento acima da média longa estrutural e inclinação positiva', weight: 20 },
      { key: 'meanReversionTrigger', label: 'Gatilho de Sobrevenda (IFR 2)', description: 'Intensidade e profundidade da sobrevenda do IFR(2) abaixo de 10', weight: 25 },
      { key: 'distanceShortMa', label: 'Afastamento da Média Curta (SMA 7)', description: 'Distância percentual abaixo da SMA(7) que fornece potencial de repique', weight: 15 },
      { key: 'volatilityContext', label: 'Contexto de Volatilidade (ATR)', description: 'Volatilidade saudável (ATR%) que viabiliza expansão e recuperação rápida', weight: 15 },
      { key: 'liquidity', label: 'Liquidez Operacional (Liquidity Gate)', description: 'Aprovação mandatória na trava global de volume financeiro diário', weight: 10 },
      { key: 'historicalEdge', label: 'Edge Estatístico do Setup', description: 'Taxa de acerto e consistência histórica da reversão à média no ativo', weight: 10 },
      { key: 'executionExposure', label: 'Elegibilidade e Execução', description: 'Gap tolerável na abertura, sem bloqueio de Blacklist ou limite de carteira', weight: 5 }
    ],
    ratingScale: {
      bad: { label: 'Ruim', score: 0 },
      medium: { label: 'Médio', score: 0.55 },
      good: { label: 'Bom', score: 1 }
    },
    grades: [
      { grade: 'A', minScore: 85, riskPct: 0.004 },
      { grade: 'B', minScore: 70, riskPct: 0.002 },
      { grade: 'C', minScore: 50, riskPct: 0.001 },
      { grade: 'D', minScore: -Infinity, riskPct: 0 }
    ]
  });

  const STRATEGY_RUBRIC_VERSIONS = Object.freeze({
    TREND_FOLLOWING: 'trend-v2',
    VOLATILITY_TRADING: 'volatility-v1'
  });

  const DEFAULT_POLICY={
    volatilityRubric: DEFAULT_VOLATILITY_POLICY,
    volatility: Object.freeze({
      activeProfileId: 'vol-ifr2-standard',
      fixedCapital: 7500,
      ifrPeriod: 2,
      oversoldLevel: 10,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      maxHoldingSessions: 7,
      minDailyFinancialVolume: 500000,
      minDailyTrades: 200
    }),
    criteria:[
      {key:'trendQuality',label:'Contexto do Ativo (Diário)',weight:25},
      {key:'marketCycle',label:'Contexto do Mercado',weight:20},
      {key:'relativeStrength',label:'Força Relativa (RS)',weight:20},
      {key:'volatility',label:'Volatilidade (ATR)',weight:15},
      {key:'setupQuality',label:'Gatilho de Entrada',weight:15},
      {key:'fundamentalScore',label:'Fundamentos',weight:5}
    ],
    ratingScale:{
      bad:{label:'Ruim',score:0},medium:{label:'Médio',score:.55},good:{label:'Bom',score:1},
      healthy:{label:'Saudável (Expansão)',score:1},
      defensive:{label:'Modo Defesa — Evitar Operar',score:0},
      unavailable:{label:'Não disponível',score:0},
      transition:{label:'Modo Defesa — Evitar Operar',score:0},
      improving:{label:'Modo Defesa — Evitar Operar',score:0},
      riskOff:{label:'Modo Defesa — Evitar Operar',score:0}
    },
    grades:[
      {grade:'A',minScore:95,riskPct:.004},
      {grade:'B',minScore:80,riskPct:.002},
      {grade:'C',minScore:65,riskPct:.001},
      {grade:'D',minScore:-Infinity,riskPct:0}
    ],
    scaleIn:{
      enabled:true,
      maxAdditions:2,
      minR:1.0,
      triggerR1:1.0,
      triggerR2:2.0,
      requireBreakeven:true,
      maxRiskPct:0.5,
      respectPortfolioHeat:true,
      allowLosingTrades:false
    },
    atrVolatility:{
      maxExcellent:2.0,
      maxGood:4.0
    },
    liquidityGate:{
      enabled:true,
      windowSessions:21,
      minDailyFinancialVolumeB3:500000,
      minDailyFinancialVolumeUs:1000000,
      minDailyTrades:500,
      maxCalendarDaysSpan:45
    },
    profiles:{
      rampUp:{label:'Mercado em recuperação',ongoingRiskPct:.0025,initialVolatilityPct:.001,ongoingVolatilityPct:.0025,capitalPct:.1,maximumPortfolioRiskPct:.03,maximumPositions:3,pyramiding:false},
      standard:{label:'Política padrão',ongoingRiskPct:.006,initialVolatilityPct:.003,ongoingVolatilityPct:.006,capitalPct:.1,maximumPortfolioRiskPct:.03,maximumPositions:6,pyramiding:false}
    },
    selectedProfile:'standard'
  };

  const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

  function normalizePolicy(rawPolicy){
    const policy=rawPolicy||{};
    const legacyHeatPct=Math.max(.0001,finite(policy.portfolioHeatLimitPct,3)/100);
    const legacySizingPolicy=Number(policy.positionSizingVersion)<2;
    const profiles={};
    Object.entries(DEFAULT_POLICY.profiles).forEach(([key,base])=>{
      const saved=policy.profiles?.[key]||{};
      profiles[key]={
        label:String(saved.label||base.label),
        ongoingRiskPct:Math.max(0,finite(saved.ongoingRiskPct,base.ongoingRiskPct)),
        initialVolatilityPct:Math.max(0,finite(saved.initialVolatilityPct,base.initialVolatilityPct)),
        ongoingVolatilityPct:Math.max(0,finite(saved.ongoingVolatilityPct,base.ongoingVolatilityPct)),
        capitalPct:Math.max(0,finite(saved.capitalPct,base.capitalPct)),
        maximumPortfolioRiskPct:Math.max(.0001,legacySizingPolicy?legacyHeatPct:finite(saved.maximumPortfolioRiskPct,legacyHeatPct)),
        maximumPositions:Math.max(1,Math.floor(finite(saved.maximumPositions,base.maximumPositions))),
        pyramiding:false
      };
    });
    const criteria=DEFAULT_POLICY.criteria.map(item=>{
      const saved=(policy.criteria||[]).find(candidate=>candidate?.key===item.key)||{};
      return{...item,...saved,key:item.key,label:item.label,weight:Math.max(0,finite(saved.weight,item.weight))};
    });
    const grades=DEFAULT_POLICY.grades.map(item=>{
      const saved=(policy.grades||[]).find(candidate=>candidate?.grade===item.grade)||{};
      const legacyPolicy=policy.gradingVersion!==2;
      const oldMinScore=Number(saved.minScore);
      const minScore=item.grade==='D'?-Infinity:legacyPolicy||!Number.isFinite(oldMinScore)||oldMinScore<=10?item.minScore:oldMinScore;
      const riskPct=item.grade==='D'?0:Math.max(0,finite(saved.riskPct,item.riskPct));
      return{grade:item.grade,minScore,riskPct};
    });
    const settings=policy.sellIntoStrength||{};
    const start=Math.max(0,finite(settings.startR,2));
    const end=Math.max(start,finite(settings.endR,3));
    const rawScaleIn=policy.scaleIn||{};
    const triggerR1=Math.max(0,finite(rawScaleIn.triggerR1,finite(rawScaleIn.minR,DEFAULT_POLICY.scaleIn.triggerR1||1.0)));
    const triggerR2=Math.max(0,finite(rawScaleIn.triggerR2,DEFAULT_POLICY.scaleIn.triggerR2||2.0));
    const scaleIn={
      enabled:rawScaleIn.enabled!==false,
      maxAdditions:Math.max(1,Math.floor(finite(rawScaleIn.maxAdditions,DEFAULT_POLICY.scaleIn.maxAdditions))),
      minR:triggerR1,
      triggerR1,
      triggerR2,
      requireBreakeven:rawScaleIn.requireBreakeven!==false,
      maxRiskPct:Math.max(0,finite(rawScaleIn.maxRiskPct,DEFAULT_POLICY.scaleIn.maxRiskPct)),
      respectPortfolioHeat:rawScaleIn.respectPortfolioHeat!==false,
      allowLosingTrades:rawScaleIn.allowLosingTrades===true
    };
    const rawAtrVol=policy.atrVolatility||{};
    let maxExcellent=finite(rawAtrVol.maxExcellent??rawAtrVol.excellentMaxPct??rawAtrVol.excellentMax,DEFAULT_POLICY.atrVolatility.maxExcellent);
    let maxGood=finite(rawAtrVol.maxGood??rawAtrVol.goodMaxPct??rawAtrVol.goodMax,DEFAULT_POLICY.atrVolatility.maxGood);
    if(maxExcellent<=0) maxExcellent=DEFAULT_POLICY.atrVolatility.maxExcellent;
    if(maxGood<=maxExcellent) maxGood=Number((maxExcellent+2.0).toFixed(2));
    const atrVolatility={
      maxExcellent:Number(maxExcellent.toFixed(2)),
      maxGood:Number(maxGood.toFixed(2))
    };
    const rawLiquidity=policy.liquidityGate||{};
    const liquidityGate={
      enabled:rawLiquidity.enabled!==false,
      windowSessions:Math.max(5,Math.floor(finite(rawLiquidity.windowSessions,DEFAULT_POLICY.liquidityGate.windowSessions))),
      minDailyFinancialVolumeB3:Math.max(1000,finite(rawLiquidity.minDailyFinancialVolumeB3,DEFAULT_POLICY.liquidityGate.minDailyFinancialVolumeB3)),
      minDailyFinancialVolumeUs:Math.max(1000,finite(rawLiquidity.minDailyFinancialVolumeUs,DEFAULT_POLICY.liquidityGate.minDailyFinancialVolumeUs)),
      minDailyTrades:Math.max(10,Math.floor(finite(rawLiquidity.minDailyTrades,DEFAULT_POLICY.liquidityGate.minDailyTrades))),
      maxCalendarDaysSpan:Math.max(25,Math.floor(finite(rawLiquidity.maxCalendarDaysSpan,DEFAULT_POLICY.liquidityGate.maxCalendarDaysSpan)))
    };
        const rawVol = policy.volatilityRubric || {};
    const volCriteria = DEFAULT_VOLATILITY_POLICY.criteria.map(item => {
      const saved = (rawVol.criteria || policy.volatilityCriteria || []).find(c => c?.key === item.key) || {};
      return {
        ...item,
        ...saved,
        key: item.key,
        label: item.label,
        weight: Math.max(0, finite(saved.weight, item.weight))
      };
    });
    const volGrades = DEFAULT_VOLATILITY_POLICY.grades.map(item => {
      const saved = (rawVol.grades || policy.volatilityGrades || []).find(g => g?.grade === item.grade) || {};
      const oldMin = Number(saved.minScore);
      const minScore = item.grade === 'D' ? -Infinity : (!Number.isFinite(oldMin) ? item.minScore : oldMin);
      const riskPct = item.grade === 'D' ? 0 : Math.max(0, finite(saved.riskPct, item.riskPct));
      return { grade: item.grade, minScore, riskPct };
    });
    const volatilityRubric = {
      strategyType: 'VOLATILITY_TRADING',
      version: 'volatility-v1',
      criteria: volCriteria,
      ratingScale: { ...DEFAULT_VOLATILITY_POLICY.ratingScale },
      grades: volGrades
    };
    const rawVolSettings = policy.volatility || {};
    const volatility = {
      activeProfileId: String(rawVolSettings.activeProfileId || DEFAULT_POLICY.volatility?.activeProfileId || 'vol-ifr2-standard'),
      fixedCapital: Math.max(100, finite(rawVolSettings.fixedCapital, 7500)),
      ifrPeriod: Math.max(1, Math.floor(finite(rawVolSettings.ifrPeriod, 2))),
      oversoldLevel: Math.max(1, Math.min(99, finite(rawVolSettings.oversoldLevel, 10))),
      shortMaPeriod: Math.max(1, Math.floor(finite(rawVolSettings.shortMaPeriod, 7))),
      longMaPeriod: Math.max(5, Math.floor(finite(rawVolSettings.longMaPeriod, 200))),
      maxHoldingSessions: Math.max(1, Math.floor(finite(rawVolSettings.maxHoldingSessions, 7))),
      minDailyFinancialVolume: Math.max(1000, finite(rawVolSettings.minDailyFinancialVolume, 500000)),
      minDailyTrades: Math.max(1, Math.floor(finite(rawVolSettings.minDailyTrades, 200)))
    };
    const selectedProfile=profiles[policy.selectedProfile]?policy.selectedProfile:DEFAULT_POLICY.selectedProfile;
    return{
      gradingVersion:2,
      positionSizingVersion:3,
      criteria,
      ratingScale:{...DEFAULT_POLICY.ratingScale},
      grades,
      profiles,
      marketMultipliers:{...(policy.marketMultipliers||{})},
      selectedProfile,
      portfolioHeatLimitPct:profiles[selectedProfile].maximumPortfolioRiskPct*100,
      sellIntoStrength:{enabled:settings.enabled!==false,startR:start,endR:end,suggestedPercent:Math.min(100,Math.max(1,finite(settings.suggestedPercent,50)))},
      scaleIn,
      atrVolatility,
      liquidityGate,
      volatilityRubric,
      volatility
    };
  }

  function profileFor(policy={},profileKey){
    const normalized=normalizePolicy(policy);
    const key=profileKey&&normalized.profiles[profileKey]?profileKey:normalized.selectedProfile;
    return{key,...normalized.profiles[key]};
  }

  function marketCycleKey(value){
    if(value===null||value===undefined||value==='')return null;
    const normalized=String(value||'').trim().toLowerCase();
    if(['healthy','saudável','saudavel','expansão','expansao','expansion','risk-on','up','positivo','alta','bull'].includes(normalized))return'healthy';
    if(['unavailable','não disponível','nao disponivel','indisponível','indisponivel','none'].includes(normalized))return'unavailable';
    // Regra binária oficial: qualquer outro estado (incluindo transição legada ou defensivo) mapeia para 'defensive'
    return'defensive';
  }

  function calculateVolatilityGrade(score, volConfig) {
    const numericScore = finite(score, 0);
    const grades = volConfig?.grades || DEFAULT_VOLATILITY_POLICY.grades;
    const matched = grades.find(item => numericScore >= item.minScore);
    return (matched || grades[grades.length - 1]).grade;
  }

  function calculateGrade(score, policy, strategyType) {
    const normStrat = String(strategyType || '').trim().toUpperCase();
    const p = normalizePolicy(policy);
    if (normStrat === 'VOLATILITY_TRADING' || normStrat === 'VOLATILITY') {
      return calculateVolatilityGrade(score, p.volatilityRubric);
    }
    const numericScore = finite(score, 0);
    const matched = p.grades.find(item => numericScore >= item.minScore);
    return (matched || p.grades[p.grades.length - 1]).grade;
  }

  function _oldCalculateGrade_unused(score,policy){
    const p=normalizePolicy(policy),numericScore=finite(score,0),matched=p.grades.find(item=>numericScore>=item.minScore);
    return(matched||p.grades[p.grades.length-1]).grade;
  }

  function normalizeHistoricalGrade(grade,metadata={}){
    if(grade==null||grade==='')return null;
    const value=String(grade).trim().toUpperCase();
    if(value==='A'&&Number(metadata?.gradingVersion)===2)return'A';
    if(['A+','A','B'].includes(value))return'B';
    if(value==='C')return'C';
    return'D';
  }

  function classifyAtrVolatility(atrPct,atrVolatilityConfig){
    const num=Number(atrPct);
    if(!Number.isFinite(num)||num<=0)return null;
    const config=atrVolatilityConfig||DEFAULT_POLICY.atrVolatility;
    const maxExc=Number(config.maxExcellent??2.0);
    const maxGd=Number(config.maxGood??4.0);
    const fmt=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    const percentStr=fmt(num);
    if(num<maxExc){
      return{
        rating:'good',
        label:'Excelente',
        shortLabel:'Excelente',
        decision:'Priorizar',
        color:'green',
        icon:'🟢',
        percent:num,
        percentFormatted:percentStr,
        rangeText:`< ${fmt(maxExc)}%`,
        reason:`ATR: ${percentStr}% do preço • Limite: < ${fmt(maxExc)}%`,
        summaryText:`${percentStr}% — 🟢 Excelente`
      };
    }
    if(num<maxGd){
      return{
        rating:'medium',
        label:'Confortável',
        shortLabel:'Confortável',
        decision:'Considerar',
        color:'yellow',
        icon:'🟡',
        percent:num,
        percentFormatted:percentStr,
        rangeText:`${fmt(maxExc)}% a ${fmt(maxGd)}%`,
        reason:`ATR: ${percentStr}% do preço • Faixa: ${fmt(maxExc)}% a < ${fmt(maxGd)}%`,
        summaryText:`${percentStr}% — 🟡 Confortável`
      };
    }
    return{
      rating:'bad',
      label:'Evitar',
      shortLabel:'Evitar',
      decision:'Não operar',
      color:'red',
      icon:'🔴',
      percent:num,
      percentFormatted:percentStr,
      rangeText:`≥ ${fmt(maxGd)}%`,
      reason:`ATR: ${percentStr}% do preço • Limite: ≥ ${fmt(maxGd)}%`,
      summaryText:`${percentStr}% — 🔴 Evitar`
    };
  }

  function classifyRelativeStrength(score, classification) {
    const hasScore = score !== null && score !== undefined && score !== '' && !Number.isNaN(Number(score));
    const rawNum = hasScore ? Number(score) : null;
    const hasNum = Number.isFinite(rawNum);
    const num = hasNum ? Math.max(0, Math.min(100, Math.round(rawNum))) : null;
    const c = String(classification || '').trim().toLowerCase();

    if ((hasNum && num >= 90) || c.includes('líd') || c.includes('lead')) {
      return {
        score: num,
        tier: 'leader',
        label: 'Líder',
        status: 'good',
        statusClass: 'good',
        badgeClass: 'good',
        color: '#15803d',
        icon: '🟢',
        dot: '●',
        display: num !== null ? `Líder (${num})` : 'Líder'
      };
    }
    if ((hasNum && num >= 70) || c.includes('fort') || c.includes('qualif')) {
      return {
        score: num,
        tier: 'strong',
        label: 'Forte',
        status: 'good',
        statusClass: 'good',
        badgeClass: 'good',
        color: '#15803d',
        icon: '🟢',
        dot: '●',
        display: num !== null ? `Forte (${num})` : 'Forte'
      };
    }
    if ((hasNum && num < 40) || c.includes('frac') || c.includes('lag') || c.includes('abaixo') || c.includes('below')) {
      return {
        score: num,
        tier: 'weak',
        label: 'Fraco',
        status: 'bad',
        statusClass: 'bad',
        badgeClass: 'bad',
        color: '#b91c1c',
        icon: '🔴',
        dot: '●',
        display: num !== null ? `Fraco (${num})` : 'Fraco'
      };
    }
    return {
      score: num,
      tier: 'neutral',
      label: 'Neutro',
      status: 'neutral',
      statusClass: 'neutral',
      badgeClass: 'neutral',
      color: '#64748b',
      icon: '🟡',
      dot: '●',
      display: num !== null ? `Neutro (${num})` : 'Neutro'
    };
  }

  function getRubricGradeVisual(grade) {
    const raw = String(grade || '').trim().toUpperCase();
    if (raw === 'A+' || raw === 'A') {
      return {
        grade: raw || 'A',
        status: 'good',
        statusClass: 'grade-a',
        badgeClass: 'good',
        color: '#15803d',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        icon: '🏆',
        title: raw === 'A+' ? 'Rare Trade (A+)' : 'Alta Qualidade (A)',
        summaryText: 'Setup com alta probabilidade segundo o seu método.',
        riskDescription: 'Risco nominal liberado'
      };
    }
    if (raw === 'B') {
      return {
        grade: 'B',
        status: 'good',
        statusClass: 'grade-b',
        badgeClass: 'good',
        color: '#a16207',
        bg: '#fefce8',
        border: '#fef08a',
        icon: '✅',
        title: 'Bom Edge (B)',
        summaryText: 'Setup dentro dos parâmetros de risco controlado.',
        riskDescription: 'Risco moderado permitido'
      };
    }
    if (raw === 'C') {
      return {
        grade: 'C',
        status: 'neutral',
        statusClass: 'grade-c',
        badgeClass: 'neutral',
        color: '#c2410c',
        bg: '#fff7ed',
        border: '#fed7aa',
        icon: '⚠️',
        title: 'Edge Pequeno (C)',
        summaryText: 'Qualidade limítrofe. Exige cautela e dimensionamento reduzido.',
        riskDescription: 'Risco mínimo reduzido'
      };
    }
    return {
      grade: raw || 'D',
      status: 'bad',
      statusClass: 'grade-d',
      badgeClass: 'bad',
      color: '#b91c1c',
      bg: '#fee2e2',
      border: '#fca5a5',
      icon: '⛔',
      title: 'Sem Edge (D)',
      summaryText: 'Sem Edge. Bloqueio automático com risco nominal zero (0%).',
      riskDescription: 'Operação bloqueada pelo método'
    };
  }

  function getRubricGradeColor(grade) {
    return getRubricGradeVisual(grade).color;
  }

  function calculateTrendFollowingRubric(input={},policy){
    const p=normalizePolicy(policy),ratings={...(input.ratings||{})},profile=profileFor(p,input.profileKey);
    if((Number(input.entry)>0&&Number(input.atr)>0)&&(!ratings.volatility||input.autoVolatility!==false)){
      const autoPct=(Number(input.atr)/Number(input.entry))*100;
      const autoVol=classifyAtrVolatility(autoPct,p.atrVolatility);
      if(autoVol)ratings.volatility=autoVol.rating;
    }
    const rawCycle=input.marketCycleRegime!==undefined?input.marketCycleRegime:(ratings.marketCycle||input.marketCycle);
    const cycleKey=rawCycle===null||rawCycle==='unavailable'?'unavailable':(marketCycleKey(rawCycle)||'defensive');
    const weightsTotal=p.criteria.reduce((sum,item)=>sum+Number(item.weight||0),0),weightsValid=Math.abs(weightsTotal-100)<.001;
    const contributions=p.criteria.map(c=>{
      const selectedRating=c.key==='marketCycle'?cycleKey:(ratings[c.key]||input[c.key+'Rating']);
      const raw=selectedRating&&p.ratingScale[selectedRating]?p.ratingScale[selectedRating].score:input[c.key];
      const value=Math.max(0,Math.min(1,finite(raw,0)));
      return{key:c.key,label:c.label,selectedRating,rating:selectedRating,value,weight:c.weight,points:Number((value*c.weight).toFixed(2))};
    });
    const complete=p.criteria.every(c=>c.key==='marketCycle'||Boolean(ratings[c.key]||input[c.key+'Rating']));
    const score=Number(contributions.reduce((sum,item)=>sum+item.points,0).toFixed(1)),rawGrade=calculateGrade(score,p),gates=[];
    let grade=rawGrade;
    if(!weightsValid)gates.push({key:'weights',status:'blocked',message:'Os pesos da Rubric precisam totalizar 100 pontos antes de liberar risco.'});
    if(grade==='A'){
      if(score<95){grade='B';gates.push({key:'score',status:'limited',message:'Grade A exige pelo menos 95 pontos.'});}
      const failed=contributions.filter(item=>item.value<.9);
      if(failed.length){grade='B';failed.forEach(item=>gates.push({key:item.key,status:'limited',message:`${item.label} precisa atingir excelência para liberar o Rare Trade.`}));}
    }
    if(cycleKey==='defensive'){if(grade==='A')grade='B';gates.push({key:'market',status:'limited',message:'Modo Defesa: novos trades devem ser evitados.'});}
    if(cycleKey==='unavailable'){gates.push({key:'market',status:'limited',message:'Não foi possível obter o ciclo de mercado atual (ciclo não disponível).'});}
    let liquidity = input.liquidity || null;
    if (!liquidity && input.candles && LiquidityGateModel && typeof LiquidityGateModel.evaluateLiquidity === 'function') {
      liquidity = LiquidityGateModel.evaluateLiquidity({
        candles: input.candles,
        targetDate: input.targetDate || input.entryDate || input.signalDate,
        symbol: input.symbol || input.ticker,
        market: input.market,
        policy: p
      });
    }
    let isLiquidityApproved = true;
    if (p.liquidityGate?.enabled !== false && liquidity) {
      if (!liquidity.isEligible) {
        isLiquidityApproved = false;
        grade = 'D';
        gates.push({
          key: 'liquidity',
          status: 'blocked',
          code: liquidity.code || 'LIQUIDITY_BLOCKED',
          message: `NÃO ELEGÍVEL / BLOQUEADO POR LIQUIDEZ: ${liquidity.reason}`
        });
      } else {
        gates.push({
          key: 'liquidity',
          status: 'approved',
          code: 'APPROVED',
          message: liquidity.reason || 'Liquidez aprovada.'
        });
      }
    }
    const gradeObj=p.grades.find(item=>item.grade===grade)||p.grades[p.grades.length-1];
    const gradeRiskPct=grade==='D'?0:gradeObj.riskPct;
    const baseBudget=(weightsValid&&complete&&grade!=='D')?gradeRiskPct:0;
    const riskBudgetPct=isLiquidityApproved?baseBudget:0;
    const qualityAllowed=isLiquidityApproved&&weightsValid&&complete&&grade==='A';
    const isBuyPermitted = isLiquidityApproved && cycleKey !== 'defensive' && cycleKey !== 'unavailable';
        return {
      strategyType: 'TREND_FOLLOWING',
      rubricVersion: 'trend-v2',
      score,
      maximumScore: 100,
      rawGrade,
      grade,
      gradeRiskPct,
      riskBudgetPct,
      riskPct: riskBudgetPct,
      marketCycle: cycleKey,
      liquidity,
      isLiquidityApproved,
      liquidityStatus: isLiquidityApproved ? (liquidity ? 'APROVADO' : null) : (liquidity?.status || 'BLOQUEADO_LIQUIDEZ'),
      profile,
      complete,
      contributions,
      gates,
      weightsTotal,
      weightsValid,
      qualityAllowed,
      isBuyPermitted
    };
  }

  function calculateVolatilityRubric(input = {}, policy) {
    const p = normalizePolicy(policy);
    const volConfig = p.volatilityRubric || DEFAULT_VOLATILITY_POLICY;
    const criteria = volConfig.criteria;
    const ratingScale = volConfig.ratingScale || DEFAULT_VOLATILITY_POLICY.ratingScale;
    const grades = volConfig.grades || DEFAULT_VOLATILITY_POLICY.grades;
    const ratings = { ...(input.ratings || {}) };

    const weightsTotal = criteria.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    const weightsValid = Math.abs(weightsTotal - 100) < 0.001;

    // Resolução mandatória de Liquidez (Hard Gate inegociável)
    let liquidity = input.liquidity || null;
    if (!liquidity && input.candles && LiquidityGateModel && typeof LiquidityGateModel.evaluateLiquidity === 'function') {
      liquidity = LiquidityGateModel.evaluateLiquidity({
        candles: input.candles,
        targetDate: input.targetDate || input.entryDate || input.signalDate,
        symbol: input.symbol || input.ticker,
        market: input.market,
        policy: p
      });
    }

    let isLiquidityApproved = true;
    if (p.liquidityGate?.enabled !== false && liquidity) {
      if (!liquidity.isEligible) {
        isLiquidityApproved = false;
      }
    }

    const contributions = criteria.map(c => {
      let selectedRating = ratings[c.key] || input[c.key + 'Rating'] || (typeof input[c.key] === 'string' || (typeof input[c.key] === 'number' && Number.isFinite(input[c.key])) ? input[c.key] : undefined);
      let value = null;

      // Inferência automática e inteligente de métricas se não houver rating manual
      if (selectedRating === undefined || selectedRating === null) {
        if (c.key === 'primaryTrend') {
          if (input.close !== undefined && input.smaLong !== undefined) {
            const close = Number(input.close);
            const smaLong = Number(input.smaLong);
            if (close <= smaLong) {
              selectedRating = 'bad';
              value = 0;
            } else {
              const dist = ((close - smaLong) / smaLong) * 100;
              if (dist >= 3.0) { selectedRating = 'good'; value = 1.0; }
              else { selectedRating = 'medium'; value = 0.65; }
            }
          }
        } else if (c.key === 'meanReversionTrigger') {
          const ifr = input.ifr !== undefined ? Number(input.ifr) : (input.rsi !== undefined ? Number(input.rsi) : null);
          if (ifr !== null && Number.isFinite(ifr)) {
            if (ifr <= 2.0) { selectedRating = 'good'; value = 1.0; }
            else if (ifr <= 5.0) { selectedRating = 'good'; value = 0.90; }
            else if (ifr <= 10.0) { selectedRating = 'medium'; value = 0.70; }
            else { selectedRating = 'bad'; value = 0; }
          }
        } else if (c.key === 'distanceShortMa') {
          if (input.close !== undefined && input.smaShort !== undefined) {
            const close = Number(input.close);
            const smaShort = Number(input.smaShort);
            if (close >= smaShort) {
              selectedRating = 'bad';
              value = 0;
            } else {
              const dist = ((smaShort - close) / smaShort) * 100;
              if (dist >= 2.5) { selectedRating = 'good'; value = 1.0; }
              else if (dist >= 1.0) { selectedRating = 'medium'; value = 0.65; }
              else { selectedRating = 'bad'; value = 0.30; }
            }
          }
        } else if (c.key === 'volatilityContext') {
          const atr = input.atr !== undefined ? Number(input.atr) : null;
          const entry = Number(input.entry || input.close || 0);
          if (atr !== null && entry > 0) {
            const atrPct = (atr / entry) * 100;
            const autoVol = classifyAtrVolatility(atrPct, p.atrVolatility);
            if (autoVol?.rating === 'good') { selectedRating = 'good'; value = 1.0; }
            else if (autoVol?.rating === 'medium') { selectedRating = 'medium'; value = 0.70; }
            else { selectedRating = 'bad'; value = 0.20; }
          }
        } else if (c.key === 'liquidity') {
          if (liquidity) {
            if (liquidity.isEligible) { selectedRating = 'good'; value = 1.0; }
            else { selectedRating = 'bad'; value = 0; }
          } else {
            selectedRating = 'good';
            value = 1.0;
          }
        } else if (c.key === 'historicalEdge') {
          const wr = input.winRate !== undefined ? Number(input.winRate) : (input.historicalWinRate !== undefined ? Number(input.historicalWinRate) : null);
          if (wr !== null && Number.isFinite(wr)) {
            if (wr >= 60) { selectedRating = 'good'; value = 1.0; }
            else if (wr >= 50) { selectedRating = 'medium'; value = 0.65; }
            else { selectedRating = 'bad'; value = 0.25; }
          } else {
            selectedRating = 'medium';
            value = 0.55;
          }
        } else if (c.key === 'executionExposure') {
          const gap = input.entryGapPct !== undefined ? Math.abs(Number(input.entryGapPct)) : (input.gapPct !== undefined ? Math.abs(Number(input.gapPct)) : null);
          if (gap !== null && Number.isFinite(gap)) {
            if (gap <= 2.0) { selectedRating = 'good'; value = 1.0; }
            else if (gap <= 4.0) { selectedRating = 'medium'; value = 0.55; }
            else { selectedRating = 'bad'; value = 0; }
          } else {
            selectedRating = 'good';
            value = 1.0;
          }
        }
      }

      if (value === null) {
        if (typeof selectedRating === 'number') {
          value = Math.max(0, Math.min(1, finite(selectedRating, 0)));
        } else if (typeof selectedRating === 'string' && ratingScale[selectedRating]) {
          value = ratingScale[selectedRating].score;
        } else {
          value = 0;
          selectedRating = 'bad';
        }
      }

      const points = Number((value * c.weight).toFixed(2));
      return {
        key: c.key,
        label: c.label,
        description: c.description,
        selectedRating: typeof selectedRating === 'string' ? selectedRating : (value >= 0.9 ? 'good' : (value >= 0.5 ? 'medium' : 'bad')),
        rating: typeof selectedRating === 'string' ? selectedRating : (value >= 0.9 ? 'good' : (value >= 0.5 ? 'medium' : 'bad')),
        value,
        weight: c.weight,
        points
      };
    });

    const complete = criteria.every(c => Boolean(ratings[c.key] || input[c.key + 'Rating'] || input[c.key] !== undefined));
    const score = Number(contributions.reduce((sum, item) => sum + item.points, 0).toFixed(1));
    const rawGrade = calculateVolatilityGrade(score, volConfig);
    const gates = [];
    let grade = rawGrade;

    if (!weightsValid) {
      gates.push({ key: 'weights', status: 'blocked', message: 'Os pesos da Rubric de Volatilidade precisam totalizar 100 pontos antes de liberar risco.' });
    }

    // Hard Gate: Liquidity Gate (inegociável, bloqueio automático e Grade D)
    if (!isLiquidityApproved) {
      grade = 'D';
      gates.push({
        key: 'liquidity',
        status: 'blocked',
        code: liquidity?.code || 'LIQUIDITY_BLOCKED',
        message: `NÃO ELEGÍVEL / BLOQUEADO POR LIQUIDEZ: ${liquidity?.reason || 'Volume financeiro ou histórico insuficiente para atender à trava global.'}`
      });
    } else if (liquidity) {
      gates.push({
        key: 'liquidity',
        status: 'approved',
        code: 'APPROVED',
        message: liquidity.reason || 'Liquidez aprovada.'
      });
    }

    // Gate Estrutural: Tendência Primária (SMA 200)
    const trendContrib = contributions.find(c => c.key === 'primaryTrend');
    if (trendContrib && trendContrib.value < 0.5) {
      if (grade === 'A' || grade === 'B') grade = 'C';
      gates.push({
        key: 'primaryTrend',
        status: 'limited',
        message: 'Filtro estrutural reprovado: Fechamento abaixo da SMA200 impede notas de excelência no Volatility Swing.'
      });
    }

    // Gate de Gatilho: IFR2 Sobrevenda
    const triggerContrib = contributions.find(c => c.key === 'meanReversionTrigger');
    if (triggerContrib && triggerContrib.value < 0.5) {
      if (grade === 'A' || grade === 'B') grade = 'C';
      gates.push({
        key: 'meanReversionTrigger',
        status: 'limited',
        message: 'Gatilho de sobrevenda não confirmado: IFR(2) precisa estar abaixo do limiar configurado para validar a reversão à média.'
      });
    }

    // Exigência de Excelência para Grade A
    if (grade === 'A') {
      if (score < 85) {
        grade = 'B';
        gates.push({ key: 'score', status: 'limited', message: 'Grade A de Volatilidade exige pelo menos 85 pontos.' });
      }
      if ((trendContrib && trendContrib.value < 0.9) || (triggerContrib && triggerContrib.value < 0.9)) {
        grade = 'B';
        gates.push({ key: 'excellence', status: 'limited', message: 'Grade A exige excelência tanto na tendência estrutural quanto no gatilho de sobrevenda.' });
      }
    }

    const gradeObj = grades.find(item => item.grade === grade) || grades[grades.length - 1];
    const gradeRiskPct = grade === 'D' ? 0 : gradeObj.riskPct;
    const baseBudget = (weightsValid && grade !== 'D') ? gradeRiskPct : 0;
    const riskBudgetPct = isLiquidityApproved ? baseBudget : 0;
    const qualityAllowed = isLiquidityApproved && weightsValid && grade === 'A';
    const isBuyPermitted = isLiquidityApproved && grade !== 'D';

    return {
      strategyType: 'VOLATILITY_TRADING',
      rubricVersion: volConfig.version || 'volatility-v1',
      score,
      maximumScore: 100,
      rawGrade,
      grade,
      gradeRiskPct,
      riskBudgetPct,
      riskPct: riskBudgetPct,
      liquidity,
      isLiquidityApproved,
      liquidityStatus: isLiquidityApproved ? (liquidity ? 'APROVADO' : null) : (liquidity?.status || 'BLOQUEADO_LIQUIDEZ'),
      complete,
      contributions,
      gates,
      weightsTotal,
      weightsValid,
      qualityAllowed,
      isBuyPermitted
    };
  }

  function calculateRubric(input = {}, policy) {
    const rawStrat = String(
      input.strategyType ||
      input.strategy_type ||
      input.strategy ||
      input.strategyWorkspace ||
      (typeof globalThis !== 'undefined' && globalThis.StrategyWorkspaceModel && typeof globalThis.StrategyWorkspaceModel.getActiveStrategy === 'function' ? globalThis.StrategyWorkspaceModel.getActiveStrategy() : '') ||
      'TREND_FOLLOWING'
    ).toUpperCase();

    if (rawStrat === 'VOLATILITY_TRADING' || rawStrat === 'VOLATILITY') {
      return calculateVolatilityRubric(input, policy);
    }
    return calculateTrendFollowingRubric(input, policy);
  }

  function getRubricCriteriaForStrategy(strategyType, policy) {
    const normStrat = String(strategyType || 'TREND_FOLLOWING').trim().toUpperCase();
    const p = normalizePolicy(policy);
    if (normStrat === 'VOLATILITY_TRADING' || normStrat === 'VOLATILITY') {
      return p.volatilityRubric.criteria;
    }
    return p.criteria;
  }

  function getRubricVersion(strategyType) {
    const normStrat = String(strategyType || 'TREND_FOLLOWING').trim().toUpperCase();
    if (normStrat === 'VOLATILITY_TRADING' || normStrat === 'VOLATILITY') {
      return 'volatility-v1';
    }
    return 'trend-v2';
  }

  function riskBaseOptions(policy={}){return normalizePolicy(policy).grades.map(item=>item.riskPct);}

  function calculatePositionSizing({equity,entry,stop,atr,riskBudgetPct,riskPct,volatilityPct,capitalPct,portfolioCapacityPct,positionCapacityAvailable=true,lot=100}){
    const account=Number(equity),entryPrice=Number(entry),stopPrice=Number(stop),atrValue=Number(atr),distance=Math.abs(entryPrice-stopPrice);
    const budget=Math.max(0,finite(riskBudgetPct,finite(riskPct,0)));
    const lotSize=Math.max(1,Math.floor(finite(lot,100)));
    const empty={quantity:0,theoreticalQuantity:0,layers:[],allLayers:[],budgetLayer:null,limitingLayer:null,limitingLayerName:null,initialRisk:0,riskBudgetPct:budget,executableRiskPct:0,executableRiskPercent:0};
    if(!(account>0&&entryPrice>0&&distance>0))return empty;
    const round=q=>Math.max(0,Math.floor(q/lotSize)*lotSize);
    const withRisk=(layer)=>({...layer,riskPct:account>0?layer.quantity*distance/account:0});
    const budgetLayer=withRisk({key:'budget',name:'Orçamento de Risco pelo Grade',quantity:round(account*budget/distance),constraintPct:budget});
    const layers=[];
    if(volatilityPct!=null && Number.isFinite(Number(volatilityPct)) && Number(volatilityPct)>0 && atrValue>0){
      const volatilityLimit=Number(volatilityPct);
      layers.push(withRisk({key:'volatility',name:'Limite de volatilidade / ATR',quantity:round(account*volatilityLimit/atrValue),constraintPct:volatilityLimit}));
    }
    if(capitalPct!=null && Number.isFinite(Number(capitalPct)) && Number(capitalPct)>0){
      const capitalLimit=Number(capitalPct);
      layers.push(withRisk({key:'capital',name:'Limite de capital',quantity:round(account*capitalLimit/entryPrice),constraintPct:capitalLimit}));
    }
    const allLayers=[budgetLayer,...layers];
    if(Number.isFinite(Number(portfolioCapacityPct))){
      const capacity=Math.max(0,Number(portfolioCapacityPct));
      allLayers.push(withRisk({key:'portfolio',name:'Capacidade de Portfolio Heat',quantity:round(account*capacity/distance),constraintPct:capacity}));
    }
    if(positionCapacityAvailable===false)allLayers.push(withRisk({key:'positions',name:'Limite máximo de posições',quantity:0,constraintPct:0}));
    const limitingLayer=allLayers.reduce((a,b)=>b.quantity<a.quantity?b:a);
    const quantity=limitingLayer.quantity;
    const initialRisk=quantity*distance;
    const executableRiskPct=account?Number((initialRisk/account).toFixed(10)):0;
    return{quantity,theoreticalQuantity:budgetLayer.quantity,layers,allLayers,budgetLayer,limitingLayer:limitingLayer.key,limitingLayerName:limitingLayer.name,initialRisk,riskBudgetPct:budget,executableRiskPct,executableRiskPercent:Number((executableRiskPct*100).toFixed(8))};
  }

  function calculatePolicyPositionSizing({policy,profileKey,gradeRiskPct,riskBudgetPct,riskPct,currentHeatPct=0,openPositions=0,capitalPct,volatilityPct,enforceCapitalLimit=true,enforceVolatilityLimit=true,...trade}){
    const normalized=normalizePolicy(policy),profile=profileFor(normalized,profileKey);
    const budget=finite(riskBudgetPct,finite(gradeRiskPct,finite(riskPct,0)));
    const heatLimitPct=profile.maximumPortfolioRiskPct*100;
    const portfolioCapacityPct=Math.max(0,(heatLimitPct-Math.max(0,finite(currentHeatPct,0)))/100);
    const activePositions=Math.max(0,Math.floor(finite(openPositions,0)));
    const positionCapacityAvailable=activePositions<profile.maximumPositions;
    let resolvedCapitalPct = profile.capitalPct;
    if (capitalPct !== undefined) {
      resolvedCapitalPct = capitalPct;
    } else if (enforceCapitalLimit === false) {
      resolvedCapitalPct = null;
    }
    let resolvedVolatilityPct = profile.initialVolatilityPct;
    if (volatilityPct !== undefined) {
      resolvedVolatilityPct = volatilityPct;
    } else if (enforceVolatilityLimit === false) {
      resolvedVolatilityPct = null;
    }
    const sizing=calculatePositionSizing({...trade,riskBudgetPct:budget,volatilityPct:resolvedVolatilityPct,capitalPct:resolvedCapitalPct,portfolioCapacityPct,positionCapacityAvailable});
    return{...sizing,profile,currentHeatPct:Math.max(0,finite(currentHeatPct,0)),maximumHeatPct:heatLimitPct,portfolioCapacityPct,openPositions:activePositions,positionCapacityAvailable};
  }

  function calculateOngoingRisk({currentPrice,currentStop,quantity,direction='long',equity}){
    const sign=direction==='short'?-1:1,cash=Math.max(0,(Number(currentPrice)-Number(currentStop))*sign*Number(quantity));
    return{cash,riskPct:equity?cash/equity*100:0};
  }

  function calculatePeelOff({currentPrice,currentStop,atr,quantity,direction='long',equity,policy,profileKey,lot=100}){
    const profile=profileFor(policy,profileKey),sign=direction==='short'?-1:1,gap=Math.max(0,(Number(currentPrice)-Number(currentStop))*sign),current=Math.max(0,Number(quantity)||0),round=q=>Math.max(0,Math.floor(q/lot)*lot),byRisk=gap?round(Number(equity)*profile.ongoingRiskPct/gap):current,byVolatility=Number(atr)>0?round(Number(equity)*profile.ongoingVolatilityPct/Number(atr)):current,allowed=Math.min(current,byRisk,byVolatility),peel=Math.max(0,current-allowed);
    return{profile,allowedQuantity:allowed,peelQuantity:peel,required:peel>0,ongoingRiskPct:gap&&equity?gap*current/equity:0,ongoingVolatilityPct:atr&&equity?Number(atr)*current/equity:0,reason:byRisk<=byVolatility?'Risco em andamento':'Volatilidade em andamento'};
  }

  function validatePortfolio({currentHeatPct=0,additionalRiskPct=0,openPositions=0,maximumHeatPct=12.5,maximumPositions=10}){
    const projectedHeatPct=Number(currentHeatPct)+Number(additionalRiskPct),projectedPositions=Number(openPositions)+1,heatAllowed=projectedHeatPct<=Number(maximumHeatPct),positionsAllowed=projectedPositions<=Number(maximumPositions);
    return{projectedHeatPct,projectedPositions,heatAllowed,positionsAllowed,allowed:heatAllowed&&positionsAllowed};
  }

  return{DEFAULT_POLICY,DEFAULT_VOLATILITY_POLICY,STRATEGY_RUBRIC_VERSIONS,normalizePolicy,normalizeHistoricalGrade,profileFor,marketCycleKey,riskBaseOptions,calculateGrade,calculateVolatilityGrade,calculateRubric,calculateTrendFollowingRubric,calculateVolatilityRubric,getRubricCriteriaForStrategy,getRubricVersion,calculatePositionSizing,calculatePolicyPositionSizing,calculateOngoingRisk,calculatePeelOff,validatePortfolio,classifyAtrVolatility,classifyRelativeStrength,getRubricGradeVisual,getRubricGradeColor};
});
