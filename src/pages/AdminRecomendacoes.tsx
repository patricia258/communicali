/* Painel de validação: missões enviadas pelos membros e recomendações de lugares e parceiros. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { chamar } from './AdminEmails';

type Envio = { id: string; mission_slug: string; relato: string; status: string; created_at: string; members: { id: string; nome: string; email: string } | null; missions: { titulo: string } | null };
type Recomendacao = { id: string; tipo: string; nome: string; instagram: string | null; linkedin: string | null; telefone: string; pessoa_validar: string; status: string; created_at: string; member_id: string; members: { nome: string } | null };

export function RecommendationsPanel() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [lista, setLista] = useState<Recomendacao[]>([]);
  const [note, setNote] = useState('');

  const load = () => {
    supabase.from('member_missions').select('id,mission_slug,relato,status,created_at,members(id,nome,email),missions(titulo)').order('created_at', { ascending: false }).then(({ data }) => setEnvios((data || []) as unknown as Envio[]));
    supabase.from('recommendations').select('id,tipo,nome,instagram,linkedin,telefone,pessoa_validar,status,created_at,member_id,members(nome)').order('created_at', { ascending: false }).then(({ data }) => setLista((data || []) as unknown as Recomendacao[]));
  };
  useEffect(load, []);

  async function decidirMissao(item: Envio, status: 'concluida' | 'recusada') {
    if (!window.confirm(`${status === 'concluida' ? 'Aprovar' : 'Recusar'} a missão de ${item.members?.nome}?`)) return;
    const { error } = await supabase.from('member_missions').update({ status, decidido_em: new Date().toISOString() }).eq('id', item.id);
    setNote(error ? error.message : 'Missão atualizada.');
    load();
  }

  async function decidirRecomendacao(item: Recomendacao, status: 'validada' | 'recusada') {
    if (!window.confirm(status === 'validada' ? `Validar ${item.nome}? Soma 10 pontos para ${item.members?.nome}.` : `Recusar ${item.nome}?`)) return;
    const { error } = await supabase.from('recommendations').update({ status, decidido_em: new Date().toISOString() }).eq('id', item.id);
    if (!error && status === 'validada') await supabase.from('point_events').insert({ member_id: item.member_id, acao: `recomendacao:${item.id}`, pontos: 10, motivo: item.nome });
    setNote(error ? error.message : 'Recomendação atualizada.');
    load();
  }

  return (
    <>
      <div className="wf-head"><div><small>PROGRAMA DE MEMBROS</small><h1>Missões e recomendações</h1><p>O que os membros enviaram pelo espaço deles e aguarda a organização.</p></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <header><small>MISSÕES</small><h2>{envios.filter((item) => item.status === 'enviada').length} para analisar</h2></header>
        <div className="adm-list">
          {envios.map((item) => (
            <div className="adm-row adm-row--static" key={item.id}>
              <strong>{item.members?.nome}</strong>
              <span>{item.missions?.titulo}: {item.relato}</span>
              {item.status === 'enviada'
                ? <span><button type="button" onClick={() => void decidirMissao(item, 'concluida')}>Aprovar</button> <button type="button" onClick={() => void decidirMissao(item, 'recusada')}>Recusar</button></span>
                : <em>{item.status === 'concluida' ? 'Aprovada' : 'Recusada'}</em>}
            </div>
          ))}
        </div>
        {!envios.length && <p className="adm-hint">Nenhuma missão enviada ainda.</p>}
      </section>
      <section className="v2-forms-card">
        <header><small>RECOMENDAÇÕES</small><h2>{lista.filter((item) => item.status === 'pendente').length} para validar</h2></header>
        <div className="adm-list">
          {lista.map((item) => (
            <div className="adm-row adm-row--static" key={item.id}>
              <strong>{item.nome}</strong>
              <span>{item.tipo === 'lugar' ? 'Lugar' : 'Parceiro'} · por {item.members?.nome} · validar com {item.pessoa_validar} · {item.telefone}{item.instagram ? ` · ${item.instagram}` : ''}{item.linkedin ? ` · ${item.linkedin}` : ''}</span>
              {item.status === 'pendente'
                ? <span><button type="button" onClick={() => void decidirRecomendacao(item, 'validada')}>Validar</button> <button type="button" onClick={() => void decidirRecomendacao(item, 'recusada')}>Recusar</button></span>
                : <em>{item.status === 'validada' ? 'Validada' : 'Recusada'}</em>}
            </div>
          ))}
        </div>
        {!lista.length && <p className="adm-hint">Nenhuma recomendação enviada ainda.</p>}
      </section>
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

  const linha = (item: Match) => (
    <div className="adm-row adm-row--static" key={item.id}>
      <strong>{item.a?.nome}{item.cali ? '' : ` e ${item.b?.nome}`}</strong>
      <span>Busca: {item.motivo}{item.a?.segmento ? ` · ${item.a.segmento}` : ''}</span>
      {item.status === 'sugerido'
        ? <span><button type="button" onClick={() => void decidir(item, 'liberado')}>Liberar</button> <button type="button" onClick={() => void decidir(item, 'recusado')}>Descartar</button></span>
        : <em>{item.status === 'liberado' ? 'Liberado' : 'Descartado'}</em>}
    </div>
  );
  const cali = lista.filter((item) => item.cali);
  const outros = lista.filter((item) => !item.cali);

  return (
    <>
      <div className="wf-head"><div><small>PROGRAMA DE MEMBROS</small><h1>Matches</h1><p>Sugestões criadas pelo que cada pessoa busca e pelo que as outras fazem. Nada chega ao membro antes de você liberar.</p></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <header><small>PRIORIDADE</small><h2>{cali.filter((item) => item.status === 'sugerido').length} para a CALI</h2></header>
        <div className="adm-list">{cali.map(linha)}</div>
        {!cali.length && <p className="adm-hint">Ninguém buscando serviços ligados à CALI por enquanto.</p>}
      </section>
      <section className="v2-forms-card">
        <header><small>ENTRE MEMBROS</small><h2>{outros.filter((item) => item.status === 'sugerido').length} para analisar</h2></header>
        <div className="adm-list">{outros.map(linha)}</div>
        {!outros.length && <p className="adm-hint">Nenhuma sugestão entre membros ainda.</p>}
      </section>
    </>
  );
}
