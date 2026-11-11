/* Sala do convidado: depois do check-in a pessoa fica nesta janela e cada etapa aparece quando o apoio libera. */
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Lock, LockOpen } from 'lucide-react';
import { editionSlug, supabase } from '../lib';
import { Votar } from '../pages/Votar';
import { Participante } from './Participante';
import { PublicFormPage } from '../forms/PublicFormPage';
import './dinamica.css';

export const ETAPAS = [['boasvindas', 'Boas-vindas'], ['votacao', 'Votação'], ['palavras', 'Dinâmica de palavras'], ['pesquisa', 'Pesquisa de satisfação']] as const;
type Etapa = (typeof ETAPAS)[number][0];
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
  const [estado, setEstado] = useState<{ etapa: Etapa; form_pesquisa: string | null } | null>(null);
  useEffect(() => {
    let vivo = true;
    const buscar = () => { supabase.rpc('communicali_sala_estado', { p_slug: slug }).then(({ data }) => { if (vivo && data) setEstado(data as typeof estado); }); };
    if (previa) { setEstado({ etapa: previa as Etapa, form_pesquisa: 'pesquisa-1a-edicao' }); return; }
    buscar(); const timer = window.setInterval(buscar, 3000);
    return () => { vivo = false; window.clearInterval(timer); };
  }, [slug, previa]);

  const molde = (corpo: React.ReactNode) => (
    <main className="dn-pg"><div className="dn-pg-faixa" /><img className="dn-pg-logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" /><div className="dn-pg-corpo">{corpo}</div></main>
  );
  if (!presenca) return molde(<div className="dn-cartao"><h1>Faça seu check-in para entrar</h1><p className="dn-pg-inst">Assim a gente sabe que você está aqui e libera as interações no seu celular.</p><a className="dn-btn" href="/checkin?novo=1" style={{ textAlign: 'center', textDecoration: 'none' }}>Fazer check-in</a></div>);
  if (!estado) return <main className="dn-pg" aria-busy="true" />;
  if (estado.etapa === 'votacao') return <Votar />;
  if (estado.etapa === 'palavras') return <Participante />;
  if (estado.etapa === 'pesquisa' && estado.form_pesquisa) return <Routes location={`/f/${estado.form_pesquisa}`}><Route path="/f/:slug" element={<PublicFormPage />} /></Routes>;
  const nome = presenca.nome.split(' ')[0];
  return molde(
    <div className="dn-cartao">
      <p className="dn-pg-etapa">Check-in feito</p>
      <h1>Oi, {nome}! Fique por aqui.</h1>
      <p className="dn-pg-inst">Não feche esta janela. A apresentação e as interações do encontro acontecem aqui: cada etapa aparece sozinha quando a equipe liberar.</p>
      <ul className="dn-trava">
        {ETAPAS.slice(1).map(([id, rotulo]) => <li key={id}><Lock size={16} aria-hidden="true" /> {rotulo}<span>Aguardando liberação</span></li>)}
      </ul>
      <p className="dn-restam">Fechou sem querer? Escaneie o QR Code do telão de novo e você volta direto para cá.</p>
      <span hidden><LockOpen /></span>
    </div>,
  );
}
