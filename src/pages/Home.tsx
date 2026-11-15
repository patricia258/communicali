import { useEffect, useRef, useState } from 'react';
import { COMMUNITY_URL, PARTNER_FORM_URL, formatDate, supabase } from '../lib';
import { EDITION_FIELDS, longDate, signupHref, type EditionRow } from './Edicao';
import { HnFooter } from '../components/HnFooter';
import { Abertura } from '../components/Abertura';
import { Compartilhar } from '../components/Compartilhar';
import '../home-nova.css';

type Partner = { id: string; nome: string; logo_url: string | null; site_url: string | null };

const FORMATOS = [
  ['Presenciais', 'Em Curitiba e região, com conversa e troca de experiências.'],
  ['Virtuais', 'Online, para quem está em qualquer lugar do Brasil.'],
  ['Experiências', 'Vivências, visitas e palestras que ampliam o olhar.'],
  ['Almoços e jantares', 'Conversas à mesa, em grupos menores.'],
];

const SELOS = [
  ['convidado', 'Convidado', 'Chegou a convite'],
  ['visitante', 'Visitante', 'Chegando ao caminho'],
  ['membro', 'Membro', 'Chegou e faz parte'],
  ['conector', 'Conector', 'Faz as pontes'],
  ['embaixador', 'Embaixador', 'Leva a comunidade longe'],
];

const PARCERIAS = [
  ['Experiência', 'Vivências e momentos que marcam o encontro.'],
  ['Produção', 'Estrutura e cuidado para o encontro acontecer.'],
  ['Conhecimento', 'Conteúdo e troca que ampliam o olhar.'],
  ['Rede e comunidade', 'Conexões que continuam depois do encontro.'],
];

const FAQ = [
  ['Fazer parte da comunidade é gratuito?', 'Sim. Fazer parte da ComuniCALI é gratuito.'],
  ['Todos os eventos são gratuitos?', 'Não, nem todos os eventos são gratuitos. Alguns serão, outros não. As informações de cada edição, inclusive o valor da participação, ficam sempre na página da edição.'],
  ['Preciso ser de RH para participar?', 'Não. A base da comunidade é de profissionais de RH e administrativos, e líderes, empreendedores e especialistas de qualquer área são bem-vindos, do estágio à transição de carreira.'],
  ['A comunidade é só de Curitiba?', 'Não. O grupo reúne pessoas do Brasil inteiro. Os encontros presenciais começam em Curitiba.'],
  ['Posso divulgar vagas e meus serviços?', 'Pode. O grupo também existe para isso, com respeito às regras de participação.'],
  ['Como participo de um encontro?', 'Entre no grupo da comunidade e se inscreva no encontro. Cada edição é divulgada no grupo, com data, local e link de inscrição.'],
  ['Posso ir a um encontro antes de ser Membro?', 'Pode. Você vive até 2 experiências abertas e gratuitas antes de se tornar Membro. Se um Membro convidou você, entra como Convidado. Se veio por interesse próprio, entra como Visitante. As duas somam no mesmo contador.'],
  ['Ir a um encontro me torna Membro?', 'Não automaticamente. Depois da primeira presença, você já pode pedir a adesão. O pedido passa pelo cadastro, pelo aceite das regras e pela análise da organização.'],
  ['Quanto custa ser Membro?', 'Nada. A identidade de Membro é gratuita e continua gratuita.'],
  ['Como acompanho minha participação?', 'O passaporte online é dos Membros. Depois que a sua adesão for aprovada, você entra com o e-mail cadastrado e acompanha carimbos, milhas, missões, indicações e fotos.'],
  ['Como minha empresa pode ser parceira?', 'Envie sua proposta pelo formulário de parceiros. Cada parceria é conversada e combinada individualmente.'],
];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const diaMes = (iso: string) => iso.slice(8, 10) + '.' + iso.slice(5, 7);

