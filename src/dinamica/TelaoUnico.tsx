/* Telão único: acompanha a etapa que a equipe de apoio liberou (boas-vindas, votação, palavras, pesquisa). */
import { useEffect, useState } from 'react';
import { editionSlug, supabase } from '../lib';
import { TelaoCheckin, TelaoResultado } from '../pages/Telao';
import { TelaoDinamica } from './TelaoDinamica';
import './dinamica.css';

export function TelaoUnico() {
  const slug = editionSlug();
  const [etapa, setEtapa] = useState('boasvindas');
  useEffect(() => {
    let vivo = true;
    const buscar = () => { supabase.rpc('communicali_sala_estado', { p_slug: slug }).then(({ data }) => { if (vivo && data) setEtapa((data as { etapa: string }).etapa); }); };
    buscar(); const t = window.setInterval(buscar, 2000);
    return () => { vivo = false; window.clearInterval(t); };
  }, [slug]);
  if (etapa === 'votacao') return <TelaoResultado />;
  if (etapa === 'palavras') return <TelaoDinamica />;
  if (etapa === 'pesquisa') return (
    <main className="dn-pg" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', minHeight: '100vh' }}>
      <div className="dn-centro"><img className="dn-pg-logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" /><h1 style={{ fontSize: 'clamp(32px,4vw,64px)' }}>Obrigada por estar aqui!</h1><p style={{ fontSize: 'clamp(18px,2vw,32px)' }}>Responda a pesquisa de satisfação no seu celular, na sala do encontro.</p></div>
    </main>
  );
  return <TelaoCheckin />;
}
