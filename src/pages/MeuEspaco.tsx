/* Espaço do membro: passaporte com carimbos, edições, missões, indicações, programa e perfil. Abre com código enviado ao e-mail. */
import { useEffect, useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Bell, Building2, CalendarDays, Check, ChevronDown, ExternalLink, Handshake, Images, LockKeyhole, Mail, MapPin, Megaphone, Mic, Pencil, Share2, Target, UserPlus, Users } from 'lucide-react';
import { errorMessage, supabase } from '../lib';
import { longDate } from './Edicao';
import { JanelaCartao } from './MembroCartao';
import { FeedbackPerfil, ParceiroRede, usePerfisParceiros } from './RedeExtras';
import { ConviteMembro } from './ConviteMembro';
import { ParceirosExemplos } from './ParceirosExemplos';
import { TrilhaPrograma } from './TrilhaPrograma';
import './membro.css';

type Carimbo = { slug: string; titulo: string; selo: string; data_evento: string; local: string; cidade: string; capa_url: string | null; carimbo_url: string | null; fotos_url: string | null };
type Proxima = { slug: string; titulo: string; data_evento: string; horario: string; local: string; cidade: string; capa_url: string | null; inscricoes_abertas: boolean };
type Missao = { slug: string; titulo: string; descricao: string; nivel: string; modo: string; status: string };
type Espaco = {
  membro: { nome: string; apelido: string | null; email: string; foto_url: string | null; categoria: string; codigo: string; temas: string[]; interesse_palestras: boolean; linkedin: string | null } | null;
  pontos: number;
  encontros: number;
  carimbos: Carimbo[];
  proximas: Proxima[];
  missoes: Missao[];
  indicacoes: Array<{ nome: string; compareceu: boolean }>;
  recomendacoes: Array<{ nome: string; tipo: string; status: string }>;
};
type Cartao = { cargo: string | null; empresa: string | null; temas: string[]; aberto_trabalho: boolean; recrutador: boolean; reacoes: Array<{ reacao: string | null; nome: string; comentario: string | null }> };
type Aba = 'inicio' | 'edicoes' | 'missoes' | 'rede' | 'indicar' | 'programa' | 'perfil';
type Pessoa = { aberto_trabalho: boolean; recrutador: boolean; id: string; nome: string; foto_url: string | null; categoria: string; cidade_uf: string | null; empresa: string | null; cargo: string | null; regiao: string | null; segmento: string | null; temas: string[]; interesses: string[]; busca: string[]; presta_servicos: boolean; eu_conectei: boolean; me_conectou: boolean; whatsapp?: string | null; email?: string; instagram?: string | null; linkedin?: string | null };
type Extra = { extrato: Array<{ acao: string; pontos: number; motivo: string | null; titulo: string | null; data: string }>; avisos: Array<{ id: string; tipo: string; texto: string; de: string | null; foto_url: string | null; pode_voltar: boolean }>; conexoes: number; nivel_novo: string | null; sugestoes: Array<{ id: string; nome: string; foto_url: string | null; segmento: string | null; motivo: string }>; indicados: Array<{ nome: string; cargo: string | null; empresa: string | null; edicao: string; data: string; status: string; compareceu: boolean }> };
type Parceiro = { id: string; nome: string; logo_url: string | null; site_url: string | null };

const ABAS: Array<[Aba, string]> = [['inicio', 'Início'], ['edicoes', 'Edições'], ['missoes', 'Missões'], ['rede', 'Rede'], ['indicar', 'Indicar'], ['programa', 'Programa']];
const NIVEIS: Record<string, string> = { fundadora: 'Fundadora', membro: 'Membro', conector: 'Conector', embaixador: 'Embaixador', convidado: 'Convidado', organizador: 'Organização', kids: 'Kids' };
const META: Record<string, { nome: string; pontos: number; encontros: number; nivel: string }> = {
  membro: { nome: 'Conector', pontos: 60, encontros: 4, nivel: 'conector' },
  conector: { nome: 'Embaixador', pontos: 180, encontros: 6, nivel: 'embaixador' },
};
const MISSAO_SELOS: Record<string, [string, string]> = { convidados: ['postal-indicacao', 'Convidou'], conexao: ['postal-conector', 'Conectou'], lugar: ['postal-lugar', 'Recomendou'], palestra: ['postal-palestra', 'Palestrou'], parceiro: ['postal-embaixador', 'Aproximou'], representar: ['postal-embaixador', 'Representou'] };
const SITUACAO: Record<string, string> = { concluida: 'Concluída', enviada: 'Em análise', recusada: 'Pode reenviar', aberta: 'Em aberto' };
const PONTOS: Array<[string, number]> = [['Presença em encontro', 10], ['Visitante indicado que compareceu', 5], ['Recomendação validada', 10], ['Contribuição aprovada', 15], ['Parceiro que contribuiu', 20], ['Palestra a convite da organização', 30]];

const ATUACAO = ['Recrutamento e seleção', 'Departamento pessoal', 'RH estratégico', 'Consultoria de RH', 'Treinamento e desenvolvimento', 'Treinamento de liderança', 'Treinamento de atendimento', 'Treinamento de vendas', 'Desenvolvimento de líderes', 'Cultura e clima', 'Pesquisa de clima', 'Onboarding e integração', 'Avaliação de desempenho', 'Cargos e salários', 'Remuneração e benefícios', 'Saúde ocupacional', 'Segurança do trabalho', 'Coaching e mentoria', 'Palestras', 'Facilitação de grupos', 'Jurídico trabalhista', 'Contabilidade', 'Finanças', 'Gestão de negócios', 'Planejamento estratégico', 'Processos', 'Marketing', 'Comunicação interna', 'Design', 'Eventos', 'Vendas', 'Atendimento ao cliente', 'Tecnologia', 'Inteligência artificial', 'Dados e indicadores', 'Saúde e bem-estar', 'Psicologia', 'Educação', 'Logística', 'Empreendedorismo'];
const SEGMENTOS = ['RH e gestão de pessoas', 'Marketing e comunicação', 'Jurídico', 'Tecnologia', 'Financeiro e contábil', 'Comercial e vendas', 'Educação e treinamento', 'Saúde e bem-estar', 'Indústria', 'Serviços', 'Varejo', 'Logística', 'Terceiro setor', 'Outro'];
const REGIOES = ['Curitiba', 'Região Metropolitana de Curitiba', 'Interior do Paraná', 'Santa Catarina', 'Rio Grande do Sul', 'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Centro-Oeste', 'Nordeste', 'Norte', 'Fora do Brasil'];
const INTERESSES_REDE = ['RH', 'Liderança', 'Gestão de pessoas', 'Desenvolvimento humano', 'Empreendedorismo', 'Networking', 'Inteligência artificial', 'Carreira', 'Parcerias', 'Vagas', 'Mentoria', 'Palestras'];

type CampoMissao = { id: string; rotulo: string; obrigatorio?: boolean; tipo?: string; opcoes?: string[] };
const FORMULARIOS: Record<string, CampoMissao[]> = {
  conexao: [
    { id: 'quem', rotulo: 'Quem você apresentou', obrigatorio: true },
    { id: 'para', rotulo: 'Para quem você apresentou', obrigatorio: true },
    { id: 'quando', rotulo: 'Quando aconteceu', obrigatorio: true, tipo: 'date' },
    { id: 'resultado', rotulo: 'O que resultou', obrigatorio: true, opcoes: ['Parceria', 'Contratação', 'Negócio fechado', 'Mentoria', 'Palestra ou conteúdo', 'Outro'] },
    { id: 'contato', rotulo: 'Contato de quem pode confirmar', obrigatorio: true },
  ],
  representar: [
    { id: 'onde', rotulo: 'Onde você representou a comunidade', obrigatorio: true },
    { id: 'quando', rotulo: 'Quando aconteceu', obrigatorio: true, tipo: 'date' },
    { id: 'como', rotulo: 'Como foi', obrigatorio: true, opcoes: ['Evento presencial', 'Evento online', 'Empresa ou faculdade', 'Publicação ou podcast', 'Outro'] },
    { id: 'link', rotulo: 'Link da publicação ou do evento' },
  ],
};

const primeiroNome = (espaco: Espaco) => (espaco.membro?.apelido || espaco.membro?.nome || '').trim().split(/\s+/)[0];