const reduzido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
  return <span ref={ref}>+{n}</span>;
}

const MAPA = (e: { local: string; endereco?: string | null; cidade: string }) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.local, e.endereco, e.cidade].filter(Boolean).join(', '))}`;

function Linha({ edition, encerrada, aberto, alternar }: { edition: EditionRow; encerrada: boolean; aberto: boolean; alternar: () => void }) {
  const inscricao = signupHref(edition);
  return (
    <article className={`hn-item${aberto ? ' is-open' : ''}`} id={edition.slug}>
      <div className={`hn-row${encerrada ? ' is-past' : ''}`}>
        <div className="hn-row__date">{diaMes(edition.data_evento)}<small>{edition.data_evento.slice(0, 4)}{encerrada ? ' · ENCERRADA' : ''}</small></div>
        <div className="hn-row__info"><h3>{edition.titulo}</h3><p>{edition.cidade} · {edition.horario}</p></div>
        <div className="hn-row__value">{encerrada ? 'Encerrada' : 'A definir'}<small>{encerrada ? 'Resumo e fotos na edição' : 'Valor divulgado com a edição'}</small></div>
        <button type="button" className="hn-circ" aria-expanded={aberto} aria-controls={`det-${edition.slug}`} aria-label={`${aberto ? 'Fechar' : 'Ver'} detalhes de ${edition.titulo}`} onClick={alternar}><span className="hn-plus" aria-hidden="true" /></button>
      </div>
      <div className="hn-detail" id={`det-${edition.slug}`} role="region" aria-label={`Detalhes de ${edition.titulo}`}>
        <div className="hn-detail__in">
          <div className="hn-detail__foto" role="img" aria-label={`Local do encontro: ${edition.local}`} style={{ backgroundImage: `url(${edition.capa_url || '/fotos/legacy-coffee.jpg'})` }}>
            <span className="hn-detail__tag">Encontro aberto</span>
          </div>
          <div className="hn-detail__corpo">
            <dl>
              <div><dt>Quando</dt><dd>{longDate(edition.data_evento)}, {edition.horario}</dd></div>
              <div><dt>Onde</dt><dd><a className="hn-detail__local" href={MAPA(edition)} target="_blank" rel="noopener noreferrer">{edition.local}, {edition.cidade}</a></dd></div>
              {edition.endereco && <div><dt>Endereço</dt><dd><a className="hn-detail__local" href={MAPA(edition)} target="_blank" rel="noopener noreferrer">{edition.endereco}</a></dd></div>}
              <div><dt>Valor</dt><dd>{encerrada ? 'Encerrada' : 'A definir, divulgado com a edição'}</dd></div>
            </dl>
            <div className="hn-detail__acoes">
              {encerrada
                ? <a className="hn-pill" href={`/e/${edition.slug}`}>Ver como foi</a>
                : inscricao ? <a className="hn-pill" href={inscricao}>Garantir minha vaga</a> : <a className="hn-pill" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>}
              <a className="hn-pill hn-pill--line-ink" href={MAPA(edition)} target="_blank" rel="noopener noreferrer">Como chegar</a>
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
        <div className="hn-row__date">Em breve<small>DATA A DEFINIR</small></div>
        <div className="hn-row__info"><h3>Próximo encontro</h3><p>Curitiba e região</p></div>
        <div className="hn-row__value">A definir<small>Valor divulgado com a edição</small></div>
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
        <div><p className="hn-eyebrow">EMBAIXADORES</p><h2>Faça parte desse ecossistema.</h2></div>
        <span className="hn-emb__dica" aria-hidden="true"><i />Arraste <b>→</b></span>
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
      {cursor && <span className="hn-emb__bolha" style={{ left: cursor.x, top: cursor.y }} aria-hidden="true">Arraste</span>}
    </section>
  );
}

const Destaque = ({ children }: { children: string }) => <mark className="hn-hl">{children}</mark>;

function Manifesto() {
  return (
    <section className="hn-manifesto" id="manifesto" aria-label="A comunidade">
      <figure className="hn-manifesto__foto">
        <div className="hn-manifesto__img" role="img" aria-label="Patrícia Lima, fundadora da CALI RH e idealizadora da ComuniCALI">
          <a className="hn-manifesto__in" href="https://www.linkedin.com/in/patriciaazumi/" target="_blank" rel="noopener noreferrer" aria-label="Patrícia Lima no LinkedIn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 8.5H3V21h3.5V8.5ZM4.75 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM21 13.6c0-3.3-1.8-5.4-4.6-5.4-1.5 0-2.7.7-3.4 1.8V8.5H9.7V21h3.5v-6.6c0-1.9.9-3 2.4-3 1.4 0 2 .9 2 2.8V21H21v-7.4Z" /></svg>
          </a>
        </div>
        <figcaption><strong>Patrícia Lima</strong><span>Fundadora da CALI RH e idealizadora da ComuniCALI.</span></figcaption>
      </figure>
      <div className="hn-manifesto__texto">
        <p className="hn-eyebrow">A COMUNIDADE</p>
        <h2>Caminhos que se cruzam e seguem juntos.</h2>
        <p className="hn-manifesto__p">A ComuniCALI reúne quem se interessa por <Destaque>gente</Destaque>. Cada pessoa chega com a sua <Destaque>bagagem</Destaque>, e quando escutamos alguém, descobrimos <Destaque>caminhos</Destaque> que nunca percorreríamos sozinhos.</p>
        <hr />
        <p className="hn-manifesto__p hn-manifesto__p--forte">Acreditamos que nenhum encontro acontece por acaso. Servimos às pessoas com <Destaque>fé e integridade</Destaque>, e damos <Destaque>toda honra a Deus</Destaque> por cada caminho que se cruza aqui.</p>
      </div>
    </section>
  );
}

export function Home() {
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
    const itens = Array.from(document.querySelectorAll<HTMLElement>('.hn-exp__grid > div, .hn-band > div, .hn-selos__lista li, .hn-item, .hn-entrar > div, .hn-idx, .hn-par__itens > div, .hn-faq details, .hn-selos h2, .hn-agenda h2, .hn-prev h2, .hn-par h2, .hn-manifesto__foto, .hn-manifesto__texto, .hn-emb__cab, .hn-emb__card'));
    if (reduzido() || !('IntersectionObserver' in window)) { itens.forEach((el) => el.classList.add('is-in')); return; }
    itens.forEach((el) => { el.classList.add('hn-reveal'); const irmaos = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0; el.style.setProperty('--d', `${Math.min(irmaos, 5) * 90}ms`); });
    const obs = new IntersectionObserver((entradas) => entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); } }), { threshold: 0.12 });
    itens.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [editions, partners]);

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
            <a href="#comunidade">Comunidade</a>
            <a href="#agenda">Agenda</a>
            <a href="#parceiros">Parceiros</a>
            <a className="hn-nav__membro" href="/meu-passaporte">Já sou membro</a>
            <a className="hn-pill" href={joinHref}>Registrar interesse</a>
          </div>
        </nav>
        <h1 aria-label="Falar de pessoas pode mudar o mundo.">
          {['Falar', 'de', 'pessoas', 'pode'].map((p, i) => <span className="hn-w" style={{ ['--i' as string]: i }} aria-hidden="true" key={p + i}>{p} </span>)}
          <em aria-hidden="true">{['mudar', 'o', 'mundo.'].map((p, i) => <span className="hn-w" style={{ ['--i' as string]: i + 4 }} key={p}>{p} </span>)}</em>
        </h1>
        <div className="hn-hero__stage">
          <div className="hn-hero__photo" role="img" aria-label="Pessoas conversando em um encontro presencial da ComuniCALI" />
          <p className="hn-hero__tag">Uma comunidade para unir.</p>
          <div className="hn-hero__card">
            <strong>Cada pessoa chega com a sua bagagem.</strong>
            <span>Quando histórias diferentes se encontram, novos caminhos aparecem.</span>
          </div>
          <div className="hn-hero__acts">
            <a className="hn-pill hn-pill--white" href="#agenda">Ver a agenda</a>
            <a className="hn-pill hn-pill--bordo" href={joinHref}>Registrar interesse</a>
          </div>
        </div>
      </header>

      <section className="hn-exp" id="comunidade">
        <p className="hn-eyebrow">A COMUNIDADE</p>
        <h2>Quatro jeitos de se encontrar, <em>um só propósito: conectar pessoas.</em></h2>
        <div className="hn-exp__grid">
          {FORMATOS.map(([titulo, texto]) => <div key={titulo}><h3>{titulo}</h3><p>{texto}</p></div>)}
        </div>
      </section>

      <section className="hn-band" aria-label="Passaporte, encontros e jornada">
        <div className="hn-band__passaporte">
          <h3>Seu passaporte</h3>
          <p>Para Membros: carimbos, selos e milhas. Cada encontro vira uma parada na sua jornada.</p>
          <a className="hn-pill hn-pill--line" href="#selos">Conhecer</a>
        </div>
        <div className="hn-band__foto">
          <div className="hn-band__foto-img" aria-hidden="true" />
          <div className="hn-band__foto-txt">
            <h3>Encontros</h3>
            <p>Presenciais, online, experiências e jantares. Veja o que vem aí e como foram os anteriores.</p>
            <a className="hn-pill hn-pill--line" href="#agenda">Ver agenda</a>
          </div>
        </div>
        <div className="hn-band__rota">
          <svg viewBox="0 0 480 600" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
            <defs><mask id="hn-rota-mask"><path className="hn-draw" d="M40 580 C 40 450, 240 490, 240 350 S 400 210, 450 30" stroke="#fff" strokeWidth="8" pathLength="1" strokeDasharray="1" strokeDashoffset="1" /></mask></defs>
            <g mask="url(#hn-rota-mask)"><path d="M40 580 C 40 450, 240 490, 240 350 S 400 210, 450 30" stroke="#F5F1EB" strokeWidth="1.4" strokeDasharray="6 7" opacity=".5" /></g>
          </svg>
          <div className="hn-grupo">
            <h3>Grupo da comunidade</h3>
            <strong className="hn-grupo__num"><Contador ate={300} /></strong>
            <p className="hn-grupo__lead">pessoas do Brasil inteiro, no grupo e nos encontros.</p>
            <p className="hn-grupo__txt">É onde a conversa continua entre um encontro e outro: vagas, contatos, dúvidas e experiências.</p>
            <a className="hn-pill hn-pill--white" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo</a>
          </div>
        </div>
      </section>

      <Manifesto />

      <section className="hn-selos" id="selos">
        <h2>Os selos contam o seu caminho.</h2>
        <p>Convidado e Visitante são portas de entrada. Membro, Conector e Embaixador são o seu caminho dentro da comunidade.</p>
        <ul className="hn-selos__lista">
          {SELOS.map(([id, nome, frase]) => <li key={id}><img src={`/selos/novo/${id}.svg`} alt={`Selo ${nome}: ${frase.toLowerCase()}`} /></li>)}
        </ul>
      </section>

      <section className="hn-agenda" id="agenda">
        <div className="hn-agenda__head">
          <h2>Próximos encontros.</h2>
          <p>Inscrições e avisos saem primeiro no grupo da comunidade.</p>
        </div>
        <div className="hn-rows">
          {upcoming.length ? upcoming.map((e) => <Linha key={e.id} edition={e} encerrada={false} aberto={aberta === e.id} alternar={() => setAberta(aberta === e.id ? null : e.id)} />) : <LinhaEmBreve />}
          {past.map((e) => <Linha key={e.id} edition={e} encerrada aberto={aberta === e.id} alternar={() => setAberta(aberta === e.id ? null : e.id)} />)}
        </div>
      </section>

      <Embaixadores lista={embaixadores} />

      <section className="hn-entrar" id="como-entrar" aria-label="Como entrar">
        <div className="hn-entrar__a">
          <span>ANTES DE ADERIR</span><h3>Conheça a comunidade</h3>
          <p>Você pode viver até 2 experiências abertas e gratuitas antes de se tornar Membro.</p>
          <ul><li>Visitante: você chega por interesse próprio</li><li>Convidado: um Membro convida você</li><li>As duas somam no mesmo contador</li><li>Valor de cada encontro informado na agenda</li></ul>
          <a className="hn-pill" href={joinHref}>Cadastrar meu interesse</a>
        </div>
        <div className="hn-entrar__b">
          <span>MEMBROS</span><h3>Para Membros</h3>
          <p>Ser Membro é gratuito. Depois da primeira experiência, você já pode pedir a adesão, e a organização analisa o pedido.</p>
          <ul><li>Inscrição antecipada nos encontros abertos</li><li>Pode indicar 1 convidado por encontro</li><li>Meu passaporte: carimbos, selos e milhas</li><li>Sempre gratuito</li></ul>
          <a className="hn-pill hn-pill--white" href={joinHref}>Quero ser Membro</a>
        </div>
        <div className="hn-entrar__c">
          <span>CONVITE</span><h3>Por convite</h3>
          <p>Um Membro convida você e você entra como Convidado. A presença conta nas suas 2 experiências.</p>
          <ul><li>O convite não garante vaga</li><li>A vaga depende de inscrição e confirmação</li></ul>
          <a className="hn-pill hn-pill--white" href="/termos">Como funciona</a>
        </div>
      </section>

      <section className="hn-prev" id="edicoes">
        <h2>Como foram os encontros.</h2>
        <p>O resumo e as fotos de cada edição ficam aqui depois de cada encontro.</p>
        <div className="hn-prev__body">
          <div className="hn-prev__foto" role="img" aria-label="Pessoas reunidas em uma mesa de trabalho" />
          <div className="hn-prev__grid">
            {past.length ? past.map((e) => (
              <a className="hn-idx" href={`/e/${e.slug}`} key={e.id}><b>{e.numero ? `${e.numero}ª Edição` : e.titulo}</b><small>{formatDate(e.data_evento)} · {e.cidade}<br />Resumo e fotos</small></a>
            )) : <div className="hn-idx is-empty"><b>Em breve</b><small>As edições encerradas aparecem aqui</small></div>}
          </div>
        </div>
      </section>

      <section className="hn-par" id="parceiros">
        <div className="hn-par__texto">
          <h2>Apoie este encontro. Seja um parceiro.</h2>
          <p>Nem toda contribuição é financeira: cada parceiro oferece o que faz bem, e a proposta é combinada individualmente.</p>
          <a className="hn-pill" href={PARTNER_FORM_URL}>Quero ser parceiro</a>
        </div>
        <div className="hn-par__itens">
          {PARCERIAS.map(([titulo, texto], i) => <div key={titulo}><span className="hn-fr" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><p><b>{titulo}</b><span>{texto}</span></p></div>)}
        </div>
        {partners.length > 0 && (
          <div className="hn-logos" aria-label="Quem apoia a ComuniCALI">
            <div className="hn-logos__track">
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
        <h2>Perguntas frequentes.</h2>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}<i aria-hidden="true">+</i></summary><p>{a}</p></details>)}
      </section>

      <section className="hn-inv" aria-label="Convite">
        <p>Primeira vez? Comece a sua jornada.</p>
        <a href={joinHref}>Registrar interesse</a>
      </section>

      <HnFooter />
    </div>
  );
}
