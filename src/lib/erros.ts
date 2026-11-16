/** Transforma erros técnicos em frases que a pessoa entende. Mensagens já escritas em português para a pessoa passam direto. */
export function erroAmigavel(erro: unknown, padrao = 'Não foi possível concluir agora. Tente de novo em instantes.'): string {
  const texto = erro && typeof erro === 'object' && 'message' in erro ? String((erro as { message: unknown }).message || '') : typeof erro === 'string' ? erro : '';
  if (!texto) return padrao;
  if (/failed to (execute|fetch)|unexpected (end|token)|json|networkerror|network request|load failed|fetch|timeout|timed out/i.test(texto)) return 'Não conseguimos falar com o servidor. Confira a internet e tente de novo.';
  if (/jwt|token|unauthorized|not authenticated|permission denied|row-level security|rls|forbidden/i.test(texto)) return 'Sua sessão pode ter expirado. Entre de novo no painel e tente outra vez.';
  if (/duplicate key|already exists|unique/i.test(texto)) return 'Já existe um registro igual a este.';
  if (/violates (foreign key|check|not-null)|invalid input|syntax/i.test(texto)) return 'Alguma informação não está no formato esperado. Confira os campos e tente de novo.';
  if (/[áàâãéêíóôõúç]/i.test(texto) || /^(informe|confira|use|escolha|digite|selecione|esta|este|essa|esse|n[ãa]o|o |a )/i.test(texto)) return texto;
  return padrao;
}
