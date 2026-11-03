/* Preparação isolada da v21. Entradas vêm do servidor; não autentica nem grava. */
const texto = (v) => typeof v === 'string' && !!v.trim();
function exigir(condicao, mensagem) { if (!condicao) throw new Error(mensagem); }
function instante(v) {
  exigir(typeof v === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v)), 'Instante com fuso explícito obrigatório.');
  return Date.parse(v);
}
function membroNoInstante(adesao, pessoaId, agora) {
  if (adesao === null) return false;
  exigir(adesao && adesao.pessoaId === pessoaId && texto(adesao.membroId) && texto(adesao.evidenciaId) && typeof adesao.ativa === 'boolean', 'Conferir adesão voluntária e titular.');
  return adesao.ativa && instante(adesao.aderiuEm) <= instante(agora);
}

export function contarVisitas({ pessoaId, presencas, historicoCompleto, agora }) {
  exigir(texto(pessoaId) && Array.isArray(presencas), 'Pessoa e histórico obrigatórios.');
  exigir(historicoCompleto === true, 'Histórico incompleto: não decidir o limite de visitas.');
  const atual = instante(agora), registros = new Map(), edicoes = new Set();
  for (const p of presencas) {
    exigir(p && texto(p.checkinId) && texto(p.edicaoId) && p.pessoaId === pessoaId, 'Presença sem origem ou de outra pessoa.');
    exigir(typeof p.validada === 'boolean' && ['visitante','membro'].includes(p.papelNaPresenca), 'Conferir validação e papel na presença.');
    exigir(['encontro_aberto','oficina','experiencia'].includes(p.tipoAtividade), 'Conferir tipo da atividade.');
    const quando = instante(p.ocorreuEm);
    const assinatura = JSON.stringify([p.edicaoId,p.pessoaId,p.validada,p.papelNaPresenca,p.tipoAtividade,p.ocorreuEm]);
    exigir(!registros.has(p.checkinId) || registros.get(p.checkinId) === assinatura, 'Registros conflitantes para o mesmo check-in.');
    registros.set(p.checkinId, assinatura);
    if (p.validada && quando <= atual && p.papelNaPresenca === 'visitante' && p.tipoAtividade === 'encontro_aberto') edicoes.add(p.edicaoId);
  }
  return Object.freeze({ visitas: edicoes.size, edicoesVisitadas: Object.freeze([...edicoes]) });
}

export function avaliarParticipacao({ pessoaId, edicao, adesao, presencas, historicoCompleto, agora }) {
  exigir(texto(pessoaId), 'Pessoa obrigatória.');
  exigir(edicao && texto(edicao.id) && ['encontro_aberto','oficina','experiencia'].includes(edicao.tipo), 'Conferir edição.');
  const membro = membroNoInstante(adesao, pessoaId, agora);
  // Atividades especiais precisam de suas condições; não inventar elegibilidade ou pontos.
  if (edicao.tipo !== 'encontro_aberto') return { situacao: 'consultar_condicoes_da_atividade', confirmarVaga: false, criarMembro: false };
  const visitas = contarVisitas({ pessoaId, presencas, historicoCompleto, agora });
  if (membro) return { situacao: 'pode_solicitar_como_membro', confirmarVaga: false, criarMembro: false, visitas: visitas.visitas };
  const jaEsteve = visitas.edicoesVisitadas.includes(edicao.id);
  return { situacao: jaEsteve ? 'visita_ja_registrada' : visitas.visitas >= 2 ? 'adesao_gratuita_necessaria' : 'pode_solicitar_como_visitante', visitas: visitas.visitas, confirmarVaga: false, criarMembro: false };
}

export function prepararEscolhaAdesao({ pessoaId, escolha, versaoTermos, evidenciaApresentacaoId }) {
  exigir(texto(pessoaId) && ['aderir','continuar_visitante'].includes(escolha), 'Escolha explícita obrigatória.');
  if (escolha === 'continuar_visitante') return { escolha, criarMembro: false, cobrar: false, confirmarPresenca: false };
  exigir(texto(versaoTermos) && texto(evidenciaApresentacaoId), 'Conferir versão dos termos e apresentação efetiva.');
  return { escolha, versaoTermos, evidenciaApresentacaoId, situacao: 'solicitar_adesao_gratuita', criarMembro: false, cobrar: false, confirmarPresenca: false };
}

