import { AdminConteudoSite } from './AdminConteudoSite';
import { AdminComunicacao } from './AdminComunicacao';
import { AdminAppGestao } from './AdminAppGestao';
/* Painel administrativo: moldura lateral, navegação por seções e o que ainda não existe. Cada tela segue o mesmo desenho: título, seções e uma lista ou ficha. */
import { AdminSiteEncontros } from './AdminSiteEncontros';
import { useEffect, useState, type ReactNode } from 'react';
import { Wallet, CalendarDays, Users, CircleCheck, House, Route, Network, Mail, FileText, Globe, Smartphone, Settings, ArrowUpRight, LogOut, ChevronRight, type LucideIcon } from 'lucide-react';
import { Link, NavLink, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Tabela, dataBr } from './AdminTabela';
import { MembersPanel, TextsPanel } from './AdminPrograma';
import { GuestsPanel } from './Convidados';
import { StaffPanel } from './Staff';
import { FornecedorPanel } from './Fornecedor';
import { ImpactosPanel, IndicacoesPanel, MatchesPanel, RecommendationsPanel } from './AdminRecomendacoes';
import { ComentariosPanel } from './AdminComentarios';
import { ProgramPanel, Descadastros } from './AdminInicio';

/** Aba atual guardada no endereço (?aba=), para atualizar a página sem perder o lugar. */
export function useAba(padrao: string, validas: string[], chave = 'aba') {
  const [params, setParams] = useSearchParams();
  const pedida = params.get(chave);
  const atual = pedida && validas.includes(pedida) ? pedida : padrao;
  const mudar = (id: string) => { const proximo = new URLSearchParams(params); proximo.set(chave, id); setParams(proximo, { replace: true }); };
  return [atual, mudar] as const;
}

export function Abas({ abas, atual, onChange }: { abas: Array<[string, string, number?]>; atual: string; onChange: (id: string) => void }) {
  return (
    <nav className="adm-abas" aria-label="Seções desta página">
      {abas.map(([id, nome, total]) => (
        <button key={id} type="button" aria-current={atual === id ? 'page' : undefined} className={atual === id ? 'on' : ''} onClick={() => onChange(id)}>{nome}{total ? <i>{total}</i> : null}<ChevronRight size={14} aria-hidden="true" /></button>
      ))}
    </nav>
  );
}

export function Secoes({ children, ...props }: Parameters<typeof Abas>[0] & { children: ReactNode }) {
  return <div className="adm-secoes"><Abas {...props} /><div className="adm-secoes__conteudo">{children}</div></div>;
}

export function Cabecalho({ rotulo, titulo, texto }: { rotulo: string; titulo: string; texto?: string }) {
  return <div className="wf-head"><div><small>{rotulo}</small><h1>{titulo}</h1>{texto && <p>{texto}</p>}</div></div>;
}

/** Contagens do que espera uma decisão: aparecem no menu, no Início e nas abas de Aprovações. */
export type Espera = { adesoes: number; missoes: number; recomendacoes: number; comentarios: number };
export function useEspera(): Espera {
  const [espera, setEspera] = useState<Espera>({ adesoes: 0, missoes: 0, recomendacoes: 0, comentarios: 0 });
  const { search } = typeof window !== 'undefined' ? window.location : { search: '' };
  useEffect(() => {
    const total = (consulta: PromiseLike<{ count: number | null }>) => Promise.resolve(consulta).then(({ count }) => count || 0).catch(() => 0);
    void Promise.all([
      total(supabase.from('members').select('id', { count: 'exact', head: true }).in('adesao_status', ['solicitada', 'em_analise', 'ajustes'])),
      total(supabase.from('member_missions').select('id', { count: 'exact', head: true }).eq('status', 'enviada')),
      total(supabase.from('recommendations').select('id', { count: 'exact', head: true }).eq('status', 'pendente')),
      total(supabase.from('edition_comments').select('id', { count: 'exact', head: true }).eq('status', 'pendente')),
    ]).then(([adesoes, missoes, recomendacoes, comentarios]) => setEspera({ adesoes, missoes, recomendacoes, comentarios }));
  }, [search]);
  return espera;
}

