(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WisdomLibrary=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const categoryThemes={psychology:['psychology','discipline','patience'],risk:['risk'],performance:['process','discipline'],strategy:['process'],traders:[],mindset:['mindset','wisdom']};
 const traders=new Set(['Brett Steenbarger','Mark Minervini','Paul Tudor Jones','Larry Hite','Ed Seykota','Dan Zanger','Jesse Livermore','Denise Shull']);
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function inferredTheme(record){
  const source=normalize([record.theme,record.author,record.quote,record.pt,record.searchText,...(record.tags||[])].join(' '));
  if([...traders].some(name=>source.includes(normalize(name))))return 'traders';
  if(/\b(risk|risco|loss|perda|losses|stop|capital|drawdown|position siz|gerencia|protect|proteger|exposur)\b/.test(source))return 'risk';
  if(/\b(psycholog|emoc|emotion|fear|medo|greed|ganancia|disciplin|pacien|confidence|mental)\b/.test(source))return 'psychology';
  if(/\b(performance|performar|consisten|practice|pratica|improve|melhorar|success|sucesso|goal|objetivo)\b/.test(source))return 'performance';
  if(/\b(strategy|estrateg|market|mercado|trend|tendencia|price|preco|chart|grafico|setup|timing|trade|trading|opportunit)\b/.test(source))return 'strategy';
  return 'mindset';
 }
 function inCategory(record,category){const theme=record.theme||inferredTheme(record);return category==='all'||(category==='traders'?theme==='traders'||traders.has(record.author):category===theme||(categoryThemes[category]||[]).includes(theme));}
 function select(records,{category='all',query='',special='all',sort='featured',favorites=[]}={}){
  const words=normalize(query).split(/\s+/).filter(Boolean),fav=new Set(favorites);
  return records.filter(r=>category!=='review'&&inCategory(r,category)
   &&(special!=='favorites'||fav.has(r.id))&&(special!=='featured'||!!r.author||!!r.searchText)
   &&words.every(word=>normalize([r.quote,r.pt,r.author,r.title,r.theme,inferredTheme(r),({discipline:'Disciplina',patience:'Paciência',process:'Processo',psychology:'Psicologia',risk:'Risco',performance:'Performance',strategy:'Estratégia',traders:'Grandes Traders',mindset:'Mindset e Vida'})[inferredTheme(r)],...(r.tags||[]),...Object.values(r.reflection||{}),r.searchText,...Object.entries(categoryThemes).filter(([key])=>inCategory(r,key)).map(([key])=>({psychology:'Psicologia Psychology',risk:'Risco e Gerenciamento Risk Management',performance:'Performance',strategy:'Estratégia Strategy',mindset:'Mindset e Vida Life',traders:'Grandes Traders Great Traders'}[key]))].join(' ')).includes(word)))
   .sort((a,b)=>sort==='newest'?b.index-a.index:sort==='oldest'?a.index-b.index:sort==='author'?(a.author||'\uffff').localeCompare(b.author||'\uffff'):sort==='favorites'?Number(fav.has(b.id))-Number(fav.has(a.id))||a.index-b.index:a.index-b.index);
 }
 return {categoryThemes,inferredTheme,inCategory,select};
});
