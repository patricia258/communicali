import { useEffect, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';
import { ArrowRight, Award, CalendarDays, Route, Stamp, Handshake, Lightbulb, MessageCircle, Network, PackageOpen, Sparkles, UserPlus, Users } from 'lucide-react';
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
  ['Fazer parte da comunidade é gratuito?', 'Sim. Fazer parte da ComuniCALI é gratuito.'],
  ['Preciso ser de RH para participar?', 'Não. A base da comunidade é de profissionais de RH e administrativos, e líderes, empreendedores e especialistas de qualquer área são bem-vindos, do estágio à transição de carreira.'],
  ['A comunidade é só de Curitiba?', 'Não. O grupo reúne pessoas do Brasil inteiro. Os encontros presenciais começam em Curitiba.'],
  ['Posso divulgar vagas e meus serviços?', 'Pode. O grupo também existe para isso, com respeito às regras de participação.'],
  ['Como participo de um encontro?', 'Entre no grupo da comunidade e se inscreva no encontro. Cada edição é divulgada no grupo, com data, local e link de inscrição.'],
  ['Como acompanho minha participação?', 'Depois do primeiro encontro presencial, você entra no seu passaporte online com o e-mail do check-in e acompanha carimbos, milhas, missões, indicações e fotos.'],
  ['Como minha empresa pode ser parceira?', 'Envie sua proposta pelo formulário de parceiros. Cada parceria é conversada e combinada individualmente.'],
];

