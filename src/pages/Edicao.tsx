import { HnFooter } from '../components/HnFooter';
import { GaleriaDoEncontro } from '../components/GaleriaDoEncontro';
import { AlbumAcessoVisual, type EstadoAlbum } from '../components/AlbumAcessoVisual';
import { Compartilhar } from '../components/Compartilhar';
import '../home-nova.css';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { COMMUNITY_URL, errorMessage, formatDate, supabase } from '../lib';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import { SiteFooter, Instagram } from '../components/SiteFooter';
import { useSiteTexts } from './MemberFields';

export type EditionRow = { id: string; slug: string; numero: number | null; titulo: string; data_evento: string; horario: string; local: string; cidade: string; endereco: string | null; capa_url: string | null; resumo: string | null; fotos_url: string | null; inscricao_url: string | null; inscricoes_abertas: boolean; form_inscricao?: string | null ; valor_texto?: string | null};
export const EDITION_FIELDS = 'id,slug,numero,titulo,data_evento,horario,local,cidade,endereco,capa_url,resumo,fotos_url,inscricao_url,inscricoes_abertas,form_inscricao,valor_texto';

export const longDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
// Um link só por edição: o formulário de inscrição dela. A página /inscricao fica para quem chega pelo convite de um membro.
export const signupHref = (edition: EditionRow) => edition.inscricao_url || (edition.inscricoes_abertas ? (edition.form_inscricao ? `/f/${edition.form_inscricao}` : `/inscricao/${edition.slug}`) : '');

const Linkedin = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 8.5H3V21h3.5V8.5ZM4.75 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM21 13.6c0-3.3-1.8-5.4-4.6-5.4-1.5 0-2.7.7-3.4 1.8V8.5H9.7V21h3.5v-6.6c0-1.9.9-3 2.4-3 1.4 0 2 .9 2 2.8V21H21v-7.4Z" /></svg>
);
const Whatsapp = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1l-4.7 1.4Z" strokeLinejoin="round" /><path d="M9 8.8c.3 3 2.8 5.5 6 6.2l1-1.6-2-1-.9.7c-.8-.4-1.5-1.1-1.9-1.9l.7-.9-1-2-1.9 0Z" fill="currentColor" stroke="none" /></svg>
);

/** Compartilha só a edição: o link /e/slug traz foto, título e data daquele encontro. */
export function Share({ edition }: { edition: EditionRow }) {
  const [copied, setCopied] = useState(false);
  const url = `https://comuni.calirh.com/e/${edition.slug}`;
  const text = `${edition.titulo} | ComuniCALI: ${url}`;
  const copy = () => navigator.clipboard.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); });
  return (
    <div className="share">
      <span>Compartilhar este encontro</span>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no WhatsApp"><Whatsapp size={16} /></a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn"><Linkedin size={16} /></a>
      <button type="button" aria-label="Copiar link para o Instagram" title="Copia o link e abre o Instagram" onClick={() => { void copy(); window.open('https://www.instagram.com/', '_blank', 'noopener'); }}><Instagram size={16} /></button>
      <button type="button" aria-label="Copiar o link" onClick={() => void copy()}><Link2 size={16} /></button>
      {copied && <em>Link copiado</em>}
    </div>
  );
}

