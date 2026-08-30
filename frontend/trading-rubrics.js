(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TradingRubrics=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DEFAULT_POLICY={
    criteria:[
      {key:'marketCycle',label:'Market Cycle favorável à direção',weight:1},
      {key:'trendQuality',label:'Diário acima das médias 20 e 200',weight:1},
      {key:'relativeStrength',label:'Força relativa do ativo vs. índice',weight:1},
      {key:'sector',label:'Setor alinhado ao contexto',weight:1},
      {key:'setupQuality',label:'Setup com contração saudável no 4H',weight:1},
      {key:'volatility',label:'ATR% dentro da faixa permitida',weight:1},
      {key:'entryQuality',label:'Price Action fluido de ler',weight:1}
    ],
    ratingScale:{bad:{label:'Ruim',score:0},medium:{label:'Médio',score:1},good:{label:'Bom',score:2}},
    grades:[
      {grade:'A+',minScore:10,riskPct:.003},
      {grade:'A',minScore:7,riskPct:.002},
      {grade:'B',minScore:4,riskPct:.001},
      {grade:'C',minScore:1,riskPct:0},
      {grade:'No Trade',minScore:-Infinity,riskPct:0}
    ]
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  function normalizePolicy(policy={}){const merged={...clone(DEFAULT_POLICY),...policy};const savedCriteria=policy.criteria||[];merged.criteria=DEFAULT_POLICY.criteria.map(base=>{const saved=savedCriteria.find(c=>c.key===base.key)||{};return{...base,weight:Number(saved.weight??base.weight)}});merged.ratingScale={...DEFAULT_POLICY.ratingScale,...(policy.ratingScale||{})};merged.grades=(policy.grades||DEFAULT_POLICY.grades).map(g=>({...g,minScore:Number(g.minScore),riskPct:Number(g.riskPct)})).sort((a,b)=>b.minScore-a.minScore);return merged}
  function calculateRubric(input={},policy){const p=normalizePolicy(policy);const ratings=input.ratings||{};const hasRatingInput=Object.keys(ratings).length>0||p.criteria.some(c=>Boolean(input[`${c.key}Rating`]));const contributions=p.criteria.map(c=>{const selectedRating=ratings[c.key]||input[`${c.key}Rating`]||null;const ratingValue=selectedRating&&p.ratingScale[selectedRating]?p.ratingScale[selectedRating].score:input[c.key];const value=Math.max(-2,Math.min(2,Number(ratingValue??0)));return{key:c.key,label:c.label,selectedRating,value,weight:c.weight,points:value*c.weight}});const complete=!hasRatingInput||p.criteria.every(c=>Boolean(ratings[c.key]||input[`${c.key}Rating`]));const score=contributions.reduce((sum,c)=>sum+c.points,0);const grade=complete?(p.grades.find(g=>score>=g.minScore)||p.grades[p.grades.length-1]):{grade:'—',riskPct:0};return{score,grade:grade.grade,riskPct:grade.riskPct,complete,contributions,marketCycle:input.marketCycleRegime||'neutral'}}
  function calculatePositionSizing({equity,entry,stop,atr,riskPct,volatilityPct,capitalPct,lot=100}){const distance=Math.abs(Number(entry)-Number(stop));if(!(equity>0&&entry>0&&atr>0&&distance>0))return{quantity:0,layers:[],limitingLayer:null,initialRisk:0};const round=q=>Math.max(0,Math.floor(q/lot)*lot);const layers=[{key:'risk',name:'Risco pelo stop',quantity:round(equity*riskPct/distance)},{key:'volatility',name:'Volatilidade / ATR',quantity:round(equity*volatilityPct/atr)},{key:'capital',name:'Limite de capital',quantity:round(equity*capitalPct/entry)}];const limitingLayer=layers.reduce((a,b)=>b.quantity<a.quantity?b:a);return{quantity:limitingLayer.quantity,layers,limitingLayer:limitingLayer.key,initialRisk:limitingLayer.quantity*distance}}
  function calculateOngoingRisk({currentPrice,currentStop,quantity,direction='long',equity}){const sign=direction==='short'?-1:1;const cash=Math.max(0,(Number(currentPrice)-Number(currentStop))*sign*Number(quantity));return{cash,riskPct:equity?cash/equity*100:0}}
  function validatePortfolio({currentHeatPct=0,additionalRiskPct=0,openPositions=0,maximumHeatPct=12.5,maximumPositions=10}){const projectedHeatPct=Number(currentHeatPct)+Number(additionalRiskPct);const projectedPositions=Number(openPositions)+1;const heatAllowed=projectedHeatPct<=Number(maximumHeatPct);const positionsAllowed=projectedPositions<=Number(maximumPositions);return{projectedHeatPct,projectedPositions,heatAllowed,positionsAllowed,allowed:heatAllowed&&positionsAllowed}}
  return{DEFAULT_POLICY,normalizePolicy,calculateRubric,calculatePositionSizing,calculateOngoingRisk,validatePortfolio};
});
