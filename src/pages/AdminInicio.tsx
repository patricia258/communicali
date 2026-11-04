/* Início do painel: números do dia e roteiro do encontro. Programa: regras de pontos e categorias, com quem está em cada faixa. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ClipboardList, Gift, Handshake, IdCard, MonitorPlay, Trophy, UserCheck, Users, Vote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Email, Tabela, dataBr } from './AdminTabela';

export const FAIXAS = [
  { nome: 'Membro', de: 0, ate: 59 },
  { nome: 'Conector', de: 60, ate: 179 },
  { nome: 'Embaixador', de: 180, ate: Infinity },
];

export const PONTOS: Array<[string, string, number]> = [
  ['presenca', 'Presença validada em um encontro', 10],
  ['convidado', 'Convidado indicado que compareceu', 5],
  ['recomendacao', 'Recomendação validada', 10],
  ['contribuicao', 'Contribuição de conteúdo ou experiência aprovada', 15],
  ['parceiro', 'Indicação de parceiro que contribuiu de fato', 20],
  ['palestra', 'Palestra a convite da organização', 30],
];

type Edition = { slug: string; titulo: string; data_evento: string };

export function HomePanel() {
  const [counts, setCounts] = useState({ membros: 0, presencas: 0, convidados: 0, parceiros: 0 });
  const [edition, setEdition] = useState<Edition | null>(null);

  useEffect(() => {
    const count = (table: string) => supabase.from(table).select('id', { count: 'exact', head: true }).then(({ count: total }) => total || 0);
    void Promise.all([count('members'), count('checkins'), count('guests'), count('partners')]).then(([membros, presencas, convidados, parceiros]) => setCounts({ membros, presencas, convidados, parceiros }));
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    supabase.from('editions').select('slug,titulo,data_evento').eq('publica', true).gte('data_evento', today).order('data_evento').limit(1).maybeSingle().then(({ data }) => setEdition(data as Edition | null));
  }, []);

  const slug = edition?.slug || 'fundadora';
  const steps: Array<[typeof MonitorPlay, string, string, string, boolean]> = [
    [UserCheck, 'Chegada', 'A recepção confirma o nome na lista e indica a mesa. Ainda não entrega crachá.', '/admin/edicoes', false],
    [MonitorPlay, 'Check-in pelo QR Code', 'O QR Code fica no porta-mesa de cada mesa e também no telão. Abra o telão do check-in. Reserve cerca de 5 minutos na abertura.', `/telao/checkin?edicao=${slug}`, true],
    [IdCard, 'Crachás na mesa', 'Quem terminou o check-in levanta o celular com a tela final, e a equipe leva o crachá até a mesa. Quem chegar depois faz o check-in e recebe na hora.', '/admin/edicoes', false],
    [Users, 'Guichê | Apresente-se', 'Cada pessoa tem até 1 minuto para se apresentar: nome, o que faz e o que veio buscar.', '/admin/edicoes', false],
    [Vote, 'Votação', 'Em Votações, ative a pergunta do dia e troque o telão para a votação. As respostas sobem sozinhas.', '/admin/votacoes', false],
    [Trophy, 'Resultado', 'Em Votações, clique em Revelar no telão para mostrar a média e o gráfico.', '/admin/votacoes', false],
  ];

  const cards: Array<[typeof Users, string, number, string]> = [
    [Users, 'Membros', counts.membros, '/admin/membros'],
    [CalendarCheck, 'Presenças', counts.presencas, '/admin/edicoes'],
    [Gift, 'Convidados', counts.convidados, '/admin/convidados'],
    [Handshake, 'Parceiros', counts.parceiros, '/admin/parceiros'],
  ];

  return (
    <>
      <div className="wf-head"><div><small>INÍCIO</small><h1>Painel da ComuniCALI</h1><p>{edition ? `Próximo encontro: ${edition.titulo}, ${edition.data_evento.split('-').reverse().join('/')}.` : 'Nenhum encontro futuro cadastrado.'}</p></div></div>
      <div className="adm-cards">
        {cards.map(([Icon, label, value, to]) => <Link className="adm-card" to={to} key={label}><Icon size={18} aria-hidden="true" /><strong>{value}</strong><span>{label}</span></Link>)}
      </div>
      <section className="v2-forms-card">
        <header><small>DIA DO ENCONTRO</small><h2>O que fazer, nesta ordem</h2></header>
        <ol className="adm-steps">
          {steps.map(([Icon, title, text, to, external], index) => (
            <li key={title}>
              <b>{index + 1}</b>
              <Icon size={18} aria-hidden="true" />
              <div><strong>{title}</strong><span>{text}</span></div>
              {external ? <a className="wf-secondary" href={to} target="_blank" rel="noopener noreferrer">Abrir</a> : <Link className="wf-secondary" to={to}>Abrir</Link>}
            </li>
          ))}
        </ol>
      </section>
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
      <Descadastros />
    </>
  );
}

export function ProgramPanel() {
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [people, setPeople] = useState(0);

  useEffect(() => {
    void Promise.all([supabase.from('members').select('id'), supabase.from('point_events').select('member_id,pontos')]).then(([members, points]) => {
      const sum: Record<string, number> = {};
      for (const row of points.data || []) sum[row.member_id] = (sum[row.member_id] || 0) + row.pontos;
      const bands: Record<string, number> = {};
      for (const member of members.data || []) {
        const band = FAIXAS.find((item) => (sum[member.id] || 0) >= item.de && (sum[member.id] || 0) <= item.ate);
        if (band) bands[band.nome] = (bands[band.nome] || 0) + 1;
      }
      setTotals(bands); setPeople(members.data?.length || 0);
    });
  }, []);

  return (
    <>
      <div className="wf-head"><div><small>PROGRAMA DE MEMBROS</small><h1>Como funciona</h1><p>As milhas entram sozinhas ou por lançamento em Membros. Mudar de categoria é decisão da organização: atingir a faixa não promove ninguém automaticamente.</p></div></div>
      <section className="v2-forms-card">
        <header><small>MILHAS</small><h2>O que vale milha</h2></header>
        <div className="adm-list">
          {PONTOS.map(([key, label, value]) => <div className="adm-row adm-row--static" key={key}><strong>+{value}</strong><span>{label}</span><em>{key === 'presenca' || key === 'convidado' ? 'Automático' : key === 'recomendacao' ? 'Validado em Missões' : 'Lançado em Membros'}</em></div>)}
        </div>
      </section>
      <section className="v2-forms-card">
        <header><small>CATEGORIAS</small><h2>{people} {people === 1 ? 'membro' : 'membros'} por faixa de milhas</h2></header>
        <div className="adm-cards">
          {FAIXAS.map((band) => <div className="adm-card" key={band.nome}><ClipboardList size={18} aria-hidden="true" /><strong>{totals[band.nome] || 0}</strong><span>{band.nome}</span><small>{band.ate === Infinity ? `${band.de} milhas ou mais` : `${band.de} a ${band.ate} milhas`}</small></div>)}
        </div>
      </section>
    </>
  );
}

// Quem clicou em "Parar de receber estes e-mails" nos avisos do espaço do membro.
function Descadastros() {
  const [linhas, setLinhas] = useState<Array<{ email: string; criado_em: string; nome: string }>>([]);
  useEffect(() => {
    void Promise.all([supabase.from('email_descadastro').select('email,criado_em'), supabase.from('members').select('email,nome')]).then(([saidas, membros]) => {
      const nomes = new Map((membros.data || []).map((item) => [String(item.email).toLowerCase(), item.nome as string]));
      setLinhas((saidas.data || []).map((item) => ({ ...item, nome: nomes.get(item.email) || '-' })));
    });
  }, []);
  return (
    <section className="v2-forms-card">
      <header><small>E-MAILS</small><h2>Pararam de receber e-mails</h2></header>
      <p className="adm-hint">Quem saiu continua com acesso ao Meu passaporte. Deixa de receber só os avisos de conexão, sugestão e indicação.</p>
      <Tabela colunas={[{ id: 'nome', titulo: 'Nome', valor: (item) => item.nome }, { id: 'email', titulo: 'E-mail', valor: (item) => item.email, render: (item) => <Email email={item.email} /> }, { id: 'data', titulo: 'Desde', valor: (item) => item.criado_em, render: (item) => dataBr(item.criado_em) }]}
        linhas={linhas} chave={(item) => item.email} inicial={{ id: 'data', desc: true }} vazio="Ninguém pediu para sair até agora." />
    </section>
  );
}