/** Tela de algo que o painel ainda não faz: mostra o que vai fazer, para não se perder nada do que foi pedido. */
export function EmBreve({ rotulo, titulo, hoje, itens }: { rotulo: string; titulo: string; hoje: string; itens: Array<[string, string]> }) {
  return (
    <>
      <Cabecalho rotulo={rotulo} titulo={titulo} texto={hoje} />
      <section className="adm-embreve">
        <header><small>AINDA NÃO FAZ</small><h2>O que vai ficar aqui</h2></header>
        <ul>{itens.map(([nome, texto]) => <li key={nome}><strong>{nome}</strong><span>{texto}</span></li>)}</ul>
      </section>
    </>
  );
}

function Adesoes() {
  const [lista, setLista] = useState<Array<{ id: string; nome: string; email: string; adesao_status: string; adesao_solicitada_em: string | null }>>([]);
  useEffect(() => {
    supabase.from('members').select('id,nome,email,adesao_status,adesao_solicitada_em').in('adesao_status', ['solicitada', 'em_analise', 'ajustes']).order('adesao_solicitada_em').then(({ data }) => setLista((data || []) as typeof lista));
  }, []);
  const nomes: Record<string, string> = { solicitada: 'Solicitada', em_analise: 'Em análise', ajustes: 'Ajustes pedidos' };
  return (
    <>
      <Cabecalho rotulo="APROVAÇÕES" titulo="Pedidos de adesão a Membro" texto="Quem pediu para ser Membro. Abra a ficha para aprovar, pedir ajustes ou não aprovar, sempre com motivo." />
      <Tabela colunas={[
        { id: 'nome', titulo: 'Nome', valor: (item) => item.nome, render: (item) => <Link className="adm-nome" to={`/admin/pessoas?aba=membros&abrir=${item.id}`}>{item.nome}</Link> },
        { id: 'email', titulo: 'E-mail', valor: (item) => item.email },
        { id: 'situacao', titulo: 'Situação', valor: (item) => nomes[item.adesao_status] || item.adesao_status },
        { id: 'pedido', titulo: 'Pedido em', valor: (item) => item.adesao_solicitada_em || '', render: (item) => (item.adesao_solicitada_em ? dataBr(item.adesao_solicitada_em) : '-') },
      ]} linhas={lista} chave={(item) => item.id} vazio="Nenhum pedido esperando decisão. O botão “Quero ser Membro” no app chega na parte 4 do plano." />
    </>
  );
}

export function PessoasPage() {
  const [aba, mudar] = useAba('membros', ['membros', 'convidados', 'staff', 'fornecedores', 'indicacoes', 'matches']);
  return (
    <Secoes atual={aba} onChange={mudar} abas={[['membros', 'Membros e visitantes'], ['convidados', 'Convidados'], ['staff', 'Staff'], ['fornecedores', 'Fornecedores'], ['indicacoes', 'Indicações'], ['matches', 'Matches']]}>
      {aba === 'membros' && <MembersPanel />}
      {aba === 'convidados' && <GuestsPanel />}
      {aba === 'staff' && <StaffPanel />}
      {aba === 'fornecedores' && <FornecedorPanel />}
      {aba === 'indicacoes' && <IndicacoesPanel />}
      {aba === 'matches' && <MatchesPanel />}
    </Secoes>
  );
}

export function AprovacoesPage() {
  const espera = useEspera();
  const [aba, mudar] = useAba('adesoes', ['adesoes', 'missoes', 'comentarios']);
  return (
    <Secoes atual={aba} onChange={mudar} abas={[['adesoes', 'Pedidos de adesão', espera.adesoes], ['missoes', 'Missões e recomendações', espera.missoes + espera.recomendacoes], ['comentarios', 'Comentários', espera.comentarios]]}>
      {aba === 'adesoes' && <Adesoes />}
      {aba === 'missoes' && <RecommendationsPanel />}
      {aba === 'comentarios' && <ComentariosPanel />}
    </Secoes>
  );
}

export function ProgramaPage() {
  const [aba, mudar] = useAba('como', ['como', 'impacto']);
  return (
    <Secoes atual={aba} onChange={mudar} abas={[['como', 'Como funciona'], ['impacto', 'Impacto da comunidade']]}>
      {aba === 'como' && <ProgramPanel />}
      {aba === 'impacto' && <ImpactosPanel />}
    </Secoes>
  );
}

export function EmailsPage() { return <AdminComunicacao />; }

