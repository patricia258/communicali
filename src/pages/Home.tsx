import { ConteudoSiteProvider, TextoSite, useConteudoSite } from '../components/ConteudoSite';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { COMMUNITY_URL, PARTNER_FORM_URL, formatDate, supabase } from '../lib';
import { EDITION_FIELDS, longDate, signupHref, type EditionRow } from './Edicao';
import { HnFooter } from '../components/HnFooter';
import { Abertura } from '../components/Abertura';
import { Compartilhar } from '../components/Compartilhar';
import '../home-nova.css';
import '../home-programa.css';

type Partner = { id: string; nome: string; logo_url: string | null; site_url: string | null };

const FORMATOS = [
  ['Presenciais', 'Cafés e conversas olho no olho, em Curitiba e região.'],
  ['Virtuais', 'Online, para quem está em qualquer lugar do Brasil. Tem lugar para todo mundo!'],
  ['Experiências', 'Vivências, visitas e palestras que mudam a forma de enxergar.'],
  ['Almoços e jantares', 'Papo bom à mesa, em grupos pequenos.'],
];

const SELOS = [
  ['convidado', 'Convidado', 'Chega por convite de alguém da comunidade'],
  ['visitante', 'Visitante', 'Chega por interesse próprio'],
  ['membro', 'Membro', 'Faz parte da comunidade'],
  ['conector', 'Conector', 'Faz as pontes entre as pessoas'],
  ['embaixador', 'Embaixador', 'Leva a comunidade mais longe'],
];

const PARCERIAS = [
  ['Experiência', 'Vivências e momentos que ficam na memória.'],
  ['Produção', 'Estrutura e cuidado para o encontro acontecer.'],
  ['Conhecimento', 'Conteúdo e troca que abrem a cabeça.'],
  ['Rede e comunidade', 'Conexões que continuam depois do encontro.'],
];

const FAQ = [
  ['Fazer parte da comunidade é gratuito?', 'É sim, e continua sendo!'],
  ['Todos os eventos são gratuitos?', 'Nem todos. Alguns são, outros não. O valor de cada edição fica sempre na página dela, para você se programar.'],
  ['Preciso ser de RH para participar?', 'Não! A base da comunidade é de gente de RH e da área administrativa, mas líderes, empreendedores e especialistas de qualquer área são muito bem-vindos, do estágio à transição de carreira.'],
  ['A comunidade é só de Curitiba?', 'Não. O grupo reúne gente do Brasil inteiro. Os encontros presenciais é que começam por Curitiba.'],
  ['Posso divulgar vagas e meus serviços?', 'Pode! O grupo também existe para isso, com respeito às regras de participação.'],
  ['Como participo de um encontro?', 'Entre no grupo da comunidade e se inscreva. Cada edição é divulgada lá, com data, local e link de inscrição.'],
  ['Quantas vezes posso ir a um encontro sem fazer parte da comunidade?', 'Até 2 vezes, em encontros abertos e gratuitos. Só conta a visita em que você fez o check-in. Se alguém da comunidade chamou você, entra como Convidado. Se veio por vontade própria, entra como Visitante, e as duas somam no mesmo contador. Depois da primeira visita você já pode pedir para fazer parte. Depois da segunda, para continuar nos encontros abertos e gratuitos, é preciso fazer parte.'],
  ['Ir a um encontro me faz parte da comunidade?', 'Não automaticamente. Depois da primeira visita você já pode pedir para fazer parte, e o pedido passa pelo cadastro, pelo aceite das regras e pela análise da organização.'],
];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const diaMes = (iso: string) => iso.slice(8, 10) + '.' + iso.slice(5, 7);

