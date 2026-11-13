/* Sala do convidado: depois do check-in a pessoa fica nesta janela e cada etapa aparece quando o apoio libera. */
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { editionSlug, supabase } from '../lib';
import { Votar } from '../pages/Votar';
import { Participante } from './Participante';
import './dinamica.css';

export const ETAPAS = [['boasvindas', 'Boas-vindas'], ['votacao', 'Votação'], ['palavras', 'Dinâmica de palavras']] as const;
type Etapa = (typeof ETAPAS)[number][0] | 'pesquisa';
const CHAVE = 'communicali_presenca';

/** Guarda neste aparelho quem fez check-in, para não pedir tudo de novo. */
export function guardarPresenca(nome: string, codigo: string) {
  try { localStorage.setItem(CHAVE, JSON.stringify({ slug: editionSlug(), nome, codigo })); } catch { /* sem armazenamento: segue sem lembrar */ }
}
export function lerPresenca(): { nome: string; codigo: string } | null {
  try { const p = JSON.parse(localStorage.getItem(CHAVE) || 'null'); return p && p.slug === editionSlug() ? p : null; } catch { return null; }
}

export function Sala() {
  const slug = editionSlug();
  const previa = new URLSearchParams(window.location.search).get('previa');
  const presenca = previa ? { nome: 'Maria Silva', codigo: 'PREVIA' } : lerPresenca();
  const [entrou, setEntrou] = useState('');
  const [estado, setEstado] = useState<{ etapa: Etapa; form_pesquisa: string | null } | null>(null);
  useEffect(() => {
    let vivo = true;
    const buscar = () => { supabase.rpc('communicali_sala_estado', { p_slug: slug }).then(({ data }) => { if (vivo && data) setEstado(data as typeof estado); }); };
    if (previa) { setEstado({ etapa: previa as Etapa, form_pesquisa: 'pesquisa-de-satisfacao' }); return; }
    buscar(); const timer = window.setInterval(buscar, 3000);
    return () => { vivo = false; window.clearInterval(timer); };
  }, [slug, previa]);

  const molde = (corpo: React.ReactNode) => (
    <main className="dn-pg"><div className="dn-pg-faixa" /><img className="dn-pg-logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" /><div className="dn-pg-corpo">{corpo}</div></main>
  );
  if (!presenca) return molde(<div className="dn-cartao"><h1>Faça seu check-in para entrar</h1><p className="dn-pg-inst">Assim a gente sabe que você está aqui e libera as interações no seu celular.</p><a className="dn-btn" href="/checkin?novo=1" style={{ textAlign: 'center', textDecoration: 'none' }}>Fazer check-in</a></div>);
  if (!estado) return <main className="dn-pg" aria-busy="true" />;
  if (estado.etapa === 'votacao' || estado.etapa === 'palavras') {
    const rotulo = estado.etapa === 'votacao' ? 'Votação' : 'Dinâmica de palavras';
    if (entrou === estado.etapa || new URLSearchParams(window.location.search).has('entrou')) return estado.etapa === 'votacao' ? <Votar /> : <Participante />;
    return molde(<div className="dn-cartao dn-liberada"><p className="dn-pg-etapa">Liberada agora</p><h1>{rotulo}</h1><button type="button" className="dn-btn" onClick={() => setEntrou(estado.etapa)}>Clique aqui</button></div>);
  }
  const nome = presenca.nome.split(' ')[0];
  return molde(
    <>
      <h1 className="dn-oi">Oi, {nome}!</h1>
      <p className="dn-oi-sub">Fique por aqui.</p>
      <div className="dn-cartao dn-atencao"><p className="dn-pg-etapa">Atenção</p><h2>Não feche esta janela.</h2><p>A apresentação e as interações do encontro acontecem por aqui.</p></div>
      <ul className="dn-trava">
        {[0, 1].map((i) => <li key={i}><Lock size={22} aria-hidden="true" /><span>Trancado</span></li>)}
      </ul>
      <p className="dn-restam">Fechou sem querer? Escaneie o QR Code do telão de novo ou chame alguém do staff.</p>
    </>,
  );
}