async function conectar(para: string) {
  const { data, error } = await supabase.rpc('communicali_conectar', { p_para: para });
  if (error) throw new Error(errorMessage(error));
  if ((data as { novo: boolean }).novo) {
    const sessao = await supabase.auth.getSession();
    void fetch('/api/email-conexao', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.data.session?.access_token || ''}` }, body: JSON.stringify({ para }) });
  }
}

const RESUMO: Array<[string, string, string]> = [['presenca', 'Presenças', 'presenca'], ['indicacao', 'Indicações', 'indicacao:|convidado:'], ['recomendacao', 'Recomendações', 'recomendacao:'], ['contribuicao', 'Contribuições', 'contribuicao:'], ['parceiro', 'Parceiros', 'parceiro:'], ['palestra', 'Palestras', 'palestra:']];
const ROTULO = (acao: string, titulo: string | null) => {
  if (acao === 'presenca') return `Presença: ${titulo || 'encontro'}`;
  if (/^(indicacao|convidado):/.test(acao)) return 'Pessoa indicada compareceu';
  if (acao.startsWith('recomendacao:')) return 'Recomendação validada';
  if (acao.startsWith('contribuicao:')) return 'Contribuição aprovada';
  if (acao.startsWith('parceiro:')) return 'Parceiro que contribuiu';
  if (acao.startsWith('palestra:')) return 'Palestra a convite';
  return 'Ajuste da organização';
};

// Foto de passaporte, reta, com carimbo da comunidade: DISPONÍVEL (aberto ao mercado) ou RECRUTANDO.
function FotoSelo({ url, nome, aberto, recruta, tamanho = 120 }: { url: string | null; nome: string; aberto?: boolean; recruta?: boolean; tamanho?: number }) {
  const selo = recruta ? { texto: 'Recrutando', tipo: 'recruta' } : aberto ? { texto: 'Disponível', tipo: 'aberto' } : null;
  return (
    <span className="passe__foto-selo" style={{ width: tamanho }}>
      {url ? <img src={url} alt={`Foto de ${nome}`} /> : <span className="passe__foto-inicial">{nome.charAt(0)}</span>}
      {selo && <span className={`passe__carimbo-mercado passe__carimbo-mercado--${selo.tipo}`}><small>ComuniCALI</small>{selo.texto}</span>}
    </span>
  );
}

// Clique suave nos botões e abas. Fica mudo para quem pede menos movimento no aparelho.
let audio: AudioContext | null = null;
function tique() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    audio = audio || new AudioContext();
    const osc = audio.createOscillator(); const ganho = audio.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, audio.currentTime); osc.frequency.exponentialRampToValueAtTime(1320, audio.currentTime + 0.03);
    ganho.gain.setValueAtTime(0.0001, audio.currentTime); ganho.gain.exponentialRampToValueAtTime(0.035, audio.currentTime + 0.005); ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.06);
    osc.connect(ganho).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + 0.07);
  } catch { /* sem som neste aparelho */ }
}

function Pagina({ children, aba, setAba }: { children: ReactNode; aba?: Aba; setAba?: (aba: Aba) => void }) {
  useEffect(() => {
    const ouvir = (event: PointerEvent) => { if ((event.target as HTMLElement).closest('.passe button:not(:disabled), .passe summary')) tique(); };
    document.addEventListener('pointerdown', ouvir);
    return () => document.removeEventListener('pointerdown', ouvir);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [aba]);
  return (
    <div className="passe">
      <div className="passe__faixa" aria-hidden="true"><span /><span /><span /><span /></div>
      <main className="passe__tela">{children}</main>
      {setAba && (
        <nav className="passe__menu" aria-label="Abas do Meu passaporte">
          {ABAS.map(([id, nome]) => <button key={id} type="button" className={aba === id ? 'is-on' : ''} aria-pressed={aba === id} onClick={() => { setAba(id); window.scrollTo(0, 0); }}>{nome}</button>)}
        </nav>
      )}
    </div>
  );
}

function Entrar() {
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setErro('');
    const clean = email.trim().toLowerCase();
    const { error } = enviado
      ? await supabase.auth.verifyOtp({ email: clean, token: codigo.trim(), type: 'email' })
      : await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    if (error) setErro(enviado ? 'Código inválido ou vencido. Confira e tente de novo.' : errorMessage(error));
    else if (!enviado) setEnviado(true);
    setBusy(false);
  }

  return (
    <div className="passe passe--entrada">
      <div className="passe__faixa" aria-hidden="true"><span /><span /><span /><span /></div>
      <main className="passe__entrada">
        <div className="passe__colagem" aria-hidden="true">
          <img src="/selos/postal-membro.png" alt="" />
          <img src="/selos/postal-conector.png" alt="" />
          <img src="/selos/postal-embaixador.png" alt="" />
          <img src="/selos/carimbo-fundadora.png" alt="" />
        </div>
        <section className="passe__acesso">
          <img className="passe__logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" />
          <h1>Seu passaporte está <em>te esperando</em></h1>
          <p>{enviado ? `Enviamos um código para ${email.trim()}. Ele chega em instantes.` : 'Carimbos, milhas, missões e conexões da comunidade em um só lugar.'}</p>
          <form className="passe__form" onSubmit={(event) => void enviar(event)}>
            {enviado
              ? <label>Código recebido<input required inputMode="numeric" autoComplete="one-time-code" autoFocus value={codigo} onChange={(event) => setCodigo(event.target.value)} /></label>
              : <label>Seu e-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
            {erro && <p className="passe__erro" role="alert">{erro}</p>}
            <button className="passe__botao" type="submit" disabled={busy}>{busy ? 'Aguarde...' : enviado ? 'Abrir meu passaporte' : 'Receber meu código'}</button>
          </form>
          {enviado ? <button type="button" className="passe__link" onClick={() => { setEnviado(false); setCodigo(''); setErro(''); }}>Usar outro e-mail</button> : <p className="passe__aviso">Use o e-mail do seu check-in. Ainda não foi a um encontro? <a href="/#proximo">Veja o próximo</a>.</p>}
          <a className="passe__admin-link" href="/admin">Área administrativa</a>
        </section>
      </main>
    </div>
  );
}

function CarimboEdicao({ carimbo, indice }: { carimbo: Carimbo; indice: number }) {
  if (carimbo.carimbo_url) return <img className="passe__carimbo" src={carimbo.carimbo_url} alt={`Carimbo: ${carimbo.titulo}`} draggable={false} />;
  const cor = ['#5F6238', '#A9502E', '#7A1F3D'][indice % 3];
  const data = carimbo.data_evento.split('-').reverse().join('.');
  return (
    <svg className="passe__carimbo" viewBox="0 0 400 400" role="img" aria-label={`Carimbo: ${carimbo.titulo}`} style={{ transform: `rotate(${indice % 2 ? 5 : -6}deg)` }}>
      <rect x="28" y="92" width="344" height="216" fill="none" stroke={cor} strokeWidth="7" />
      <rect x="44" y="108" width="312" height="184" fill="none" stroke={cor} strokeWidth="2.5" />
      <text x="200" y="164" textAnchor="middle" fontSize="22" letterSpacing="4" fill={cor} fontWeight="700">COMMUNICALI</text>
      <text x="200" y="214" textAnchor="middle" fontSize="30" fill={cor} fontWeight="700">{carimbo.titulo.slice(0, 20)}</text>
      <text x="200" y="256" textAnchor="middle" fontSize="23" letterSpacing="2" fill={cor} fontWeight="700">{data}</text>
    </svg>
  );
}

function TextoAviso({ texto }: { texto: string }) {
  // O aviso atual não informa o serviço específico. Realçar apenas o texto recebido.
  const partes = texto.split(/(^.+?(?= busca | quer se conectar | se conectou de volta )|serviços da CALI)/);
  return <>{partes.map((parte, indice) => indice % 2 ? <strong key={indice}>{parte}</strong> : parte)}</>;
}

function Inicio({ espaco, extra, abrir, atualizar, compartilhar, verPerfil }: { espaco: Espaco; extra: Extra | null; abrir: (aba: Aba) => void; atualizar: () => void; compartilhar: () => void; verPerfil: (id: string) => void }) {
  const [alertasAbertos, setAlertasAbertos] = useState(false);
  const [avisoPendente, setAvisoPendente] = useState<string | null>(null);
  const [erroAviso, setErroAviso] = useState('');
  const m = espaco.membro!;
  const avisos = extra?.avisos || [];
  const meta = META[m.categoria];
  const faltam = meta ? Math.max(meta.pontos - espaco.pontos, 0) : 0;
  const preenchidos = meta ? Math.min(espaco.pontos / meta.pontos, 1) * 10 : 10;
  const [cartao, setCartao] = useState<Cartao | null>(null);
  const [ocultas, setOcultas] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('passe:sugestoes-ocultas') || '[]'); } catch { return []; } });
  useEffect(() => { void supabase.rpc('communicali_meu_cartao').then(({ data }) => setCartao(data as Cartao)); }, []);
  const ocultar = (id: string) => { const lista = [...ocultas, id]; setOcultas(lista); try { localStorage.setItem('passe:sugestoes-ocultas', JSON.stringify(lista)); } catch { /* só nesta visita */ } };
  // Uma pessoa aparece uma vez, com todos os pontos em comum juntos.
  const sugestoes = Object.values((extra?.sugestoes || []).reduce<Record<string, { id: string; nome: string; foto_url: string | null; motivos: string[] }>>((acc, item) => {
    acc[item.id] = acc[item.id] || { id: item.id, nome: item.nome, foto_url: item.foto_url, motivos: [] };
    if (!acc[item.id].motivos.includes(item.motivo)) acc[item.id].motivos.push(item.motivo);
    return acc;
  }, {})).filter((item) => !ocultas.includes(item.id));
  const reacoes = cartao?.reacoes || [];
  const contagem = [...new Set(reacoes.map((item) => item.reacao).filter(Boolean))].map((emoji) => [emoji, reacoes.filter((item) => item.reacao === emoji).length] as const);
  async function marcarLido(id: string) {
    setAvisoPendente(id);
    setErroAviso('');
    try {
      const { error } = await supabase.rpc('communicali_aviso_lido', { p_id: id });
      if (error) throw error;
      atualizar();
    } catch {
      setErroAviso('Não foi possível marcar o alerta como lido. Tente novamente.');
    } finally {
      setAvisoPendente(null);
    }
  }
  return (
    <>
      <header className="passe__topo"><img className="passe__logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" /><span>PASSAPORTE</span></header>
      <div className="passe__saudacao">
        <h1>Olá, <em>{(m.apelido || m.nome).split(' ')[0]}!</em></h1>
        <button type="button" className="passe__sino" aria-label={`Alertas${extra ? `: ${avisos.length} ${avisos.length === 1 ? 'não lido' : 'não lidos'}` : ''}`} aria-expanded={alertasAbertos} aria-controls="passaporte-alertas" onClick={() => setAlertasAbertos(!alertasAbertos)}>
          <Bell size={21} aria-hidden="true" />
          {avisos.length > 0 && <span className="passe__sino-contagem" aria-hidden="true">{avisos.length > 99 ? '99+' : avisos.length}</span>}
        </button>
      </div>
      <section id="passaporte-alertas" className="passe__notificacoes" aria-labelledby="passaporte-alertas-titulo" hidden={!alertasAbertos}>
        <h2 id="passaporte-alertas-titulo">Alertas</h2>
        {!extra ? <p>Carregando alertas…</p> : !avisos.length ? <p>Nenhum alerta por enquanto.</p> : (
          <ul className="passe__notificacoes-lista">
            {avisos.map((aviso) => (
              <li className="passe__notificacao" key={aviso.id}>
                {aviso.foto_url ? <img src={aviso.foto_url} alt="" /> : <span className="passe__notificacao-icone"><Bell size={18} aria-hidden="true" /></span>}
                <div>
                  <p><TextoAviso texto={aviso.texto} /></p>
                  <div className="passe__notificacao-acoes">
                    {aviso.tipo === 'match' && m.categoria === 'fundadora' && <a href="/admin/matches">Ver no painel</a>}
                    {aviso.de && (aviso.pode_voltar || aviso.tipo === 'perfil') && <button type="button" onClick={() => verPerfil(aviso.de!)}>Ver perfil</button>}
                    <button type="button" disabled={avisoPendente !== null} onClick={() => void marcarLido(aviso.id)}><Check size={15} aria-hidden="true" />{avisoPendente === aviso.id ? 'Salvando…' : 'Marcar como lido'}</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {erroAviso && <p role="alert">{erroAviso}</p>}
      </section>
      <section className="passe__heroi" aria-label="Seu passaporte">
        <button type="button" className="passe__editar" aria-label="Editar meu perfil" onClick={() => abrir('perfil')}><Pencil size={18} aria-hidden="true" /></button>
        <div className="passe__heroi-foto">
          {m.foto_url ? <FotoSelo url={m.foto_url} nome={m.nome} aberto={cartao?.aberto_trabalho} recruta={cartao?.recrutador} tamanho={116} /> : <button type="button" className="passe__heroi-sem-foto" onClick={() => abrir('perfil')}>Colocar foto</button>}
        </div>
        <div className="passe__heroi-texto">
          <span className="passe__heroi-nivel">{NIVEIS[m.categoria] || m.categoria}</span>
          <h2>{m.nome}</h2>
          {(cartao?.cargo || cartao?.empresa) && <p>{[cartao.cargo, cartao.empresa].filter(Boolean).join(' · ')}</p>}
          {!!cartao?.temas?.length && <div className="passe__heroi-temas">{cartao.temas.slice(0, 3).map((tema) => <span key={tema}>{tema}</span>)}</div>}
        </div>
        <img className="passe__heroi-selo" src={`/selos/postal-${m.categoria === 'organizador' ? 'fundadora' : m.categoria}.png`} alt={`Selo ${NIVEIS[m.categoria] || m.categoria}`} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        <div className="passe__heroi-pontos">
          <p className="passe__numero"><strong>{espaco.pontos}</strong> milhas{meta ? <>, <b>{faltam ? `faltam ${faltam} para ${meta.nome}` : `milhas alcançadas para ${meta.nome}`}</b></> : ''}</p>
          <div className="passe__barra" aria-hidden="true">
            {Array.from({ length: 10 }, (_, indice) => <span key={indice} className={`c${Math.min(Math.floor(indice / 2), 3)}`} style={{ '--fill': `${Math.max(Math.min(preenchidos - indice, 1), 0) * 100}%` } as React.CSSProperties} />)}
          </div>
          {meta && <p className="passe__req">{Math.min(espaco.encontros, meta.encontros)} de {meta.encontros} encontros · {espaco.missoes.filter((item) => item.nivel === meta.nivel && item.status === 'concluida').length} de {espaco.missoes.filter((item) => item.nivel === meta.nivel).length} missões</p>}
          <p className="passe__mrz">P&lt;COMUNICALI&lt;{m.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]+/g, '<').slice(0, 18)}<br />{m.codigo.replace(/-/g, '<').padEnd(10, '<')}{espaco.carimbos[0]?.data_evento.split('-').reverse().join('') || ''}&lt;&lt;&lt;{espaco.pontos}</p>
        </div>
        <button type="button" className="passe__compartilhar" onClick={compartilhar}><Share2 size={14} aria-hidden="true" />Compartilhar</button>
      </section>
      {(avisos.length > 0 || reacoes.length > 0) && (
        <section className="passe__cartao passe__novidades">
          <h2>Para você</h2>
          {avisos.slice(0, 3).map((aviso) => (
            <div className="passe__novidade" key={aviso.id}>
              {aviso.foto_url ? <img src={aviso.foto_url} alt="" /> : <span className="passe__notificacao-icone"><Bell size={16} aria-hidden="true" /></span>}
              <p><TextoAviso texto={aviso.texto} />{aviso.de && (aviso.pode_voltar || aviso.tipo === 'perfil') && <button type="button" className="passe__link" onClick={() => verPerfil(aviso.de!)}>Ver perfil</button>}</p>
              <button type="button" className="passe__fechar" aria-label="Dispensar alerta" disabled={avisoPendente !== null} onClick={() => void marcarLido(aviso.id)}>×</button>
            </div>
          ))}
          {avisos.length > 3 && <button type="button" className="passe__link" onClick={() => setAlertasAbertos(true)}>Ver todos os {avisos.length} alertas</button>}
          {reacoes.length > 0 && <div className="passe__novidade passe__novidade--reacoes">
            <span className="passe__reacoes-resumo">{contagem.map(([emoji, total]) => <span key={emoji}>{emoji} {total}</span>)}</span>
            <p><strong>{reacoes.length} {reacoes.length === 1 ? 'reação' : 'reações'}</strong> no seu perfil{reacoes[0]?.comentario ? <>: <em>"{reacoes[0].comentario}"</em>, de {reacoes[0].nome}</> : '.'}</p>
          </div>}
        </section>
      )}
      {!!sugestoes.length && (
        <section className="passe__cartao">
          <h2>Sugestões de conexão</h2>
          {sugestoes.map((item) => (
            <div className="passe__sugestao-linha" key={item.id}>
              <button type="button" className="passe__sugestao" onClick={() => verPerfil(item.id)}>
                <span className="passe__sugestao-foto">{item.foto_url ? <img src={item.foto_url} alt="" /> : item.nome.charAt(0)}</span>
                <span><strong>{item.nome}</strong><small>Em comum: {item.motivos.join(', ')}</small></span>
              </button>
              <button type="button" className="passe__fechar" aria-label={`Não mostrar ${item.nome}`} onClick={() => ocultar(item.id)}>×</button>
            </div>
          ))}
        </section>
      )}
      <section className="passe__carimbos passe__pagina">
        <h2>Carimbos dos encontros</h2>
        <div className="passe__rolagem">
          {espaco.carimbos.map((carimbo, indice) => <CarimboEdicao key={carimbo.slug} carimbo={carimbo} indice={indice} />)}
          <div className="passe__vago">próximo<br />encontro</div>
        </div>
      </section>
    </>
  );
}

type EncontroAgenda = Pick<Carimbo, 'slug' | 'titulo' | 'data_evento' | 'local' | 'cidade' | 'capa_url'> & {
  resumo?: string | null; fotos_url?: string | null; horario?: string; inscricoes_abertas?: boolean; inscricao_url?: string | null;
};
const AGENDA_FIELDS = 'slug,titulo,data_evento,horario,local,cidade,capa_url,resumo,fotos_url,inscricoes_abertas,inscricao_url';

function linkEncontro(valor?: string | null) {
  const link = valor?.trim() || '';
  if (/^\/(?!\/)/.test(link)) return link;
  try { return ['https:', 'http:'].includes(new URL(link).protocol) ? link : ''; } catch { return ''; }
}

function TextoResumo({ texto }: { texto: string }) {
  return <>{texto.trim().split(/\n\s*\n/).map((paragrafo, indice) => (
    <p key={indice}>{paragrafo.split(/(https?:\/\/[^\s<>]+)/g).map((parte, posicao) => {
      if (posicao % 2 === 0) return parte;
      const url = parte.replace(/[.,;:!?]+$/, '');
      return linkEncontro(url) ? <span key={posicao}><a href={url} target="_blank" rel="noopener noreferrer">{url}<ExternalLink size={12} aria-hidden="true" /></a>{parte.slice(url.length)}</span> : parte;
    })}</p>
  ))}</>;
}

function organizarAgenda(espaco: Espaco, publicadas: EncontroAgenda[], hoje: string) {
  // Manter as edições já autorizadas pelo passaporte e somar somente a agenda pública.
  const encontros = new Map<string, EncontroAgenda>();
  [...espaco.carimbos, ...espaco.proximas, ...publicadas].forEach((edicao) => encontros.set(edicao.slug, { ...encontros.get(edicao.slug), ...edicao }));
  const ordem = (a: EncontroAgenda, b: EncontroAgenda) => a.data_evento.localeCompare(b.data_evento) || a.slug.localeCompare(b.slug);
  return {
    proximos: [...encontros.values()].filter((edicao) => edicao.data_evento >= hoje).sort(ordem),
    anteriores: [...encontros.values()].filter((edicao) => edicao.data_evento < hoje).sort((a, b) => ordem(b, a)),
  };
}

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
function EncontroCartao({ edicao, proximo, carregando, erro, estive = false, embarque = false }: { edicao: EncontroAgenda; proximo: boolean; carregando: boolean; erro: boolean; estive?: boolean; embarque?: boolean }) {
  const [, mes, dia] = edicao.data_evento.split('-');
  const fotos = linkEncontro(edicao.fotos_url);
  const inscricao = edicao.inscricoes_abertas ? linkEncontro(edicao.inscricao_url) || `/inscricao/${encodeURIComponent(edicao.slug)}` : '';
  return (
    <article className={`passe__agenda-cartao${proximo ? ' passe__agenda-cartao--proximo' : ''}${estive ? ' is-estive' : ''}`}>
      <div className="passe__agenda-data" aria-hidden="true"><strong>{dia}</strong><span>{MESES[Number(mes) - 1]}</span></div>
      {embarque && !estive && <span className="passe__agenda-embarque"><small>Cartão de embarque</small>Inscrição confirmada</span>}
      {estive && <span className="passe__agenda-carimbado" aria-label="Você esteve neste encontro">Carimbado</span>}
      <div className="passe__agenda-cabecalho">
        {edicao.capa_url && <img className="passe__agenda-capa" src={edicao.capa_url} alt={`Local: ${edicao.local}`} loading="lazy" />}
        <span className={`passe__agenda-status passe__agenda-status--${!proximo ? 'encerrado' : edicao.inscricoes_abertas ? 'aberto' : 'previsto'}`}>{!proximo ? 'Encerrado' : edicao.inscricoes_abertas ? 'Inscrições abertas' : 'Previsto'}</span>
      </div>
      <div className="passe__agenda-corpo">
        <time className="passe__data" dateTime={edicao.data_evento}>{longDate(edicao.data_evento)}</time>
        <h3>{edicao.titulo}</h3>
        <p className="passe__agenda-local"><MapPin size={14} aria-hidden="true" /><span>{[edicao.local, edicao.cidade].filter(Boolean).join(', ')}{edicao.horario ? ` · ${edicao.horario}` : ''}</span></p>
        <details className="passe__encontro">
          <summary aria-label={`Ver o encontro: ${edicao.titulo}`}>Ver o encontro<ChevronDown size={16} aria-hidden="true" /></summary>
          <div className="passe__encontro-resumo">
            <h4>{proximo ? 'Sobre o encontro' : 'Como foi o encontro'}</h4>
            {edicao.resumo?.trim() ? <TextoResumo texto={edicao.resumo} /> : <p className="passe__aviso">{carregando ? 'Carregando resumo…' : erro ? 'Não foi possível carregar o resumo. Tente atualizar a agenda.' : proximo ? 'A programação ainda não está disponível.' : 'O resumo ainda não está disponível.'}</p>}
            {fotos && <a className="passe__encontro-fotos" href={fotos} target="_blank" rel="noopener noreferrer"><Images size={16} aria-hidden="true" />Ver as fotos<ExternalLink size={13} aria-hidden="true" /></a>}
          </div>
        </details>
        {proximo && inscricao && <a className="passe__botao" href={inscricao}>Quero me inscrever</a>}
      </div>
    </article>
  );
}

function Edicoes({ espaco }: { espaco: Espaco }) {
  const [publicadas, setPublicadas] = useState<EncontroAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativa = true;
    async function carregarAgenda() {
      setCarregando(true); setErro(false);
      try {
        // Mesmo filtro público do site, sem ampliar acesso a edições privadas.
        const { data, error } = await supabase.from('editions').select(AGENDA_FIELDS).eq('publica', true).order('data_evento', { ascending: false });
        if (error) throw error;
        if (ativa) setPublicadas((data || []) as EncontroAgenda[]);
      } catch { if (ativa) setErro(true); }
      finally { if (ativa) setCarregando(false); }
    }
    void carregarAgenda();
    return () => { ativa = false; };
  }, [tentativa]);
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const { proximos, anteriores } = organizarAgenda(espaco, publicadas, hoje);
  const carimbados = new Set(espaco.carimbos.map((item) => item.slug));
  const [confirmadas, setConfirmadas] = useState<string[]>([]);
  useEffect(() => { void supabase.rpc('communicali_minhas_inscricoes').then(({ data }) => setConfirmadas((data as string[]) || [])); }, []);
  return (
    <>
      <header className="passe__agenda-titulo"><CalendarDays size={28} aria-hidden="true" /><h1>Edições</h1></header>
      <p className="passe__agenda-intro">Cada encontro é uma página do seu passaporte.<br /><strong>{carimbados.size} {carimbados.size === 1 ? 'carimbo' : 'carimbos'}</strong> até agora.</p>
      {carregando && <p className="passe__aviso" role="status">Atualizando a agenda…</p>}
      {erro && <div className="passe__agenda-erro" role="alert"><p>Não foi possível atualizar a agenda. Os encontros já carregados continuam disponíveis.</p><button type="button" className="passe__link" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></div>}
      <section className="passe__agenda-grupo" aria-labelledby="agenda-proximos">
        <h2 id="agenda-proximos">Sua próxima escala</h2>
        {proximos.map((edicao) => <EncontroCartao key={edicao.slug} edicao={edicao} proximo carregando={carregando} erro={erro} estive={carimbados.has(edicao.slug)} embarque={confirmadas.includes(edicao.slug)} />)}
        {!proximos.length && !carregando && !erro && <p className="passe__aviso">Nenhum próximo encontro anunciado.</p>}
      </section>
      <section className="passe__agenda-grupo" aria-labelledby="agenda-anteriores">
        <h2 id="agenda-anteriores">Encontros anteriores</h2>
        <div className="passe__rota passe__rota--agenda">{anteriores.map((edicao) => <EncontroCartao key={edicao.slug} edicao={edicao} proximo={false} carregando={carregando} erro={erro} estive={carimbados.has(edicao.slug)} />)}</div>
        {!anteriores.length && !carregando && !erro && <p className="passe__aviso">Os encontros realizados aparecerão aqui.</p>}
      </section>
    </>
  );
}

function contornoSelo(serrilhado: boolean) {
  const passos = serrilhado ? 72 : 180;
  return Array.from({ length: passos }, (_, indice) => {
    const angulo = indice * Math.PI * 2 / passos - Math.PI / 2;
    const raio = serrilhado ? (indice % 2 ? 53 : 57) : 55 + 2.5 * Math.cos(angulo * 14);
    return `${indice ? 'L' : 'M'}${(60 + raio * Math.cos(angulo)).toFixed(2)},${(60 + raio * Math.sin(angulo)).toFixed(2)}`;
  }).join(' ') + ' Z';
}

// Selo redondo de missão: cor e ícone próprios, diferente dos selos postais do programa.
const SELO_MISSAO: Record<string, { cor: string; Icone: typeof Users }> = {
  convidados: { cor: '#7A1F3D', Icone: UserPlus }, conexao: { cor: '#A9502E', Icone: Handshake }, lugar: { cor: '#5F6238', Icone: MapPin },
  palestra: { cor: '#C9973B', Icone: Mic }, parceiro: { cor: '#4A1424', Icone: Building2 }, representar: { cor: '#B83A62', Icone: Megaphone },
};
function SeloMissao({ slug, conquistado }: { slug: string; conquistado: boolean }) {
  const arco = useId();
  const legenda = (MISSAO_SELOS[slug] || ['', 'Missão'])[1];
  const { cor, Icone } = SELO_MISSAO[slug] || { cor: '#7A1F3D', Icone: Target };
  return (
    <svg className={`passe__selo-redondo${conquistado ? ' is-conquistado' : ''}`} viewBox="0 0 120 120" role="img" aria-label={`Selo ${legenda}: ${conquistado ? 'conquistado' : 'a conquistar'}`}>
      <circle cx="60" cy="60" r="58" fill="#F7F0EA" />
      <circle cx="60" cy="60" r="54" fill={cor} />
      <circle cx="60" cy="60" r="47" fill="none" stroke="#F7F0EA" strokeWidth="1" strokeDasharray="2.5 3" opacity=".75" />
      <defs><path id={arco} d="M 22 60 A 38 38 0 0 1 98 60" /></defs>
      <text fill="#F7F0EA" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="8.5" letterSpacing="2.4"><textPath href={`#${arco}`} startOffset="50%" textAnchor="middle">MISSÃO</textPath></text>
      <Icone x="44" y="40" width="32" height="32" color="#F7F0EA" strokeWidth={1.6} />
      <text x="60" y="88" textAnchor="middle" fill="#F7F0EA" fontFamily="'Funnel Display', Inter, sans-serif" fontWeight="700" fontSize="11">{legenda}</text>
      {conquistado && <g><circle cx="96" cy="24" r="13" fill="#DDB160" stroke="#F7F0EA" strokeWidth="2.5" /><path d="M90 24l4 4 8-8" fill="none" stroke="#22100F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></g>}
    </svg>
  );
}

function CartaoMissao({ missao, recarregar, liberada, comoMembro, abrirPrograma }: { missao: Missao; recarregar: () => void; liberada: boolean; comoMembro: boolean; abrirPrograma: () => void }) {
  const [abrindo, setAbrindo] = useState(false);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const situacao = comoMembro ? 'aberta' : missao.status;
  const feita = situacao === 'concluida';
  const bloqueada = !liberada && !feita;
  const status = feita ? 'Concluída' : bloqueada ? 'Bloqueada' : missao.modo === 'convite' ? 'Por convite' : situacao === 'aberta' ? 'Disponível' : SITUACAO[situacao] || situacao;
  const podeEnviar = !comoMembro && liberada && missao.modo === 'analise' && (situacao === 'aberta' || situacao === 'recusada');
  const formulario = FORMULARIOS[missao.slug] || [];

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const relato = formulario.filter((item) => campos[item.id]).map((item) => `${item.rotulo}: ${campos[item.id]}`).join(' · ');
    const { error } = await supabase.rpc('communicali_enviar_missao', { p_slug: missao.slug, p_relato: relato });
    if (error) setErro(errorMessage(error)); else recarregar();
  }

  return (
    <article className={`passe__missao${feita ? ' is-feita' : bloqueada ? ' is-bloqueada' : ''}`}>
      <div className="passe__missao-topo">
        <SeloMissao slug={missao.slug} conquistado={feita} />
        <div>
          <span className={`passe__missao-status${feita ? ' is-feita' : bloqueada ? ' is-bloqueada' : ''}`}>{feita ? <Check size={12} aria-hidden="true" /> : bloqueada ? <LockKeyhole size={12} aria-hidden="true" /> : null}{status}</span>
          <h2>{missao.titulo}</h2>
          <p>{missao.descricao}</p>
        </div>
      </div>
      {bloqueada && <div className="passe__missao-requisito"><p>Libera no nível Conector: 60 milhas, 4 encontros e 1 contribuição de conexão. A organização confirma a mudança de nível.</p><button type="button" className="passe__link" onClick={abrirPrograma}>Ver requisitos do programa</button></div>}
      {podeEnviar && !abrindo && <button type="button" className="passe__botao passe__botao--terra" onClick={() => setAbrindo(true)}>Enviar para análise</button>}
      {podeEnviar && abrindo && (
        <form className="passe__form" onSubmit={(event) => void enviar(event)}>
          {formulario.map((item) => (
            <label key={item.id}>{item.rotulo}
              {item.opcoes
                ? <select required={item.obrigatorio} value={campos[item.id] || ''} onChange={(event) => setCampos({ ...campos, [item.id]: event.target.value })}><option value="">Escolha</option>{item.opcoes.map((opcao) => <option key={opcao}>{opcao}</option>)}</select>
                : <input required={item.obrigatorio} type={item.tipo || 'text'} value={campos[item.id] || ''} onChange={(event) => setCampos({ ...campos, [item.id]: event.target.value })} />}
            </label>
          ))}
          {erro && <p className="passe__erro" role="alert">{erro}</p>}
          <button type="submit" className="passe__botao passe__botao--terra">Enviar</button>
        </form>
      )}
    </article>
  );
}

