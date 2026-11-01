/* Painel de validação: missões enviadas pelos membros e recomendações de lugares e parceiros. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
