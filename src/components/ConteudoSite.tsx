import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const Conteudo = createContext<Record<string, string>>({});
export const useConteudoSite = () => useContext(Conteudo);
export function TextoSite({ id, children }: { id: string; children: ReactNode }) {
  const dados = useConteudoSite();
  const valor = dados[id];
  const texto = valor && typeof children === 'string' ? `${children.match(/^\s*/)?.[0] || ''}${valor}${children.match(/\s*$/)?.[0] || ''}` : valor || children;
  return <>{texto}</>;
}
export function ConteudoSiteProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Record<string, string>>({});
  useEffect(() => {
    let ativo = true;
    void supabase.from('site_content_published').select('conteudo').eq('id', 'home').maybeSingle().then(({ data }) => {
      if (ativo && data?.conteudo && typeof data.conteudo === 'object') setDados(data.conteudo);
    });
    return () => { ativo = false; };
  }, []);
  return <Conteudo.Provider value={dados}>{children}</Conteudo.Provider>;
}
