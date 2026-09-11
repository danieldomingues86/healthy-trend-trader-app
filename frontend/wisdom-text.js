/* Shared, conservative validation. OCR syntax checks never certify meaning. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WisdomText=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function sanitizeWisdomText(value){
    return String(value??'').normalize('NFC')
      .replace(/<\/?(?:p|br|div|span|b|i|strong|em)\b[^>]*>/gi,' ')
      .replace(/&(amp|quot|apos|nbsp|lt|gt);/g,(_,key)=>({amp:'&',quot:'"',apos:"'",nbsp:' ',lt:'<',gt:'>'}[key]))
      .replace(/&#(x[0-9a-f]+|\d+);/gi,(all,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):all;})
      .replace(/\\(?:r\\n|n|r|N|t)/g,' ')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\ufeff]/g,'')
      .replace(/\s+/g,' ').trim();
  }
  function detectCorruptedWisdomText(value){
    const text=String(value??''),reasons=[];
    if(/\\|[{}<>|]|&(?:#\w+|\w+);|\uFFFD|Ã[\x80-\xBF]|Â[\x80-\xBF]/u.test(text))reasons.push('escape_encoding_or_markup');
    if(/(?:[=»<>/\\]\s*){2,}|(?:^|\s)[A-Za-z]\s*=|\bconst\s+\w+\s*=|function\s*\(|\bundefined\b|\.(?:jpg|png|webp)\b/i.test(text))reasons.push('technical_residue');
    if(/\b[a-z]{23,}\b/i.test(text))reasons.push('possibly_joined_words');
    if(/(?:\b(?:\d|[b-df-hj-np-tv-z])\b[\s\W]*){5,}/i.test(text))reasons.push('fragmented_tokens');
    if((text.match(/[#$%~_^*]/g)||[]).length>3)reasons.push('symbol_noise');
    if(/TRADING CARD\s*#|\bTOPICS\s*:|@\w+|https?:\/\//i.test(text))reasons.push('metadata_in_message');
    return reasons;
  }
  function validateWisdomText(value,{verified=false,required=true,kind='message'}={}){
    const text=sanitizeWisdomText(value),reasons=detectCorruptedWisdomText(text).filter(reason=>kind!=='source'||reason!=='metadata_in_message');
    if(required&&(!text||!/[\p{L}]/u.test(text)))reasons.push('missing_readable_text');
    if(text&&!verified)reasons.push('source_transcription_unverified');
    return {text,valid:!reasons.length,needsReview:!!reasons.length,reasons,confidence:!reasons.length?1:0};
  }
  function auditRecord(raw){
    const verified=raw.editorialVerified===true;
    const fields={};
    for(const key of ['quote','pt','author','title','theme','source','originalText'])fields[key]=validateWisdomText(raw[key],{verified:key==='originalText'?false:verified,required:key==='quote',kind:key==='source'?'source':'message'});
    fields.tags=(raw.tags||[]).map(value=>validateWisdomText(value,{verified,required:false}));
    fields.reflection=Object.fromEntries(Object.entries(raw.reflection||{}).map(([key,value])=>[key,validateWisdomText(value,{verified,required:false})]));
    const metadataInvalid=['author','title','theme','source'].some(key=>raw[key]&&!fields[key].valid)||fields.tags.some(x=>!x.valid)||Object.values(fields.reflection).some(x=>!x.valid);
    const needsReview=!fields.quote.valid||metadataInvalid;
    const reasons=[...new Set([...fields.quote.reasons,...(metadataInvalid?['metadata_requires_review']:[]),...(raw.reviewReason?[raw.reviewReason]:[])])];
    const normalized=Object.keys(fields).filter(key=>typeof raw[key]==='string'&&fields[key].text!==raw[key]);
    const translationFallback=!needsReview&&!!raw.pt&&!fields.pt.valid;
    return {id:raw.id,image:raw.image,number:raw.number,index:raw.index,
      quote:needsReview?'':fields.quote.text,pt:needsReview||!fields.pt.valid?'':fields.pt.text,
      author:fields.author.valid?fields.author.text:'',theme:fields.theme.valid?fields.theme.text:'',
      title:fields.title.valid?fields.title.text:'',source:fields.source.valid?fields.source.text:'',
      tags:fields.tags.filter(x=>x.valid).map(x=>x.text),reflection:Object.fromEntries(Object.entries(fields.reflection).filter(([,x])=>x.valid).map(([key,x])=>[key,x.text])),
      needsReview,status:needsReview?'needs_review':'approved',confidence:needsReview?0:1,
      reasons,fieldFindings:Object.fromEntries(Object.entries(fields).filter(([,v])=>v.reasons?.length).map(([key,v])=>[key,v.reasons])),normalized,translationFallback,searchText:sanitizeWisdomText(raw.originalText),
      unrecoverable:!/[\p{L}]{3}/u.test(sanitizeWisdomText(raw.originalText)||fields.quote.text)};
  }
  return {sanitizeWisdomText,detectCorruptedWisdomText,validateWisdomText,auditRecord};
});
