const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const LIMITE_IMAGEM_WEB = 50 * 1024 * 1024;

/** Valida sem reduzir resolução ou recomprimir o original. */
export async function prepararImagem(file: File, permitirSvg = false): Promise<File> {
  if (!(TIPOS.includes(file.type.toLowerCase()) || (permitirSvg && file.type === 'image/svg+xml'))) throw new Error('Use uma imagem JPG, PNG ou WebP.');
  if (!file.size) throw new Error('O arquivo está vazio.');
  if (file.size > LIMITE_IMAGEM_WEB) throw new Error('Envie uma imagem de até 50 MB.');
  return file;
}

export function erroUpload(erro: unknown): string {
  const msg = erro && typeof erro === 'object' && 'message' in erro ? String(erro.message) : '';
  if (/exceed|too large|size|maximum allowed/i.test(msg)) return 'A imagem ultrapassou o limite de tamanho.';
  if (/jwt|token|unauthorized|row.level|permission/i.test(msg)) return 'Sua sessão pode ter expirado. Entre novamente no painel.';
  return msg || 'Falha ao enviar. Tente novamente.';
}

export async function enviarLoteFotos<T extends { name: string }>(arquivos: T[], enviar: (arquivo: T, indice: number) => Promise<void>, progresso?: (indice: number) => void) {
  let enviados = 0;
  const falhas: string[] = [];
  for (const [indice, arquivo] of arquivos.entries()) {
    progresso?.(indice + 1);
    try { await enviar(arquivo, indice); enviados++; }
    catch (erro) { falhas.push(`${arquivo.name}: ${erroUpload(erro)}`); }
  }
  return { enviados, falhas };
}
