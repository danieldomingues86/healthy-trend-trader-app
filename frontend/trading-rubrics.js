(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TradingRubrics=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DEFAULT_POLICY={
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
      healthy:{label:'Saudável',score:1},transition:{label:'Transição',score:.55},
      defensive:{label:'Defensivo',score:.2},unavailable:{label:'Não disponível',score:0},
      improving:{label:'Transição',score:.55},riskOff:{label:'Defensivo',score:.2}
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
      atrVolatility
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
    if(['healthy','saudável','saudavel','risk-on','up'].includes(normalized))return'healthy';
    if(['improving','melhorando','em recuperação','em recuperacao'].includes(normalized))return'transition';
    if(['transition','transição','transicao','neutral','neutro','transição saudável','transicao saudavel'].includes(normalized))return'transition';
    if(['defensive','defensivo','weak','sideways','deteriorating','desfavorável','desfavoravel'].includes(normalized))return'defensive';
    if(['riskoff','risk-off','doente','down'].includes(normalized))return'defensive';
    if(['unavailable','não disponível','nao disponivel','indisponível','indisponivel','none'].includes(normalized))return'unavailable';
    return'transition';
  }

  function calculateGrade(score,policy){
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
    if ((hasNum && num < 40) || c.includes('frac') || c.includes('lag') || c.includes('abaixo')) {
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

  function calculateRubric(input={},policy){
    const p=normalizePolicy(policy),ratings={...(input.ratings||{})},profile=profileFor(p,input.profileKey);
    if((Number(input.entry)>0&&Number(input.atr)>0)&&(!ratings.volatility||input.autoVolatility!==false)){
      const autoPct=(Number(input.atr)/Number(input.entry))*100;
      const autoVol=classifyAtrVolatility(autoPct,p.atrVolatility);
      if(autoVol)ratings.volatility=autoVol.rating;
    }
    const rawCycle=input.marketCycleRegime!==undefined?input.marketCycleRegime:(ratings.marketCycle||input.marketCycle);
    const cycleKey=rawCycle===null||rawCycle==='unavailable'?'unavailable':(marketCycleKey(rawCycle)||'transition');
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
    if(cycleKey==='defensive'&&grade==='A'){grade='B';gates.push({key:'market',status:'limited',message:'Mercado defensivo: a classificação máxima é B.'});}
    if(cycleKey==='unavailable'){gates.push({key:'market',status:'limited',message:'Não foi possível obter o ciclo de mercado atual (ciclo não disponível).'});}
    const gradeObj=p.grades.find(item=>item.grade===grade)||p.grades[p.grades.length-1];
    const gradeRiskPct=gradeObj.riskPct;
    const riskBudgetPct=(weightsValid&&complete&&grade!=='D')?gradeRiskPct:0;
    const qualityAllowed=weightsValid&&complete&&grade==='A';
    return{score,maximumScore:100,rawGrade,grade,gradeRiskPct,riskBudgetPct,riskPct:riskBudgetPct,marketCycle:cycleKey,profile,complete,contributions,gates,weightsTotal,weightsValid,qualityAllowed};
  }

  function riskBaseOptions(policy={}){return normalizePolicy(policy).grades.map(item=>item.riskPct);}

  function calculatePositionSizing({equity,entry,stop,atr,riskBudgetPct,riskPct,volatilityPct,capitalPct,portfolioCapacityPct,positionCapacityAvailable=true,lot=100}){
    const account=Number(equity),entryPrice=Number(entry),stopPrice=Number(stop),atrValue=Number(atr),distance=Math.abs(entryPrice-stopPrice);
    const budget=Math.max(0,finite(riskBudgetPct,finite(riskPct,0)));
    const volatilityLimit=Math.max(0,finite(volatilityPct,0));
    const capitalLimit=Math.max(0,finite(capitalPct,0));
    const lotSize=Math.max(1,Math.floor(finite(lot,100)));
    const empty={quantity:0,theoreticalQuantity:0,layers:[],allLayers:[],budgetLayer:null,limitingLayer:null,limitingLayerName:null,initialRisk:0,riskBudgetPct:budget,executableRiskPct:0,executableRiskPercent:0};
    if(!(account>0&&entryPrice>0&&atrValue>0&&distance>0))return empty;
    const round=q=>Math.max(0,Math.floor(q/lotSize)*lotSize);
    const withRisk=(layer)=>({...layer,riskPct:account>0?layer.quantity*distance/account:0});
    const budgetLayer=withRisk({key:'budget',name:'Orçamento de Risco pelo Grade',quantity:round(account*budget/distance),constraintPct:budget});
    const layers=[
      withRisk({key:'volatility',name:'Limite de volatilidade / ATR',quantity:round(account*volatilityLimit/atrValue),constraintPct:volatilityLimit}),
      withRisk({key:'capital',name:'Limite de capital',quantity:round(account*capitalLimit/entryPrice),constraintPct:capitalLimit})
    ];
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

  function calculatePolicyPositionSizing({policy,profileKey,gradeRiskPct,riskBudgetPct,riskPct,currentHeatPct=0,openPositions=0,...trade}){
    const normalized=normalizePolicy(policy),profile=profileFor(normalized,profileKey);
    const budget=finite(riskBudgetPct,finite(gradeRiskPct,finite(riskPct,0)));
    const heatLimitPct=profile.maximumPortfolioRiskPct*100;
    const portfolioCapacityPct=Math.max(0,(heatLimitPct-Math.max(0,finite(currentHeatPct,0)))/100);
    const activePositions=Math.max(0,Math.floor(finite(openPositions,0)));
    const positionCapacityAvailable=activePositions<profile.maximumPositions;
    const sizing=calculatePositionSizing({...trade,riskBudgetPct:budget,volatilityPct:profile.initialVolatilityPct,capitalPct:profile.capitalPct,portfolioCapacityPct,positionCapacityAvailable});
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

  return{DEFAULT_POLICY,normalizePolicy,normalizeHistoricalGrade,profileFor,marketCycleKey,riskBaseOptions,calculateGrade,calculateRubric,calculatePositionSizing,calculatePolicyPositionSizing,calculateOngoingRisk,calculatePeelOff,validatePortfolio,classifyAtrVolatility,classifyRelativeStrength,getRubricGradeVisual,getRubricGradeColor};
});
