import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY, {
  auth: { persistSession: false },
});

/** Edição em andamento; `?edicao=teste` usa a edição de teste, que não aparece no site. */
export const editionSlug = () => new URLSearchParams(window.location.search).get('edicao') || 'fundadora';

export const COMMUNITY_URL = 'https://chat.whatsapp.com/Lu9uzReUxAlJZcQaU1is01';
export const PARTNER_FORM_URL = 'https://app.calirh.com/f/parceiros-communicali';
export const PARTNER_DECK_URL = 'https://app.calirh.com/communicali/seja-parceiro.pdf';

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
  pergunta: string;
  situacao: 'antes' | 'aberto' | 'encerrado';
  votos: number;
  media: number | null;
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