export function EditionCard({ edition, badge }: { edition: EditionRow; badge: string }) {
  const href = signupHref(edition);
  return (
    <article className="event" id={edition.slug}>
      <div className="event__cover">
        {edition.capa_url ? <img src={edition.capa_url} alt={`Foto do local: ${edition.local}`} /> : <img className="event__logo" src="/brand/communicali-branco.png" alt="" />}
        <span className="event__badge">{badge}</span>
      </div>
      <div className="event__body">
        <p className="event__date">{longDate(edition.data_evento)} · {edition.cidade}</p>
        <h3>{edition.titulo}</h3>
        <dl>
          <div><dt>Horário</dt><dd>{edition.horario}</dd></div>
          <div><dt>Local</dt><dd>{edition.local}</dd></div>
          <div className="wide"><dt>Endereço</dt><dd>{[edition.endereco, edition.cidade].filter(Boolean).join(', ')}</dd></div>
        </dl>
        {href
          ? <a className="pill" href={href}>Quero me inscrever</a>
          : <p className="muted">Inscrições desta edição encerradas. Entre no <a className="link" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">grupo da comunidade</a> para saber da próxima.</p>}
        <Share edition={edition} />
      </div>
    </article>
  );
}

function useEdition(slug: string) {
  const [edition, setEdition] = useState<EditionRow | null | undefined>(undefined);
  useEffect(() => {
    supabase.from('editions').select(EDITION_FIELDS).eq('slug', slug).eq('publica', true).maybeSingle().then(({ data }) => setEdition(data as EditionRow | null));
  }, [slug]);
  return edition;
}

type FotoEdicao = { id: string; url: string; legenda: string | null };


/** Satisfação da edição (NPS). Só aparece quando houver dados reais da pesquisa. */
export function Nps({ nota, respostas, promotores, neutros, detratores, exemplo }: { nota: number; respostas: number; promotores: number; neutros: number; detratores: number; exemplo?: boolean }) {
  return (
    <section className="hn-ed__bloco hn-nps">
      <h2>Satisfação da edição</h2>
      <div className="hn-nps__corpo">
        <div className="hn-nps__nota"><strong>{nota}</strong><span>NPS{exemplo ? ' (exemplo)' : ''}</span></div>
        <div className="hn-nps__barra" role="img" aria-label={`${promotores}% promotores, ${neutros}% neutros, ${detratores}% detratores`}>
          <span style={{ flex: promotores, background: '#5A1E2D' }} /><span style={{ flex: neutros, background: '#C9C2C6' }} /><span style={{ flex: detratores, background: '#1B0A10' }} />
        </div>
        <ul className="hn-nps__leg"><li><i style={{ background: '#5A1E2D' }} />{promotores}% promotores</li><li><i style={{ background: '#C9C2C6' }} />{neutros}% neutros</li><li><i style={{ background: '#1B0A10' }} />{detratores}% detratores</li></ul>
        <p className="hn-ed__lead">Com base em {respostas} respostas da pesquisa de satisfação.</p>
      </div>
    </section>
  );
}

type ComentarioPublico = { id: string; nome: string | null; texto: string; created_at: string };

/** Comentários da edição encerrada: qualquer pessoa comenta, com nome ou anônimo; só aparece depois de aprovado. */
function Comentarios({ slug }: { slug: string }) {
  const [lista, setLista] = useState<ComentarioPublico[]>([]);
  const [texto, setTexto] = useState('');
  const [nome, setNome] = useState('');
  const [anonimo, setAnonimo] = useState(true);
  const [armadilha, setArmadilha] = useState('');
  const [estado, setEstado] = useState<'' | 'enviando' | 'enviado'>('');
  const [erro, setErro] = useState('');
  useEffect(() => {
    supabase.rpc('communicali_comentarios', { p_slug: slug }).then(({ data, error }) => { if (!error) setLista((data || []) as ComentarioPublico[]); });
  }, [slug]);
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(''); setEstado('enviando');
    const { error } = await supabase.rpc('communicali_comentar', { p_slug: slug, p_texto: texto, p_nome: nome, p_anonimo: anonimo, p_site: armadilha });
    if (error) { setEstado(''); setErro(/não recebe|precisa ter|muitos/i.test(error.message) ? error.message : 'Não foi possível enviar agora. Tente de novo em instantes.'); return; }
    setEstado('enviado'); setTexto(''); setNome('');
  }
  return (
    <section className="hn-ed__bloco hn-coment" aria-label="Comentários">
      <h2>Comentários</h2>
      {lista.length > 0
        ? <ul className="hn-coment__lista">{lista.map((c) => <li key={c.id}><p>{c.texto}</p><small>{c.nome || 'Anônimo'} · {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(c.created_at))}</small></li>)}</ul>
        : <p className="hn-ed__lead">Seja a primeira pessoa a comentar sobre este encontro.</p>}
      {estado === 'enviado'
        ? <p className="hn-coment__ok" role="status">Obrigada! Seu comentário aparece aqui depois de aprovado.</p>
        : (
          <form className="hn-coment__form" onSubmit={(e) => void enviar(e)}>
            <label>Seu comentário<textarea required minLength={3} maxLength={600} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
            <fieldset>
              <legend>Como quer aparecer?</legend>
              <label className="hn-coment__op"><input type="radio" name="aparecer" checked={anonimo} onChange={() => setAnonimo(true)} /> Anônimo</label>
              <label className="hn-coment__op"><input type="radio" name="aparecer" checked={!anonimo} onChange={() => setAnonimo(false)} /> Mostrar meu nome</label>
            </fieldset>
            {!anonimo && <label>Seu nome<input required maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" /></label>}
            <input className="hn-coment__armadilha" tabIndex={-1} autoComplete="off" aria-hidden="true" value={armadilha} onChange={(e) => setArmadilha(e.target.value)} name="site" />
            {erro && <p className="hn-coment__erro" role="alert">{erro}</p>}
            <button className="hn-pill" type="submit" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando...' : 'Enviar comentário'}</button>
            <small className="hn-coment__aviso">Todo comentário passa por aprovação antes de aparecer.</small>
          </form>
        )}
    </section>
  );
}

