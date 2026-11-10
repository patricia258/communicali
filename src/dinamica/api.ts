import { editionSlug } from '../lib';

/** Link para as pessoas do encontro: sem ?edicao= na edição fundadora, para o QR Code ficar curto. */
export const linkEvento = (path: string) => {
  const slug = editionSlug();
  return `${window.location.origin}${path}${slug === 'fundadora' ? '' : `?edicao=${slug}`}`;
};

export type EtapaPublica = { etapa: 1 | 2; status: 'aguardando' | 'aberta' | 'encerrada'; pergunta: string; instrucao: string; enviadas: string[]; usadas: number };
export type EstadoPublico = { existe: boolean; limite?: number; etapas?: EtapaPublica[] };

export const QR_COR = { dark: '#5A1E2D', light: '#FFFFFF' };
