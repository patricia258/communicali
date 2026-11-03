import test from 'node:test';
import assert from 'node:assert/strict';
import { contarVisitas, avaliarParticipacao, prepararEscolhaAdesao, creditoPresenca, creditoIndicacao, avaliarNovaIndicacao } from '../participacao.mjs';
const agora = '2026-11-14T15:00:00Z';
const presenca = (n, extra = {}) => ({checkinId:`c${n}`,edicaoId:`e${n}`,pessoaId:'p1',papelNaPresenca:'visitante',tipoAtividade:'encontro_aberto',validada:true,ocorreuEm:'2026-10-01T12:00:00Z',...extra});
const contar = (presencas, extra = {}) => contarVisitas({pessoaId:'p1',presencas,historicoCompleto:true,agora,...extra});
const avaliar = (presencas, extra = {}) => avaliarParticipacao({pessoaId:'p1',edicao:{id:'nova',tipo:'encontro_aberto'},adesao:null,presencas,historicoCompleto:true,agora,...extra});
const adesao = {pessoaId:'p1',membroId:'m1',evidenciaId:'aceite1',ativa:true,aderiuEm:'2026-09-01T12:00:00Z'};
test('só presenças efetivas de Visitante em encontro aberto consomem visitas',()=>{
 assert.equal(contar([presenca(1),presenca(2,{validada:false}),presenca(3,{tipoAtividade:'oficina'}),presenca(4,{tipoAtividade:'experiencia'}),presenca(5,{papelNaPresenca:'membro'}),presenca(6,{ocorreuEm:'2026-12-01T12:00:00Z'})]).visitas,1);
});
test('repetição do check-in e da edição não contam duas visitas',()=>{
 const p=presenca(1);assert.equal(contar([p,p,{...p,checkinId:'outro'}]).visitas,1);
});
test('histórico parcial e mistura de titulares impedem decisão',()=>{
 assert.throws(()=>contar([],{historicoCompleto:false}));assert.throws(()=>contar([presenca(1,{pessoaId:'outra'})]));
});
test('registros conflitantes, validação ambígua e datas sem fuso são rejeitados',()=>{
 assert.throws(()=>contar([presenca(1),presenca(1,{validada:false})]));
 assert.throws(()=>contar([presenca(1,{validada:'true'})]));assert.throws(()=>contar([presenca(1,{ocorreuEm:'2026-11-01'})]));
});
test('primeira e segunda visita permitem solicitar, sem reservar vaga ou criar membro',()=>{
 for(const visitas of [[],[presenca(1)]])assert.deepEqual(avaliar(visitas),{situacao:'pode_solicitar_como_visitante',visitas:visitas.length,confirmarVaga:false,criarMembro:false});
});
test('terceira participação pede adesão gratuita, sem cobrança ou conversão automática',()=>{
 const r=avaliar([presenca(1),presenca(2)]);assert.equal(r.situacao,'adesao_gratuita_necessaria');assert.equal(r.criarMembro,false);
});
test('retorno à mesma edição já registrada não é terceira visita',()=>{
 assert.equal(avaliar([presenca(1),presenca(2)],{edicao:{id:'e2',tipo:'encontro_aberto'}}).situacao,'visita_ja_registrada');
});
test('Membro com adesão comprovada não sofre limite de visitas',()=>{
 assert.equal(avaliar([presenca(1),presenca(2)],{adesao}).situacao,'pode_solicitar_como_membro');
});
test('adesão de outro titular ou sem evidência não é válida',()=>{
 assert.throws(()=>avaliar([],{adesao:{...adesao,pessoaId:'p2'}}));assert.throws(()=>avaliar([],{adesao:{...adesao,evidenciaId:''}}));
});
test('oficina não herda limite ou gratuidade do encontro aberto',()=>{
 assert.equal(avaliar([presenca(1),presenca(2)],{edicao:{id:'oficina',tipo:'oficina'}}).situacao,'consultar_condicoes_da_atividade');
});
test('continuar visitante é escolha distinta de aderir',()=>{
 const r=prepararEscolhaAdesao({pessoaId:'p1',escolha:'continuar_visitante'});assert.equal(r.criarMembro,false);assert.equal(r.cobrar,false);assert.equal(r.confirmarPresenca,false);
 assert.throws(()=>prepararEscolhaAdesao({pessoaId:'p1',escolha:'aderir'}));
 const a=prepararEscolhaAdesao({pessoaId:'p1',escolha:'aderir',versaoTermos:'v21-revisada',evidenciaApresentacaoId:'ev1'});assert.equal(a.criarMembro,false);assert.equal(a.cobrar,false);
});
const credito = (extra={}) => creditoPresenca({pessoaId:'p1',presenca:presenca(1,{papelNaPresenca:'membro'}),adesao,origensJaCreditadas:[],agora,...extra});
test('Visitante não ganha crédito de Membro mesmo com adesão posterior',()=>{
 assert.equal(credito({presenca:presenca(1)}).pontosPropostos,0);
 assert.equal(credito({adesao:{...adesao,aderiuEm:'2026-11-02T12:00:00Z'}}).pontosPropostos,0);
});
test('presença válida de Membro propõe +10, sem gravação; repetição propõe zero',()=>{
 const r=credito();assert.equal(r.pontosPropostos,10);assert.equal(r.gravarAutomaticamente,false);
 assert.equal(credito({origensJaCreditadas:[r.origem]}).pontosPropostos,0);
});
test('presença não validada, futura, atividade especial ou cadastro inativo não geram crédito',()=>{
 for(const p of [presenca(1,{papelNaPresenca:'membro',validada:false}),presenca(1,{papelNaPresenca:'membro',ocorreuEm:'2027-01-01T12:00:00Z'}),presenca(1,{papelNaPresenca:'membro',tipoAtividade:'oficina'})])assert.equal(credito({presenca:p}).pontosPropostos,0);
 assert.equal(credito({adesao:{...adesao,ativa:false}}).pontosPropostos,0);
});
const indicacao={id:'i1',indicadorId:'m2',indicadorPessoaId:'p2',convidadoPessoaId:'p1',edicaoId:'e1'};
const indicado = (extra={})=>creditoIndicacao({indicacao,presenca:presenca(1),indicadorAtivo:true,origensJaCreditadas:[],agora,...extra});
test('indicação sem comparecimento não gera +5',()=>{
 assert.equal(indicado({presenca:null}).pontosPropostos,0);assert.equal(indicado({presenca:presenca(1,{validada:false})}).pontosPropostos,0);
});
test('crédito por convidado depende da presença correspondente e não duplica',()=>{
 const r=indicado();assert.equal(r.pontosPropostos,5);assert.equal(r.gravarAutomaticamente,false);assert.equal(indicado({origensJaCreditadas:[r.origem]}).pontosPropostos,0);
 assert.throws(()=>indicado({presenca:presenca(2)}));assert.throws(()=>indicado({presenca:presenca(1,{pessoaId:'outra'})}));
});
test('outra indicação para o mesmo convidado/edição não cria segunda origem',()=>{
 const r=indicado();assert.equal(indicado({indicacao:{...indicacao,id:'i2',indicadorId:'m3'},origensJaCreditadas:[r.origem]}).pontosPropostos,0);
});
test('autoindicação é rejeitada e indicador indisponível não recebe crédito',()=>{
 assert.throws(()=>indicado({indicacao:{...indicacao,indicadorPessoaId:'p1'}}));assert.equal(indicado({indicadorAtivo:false}).pontosPropostos,0);
});
const nova = (extra={})=>avaliarNovaIndicacao({indicadorPessoaId:'p2',convidadoPessoaId:'p1',edicaoId:'e1',indicadorAtivo:true,indicacoes:[],historicoCompleto:true,...extra});
const ocupacao={indicadorPessoaId:'p2',convidadoPessoaId:'p3',edicaoId:'e1',ocupaCota:true};
test('cota inicial de um convidado é por edição e não reserva vaga',()=>{
 const r=nova();assert.equal(r.limite,1);assert.equal(r.situacao,'pode_solicitar_indicacao');assert.equal(r.reservarCota,false);assert.equal(r.confirmarVaga,false);
 assert.equal(nova({indicacoes:[ocupacao]}).situacao,'limite_da_edicao_atingido');
});
test('cota configurada pela organização pode ser diferente, inclusive zero',()=>{
 assert.equal(nova({limite:2,indicacoes:[ocupacao]}).situacao,'pode_solicitar_indicacao');assert.equal(nova({limite:0}).situacao,'limite_da_edicao_atingido');
 assert.throws(()=>nova({limite:-1}));assert.throws(()=>nova({limite:'2'}));
});
test('repetição de indicação não ocupa duas cotas e não libera segunda pessoa',()=>{
 assert.equal(nova({indicacoes:[ocupacao,ocupacao]}).utilizadas,1);
 assert.equal(nova({convidadoPessoaId:'p3',indicacoes:[ocupacao]}).situacao,'indicacao_ja_registrada');
});
test('cota recusa histórico parcial, de outro indicador ou edição',()=>{
 assert.throws(()=>nova({historicoCompleto:false}));assert.throws(()=>nova({indicacoes:[{...ocupacao,edicaoId:'e2'}]}));assert.throws(()=>nova({indicacoes:[{...ocupacao,indicadorPessoaId:'p4'}]}));
});
test('ocupação é conferida no servidor; não presumir efeito de cancelamento',()=>{
 assert.throws(()=>nova({indicacoes:[{...ocupacao,ocupaCota:undefined}]}));assert.equal(nova({indicacoes:[{...ocupacao,ocupaCota:false}]}).utilizadas,0);
});
test('consultas não modificam histórico, adesão ou indicação',()=>{
 const p=Object.freeze(presenca(1));const historico=Object.freeze([p]);const a=Object.freeze({...adesao});const i=Object.freeze({...indicacao});
 contar(historico);avaliar(historico,{adesao:a});credito({adesao:a});indicado({indicacao:i,presenca:p});assert.equal(p.papelNaPresenca,'visitante');
});