export function EdicaoPage() {
  const { slug = '' } = useParams();
  const edition = useEdition(slug);
  const [fotosBanco, setFotos] = useState<FotoEdicao[]>([]);
  const [demoAlbum, setDemoAlbum] = useState<EstadoAlbum>('entrar');
  const [demoEmail, setDemoEmail] = useState('');
  const fotos = fotosBanco;
  useEffect(() => {
    if (!edition?.id) return;
    supabase.from('edition_photos').select('id,url,legenda').eq('edition_id', edition.id).order('ordem').then(({ data }) => setFotos((data || []) as FotoEdicao[]));
  }, [edition?.id]);
  const past = edition ? edition.data_evento < new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) : false;
  const inscricao = edition ? signupHref(edition) : '';
  const mapa = edition ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([edition.local, edition.endereco, edition.cidade].filter(Boolean).join(', '))}` : '';
  return (
    <div className="hn hn-ed">
      <nav className="hn-ed__nav" aria-label="Principal">
        <a href="/" className="hn-nav__logo"><img src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" /></a>
        <a className="hn-nav__membro" href="/#agenda">Voltar à agenda</a>
      </nav>
      <main>
        {edition === null && <section className="hn-ed__bloco"><h1>Encontro não encontrado.</h1><p className="hn-ed__lead">Veja a agenda para encontrar a edição que você procura.</p><a className="hn-pill" href="/#agenda">Ver a agenda</a></section>}
        {edition && (
          <>
            <header className="hn-ed__hero">
              <p className="hn-eyebrow">{past ? 'EDIÇÃO ENCERRADA' : 'PRÓXIMO ENCONTRO'}</p>
              <h1>{edition.titulo}</h1>
              <p className="hn-ed__lead">{longDate(edition.data_evento)} · {edition.horario} · {edition.cidade}</p>
              <div className="hn-ed__foto" role="img" aria-label={`Local do encontro: ${edition.local}`} style={{ backgroundImage: `url(${edition.capa_url || '/fotos/legacy-coffee.jpg'})` }}><span className="hn-detail__tag">{past ? 'Realizado' : 'Encontro aberto'}</span></div>
            </header>
            <section className="hn-ed__grid">
              <dl className="hn-ed__dl">
                <div><dt>Quando</dt><dd>{longDate(edition.data_evento)}, {edition.horario}</dd></div>
                <div><dt>Onde</dt><dd><a className="hn-detail__local" href={mapa} target="_blank" rel="noopener noreferrer">{edition.local}, {edition.cidade}</a></dd></div>
                {edition.endereco && <div><dt>Endereço</dt><dd><a className="hn-detail__local" href={mapa} target="_blank" rel="noopener noreferrer">{edition.endereco}</a></dd></div>}
                {(edition.valor_texto || !past) && <div><dt>Valor</dt><dd>{edition.valor_texto || 'Informado com a edição'}</dd></div>}
              </dl>
              <div className="hn-ed__texto">
                <h2>{past ? 'Como foi' : 'Sobre este encontro'}</h2>
                <p>{edition.resumo || (past ? 'O resumo desta edição será publicado aqui.' : 'Os detalhes desta edição saem em breve.')}</p>
                {!past && (inscricao ? <a className="hn-pill" href={inscricao}>Garantir minha vaga</a> : <a className="hn-pill" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>)}
              </div>
            </section>
            {past && new URLSearchParams(window.location.search).has('moldura') && (
              <GaleriaDoEncontro fotos={fotos} titulo={edition.titulo} rotulo={edition.numero ? `${edition.numero}ª Edição` : edition.titulo} completa={demoAlbum === 'confirmado'} acesso={<>
                <AlbumAcessoVisual estado={demoAlbum} email={demoEmail} setEmail={setDemoEmail} aoEntrar={() => setDemoAlbum(demoEmail.toLowerCase().includes('erro') ? 'nao-encontrado' : 'termo')} aoTrocar={() => { setDemoAlbum('entrar'); setDemoEmail(''); }} aoAbrir={() => undefined} aoAceitar={() => setDemoAlbum('confirmado')} />
                <div className="gal__demo">Ver como fica:
                  {([['entrar', 'Antes de entrar'], ['termo', 'Primeiro acesso: termo'], ['confirmado', 'Já aceitou: abrir o álbum'], ['nao-encontrado', 'E-mail não encontrado'], ['preparando', 'Álbum em preparo']] as const).map(([id, nome]) => <button key={id} type="button" aria-pressed={demoAlbum === id} onClick={() => setDemoAlbum(id)}>{nome}</button>)}
                </div>
              </>} />
            )}
            {past && !new URLSearchParams(window.location.search).has('moldura') && (
              <section className="hn-ed__bloco">
                <h2>Fotos do encontro</h2>
                {fotos.length > 0 && <div className="hn-ed__galeria">{fotos.map((foto) => <img key={foto.id} src={foto.url} alt={foto.legenda || `Foto do encontro ${edition.titulo}`} loading="lazy" />)}</div>}
                {edition.fotos_url
                  ? <><p className="hn-ed__lead">Acesse o álbum para ver todas as fotos e baixar as suas.</p><a className="hn-pill" href={edition.fotos_url} target="_blank" rel="noopener noreferrer">Ver e baixar as fotos</a></>
                  : fotos.length === 0 && <p className="hn-ed__lead">As fotos desta edição serão publicadas aqui.</p>}
              </section>
            )}
            {past && <Comentarios slug={edition.slug} />}
            <section className="hn-ed__bloco hn-ed__acoes">
              <a className="hn-pill hn-pill--line-ink" href="/#agenda">Voltar à agenda</a>
              <Compartilhar slug={edition.slug} titulo={edition.titulo} />
            </section>
          </>
        )}
      </main>
      <HnFooter />
    </div>
  );
}

/** Link de convite do membro: leva à inscrição do próximo encontro com o código guardado. */
export function CodigoConvite() {
  const { codigo = '' } = useParams();
  const [invalido, setInvalido] = useState(false);
  useEffect(() => {
    supabase.rpc('communicali_codigo', { p_codigo: codigo }).then(({ data }) => {
      const convite = data as { slug: string | null } | null;
      if (convite?.slug) window.location.replace(`/inscricao/${convite.slug}?c=${encodeURIComponent(codigo)}`);
      else setInvalido(true);
    });
  }, [codigo]);
  if (!invalido) return <main className="event-page" aria-busy="true" />;
  return (
    <>
      <main className="event-page"><section className="event-card"><p className="eyebrow">ComuniCALI</p><h1>Sem inscrições abertas agora</h1><p className="notice">Este convite não encontrou um encontro aberto. Veja a agenda no site ou entre no <a className="link" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">grupo da comunidade</a>.</p></section></main>
      <SiteFooter />
    </>
  );
}

export function InscricaoPage() {
  const { slug = '' } = useParams();
  const [edition, setEdition] = useState<EditionRow | null | undefined>(undefined);
  useEffect(() => { supabase.rpc('communicali_edicao_inscricao', { p_slug: slug }).then(({ data }) => setEdition((data as EditionRow | null) || null)); }, [slug]);
  const texts = useSiteTexts();
  const [params] = useSearchParams();
  const codigo = params.get('c') || '';
  const faltouRef = useRef('');
  const preset = useMemo<FormPreset | null>(() => edition?.inscricoes_abertas && texts ? {
    title: edition.titulo,
    category: 'Inscrição ComuniCALI',
    description: `${longDate(edition.data_evento)}, ${edition.horario}, ${edition.local}, ${edition.cidade}.`,
    submitLabel: 'Enviar inscrição',
    successText: 'Recebemos sua intenção de participar! A equipe vai analisar e você recebe a confirmação por e-mail.',
    successTextFor: () => (faltouRef.current ? `Recebemos sua intenção de participar!\nPoxa, que pena que você não conseguiu ir na ${faltouRef.current}. Vamos ver se agora dá certo? A equipe vai analisar e você recebe a confirmação por e-mail.` : ''),
    questions: [
      { id: 'nome', kind: 'name', label: 'Qual é o seu nome completo?', required: true },
      { id: 'email', kind: 'email', label: 'Qual é o seu e-mail?', required: true },
      { id: 'whatsapp', kind: 'phone', label: 'Qual é o seu WhatsApp com DDD?', required: true },
      { id: 'cidade', kind: 'short_text', label: 'Em qual cidade e estado você mora?', required: true },
      { id: 'empresa', kind: 'short_text', label: 'Empresa ou organização' },
      { id: 'cargo', kind: 'short_text', label: 'Cargo ou área de atuação' },
      { id: 'privacidade', kind: 'single_choice', label: 'Política de privacidade', help: 'Leia a [política de privacidade](https://comuni.calirh.com/privacidade).', options: ['Li e aceito'], required: true },
    ],
    submit: async (answers) => {
      const value = (key: string) => String(answers[key] ?? '');
      const { error } = await supabase.rpc('communicali_inscrever', { p_slug: slug, p_nome: value('nome'), p_email: value('email'), p_whatsapp: value('whatsapp'), p_cidade: value('cidade'), p_empresa: value('empresa'), p_cargo: value('cargo'), p_privacidade: answers.privacidade === 'Li e aceito' });
      if (error) return errorMessage(error);
      { const { data: antes } = await supabase.rpc('communicali_faltou_antes', { p_slug: slug, p_email: value('email') }); faltouRef.current = (antes as { faltou?: boolean; edicao?: string } | null)?.faltou ? String(antes?.edicao || '') : ''; }
      if (codigo) await supabase.rpc('communicali_vincular_indicacao', { p_slug: slug, p_email: value('email'), p_codigo: codigo });
      if (codigo) void fetch('/api/email-indicacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, email: value('email') }) });
      void fetch('/api/email-confirmacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, email: value('email') }) });
      return '';
    },
  } : null, [edition, texts, slug, codigo]);

  if (preset) return <PublicFormPage preset={preset} />;
  // Só decide que está encerrado depois de ter a edição e os textos; antes disso, mantém a tela limpa.
  if (edition === undefined || (edition?.inscricoes_abertas && !texts)) return <main className="event-page" aria-busy="true" />;
  return (
    <>
      <main className="event-page">
        <section className="event-card">
          <p className="eyebrow">ComuniCALI</p>
          <h1>{edition?.titulo || 'Inscrição'}</h1>
          {edition && <p className="event-card__meta">{formatDate(edition.data_evento)} · {edition.local}</p>}
          <p className="notice">As inscrições desta edição estão encerradas. No dia do encontro, quem for participar faz o check-in pelo QR Code do telão.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
