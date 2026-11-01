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

const TILES = ['Rodas de conversa', 'Café', 'Mini pitch', 'Pessoas', 'Debates', 'Conexões', 'Troca de experiências', 'Liderança', 'Escuta'];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const longDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

function Mosaic({ photos }: { photos: Photo[] }) {
  const items = photos.length ? photos : TILES.map((label) => ({ id: label, url: '', legenda: label }));
  const columns = [0, 1, 2].map((column) => items.filter((_, index) => index % 3 === column));
  return (
    <div className="mosaic" aria-hidden="true">
      {columns.map((column, index) => (
        <div className={`mosaic__col mosaic__col--${index}`} key={index}>
          {[...column, ...column, ...column].map((item, position) => (
            <div className="tile" key={`${item.id}-${position}`}>
              {item.url ? <img src={item.url} alt="" /> : <span>{item.legenda}</span>}
            </div>
          ))}
        </div>
      ))}
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
            <a href="#proximo">Próximo encontro</a>
            <a href="#edicoes">Edições</a>
            <a href="#parceiros">Parceiros</a>
          </div>
          <a className="pill" href={joinHref}>Quero participar</a>
        </div>
      </nav>

      <header className="hero">
        <Mosaic photos={photos} />
        <div className="wrap hero__body">
          <p className="hero__sign">Café & Pessoas</p>
          <h1>Falar de pessoas <em>pode mudar o mundo.</em></h1>
          <p className="hero__text">Uma comunidade para quem se interessa por gente, gestão e desenvolvimento humano, com pessoas do Brasil inteiro e encontros presenciais.</p>
          <div className="hero__actions">
            <a className="pill pill--large" href={joinHref}>Quero participar</a>
            <a className="link" href="#proximo">Ver o próximo encontro</a>
          </div>
        </div>
      </header>

      <section className="wrap stats">
        {members > 0 && <article className="stat"><strong>+{members.toLocaleString('pt-BR')}</strong><h3>Membros</h3><p>Na comunidade</p></article>}
        <article className="stat"><strong>{next?.numero || Math.max(1, editions.length)}ª</strong><h3>Edição presencial</h3><p>{next ? `${formatDate(next.data_evento)} em ${next.cidade}` : 'Encontros em Curitiba'}</p></article>
        <article className="stat"><strong>Brasil</strong><h3>Inteiro</h3><p>Pessoas de vários estados no grupo</p></article>
      </section>

      <section className="wrap split" id="comunidade">
        <h2>Relações que continuam depois do café</h2>
        <div className="split__text">
          <p className="split__lead">A CommuniCALI é uma comunidade para quem se interessa por gente: profissionais de RH, lideranças, empresários, empreendedores e todas as pessoas que querem falar de gestão e desenvolvimento humano.</p>
          <h3>De onde veio a ideia</h3>
          <p>Ela nasceu nos canais digitais, do cansaço com conversas superficiais, contatos de conveniência e grupos feitos só para repassar informação. Foi dentro do próprio grupo que surgiu a vontade de sair da tela e se encontrar: escutar, aprender e debater assuntos difíceis com respeito, inclusive quando as opiniões não batem.</p>
          <h3>Como ela se liga à CALI RH</h3>
          <p>Quem organiza é a CALI RH, fundada por Patrícia Lima, executiva de RH com mais de 15 anos de trajetória. O trabalho da CALI liga a gestão de pessoas às decisões do negócio sem perder a responsabilidade humana, e a comunidade leva essa conversa para o dia a dia de quem participa.</p>
        </div>
      </section>

      <section className="wrap block" id="fazer-parte">
        <h2>Escolha por onde entrar</h2>
        <div className="cards">
          <article className="card">
            <h3>Comunidade</h3>
            <p>As conversas acontecem no grupo do WhatsApp. Aponte a câmera para o QR Code ou use o botão.</p>
            {qr && <img className="card__qr" src={qr} alt="QR Code do grupo da comunidade" />}
            <a className="pill" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>
          </article>
          <article className="card">
            <h3>Cadastro de membro</h3>
            <p>Seu cadastro guarda presenças, pontos e histórico em todas as edições.</p>
            <a className="pill" href={joinHref}>Fazer meu cadastro</a>
          </article>
          <article className="card">
            <h3>Parceiros</h3>
            <p>Cada parceiro oferece o que faz bem, com condições combinadas caso a caso.</p>
            <a className="pill" href="#parceiros">Quero ser parceiro</a>
          </article>
        </div>
      </section>

      <section className="wrap block" id="proximo">
        <h2>Próximo encontro</h2>
        {next ? (
          <article className="event">
            <div className="event__cover" style={next.capa_url ? { backgroundImage: `url(${next.capa_url})` } : undefined}>
              {!next.capa_url && <img src="/brand/communicali-branco.png" alt="" />}
            </div>
            <div className="event__body">
              <p className="tag">{next.numero ? `${next.numero}ª edição` : 'Encontro'}</p>
              <h3>{next.titulo}</h3>
              <dl>
                <div><dt>Data</dt><dd>{longDate(next.data_evento)}</dd></div>
                <div><dt>Horário</dt><dd>{next.horario}</dd></div>
                <div><dt>Local</dt><dd>{next.local}</dd></div>
                <div><dt>Endereço</dt><dd>{[next.endereco, next.cidade].filter(Boolean).join(', ')}</dd></div>
              </dl>
              {next.inscricao_url
                ? <a className="pill" href={next.inscricao_url}>Quero me inscrever</a>
                : <p className="muted">As inscrições desta edição estão encerradas. Entre na comunidade para saber da próxima.</p>}
            </div>
          </article>
        ) : <p className="muted">A próxima data sai em breve. Quem está no grupo da comunidade fica sabendo primeiro.</p>}
      </section>

      <section className="wrap block" id="edicoes">
        <h2>Como foram os encontros</h2>
        {past.length ? (
          <div className="posts">
            {past.map((edition) => (
              <article className="post" key={edition.id}>
                <div className="post__image" style={edition.capa_url ? { backgroundImage: `url(${edition.capa_url})` } : undefined} />
                <h3>{edition.titulo}</h3>
                <p className="muted">{formatDate(edition.data_evento)} · {edition.local}, {edition.cidade}</p>
                {edition.resumo && <p>{edition.resumo}</p>}
                {edition.fotos_url && <a className="link" href={edition.fotos_url} target="_blank" rel="noopener noreferrer">Baixar as fotos</a>}
              </article>
            ))}
          </div>
        ) : <p className="muted">O resumo e as fotos de cada edição ficam aqui. A primeira entra depois de 14 de novembro.</p>}
      </section>

      <section className="wrap block" id="parceiros">
        <h2>Há muitas formas de somar</h2>
        <p className="block__lead">Nem toda contribuição é financeira. Cada parceiro oferece o que faz bem, e a proposta é combinada individualmente.</p>
        <div className="modes">
          {MODALIDADES.map(([title, text]) => <div className="mode" key={title}><h3>{title}</h3><p>{text}</p></div>)}
        </div>
        {partners.length > 0 && (
          <div className="logos" aria-label="Parceiros da CommuniCALI">
            <div className="logos__track">
              {[...partners, ...partners].map((partner, index) => (
                <a key={`${partner.id}-${index}`} href={partner.site_url || undefined} target="_blank" rel="noopener noreferrer" aria-hidden={index >= partners.length} title={partner.nome}>
                  {partner.logo_url ? <img src={partner.logo_url} alt={partner.nome} /> : <span>{partner.nome}</span>}
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="hero__actions">
          <a className="pill" href={PARTNER_FORM_URL}>Enviar proposta de parceria</a>
          <a className="link" href={PARTNER_DECK_URL} target="_blank" rel="noopener noreferrer">Ver a apresentação</a>
        </div>
      </section>

      <section className="wrap block">
        <h2>Perguntas frequentes</h2>
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
