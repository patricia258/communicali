/* Controle da equipe de apoio, no celular: libera uma etapa de cada vez para todo mundo. Link próprio, sem login. */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib';
import { linkEvento, QR_COR } from './api';
import { ETAPAS } from './Sala';
import './dinamica.css';

type Estado = { titulo: string; etapa: (typeof ETAPAS)[number][0]; checkins: number };


/** Cronômetro do apoio: marca pelo relógio (não para com a tela apagada) e toca um alarme alto ao zerar. */
function Cronometro({ segundos, titulo, contar }: { segundos: number; titulo: string; contar?: boolean }) {
  const [fim, setFim] = useState<number | null>(null);
  const [resta, setResta] = useState(segundos);
  const [tocando, setTocando] = useState(false);
  const [vezes, setVezes] = useState(() => { try { return Number(localStorage.getItem('communicali_apresentacoes') || 0); } catch { return 0; } });
  const audio = useRef<AudioContext | null>(null);
  const sirene = useRef<number | null>(null);
  const trava = useRef<{ release: () => Promise<void> } | null>(null);
  const guardar = (n: number) => { setVezes(n); try { localStorage.setItem('communicali_apresentacoes', String(n)); } catch { /* sem armazenamento */ } };

  function silenciar() {
    if (sirene.current) { window.clearTimeout(sirene.current); sirene.current = null; }
    setTocando(false);
  }
  function alarme() {
    const ctx = audio.current; if (!ctx) return;
    setTocando(true);
    // Sino de "acabou o tempo": três toques claros, repetidos duas vezes, com som de sino que vai sumindo.
    const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    const sino = (freq: number, quando: number) => {
      [[1, 1], [2.76, 0.35], [5.4, 0.15]].forEach(([mult, vol]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq * mult;
        g.gain.setValueAtTime(0.0001, quando); g.gain.exponentialRampToValueAtTime(vol, quando + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, quando + 1.6);
        o.connect(g); g.connect(comp); o.start(quando); o.stop(quando + 1.7);
      });
    };
    const t0 = ctx.currentTime + 0.05;
    [0, 0.7, 1.4, 3.2, 3.9, 4.6].forEach((dt, i) => sino(i % 3 === 2 ? 1318.5 : 1046.5, t0 + dt));
    try { navigator.vibrate?.([300, 150, 300, 150, 300]); } catch { /* sem vibração */ }
    sirene.current = window.setTimeout(() => silenciar(), 6500);
  }
  function iniciar() {
    // O toque no botão libera o som no celular.
    if (!audio.current) audio.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    void audio.current.resume();
    silenciar();
    setFim(Date.now() + segundos * 1000); setResta(segundos);
    if (contar) guardar(vezes + 1);
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then((w) => { trava.current = w; }).catch(() => undefined);
  }
  function parar() { setFim(null); setResta(segundos); silenciar(); void trava.current?.release(); }
  useEffect(() => {
    if (fim === null) return;
    const t = window.setInterval(() => {
      const r = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
      setResta(r);
      if (r === 0) { window.clearInterval(t); setFim(null); alarme(); void trava.current?.release(); }
    }, 200);
    return () => window.clearInterval(t);
  }, [fim]);
  useEffect(() => () => { if (sirene.current) window.clearTimeout(sirene.current); }, []);

  const mm = String(Math.floor(resta / 60)).padStart(2, '0'), ss = String(resta % 60).padStart(2, '0');
  return (
    <li className={`dn-cron${fim !== null ? ' rodando' : ''}${tocando ? ' tocando' : ''}`}>
      <span><b>{titulo}</b><small>{contar ? `Apresentações até agora: ${vezes}` : 'Cronômetro do debate'}</small></span>
      <strong className="dn-cron__tempo">{mm}:{ss}</strong>
      <span className="dn-cron__acoes">
        {tocando ? <button type="button" className="dn-btn" onClick={silenciar}>Silenciar</button>
          : <button type="button" className="dn-btn" onClick={iniciar}>{fim !== null ? 'Reiniciar' : contar && vezes ? 'Próxima pessoa' : 'Iniciar'}</button>}
        {fim !== null && <button type="button" className="dn-link" onClick={parar}>Parar</button>}
        {contar && vezes > 0 && fim === null && <button type="button" className="dn-link" onClick={() => guardar(0)}>Zerar contagem</button>}
      </span>
    </li>
  );
}

export function Apoio() {
  const { token = '' } = useParams();
  const [estado, setEstado] = useState<Estado | null | undefined>(undefined);
  const [busy, setBusy] = useState('');
  const [erro, setErro] = useState('');
  const [qr, setQr] = useState('');
  useEffect(() => { QRCode.toDataURL(linkEvento('/checkin'), { width: 600, margin: 1, color: QR_COR }).then(setQr); }, []);
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
              <Fragment key={id}>
              <li className={i === atual ? 'agora' : i < atual ? 'feita' : ''}>
                <span><b>{i + 1}. {rotulo}</b><small>{i === atual ? 'Liberada agora' : i < atual ? 'Já passou' : 'Trancada'}</small></span>
                {i !== atual && <button type="button" className={i > atual ? 'dn-btn' : 'dn-link'} disabled={Boolean(busy)} onClick={() => void liberar(id, rotulo, i < atual)}>{busy === id ? '…' : i > atual ? 'Liberar' : 'Voltar'}</button>}
              </li>
              {i === 0 && <Cronometro segundos={60} titulo="Cronômetro de 1 minuto" contar />}
              {i === 1 && <Cronometro segundos={600} titulo="Cronômetro de 10 minutos" />}
              </Fragment>
            ))}
          </ul>
          {erro && <p className="dn-aviso alerta">{erro}</p>}
          {qr && <div className="dn-apoio-qr"><p>Quem perdeu a janela escaneia este QR Code e volta para a sala.</p><img src={qr} alt="QR Code do check-in" /></div>}
        </>}
      </div></div>
    </main>
  );
}