const GRUPOS_MISSAO: Array<[string, string[]]> = [['Para começar', ['livre', 'membro']], ['Rumo a Conector', ['conector']], ['Rumo a Embaixador', ['embaixador']]];

function Missoes({ espaco, recarregar, comoMembro, abrirPrograma }: { espaco: Espaco; recarregar: () => void; comoMembro: boolean; abrirPrograma: () => void }) {
  const [previa, setPrevia] = useState<'minhas' | 'membro' | 'conector'>('minhas');
  const podeSimular = espaco.membro!.categoria === 'fundadora';
  const simulando = comoMembro || (podeSimular && previa !== 'minhas');
  const categoria = comoMembro ? 'membro' : podeSimular && previa !== 'minhas' ? previa : espaco.membro!.categoria;
  const concluidas = simulando ? 0 : espaco.missoes.filter((missao) => missao.status === 'concluida').length;
  const liberada = (missao: Missao) => missao.nivel !== 'embaixador' || categoria === 'conector' || categoria === 'embaixador' || categoria === 'fundadora';
  return (
    <>
      <header className="passe__missoes-titulo"><Target size={28} aria-hidden="true" /><h1>Missões</h1></header>
      <p className="passe__missoes-intro">Cada missão cumprida vira um selo no seu passaporte e soma milhas na sua jornada.</p>
      <div className="passe__missoes-progresso" aria-label="Seu progresso nas missões">
        <strong>{concluidas}<span> de {espaco.missoes.length}</span></strong><small>selos de contribuição conquistados</small>
        <div className="passe__missoes-barra"><i style={{ width: `${espaco.missoes.length ? (concluidas / espaco.missoes.length) * 100 : 0}%` }} /></div>
      </div>
      {podeSimular && !comoMembro && <label className="passe__previa-missoes">Visualização<select value={previa} onChange={(event) => setPrevia(event.target.value as typeof previa)}><option value="minhas">Minhas missões</option><option value="membro">Prévia: Membro</option><option value="conector">Prévia: Conector</option></select></label>}
      <details className="passe__missoes-ajuda"><summary>Como as missões são liberadas</summary><p>As primeiras ficam disponíveis após o primeiro encontro. As de Embaixador abrem no nível Conector, confirmado pela organização.</p></details>
      {simulando && <p className="passe__previa-aviso" role="status">Prévia de {NIVEIS[categoria] || categoria}, com missões por cumprir. Suas conquistas estão preservadas e os envios ficam desativados nesta prévia.</p>}
      {GRUPOS_MISSAO.map(([titulo, niveis]) => {
        const lista = espaco.missoes.filter((missao) => niveis.includes(missao.nivel));
        return lista.length ? <section key={titulo} className="passe__missoes-grupo"><h2>{titulo}</h2>{lista.map((missao) => <CartaoMissao key={`${missao.slug}-${categoria}-${simulando}`} missao={missao} recarregar={recarregar} liberada={liberada(missao)} comoMembro={simulando} abrirPrograma={abrirPrograma} />)}</section> : null;
      })}
    </>
  );
}

