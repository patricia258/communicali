import { useEffect, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';
import { ArrowRight, CalendarDays, Handshake, Lightbulb, MessageCircle, Network, PackageOpen, Sparkles, UserPlus, Users } from 'lucide-react';
import { COMMUNITY_URL, PARTNER_FORM_URL, formatDate, supabase } from '../lib';
import { SiteFooter } from '../components/SiteFooter';
import { EDITION_FIELDS, EditionCard, Share, type EditionRow } from './Edicao';

type Photo = { id: string; url: string; legenda: string | null };
type Partner = { id: string; nome: string; logo_url: string | null; site_url: string | null };

const MODE_ICONS = [Sparkles, PackageOpen, Lightbulb, Network];
const MODALIDADES = [
  ['Experiência', 'Cafés, alimentação, espaços, acolhimento e vivências.'],
  ['Produção', 'Gráfica, papelaria, fotografia, vídeo, tecnologia e brindes.'],
  ['Conhecimento', 'Conteúdo, facilitação, mentoria e ferramentas de RH e liderança.'],
  ['Rede e comunidade', 'Conexões, divulgação e apresentações institucionais.'],
];

// Categorias de parceria em quatro estilos de selo, lado a lado.
const ESTILOS_SELO = ['postal', 'carimbo', 'recorte', 'oval'] as const;
function SelosParceria() {
  return (
    <ul className="selos" aria-label="Formas de parceria">
      {MODALIDADES.map(([titulo], indice) => {
        const Icon = MODE_ICONS[indice];
        return (
          <li key={titulo} className={`selo selo--${ESTILOS_SELO[indice]}`}>
            <div className="selo__miolo">
              <Icon size={26} strokeWidth={1.5} aria-hidden="true" />
              <strong>{titulo}</strong>
              <span className="selo__base">Parceria</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const FAQ = [
  ['Fazer parte da comunidade é gratuito?', 'Sim. Fazer parte da CommuniCALI é gratuito.'],
  ['Preciso ser de RH para participar?', 'Não. A base da comunidade é de profissionais de RH e administrativos, e líderes, empreendedores e especialistas de qualquer área são bem-vindos, do estágio à transição de carreira.'],
  ['A comunidade é só de Curitiba?', 'Não. O grupo reúne pessoas do Brasil inteiro. Os encontros presenciais começam em Curitiba.'],
  ['Posso divulgar vagas e meus serviços?', 'Pode. O grupo também existe para isso, com respeito às regras de participação.'],
  ['Como participo de um encontro?', 'Entre no grupo da comunidade e se inscreva no encontro. Cada edição é divulgada no grupo, com data, local e link de inscrição.'],
  ['Como acompanho minha participação?', 'Depois do primeiro encontro presencial, você entra no seu espaço online com o e-mail do check-in e acompanha carimbos, pontos, missões, indicações e fotos.'],
  ['Como minha empresa pode ser parceira?', 'Envie sua proposta pelo formulário de parceiros. Cada parceria é conversada e combinada individualmente.'],
];

// Fotos de banco, sem rostos, até as edições terem fotos próprias.
const NEUTRAS = [1, 2, 3, 4, 5].map((index) => ({ id: `neutra-${index}`, url: `/fotos/neutras/${index}.jpg`, legenda: null }));

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

function Arches({ photos }: { photos: Photo[] }) {
  const items = photos.length ? photos : NEUTRAS;
  const columns = [0, 1].map((column) => items.filter((_, index) => index % 2 === column));
  return (
    <div className={`frames${photos.length ? '' : ' frames--neutras'}`} aria-hidden="true">
      {columns.map((column, index) => (
        <div className={`frames__col frames__col--${index}`} key={index}>
          {[...column, ...column, ...column].map((item, position) => (
            <div className="frame" key={`${item.id}-${position}`}>
              <img src={item.url} alt="" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const TRILHA = [
  ['visitante', 'Visitante', 'Quem chega pelo grupo ou pela inscrição em um encontro.'],
  ['membro', 'Membro', 'Quem esteve presencialmente e começa a somar pontos.'],
  ['conector', 'Conector', 'Quem aproxima pessoas e cumpre as missões de conexão.'],
  ['embaixador', 'Embaixador', 'Quem traz parceiros e representa a comunidade.'],
];

const PEOPLE_CARDS = ['fundadora', 'embaixadores'] as const;

function People({ joinHref }: { joinHref: string }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="people">
      <div className="people__track" style={{ '--current': current } as CSSProperties}>
        <article className={`person${current === 0 ? ' is-on' : ''}`}>
          <div className="person__photo">
            <img src="/fotos/patricia-lima.jpg" alt="Patrícia Lima" />
            <div className="person__tags"><span>Idealizadora</span><span className="line">CALI RH</span></div>
          </div>
          <div className="person__body">
            <h3>Patrícia Lima</h3>
            <p className="muted">People Advisory Executive, fundadora da CALI RH</p>
            <p>Mais de 15 anos em RH, ao lado de lideranças e equipes. Criou a comunidade para que a conversa sobre pessoas saísse dos grupos de repasse e virasse relacionamento.</p>
            <a className="outline" href="https://www.linkedin.com/in/patriciaazumi/" target="_blank" rel="noopener noreferrer">Conhecer no LinkedIn</a>
          </div>
        </article>
        <article className={`person person--text${current === 1 ? ' is-on' : ''}`}>
          <div className="person__body">
            <p className="tag">Embaixadores</p>
            <h3>Faça parte desse ecossistema</h3>
            <p>Quem participa, contribui e conecta pessoas pode aparecer aqui como embaixador da comunidade.</p>
          </div>
        </article>
      </div>
      <div className="people__nav">
        {PEOPLE_CARDS.map((card, index) => <button key={card} type="button" aria-label={`Ver cartão ${index + 1}`} className={index === current ? 'is-on' : ''} onClick={() => setCurrent(index)} />)}
        <button type="button" className="people__next" aria-label="Próximo cartão" onClick={() => setCurrent((current + 1) % PEOPLE_CARDS.length)}><ArrowRight size={16} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

export function Home() {
  const [qr, setQr] = useState('');
  const [editions, setEditions] = useState<EditionRow[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [members, setMembers] = useState(0);

  useEffect(() => {
    QRCode.toDataURL(COMMUNITY_URL, { width: 360, margin: 1, color: { dark: '#2B1A20', light: '#FFFFFF' } }).then(setQr);
    supabase.from('editions').select(EDITION_FIELDS).eq('publica', true).order('data_evento').then(({ data }) => setEditions((data || []) as EditionRow[]));
    supabase.from('edition_photos').select('id,url,legenda').eq('no_carrossel', true).order('ordem').then(({ data }) => setPhotos((data || []) as Photo[]));
    supabase.from('partners').select('id,nome,logo_url,site_url').eq('ativo', true).order('ordem').then(({ data }) => setPartners((data || []) as Partner[]));
    supabase.rpc('communicali_membros').then(({ data }) => setMembers(Number(data) || 0));
  }, []);

  const upcoming = editions.filter((edition) => edition.data_evento >= today());
  const next = upcoming[0] || null;
  const past = editions.filter((edition) => edition.data_evento < today()).reverse();
  const joinHref = '/f/quero-ser-membro';

  return (
    <div className="home">
      <nav className="nav">
        <div className="wrap nav__row">
          <a href="/" className="nav__logo"><img src="/brand/communicali-branco.png" alt="CommuniCALI" /></a>
          <div className="nav__links">
            <a href="#comunidade">Comunidade</a>
            <a href="#fazer-parte">Como entrar</a>
            <a href="#proximo">Agenda</a>
            <a href="#parceiros">Parceiros</a>
          </div>
          <a className="pill" href={joinHref}>Registrar interesse</a>
        </div>
      </nav>

      <header className="hero">
        <Arches photos={photos} />
        <div className="wrap hero__body">
          <p className="hero__sign">Café & Pessoas</p>
          <h1>Falar de pessoas <em>pode mudar o mundo.</em></h1>
          <p className="hero__text">Uma comunidade para quem se interessa por gente, gestão e desenvolvimento humano, com pessoas do Brasil inteiro e encontros presenciais.</p>
          <div className="hero__actions">
            <a className="pill pill--large" href={joinHref}>Registrar interesse</a>
            <a className="link" href="#proximo">Ver a agenda</a>
          </div>
        </div>
      </header>

      <section className="wrap stats">
        <article className="stat"><Users size={20} aria-hidden="true" /><strong>+300</strong><h3>Pessoas</h3><p>Na comunidade, nos canais e nos encontros</p></article>
        <article className="stat"><CalendarDays size={20} aria-hidden="true" /><strong>{next?.numero || Math.max(1, editions.length)}ª</strong><h3>Edição presencial</h3><p>{next ? `${formatDate(next.data_evento)} em ${next.cidade}` : 'Encontros em Curitiba'}</p></article>
        <article className="stat"><Handshake size={20} aria-hidden="true" /><strong>Brasil</strong><h3>Inteiro</h3><p>Pessoas de vários estados no grupo</p></article>
      </section>

      <section className="wrap founder" id="comunidade">
        <div className="founder__text">
          <p className="eyebrow">A comunidade</p>
          <h2>Relações que continuam <em>depois do café.</em></h2>
          <p>A CommuniCALI é uma comunidade para quem se interessa por gente: profissionais de RH, lideranças, empresários, empreendedores e todas as pessoas que querem falar de gestão e desenvolvimento humano.</p>
          <p>Ela nasceu nos canais digitais, do cansaço com conversas superficiais e grupos feitos só para repassar informação. Dentro do próprio grupo surgiu a vontade de sair da tela e se encontrar para escutar, aprender e debater assuntos difíceis com respeito.</p>
          <p>Quem organiza é a CALI RH, que liga a gestão de pessoas às decisões do negócio sem perder a responsabilidade humana.</p>
        </div>
        <People joinHref={joinHref} />
      </section>

      <section className="wrap block" id="fazer-parte">
        <div className="block__head">
          <div>
            <p className="eyebrow">Primeira vez?</p>
            <h2>Venha nos <em>conhecer.</em></h2>
          </div>
        </div>
        <div className="entrada">
          <article className="entrada__visita">
            <span className="entrada__icone"><UserPlus size={22} aria-hidden="true" /></span>
            <h3>Visite a comunidade</h3>
            <p>Na primeira vez, você participa como visitante. Cadastre seu interesse e avisamos sobre os próximos encontros, online ou presenciais em Curitiba e região.</p>
            <a className="pill" href="/f/quero-ser-membro">Cadastrar meu interesse</a>
          </article>
          <article className="entrada__grupo">
            <div>
              <span className="entrada__icone"><MessageCircle size={22} aria-hidden="true" /></span>
              <h3>Grupo no WhatsApp</h3>
              <p>Pessoas do Brasil inteiro trocando vagas, contatos, dúvidas e experiências.</p>
              <a className="link" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>
            </div>
            {qr && <img className="entrada__qr" src={qr} alt="QR Code do grupo da comunidade" />}
          </article>
        </div>
      </section>

      <section className="wrap block" id="programa">
        <div className="block__head">
          <div>
            <p className="eyebrow">Programa de membros</p>
            <h2>Seu passaporte, <em>sempre online.</em></h2>
          </div>
        </div>
        <div className="trilha">
          {TRILHA.map(([id, nome, texto]) => (
            <article key={id}>
              <img src={`/selos/postal-${id}.png`} alt={`Selo ${nome}`} />
              <p>{texto}</p>
            </article>
          ))}
        </div>
        <a className="link" href="/meu-espaco">Já sou membro, quero entrar</a>
      </section>

      <section className="wrap block" id="proximo">
        <div className="block__head">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Encontros para <em>sair da tela.</em></h2>
          </div>
        </div>
        {next ? <EditionCard edition={next} badge="Próximo encontro" /> : <p className="muted">A próxima data sai em breve. Quem está no grupo da comunidade fica sabendo primeiro.</p>}
        {upcoming.length > 1 && (
          <div className="past">
            <h3>Próximas edições</h3>
            <div className="posts">
              {upcoming.slice(1).map((edition) => (
                <article className="post" id={edition.slug} key={edition.id}>
                  <div className="post__image" style={edition.capa_url ? { backgroundImage: `url(${edition.capa_url})` } : undefined}><span>Em breve</span></div>
                  <div className="post__body">
                    <p className="event__date">{formatDate(edition.data_evento)} · {edition.cidade}</p>
                    <h3>{edition.titulo}</h3>
                    <p className="muted">{edition.local}</p>
                    <Share edition={edition} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        <div id="edicoes" className="past">
          <h3>Como foram os encontros</h3>
          {past.length ? (
            <div className="posts">
              {past.map((edition) => (
                <article className="post" id={edition.slug} key={edition.id}>
                  <div className="post__image" style={edition.capa_url ? { backgroundImage: `url(${edition.capa_url})` } : undefined}><span>Realizado</span></div>
                  <div className="post__body">
                    <p className="event__date">{formatDate(edition.data_evento)} · {edition.cidade}</p>
                    <h3>{edition.titulo}</h3>
                    {edition.resumo && <p className="muted">{edition.resumo}</p>}
                    {edition.fotos_url && <a className="link" href={edition.fotos_url} target="_blank" rel="noopener noreferrer">Baixar as fotos</a>}
                    <Share edition={edition} />
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="muted">O resumo e as fotos de cada edição ficam aqui depois de cada encontro.</p>}
        </div>
      </section>

      <section className="sponsors" id="parceiros">
        <p className="sponsors__label">Quem apoia a CommuniCALI</p>
        <div className="logos" aria-label="Parceiros da CommuniCALI">
          <div className="logos__track">
            {(partners.length ? [...partners, ...partners, ...partners] : Array.from({ length: 12 }, (_, index) => ({ id: String(index), nome: '', logo_url: null, site_url: null }))).map((partner, index) => (
              partner.nome
                ? <a key={`${partner.id}-${index}`} className="logo" href={partner.site_url || undefined} target="_blank" rel="noopener noreferrer" title={partner.nome}>{partner.logo_url ? <img src={partner.logo_url} alt={partner.nome} /> : <span>{partner.nome}</span>}</a>
                : <a key={index} className="logo logo--empty" href={PARTNER_FORM_URL}>Sua marca aqui</a>
            ))}
          </div>
        </div>
        <div className="wrap sponsors__body">
          <div>
            <p className="eyebrow">Para empresas e profissionais</p>
            <h2>Apoie este encontro.<br /><em className="nowrap">Seja um parceiro.</em></h2>
            <p className="muted">Nem toda contribuição é financeira: cada parceiro oferece o que faz bem, e a proposta é combinada individualmente.</p>
            <div className="hero__actions">
              <a className="pill" href={PARTNER_FORM_URL}>Quero ser parceiro</a>
            </div>
          </div>
          <SelosParceria />
        </div>
      </section>

      <section className="wrap block">
        <div className="block__head"><div><p className="eyebrow">Dúvidas</p><h2>Perguntas <em>frequentes.</em></h2></div></div>
        <div className="faq">
          {FAQ.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
