import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { COMMUNITY_URL, PARTNER_DECK_URL, PARTNER_FORM_URL, formatDate, supabase } from '../lib';
import { useSiteTexts } from './MemberFields';

type EditionRow = { id: string; slug: string; numero: number | null; titulo: string; data_evento: string; horario: string; local: string; cidade: string; endereco: string | null; capa_url: string | null; resumo: string | null; fotos_url: string | null; inscricao_url: string | null };
type Photo = { id: string; url: string; legenda: string | null };
type Partner = { id: string; nome: string; logo_url: string | null; site_url: string | null };

const MODALIDADES = [
  ['Experiência', 'Cafés, alimentação, espaços, acolhimento e vivências.'],
  ['Produção', 'Gráfica, papelaria, fotografia, vídeo, tecnologia e brindes.'],
  ['Conhecimento', 'Conteúdo, facilitação, mentoria e ferramentas de RH e liderança.'],
  ['Rede e comunidade', 'Conexões, divulgação e apresentações institucionais.'],
];

const FAQ = [
  ['Preciso ser de RH para participar?', 'Não. A base da comunidade é de profissionais de RH e administrativos, e líderes, empreendedores e especialistas de qualquer área são bem-vindos, do estágio à transição de carreira.'],
  ['A comunidade é só de Curitiba?', 'Não. O grupo reúne pessoas do Brasil inteiro. Os encontros presenciais começam em Curitiba.'],
  ['Posso divulgar vagas e meus serviços?', 'Pode. O grupo também existe para isso, com respeito às regras de participação.'],
  ['Como participo de um encontro?', 'Entre na comunidade e faça seu cadastro. Cada encontro é divulgado no grupo, com data, local e forma de participar.'],
  ['Como minha empresa pode ser parceira?', 'Envie sua proposta pelo formulário de parceiros. Cada parceria é conversada e combinada individualmente.'],
];

const TILES = ['Rodas de conversa', 'Café', 'Mini pitch', 'Pessoas', 'Debates', 'Conexões'];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const longDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