export function creditoPresenca({ pessoaId, presenca, adesao, origensJaCreditadas, agora }) {
  exigir(presenca && presenca.pessoaId === pessoaId && texto(presenca.checkinId) && texto(presenca.edicaoId), 'Conferir titular e origem da presença.');
  exigir(typeof presenca.validada === 'boolean' && ['visitante','membro'].includes(presenca.papelNaPresenca), 'Conferir presença validada e papel.');
  exigir(Array.isArray(origensJaCreditadas) && origensJaCreditadas.every(texto), 'Conferir origens já pontuadas.');
  const quando = instante(presenca.ocorreuEm), atual = instante(agora);
  const origem = `presenca:${presenca.edicaoId}:${pessoaId}`;
  const semCredito = (situacao) => ({ situacao, pontosPropostos: 0, origem, gravarAutomaticamente: false });
  if (!presenca.validada || quando > atual) return semCredito('aguarda_presenca_validada');
  if (presenca.tipoAtividade !== 'encontro_aberto') return semCredito('consultar_regra_da_atividade');
  if (presenca.papelNaPresenca !== 'membro' || !membroNoInstante(adesao, pessoaId, presenca.ocorreuEm)) return semCredito('sem_credito_de_membro');
  if (origensJaCreditadas.includes(origem)) return semCredito('credito_ja_registrado');
  return { situacao: 'credito_a_registrar', pontosPropostos: 10, origem, gravarAutomaticamente: false };
}

export function creditoIndicacao({ indicacao, presenca, indicadorAtivo, origensJaCreditadas, agora }) {
  exigir(indicacao && texto(indicacao.id) && texto(indicacao.indicadorId) && texto(indicacao.indicadorPessoaId) && texto(indicacao.convidadoPessoaId) && texto(indicacao.edicaoId), 'Indicação sem identificação.');
  exigir(indicacao.indicadorPessoaId !== indicacao.convidadoPessoaId, 'Autoindicação não permitida.');
  exigir(typeof indicadorAtivo === 'boolean' && Array.isArray(origensJaCreditadas) && origensJaCreditadas.every(texto), 'Conferir indicador e créditos existentes.');
  const origem = `convidado_presente:${indicacao.edicaoId}:${indicacao.convidadoPessoaId}`;
  const semCredito = (situacao) => ({ situacao, pontosPropostos: 0, origem, gravarAutomaticamente: false });
  if (!indicadorAtivo) return semCredito('indicador_indisponivel');
  if (presenca === null) return semCredito('aguarda_comparecimento');
  exigir(presenca && presenca.pessoaId === indicacao.convidadoPessoaId && presenca.edicaoId === indicacao.edicaoId && texto(presenca.checkinId) && typeof presenca.validada === 'boolean', 'Presença não corresponde à indicação.');
  if (!presenca.validada || instante(presenca.ocorreuEm) > instante(agora)) return semCredito('aguarda_comparecimento');
  if (presenca.tipoAtividade !== 'encontro_aberto') return semCredito('consultar_regra_da_atividade');
  if (origensJaCreditadas.includes(origem)) return semCredito('credito_ja_registrado');
  return { situacao: 'credito_a_registrar', pontosPropostos: 5, origem, gravarAutomaticamente: false };
}

export function avaliarNovaIndicacao({ indicadorPessoaId, convidadoPessoaId, edicaoId, indicadorAtivo, indicacoes, historicoCompleto, limite = 1 }) {
  exigir(texto(indicadorPessoaId) && texto(convidadoPessoaId) && texto(edicaoId), 'Conferir pessoas e edição.');
  exigir(indicadorPessoaId !== convidadoPessoaId, 'Autoindicação não permitida.');
  exigir(typeof indicadorAtivo === 'boolean' && historicoCompleto === true && Array.isArray(indicacoes), 'Conferir elegibilidade e histórico completo de indicações.');
  exigir(Number.isSafeInteger(limite) && limite >= 0, 'Conferir limite configurado pela organização.');
  const pessoas = new Set();
  for (const i of indicacoes) {
    exigir(i && i.indicadorPessoaId === indicadorPessoaId && i.edicaoId === edicaoId && texto(i.convidadoPessoaId) && typeof i.ocupaCota === 'boolean', 'Conferir escopo e ocupação da cota.');
    if (i.ocupaCota) pessoas.add(i.convidadoPessoaId);
  }
  const situacao = !indicadorAtivo ? 'indicador_indisponivel' : pessoas.has(convidadoPessoaId) ? 'indicacao_ja_registrada' : pessoas.size >= limite ? 'limite_da_edicao_atingido' : 'pode_solicitar_indicacao';
  return { situacao, limite, utilizadas: pessoas.size, reservarCota: false, confirmarVaga: false };
}
