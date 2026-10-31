import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { COMMUNITY_URL, PARTNER_DECK_URL, PARTNER_FORM_URL, formatDate, supabase } from '../lib';

type EditionRow = { id: string; slug: string; numero: number | null; titulo: string; data_evento: string; horario: string; local: string; cidade: string; endereco: string | null; capa_url: string | null; resumo: string | null; fotos_url: string | null; inscricao_url: string | null };
type Photo = { id: string; url: string; legenda: string | null };
type Partner = { id: string; nome: string; logo_url: string | null; site_url: string | null };

const MODALIDADES = [
  ['Experiência', 'Cafés, alimentação, espaços, acolhimento e vivências.'],
  ['Produção', 'Gráfica, papelaria, fotografia, vídeo, tecnologia e brindes.'],
  ['Conhecimento', 'Conteúdo, facilitação, mentoria e ferramentas de RH e liderança.'],
  ['Rede e comunidade', 'Conexões, divulgação e apresentações institucionais.'],
];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const longDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
const dayMonth = (iso: string) => {
  const date = new Date(`${iso}T12:00:00Z`);
  return { day: String(date.getUTCDate()).padStart(2, '0'), month: new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '') };
};

function Hero({ photos }: { photos: Photo[] }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % photos.length), 5000);
    return () => window.clearInterval(timer);
  }, [photos.length]);

  return (
    <header className={`hero${photos.length ? ' hero--photos' : ''}`}>
      {photos.map((photo, index) => <img key={photo.id} className={`hero__slide${index === current ? ' is-on' : ''}`} src={photo.url} alt={photo.legenda || ''} />)}
      <nav className="topbar wrap">
        <a href="#o-que-e">A comunidade</a>
        <a href="#proximo">Próximo encontro</a>
        <a href="#edicoes">Edições</a>
        <a href="#parceiros">Parceiros</a>
      </nav>
      <div className="wrap hero__body">
        <img className="hero__logo" src="/brand/communicali-branco.png" alt="CommuniCALI" />
        <p className="hero__sign">Café & Pessoas</p>
        <h1>Falar de pessoas <em>pode mudar o mundo.</em></h1>
        <a className="button button--light" href="#fazer-parte">Quero fazer parte</a>
      </div>
      {photos.length > 1 && (
        <div className="hero__dots">
          {photos.map((photo, index) => <button key={photo.id} type="button" aria-label={`Foto ${index + 1}`} className={index === current ? 'is-on' : ''} onClick={() => setCurrent(index)} />)}
        </div>
      )}
    </header>
  );
}

function NextEdition({ edition }: { edition: EditionRow | null }) {
  if (!edition) {
    return (
      <div className="next next--empty">
        <h3>A próxima data sai em breve</h3>
        <p>Quem está no grupo da comunidade fica sabendo primeiro.</p>
      </div>
    );
  }
  const { day, month } = dayMonth(edition.data_evento);
  return (
    <article className="next">
      <div className="next__cover" style={edition.capa_url ? { backgroundImage: `url(${edition.capa_url})` } : undefined}>
        <span className="next__date"><strong>{day}</strong>{month}</span>
        {!edition.capa_url && <img src="/brand/communicali-branco.png" alt="" />}
      </div>
      <div className="next__body">
        <p className="eyebrow">{edition.numero ? `${edition.numero}ª edição` : 'Próximo encontro'}</p>
        <h3>{edition.titulo}</h3>
        <dl className="facts">
          <div><dt>Data</dt><dd>{longDate(edition.data_evento)}</dd></div>
          <div><dt>Horário</dt><dd>{edition.horario}</dd></div>
          <div><dt>Local</dt><dd>{edition.local}</dd></div>
          <div><dt>Endereço</dt><dd>{[edition.endereco, edition.cidade].filter(Boolean).join(', ')}</dd></div>
        </dl>
        {edition.inscricao_url
          ? <a className="button" href={edition.inscricao_url}>Quero me inscrever</a>
          : <p className="next__closed">As inscrições desta edição estão encerradas. Entre na comunidade para saber da próxima.</p>}
      </div>
    </article>
  );
}

