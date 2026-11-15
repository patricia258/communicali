/* Celular da dinâmica: sem login e sem nome. As duas perguntas ficam abertas juntas, com até 4 palavras por pessoa em cada uma. */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { deviceCode, editionSlug, errorMessage, supabase } from '../lib';
import type { EstadoPublico, EtapaPublica } from './api';
import './dinamica.css';

const NOME: Record<number, string> = { 1: 'Barreiras', 2: 'Caminhos' };
const STATUS: Record<string, string> = { aguardando: 'Ainda não abriu', aberta: 'Aberta', encerrada: 'Encerrada' };

function Cartao({ etapa, limite, aoEnviar }: { etapa: EtapaPublica; limite: number; aoEnviar: (e: number, texto: string) => Promise<string> }) {
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState({ texto: '', erro: false });
  const [enviando, setEnviando] = useState(false);
  const [robo, setRobo] = useState('');
  const aberta = etapa.status === 'aberta', restam = limite - etapa.usadas;
  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (robo || !aberta || enviando) return; // campo escondido: só robô preenche
    setEnviando(true);
    const erro = await aoEnviar(etapa.etapa, texto);
    setEnviando(false);
    if (erro) setMsg({ texto: erro, erro: true }); else { setTexto(''); setMsg({ texto: 'Recebido. Sua palavra já vai para o telão.', erro: false }); }
    window.setTimeout(() => setMsg({ texto: '', erro: false }), 4000);
  }
  return (
    <form className={`dn-cartao${aberta ? '' : ' fechado'}`} onSubmit={(ev) => void enviar(ev)} autoComplete="off">
      <p className="dn-pg-etapa">{etapa.etapa} de 2 · {NOME[etapa.etapa]}</p>
      <span className={`dn-status ${etapa.status}`}>{STATUS[etapa.status]}</span>
      <h1>{etapa.pergunta}</h1>
      <p className="dn-pg-inst">{etapa.instrucao}</p>
      <div className="dn-campo">
        <label className="sr-only" htmlFor={`dn-t${etapa.etapa}`} style={{ position: 'absolute', left: -9999 }}>Sua resposta</label>
        <input id={`dn-t${etapa.etapa}`} value={texto} maxLength={30} placeholder={aberta ? 'Digite aqui' : etapa.status === 'encerrada' ? 'Pergunta encerrada' : 'Aguarde a abertura'} enterKeyHint="send" disabled={!aberta || restam <= 0} onChange={(ev) => setTexto(ev.target.value)} />
        <small>{texto.length}/30</small>
      </div>
      <input className="dn-hp" tabIndex={-1} aria-hidden="true" autoComplete="off" value={robo} onChange={(ev) => setRobo(ev.target.value)} />
      <button className="dn-btn" type="submit" disabled={!aberta || restam <= 0 || texto.trim().length < 2 || enviando}>{enviando ? 'Enviando...' : 'Enviar'}</button>
      <p className={`dn-msg${msg.erro ? ' erro' : ''}`} role="status">{msg.texto}</p>
      {etapa.enviadas.length > 0 && <div className="dn-meus"><small>Você enviou</small><div>{etapa.enviadas.map((palavra, i) => <span key={i}>{palavra}</span>)}</div></div>}
      {aberta && <p className="dn-restam">{restam > 0 ? `Você pode enviar mais ${restam}.` : 'Você enviou o máximo desta pergunta. Obrigada!'}</p>}
    </form>
  );
}

export function Participante() {
  const slug = editionSlug();
  const [estado, setEstado] = useState<EstadoPublico | null>(null);
  const [falha, setFalha] = useState(false);
  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('communicali_dinamica_estado', { p_slug: slug, p_aparelho: deviceCode() });
    if (error || !data) { setFalha(true); return; }
    setFalha(false); setEstado(data as EstadoPublico);
  }, [slug]);
  useEffect(() => { void carregar(); const timer = window.setInterval(carregar, 3000); return () => window.clearInterval(timer); }, [carregar]);

  async function enviar(etapa: number, texto: string) {
    const { error } = await supabase.rpc('communicali_dinamica_enviar', { p_slug: slug, p_etapa: etapa, p_texto: texto, p_aparelho: deviceCode() });
    await carregar();
    return error ? errorMessage(error) : '';
  }
  const etapas = estado?.existe ? estado.etapas || [] : [];
  const nenhuma = !etapas.some((e) => e.status !== 'aguardando');
  return (
    <main className="dn-pg">
      <div className="dn-pg-faixa" />
      <img className="dn-pg-logo" src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" />
      {falha && !estado && <div className="dn-pg-corpo"><p className="dn-aviso alerta">Não foi possível abrir a dinâmica. Recarregue a página.</p></div>}
      {estado && nenhuma && <div className="dn-centro"><h1>A dinâmica começa em instantes</h1><p>Quando as perguntas abrirem, elas aparecem aqui.</p></div>}
      {estado && !nenhuma && (
        <div className="dn-pg-corpo">
          {etapas.map((etapa) => <Cartao key={etapa.etapa} etapa={etapa} limite={estado.limite || 4} aoEnviar={enviar} />)}
        </div>
      )}
      <p className="dn-rodape">Sem login e sem nome. Só a palavra. · <a href="/privacidade" style={{ color: 'inherit' }}>Privacidade</a></p>
    </main>
  );
}
