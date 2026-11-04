/* Painel de validação: missões enviadas pelos membros e recomendações de lugares e parceiros. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { chamar } from './AdminEmails';
import { Categoria, Email, Rede, Tabela, Telefone, dataBr, type Coluna } from './AdminTabela';

type Envio = { id: string; mission_slug: string; relato: string; status: string; created_at: string; decidido_em: string | null; decidido_por: string | null; justificativa: string | null; members: { nome: string; email: string } | null; missions: { titulo: string } | null };
type Recomendacao = { id: string; tipo: string; nome: string; instagram: string | null; linkedin: string | null; telefone: string; pessoa_validar: string; status: string; created_at: string; decidido_em: string | null; decidido_por: string | null; justificativa: string | null; member_id: string; members: { nome: string } | null };
type Indicado = { id: string; nome: string; email: string; whatsapp: string; cargo: string | null; empresa: string | null; status: string; created_at: string; members: { nome: string } | null; editions: { titulo: string; data_evento: string } | null };
type Impacto = { id: string; tipo: string; com_quem: string | null; relato: string; created_at: string; members: { nome: string; email: string } | null };

const SITUACAO: Record<string, string> = { enviada: 'Para analisar', pendente: 'Para validar', concluida: 'Aprovada', validada: 'Validada', recusada: 'Recusada' };
const usuario = async () => (await supabase.auth.getSession()).data.session?.user.email || '';

export function RecommendationsPanel() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [lista, setLista] = useState<Recomendacao[]>([]);
  const [note, setNote] = useState('');

  const load = () => {
    supabase.from('member_missions').select('id,mission_slug,relato,status,created_at,decidido_em,decidido_por,justificativa,members(nome,email),missions(titulo)').order('created_at', { ascending: false }).then(({ data }) => setEnvios((data || []) as unknown as Envio[]));
    supabase.from('recommendations').select('id,tipo,nome,instagram,linkedin,telefone,pessoa_validar,status,created_at,decidido_em,decidido_por,justificativa,member_id,members(nome)').order('created_at', { ascending: false }).then(({ data }) => setLista((data || []) as unknown as Recomendacao[]));
  };
  useEffect(load, []);

  const pedirJustificativa = (texto: string) => { const resposta = window.prompt(texto); return resposta && resposta.trim() ? resposta.trim() : null; };

  async function decidirMissao(item: Envio, status: 'concluida' | 'recusada') {
    const justificativa = status === 'recusada' ? pedirJustificativa(`Por que recusar a missão de ${item.members?.nome}?`) : null;
    if (status === 'recusada' && !justificativa) return;
    if (status === 'concluida' && !window.confirm(`Aprovar a missão de ${item.members?.nome}?`)) return;
    const { error } = await supabase.from('member_missions').update({ status, justificativa, decidido_em: new Date().toISOString(), decidido_por: await usuario() }).eq('id', item.id);
    setNote(error ? error.message : 'Missão atualizada.');
    load();
  }

  async function decidirRecomendacao(item: Recomendacao, status: 'validada' | 'recusada') {
    const justificativa = status === 'recusada' ? pedirJustificativa(`Por que recusar ${item.nome}?`) : null;
    if (status === 'recusada' && !justificativa) return;
    if (status === 'validada' && !window.confirm(`Validar ${item.nome}? Soma 10 milhas para ${item.members?.nome}.`)) return;
    const { error } = await supabase.from('recommendations').update({ status, justificativa, decidido_em: new Date().toISOString(), decidido_por: await usuario() }).eq('id', item.id);
    if (!error && status === 'validada') await supabase.from('point_events').insert({ member_id: item.member_id, acao: `recomendacao:${item.id}`, pontos: 10, motivo: item.nome });
    setNote(error ? error.message : 'Recomendação atualizada.');
    load();
  }

  const colunasMissoes: Array<Coluna<Envio>> = [
    { id: 'data', titulo: 'Enviada em', valor: (item) => item.created_at, render: (item) => dataBr(item.created_at) },
    { id: 'quem', titulo: 'Quem enviou', valor: (item) => item.members?.nome || '' },
    { id: 'missao', titulo: 'Missão', valor: (item) => item.missions?.titulo || '', longo: true },
    { id: 'detalhes', titulo: 'Detalhes', valor: (item) => item.relato, longo: true },
    { id: 'situacao', titulo: 'Situação', valor: (item) => SITUACAO[item.status] || item.status, render: (item) => <Categoria id={item.status} nome={SITUACAO[item.status] || item.status} /> },
    { id: 'decisao', titulo: 'Decisão', valor: (item) => item.decidido_em || '', render: (item) => (item.status === 'enviada'
      ? <span className="adm-acoes"><button type="button" onClick={() => void decidirMissao(item, 'concluida')}>Aprovar</button><button type="button" onClick={() => void decidirMissao(item, 'recusada')}>Recusar</button></span>
      : `${dataBr(item.decidido_em)}${item.decidido_por ? ` · ${item.decidido_por}` : ''}`) },
    { id: 'justificativa', titulo: 'Justificativa', valor: (item) => item.justificativa || '', longo: true },
  ];

  const colunasRecomendacoes: Array<Coluna<Recomendacao>> = [
    { id: 'data', titulo: 'Enviada em', valor: (item) => item.created_at, render: (item) => dataBr(item.created_at) },
    { id: 'tipo', titulo: 'Tipo', valor: (item) => (item.tipo === 'lugar' ? 'Lugar' : 'Parceiro') },
    { id: 'nome', titulo: 'Nome', valor: (item) => item.nome },
    { id: 'quem', titulo: 'Quem indicou', valor: (item) => item.members?.nome || '' },
    { id: 'validar', titulo: 'Validar com', valor: (item) => item.pessoa_validar },
    { id: 'telefone', titulo: 'Telefone', valor: (item) => item.telefone, render: (item) => <Telefone numero={item.telefone} /> },
    { id: 'instagram', titulo: 'Instagram', valor: (item) => item.instagram || '', render: (item) => <Rede valor={item.instagram} tipo="instagram" /> },
    { id: 'linkedin', titulo: 'LinkedIn', valor: (item) => item.linkedin || '', render: (item) => <Rede valor={item.linkedin} tipo="linkedin" /> },
    { id: 'situacao', titulo: 'Situação', valor: (item) => SITUACAO[item.status] || item.status, render: (item) => <Categoria id={item.status} nome={SITUACAO[item.status] || item.status} /> },
    { id: 'decisao', titulo: 'Decisão', valor: (item) => item.decidido_em || '', render: (item) => (item.status === 'pendente'
      ? <span className="adm-acoes"><button type="button" onClick={() => void decidirRecomendacao(item, 'validada')}>Validar</button><button type="button" onClick={() => void decidirRecomendacao(item, 'recusada')}>Recusar</button></span>
      : `${dataBr(item.decidido_em)}${item.decidido_por ? ` · ${item.decidido_por}` : ''}`) },
    { id: 'justificativa', titulo: 'Justificativa', valor: (item) => item.justificativa || '', longo: true },
  ];

  return (
    <>
      <div className="wf-head"><div><small>PROGRAMA DE MEMBROS</small><h1>Missões e recomendações</h1><p>Use o filtro Situação para ver as pendentes ou a auditoria de aprovadas e recusadas, com data, responsável e justificativa.</p></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <header><small>MISSÕES</small><h2>{envios.filter((item) => item.status === 'enviada').length} para analisar</h2></header>
        <Tabela colunas={colunasMissoes} linhas={envios} chave={(item) => item.id} inicial={{ id: 'data', desc: true }} vazio="Nenhuma missão enviada." filtros={[{ id: 'situacao', titulo: 'Situação', valor: (item) => SITUACAO[item.status] || item.status }]} />
      </section>
      <section className="v2-forms-card">
        <header><small>RECOMENDAÇÕES</small><h2>{lista.filter((item) => item.status === 'pendente').length} para validar</h2></header>
        <Tabela colunas={colunasRecomendacoes} linhas={lista} chave={(item) => item.id} inicial={{ id: 'data', desc: true }} vazio="Nenhuma recomendação enviada." filtros={[{ id: 'situacao', titulo: 'Situação', valor: (item) => SITUACAO[item.status] || item.status }, { id: 'tipo', titulo: 'Tipo', valor: (item) => (item.tipo === 'lugar' ? 'Lugar' : 'Parceiro') }]} />
      </section>
    </>
  );
}

export function IndicacoesPanel() {
  const [lista, setLista] = useState<Indicado[]>([]);
  const [compareceu, setCompareceu] = useState<Set<string>>(new Set());
  useEffect(() => {
    supabase.from('registrations').select('id,nome,email,whatsapp,cargo,empresa,status,created_at,members!registrations_indicado_por_fkey(nome),editions(titulo,data_evento)').not('indicado_por', 'is', null).then(({ data }) => setLista((data || []) as unknown as Indicado[]));
    supabase.from('point_events').select('acao').like('acao', 'indicacao:%').then(({ data }) => setCompareceu(new Set((data || []).map((row) => row.acao.replace('indicacao:', '')))));
  }, []);
  const situacao = (item: Indicado) => (compareceu.has(item.id) ? 'Compareceu' : ({ analise: 'Para aprovar', inscrito: 'Aprovada', espera: 'Lista de espera', cancelado: 'Recusada' } as Record<string, string>)[item.status] || item.status);
  const colunas: Array<Coluna<Indicado>> = [
    { id: 'data', titulo: 'Indicada em', valor: (item) => item.created_at, render: (item) => dataBr(item.created_at) },
    { id: 'nome', titulo: 'Pessoa indicada', valor: (item) => item.nome },
    { id: 'cargo', titulo: 'Cargo', valor: (item) => [item.cargo, item.empresa].filter(Boolean).join(', ') },
    { id: 'whatsapp', titulo: 'WhatsApp', valor: (item) => item.whatsapp, render: (item) => <Telefone numero={item.whatsapp} /> },
    { id: 'email', titulo: 'E-mail', valor: (item) => item.email, render: (item) => <Email email={item.email} /> },
    { id: 'quem', titulo: 'Quem indicou', valor: (item) => item.members?.nome || '' },
    { id: 'edicao', titulo: 'Edição', valor: (item) => item.editions?.titulo || '' },
    { id: 'situacao', titulo: 'Situação', valor: situacao },
  ];
  return (
    <>
      <div className="wf-head"><div><small>PROGRAMA DE MEMBROS</small><h1>Indicações</h1><p>Quem cada membro trouxe. A aprovação acontece na edição, e as 5 milhas entram depois do check-in da pessoa indicada.</p></div></div>
      <Tabela colunas={colunas} linhas={lista} chave={(item) => item.id} inicial={{ id: 'data', desc: true }} vazio="Nenhuma indicação ainda." filtros={[{ id: 'situacao', titulo: 'Situação', valor: situacao }, { id: 'edicao', titulo: 'Edição', valor: (item) => item.editions?.titulo || '' }, { id: 'quem', titulo: 'Quem indicou', valor: (item) => item.members?.nome || '' }]} />
    </>
  );
}

export function ImpactosPanel() {
  const [lista, setLista] = useState<Impacto[]>([]);
  useEffect(() => { supabase.from('impactos').select('id,tipo,com_quem,relato,created_at,members(nome,email)').then(({ data }) => setLista((data || []) as unknown as Impacto[])); }, []);
  const colunas: Array<Coluna<Impacto>> = [
    { id: 'data', titulo: 'Data', valor: (item) => item.created_at, render: (item) => dataBr(item.created_at) },
    { id: 'quem', titulo: 'Membro', valor: (item) => item.members?.nome || '' },
    { id: 'tipo', titulo: 'O que aconteceu', valor: (item) => item.tipo },
    { id: 'com', titulo: 'Com quem', valor: (item) => item.com_quem || '' },
    { id: 'relato', titulo: 'Relato', valor: (item) => item.relato, longo: true },
  ];
  return (
    <>
      <div className="wf-head"><div><small>PROGRAMA DE MEMBROS</small><h1>Impacto da comunidade</h1><p>O que os membros contam que aconteceu por causa da ComuniCALI: conexões, entrevistas, empregos e parcerias.</p></div></div>
      <div className="adm-cards">{['Conheci pessoas', 'Consegui uma entrevista', 'Consegui um emprego', 'Fechei uma parceria'].map((tipo) => <div className="adm-card" key={tipo}><strong>{lista.filter((item) => item.tipo === tipo).length}</strong><span>{tipo}</span></div>)}</div>
      <Tabela colunas={colunas} linhas={lista} chave={(item) => item.id} inicial={{ id: 'data', desc: true }} vazio="Nenhum relato ainda." filtros={[{ id: 'tipo', titulo: 'O que aconteceu', valor: (item) => item.tipo }]} />
    </>
  );
}

type Match = { id: string; motivo: string; cali: boolean; status: string; a: { nome: string; segmento: string | null } | null; b: { nome: string; segmento: string | null } | null };

export function MatchesPanel() {
  const [lista, setLista] = useState<Match[]>([]);
  const [note, setNote] = useState('');
  const load = () => { supabase.from('matches').select('id,motivo,cali,status,a:members!matches_a_fkey(nome,segmento),b:members!matches_b_fkey(nome,segmento)').order('cali', { ascending: false }).order('created_at', { ascending: false }).then(({ data }) => setLista((data || []) as unknown as Match[])); };
  useEffect(load, []);

  async function decidir(item: Match, status: 'liberado' | 'recusado') {
    if (status === 'liberado' && !window.confirm(`Liberar a sugestão entre ${item.a?.nome} e ${item.b?.nome}? As duas pessoas recebem aviso e e-mail.`)) return;
    try { await chamar({ acao: 'match', match: item.id, status }); setNote(status === 'liberado' ? 'Sugestão liberada.' : 'Sugestão descartada.'); } catch (error) { setNote((error as Error).message); }
    load();
  }

  const colunas: Array<Coluna<Match>> = [
    { id: 'tipo', titulo: 'Tipo', valor: (item) => (item.cali ? 'CALI' : 'Entre membros'), render: (item) => <Categoria id={item.cali ? 'fundadora' : 'membro'} nome={item.cali ? 'CALI' : 'Entre membros'} /> },
    { id: 'a', titulo: 'Quem busca', valor: (item) => item.a?.nome || '' },
    { id: 'motivo', titulo: 'Busca', valor: (item) => item.motivo },
    { id: 'b', titulo: 'Sugestão', valor: (item) => (item.cali ? 'CALI RH' : item.b?.nome || '') },
    { id: 'segmento', titulo: 'Segmento', valor: (item) => item.a?.segmento || '' },
    { id: 'situacao', titulo: 'Situação', valor: (item) => ({ sugerido: 'Para analisar', liberado: 'Liberado', recusado: 'Descartado' } as Record<string, string>)[item.status] || item.status },
    { id: 'acoes', titulo: 'Decisão', valor: (item) => item.status, render: (item) => (item.status === 'sugerido' ? <span className="adm-acoes"><button type="button" onClick={() => void decidir(item, 'liberado')}>Liberar</button><button type="button" onClick={() => void decidir(item, 'recusado')}>Descartar</button></span> : '-') },
  ];

  return (
    <>
      <div className="wf-head"><div><small>PROGRAMA DE MEMBROS</small><h1>Matches</h1><p>Sugestões criadas pelo que cada pessoa busca e pelo que as outras fazem. Nada chega ao membro antes de você liberar.</p></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <Tabela colunas={colunas} linhas={lista} chave={(item) => item.id} inicial={{ id: 'tipo' }} vazio="Nenhuma sugestão ainda." filtros={[{ id: 'tipo', titulo: 'Tipo', valor: (item) => (item.cali ? 'CALI' : 'Entre membros') }, { id: 'situacao', titulo: 'Situação', valor: (item) => ({ sugerido: 'Para analisar', liberado: 'Liberado', recusado: 'Descartado' } as Record<string, string>)[item.status] || item.status }]} />
    </>
  );
}
