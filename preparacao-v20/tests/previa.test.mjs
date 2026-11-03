import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {build} from 'esbuild';
test('Prévia conecta controles aos módulos e não chama serviços externos',async()=>{
 const bundle=await build({entryPoints:[new URL('../previa.mjs',import.meta.url).pathname],bundle:true,write:false,format:'iife'});
 const elementos=new Map(),opcionais=[],programa=[];
 function el(id,props={}){const objeto={id,value:'',checked:false,textContent:'',dataset:{},listeners:{},addEventListener(tipo,fn){this.listeners[tipo]=fn},...props};if(id)elementos.set(id,objeto);return objeto}
 for(const [id,value]of[['alvo','conector'],['pontos','60'],['presencas','4'],['meses','0']])programa.push(el(id,{value}));
 for(const id of ['contrib1','contrib2','revisao','aceite'])programa.push(el(id,{checked:id==='contrib1'}));
 for(const id of ['resultado-programa','faltam','saldo-ciclo','saldo-historico','estado-escolhas','eventos','restaurar','status-janela','status-oferta','status-cancelamento'])el(id);
 for(const finalidade of ['diretorio','marketing','imagem'])opcionais.push(el(finalidade,{dataset:{finalidade}}));
 for(const canal of ['email','whatsapp','instagram','linkedin'])opcionais.push(el(canal,{disabled:true,dataset:{finalidade:'contatos',canal}}));
 const document={getElementById:id=>elementos.get(id),querySelectorAll:sel=>sel==='[data-programa]'?programa:sel==='[data-canal]'?opcionais.filter(x=>x.dataset.canal):opcionais};
 vm.runInNewContext(bundle.outputFiles[0].text,{document,Date,Intl,fetch(){throw Error('Sem rede nesta prévia')}});
 assert.equal(elementos.get('saldo-ciclo').textContent,60);assert.equal(elementos.get('saldo-historico').textContent,90);assert.match(elementos.get('resultado-programa').textContent,/Falta a avaliação/);
 const mudar=id=>elementos.get(id).listeners.change();elementos.get('revisao').checked=true;mudar('revisao');assert.match(elementos.get('resultado-programa').textContent,/Falta o aceite/);elementos.get('aceite').checked=true;mudar('aceite');assert.match(elementos.get('resultado-programa').textContent,/decisão administrativa/);
 elementos.get('alvo').value='embaixador';mudar('alvo');assert.equal(elementos.get('revisao').checked,false);assert.equal(elementos.get('aceite').checked,false);
 elementos.get('diretorio').checked=true;mudar('diretorio');assert.equal(elementos.get('email').disabled,false);elementos.get('email').checked=true;mudar('email');assert.equal(elementos.get('marketing').checked,false);
 elementos.get('diretorio').checked=false;mudar('diretorio');assert.equal(elementos.get('email').checked,false);assert.equal(elementos.get('email').disabled,true);
 elementos.get('restaurar').listeners.click();assert.equal(elementos.get('eventos').textContent,'Nenhuma escolha registrada.');
});