export function SitePage() {
  const [aba, mudar] = useAba('encontros', ['encontros', 'contador', 'textos', 'home']);
  return (
    <Secoes atual={aba} onChange={mudar} abas={[['encontros', 'Encontros e fotos'], ['contador', 'Contador de membros'], ['textos', 'Regras e privacidade'], ['home', 'Home e páginas']]}>
      {aba === 'encontros' && <AdminSiteEncontros />}
      {aba === 'contador' && <CounterPanel />}
      {aba === 'textos' && <TextsPanel />}
      {aba === 'home' && <AdminConteudoSite />}
    </Secoes>
  );
}

export function AppPage() { return <AdminAppGestao />; }

const FALTA: Array<[string, Array<[string, string]>]> = [
  ['Fluxo de entrada e adesão (parte 4)', [
    ['Check-in sem acesso total', 'O check-in ainda cria a pessoa com acesso ao Meu Passaporte. Pela regra v23 deve registrar só Convidado ou Visitante.'],
    ['Botão “Quero ser Membro” no app', 'Pedido, cadastro mínimo, aceites e status.'],
    ['Bloqueio após 2 presenças', 'Automático na inscrição, usando o contador que já aparece na ficha.'],
    ['Janela de Membros por edição', 'Início e fim, abertura geral, cota de convidados e prazo da lista de espera, configuráveis em cada edição.'],
    ['Lista de espera automática', 'Oferta de vaga com prazo e expiração.'],
    ['Rede só para Membros aprovados', 'Adequar o acesso e o padrão do cadastro às regras publicadas, na parte 4.'],
    ['Milhas só após a adesão', 'Decidir o que fazer com as milhas já lançadas dos visitantes da 1ª edição.'],
  ]],
  ['E-mails', [
    ['Conferir os disparos do fluxo', 'Validar com Claude os gatilhos já automáticos e os que dependem de janelas e pendências.'],
    ['Ativar modelos e histórico de e-mails', 'Telas prontas; migração e publicação coordenada pendentes.'],
    ['Lembrete de pendências', 'Foto, aceite e comunidade, automático.'],
  ]],
  ['Site', [
    ['Home editável por seção', 'Texto, imagem e ordem pelo painel.'],
    ['Álbuns dos encontros na versão oficial', 'Prévia pronta. Falta liberar o acesso real, validar os e-mails e configurar as permissões da pasta externa.'],
    ['Revisão final dos textos v23', 'Textos já publicados. Falta a leitura final da administração e a revisão jurídica.'],
  ]],
  ['Painel', [
    ['Equipe do painel', 'Acesso específico e limitado para uma parceira.'],
    ['Registro de alterações', 'Ver quem mudou o quê, hoje só no banco.'],
    ['Conferência com conta real', 'Validar as telas com a sessão da organização e no celular, após a revisão visual local.'],
    ['Aprovações com e-mail automático', 'Ao aprovar ou pedir ajustes, o e-mail correspondente sai sozinho.'],
  ]],
  ['Programa', [
    ['Níveis e selos', 'Arte nova da Fundadora, das missões e dos carimbos das edições.'],
  ]],
];

export function ConfigPage() {
  const [aba, mudar] = useAba('falta', ['falta', 'testar', 'saiu', 'equipe']);
  return (
    <Secoes atual={aba} onChange={mudar} abas={[['falta', 'O que falta construir'], ['testar', 'Testar como participante'], ['saiu', 'Quem saiu dos e-mails'], ['equipe', 'Equipe do painel']]}>
      {aba === 'falta' && (
        <>
          <Cabecalho rotulo="CONFIGURAÇÕES" titulo="O que o painel ainda não faz" texto="A lista de tudo o que foi combinado e ainda não está pronto. Cada item sai daqui quando for entregue." />
          <div className="adm-falta">{FALTA.map(([grupo, itens]) => <section key={grupo}><h2>{grupo}</h2><ul>{itens.map(([nome, texto]) => <li key={nome}><strong>{nome}</strong><span>{texto}</span></li>)}</ul></section>)}</div>
        </>
      )}
      {aba === 'testar' && (
        <section className="v2-forms-card">
          <header><small>TESTAR COMO PARTICIPANTE</small><h2>Veja o que aparece no celular</h2></header>
          <p className="adm-hint">Estes links usam a edição de teste, que não aparece no site. Use um e-mail de teste: o cadastro feito aqui entra na lista de membros.</p>
          <div className="adm-links">
            <a className="wf-secondary" href="/checkin?edicao=teste" target="_blank" rel="noopener noreferrer">Check-in</a>
            <a className="wf-secondary" href="/votar?edicao=teste" target="_blank" rel="noopener noreferrer">Votação</a>
            <a className="wf-secondary" href="/cadastro" target="_blank" rel="noopener noreferrer">Cadastro</a>
            <a className="wf-secondary" href="/convidar?edicao=teste" target="_blank" rel="noopener noreferrer">Indicar convidado</a>
          </div>
        </section>
      )}
      {aba === 'saiu' && <Descadastros />}
      {aba === 'equipe' && <EmBreve rotulo="EQUIPE DO PAINEL" titulo="Quem acessa o painel" hoje="Por enquanto só você entra e decide tudo." itens={[['Acesso para uma parceira', 'Um acesso específico, com visão limitada ao que ela precisa.'], ['Quem aprova adesões', 'Hoje só você.']]} />}
    </Secoes>
  );
}

