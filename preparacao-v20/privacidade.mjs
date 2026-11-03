/* Registro proposto para autorizações opcionais. Não escolhe bases legais nem substitui políticas vigentes. */
const CONTATOS = ['email', 'whatsapp', 'instagram', 'linkedin'];
const FINALIDADES = ['diretorio', 'contatos', 'marketing', 'imagem'];
function validoEvento(e, titularId) {
  if (e.titularId !== titularId || !e.id || !Number.isSafeInteger(e.sequencia) || e.sequencia < 0) throw new Error('Evidência de outro titular ou sem identificação.');
  if (!FINALIDADES.includes(e.finalidade) || !['autorizar', 'revogar'].includes(e.acao)) throw new Error('Finalidade ou escolha inválida.');
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(e.ocorridoEm || '') || !Number.isFinite(Date.parse(e.ocorridoEm))) throw new Error('Data da escolha inválida.');
  if (e.acao === 'autorizar' && !e.versaoAviso?.trim()) throw new Error('Autorização exige versão do aviso apresentado.');
  if (e.finalidade === 'contatos' && (!Array.isArray(e.canais) || !e.canais.length || e.canais.some((c) => !CONTATOS.includes(c)))) throw new Error('Especifique os contatos escolhidos.');
  if (e.menor && e.acao === 'autorizar' && !e.responsavelLegalId) throw new Error('Verificar responsável legal antes da autorização.');
}
export function preferencias({ titularId, eventos }) {
  if (!titularId || !Array.isArray(eventos)) throw new Error('Titular e evidências obrigatórios.');
  const estado = { diretorio: false, marketing: false, imagem: false, contatos: Object.fromEntries(CONTATOS.map((c) => [c, false])) };
  const ids = new Set(), sequencias = new Set();
  for (const e of [...eventos].sort((a,b) => a.sequencia - b.sequencia)) {
    validoEvento(e, titularId);
    if (ids.has(e.id) || sequencias.has(e.sequencia)) throw new Error('Evidência duplicada ou ordem ambígua.'); ids.add(e.id); sequencias.add(e.sequencia);
    const valor = e.acao === 'autorizar';
    if (e.finalidade === 'contatos') for (const canal of e.canais) estado.contatos[canal] = valor;
    else estado[e.finalidade] = valor;
    // Sair da Rede também revoga exposição de contatos; voltar exige nova escolha de canais.
    if (e.finalidade === 'diretorio' && !valor) for (const canal of CONTATOS) estado.contatos[canal] = false;
  }
  return estado;
}
export function exibirContato({ estado, canal, acessoAutorizadoNoServidor, contatoPreenchido }) {
  return CONTATOS.includes(canal) && estado?.diretorio === true && estado.contatos?.[canal] === true && acessoAutorizadoNoServidor === true && contatoPreenchido === true;
}
