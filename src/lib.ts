import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from './lib/supabase';

export { supabase };

/** Edição em andamento; `?edicao=teste` usa a edição de teste, que não aparece no site. */
export const editionSlug = () => new URLSearchParams(window.location.search).get('edicao') || 'fundadora';

/** Link permanente sem edição: descobre a edição do momento e só então mostra a tela. */
export function ComEdicao({ children }: { children: ReactNode }) {
  const [pronta, setPronta] = useState(() => new URLSearchParams(window.location.search).has('edicao'));
  useEffect(() => {
    if (pronta) return;
    void supabase.rpc('communicali_edicao_atual').then(({ data }) => {
      if (data) {
        const url = new URL(window.location.href);
        url.searchParams.set('edicao', String(data));
        window.history.replaceState(null, '', url);
      }
      setPronta(true);
    });
  }, [pronta]);
  return pronta ? children : null;
}

export const COMMUNITY_URL = 'https://chat.whatsapp.com/Lu9uzReUxAlJZcQaU1is01';
export const PARTNER_FORM_URL = '/f/parceiros-communicali';
export const PARTNER_DECK_URL = '/communicali/seja-parceiro.pdf';

export type Edition = {
  slug: string;
  titulo: string;
  selo: string;
  data_evento: string;
  horario: string;
  local: string;
  cidade: string;
  situacao: 'antes' | 'aberto' | 'encerrado';
};

export type Poll = {
  titulo: string;
  pergunta: string;
  tipo: 'nota' | 'multipla' | 'aberta';
  opcoes: string[];
  anonima: boolean;
  situacao: 'rascunho' | 'ativa' | 'encerrada';
  revelada: boolean;
  votos: number;
  media: number | null;
  distribuicao: Record<string, number> | null;
  por_opcao: Record<string, number> | null;
  textos: string[] | null;
};

export const formatDate = (iso: string) => iso.split('-').reverse().join('/');

export const errorMessage = (error: { message?: string } | null) => error?.message || 'Não foi possível enviar. Confira sua conexão e tente novamente.';

export function deviceCode() {
  const key = 'communicali-aparelho';
  try {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const code = crypto.randomUUID();
    localStorage.setItem(key, code);
    return code;
  } catch {
    return crypto.randomUUID();
  }
}
