/* Aprovação dos recados das edições encerradas. Dentro de cada edição (aba Comentários) e, resumido, em Revisar aprovações. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { dataBr } from './AdminTabela';
import { AvatarRecado } from '../components/AvatarRecado';
import './admin-comentarios.css';

type Comentario = { id: string; nome: string | null; anonimo: boolean; texto: string; status: string; avatar: string | null; created_at: string; decidido_em: string | null; decidido_por: string | null; editions: { titulo: string } | null };
const ABAS: Array<[string, string]> = [['pendente', 'Para aprovar'], ['aprovado', 'Publicados'], ['recusado', 'Recusados']];

export function ComentariosPanel({ edicaoId }: { edicaoId?: string }) {
  const [lista, setLista] = useState<Comentario[]>([]);
  const [aba, setAba] = useState('pendente');
  const [note, setNote] = useState('');
  const load = () => {
    let consulta = supabase.from('edition_comments').select('id,nome,anonimo,texto,status,avatar,created_at,decidido_em,decidido_por,editions(titulo)').order('created_at', { ascending: false });
    if (edicaoId) consulta = consulta.eq('edition_id', edicaoId);
    void consulta.then(({ data, error }) => { if (error) setNote(error.message); else setLista((data || []) as unknown as Comentario[]); });
  };
  useEffect(load, [edicaoId]);

  async function decidir(item: Comentario, status: 'aprovado' | 'recusado') {
    const quem = (await supabase.auth.getSession()).data.session?.user.email || '';
    const { error } = await supabase.from('edition_comments').update({ status, decidido_em: new Date().toISOString(), decidido_por: quem }).eq('id', item.id);
    setNote(error ? error.message : status === 'aprovado' ? 'Publicado. Já aparece na página da edição.' : 'Recusado. Não aparece no site.');
    load();
  }
  async function excluir(item: Comentario) {
    if (!window.confirm('Excluir este recado de vez? Não dá para desfazer.')) return;
    const { error } = await supabase.from('edition_comments').delete().eq('id', item.id);
    setNote(error ? error.message : 'Recado excluído.');
    load();
  }
  const conta = (status: string) => lista.filter((item) => item.status === status).length;
  const visiveis = lista.filter((item) => item.status === aba);
  const miolo = (
    <section className="v2-forms-card cm">
      <header><small>RECADOS DA EDIÇÃO</small><h2>{conta('pendente') ? `${conta('pendente')} para aprovar` : 'Nenhum recado para aprovar'}</h2></header>
      <p className="adm-hint">Quem esteve no encontro, ou qualquer pessoa que abrir a página da edição, pode deixar um recado. Só aparece no site o que você publicar aqui.</p>
      <div className="cm__abas" role="tablist">{ABAS.map(([id, nome]) => <button key={id} type="button" role="tab" aria-selected={aba === id} className={`cm__aba${aba === id ? ' is-on' : ''}`} onClick={() => setAba(id)}>{nome} <b>{conta(id)}</b></button>)}</div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      {visiveis.length === 0 ? <p className="cm__vazio">{aba === 'pendente' ? 'Tudo em dia. Novos recados aparecem aqui.' : 'Nada por aqui ainda.'}</p> : (
        <ul className="cm__lista">{visiveis.map((item) => (
          <li key={item.id}>
            <AvatarRecado tipo={item.avatar} tamanho={40} />
            <div className="cm__texto"><p>{item.texto}</p><small>{item.anonimo ? 'Anônimo' : item.nome || 'Anônimo'} · {dataBr(item.created_at)}{!edicaoId && item.editions?.titulo ? ` · ${item.editions.titulo}` : ''}</small></div>
            <span className="cm__acoes">
              {item.status !== 'aprovado' && <button type="button" className="cm__ok" onClick={() => void decidir(item, 'aprovado')}>Publicar</button>}
              {item.status !== 'recusado' && <button type="button" onClick={() => void decidir(item, 'recusado')}>Recusar</button>}
              <button type="button" className="cm__lixo" onClick={() => void excluir(item)}>Excluir</button>
            </span>
          </li>
        ))}</ul>
      )}
    </section>
  );
  if (edicaoId) return miolo;
  return (
    <>
      <div className="wf-head"><div><small>EDIÇÕES</small><h1>Recados</h1><p>Os recados deixados em todas as edições. Para cuidar de uma edição só, abra a edição e use a aba Comentários.</p></div></div>
      {miolo}
    </>
  );
}
