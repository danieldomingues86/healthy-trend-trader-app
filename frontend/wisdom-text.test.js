const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {sanitizeWisdomText,validateWisdomText,auditRecord}=require('./wisdom-text');
const {select,inCategory}=require('./wisdom-library');
test('Normalizes encoding, HTML and literal escapes without rewriting meaning',()=>{
 assert.equal(sanitizeWisdomText('<p>Café&nbsp;&amp; disciplina.\\N</p>'),'Café & disciplina.');
 for(const text of ['Risk 1%–2%, then wait.','To be or not to be.','A strategy must function well.','R$ 1.000 / US$ 200','Não corra atrás do preço.'])assert.equal(validateWisdomText(text,{verified:true}).valid,true,text);
});
test('Raw OCR is never approved by removing punctuation or guessing words',()=>{
 for(const quote of ['\\ & Beware of false knowledge; it is more dangerous \\ than ignorance. A = (George Bernard Shaw) \\N','Vueve goto geet ene lis we sometimestbecauseithatss Where the fruitiish','mae 4 2 us » The brainworks 31% better y) you G / 8 \\S','Riu = Coat G to =. oc a o. see - Cg WE oe 3 3 2','A completely grammatical sentence with unverified attribution.']){
  const r=auditRecord({quote,originalText:quote});assert(r.needsReview);assert.equal(r.quote,'');assert.equal(r.confidence,0);
 }
});
test('Bad translation falls back to verified original; bad author quarantines record',()=>{
 const input={quote:'Cut your losses short and let your profits run.',pt:'Corte loss & deixe profits { executar',editorialVerified:true};
 const r=auditRecord(input);assert(!r.needsReview);assert(r.translationFallback);assert.equal(r.pt,'');assert.equal(r.quote,input.quote);
 assert(auditRecord({...input,author:'a = x \\ N'}).needsReview);
});
test('Every archive record is audited, originals retained, publishable fields pass again',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('./wisdom-catalog.js'),'utf8'),ctx);
 const catalog=ctx.window.wisdomCatalog,paths=JSON.parse(fs.readFileSync(require.resolve('../assets/wisdom-index.json'))).items;
 assert.equal(catalog.records.length,paths.length);assert.equal(new Set(catalog.records.map(r=>r.image)).size,paths.length);
 assert.equal(catalog.counts.valid+catalog.counts.needsReview,paths.length);
 for(const r of catalog.records){assert(fs.existsSync(r.image));if(r.needsReview){assert.equal(r.quote,'');assert.equal(r.pt,'');}else for(const field of ['quote','pt','author','title','source'])if(r[field])assert(validateWisdomText(r[field],{verified:true,kind:field==='source'?'source':'message'}).valid,`${r.id}/${field}`);}
});
test('Category, search, favorite and sort predicates compose',()=>{
 const records=[{id:'a',theme:'risk',quote:'Manage capital',pt:'Gerencie o capital',author:'Maria',tags:[],index:0},{id:'b',theme:'psychology',quote:'Discipline',pt:'Disciplina',author:'John',tags:[],index:1},{id:'c',theme:'psychology',quote:'Patience',pt:'Paciência',author:'Ann',tags:[],index:2},{id:'d',quote:'',searchText:'Minervini',needsReview:true,index:3}];
 assert.deepEqual(select(records,{category:'psychology',query:'disciplina'}).map(r=>r.id),['b']);
 assert.deepEqual(select(records,{category:'risk',query:'disciplina'}),[]);
 assert.deepEqual(select(records,{category:'psychology',special:'favorites',favorites:['c']}).map(r=>r.id),['c']);
 assert.deepEqual(select(records,{category:'review',query:'Minervini'}),[]);
 assert.deepEqual(select([{...records[3],searchText:'Mark Minervini on discipline'}],{category:'traders'}).map(r=>r.id),['d']);
 assert.deepEqual(select(records,{sort:'newest'}).map(r=>r.id),['d','c','b','a']);
 assert(inCategory(records[1],'psychology'));assert(!inCategory(records[1],'risk'));
});