const reduzido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** "A comunidade": quatro círculos finos que se sobrepõem no meio, um por formato, na mesma posição dos quatro blocos. São elementos HTML (animados só com transform e opacity, no compositor) e não mudam a altura da seção. */
const CIRCULOS: Array<[number, number, string]> = [[12.5, 12.5, '#5A1E2D'], [38.5, 12.5, '#8DB1D1'], [12.5, 38.5, '#8DB1D1'], [38.5, 38.5, '#5A1E2D']];
function Formatos() {
  const conteudo = useConteudoSite();
  const [foco, setFoco] = useState<number | null>(null);
  const [visto, setVisto] = useState(reduzido());
  const secao = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reduzido() || !secao.current || !('IntersectionObserver' in window)) { setVisto(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); obs.disconnect(); } }, { threshold: 0.25 });
    obs.observe(secao.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section className="hn-exp" id="comunidade" ref={secao}>
      <p className="hn-eyebrow"><TextoSite id="texto_001">A COMUNIDADE</TextoSite></p>
      <h2><TextoSite id="texto_002">Quatro jeitos de se encontrar, </TextoSite><em><TextoSite id="texto_003">um só propósito: conectar pessoas.</TextoSite></em></h2>
      <div className={`hn-exp__orbitas${visto ? ' is-in' : ''}`} aria-hidden="true">
        <div className="hn-exp__quadro">
          {CIRCULOS.map(([x, y, cor], i) => <span key={i} className={`hn-exp__orbita hn-exp__orbita--${i + 1}${foco === i ? ' is-foco' : ''}`} style={{ left: `${x}%`, top: `${y}%`, borderColor: cor, transitionDelay: `${i * 180}ms` }} />)}
          <span className="hn-exp__miolo" />
        </div>
      </div>
      <div className="hn-exp__grid">
        {FORMATOS.map((item, i) => [conteudo['formatos_'+i+'_0'] || item[0], conteudo['formatos_'+i+'_1'] || item[1]]).map(([titulo, texto], i) => <div key={titulo} className={foco === i ? 'is-foco' : ''} onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}><h3>{titulo}</h3><p>{texto}</p></div>)}
      </div>
    </section>
  );
}

