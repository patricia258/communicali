export type CreditoCheckin = { situacao: string; pontos: number; movimento_id: string };

/** Só comunica crédito explicitamente registrado na resposta; nunca calcula pelo papel. */
export function mensagemCreditoCheckin({ repetido, categoria, credito }: { repetido: boolean; categoria: string; credito?: CreditoCheckin | null }): string | null {
  if (repetido) return 'Sua presença neste encontro já estava registrada.';
  if (!['membro', 'conector', 'embaixador', 'fundadora', 'organizador'].includes(categoria)) return null;
  if (credito?.situacao !== 'registrado' || !Number.isSafeInteger(credito.pontos) || credito.pontos <= 0 || typeof credito.movimento_id !== 'string' || !credito.movimento_id.trim()) return null;
  return `${credito.pontos} ${credito.pontos === 1 ? 'ponto registrado' : 'pontos registrados'} pela participação neste encontro.`;
}
