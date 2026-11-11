/* Controle da equipe de apoio, no celular: libera uma etapa de cada vez para todo mundo. Link próprio, sem login. */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib';
import { ETAPAS } from './Sala';
import './dinamica.css';

type Estado = { titulo: string; etapa: (typeof ETAPAS)[number][0]; checkins: number };

export function Apoio() {
  const { token = '' } = useParams();
  const [estado, setEstado] = useState<Estado | null | undefined>(undefined);
  const [busy, setBusy] = useState('');
  const [erro, setErro] = useState('');
  const buscar = useCallback(() => { supabase.rpc('communicali_apoio_estado', { p_token: token }).then(({ data, error }) => { if (!error) setEstado((data as Estado) || null); }); }, [token]);
  useEffect(() => { buscar(); const t = window.setInterval(buscar, 4000); return () => window.clearInterval(t); }, [buscar]);
  useEffect(() => { const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex'; document.head.append(meta); return () => meta.remove(); }, []);

  async function liberar(id: string, rotulo: string, voltando: boolean) {
    if (!window.confirm(voltando ? `Voltar para "${rotulo}"? As etapas seguintes ficam trancadas de novo.` : `Liberar "${rotulo}" para todo mundo agora?`)) return;
    setBusy(id); setErro('');
    const { data, error } = await supabase.rpc('communicali_apoio_definir', { p_token: token, p_etapa: id });
    setBusy('');
    if (error) setErro('Não foi possível agora. Tente de novo.'); else setEstado(data as Estado);
  }
  const atual = estado ? ETAPAS.findIndex(([id]) => id === estado.etapa) : 0;
  return (
    <main className="dn-pg"><div className="dn-pg-faixa" /><img className="dn-pg-logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" />
      <div className="dn-pg-corpo"><div className="dn-cartao">
        {estado === undefined && <p className="dn-pg-inst">Carregando…</p>}
        {estado === null && <><h1>Link não reconhecido</h1><p className="dn-pg-inst">Peça um link novo para a Patrícia.</p></>}
        {estado && <>
          <p className="dn-pg-etapa">Equipe de apoio</p>
          <h1>{estado.titulo}</h1>
          <p className="dn-pg-inst"><b>{estado.checkins}</b> {estado.checkins === 1 ? 'pessoa fez' : 'pessoas fizeram'} check-in. Libere uma etapa por vez, quando a apresentação chegar nela.</p>
          <ul className="dn-apoio">
            {ETAPAS.map(([id, rotulo], i) => (
              <li key={id} className={i === atual ? 'agora' : i < atual ? 'feita' : ''}>
                <span><b>{i + 1}. {rotulo}</b><small>{i === atual ? 'Liberada agora' : i < atual ? 'Já passou' : 'Trancada'}</small></span>
                {i !== atual && <button type="button" className={i > atual ? 'dn-btn' : 'dn-link'} disabled={Boolean(busy)} onClick={() => void liberar(id, rotulo, i < atual)}>{busy === id ? '…' : i > atual ? 'Liberar' : 'Voltar'}</button>}
              </li>
            ))}
          </ul>
          {erro && <p className="dn-aviso alerta">{erro}</p>}
        </>}
      </div></div>
    </main>
  );
}