export function Home() {
  const [qr, setQr] = useState('');
  const [editions, setEditions] = useState<EditionRow[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [members, setMembers] = useState(0);

  useEffect(() => {
    QRCode.toDataURL(COMMUNITY_URL, { width: 360, margin: 1, color: { dark: '#5A1E2D', light: '#FFFFFF' } }).then(setQr);
    supabase.from('editions').select('id,slug,numero,titulo,data_evento,horario,local,cidade,endereco,capa_url,resumo,fotos_url,inscricao_url').eq('publica', true).order('data_evento').then(({ data }) => setEditions((data || []) as EditionRow[]));
    supabase.from('edition_photos').select('id,url,legenda').eq('no_carrossel', true).order('ordem').then(({ data }) => setPhotos((data || []) as Photo[]));
    supabase.from('partners').select('id,nome,logo_url,site_url').eq('ativo', true).order('ordem').then(({ data }) => setPartners((data || []) as Partner[]));
    supabase.rpc('communicali_membros').then(({ data }) => setMembers(Number(data) || 0));
  }, []);

  const next = editions.find((edition) => edition.data_evento >= today()) || null;
  const past = editions.filter((edition) => edition.data_evento < today()).reverse();

  return (
    <div className="home">
      <Hero photos={photos} />

      <section className="band" id="o-que-e">
        <div className="wrap story">
          <div className="story__title">
            <p className="eyebrow">A comunidade</p>
            <h2>Relações que continuam depois do café</h2>
          </div>
          <div className="story__text">
            <p className="story__lead">A CommuniCALI é uma comunidade para quem se interessa por gente: profissionais de RH, lideranças, empresários, empreendedores e todas as pessoas que querem falar de gestão e desenvolvimento humano.</p>
            <h3>De onde veio a ideia</h3>
            <p>Ela nasceu nos canais digitais, do cansaço com conversas superficiais, contatos de conveniência e grupos onde só se anunciam vagas. Foi dentro do próprio grupo que surgiu a vontade de sair da tela e se encontrar: escutar, aprender e debater assuntos difíceis com respeito, inclusive quando as opiniões não batem.</p>
            <h3>Como ela se liga à CALI RH</h3>
            <p>Quem organiza é a CALI RH, fundada por Patrícia Lima, executiva de RH com mais de 15 anos de trajetória. O trabalho da CALI liga a gestão de pessoas às decisões do negócio sem perder a responsabilidade humana. A comunidade leva essa conversa para a mesa do café, e ali ninguém está vendendo nada.</p>
          </div>
        </div>
      </section>

      <section className="wrap section" id="fazer-parte">
        <div className="section__head">
          <p className="eyebrow">Como fazer parte</p>
          <h2>Escolha por onde entrar</h2>
        </div>
        <div className="cards">
          <article className="card">
            <h3>Comunidade</h3>
            <p>As conversas acontecem no grupo do WhatsApp. Aponte a câmera para o QR Code ou use o botão.</p>
            {qr && <img className="card__qr" src={qr} alt="QR Code do grupo da comunidade" />}
            <a className="button" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>
          </article>
          <article className="card">
            <h3>Encontros</h3>
            <p>Apresentações pessoais, rodas de conversa, troca de experiências e debates presenciais em Curitiba e região metropolitana.</p>
            <a className="button" href="#proximo">Ver o próximo encontro</a>
          </article>
          <article className="card">
            <h3>Parceiros</h3>
            <p>Cada parceiro oferece o que faz bem, com condições e contrapartidas combinadas caso a caso.</p>
            <a className="button" href="#parceiros">Quero ser parceiro</a>
          </article>
        </div>
        {members > 0 && <p className="counter"><strong>{members.toLocaleString('pt-BR')}</strong> {members === 1 ? 'membro' : 'membros'} na CommuniCALI</p>}
      </section>

      <section className="wrap section" id="proximo">
        <div className="section__head">
          <p className="eyebrow">Agenda</p>
          <h2>Próximo encontro</h2>
        </div>
        <NextEdition edition={next} />
      </section>

      <section className="wrap section" id="edicoes">
        <div className="section__head">
          <p className="eyebrow">Edições</p>
          <h2>O que já aconteceu por aqui</h2>
        </div>
        {past.length ? (
          <div className="posts">
            {past.map((edition) => (
              <article className="post" key={edition.id}>
                <div className="post__image" style={edition.capa_url ? { backgroundImage: `url(${edition.capa_url})` } : undefined} />
                <h3>{edition.titulo}</h3>
                <p className="post__meta">{formatDate(edition.data_evento)} · {edition.local}, {edition.cidade}</p>
                {edition.resumo && <p>{edition.resumo}</p>}
                {edition.fotos_url && <a className="post__link" href={edition.fotos_url} target="_blank" rel="noopener noreferrer">Baixar as fotos</a>}
              </article>
            ))}
          </div>
        ) : <p className="section__note">O resumo e as fotos de cada edição ficam aqui. A primeira entra depois de 14 de novembro.</p>}
      </section>

      <section className="band band--wine" id="parceiros">
        <div className="wrap partners">
          <div className="section__head">
            <p className="eyebrow eyebrow--light">Parceiros</p>
            <h2>Há muitas formas de somar</h2>
            <p>A CommuniCALI procura quem queira construir junto, e nem toda contribuição é financeira. Cada proposta é combinada individualmente.</p>
          </div>
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
          <div className="actions">
            <a className="button button--light" href={PARTNER_FORM_URL}>Enviar proposta de parceria</a>
            <a className="button button--line" href={PARTNER_DECK_URL} target="_blank" rel="noopener noreferrer">Ver a apresentação</a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footer__row">
          <img src="/brand/communicali-bordo.png" alt="CommuniCALI" />
          <div>
            <p className="footer__faith">Toda honra a Deus!</p>
            <p>Organização <a href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a> · <a href="mailto:contato@calirh.com">contato@calirh.com</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