export function InicioPage() {
  const espera = useEspera();
  const [numeros, setNumeros] = useState({ pessoas: 0, presencas: 0, convidados: 0, parceiros: 0 });
  const [edicao, setEdicao] = useState<{ slug: string; titulo: string; data_evento: string; horario: string; local: string; cidade: string } | null>(null);
  useEffect(() => {
    const total = (tabela: string) => supabase.from(tabela).select('id', { count: 'exact', head: true }).then(({ count }) => count || 0);
    void Promise.all([total('members'), total('checkins'), total('guests'), total('partners')]).then(([pessoas, presencas, convidados, parceiros]) => setNumeros({ pessoas, presencas, convidados, parceiros }));
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    supabase.from('editions').select('slug,titulo,data_evento,horario,local,cidade').eq('publica', true).gte('data_evento', hoje).order('data_evento').limit(1).maybeSingle().then(({ data }) => setEdicao(data));
  }, []);
  const fazer: Array<[string, number, string]> = ([
    ['Pedidos de adesão para decidir', espera.adesoes, '/admin/aprovacoes?aba=adesoes'],
    ['Missões para analisar', espera.missoes, '/admin/aprovacoes?aba=missoes'],
    ['Recomendações para validar', espera.recomendacoes, '/admin/aprovacoes?aba=missoes'],
    ['Comentários para aprovar', espera.comentarios, '/admin/aprovacoes?aba=comentarios'],
  ] as Array<[string, number, string]>).filter(([, total]) => total > 0);
  return (
    <>
      <Cabecalho rotulo="INÍCIO" titulo="Visão geral" texto={edicao ? `Próximo encontro: ${edicao.titulo}, ${dataBr(edicao.data_evento)}.` : 'Nenhum encontro marcado no site.'} />
      <section className="adm-fazer">
        <header><small>FAZER AGORA</small></header>
        {fazer.length ? <ul>{fazer.map(([nome, total, para]) => <li key={nome}><Link to={para}><strong>{total}</strong><span>{nome}</span><em>Abrir</em></Link></li>)}</ul> : <p className="adm-hint">Nada esperando uma decisão sua.</p>}
      </section>
      <div className="adm-faixa">
        <div><b>{numeros.pessoas}</b><span>Pessoas cadastradas</span></div>
        <div><b>{numeros.presencas}</b><span>Presenças</span></div>
        <div><b>{numeros.convidados}</b><span>Convidados</span></div>
        <div><b>{numeros.parceiros}</b><span>Parceiros</span></div>
      </div>
      {edicao && (
        <section className="adm-proximo">
          <div><small>PRÓXIMO ENCONTRO</small><h2>{edicao.titulo}</h2><p>{dataBr(edicao.data_evento)} · {edicao.horario} · {edicao.local}, {edicao.cidade}</p></div>
          <div className="adm-links"><Link className="wf-primary" to={`/admin/edicoes?abrir=${edicao.slug}`}>Abrir a edição</Link><a className="wf-secondary" href={`/telao/checkin?edicao=${edicao.slug}`} target="_blank" rel="noopener noreferrer">Telão do check-in</a></div>
        </section>
      )}
    </>
  );
}

const GRUPOS_MENU: Array<{ nome?: string; itens: Array<[string, string, (keyof Espera | 'aprovacoes')?]> }> = [
  { itens: [['/admin', 'Início']] },
  { nome: 'Operação', itens: [['/admin/edicoes', 'Edições'], ['/admin/custos', 'Custos'], ['/admin/pessoas', 'Pessoas'], ['/admin/aprovacoes', 'Aprovações', 'aprovacoes']] },
  { nome: 'Programa', itens: [['/admin/programa', 'Trilha e regras'], ['/admin/rede', 'Rede e parceiros']] },
  { nome: 'Comunicação', itens: [['/admin/emails', 'E-mails'], ['/admin/formularios', 'Formulários']] },
  { nome: 'Conteúdo', itens: [['/admin/site', 'Site'], ['/admin/app', 'App do membro']] },
  { nome: 'Sistema', itens: [['/admin/configuracoes', 'Configurações']] },
];