function Arches({ photos }: { photos: Photo[] }) {
  const items = photos.length ? photos : TILES.map((label) => ({ id: label, url: '', legenda: label }));
  const columns = [0, 1].map((column) => items.filter((_, index) => index % 2 === column));
  return (
    <div className="arches" aria-hidden="true">
      {columns.map((column, index) => (
        <div className={`arches__col arches__col--${index}`} key={index}>
          {[...column, ...column, ...column].map((item, position) => (
            <div className="arch" key={`${item.id}-${position}`}>
              {item.url ? <img src={item.url} alt="" /> : <span>{item.legenda}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const PEOPLE_CARDS = ['fundadora', 'embaixadores', 'honorarios'] as const;

function People({ joinHref }: { joinHref: string }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="people">
      <div className="people__track" style={{ transform: `translateX(calc(${current} * (-100% - 16px)))` }}>
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
            <a className="outline" href={joinHref}>Quero participar</a>
          </div>
        </article>
        <article className={`person person--text${current === 2 ? ' is-on' : ''}`}>
          <div className="person__body">
            <p className="tag">Membros honorários</p>
            <h3>Quem constrói a CommuniCALI</h3>
            <p>Este espaço vai reconhecer as pessoas que marcaram a história da comunidade.</p>
          </div>
        </article>
      </div>
      <div className="people__nav">
        {PEOPLE_CARDS.map((card, index) => <button key={card} type="button" aria-label={`Ver cartão ${index + 1}`} className={index === current ? 'is-on' : ''} onClick={() => setCurrent(index)} />)}
        <button type="button" className="people__next" aria-label="Próximo cartão" onClick={() => setCurrent((current + 1) % PEOPLE_CARDS.length)}>→</button>
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
  const texts = useSiteTexts();

  useEffect(() => {
    QRCode.toDataURL(COMMUNITY_URL, { width: 360, margin: 1, color: { dark: '#2B1A20', light: '#FFFFFF' } }).then(setQr);
    supabase.from('editions').select('id,slug,numero,titulo,data_evento,horario,local,cidade,endereco,capa_url,resumo,fotos_url,inscricao_url').eq('publica', true).order('data_evento').then(({ data }) => setEditions((data || []) as EditionRow[]));
    supabase.from('edition_photos').select('id,url,legenda').eq('no_carrossel', true).order('ordem').then(({ data }) => setPhotos((data || []) as Photo[]));
    supabase.from('partners').select('id,nome,logo_url,site_url').eq('ativo', true).order('ordem').then(({ data }) => setPartners((data || []) as Partner[]));
    supabase.rpc('communicali_membros').then(({ data }) => setMembers(Number(data) || 0));
  }, []);

  const next = editions.find((edition) => edition.data_evento >= today()) || null;
  const past = editions.filter((edition) => edition.data_evento < today()).reverse();
  const joinHref = texts?.cadastro_aberto ? '/cadastro' : '#fazer-parte';

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
          <a className="pill" href={joinHref}>Quero participar</a>
        </div>
      </nav>

      <header className="hero">
        <Arches photos={photos} />
        <div className="wrap hero__body">
          <p className="hero__sign">Café & Pessoas</p>
          <h1>Falar de pessoas <em>pode mudar o mundo.</em></h1>
          <p className="hero__text">Uma comunidade para quem se interessa por gente, gestão e desenvolvimento humano, com pessoas do Brasil inteiro e encontros presenciais.</p>
          <div className="hero__actions">
            <a className="pill pill--large" href={joinHref}>Quero participar</a>
            <a className="link" href="#proximo">Ver a agenda</a>
          </div>
        </div>
      </header>

      <section className="wrap stats">
        {members > 0 && <article className="stat"><strong>+{members.toLocaleString('pt-BR')}</strong><h3>Membros</h3><p>Na comunidade</p></article>}
        <article className="stat"><strong>{next?.numero || Math.max(1, editions.length)}ª</strong><h3>Edição presencial</h3><p>{next ? `${formatDate(next.data_evento)} em ${next.cidade}` : 'Encontros em Curitiba'}</p></article>
        <article className="stat"><strong>Brasil</strong><h3>Inteiro</h3><p>Pessoas de vários estados no grupo</p></article>
      </section>

      <section className="wrap founder" id="comunidade">
        <div className="founder__text">
          <p className="eyebrow">A comunidade</p>
          <h2>Relações que continuam <em>depois do café.</em></h2>
          <p>A CommuniCALI é uma comunidade para quem se interessa por gente: profissionais de RH, lideranças, empresários, empreendedores e todas as pessoas que querem falar de gestão e desenvolvimento humano.</p>
          <p>Ela nasceu nos canais digitais, do cansaço com conversas superficiais e grupos feitos só para repassar informação. Dentro do próprio grupo surgiu a vontade de sair da tela e se encontrar para escutar, aprender e debater assuntos difíceis com respeito.</p>
          <p>Quem organiza é a CALI RH, que liga a gestão de pessoas às decisões do negócio sem perder a responsabilidade humana.</p>
          <a className="pill" href={joinHref}>Quero participar</a>
        </div>
        <People joinHref={joinHref} />
      </section>

      <section className="wrap block" id="fazer-parte">
        <div className="block__head">
          <div>
            <p className="eyebrow">Como fazer parte</p>
            <h2>Escolha por onde <em>entrar.</em></h2>
          </div>
          <p>O grupo é onde a conversa acontece todo dia. O cadastro guarda seu histórico em cada edição.</p>
        </div>
        <div className="doors">
          <article className="door">
            <span className="door__arrow">↗</span>
            <div>
              <h3>Grupo da comunidade</h3>
              <p>Pessoas do Brasil inteiro no WhatsApp, trocando vagas, contatos, dúvidas e experiências.</p>
              <a className="link" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>
            </div>
            {qr && <img className="door__qr" src={qr} alt="QR Code do grupo da comunidade" />}
          </article>
          <article className="door">
            <span className="door__arrow">↗</span>
            <div>
              <h3>Cadastro de membro</h3>
              <p>Registre sua participação para acumular presenças e pontos e acompanhar sua categoria na comunidade.</p>
              <a className="link" href={joinHref}>Fazer meu cadastro</a>
            </div>
          </article>
        </div>
      </section>

      <section className="wrap block" id="proximo">
        <div className="block__head">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Encontros para <em>sair da tela.</em></h2>
          </div>
        </div>
        {next ? (
          <article className="event">
            <div className="event__cover">
              {next.capa_url ? <img src={next.capa_url} alt={`Fachada do ${next.local}`} /> : <img className="event__logo" src="/brand/communicali-branco.png" alt="" />}
              <span className="event__badge">Próximo encontro</span>
            </div>
            <div className="event__body">
              <p className="event__date">{longDate(next.data_evento)} · {next.cidade}</p>
              <h3>{next.titulo}</h3>
              <dl>
                <div><dt>Horário</dt><dd>{next.horario}</dd></div>
                <div><dt>Local</dt><dd>{next.local}</dd></div>
                <div className="wide"><dt>Endereço</dt><dd>{[next.endereco, next.cidade].filter(Boolean).join(', ')}</dd></div>
              </dl>
              {next.inscricao_url
                ? <a className="pill" href={next.inscricao_url}>Quero me inscrever</a>
                : <p className="muted">Inscrições desta edição encerradas. Entre na comunidade para saber da próxima.</p>}
            </div>
          </article>
        ) : <p className="muted">A próxima data sai em breve. Quem está no grupo da comunidade fica sabendo primeiro.</p>}
        <div id="edicoes" className="past">
          <h3>Como foram os encontros</h3>
          {past.length ? (
            <div className="posts">
              {past.map((edition) => (
                <article className="post" key={edition.id}>
                  <div className="post__image" style={edition.capa_url ? { backgroundImage: `url(${edition.capa_url})` } : undefined}><span>Realizado</span></div>
                  <div className="post__body">
                    <p className="event__date">{formatDate(edition.data_evento)} · {edition.cidade}</p>
                    <h3>{edition.titulo}</h3>
                    {edition.resumo && <p className="muted">{edition.resumo}</p>}
                    {edition.fotos_url && <a className="link" href={edition.fotos_url} target="_blank" rel="noopener noreferrer">Baixar as fotos</a>}
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
            <h2>Apoie este encontro. <em>Seja um parceiro.</em></h2>
            <p className="muted">Nem toda contribuição é financeira: cada parceiro oferece o que faz bem, e a proposta é combinada individualmente.</p>
            <div className="hero__actions">
              <a className="pill" href={PARTNER_FORM_URL}>Quero ser parceiro</a>
              <a className="link" href={PARTNER_DECK_URL} target="_blank" rel="noopener noreferrer">Ver apresentação para parceiros</a>
            </div>
          </div>
          <ul className="modes">
            {MODALIDADES.map(([title, text]) => <li key={title}><strong>{title}</strong><span>{text}</span></li>)}
          </ul>
        </div>
      </section>

      <section className="wrap block">
        <div className="block__head"><div><p className="eyebrow">Dúvidas</p><h2>Perguntas <em>frequentes.</em></h2></div></div>
        <div className="faq">
          {FAQ.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className="wrap closing">
        <h2>Vem fazer parte dessa conversa.</h2>
        <a className="pill pill--large" href={joinHref}>Quero participar</a>
      </section>

      <footer className="footer">
        <div className="wrap footer__row">
          <img src="/brand/communicali-branco.png" alt="CommuniCALI" />
          <p className="footer__faith">Toda honra a Deus!</p>
          <p>Organização <a href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a> · <a href="/regras">Regras</a> · <a href="/privacidade">Privacidade</a></p>
        </div>
      </footer>
    </div>
  );
}