/** Conta de 0 ao valor em 1,4 s quando entra na tela (sem animação se a pessoa pediu menos movimento). */
function Contador({ ate }: { ate: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(reduzido() ? ate : 0);
  useEffect(() => {
    if (reduzido() || !ref.current || !('IntersectionObserver' in window)) { setN(ate); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const passo = (t: number) => { const p = Math.min(1, (t - t0) / 1400); setN(Math.round(ate * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    }, { threshold: 0.4 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ate]);
  return <span ref={ref}><TextoSite id="texto_004">+</TextoSite>{n}</span>;
}

const MAPA = (e: { local: string; endereco?: string | null; cidade: string }) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.local, e.endereco, e.cidade].filter(Boolean).join(', '))}`;

function Linha({ edition, encerrada, aberto, alternar }: { edition: EditionRow; encerrada: boolean; aberto: boolean; alternar: () => void }) {
  const inscricao = signupHref(edition);
  return (
    <article className={`hn-item${aberto ? ' is-open' : ''}`} id={edition.slug}>
      <div className={`hn-row${encerrada ? ' is-past' : ''}`}>
        <div className="hn-row__date">{diaMes(edition.data_evento)}<small>{edition.data_evento.slice(0, 4)}{encerrada ? ' · ENCERRADA' : ''}</small></div>
        <div className="hn-row__info"><h3>{edition.titulo}</h3><p>{edition.cidade}<TextoSite id="texto_005"> · </TextoSite>{edition.horario}</p></div>
        <div className="hn-row__value">{encerrada ? (edition.valor_texto || 'Encerrada') : 'A definir'}<small>{encerrada ? 'Resumo e fotos na edição' : 'Valor divulgado com a edição'}</small></div>
        <button type="button" className="hn-circ" aria-expanded={aberto} aria-controls={`det-${edition.slug}`} aria-label={`${aberto ? 'Fechar' : 'Ver'} detalhes de ${edition.titulo}`} onClick={alternar}><span className="hn-plus" aria-hidden="true" /></button>
      </div>
      <div className="hn-detail" id={`det-${edition.slug}`} role="region" aria-label={`Detalhes de ${edition.titulo}`}>
        <div className="hn-detail__in">
          <div className="hn-detail__foto" role="img" aria-label={`Local do encontro: ${edition.local}`} style={{ backgroundImage: `url(${edition.capa_url || '/fotos/legacy-coffee.jpg'})` }}>
            <span className="hn-detail__tag"><TextoSite id="texto_006">Encontro aberto</TextoSite></span>
          </div>
          <div className="hn-detail__corpo">
            <dl>
              <div><dt><TextoSite id="texto_007">Quando</TextoSite></dt><dd>{longDate(edition.data_evento)}<TextoSite id="texto_008">, </TextoSite>{edition.horario}</dd></div>
              <div><dt><TextoSite id="texto_009">Onde</TextoSite></dt><dd><a className="hn-detail__local" href={MAPA(edition)} target="_blank" rel="noopener noreferrer">{edition.local}<TextoSite id="texto_010">, </TextoSite>{edition.cidade}</a></dd></div>
              {edition.endereco && <div><dt><TextoSite id="texto_011">Endereço</TextoSite></dt><dd><a className="hn-detail__local" href={MAPA(edition)} target="_blank" rel="noopener noreferrer">{edition.endereco}</a></dd></div>}
              {(!encerrada || edition.valor_texto) && <div><dt><TextoSite id="texto_012">Valor</TextoSite></dt><dd>{edition.valor_texto || 'A definir, divulgado com a edição'}</dd></div>}
            </dl>
            <div className="hn-detail__acoes">
              {encerrada
                ? <a className="hn-pill" href={`/e/${edition.slug}`}><TextoSite id="texto_013">Ver como foi</TextoSite></a>
                : inscricao ? <a className="hn-pill" href={inscricao}><TextoSite id="texto_014">Garantir minha vaga</TextoSite></a> : <a className="hn-pill" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer"><TextoSite id="texto_015">Entrar no grupo</TextoSite></a>}
              <a className="hn-pill hn-pill--line-ink" href={MAPA(edition)} target="_blank" rel="noopener noreferrer"><TextoSite id="texto_016">Como chegar</TextoSite></a>
              <Compartilhar slug={edition.slug} titulo={edition.titulo} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function LinhaEmBreve() {
  return (
    <article className="hn-item">
      <div className="hn-row">
        <div className="hn-row__date"><TextoSite id="texto_017">Em breve</TextoSite><small><TextoSite id="texto_018">DATA A DEFINIR</TextoSite></small></div>
        <div className="hn-row__info"><h3><TextoSite id="texto_019">Próximo encontro</TextoSite></h3><p><TextoSite id="texto_020">Curitiba e região</TextoSite></p></div>
        <div className="hn-row__value"><TextoSite id="texto_021">A definir</TextoSite><small><TextoSite id="texto_022">Valor divulgado com a edição</TextoSite></small></div>
        <button type="button" className="hn-circ" disabled aria-label="Detalhes disponíveis quando a data e o local forem definidos"><span className="hn-plus" aria-hidden="true" /></button>
      </div>
    </article>
  );
}


type Embaixador = { id: string; nome: string; cargo: string; foto_url: string };

/** Carrossel que se arrasta. Só aparece quando existe ao menos um embaixador com foto. */
function Embaixadores({ lista }: { lista: Embaixador[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [prog, setProg] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const arrasto = useRef<{ x: number; rolagem: number } | null>(null);
  useEffect(() => {
    const el = trilho.current;
    if (!el || reduzido() || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      el.scrollTo({ left: 40, behavior: 'smooth' });
      setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 600);
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [lista.length]);
  if (!lista.length) return null;
  const aoRolar = () => { const el = trilho.current; if (el) setProg(el.scrollWidth > el.clientWidth ? el.scrollLeft / (el.scrollWidth - el.clientWidth) : 1); };
  return (
    <section className="hn-emb" aria-label="Embaixadores">
      <div className="hn-emb__cab">
        <div><p className="hn-eyebrow"><TextoSite id="texto_023">EMBAIXADORES</TextoSite></p><h2><TextoSite id="texto_024">Faça parte desse ecossistema.</TextoSite></h2></div>
        <span className="hn-emb__dica" aria-hidden="true"><i /><TextoSite id="texto_025">Arraste </TextoSite><b><TextoSite id="texto_026">→</TextoSite></b></span>
      </div>
      <div
        className="hn-emb__trilho" ref={trilho} onScroll={aoRolar}
        onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })} onMouseLeave={() => { setCursor(null); arrasto.current = null; }}
        onMouseDown={(e) => { arrasto.current = { x: e.clientX, rolagem: trilho.current?.scrollLeft || 0 }; }}
        onMouseUp={() => { arrasto.current = null; }}
        onMouseMoveCapture={(e) => { if (arrasto.current && trilho.current) trilho.current.scrollLeft = arrasto.current.rolagem - (e.clientX - arrasto.current.x); }}
      >
        {lista.map((p) => (
          <article className="hn-emb__card" key={p.id}>
            <div className="hn-emb__foto" role="img" aria-label={`Foto de ${p.nome}`} style={{ backgroundImage: `url(${p.foto_url})` }} />
            <h3>{p.nome}</h3><p>{p.cargo}</p>
          </article>
        ))}
      </div>
      <div className="hn-emb__linha" aria-hidden="true"><span style={{ width: `${Math.max(12, prog * 100)}%`, marginLeft: `${prog * (100 - Math.max(12, prog * 100))}%` }} /></div>
      {cursor && <span className="hn-emb__bolha" style={{ left: cursor.x, top: cursor.y }} aria-hidden="true"><TextoSite id="texto_027">Arraste</TextoSite></span>}
    </section>
  );
}

const Destaque = ({ children }: { children: ReactNode }) => <mark className="hn-hl">{children}</mark>;

function Manifesto() {
  return (
    <section className="hn-manifesto" id="manifesto" aria-label="A comunidade">
      <figure className="hn-manifesto__foto">
        <div className="hn-manifesto__img" role="img" aria-label="Patrícia Lima, fundadora da CALI RH e idealizadora da ComuniCALI">
          <a className="hn-manifesto__in" href="https://www.linkedin.com/in/patriciaazumi/" target="_blank" rel="noopener noreferrer" aria-label="Patrícia Lima no LinkedIn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 8.5H3V21h3.5V8.5ZM4.75 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM21 13.6c0-3.3-1.8-5.4-4.6-5.4-1.5 0-2.7.7-3.4 1.8V8.5H9.7V21h3.5v-6.6c0-1.9.9-3 2.4-3 1.4 0 2 .9 2 2.8V21H21v-7.4Z" /></svg>
          </a>
          <div className="hn-manifesto__legenda"><strong><TextoSite id="texto_028">Patrícia Lima</TextoSite></strong><span><TextoSite id="texto_029">Fundadora da CALI RH e idealizadora da ComuniCALI.</TextoSite></span></div>
        </div>
      </figure>
      <div className="hn-manifesto__texto">
        <p className="hn-eyebrow"><TextoSite id="texto_030">A COMUNIDADE</TextoSite></p>
        <h2><TextoSite id="texto_031">Gente que se encontra e segue junta.</TextoSite></h2>
        <p className="hn-manifesto__p"><TextoSite id="texto_032">A ComuniCALI reúne quem se interessa por </TextoSite><Destaque><TextoSite id="texto_033">gente</TextoSite></Destaque><TextoSite id="texto_034">. Cada pessoa chega com a sua </TextoSite><Destaque><TextoSite id="texto_035">bagagem</TextoSite></Destaque><TextoSite id="texto_036">, e quando escutamos alguém, descobrimos </TextoSite><Destaque><TextoSite id="texto_037">caminhos</TextoSite></Destaque><TextoSite id="texto_038"> que nunca percorreríamos sozinhos. Acreditamos que nenhum encontro acontece por acaso. Servimos às pessoas com </TextoSite><Destaque><TextoSite id="texto_039">fé e integridade</TextoSite></Destaque><TextoSite id="texto_040">, e damos </TextoSite><Destaque><TextoSite id="texto_041">toda honra a Deus</TextoSite></Destaque><TextoSite id="texto_042"> por cada caminho que se cruza aqui.</TextoSite></p>
        <blockquote className="hn-manifesto__citacao"><p><TextoSite id="texto_043">“Assim como tudo na minha vida, a ideia da ComuniCALI nasceu de uma oportunidade de fazer algo bom acontecer, juntar gente boa e falar de temas relevantes.”</TextoSite></p><cite><TextoSite id="texto_044">Patrícia Lima</TextoSite></cite></blockquote>
      </div>
    </section>
  );
}

function HomeConteudo() {
  const conteudo = useConteudoSite();
  const [editions, setEditions] = useState<EditionRow[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'ComuniCALI | Comunidade de pessoas e RH';
    supabase.from('editions').select(EDITION_FIELDS).eq('publica', true).order('data_evento').then(({ data }) => setEditions((data || []) as EditionRow[]));
    supabase.from('partners').select('id,nome,logo_url,site_url').eq('ativo', true).order('ordem').then(({ data }) => setPartners((data || []) as Partner[]));
  }, []);

  // Aparece suavemente ao entrar na tela (uma vez só); sem isso a página continua visível.
  useEffect(() => {
    const itens = Array.from(document.querySelectorAll<HTMLElement>('.hn-exp__grid > div, .hn-prog h2, .hn-prog__passos li, .hn-band > div, .hn-item, .hn-entrar > div, .hn-idx, .hn-par__itens > div, .hn-faq details, .hn-selos h2, .hn-agenda h2, .hn-prev h2, .hn-par h2, .hn-manifesto__foto, .hn-manifesto__texto, .hn-emb__cab, .hn-emb__card'));
    if (reduzido() || !('IntersectionObserver' in window)) { itens.forEach((el) => el.classList.add('is-in')); return; }
    itens.forEach((el) => { el.classList.add('hn-reveal'); const irmaos = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0; el.style.setProperty('--d', `${Math.min(irmaos, 5) * 90}ms`); });
    const obs = new IntersectionObserver((entradas) => entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); } }), { threshold: 0.12 });
    itens.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [editions, partners]);

  // Selos: o giro começa quando a fila está bem à vista, um selo depois do outro.
  useEffect(() => {
    const lista = document.querySelector<HTMLElement>('.hn-selos__lista');
    if (!lista) return;
    if (reduzido() || !('IntersectionObserver' in window)) { lista.classList.add('is-spin'); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { lista.classList.add('is-spin'); obs.disconnect(); } }, { threshold: 0.6 });
    obs.observe(lista);
    return () => obs.disconnect();
  }, []);

  // Embaixadores: ainda não há fonte de dados com foto; a seção fica oculta até existir ao menos um.
  const embaixadores: Embaixador[] = [];
  const upcoming = editions.filter((e) => e.data_evento >= today());
  const past = editions.filter((e) => e.data_evento < today()).reverse();
  const joinHref = '/f/quero-ser-membro';

  return (
    <div className="hn">
      <Abertura />
      <header className="hn-hero">
        <nav className="hn-nav" aria-label="Principal">
          <a href="/" className="hn-nav__logo"><img src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" /></a>
          <div className="hn-nav__links">
            <a href="#comunidade"><TextoSite id="texto_045">Comunidade</TextoSite></a>
            <a href="#agenda"><TextoSite id="texto_046">Agenda</TextoSite></a>
            <a href="#parceiros"><TextoSite id="texto_047">Parceiros</TextoSite></a>
            <a className="hn-nav__membro" href="/meu-passaporte"><TextoSite id="texto_048">Minha área</TextoSite></a>
            <a className="hn-pill" href={joinHref}><TextoSite id="texto_049">Registrar interesse</TextoSite></a>
          </div>
        </nav>
        <h1 aria-label={`${conteudo.hero_titulo || 'Falar de pessoas pode'} ${conteudo.hero_destaque || 'mudar o mundo.'}`}>
          {(conteudo.hero_titulo || 'Falar de pessoas pode').split(' ').map((p, i) => <span className="hn-w" style={{ ['--i' as string]: i }} aria-hidden="true" key={p + i}>{p} </span>)}
          <em aria-hidden="true">{(conteudo.hero_destaque || 'mudar o mundo.').split(' ').map((p, i) => <span className="hn-w" style={{ ['--i' as string]: i + 4 }} key={p}>{p} </span>)}</em>
        </h1>
        <div className="hn-hero__stage">
          <div className="hn-hero__photo" style={conteudo.foto_abertura ? { backgroundImage: `url("${conteudo.foto_abertura}")` } : undefined} role="img" aria-label="Pessoas conversando em um encontro presencial da ComuniCALI" />
          <p className="hn-hero__tag"><TextoSite id="texto_050">Uma comunidade para unir.</TextoSite></p>
          <div className="hn-hero__card">
            <strong><TextoSite id="texto_051">Cada pessoa chega com a sua bagagem.</TextoSite></strong>
            <span><TextoSite id="texto_052">Quando histórias diferentes se encontram, novos caminhos aparecem.</TextoSite></span>
          </div>
          <div className="hn-hero__acts">
            <a className="hn-pill hn-pill--white" href="#agenda"><TextoSite id="texto_053">Ver a agenda</TextoSite></a>
            <a className="hn-pill hn-pill--bordo" href={joinHref}><TextoSite id="texto_054">Registrar interesse</TextoSite></a>
          </div>
        </div>
      </header>

      <Formatos />

      <section className="hn-band" aria-label="Passaporte, encontros e jornada">
        <div className="hn-band__passaporte">
          <h3><TextoSite id="texto_055">Seu passaporte</TextoSite></h3>
          <p><TextoSite id="texto_056">Carimbos, selos e milhas de quem faz parte da comunidade. Cada encontro é uma parada na sua jornada!</TextoSite></p>
          <a className="hn-pill hn-pill--line" href="#selos"><TextoSite id="texto_057">Conhecer</TextoSite></a>
        </div>
        <div className="hn-band__foto">
          <div className="hn-band__foto-img" aria-hidden="true" />
          <div className="hn-band__foto-txt">
            <h3><TextoSite id="texto_058">Encontros</TextoSite></h3>
            <p><TextoSite id="texto_059">Presenciais, online, experiências e jantares. Veja o que vem por aí e relembre os anteriores!</TextoSite></p>
            <a className="hn-pill hn-pill--line" href="#agenda"><TextoSite id="texto_060">Ver agenda</TextoSite></a>
          </div>
        </div>
        <div className="hn-band__rota">
          <svg viewBox="0 0 480 600" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
            <defs><mask id="hn-rota-mask"><path className="hn-draw" d="M40 580 C 40 450, 240 490, 240 350 S 400 210, 450 30" stroke="#fff" strokeWidth="8" pathLength="1" strokeDasharray="1" strokeDashoffset="1" /></mask></defs>
            <g mask="url(#hn-rota-mask)"><path d="M40 580 C 40 450, 240 490, 240 350 S 400 210, 450 30" stroke="#F5F1EB" strokeWidth="1.4" strokeDasharray="6 7" opacity=".5" /></g>
          </svg>
          <div className="hn-grupo">
            <h3><TextoSite id="texto_061">Grupo da comunidade</TextoSite></h3>
            <strong className="hn-grupo__num"><Contador ate={300} /></strong>
            <p className="hn-grupo__lead"><TextoSite id="texto_062">pessoas do Brasil inteiro, no grupo e nos encontros.</TextoSite></p>
            <p className="hn-grupo__txt"><TextoSite id="texto_063">É onde o papo continua entre um encontro e outro: vagas, contatos, dúvidas e muita troca!</TextoSite></p>
            <a className="hn-pill hn-pill--white" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer"><TextoSite id="texto_064">Entrar no grupo</TextoSite></a>
          </div>
        </div>
      </section>

      <Manifesto />

      <section className="hn-selos" id="selos">
        <div className="hn-selos__topo">
          <h2><TextoSite id="texto_065">Os selos contam o seu caminho.</TextoSite></h2>
          <p><TextoSite id="texto_066">Como convidado ou visitante, você dá o primeiro passo dentro da comunidade. Já membros, conectores e embaixadores vivem a evolução da sua jornada.</TextoSite></p>
        </div>
        <ul className="hn-selos__lista">
          {SELOS.map((item, i) => [item[0], item[1], conteudo['selos_'+i+'_2'] || item[2]]).map(([id, nome, frase], i) => <li key={id} style={{ ['--s' as string]: `${i * 220}ms` }}><img src={`/selos/novo/${id}.svg`} alt={`Selo ${nome}: ${frase.toLowerCase()}`} /><small>{frase}</small></li>)}
        </ul>
      </section>

      <section className="hn-prog" id="programa" aria-label="Sua jornada">
        <h2><TextoSite id="texto_067">Sua jornada.</TextoSite></h2>
        <ol className="hn-prog__passos">
          <li><div className="hn-prog__topo"><b><TextoSite id="texto_068">1</TextoSite></b><i className="hn-prog__seta" aria-hidden="true"><ArrowUpRight size={18} strokeWidth={1.8} /></i></div><h3><TextoSite id="texto_069">Visite</TextoSite></h3><p><strong><TextoSite id="texto_070">Venha até 2 vezes</TextoSite></strong><TextoSite id="texto_071"> como Visitante ou Convidado, em encontros abertos e gratuitos. Só conta a visita com check-in.</TextoSite></p></li>
          <li><div className="hn-prog__topo"><b><TextoSite id="texto_072">2</TextoSite></b><i className="hn-prog__seta" aria-hidden="true"><ArrowUpRight size={18} strokeWidth={1.8} /></i></div><h3><TextoSite id="texto_073">Faça parte</TextoSite></h3><p><TextoSite id="texto_074">Gostou? Depois da primeira visita, é só solicitar para fazer parte da comunidade. </TextoSite><strong><TextoSite id="texto_075">É gratuito</TextoSite></strong><TextoSite id="texto_076">, e a gente vai analisar e entrar em contato.</TextoSite></p></li>
          <li><div className="hn-prog__topo"><b><TextoSite id="texto_077">3</TextoSite></b><i className="hn-prog__seta" aria-hidden="true"><ArrowUpRight size={18} strokeWidth={1.8} /></i></div><h3><TextoSite id="texto_078">Acumule milhas</TextoSite></h3><p><TextoSite id="texto_079">As milhas começam quando você entra, ou seja, como membro. Contam presença, convites e comparecimentos, experiências e conteúdos aprovados, parceiros indicados, entre outros.</TextoSite></p></li>
          <li><div className="hn-prog__topo"><b><TextoSite id="texto_080">4</TextoSite></b><i className="hn-prog__seta" aria-hidden="true"><ArrowUpRight size={18} strokeWidth={1.8} /></i></div><h3><TextoSite id="texto_081">Evolua</TextoSite></h3><p><TextoSite id="texto_082">Conectores e Embaixadores são membros, profissionais que mais contribuem. A evolução vem de vários indicadores.</TextoSite></p></li>
        </ol>
      </section>

      <section className="hn-agenda" id="agenda">
        <div className="hn-agenda__head">
          <h2><TextoSite id="texto_083">Próximos encontros.</TextoSite></h2>
          <p><TextoSite id="texto_084">Pode chegar! As inscrições e os avisos saem primeiro no grupo da comunidade.</TextoSite></p>
        </div>
        <div className="hn-rows">
          {upcoming.length ? upcoming.map((e) => <Linha key={e.id} edition={e} encerrada={false} aberto={aberta === e.id} alternar={() => setAberta(aberta === e.id ? null : e.id)} />) : <LinhaEmBreve />}
        </div>
      </section>

      <Embaixadores lista={embaixadores} />

      <section className="hn-entrar" id="como-entrar" aria-label="Como entrar">
        <div className="hn-entrar__a">
          <span><TextoSite id="texto_085">ANTES DE FAZER PARTE</TextoSite></span><h3><TextoSite id="texto_086">Conheça a comunidade</TextoSite></h3>
          <p><TextoSite id="texto_087">Venha conhecer! Você tem até 2 visitas abertas e gratuitas antes de fazer parte da comunidade.</TextoSite></p>
          <ul><li><TextoSite id="texto_088">Visitante: você chega por vontade própria</TextoSite></li><li><TextoSite id="texto_089">Convidado: alguém da comunidade chamou você</TextoSite></li><li><TextoSite id="texto_090">As duas visitas somam no mesmo contador</TextoSite></li><li><TextoSite id="texto_091">Só conta a visita com check-in</TextoSite></li><li><TextoSite id="texto_092">O valor de cada encontro está na agenda</TextoSite></li></ul>
          <a className="hn-pill" href={joinHref}><TextoSite id="texto_093">Registrar interesse</TextoSite></a>
        </div>
        <div className="hn-entrar__b">
          <span><TextoSite id="texto_094">DEPOIS DA VISITA</TextoSite></span><h3><TextoSite id="texto_095">Faça parte</TextoSite></h3>
          <p><TextoSite id="texto_096">Gostou? Depois da primeira visita, é só pedir para fazer parte da comunidade. É gratuito, e a gente analisa cada pedido com carinho.</TextoSite></p>
          <ul><li><TextoSite id="texto_097">Meu passaporte: carimbos, selos e milhas</TextoSite></li><li><TextoSite id="texto_098">A Rede da comunidade</TextoSite></li><li><TextoSite id="texto_099">Convidar gente para os encontros</TextoSite></li><li><TextoSite id="texto_100">Sempre gratuito</TextoSite></li></ul>
          <a className="hn-pill hn-pill--white" href="/meu-passaporte"><TextoSite id="texto_101">Entrar na minha área</TextoSite></a>
        </div>
        <div className="hn-entrar__c">
          <span><TextoSite id="texto_102">CONVITE</TextoSite></span><h3><TextoSite id="texto_103">Por convite</TextoSite></h3>
          <p><TextoSite id="texto_104">Alguém da comunidade chama você e você chega como Convidado. Essa visita conta nas suas 2.</TextoSite></p>
          <ul><li><TextoSite id="texto_105">O convite não garante vaga</TextoSite></li><li><TextoSite id="texto_106">A vaga depende de inscrição e confirmação</TextoSite></li></ul>
          <a className="hn-pill hn-pill--white" href="#programa"><TextoSite id="texto_107">Como funciona</TextoSite></a>
        </div>
      </section>

      <section className="hn-prev" id="edicoes">
        <h2><TextoSite id="texto_108">Edições passadas.</TextoSite></h2>
        <p><TextoSite id="texto_109">Aqui você encontra um resumo de como foram os nossos encontros, vê uma prévia das fotos e conhece um pouquinho de cada edição.</TextoSite></p>
        <div className="hn-prev__body">
          <div className="hn-prev__foto" style={conteudo.foto_edicoes ? { backgroundImage: `url("${conteudo.foto_edicoes}")` } : undefined} role="img" aria-label="Pessoas reunidas em uma mesa de trabalho" />
          <div className="hn-prev__grid">
            {past.length ? past.map((e) => (
              <a className="hn-idx" href={`/e/${e.slug}`} key={e.id}><b>{e.numero ? `${e.numero}ª Edição` : e.titulo}</b><small>{formatDate(e.data_evento)}<TextoSite id="texto_110"> · </TextoSite>{e.cidade}<br /><TextoSite id="texto_111">Resumo e fotos</TextoSite></small></a>
            )) : <div className="hn-idx is-empty"><b><TextoSite id="texto_112">Em breve</TextoSite></b><small><TextoSite id="texto_113">As edições encerradas aparecem aqui</TextoSite></small></div>}
          </div>
        </div>
      </section>

      <section className="hn-par" id="parceiros">
        <div className="hn-par__texto">
          <h2><TextoSite id="texto_114">Apoie este encontro. Seja um parceiro.</TextoSite></h2>
          <p><TextoSite id="texto_115">Nem toda contribuição é financeira: cada parceiro oferece o que faz de melhor, e a gente combina tudo junto, um a um.</TextoSite></p>
          <a className="hn-pill" href={PARTNER_FORM_URL}><TextoSite id="texto_116">Quero ser parceiro</TextoSite></a>
        </div>
        <div className="hn-par__itens">
          {PARCERIAS.map((item, i) => [conteudo['parcerias_'+i+'_0'] || item[0], conteudo['parcerias_'+i+'_1'] || item[1]]).map(([titulo, texto], i) => <div key={titulo}><span className="hn-fr" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><p><b>{titulo}</b><span>{texto}</span></p></div>)}
        </div>
        {partners.length > 0 && (
          <div className="hn-logos" aria-label="Quem apoia a ComuniCALI">
            <div className="hn-logos__track" style={{ ['--dur' as string]: `${Math.max(14, partners.length * 4.5)}s` }}>
              {[...partners, ...partners, ...partners, ...partners].map((p, i) => {
                const oculto = i >= partners.length;
                const conteudo = p.logo_url
                  ? <span className="hn-logo" role="img" aria-label={oculto ? undefined : p.nome} style={{ ['--src' as string]: `url(${p.logo_url})` }} />
                  : <span className="hn-logos__nome">{p.nome}</span>;
                return p.site_url
                  ? <a key={`${p.id}-${i}`} className="hn-logos__item" href={p.site_url} target="_blank" rel="noopener noreferrer" title={p.nome} tabIndex={oculto ? -1 : undefined} aria-hidden={oculto ? true : undefined}>{conteudo}</a>
                  : <div key={`${p.id}-${i}`} className="hn-logos__item" aria-hidden={oculto ? true : undefined}>{conteudo}</div>;
              })}
            </div>
          </div>
        )}
      </section>

      <section className="hn-faq" aria-label="Perguntas frequentes">
        <h2><TextoSite id="texto_117">Perguntas frequentes.</TextoSite></h2>
        {FAQ.map((item, i) => [conteudo['faq_'+i+'_0'] || item[0], conteudo['faq_'+i+'_1'] || item[1]]).map(([q, a]) => <details key={q}><summary>{q}<i aria-hidden="true"><TextoSite id="texto_118">+</TextoSite></i></summary><p>{a}</p></details>)}
      </section>

      <section className="hn-inv" aria-label="Convite">
        <p><TextoSite id="texto_119">Primeira vez por aqui? Bora começar a sua jornada!</TextoSite></p>
        <a href={joinHref}><TextoSite id="texto_120">Registrar interesse</TextoSite></a>
      </section>

      <HnFooter />
    </div>
  );
}

export function Home() { return <ConteudoSiteProvider><HomeConteudo /></ConteudoSiteProvider>; }
