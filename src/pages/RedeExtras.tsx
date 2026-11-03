import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Copy, Globe, Mail, Star } from 'lucide-react';
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
      {perfil?.beneficio?.trim() && <h4>{perfil.beneficio}</h4>}
      {perfil?.beneficio_detalhes?.trim() && <p>{perfil.beneficio_detalhes}</p>}
      {perfil?.cupom?.trim() && <div className="passe__empresa-cupom"><div><span>Seu cupom</span><code>{perfil.cupom}</code></div><button type="button" disabled={demonstracao} aria-label={`Copiar cupom de ${parceiro.nome}`} title="Copiar cupom" onClick={() => {
        void navigator.clipboard.writeText(perfil.cupom!.trim()).then(() => setAvisoCupom('Cupom copiado.'), () => setAvisoCupom('Não foi possível copiar. Selecione o código acima.'));
      }}><Copy size={18} aria-hidden="true" /></button></div>}
      {avisoCupom && <p role="status">{avisoCupom}</p>}
    </section>}
  </article>;
}

const IDEIAS = ['👏 Valeu pela troca!', '🤝 Que conexão boa!', '💡 Aprendi muito com você', '☕ Bora tomar outro café?', '✨', '💛', '🙌', '😊'];

type Comentario = { id: string; nome: string; estrelas: number; comentario: string; criado_em: string };
type Feedback = { pode_comentar: boolean; comentarios: Comentario[]; meu: { id: string; estrelas: number; comentario: string; status: string; motivo?: string | null } | null };
export function FeedbackPerfil({ membroId, proprio }: { membroId: string; proprio: boolean }) {
  const [dados, setDados] = useState<Feedback | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [nota, setNota] = useState(0);
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let atual = true;
    setDados(null); setAtivo(false); setNota(0); setTexto(''); setAviso(''); setErro('');
    void supabase.rpc('communicali_feedback_listar', { p_perfil: membroId }).then(({ data, error }) => {
      if (!atual || recursoAusente(error)) return;
      setAtivo(true);
      if (error) { setErro('Não foi possível carregar os comentários.'); return; }
      const resposta = data as Feedback;
      setDados(resposta); setNota(resposta.meu?.estrelas || 0); setTexto(resposta.meu?.comentario || '');
    });
    return () => { atual = false; };
  }, [membroId, tentativa]);
  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (proprio || !dados?.pode_comentar || busy || nota < 1 || texto.trim().length < 3 || texto.length > 600) return;
    setBusy(true); setErro(''); setAviso('');
    try {
      const { data, error } = await supabase.rpc('communicali_feedback_enviar', { p_perfil: membroId, p_estrelas: nota, p_comentario: texto.trim() });
      if (error) throw error;
      setDados((atual) => atual ? { ...atual, comentarios: atual.comentarios.filter((item) => item.id !== atual.meu?.id), meu: { id: data as string, estrelas: nota, comentario: texto.trim(), status: 'pendente' } } : atual);
      setAviso('Comentário enviado para aprovação da CALI.');
    } catch { setErro('Não foi possível enviar. Seu texto foi mantido para tentar novamente.'); }
    finally { setBusy(false); }
  }
  // A etapa de banco precisa estar ativa. Não exibir formulário sem persistência.
  if (!ativo) return null;
  return <section className="passe__cartao passe__feedback"><h2>Quem já se conectou</h2>
    {dados?.comentarios.map((item) => <article className="passe__comentario" key={item.id}>
      <div className="passe__comentario-topo"><strong>{item.nome}</strong><span aria-label={`${item.estrelas} de 5 estrelas`}>{Array.from({ length: 5 }, (_, n) => <Star key={n} size={13} aria-hidden="true" fill={n < item.estrelas ? 'currentColor' : 'none'} />)}</span></div>
      <p>{item.comentario}</p><time dateTime={item.criado_em}>{new Date(item.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time>
    </article>)}
    {dados && !dados.comentarios.length && <p className="passe__aviso">Nenhum comentário publicado ainda.</p>}
    {!dados && erro && <button type="button" className="passe__link" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button>}
    {!proprio && dados?.pode_comentar && <form className="passe__form" onSubmit={(event) => void enviar(event)}>
      <h3>{dados.meu ? 'Seu comentário' : 'Deixe uma mensagem 💬'}</h3>
      {!dados.meu && <p className="passe__feedback-convite">Um elogio, um agradecimento, algo que você aprendeu nessa troca. A CALI aprova antes de aparecer no perfil.</p>}
      <div className="passe__estrelas" role="group" aria-label="Sua avaliação">{Array.from({ length: 5 }, (_, n) => <button type="button" key={n} disabled={busy} aria-label={`${n + 1} ${n ? 'estrelas' : 'estrela'}`} aria-pressed={nota === n + 1} onClick={() => setNota(n + 1)}><Star size={22} fill={n < nota ? 'currentColor' : 'none'} aria-hidden="true" /></button>)}</div>
      <label>Comentário<textarea required minLength={3} maxLength={600} rows={3} value={texto} disabled={busy} onChange={(event) => setTexto(event.target.value)} /></label>
      <div className="passe__feedback-ideias" role="group" aria-label="Sugestões de mensagem">{IDEIAS.map((ideia) => <button type="button" key={ideia} disabled={busy} onClick={() => setTexto((atual) => (atual.trim() ? `${atual.trim()} ${ideia}` : ideia).slice(0, 600))}>{ideia}</button>)}</div>
      <p className="passe__aviso">A CALI revisa antes de publicar. Aparecem seu nome, avaliação e comentário, sem foto.</p>
      {dados.meu && <p className="passe__aviso">{dados.meu.status === 'aprovado' ? 'Publicado. Uma edição passa por nova aprovação.' : dados.meu.status === 'oculto' ? `Não publicado. ${dados.meu.motivo || 'Você pode revisar e reenviar.'}` : 'Aguardando aprovação da CALI.'}</p>}
      <button type="submit" className="passe__botao passe__botao--linha" disabled={busy || nota < 1 || texto.trim().length < 3}>{busy ? 'Enviando…' : 'Enviar para aprovação'}</button>
    </form>}
    {aviso && <p className="passe__ok" role="status">{aviso}</p>}{erro && <p className="passe__erro" role="alert">{erro}</p>}
  </section>;
}
