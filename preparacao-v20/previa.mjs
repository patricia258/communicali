import { avaliar, saldos, VERSAO_REGRAS } from './regras.mjs';
import { preferencias } from './privacidade.mjs';
import { janelaInscricao, prazoOferta, classificarCancelamento } from './prazos.mjs';
const $=id=>document.getElementById(id), titular='membro-ficticio';
function mostrarPrograma(){
  const alvo=$('alvo').value, pontos=Number($('pontos').value), presencas=Number($('presencas').value);
  const contrib=[];if($('contrib1').checked)contrib.push({id:'c1',validada:true,relacional:true,natureza:'relacional'});if($('contrib2').checked)contrib.push({id:'c2',validada:true,natureza:'programacao'});
  try{
    const r=avaliar({membroId:titular,alvo,pontosCiclo:pontos,presencas,escopoPresencas:'ciclo',contribuicoes:contrib,mesesComoConector:Number($('meses').value),avaliacao:$('revisao').checked?{id:'revisao-demo',membroId:titular,alvo,versao:VERSAO_REGRAS,resultado:'aprovada'}:null,aceite:$('aceite').checked?{id:'aceite-demo',membroId:titular,alvo,versao:VERSAO_REGRAS,escolha:'aceitar'}:null});
    const textos={dados_pendentes:'Há dados que precisam ser confirmados.',requisitos_pendentes:'Ainda faltam requisitos para avaliação.',aguarda_avaliacao:'Requisitos quantitativos atendidos. Falta a avaliação da CALI.',aguarda_aceite:'Avaliação simulada aprovada. Falta o aceite da função.',pronto_para_decisao_administrativa:'Avaliação e aceite simulados registrados. A mudança de categoria continua sendo uma decisão administrativa.'};
    $('resultado-programa').textContent=textos[r.situacao]||r.situacao;
    const nomes={pontuacao:'pontuação',presencas:'presenças',contribuicoes:'contribuições',contribuicao_relacional:'contribuição relacional',naturezas_distintas:'duas naturezas de contribuição',tempo_como_conector:'12 meses como Conector'};
    $('faltam').textContent=(r.faltam||[]).map(x=>nomes[x]||x).join(' • ');
    const s=saldos({membroId:titular,inicioCiclo:'2026-06-01T03:00:00Z',fimCiclo:'2027-06-01T03:00:00Z',agora:'2026-11-02T12:00:00Z',movimentos:[{id:'antigo',origem:'antigo',membroId:titular,pontos:30,validado:true,ocorridoEm:'2025-08-01T12:00:00Z'},{id:'atual',origem:'atual',membroId:titular,pontos,validado:true,ocorridoEm:'2026-08-01T12:00:00Z'}]});
    $('saldo-ciclo').textContent=s.ciclo;$('saldo-historico').textContent=s.historico;
  }catch{$('resultado-programa').textContent='Confira os valores da simulação.';$('faltam').textContent='';}
}
let eventos=[],sequencia=0;
for(const input of document.querySelectorAll('[data-finalidade]')) input.addEventListener('change',()=>{
  const finalidade=input.dataset.finalidade,canal=input.dataset.canal;
  eventos.push({id:`demo-${++sequencia}`,sequencia,titularId:titular,finalidade,acao:input.checked?'autorizar':'revogar',versaoAviso:'previa-interna-sem-validade-de-aceite',ocorridoEm:new Date().toISOString(),...(canal?{canais:[canal]}:{})});
  const p=preferencias({titularId:titular,eventos});
  for(const contato of document.querySelectorAll('[data-canal]')){contato.disabled=!p.diretorio;contato.checked=p.contatos[contato.dataset.canal];}
  $('estado-escolhas').textContent=`Rede: ${p.diretorio?'visível':'fora da Rede'} · Marketing: ${p.marketing?'autorizado':'não autorizado'} · Imagem: ${p.imagem?'autorizada':'não autorizada'}`;
  $('eventos').textContent=`${eventos.length} escolhas simuladas nesta página. Ao fechar ou recarregar, elas são descartadas.`;
});
for(const input of document.querySelectorAll('[data-programa]'))input.addEventListener('change',()=>{if(input.id==='alvo'){$('revisao').checked=false;$('aceite').checked=false;}mostrarPrograma()});
$('restaurar').addEventListener('click',()=>{eventos=[];sequencia=0;for(const input of document.querySelectorAll('[data-finalidade]')){input.checked=false;if(input.dataset.canal)input.disabled=true;}$('estado-escolhas').textContent='Rede, marketing, imagem e contatos estão desligados.';$('eventos').textContent='Nenhuma escolha registrada.';});
const janela=janelaInscricao({aberturaMembros:'2026-11-02T12:00:00Z',aberturaGeral:'2026-11-04T12:00:00Z',encerramento:'2026-11-13T12:00:00Z',agora:'2026-11-03T12:00:00Z',membro:true,elegivel:true,vagas:1});
$('status-janela').textContent=janela.situacao==='pode_solicitar_inscricao'?'Membro elegível pode solicitar inscrição. A vaga só será confirmada pelo servidor.':'Inscrição não disponível.';
$('status-oferta').textContent=`Oferta fictícia em 02/11, às 9h de Curitiba: vence às ${new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date(prazoOferta({oferecidaEm:'2026-11-02T09:00:00-03:00'})))} do mesmo dia.`;
$('status-cancelamento').textContent=classificarCancelamento({inicioEvento:'2026-11-14T12:00:00Z',agora:'2026-11-13T12:00:00Z'}).situacao==='no_prazo'?'Cancelar exatamente 24 horas antes fica dentro do prazo. Cancelamento tardio não gera penalidade automática.':'';
mostrarPrograma();
