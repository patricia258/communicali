import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Globe, Mail } from 'lucide-react';
import { supabase } from '../lib';

export type PerfilParceiro = { partner_id: string; logo_original_url: string | null; descricao: string | null; whatsapp: string | null; email: string | null; instagram: string | null; linkedin: string | null; beneficio?: string | null; desconto?: string | null; beneficio_detalhes?: string | null; cupom?: string | null };
export const recursoAusente = (erro: { code?: string } | null) => !!erro && ['PGRST202', 'PGRST205', '42883', '42P01'].includes(erro.code || '');
export function urlWeb(valor?: string | null) {
  const texto = valor?.trim();
  if (!texto) return '';
  try { const url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}

export function usePerfisParceiros(permitido: boolean) {
  const [perfis, setPerfis] = useState<PerfilParceiro[]>([]);
  useEffect(() => {
    let ativo = true;
    setPerfis([]);
    if (permitido) void supabase.rpc('communicali_rede_perfis').then(({ data, error }) => { if (ativo && !error) setPerfis((data || []) as PerfilParceiro[]); });
    return () => { ativo = false; };
  }, [permitido]);
  return perfis;
}

function IconeCanal({ tipo }: { tipo: 'whatsapp' | 'instagram' | 'linkedin' }) {
  if (tipo === 'instagram') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
  if (tipo === 'linkedin') return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 8.5H3V21h3.5V8.5ZM4.75 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM21 13.6c0-3.3-1.8-5.4-4.6-5.4-1.5 0-2.7.7-3.4 1.8V8.5H9.7V21h3.5v-6.6c0-1.9.9-3 2.4-3 1.4 0 2 .9 2 2.8V21H21v-7.4Z" /></svg>;
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1l-4.7 1.4Z" /><path d="M9 8.8c.3 3 2.8 5.5 6 6.2l1-1.6-2-1-.9.7c-.8-.4-1.5-1.1-1.9-1.9l.7-.9-1-2-1.9 0Z" fill="currentColor" stroke="none" /></svg>;
}

export function ParceiroRede({ parceiro, perfil, demonstracao = false }: { parceiro: { id: string; nome: string; logo_url: string | null; site_url: string | null }; perfil?: PerfilParceiro; demonstracao?: boolean }) {
  const [falhou, setFalhou] = useState(false);
  const [avisoCupom, setAvisoCupom] = useState('');
  const logo = perfil?.logo_original_url || parceiro.logo_url;
  useEffect(() => setFalhou(false), [logo]);
  const telefone = perfil?.whatsapp?.replace(/\D/g, '');
  const site = urlWeb(parceiro.site_url);
  const instagram = perfil?.instagram?.trim().replace(/^.*instagram\.com\//, '').replace(/^@/, '');
  const linkedin = urlWeb(perfil?.linkedin);
  const email = perfil?.email?.trim();
  const canal = (nome: string, url: string, icone: ReactNode) => demonstracao
    ? <button type="button" disabled aria-label={`${nome} de ${parceiro.nome}, exemplo fictício`} title={`${nome}: exemplo sem contato real`}>{icone}</button>
    : <a href={url} target={nome === 'E-mail' ? undefined : '_blank'} rel="noopener noreferrer" aria-label={`${nome} de ${parceiro.nome}`} title={nome}>{icone}</a>;
  return <article className="passe__empresa">
    <div className={`passe__empresa-logo${perfil?.logo_original_url ? ' is-original' : ''}`}>
      {logo && !falhou ? <img src={logo} alt={`Logo ${parceiro.nome}`} onError={() => setFalhou(true)} /> : <span aria-hidden="true">{parceiro.nome.charAt(0)}</span>}
    </div>
    <div className="passe__empresa-corpo"><h3>{parceiro.nome}</h3>{perfil?.descricao && <p>{perfil.descricao}</p>}
      {!site && !telefone && !email && !instagram && !linkedin && <p className="passe__aviso">Contato ainda não informado.</p>}
    </div>
    {!!(site || telefone || email || instagram || linkedin) && <div className="passe__empresa-contatos">
        {site && canal('Site', site, <Globe size={19} aria-hidden="true" />)}
        {telefone && canal('WhatsApp', `https://wa.me/${telefone.length <= 11 ? `55${telefone}` : telefone}`, <IconeCanal tipo="whatsapp" />)}
        {email && canal('E-mail', `mailto:${email}`, <Mail size={19} aria-hidden="true" />)}
        {instagram && canal('Instagram', `https://www.instagram.com/${instagram}`, <IconeCanal tipo="instagram" />)}
        {linkedin && canal('LinkedIn', linkedin, <IconeCanal tipo="linkedin" />)}
    </div>}
    {!![perfil?.beneficio, perfil?.desconto, perfil?.beneficio_detalhes, perfil?.cupom].some((v) => v?.trim()) && <section className="passe__empresa-beneficio" aria-label={`Vantagem de ${parceiro.nome}`}>
      <div className="passe__empresa-beneficio-topo"><span>Exclusivo para a comunidade</span>{perfil?.desconto?.trim() && <strong className="passe__empresa-desconto">{perfil.desconto}</strong>}</div>
      {perfil?.cupom?.trim() && <div className="passe__empresa-cupom"><div><span>Seu cupom</span><code>{perfil.cupom}</code></div><button type="button" disabled={demonstracao} aria-label={`Copiar cupom de ${parceiro.nome}`} title="Copiar cupom" onClick={() => {
        void navigator.clipboard.writeText(perfil.cupom!.trim()).then(() => setAvisoCupom('Cupom copiado.'), () => setAvisoCupom('Não foi possível copiar. Selecione o código acima.'));
      }}><Copy size={16} aria-hidden="true" /></button></div>}
      {avisoCupom && <p role="status">{avisoCupom}</p>}
      {!!(perfil?.beneficio?.trim() || perfil?.beneficio_detalhes?.trim()) && <details className="passe__empresa-detalhes"><summary>Ver detalhes da vantagem</summary>
        {perfil?.beneficio?.trim() && <h4>{perfil.beneficio}</h4>}
        {perfil?.beneficio_detalhes?.trim() && <p>{perfil.beneficio_detalhes}</p>}
      </details>}
    </section>}
  </article>;
}

const REACOES: Array<[string, string]> = [['❤️', 'Amei'], ['😄', 'Que bom'], ['🚀', 'Incrível'], ['👏', 'Parabéns'], ['🤝', 'Boa parceria'], ['💡', 'Aprendi'], ['🙌', 'Valeu'], ['😢', 'Saudade']];

type Comentario = { id: string; nome: string; reacao: string | null; estrelas: number | null; comentario: string | null; criado_em: string; meu: boolean };
type Feedback = { pode_comentar: boolean; proprio: boolean; comentarios: Comentario[]; meu: { id: string; reacao: string | null; comentario: string | null } | null };

// Reações no perfil da Rede: publicadas na hora, sem moderação. Quem recebe pode remover.
export function FeedbackPerfil({ membroId, proprio, nome = '' }: { membroId: string; proprio: boolean; nome?: string }) {
  const [dados, setDados] = useState<Feedback | null>(null);
  const [aberto, setAberto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [reacao, setReacao] = useState('');
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const primeiro = nome.split(' ')[0] || 'esta pessoa';
  const carregar = () => supabase.rpc('communicali_feedback_listar', { p_perfil: membroId }).then(({ data, error }) => { if (!error) setDados(data as Feedback); });
  useEffect(() => { setDados(null); void carregar(); }, [membroId]);
  if (!dados) return null;
  const contagem = REACOES.map(([emoji]) => [emoji, dados.comentarios.filter((item) => item.reacao === emoji).length] as const).filter(([, total]) => total);
  function abrir() { setReacao(dados?.meu?.reacao || ''); setTexto(dados?.meu?.comentario || ''); setConfirmar(false); setErro(''); setAberto(true); }
  async function enviar() {
    setBusy(true); setErro('');
    const { error } = await supabase.rpc('communicali_reagir', { p_perfil: membroId, p_reacao: reacao, p_comentario: texto });
    setBusy(false);
    if (error) { setErro(error.message); setConfirmar(false); return; }
    setAberto(false); void carregar();
  }
  async function remover(id: string) {
    if (!window.confirm('Remover esta reação do perfil?')) return;
    const { error } = await supabase.rpc('communicali_remover_reacao', { p_id: id });
    if (!error) void carregar();
  }
  return (
    <section className="passe__cartao passe__reacoes">
      <header><h2>Reações</h2>{!!contagem.length && <div className="passe__reacoes-resumo">{contagem.map(([emoji, total]) => <span key={emoji}>{emoji} {total}</span>)}</div>}</header>
      {!dados.comentarios.length ? <p className="passe__aviso">{proprio ? 'Quando alguém reagir ao seu perfil, aparece aqui.' : `Ninguém reagiu ao perfil de ${primeiro} ainda.`}</p> : (
        <ul className="passe__reacoes-lista">
          {dados.comentarios.map((item) => (
            <li key={item.id}>
              <span className="passe__reacao-emoji" aria-hidden="true">{item.reacao || '💬'}</span>
              <div><strong>{item.nome.split(' ')[0]}</strong>{item.comentario && <p>{item.comentario}</p>}<time dateTime={item.criado_em}>{new Date(item.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time></div>
              {(proprio || item.meu) && <button type="button" className="passe__link" onClick={() => void remover(item.id)}>Remover</button>}
            </li>
          ))}
        </ul>
      )}
      {dados.pode_comentar && !proprio && <button type="button" className="passe__reagir-abrir" onClick={abrir}>{dados.meu ? <>Trocar minha reação <span aria-hidden="true">{dados.meu.reacao}</span></> : <>Deixar uma reação <span aria-hidden="true">❤️ 🚀 👏</span></>}</button>}
      {aberto && createPortal(
        <div className="passe__modal" role="dialog" aria-modal="true" aria-label={`Reação para ${primeiro}`} onKeyDown={(event) => { if (event.key === 'Escape') setAberto(false); }}>
          <div className="passe__janela passe__reagir">
            {!confirmar ? <>
              <h2>Como foi conhecer {primeiro}?</h2>
              <div className="passe__reagir-opcoes" role="group" aria-label="Escolha uma reação">
                {REACOES.map(([emoji, rotulo]) => <button key={emoji} type="button" className={reacao === emoji ? 'is-on' : ''} aria-pressed={reacao === emoji} onClick={() => setReacao(emoji)}><span aria-hidden="true">{emoji}</span><small>{rotulo}</small></button>)}
              </div>
              <label>Mensagem <em>opcional</em><textarea rows={3} maxLength={280} value={texto} placeholder="Um elogio, um agradecimento, algo que você aprendeu" onChange={(event) => setTexto(event.target.value)} /></label>
              {erro && <p className="passe__erro" role="alert">{erro}</p>}
              <div className="passe__reagir-acoes"><button type="button" className="passe__botao" disabled={!reacao} onClick={() => setConfirmar(true)}>Continuar</button><button type="button" className="passe__link" onClick={() => setAberto(false)}>Cancelar</button></div>
            </> : <>
              <span className="passe__reagir-grande" aria-hidden="true">{reacao}</span>
              <h2>Tem certeza que quer deixar esta reação?</h2>
              <p>Ela aparece agora no perfil de {primeiro}, com o seu nome{texto.trim() ? ' e a sua mensagem' : ''}. {primeiro} pode remover quando quiser.</p>
              <div className="passe__reagir-acoes"><button type="button" className="passe__botao" disabled={busy} onClick={() => void enviar()}>{busy ? 'Enviando…' : 'Sim, deixar reação'}</button><button type="button" className="passe__link" onClick={() => setConfirmar(false)}>Voltar</button></div>
            </>}
          </div>
        </div>
      , document.body)}
    </section>
  );
}
