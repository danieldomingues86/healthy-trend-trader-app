const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCsv,ratio,similarity}=require('../src/refresh-fundamentals');

test('parser CSV preserva campos entre aspas e cabeçalho com BOM',()=>{const rows=parseCsv('\uFEFFCOD;NOME;VALOR\n1;"Empresa; S.A.";10,5\n');assert.deepEqual(rows,[{COD:'1',NOME:'Empresa; S.A.',VALOR:'10,5'}])});
test('ratio evita divisão por zero e aceita valores numéricos',()=>{assert.equal(ratio(10,2),5);assert.equal(ratio(10,0),null);assert.equal(ratio(null,2),null)});
test('similaridade ignora acentos, conectivos e caixa alta',()=>{assert.equal(similarity('Petróleo Brasileiro S.A.','PETROLEO BRASILEIRO SA'),1);assert.ok(similarity('Empresa de Energia','Empresa de Varejo')<1)});
