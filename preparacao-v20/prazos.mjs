/* Decisões de interface calculadas com instantes do servidor. Sem reservas ou efeitos no banco. */
function tempo(v) {
  if (typeof v !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) throw new Error('Informe data com fuso explícito.');
  return Date.parse(v);
}
export function classificarCancelamento({ inicioEvento, agora }) {
  const inicio = tempo(inicioEvento), atual = tempo(agora);
  return { situacao: atual >= inicio ? 'evento_iniciado' : atual <= inicio - 24 * 3600000 ? 'no_prazo' : 'tardio', aplicarPenalidadeAutomaticamente: false };
}
export function prazoOferta({ oferecidaEm, horas = 6 }) {
  if (!Number.isFinite(horas) || horas <= 0) throw new Error('Prazo inválido.');
  const valor = tempo(oferecidaEm) + horas * 3600000;
  if (!Number.isFinite(valor) || Math.abs(valor) > 8640000000000000) throw new Error('Prazo fora do limite.');
  return new Date(valor).toISOString();
}
export function verificarOferta({ status, expiraEm, agora }) {
  const expirou = tempo(agora) >= tempo(expiraEm);
  return { podeSolicitarAceite: status === 'ofertada' && !expirou, expirou, confirmarVagaAutomaticamente: false };
}
export function janelaInscricao({ aberturaMembros, aberturaGeral, encerramento, agora, membro, elegivel, restricaoPrioridade = false, vagas }) {
  const primeira = tempo(aberturaMembros), geral = tempo(aberturaGeral), fim = tempo(encerramento), atual = tempo(agora);
  if (!(primeira < geral && geral < fim) || !Number.isSafeInteger(vagas) || vagas < 0) throw new Error('Conferir cronologia e capacidade.');
  if (!elegivel) return { situacao: 'inelegivel', reservarVaga: false };
  if (atual < primeira) return { situacao: 'em_breve', reservarVaga: false };
  if (atual >= fim) return { situacao: 'encerrada', reservarVaga: false };
  if (atual < geral && (!membro || restricaoPrioridade)) return { situacao: 'aguarda_abertura_geral', reservarVaga: false };
  return { situacao: vagas > 0 ? 'pode_solicitar_inscricao' : 'lista_de_espera', reservarVaga: false };
}