// Fotos de banco, sem rostos, até as edições terem fotos próprias.
// Fotos livres (Unsplash) que mostram os formatos: reunião, online, palestra, jantar e oficina.
const NEUTRAS = ['reuniao', 'virtual', 'palestra', 'jantar', 'experiencia'].map((nome) => ({ id: `home-${nome}`, url: `/fotos/home/${nome}.jpg`, legenda: null }));

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
  ['visitante', 'Visitante', 'Chega para conhecer o caminho.'],
  ['membro', 'Membro', 'Assume o pertencimento e constrói sua história.'],
  ['conector', 'Conector', 'Ajuda a criar pontes entre trajetórias.'],
  ['embaixador', 'Embaixador', 'Leva a comunidade a novos horizontes.'],
];
const FORMATOS = [
  ['Encontros presenciais', 'Em Curitiba e região, com café, conversa e troca de experiências.', '/fotos/home/presencial.jpg'],
  ['Encontros virtuais', 'Online, para quem está em qualquer lugar do Brasil.', '/fotos/home/virtual.jpg'],
  ['Experiências', 'Vivências, visitas e palestras que ampliam o olhar.', '/fotos/home/experiencia.jpg'],
  ['Almoços e jantares', 'Conversas à mesa, em grupos menores.', '/fotos/home/jantar.jpg'],
];
const PASSAPORTE = [
  ['Carimbos', 'Cada encontro vivido deixa um carimbo no seu passaporte.'],
  ['Selos', 'Cada contribuição reconhecida, como trazer alguém ou fazer uma conexão dar certo, vira um selo.'],
  ['Milhas', 'Tudo o que você vive na comunidade soma milhas e mostra até onde a sua jornada já chegou.'],
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
            <span className="person__carimbo"><small>ComuniCALI</small>Idealizadora</span>
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

  // Seções e cartões aparecem suavemente ao entrar na tela.
  useEffect(() => {
    const alvos = document.querySelectorAll('.home .stats, .home .founder, .home .block, .home .sponsors__body, .home .logos');
    alvos.forEach((item) => item.classList.add('revelar'));
    if (!('IntersectionObserver' in window)) { alvos.forEach((item) => item.classList.add('visivel')); return; }
    const observador = new IntersectionObserver((entradas) => entradas.forEach((entrada) => { if (entrada.isIntersecting) { entrada.target.classList.add('visivel'); observador.unobserve(entrada.target); } }), { threshold: 0.12 });
    alvos.forEach((item) => observador.observe(item));
    return () => observador.disconnect();
  }, []);

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
          <a href="/" className="nav__logo"><img src="/brand/communicali-branco.png" alt="ComuniCALI" /></a>
          <div className="nav__links">
            <a href="#comunidade">Comunidade</a>
            <a href="#fazer-parte">Como entrar</a>
            <a href="#proximo">Agenda</a>
            <a href="#parceiros">Parceiros</a>
          </div>
          <div className="nav__acoes"><a className="nav__membro" href="/meu-espaco">Já sou membro</a><a className="pill" href={joinHref}>Registrar interesse</a></div>
        </div>
      </nav>

      <header className="hero">
        <Arches photos={photos} />
        <div className="wrap hero__body">
          <p className="hero__sign">Café & Pessoas</p>
          <h1>Falar de pessoas <em>pode mudar o mundo.</em></h1>
          <p className="hero__text">Cada pessoa chega com sua própria bagagem. Quando histórias diferentes se encontram, novos caminhos aparecem.</p>
          <div className="hero__actions">
            <a className="pill pill--large" href={joinHref}>Registrar interesse</a>
            <a className="link" href="#proximo">Ver a agenda</a>
          </div>
        </div>
      </header>

      <section className="wrap stats">
        <article className="stat ticket"><Users size={20} aria-hidden="true" /><strong>+300</strong><h3>Pessoas</h3><p>Na comunidade, nos canais e nos encontros</p></article>
        <article className="stat ticket"><CalendarDays size={20} aria-hidden="true" /><strong>{next?.numero || Math.max(1, editions.length)}ª</strong><h3>Edição presencial</h3><p>{next ? `${formatDate(next.data_evento)} em ${next.cidade}` : 'Encontros em Curitiba'}</p></article>
        <article className="stat ticket"><Handshake size={20} aria-hidden="true" /><strong>Brasil</strong><h3>Inteiro</h3><p>Pessoas de vários estados no grupo</p></article>
      </section>

      <section className="wrap founder" id="comunidade">
        <div className="founder__text">
          <p className="eyebrow">A comunidade</p>
          <h2>Caminhos que se cruzam <em>e seguem juntos.</em></h2>
          <p>A ComuniCALI reúne <strong>quem se interessa por gente</strong>: profissionais de RH, lideranças, empreendedores e todas as pessoas que querem falar de <strong>gestão e desenvolvimento humano</strong>.</p>
          <p>Cada pessoa chega com a <strong>sua bagagem</strong>, com histórias, escolhas e vivências próprias. Quando escutamos alguém, <strong>descobrimos caminhos</strong> que talvez nunca percorreríamos sozinhos. É isso que acontece nos encontros e <strong>continua entre um encontro e outro</strong>.</p>
          <p>A comunidade nasceu nos canais digitais e ganhou vida nos encontros, com <strong>escuta, respeito e coragem</strong> para debater temas difíceis. Quem organiza é a <strong>CALI RH</strong>.</p>
          <p>Acreditamos que <strong>nenhum encontro acontece por acaso</strong>. Servimos às pessoas com fé e integridade, e damos <strong>toda honra a Deus</strong> por cada caminho que se cruza aqui.</p>
        </div>
        <People joinHref={joinHref} />
      </section>

      <section className="wrap block" id="fazer-parte">
        <div className="block__head">
          <div>
            <p className="eyebrow">Primeira vez?</p>
            <h2>Comece a sua <em>jornada.</em></h2>
          </div>
        </div>
        <div className="entrada">
          <article className="entrada__visita">
            <span className="entrada__icone"><UserPlus size={22} aria-hidden="true" /></span>
            <h3>Visite a comunidade</h3>
            <p>Toda jornada começa com uma primeira visita. Na primeira vez, você participa como visitante. Cadastre seu interesse e avisamos sobre os próximos encontros, online ou presenciais em Curitiba e região.</p>
            <a className="pill" href="/f/quero-ser-membro">Cadastrar meu interesse</a>
          </article>
          <article className="entrada__grupo">
            <div>
              <span className="entrada__icone"><MessageCircle size={22} aria-hidden="true" /></span>
              <h3>Grupo no WhatsApp</h3>
              <p>É onde a conversa continua entre um encontro e outro: vagas, contatos, dúvidas e experiências de pessoas do Brasil inteiro.</p>
              <a className="link" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>
            </div>
            {qr && <img className="entrada__qr" src={qr} alt="QR Code do grupo da comunidade" />}
          </article>
        </div>
      </section>

      <section className="wrap block" id="formatos">
        <div className="block__head">
          <div>
            <p className="eyebrow">Formatos</p>
            <h2>Sua próxima <em>escala.</em></h2>
          </div>
        </div>
        <div className="escalas">
          {FORMATOS.map(([titulo, texto, foto]) => (
            <article className="escala" key={titulo}>
              <div className="escala__capa" style={{ backgroundImage: `url(${foto})` }} />
              <div className="escala__corpo"><h3>{titulo}</h3><p>{texto}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap block" id="programa">
        <div className="block__head">
          <div>
            <p className="eyebrow">Seu passaporte</p>
            <h2>Cada pessoa, uma jornada. <em>Cada encontro, novos horizontes.</em></h2>
          </div>
        </div>
        <div className="trilha">
          {TRILHA.map(([id, nome]) => (
            <article key={id}>
              <img src={`/selos/postal-${id}.png`} alt={`Selo ${nome}`} />
            </article>
          ))}
        </div>
        <div className="passaporte">
          {PASSAPORTE.map(([titulo, texto], indice) => { const Icone = [Stamp, Award, Route][indice]; return <article className="ticket" key={titulo}><span className="ticket__numero" aria-hidden="true">Nº 000{indice + 1}</span><Icone size={30} strokeWidth={1.6} aria-hidden="true" /><span className="ticket__estrelas" aria-hidden="true">★ ★ ★</span><strong>{titulo}</strong><p>{texto}</p></article>; })}
        </div>
      </section>

      <section className="wrap block" id="proximo">
        <div className="block__head">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Próximo <em>check-in.</em></h2>
          </div>
        </div>
        {next ? <EditionCard edition={next} badge="Próximo check-in" /> : <p className="muted">A próxima data sai em breve. Quem está no grupo da comunidade fica sabendo primeiro.</p>}
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
        <p className="sponsors__label">Quem apoia a ComuniCALI</p>
        <div className="logos" aria-label="Parceiros da ComuniCALI">
          <div className="logos__track">
            {(partners.length ? [...partners, ...partners, ...partners] : Array.from({ length: 12 }, (_, index) => ({ id: String(index), nome: '', logo_url: null, site_url: null }))).map((partner, index) => (
              partner.nome
                ? <a key={`${partner.id}-${index}`} className="logo" href={partner.site_url || undefined} target="_blank" rel="noopener noreferrer" title={partner.nome}>{partner.logo_url ? <img src={partner.logo_url} alt={partner.nome} /> : <span>{partner.nome}</span>}</a>
                : <a key={index} className="logo logo--empty" href={PARTNER_FORM_URL}>Sua marca aqui</a>
            ))}
          </div>
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