function Indicar({ espaco, extra, recarregar }: { espaco: Espaco; extra: Extra | null; recarregar: () => void }) {
  const [pessoa, setPessoa] = useState({ nome: '', email: '', whatsapp: '', cargo: '' });
  const [frente, setFrente] = useState<'visitantes' | 'parceiro' | 'lugar'>('visitantes');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({ nome: '', instagram: '', linkedin: '', telefone: '', pessoa: '' });
  async function recomendar(event: FormEvent) {
    event.preventDefault();
    setErro(''); setAviso('');
    const { error } = await supabase.rpc('communicali_recomendar', { p_tipo: frente, p_nome: form.nome, p_instagram: form.instagram, p_linkedin: form.linkedin, p_telefone: form.telefone, p_pessoa: form.pessoa });
    if (error) { setErro(errorMessage(error)); return; }
    setForm({ nome: '', instagram: '', linkedin: '', telefone: '', pessoa: '' });
    setAviso('Recomendação enviada. As milhas entram depois da validação da organização.');
    recarregar();
  }

  async function indicar(event: FormEvent) {
    event.preventDefault();
    setErro(''); setAviso('');
    const { data, error } = await supabase.rpc('communicali_indicar_visitante', { p_nome: pessoa.nome, p_email: pessoa.email, p_whatsapp: pessoa.whatsapp, p_cargo: pessoa.cargo });
    if (error) { setErro(errorMessage(error)); return; }
    const corpo = JSON.stringify({ slug: (data as { slug: string }).slug, email: pessoa.email });
    void fetch('/api/email-confirmacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo });
    void fetch('/api/email-indicacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo });
    setPessoa({ nome: '', email: '', whatsapp: '', cargo: '' });
    setAviso('Indicação enviada. A pessoa recebe um e-mail e a equipe vai avaliar a inscrição.');
    recarregar();
  }

  const campo = (chave: keyof typeof form, rotulo: string, obrigatorio = false) => <label>{rotulo}<input required={obrigatorio} value={form[chave]} onChange={(event) => setForm({ ...form, [chave]: event.target.value })} /></label>;

  return (
    <>
      <header className="passe__rede-titulo"><Share2 size={28} aria-hidden="true" /><h1>Indicar</h1></header>
      <div className="passe__seg" role="group" aria-label="O que indicar">
        {([['visitantes', 'Visitantes'], ['parceiro', 'Parceiros'], ['lugar', 'Lugares']] as const).map(([id, nome]) => <button key={id} type="button" className={frente === id ? 'is-on' : ''} aria-pressed={frente === id} onClick={() => { setFrente(id); setErro(''); setAviso(''); }}>{nome}</button>)}
      </div>
      {aviso && <p className="passe__ok" role="status">{aviso}</p>}
      {erro && <p className="passe__erro" role="alert">{erro}</p>}
      {frente === 'visitantes' ? (
        <>
          <ConviteMembro nome={espaco.membro!.nome} codigoAtual={espaco.membro!.codigo} recarregar={recarregar} />
          <p><strong>A indicação só vale se a pessoa comparecer.</strong> A equipe avalia cada inscrição, e as 5 milhas entram depois do check-in. Quando ela for aprovada, você recebe as orientações para recebê-la no encontro.</p>
          <form className="passe__form passe__cartao" onSubmit={(event) => void indicar(event)}>
            <h2>Indicar uma pessoa</h2>
            <label>Nome completo<input required value={pessoa.nome} onChange={(event) => setPessoa({ ...pessoa, nome: event.target.value })} /></label>
            <label>E-mail<input required type="email" value={pessoa.email} onChange={(event) => setPessoa({ ...pessoa, email: event.target.value })} /></label>
            <label>WhatsApp<input required inputMode="tel" value={pessoa.whatsapp} onChange={(event) => setPessoa({ ...pessoa, whatsapp: event.target.value })} /></label>
            <label>Cargo<input value={pessoa.cargo} onChange={(event) => setPessoa({ ...pessoa, cargo: event.target.value })} /></label>
            <button type="submit" className="passe__botao">Enviar indicação</button>
          </form>
          <details className="passe__cartao passe__suspensa">
          <summary><h2>Minhas indicações</h2><span>{extra?.indicados.length || 0}</span></summary>
          <p className="passe__aviso">Acompanhe a avaliação da inscrição e a presença no encontro.</p>
          <div className="passe__rota">
          {[...(extra?.indicados || [])].sort((a, b) => b.data.localeCompare(a.data)).map((item, indice) => (
            <article className="passe__indicado" key={`${item.nome}-${indice}`}>
              <div><strong>{item.nome}</strong><span>{[item.cargo, item.empresa].filter(Boolean).join(', ') || 'Cargo não informado'}</span><span>{item.edicao} · {item.data.split('-').reverse().join('/')}</span></div>
              <em className={item.compareceu ? 'ok' : ''}>{item.compareceu ? 'Compareceu, +5' : { analise: 'Em análise', inscrito: 'Aprovada', espera: 'Lista de espera', cancelado: 'Não aprovada' }[item.status] || item.status}</em>
            </article>
          ))}
          </div>
          {!extra?.indicados.length && <p className="passe__aviso">Suas indicações aparecem aqui.</p>}
          </details>
        </>
      ) : (
        <>
          <p>{frente === 'lugar' ? 'Conhece um lugar bom para um encontro ou uma estrutura que ajude a comunidade? Conte para a organização.' : 'Conhece uma empresa ou pessoa que pode contribuir com um encontro? Conte para a organização.'}</p>
          <form className="passe__form passe__cartao" onSubmit={(event) => void recomendar(event)}>
            {campo('nome', frente === 'lugar' ? 'Nome do lugar' : 'Nome do parceiro', true)}
            {campo('instagram', 'Instagram')}
            {campo('linkedin', 'LinkedIn')}
            {campo('telefone', 'Telefone', true)}
            {campo('pessoa', 'Pessoa para validar', true)}
            <button type="submit" className="passe__botao passe__botao--oliva">Enviar recomendação</button>
          </form>
          {espaco.recomendacoes.filter((item) => item.tipo === frente).map((item, indice) => <div className="passe__linha" key={`${item.nome}-${indice}`}><span>{item.nome}</span><span>{item.status === 'validada' ? 'Validada, +10' : item.status === 'recusada' ? 'Não validada' : 'Em análise'}</span></div>)}
          <p className="passe__aviso">O guia com as regras de indicação entra aqui em breve.</p>
        </>
      )}
    </>
  );
}

function Programa({ espaco, extra, compartilhar, comoMembro, setComoMembro, verParabens }: { espaco: Espaco; extra: Extra | null; compartilhar: () => void; comoMembro: boolean; setComoMembro: (valor: boolean) => void; verParabens: () => void }) {
  const categoria = comoMembro ? 'membro' : espaco.membro!.categoria;
  const fundadora = espaco.membro!.categoria === 'fundadora';
  const extrato = extra?.extrato || [];
  return (
    <>
      <TrilhaPrograma categoria={categoria} previa={comoMembro} />
      <section className="passe__cartao">
        <h2>Minhas milhas</h2>
        <p className="passe__numero"><strong>{espaco.pontos}</strong> milhas no total</p>
        <div className="passe__resumo">
          {RESUMO.map(([id, nome, prefixos]) => {
            const itens = extrato.filter((item) => prefixos.split('|').some((prefixo) => item.acao.startsWith(prefixo)));
            return <div key={id}><strong>{itens.length}</strong><span>{nome}</span><em>+{itens.reduce((soma, item) => soma + item.pontos, 0)}</em></div>;
          })}
        </div>
        <button type="button" className="passe__botao passe__botao--linha" onClick={compartilhar}>Compartilhar meu selo</button>
      </section>
      <details className="passe__cartao passe__suspensa">
        <summary><h2>Meu histórico</h2><span>{extrato.length} {extrato.length === 1 ? 'registro' : 'registros'}</span></summary>
        <div className="passe__rota">
        {extrato.map((item, indice) => <div className="passe__ponto" key={`${item.acao}-${indice}`}><span><small>{item.data.split('-').reverse().join('/')}</small>{ROTULO(item.acao, item.titulo)}{item.motivo && item.motivo !== 'Demonstração' ? `: ${item.motivo}` : ''}</span><strong>+{item.pontos}</strong></div>)}
        </div>
        {!extrato.length && <p className="passe__aviso">Suas milhas aparecem aqui.</p>}
      </details>
      <RelatoImpacto />
      <section className="passe__cartao">
        <h2>Como ganhar milhas</h2>
        {PONTOS.map(([texto, valor]) => <div className="passe__ponto" key={texto}><span>{texto}</span><strong>+{valor}</strong></div>)}
      </section>
      {fundadora && (
        <section className="passe__cartao passe__cartao--fundadora">
          <h2>Visão da fundadora</h2>
          <p>Veja como as telas aparecem para outras pessoas. Vale para Rede, Missões e Programa.</p>
          <label className="passe__marca"><input type="checkbox" checked={comoMembro} onChange={(event) => setComoMembro(event.target.checked)} /><span><strong>Ver como Membro</strong>, com a Rede bloqueada e os níveis acima com cadeado.</span></label>
          <button type="button" className="passe__botao passe__botao--linha" onClick={verParabens}>Ver o parabéns de novo nível</button>
        </section>
      )}
      <a className="passe__botao passe__botao--linha" href="/admin/matches" hidden={!fundadora}>Abrir Matches no painel</a>
      <a className="passe__botao passe__botao--linha" href="/regras" target="_blank" rel="noopener noreferrer">Nossas regras</a>
    </>
  );
}

function RelatoImpacto() {
  const [tipo, setTipo] = useState('');
  const [comQuem, setComQuem] = useState('');
  const [relato, setRelato] = useState('');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  async function enviar(event: FormEvent) {
    event.preventDefault();
    setErro('');
    const { error } = await supabase.rpc('communicali_registrar_impacto', { p_tipo: tipo, p_com_quem: comQuem, p_relato: relato });
    if (error) { setErro(errorMessage(error)); return; }
    setTipo(''); setComQuem(''); setRelato(''); setAviso('Obrigada por contar. Isso ajuda a comunidade a crescer.');
  }
  return (
    <form className="passe__form passe__cartao" onSubmit={(event) => void enviar(event)}>
      <h2>A comunidade ajudou você?</h2>
      <p className="passe__aviso">Conte o que aconteceu: uma conexão, uma entrevista, um emprego ou uma parceria.</p>
      <label>O que aconteceu<select required value={tipo} onChange={(event) => setTipo(event.target.value)}><option value="">Escolha</option>{['Conheci pessoas', 'Consegui uma entrevista', 'Consegui um emprego', 'Fechei uma parceria', 'Conquistei um cliente', 'Aprendi algo novo', 'Outro'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Com quem<input value={comQuem} onChange={(event) => setComQuem(event.target.value)} /></label>
      <label>Conte em poucas palavras<input required minLength={10} value={relato} onChange={(event) => setRelato(event.target.value)} /></label>
      {aviso && <p className="passe__ok" role="status">{aviso}</p>}
      {erro && <p className="passe__erro" role="alert">{erro}</p>}
      <button type="submit" className="passe__botao passe__botao--linha">Enviar relato</button>
    </form>
  );
}

function Chips({ titulo, ajuda, opcoes, marcados, alternar }: { titulo: string; ajuda?: string; opcoes: string[]; marcados: string[]; alternar: (item: string) => void }) {
  const [outro, setOutro] = useState('');
  const adicionar = () => { const novo = outro.trim(); if (novo && !marcados.includes(novo)) alternar(novo); setOutro(''); };
  return (
    <section className="passe__cartao">
      <h2>{titulo}</h2>
      {ajuda && <p className="passe__aviso">{ajuda}</p>}
      <div className="passe__temas">{[...new Set([...opcoes, ...marcados])].map((item) => <button key={item} type="button" className={marcados.includes(item) ? 'is-on' : ''} aria-pressed={marcados.includes(item)} onClick={() => alternar(item)}>{item}</button>)}</div>
      <div className="passe__outro"><label>Outros<input value={outro} placeholder="Escreva aqui" onChange={(event) => setOutro(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); adicionar(); } }} /></label><button type="button" className="passe__botao passe__botao--linha" onClick={adicionar}>Adicionar</button></div>
    </section>
  );
}

function Perfil({ espaco, recarregar, voltar }: { espaco: Espaco; recarregar: () => void; voltar: () => void }) {
  const m = espaco.membro!;
  const [foto, setFoto] = useState(m.foto_url || '');
  const [temas, setTemas] = useState<string[]>(m.temas);
  const [interesses, setInteresses] = useState<string[]>([]);
  const [busca, setBusca] = useState<string[]>([]);
  const [segmento, setSegmento] = useState('');
  const [regiao, setRegiao] = useState('');
  const [palestras, setPalestras] = useState(m.interesse_palestras);
  const [linkedin, setLinkedin] = useState(m.linkedin || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [cidade, setCidade] = useState('');
  const [naRede, setNaRede] = useState(false);
  const [presta, setPresta] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [recrutador, setRecrutador] = useState(false);
  const [curriculo, setCurriculo] = useState('');

  useEffect(() => {
    supabase.rpc('communicali_meu_mercado').then(({ data }) => { const dados = data as { aberto_trabalho: boolean; recrutador: boolean; curriculo_path: string | null } | null; if (dados) { setAberto(dados.aberto_trabalho); setRecrutador(dados.recrutador); setCurriculo(dados.curriculo_path || ''); } });
    supabase.rpc('communicali_meus_contatos').then(({ data }) => {
      const dados = data as { whatsapp: string | null; instagram: string | null; cidade_uf: string | null; interesses: string[]; busca: string[]; segmento: string | null; regiao: string | null; na_rede: boolean; presta_servicos: boolean } | null;
      if (!dados) return;
      setWhatsapp(dados.whatsapp || ''); setInstagram(dados.instagram || ''); setCidade(dados.cidade_uf || ''); setInteresses(dados.interesses || []); setBusca(dados.busca || []); setSegmento(dados.segmento || ''); setRegiao(dados.regiao || ''); setNaRede(dados.na_rede); setPresta(dados.presta_servicos);
    });
  }, []);

  const alternar = (lista: string[], definir: (nova: string[]) => void) => (item: string) => definir(lista.includes(item) ? lista.filter((atual) => atual !== item) : [...lista, item]);

  async function enviarFoto(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    setBusy(true); setErro('');
    const { data } = await supabase.auth.getUser();
    const caminho = `membros/${data.user?.id}/${crypto.randomUUID()}.${arquivo.name.split('.').pop()?.toLowerCase() || 'jpg'}`;
    const { error } = await supabase.storage.from('site').upload(caminho, arquivo, { contentType: arquivo.type });
    if (error) setErro('Não foi possível enviar a foto. Use uma imagem JPG ou PNG menor.');
    else setFoto(supabase.storage.from('site').getPublicUrl(caminho).data.publicUrl);
    setBusy(false);
  }

  async function enviarCurriculo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    setBusy(true); setErro('');
    const { data } = await supabase.auth.getUser();
    const caminho = `${data.user?.id}/${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage.from('curriculos').upload(caminho, arquivo, { contentType: 'application/pdf' });
    if (error) setErro('Não foi possível enviar. Use um PDF de até 5 MB.'); else setCurriculo(caminho);
    setBusy(false);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setErro(''); setAviso('');
    await supabase.rpc('communicali_salvar_mercado', { p_aberto: aberto, p_recrutador: recrutador, p_curriculo: curriculo });
    const { error } = await supabase.rpc('communicali_salvar_perfil', { p_foto_url: foto, p_temas: temas, p_interesses: interesses, p_busca: busca, p_interesse: palestras, p_linkedin: linkedin, p_whatsapp: whatsapp, p_instagram: instagram, p_cidade_uf: cidade, p_segmento: segmento, p_regiao: regiao, p_na_rede: naRede, p_presta: presta });
    if (error) setErro(errorMessage(error)); else { setAviso('Perfil salvo.'); recarregar(); }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className="passe__link" onClick={voltar}>Voltar</button>
      <section className="passe__dados passe__cartao passe__dados--cartao">
        <div className="passe__foto">{foto ? <img src={foto} alt="Sua foto" /> : <span>Sem foto</span>}</div>
        <div><h1>Meu perfil</h1><label className="passe__link">Trocar foto<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void enviarFoto(event)} /></label></div>
      </section>
      <form className="passe__form" onSubmit={(event) => void salvar(event)}>
        <section className="passe__cartao">
          <h2>Onde me encontrar</h2>
          <label>WhatsApp<input inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} /></label>
          <label>E-mail<input value={m.email} readOnly /></label>
          <label>Instagram<input value={instagram} onChange={(event) => setInstagram(event.target.value)} /></label>
          <label>LinkedIn<input value={linkedin} onChange={(event) => setLinkedin(event.target.value)} /></label>
          <label>Cidade e estado<input value={cidade} onChange={(event) => setCidade(event.target.value)} /></label>
          <label>Região<select value={regiao} onChange={(event) => setRegiao(event.target.value)}><option value="">Escolha</option>{REGIOES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Segmento<select value={segmento} onChange={(event) => setSegmento(event.target.value)}><option value="">Escolha</option>{SEGMENTOS.map((item) => <option key={item}>{item}</option>)}</select></label>
        </section>
        <Chips titulo="O que eu faço" opcoes={ATUACAO} marcados={temas} alternar={alternar(temas, setTemas)} />
        <Chips titulo="O que estou buscando" ajuda="Usamos isso para sugerir conexões. Exemplo: treinamento de liderança, consultoria de RH." opcoes={ATUACAO} marcados={busca} alternar={alternar(busca, setBusca)} />
        <Chips titulo="Meus interesses" opcoes={INTERESSES_REDE} marcados={interesses} alternar={alternar(interesses, setInteresses)} />
        <section className="passe__cartao">
          <h2>Mercado de trabalho</h2>
          <label className="passe__marca passe__marca--rose"><input type="checkbox" checked={aberto} onChange={(event) => setAberto(event.target.checked)} /><span><strong>Estou disponível no mercado.</strong> Quem tem acesso à Rede vê essa etiqueta, e cruzamos com recrutadores da sua região.</span></label>
          <label className="passe__marca passe__marca--rose"><input type="checkbox" checked={recrutador} onChange={(event) => setRecrutador(event.target.checked)} /><span><strong>Recruto pessoas.</strong> Você pode receber sugestões de quem está disponível na sua região.</span></label>
          {aberto && <label>Currículo em PDF, até 5 MB<input type="file" accept="application/pdf" onChange={(event) => void enviarCurriculo(event)} /></label>}
          {curriculo && <p className="passe__aviso">Currículo enviado. Só você e a organização têm acesso.</p>}
        </section>
        <label className="passe__marca"><input type="checkbox" checked={naRede} onChange={(event) => setNaRede(event.target.checked)} /><span><strong>Aparecer na Rede.</strong> Membros veem sua foto, o que você faz e seus interesses. Seus contatos ficam visíveis só para Conectores, Embaixadores e organização. Desmarque para sair.</span></label>
        <label className="passe__marca passe__marca--oliva"><input type="checkbox" checked={presta} onChange={(event) => setPresta(event.target.checked)} /><span><strong>Ofereço serviços.</strong> Você também aparece em Parceiros e prestadores, se estiver na Rede.</span></label>
        <label className="passe__marca passe__marca--areia"><input type="checkbox" checked={palestras} onChange={(event) => setPalestras(event.target.checked)} /><span><strong>Quero contribuir com palestras.</strong> A organização vê seu perfil e faz o convite quando fizer sentido.</span></label>
        {aviso && <p className="passe__ok" role="status">{aviso}</p>}
        {erro && <p className="passe__erro" role="alert">{erro}</p>}
        <button type="submit" className="passe__botao" disabled={busy}>{busy ? 'Aguarde...' : 'Salvar perfil'}</button>
      </form>
      <button type="button" className="passe__link" onClick={() => void supabase.auth.signOut()}>Sair</button>
    </>
  );
}

function IconeContato({ tipo }: { tipo: 'whatsapp' | 'linkedin' | 'instagram' }) {
  if (tipo === 'instagram') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
  return tipo === 'linkedin'
    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 8.5H3V21h3.5V8.5ZM4.75 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM21 13.6c0-3.3-1.8-5.4-4.6-5.4-1.5 0-2.7.7-3.4 1.8V8.5H9.7V21h3.5v-6.6c0-1.9.9-3 2.4-3 1.4 0 2 .9 2 2.8V21H21v-7.4Z" /></svg>
    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1l-4.7 1.4Z" strokeLinejoin="round" /><path d="M9 8.8c.3 3 2.8 5.5 6 6.2l1-1.6-2-1-.9.7c-.8-.4-1.5-1.1-1.9-1.9l.7-.9-1-2-1.9 0Z" fill="currentColor" stroke="none" /></svg>;
}

// Indicar este perfil para outra pessoa da Rede, por exemplo para quem recruta e procura essa experiência.
function IndicarPerfil({ pessoa, outras }: { pessoa: Pessoa; outras: Pessoa[] }) {
  const [para, setPara] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const primeiro = pessoa.nome.split(' ')[0];
  async function enviar(event: FormEvent) {
    event.preventDefault(); setErro(''); setAviso('');
    const { error } = await supabase.rpc('communicali_indicar_perfil', { p_perfil: pessoa.id, p_para: para, p_mensagem: mensagem });
    if (error) { setErro(errorMessage(error)); return; }
    const nome = outras.find((item) => item.id === para)?.nome.split(' ')[0] || 'A pessoa';
    setPara(''); setMensagem(''); setAviso(`${nome} recebeu o perfil de ${primeiro} nos alertas e por e-mail.`);
    void fetch('/api/avisos', { method: 'POST' }).catch(() => null);
  }
  if (!outras.length) return null;
  return (
    <form className="passe__cartao passe__form passe__indicar-perfil" onSubmit={(event) => void enviar(event)}>
      <h2>Indicar {primeiro} para alguém</h2>
      <p>Conhece alguém que precisa dessa experiência? Envie o perfil e a pessoa recebe um alerta.</p>
      <label>Para quem<select required value={para} onChange={(event) => setPara(event.target.value)}><option value="">Escolha uma pessoa</option>{outras.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.recrutador ? ' · recruta' : ''}</option>)}</select></label>
      <label>Mensagem <em>opcional</em><textarea rows={2} maxLength={280} value={mensagem} placeholder={`Por que ${primeiro} pode ajudar`} onChange={(event) => setMensagem(event.target.value)} /></label>
      {erro && <p className="passe__erro" role="alert">{erro}</p>}
      {aviso && <p className="passe__ok" role="status">{aviso}</p>}
      <button type="submit" className="passe__botao">Enviar perfil</button>
    </form>
  );
}

function FichaPessoa({ pessoa, contatos, eu, voltar, recarregar, outras = [] }: { pessoa: Pessoa; contatos: boolean; eu: boolean; voltar: () => void; recarregar: () => void; outras?: Pessoa[] }) {
  const whatsapp = pessoa.whatsapp?.replace(/\D/g, '');
  const email = pessoa.email?.trim();
  const instagram = pessoa.instagram?.trim().replace(/^.*instagram\.com\//, '').replace(/^@/, '');
  const linkedin = pessoa.linkedin?.trim();
  const linkedinUrl = linkedin ? linkEncontro(/^https?:/.test(linkedin) ? linkedin : `https://${linkedin}`) : '';
  const temContato = !!(whatsapp || email || instagram || linkedinUrl);
  const [erro, setErro] = useState('');
  const primeiro = pessoa.nome.split(' ')[0];
  const conexao = pessoa.eu_conectei && pessoa.me_conectou ? 'Vocês estão conectados' : pessoa.eu_conectei ? 'Pedido de conexão enviado' : '';
  return (
    <>
      <button type="button" className="passe__link" onClick={voltar}>Voltar</button>
      <section className="passe__heroi passe__heroi--perfil" aria-label={`Perfil de ${pessoa.nome}`}>
        <div className="passe__heroi-foto"><FotoSelo url={pessoa.foto_url} nome={pessoa.nome} aberto={pessoa.aberto_trabalho} recruta={pessoa.recrutador} tamanho={116} /></div>
        <div className="passe__heroi-texto">
          <span className="passe__heroi-nivel">{NIVEIS[pessoa.categoria] || pessoa.categoria}</span>
          <h2>{pessoa.nome}</h2>
          {(pessoa.cargo || pessoa.empresa) && <p>{[pessoa.cargo, pessoa.empresa].filter(Boolean).join(' · ')}</p>}
          {(pessoa.cidade_uf || pessoa.regiao) && <p>{pessoa.cidade_uf || pessoa.regiao}</p>}
          {pessoa.segmento && <div className="passe__heroi-temas"><span>{pessoa.segmento}</span></div>}
        </div>
        <img className="passe__heroi-selo" src={`/selos/postal-${pessoa.categoria === 'organizador' ? 'fundadora' : pessoa.categoria}.png`} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
      </section>
      {!eu && (conexao
        ? <p className="passe__ok" role="status">{conexao}</p>
        : (
          <div className="passe__decisao">
            <button type="button" className="passe__botao" onClick={() => void conectar(pessoa.id).then(recarregar).catch((falha: Error) => setErro(falha.message))}>{pessoa.me_conectou ? 'Aceitar conexão' : `Conectar com ${primeiro}`}</button>
            {pessoa.me_conectou && <button type="button" className="passe__botao passe__botao--linha" onClick={() => void supabase.rpc('communicali_recusar_conexao', { p_de: pessoa.id }).then(() => { recarregar(); voltar(); })}>Recusar</button>}
          </div>
        ))}
      {erro && <p className="passe__erro" role="alert">{erro}</p>}
      {!!pessoa.temas.length && <section className="passe__cartao"><h2>O que faz</h2><div className="passe__temas">{pessoa.temas.map((item) => <span key={item} className="is-on">{item}</span>)}</div></section>}
      {!!pessoa.busca.length && <section className="passe__cartao"><h2>Está buscando</h2><div className="passe__temas">{pessoa.busca.map((item) => <span key={item}>{item}</span>)}</div></section>}
      {!!pessoa.interesses.length && <section className="passe__cartao"><h2>Interesses</h2><div className="passe__temas">{pessoa.interesses.map((item) => <span key={item}>{item}</span>)}</div></section>}
      <section className="passe__cartao">
        <h2>Onde encontrar</h2>
        {contatos && temContato ? <p>Continue a conversa pelos canais abaixo.</p> : null}
        {contatos ? (
          <div className="passe__contatos">
            {whatsapp && <a href={`https://wa.me/${whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp"><IconeContato tipo="whatsapp" /></a>}
            {email && <a href={`mailto:${email}`} aria-label="E-mail" title="E-mail"><Mail size={20} aria-hidden="true" /></a>}
            {instagram && <a href={`https://www.instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><IconeContato tipo="instagram" /></a>}
            {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><IconeContato tipo="linkedin" /></a>}
            {!temContato && <p>Nenhum canal de contato informado.</p>}
          </div>
        ) : <p>Quer falar com {primeiro}? Conecte-se aqui. Os contatos diretos abrem quando você chega a Conector.</p>}
      </section>
      {contatos && !eu && <IndicarPerfil pessoa={pessoa} outras={outras} />}
      {contatos && <FeedbackPerfil key={pessoa.id} membroId={pessoa.id} proprio={eu} nome={pessoa.nome} />}
    </>
  );
}

// Empresas parceiras e suas vantagens ficam abertas a todo Membro; a Rede de pessoas segue a partir de Conector.
function VitrineParceiros() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const perfis = usePerfisParceiros(true);
  useEffect(() => { void supabase.from('partners').select('id,nome,logo_url,site_url').eq('ativo', true).order('ordem').then(({ data }) => setParceiros((data || []) as Parceiro[])); }, []);
  if (!parceiros.length) return null;
  return (
    <>
      <header className="passe__rede-grupo"><h2>Empresas parceiras <span>{parceiros.length}</span></h2><p>Quem apoia os encontros. Quando houver cupom, é só usar.</p></header>
      <div className="passe__empresas">{parceiros.map((item) => <ParceiroRede key={item.id} parceiro={item} perfil={perfis.find((perfil) => perfil.partner_id === item.id)} />)}</div>
    </>
  );
}

function RedeBloqueada({ total, abrir }: { total: number; abrir: () => void }) {
  return (
    <>
      <header className="passe__rede-titulo"><Users size={28} aria-hidden="true" /><h1>Rede</h1></header>
      <section className="passe__bloqueio">
        <div className="passe__borrado" aria-hidden="true">{Array.from({ length: 6 }, (_, indice) => <div key={indice}><span /><i /><i /></div>)}</div>
        <div className="passe__bloqueio-texto">
          <svg className="passe__cadeado passe__cadeado--grande" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          <h2>A Rede abre em Conector</h2>
          <p>{total > 1 ? `${total} pessoas e parceiros` : 'Pessoas e parceiros'} esperam por você aqui. Continue somando milhas e cumprindo missões.</p>
          <button type="button" className="passe__botao" onClick={abrir}>Ver como chegar</button>
        </div>
      </section>
    </>
  );
}

function Rede({ comoMembro, abrir, fundadora = false }: { comoMembro: boolean; abrir: (aba: Aba) => void; fundadora?: boolean }) {
  const [rede, setRede] = useState<{ eu: string; acesso: boolean; total?: number; pessoas: Pessoa[]; parceiros: Parceiro[] } | null>(null);
  const [frente, setFrente] = useState<'pessoas' | 'parceiros'>('pessoas');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState({ segmento: '', regiao: '', nivel: '', mercado: '', conexao: '' });
  const [abertaId, setAbertaId] = useState('');
  const carregarRede = () => { supabase.rpc('communicali_rede').then(({ data }) => setRede(data as typeof rede)); };
  useEffect(carregarRede, []);
  const perfis = usePerfisParceiros(!!rede?.acesso && !comoMembro && frente === 'parceiros');
  if (rede && (!rede.acesso || comoMembro)) return <><RedeBloqueada total={rede.total ?? rede.pessoas.length} abrir={() => abrir('programa')} /><VitrineParceiros /></>;
  const aberta = rede?.pessoas.find((pessoa) => pessoa.id === abertaId);
  if (aberta) return <FichaPessoa pessoa={aberta} contatos eu={aberta.id === rede?.eu} voltar={() => setAbertaId('')} recarregar={carregarRede} outras={(rede?.pessoas || []).filter((item) => item.id !== aberta.id && item.id !== rede?.eu)} />;
  const termo = busca.trim().toLowerCase();
  const todas = rede?.pessoas || [];
  const valores = (chave: 'segmento' | 'regiao') => [...new Set(todas.map((pessoa) => pessoa[chave]).filter(Boolean))] as string[];
  const confere = (pessoa: Pessoa) => (!filtro.conexao || (pessoa.eu_conectei && pessoa.me_conectou)) && (!filtro.segmento || pessoa.segmento === filtro.segmento) && (!filtro.regiao || pessoa.regiao === filtro.regiao) && (!filtro.nivel || pessoa.categoria === filtro.nivel) && (!filtro.mercado || (filtro.mercado === 'aberto' ? pessoa.aberto_trabalho : pessoa.recrutador))
    && (!termo || [pessoa.nome, pessoa.cidade_uf, pessoa.empresa, ...pessoa.temas, ...pessoa.interesses].join(' ').toLowerCase().includes(termo));
  const pessoas = todas.filter((pessoa) => confere(pessoa) && (frente === 'pessoas' || pessoa.presta_servicos));
  const parceiros = (rede?.parceiros || []).filter((item) => !termo || [item.nome, perfis.find((perfil) => perfil.partner_id === item.id)?.descricao || ''].join(' ').toLowerCase().includes(termo));
  return (
    <>
      <header className="passe__rede-titulo"><Users size={28} aria-hidden="true" /><h1>Rede</h1></header>
      <p>Conheça quem faz parte e crie conexões.</p>
      <div className="passe__seg passe__seg--dois passe__rede-abas" role="group" aria-label="Quem ver">
        <button type="button" className={frente === 'pessoas' ? 'is-on' : ''} aria-pressed={frente === 'pessoas'} onClick={() => setFrente('pessoas')}>Pessoas</button>
        <button type="button" className={frente === 'parceiros' ? 'is-on' : ''} aria-pressed={frente === 'parceiros'} onClick={() => setFrente('parceiros')}>Parceiros e prestadores</button>
      </div>
      <div className="passe__form passe__filtros">
        <label>Buscar<input value={busca} placeholder="Nome, cidade ou tema" onChange={(event) => setBusca(event.target.value)} /></label>
        <label>Mostrar<select value={filtro.conexao} onChange={(event) => setFiltro({ ...filtro, conexao: event.target.value })}><option value="">Toda a Rede</option><option value="minhas">Minhas conexões</option></select></label>
        <label>Segmento<select value={filtro.segmento} onChange={(event) => setFiltro({ ...filtro, segmento: event.target.value })}><option value="">Todos</option>{valores('segmento').map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Região<select value={filtro.regiao} onChange={(event) => setFiltro({ ...filtro, regiao: event.target.value })}><option value="">Todas</option>{valores('regiao').map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Nível<select value={filtro.nivel} onChange={(event) => setFiltro({ ...filtro, nivel: event.target.value })}><option value="">Todos</option>{['embaixador', 'conector', 'membro'].map((item) => <option key={item} value={item}>{NIVEIS[item]}</option>)}</select></label>
        <label>Mercado<select value={filtro.mercado} onChange={(event) => setFiltro({ ...filtro, mercado: event.target.value })}><option value="">Todos</option><option value="aberto">Disponíveis</option><option value="recruta">Recrutadores</option></select></label>
      </div>
      {frente === 'parceiros' && <>
        {fundadora && <ParceirosExemplos />}
        <header className="passe__rede-grupo"><h2>Empresas parceiras <span>{parceiros.length}</span></h2><p>Quem apoia os encontros da comunidade.</p></header>
        <div className="passe__empresas">{parceiros.map((item) => <ParceiroRede key={item.id} parceiro={item} perfil={perfis.find((perfil) => perfil.partner_id === item.id)} />)}</div>
        {rede && !parceiros.length && <p className="passe__aviso">Nenhuma empresa encontrada.</p>}
        <header className="passe__rede-grupo"><h2>Prestadores da comunidade <span>{pessoas.length}</span></h2><p>Membros que oferecem serviços. Segmento, região, nível e mercado filtram este grupo.</p></header>
      </>}
      <div className="passe__pessoas">
        {pessoas.map((pessoa) => (
          <button type="button" className="passe__pessoa" key={pessoa.id} onClick={() => { setAbertaId(pessoa.id); window.scrollTo(0, 0); }}>
            <span className="passe__pessoa-topo"><FotoSelo url={pessoa.foto_url} nome={pessoa.nome} aberto={pessoa.aberto_trabalho} recruta={pessoa.recrutador} tamanho={92} /></span>
            <strong>{pessoa.nome}</strong>
            {pessoa.segmento && <span className="passe__pessoa-segmento">{pessoa.segmento}</span>}
            <span className="passe__pessoa-linha">{NIVEIS[pessoa.categoria] || pessoa.categoria}{pessoa.regiao ? ` · ${pessoa.regiao}` : ''}</span>
          </button>
        ))}
      </div>
      {rede && !pessoas.length && <p className="passe__aviso">{frente === 'parceiros' ? 'Nenhum prestador encontrado com esses filtros.' : 'Ninguém encontrado com esses filtros.'}</p>}
    </>
  );
}

export function MeuEspaco() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [espaco, setEspaco] = useState<Espaco | null>(null);
  const [aba, setAba] = useState<Aba>('inicio');
  const [extra, setExtra] = useState<Extra | null>(null);
  const [cartao, setCartao] = useState<{ categoria: string; novo: boolean } | null>(null);
  const [comoMembro, setComoMembro] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState<Pessoa | null>(null);

  useEffect(() => {
    const anterior = document.documentElement.style.background;
    document.documentElement.style.background = '#F7F0EA';
    document.documentElement.classList.add('passe-html');
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { data.subscription.unsubscribe(); document.documentElement.style.background = anterior; document.documentElement.classList.remove('passe-html'); };
  }, []);

  const carregar = () => {
    void supabase.rpc('communicali_meu_espaco').then(({ data }) => setEspaco(data as Espaco));
    void supabase.rpc('communicali_meu_extra').then(({ data }) => {
      const dados = data as Extra | null;
      setExtra(dados);
      if (dados?.nivel_novo) { setCartao({ categoria: dados.nivel_novo, novo: true }); void supabase.rpc('communicali_nivel_visto'); }
    });
  };
  const verPerfil = (id: string) => { void supabase.rpc('communicali_perfil', { p_id: id }).then(({ data }) => { setPerfilAberto(data as Pessoa); window.scrollTo(0, 0); }); };
  useEffect(() => { if (session) carregar(); else setEspaco(null); }, [session?.user.id]);

  if (session === undefined) return <div className="passe" aria-busy="true" />;
  if (!session) return <Entrar />;
  if (!espaco) return <div className="passe" aria-busy="true" />;
  if (!espaco.membro) return (
    <Pagina>
      <img className="passe__logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" />
      <h1>Seu passaporte abre no primeiro encontro</h1>
      <p>Quem participa de um encontro presencial se torna membro. Depois do check-in, este espaço libera seus carimbos, milhas e missões.</p>
      <a className="passe__botao" href="/#proximo">Ver o próximo encontro</a>
      <button type="button" className="passe__link" onClick={() => void supabase.auth.signOut()}>Sair</button>
    </Pagina>
  );

  return (
    <Pagina aba={aba} setAba={(nova) => { setPerfilAberto(null); setAba(nova); }}>
      {perfilAberto ? <FichaPessoa pessoa={perfilAberto} contatos={Boolean(perfilAberto.whatsapp || perfilAberto.email)} eu={false} voltar={() => setPerfilAberto(null)} recarregar={() => { carregar(); verPerfil(perfilAberto.id); }} /> : <>
      {aba === 'inicio' && <Inicio espaco={espaco} extra={extra} abrir={setAba} atualizar={carregar} verPerfil={verPerfil} compartilhar={() => setCartao({ categoria: espaco.membro!.categoria, novo: false })} />}
      {aba === 'edicoes' && <Edicoes espaco={espaco} />}
      {aba === 'missoes' && <Missoes espaco={espaco} recarregar={carregar} comoMembro={comoMembro} abrirPrograma={() => setAba('programa')} />}
      {aba === 'rede' && <Rede comoMembro={comoMembro} abrir={setAba} fundadora={espaco.membro!.categoria === 'fundadora'} />}
      {aba === 'indicar' && <Indicar espaco={espaco} extra={extra} recarregar={carregar} />}
      {aba === 'programa' && <Programa espaco={espaco} extra={extra} compartilhar={() => setCartao({ categoria: espaco.membro!.categoria, novo: false })} comoMembro={comoMembro} setComoMembro={setComoMembro} verParabens={() => setCartao({ categoria: 'conector', novo: true })} />}
      {aba === 'perfil' && <Perfil espaco={espaco} recarregar={carregar} voltar={() => setAba('inicio')} />}
      </>}
      {cartao && <JanelaCartao nome={espaco.membro.nome} nivel={NIVEIS[cartao.categoria] || cartao.categoria} categoria={cartao.categoria} foto={espaco.membro.foto_url} novo={cartao.novo} fechar={() => setCartao(null)} />}
    </Pagina>
  );
}
