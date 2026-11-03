const {transformSync}=require('esbuild');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const moduleFixture={exports:{}};
const js=transformSync(readFileSync(require('node:path').join(__dirname,'../../src/pages/checkinCredito.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
new Function('module','exports',js)(moduleFixture,moduleFixture.exports);
const {mensagemCreditoCheckin:msg}=moduleFixture.exports;
let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++;};
const base={repetido:false,categoria:'membro'};
eq(msg(base),null); // Resposta legada não comprova crédito.
eq(msg({...base,repetido:true}),'Sua presença neste encontro já estava registrada.');
const credito={situacao:'registrado',pontos:10,movimento_id:'mov1'};
eq(msg({...base,credito}),'10 pontos registrados pela participação neste encontro.');
for(const categoria of ['visitante','convidado','kids','desconhecido'])eq(msg({...base,categoria,credito}),null);
for(const errado of [{...credito,movimento_id:''},{...credito,situacao:'pendente'},{...credito,pontos:0},{...credito,pontos:-10},{...credito,pontos:1.5},{...credito,pontos:'10'}])eq(msg({...base,credito:errado}),null);
eq(msg({...base,credito:{...credito,pontos:1}}),'1 ponto registrado pela participação neste encontro.');
console.log(`${checks} verificações do retorno de crédito aprovadas; sem banco ou escrita.`);
