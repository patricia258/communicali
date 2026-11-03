/* Núcleo isolado: não importa Supabase, não agenda tarefas e nunca altera categorias. */
export const VERSAO_REGRAS = 'v20-secao33-preparacao';
export const REGRAS = Object.freeze({
  conector: Object.freeze({ pontos: 60, presencas: 4, contribuicoes: 1, relacional: true, mesesComoConector: 0 }),
  embaixador: Object.freeze({ pontos: 180, presencas: 6, contribuicoes: 2, naturezasDistintas: 2, mesesComoConector: 12 }),
});
export const NOVOS_CREDITOS = Object.freeze({ presenca: 10, convidado_presente: 5, contribuicao_entregue: 15, parceiro_efetivo: 20 });
function instante(valor, nome) {
  if (typeof valor !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(valor)) throw new Error(`${nome}: informe instante com fuso explícito.`);
  const n = Date.parse(valor); if (!Number.isFinite(n)) throw new Error(`${nome} inválido.`); return n;
}
function natural(n) { return Number.isSafeInteger(n) && n >= 0; }

export function saldos({ membroId, movimentos, inicioCiclo, fimCiclo, agora }) {
  if (!membroId || !Array.isArray(movimentos)) throw new Error('Membro e movimentos obrigatórios.');
  const inicio = instante(inicioCiclo, 'Início'), fim = instante(fimCiclo, 'Fim'), hoje = instante(agora, 'Agora');
  if (inicio >= fim || hoje < inicio || hoje >= fim) throw new Error('Confirme os limites do ciclo atual.');
  const ids = new Set(), origens = new Set(); let historico = 0, ciclo = 0;
  for (const m of movimentos) {
    if (!m.id || ids.has(m.id)) throw new Error('Movimento sem identificação única.'); ids.add(m.id);
    if (m.membroId !== membroId) throw new Error('Movimento de outro membro.');
    if (!Number.isSafeInteger(m.pontos)) throw new Error('Pontuação inválida.');
    const data = instante(m.ocorridoEm, 'Movimento');
    if (typeof m.validado !== 'boolean') throw new Error('Validação do movimento não confirmada.');
    if (!m.validado || data > hoje) continue;
    if (!m.origem || origens.has(m.origem)) throw new Error('Ocorrência sem identificação única.'); origens.add(m.origem);
    if (m.pontos < 0 && !m.motivo?.trim()) throw new Error('Correção negativa exige motivo.');
    historico += m.pontos; if (data >= inicio && data < fim) ciclo += m.pontos;
  }
  if (!Number.isSafeInteger(historico) || !Number.isSafeInteger(ciclo)) throw new Error('Saldo fora do limite.');
  return Object.freeze({ historico, ciclo, versao: VERSAO_REGRAS });
}

/* O servidor futuro fornece contagens confirmadas. Sem escopo de presença definido, não calcula elegibilidade. */
export function avaliar({ membroId, alvo, pontosCiclo, presencas, escopoPresencas, contribuicoes, mesesComoConector, avaliacao, aceite }) {
  const regra = REGRAS[alvo]; if (!regra) throw new Error('Papel fora da trilha de avaliação.');
  const pendencias = [];
  if (!membroId) pendencias.push('Identificar o membro avaliado.');
  if (!['ciclo', 'historico'].includes(escopoPresencas)) pendencias.push('Definir o período das presenças.');
  if (!natural(pontosCiclo)) pendencias.push('Conferir pontos do ciclo.');
  if (!natural(presencas)) pendencias.push('Conferir presenças validadas.');
  if (!Array.isArray(contribuicoes)) pendencias.push('Conferir contribuições.');
  const lista = Array.isArray(contribuicoes) ? contribuicoes : [], ids = new Set();
  for (const item of lista) {
    if (!item || typeof item !== 'object') { pendencias.push('Conferir registro da contribuição.'); continue; }
    if (!item.id || ids.has(item.id)) pendencias.push('Conferir duplicidade de contribuição.'); ids.add(item.id);
    if (typeof item.validada !== 'boolean') pendencias.push('Conferir validação da contribuição.');
    if (item.validada && (typeof item.natureza !== 'string' || !item.natureza.trim())) pendencias.push('Conferir natureza da contribuição.');
  }
  if (alvo === 'embaixador' && !natural(mesesComoConector)) pendencias.push('Conferir tempo como Conector.');
  if (pendencias.length) return { situacao: 'dados_pendentes', pendencias, podePromoverAutomaticamente: false };
  const validas = lista.filter((c) => c.validada), faltam = [];
  if (pontosCiclo < regra.pontos) faltam.push('pontuacao');
  if (presencas < regra.presencas) faltam.push('presencas');
  if (validas.length < regra.contribuicoes) faltam.push('contribuicoes');
  if (regra.relacional && !validas.some((c) => c.relacional === true)) faltam.push('contribuicao_relacional');
  if (regra.naturezasDistintas && new Set(validas.map((c) => c.natureza.trim())).size < regra.naturezasDistintas) faltam.push('naturezas_distintas');
  if (mesesComoConector < regra.mesesComoConector) faltam.push('tempo_como_conector');
  const retorno = { faltam, versao: VERSAO_REGRAS, podePromoverAutomaticamente: false };
  if (faltam.length) return { ...retorno, situacao: 'requisitos_pendentes' };
  const revisada = avaliacao?.resultado === 'aprovada' && avaliacao.alvo === alvo && avaliacao.versao === VERSAO_REGRAS && !!avaliacao.id && avaliacao.membroId === membroId;
  const aceitou = aceite?.escolha === 'aceitar' && aceite.alvo === alvo && aceite.versao === VERSAO_REGRAS && !!aceite.id && aceite.membroId === membroId;
  if (aceite?.escolha === 'permanecer_membro' && aceite.membroId === membroId && aceite.alvo === alvo && aceite.versao === VERSAO_REGRAS) return { ...retorno, situacao: 'permanecer_membro' };
  if (avaliacao?.resultado === 'recusada' && avaliacao.membroId === membroId && avaliacao.alvo === alvo && avaliacao.versao === VERSAO_REGRAS) return { ...retorno, situacao: 'avaliacao_nao_aprovada' };
  if (!revisada) return { ...retorno, situacao: 'aguarda_avaliacao' };
  if (!aceitou) return { ...retorno, situacao: 'aguarda_aceite' };
  return { ...retorno, situacao: 'pronto_para_decisao_administrativa' };
}

export function revalidar({ papel, presencas, contribuicoes, avaliacaoRegistrada }) {
  if (!['conector', 'embaixador'].includes(papel)) throw new Error('Papel não sujeito a esta revalidação.');
  if (!natural(presencas) || !natural(contribuicoes)) throw new Error('Contagens não confirmadas.');
  const requisitosAtendidos = presencas >= (papel === 'conector' ? 3 : 4) && contribuicoes >= (papel === 'conector' ? 1 : 2);
  return { requisitosAtendidos, avaliacaoPendente: !avaliacaoRegistrada, removerPapelAutomaticamente: false, apagarHistorico: false };
}
