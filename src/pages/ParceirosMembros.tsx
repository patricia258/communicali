import { useEffect, useState } from 'react';
import { supabase } from '../lib';
import { ParceiroRede, recursoAusente } from './RedeExtras';

type Empresa = { id: string; nome: string; logo_url: string | null; site_url: string | null };
type Resposta = { versao: 1; parceiros: Empresa[] };

/** Consulta exclusiva de empresas. Nunca busca perfis pessoais para liberar a vitrine. */
export function ParceirosMembros({ previa = false }: { previa?: boolean }) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'ausente' | 'erro' | 'pronto'>('carregando');
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState('');
  useEffect(() => {
    let ativo = true;
    setDados(null);
    setEstado('carregando');
    if (previa) return () => { ativo = false; };
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('communicali_parceiros_membros');
        if (!ativo) return;
        if (error) { setEstado(recursoAusente(error) ? 'ausente' : 'erro'); return; }
        const resposta = data as Resposta | null;
        if (resposta?.versao !== 1 || !Array.isArray(resposta.parceiros) || !resposta.parceiros.every((p) => p && typeof p.id === 'string' && typeof p.nome === 'string' && (p.logo_url === null || typeof p.logo_url === 'string') && (p.site_url === null || typeof p.site_url === 'string'))) {
          setEstado('erro'); return;
        }
        // Projeção explícita: campos extras recebidos não entram no componente.
        setDados({ versao: 1, parceiros: resposta.parceiros.map(({ id, nome, logo_url, site_url }) => ({ id, nome, logo_url, site_url })) });
        setEstado('pronto');
      } catch { if (ativo) setEstado('erro'); }
    })();
    return () => { ativo = false; };
  }, [tentativa, previa]);
  const empresas = (dados?.parceiros || []).filter((p) => p.nome.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')));
  return <section aria-labelledby="parceiros-membros-titulo">
    <header className="passe__rede-grupo"><h2 id="parceiros-membros-titulo">Empresas parceiras</h2><p>Conheça quem contribui com a comunidade.</p></header>
    {previa ? <p className="passe__aviso">Prévia de Membro. Os dados da sua conta não são usados nesta visualização.</p>
      : estado === 'carregando' ? <p role="status">Carregando empresas parceiras…</p>
      : estado === 'ausente' ? <p className="passe__aviso">A consulta de empresas pelo Meu espaço ainda não está disponível para Membros. <a href="/#parceiros">Ver parceiros no site</a></p>
      : estado === 'erro' ? <div role="alert"><p>Não foi possível carregar as empresas parceiras.</p><button type="button" className="passe__link" onClick={() => setTentativa((v) => v + 1)}>Tentar novamente</button></div>
      : <>
        <div className="passe__form passe__filtros"><label>Buscar empresa<input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome da empresa" /></label></div>
        <div className="passe__empresas">{empresas.map((p) => <ParceiroRede key={p.id} parceiro={p} />)}</div>
        {!empresas.length && <p className="passe__aviso">{busca.trim() ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa disponível no momento.'}</p>}
      </>}
  </section>;
}