const ICONES_MENU: Record<string, LucideIcon> = {
  '/admin/custos': Wallet, '/admin': House, '/admin/edicoes': CalendarDays, '/admin/pessoas': Users,
  '/admin/aprovacoes': CircleCheck, '/admin/programa': Route, '/admin/rede': Network,
  '/admin/emails': Mail, '/admin/formularios': FileText, '/admin/site': Globe,
  '/admin/app': Smartphone, '/admin/configuracoes': Settings,
};

export function MenuLateral({ email, onSair, fechar }: { email: string; onSair: () => void; fechar: () => void }) {
  const espera = useEspera();
  const aguardando = espera.adesoes + espera.missoes + espera.recomendacoes + espera.comentarios;
  return (
    <nav className="adm__side" aria-label="Menu do painel">
      <NavLink to="/admin" className="adm__logo" onClick={fechar}><img src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" /></NavLink>
      <Link className="adm__acao" to="/admin/aprovacoes?aba=adesoes" onClick={fechar}><CircleCheck size={16} aria-hidden="true" />Revisar aprovações<ChevronRight size={14} aria-hidden="true" /></Link>
      {GRUPOS_MENU.map((grupo) => (
        <div key={grupo.nome || 'topo'} className="adm__grupo">
          {grupo.nome && <div className="grp">{grupo.nome}</div>}
          {grupo.itens.map(([to, nome, selo]) => { const Icone = ICONES_MENU[to]; return (
            <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `item${isActive ? ' active' : ''}`} onClick={fechar}><Icone size={16} strokeWidth={1.6} aria-hidden="true" /><span>{nome}</span>{selo && aguardando > 0 ? <i className="badge">{aguardando}</i> : null}</NavLink>
          ); })}
        </div>
      ))}
      <div className="adm__rodape">
        <a href="/" target="_blank" rel="noopener noreferrer"><ArrowUpRight size={15} aria-hidden="true" />Ver o site</a>
        <div className="adm__conta"><span className="adm__avatar" aria-hidden="true">{email.charAt(0).toUpperCase()}</span><div><strong>Organização</strong><span title={email}>{email}</span></div></div>
        <button type="button" onClick={onSair}><LogOut size={14} aria-hidden="true" />Sair</button>
      </div>
    </nav>
  );
}

export function CounterPanel() {
  const [value, setValue] = useState('');
  const [checkins, setCheckins] = useState(0);
  const [note, setNote] = useState('');
  useEffect(() => {
    supabase.from('site_settings').select('membros_contador').single().then(({ data }) => setValue(data?.membros_contador == null ? '' : String(data.membros_contador)));
    supabase.from('members').select('id', { count: 'exact', head: true }).then(({ count }) => setCheckins(count || 0));
  }, []);

  async function save() {
    const number = value.trim() === '' ? null : Number(value);
    if (number !== null && (!Number.isInteger(number) || number < 0)) { setNote('Digite um número inteiro.'); return; }
    const { error } = await supabase.from('site_settings').update({ membros_contador: number, updated_at: new Date().toISOString() }).eq('id', true);
    setNote(error ? 'Não foi possível salvar.' : 'Contador salvo.');
  }

  return (
    <>
      <div className="wf-head"><div><small>CONTADOR</small><h1>Contador de membros</h1><p>Com o campo vazio, o site conta quem fez check-in em edições públicas. Com um número, mostra esse número. Em zero, o contador some.</p></div></div>
      <section className="v2-forms-card">
        <div className="v2-forms-grid">
          <label><span>Número no site</span><input inputMode="numeric" value={value} onChange={(event) => { setValue(event.target.value); setNote(''); }} /></label>
          <div className="adm-submit"><button type="button" className="wf-primary" onClick={() => void save()}>Salvar</button></div>
        </div>
        <p className="adm-hint">Cadastros registrados no banco: {checkins}.</p>
        {note && <p className="v2-forms-ok" role="status">{note}</p>}
      </section>
    </>
  );
}
