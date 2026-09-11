(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WisdomLibrary=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const categoryThemes={psychology:['psychology','discipline','patience'],risk:['risk'],performance:['process','discipline'],strategy:['process'],traders:[],mindset:['mindset','wisdom']};
 const traders=new Set(['Brett Steenbarger','Mark Minervini','Paul Tudor Jones','Larry Hite','Ed Seykota','Dan Zanger','Jesse Livermore','Denise Shull']);
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function inCategory(record,category){return category==='all'||category==='review'||(category==='traders'?traders.has(record.author):(categoryThemes[category]||[]).includes(record.theme));}
 function select(records,{category='all',query='',special='all',sort='featured',favorites=[]}={}){
  const words=normalize(query).split(/\s+/).filter(Boolean),fav=new Set(favorites);
  return records.filter(r=> (category==='review'?r.needsReview:!r.needsReview)&&inCategory(r,category)
   &&(special!=='favorites'||fav.has(r.id))&&(special!=='featured'||!!r.author)
   &&words.every(word=>normalize([r.quote,r.pt,r.author,r.title,r.theme,({discipline:'Disciplina',patience:'Paciência',process:'Processo'})[r.theme],...(r.tags||[]),...Object.values(r.reflection||{}),...(category==='review'?[r.searchText]:[]),...Object.entries(categoryThemes).filter(([key])=>inCategory(r,key)).map(([key])=>({psychology:'Psicologia Psychology',risk:'Risco e Gerenciamento Risk Management',performance:'Performance',strategy:'Estratégia Strategy',mindset:'Mindset e Vida Life',traders:'Grandes Traders Great Traders'}[key]))].join(' ')).includes(word)))
   .sort((a,b)=>sort==='newest'?b.index-a.index:sort==='oldest'?a.index-b.index:sort==='author'?(a.author||'\uffff').localeCompare(b.author||'\uffff'):sort==='favorites'?Number(fav.has(b.id))-Number(fav.has(a.id))||a.index-b.index:a.index-b.index);
 }
 return {categoryThemes,inCategory,select};
});
