// One-time migration of existing editorial fields, retaining original values.
const fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('frontend/trader-wisdom-v2.js','utf8');
const annotations=vm.runInNewContext('('+js.match(/const annotations = (\{[\s\S]*?\n  \});/)[1]+')');
const html=fs.readFileSync('index.html','utf8');
const known=vm.runInNewContext('('+html.match(/const traderWisdomItems=(\[[\s\S]*?\n\]);/)[1]+')');
const data=Object.fromEntries(Object.entries(annotations).map(([file,fields])=>[`assets/trader-wisdom/Trader Quotes/${file}`,{...fields,editorialVerified:true}]));
for(const item of known)data[item.image]={...data[item.image],...item};
// Earlier versions shortened these quotations / narrated a diagram as a quote.
// Retain their data for review instead of silently treating it as verbatim.
for(const file of ['tw-0016.jpg','tw-0017.jpg','tw-0025.jpg'])Object.assign(data[`assets/trader-wisdom/Trader Quotes/${file}`],{editorialVerified:false,reviewReason:'prior_editorial_paraphrase_requires_source_review'});
fs.writeFileSync('assets/wisdom-editorial.json',JSON.stringify(data,null,2));
