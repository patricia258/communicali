import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { COMMUNITY_URL, errorMessage, formatDate, supabase } from '../lib';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import { SiteFooter, Instagram } from '../components/SiteFooter';
import { useSiteTexts } from './MemberFields';

export type EditionRow = { id: string; slug: string; numero: number | null; titulo: string; data_evento: string; horario: string; local: string; cidade: string; endereco: string | null; capa_url: string | null; resumo: string | null; fotos_url: string | null; inscricao_url: string | null; inscricoes_abertas: boolean };
export const EDITION_FIELDS = 'id,slug,numero,titulo,data_evento,horario,local,cidade,endereco,capa_url,resumo,fotos_url,inscricao_url,inscricoes_abertas';

export const longDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
export const signupHref = (edition: EditionRow) => edition.inscricao_url || (edition.inscricoes_abertas ? `/inscricao/${edition.slug}` : '');

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

export function EdicaoPage() {
  const { slug = '' } = useParams();
  const edition = useEdition(slug);
  const past = edition ? edition.data_evento < new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) : false;
  return (
    <div className="home">
      <nav className="nav"><div className="wrap nav__row"><a href="/" className="nav__logo"><img src="/brand/communicali-branco.png" alt="ComuniCALI" /></a><a className="link" href="/">Conhecer a comunidade</a></div></nav>
      <main className="wrap block">
        {edition === null && <p className="muted">Encontro não encontrado.</p>}
        {edition && <EditionCard edition={edition} badge={past ? 'Realizado' : 'Próximo encontro'} />}
        {edition?.resumo && <p className="block__lead">{edition.resumo}</p>}
        {edition?.fotos_url && <a className="link" href={edition.fotos_url} target="_blank" rel="noopener noreferrer">Baixar as fotos</a>}
      </main>
      <SiteFooter />
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
  const preset = useMemo<FormPreset | null>(() => edition?.inscricoes_abertas && texts ? {
    title: edition.titulo,
    category: 'Inscrição ComuniCALI',
    description: `${longDate(edition.data_evento)}, ${edition.horario}, ${edition.local}, ${edition.cidade}.`,
    submitLabel: 'Enviar inscrição',
    successText: 'Recebemos sua intenção de participar! A equipe vai analisar e você recebe a confirmação por e-mail.',
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
