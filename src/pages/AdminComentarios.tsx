/* Painel de aprovação dos comentários das edições encerradas. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Tabela, dataBr, type Coluna } from './AdminTabela';

type Comentario = { id: string; nome: string | null; anonimo: boolean; texto: string; status: string; created_at: string; decidido_em: string | null; decidido_por: string | null; editions: { titulo: string } | null };
const SITUACAO: Record<string, string> = { pendente: 'Para aprovar', aprovado: 'Aprovado', recusado: 'Recusado' };

export function ComentariosPanel() {
  const [lista, setLista] = useState<Comentario[]>([]);
  const [note, setNote] = useState('');
  const load = () => { supabase.from('edition_comments').select('id,nome,anonimo,texto,status,created_at,decidido_em,decidido_por,editions(titulo)').order('created_at', { ascending: false }).then(({ data, error }) => { if (error) setNote(error.message); else setLista((data || []) as unknown as Comentario[]); }); };
  useEffect(load, []);

  async function decidir(item: Comentario, status: 'aprovado' | 'recusado') {
    const quem = (await supabase.auth.getSession()).data.session?.user.email || '';
    const { error } = await supabase.from('edition_comments').update({ status, decidido_em: new Date().toISOString(), decidido_por: quem }).eq('id', item.id);
    setNote(error ? error.message : status === 'aprovado' ? 'Comentário aprovado. Já aparece na página da edição.' : 'Comentário recusado.');
    load();
  }
  async function excluir(item: Comentario) {
    if (!window.confirm('Excluir este comentário de vez? Não dá para desfazer.')) return;
    const { error } = await supabase.from('edition_comments').delete().eq('id', item.id);
    setNote(error ? error.message : 'Comentário excluído.');
    load();
  }

  const colunas: Array<Coluna<Comentario>> = [
    { id: 'data', titulo: 'Enviado em', valor: (item) => item.created_at, render: (item) => dataBr(item.created_at) },
    { id: 'edicao', titulo: 'Edição', valor: (item) => item.editions?.titulo || '' },
    { id: 'quem', titulo: 'Como aparece', valor: (item) => (item.anonimo ? 'Anônimo' : item.nome || 'Anônimo') },
    { id: 'texto', titulo: 'Comentário', valor: (item) => item.texto, longo: true },
    { id: 'situacao', titulo: 'Situação', valor: (item) => SITUACAO[item.status] || item.status },
    { id: 'acoes', titulo: 'Decisão', valor: (item) => item.decidido_em || '', render: (item) => (
      <span className="adm-acoes">
        {item.status !== 'aprovado' && <button type="button" onClick={() => void decidir(item, 'aprovado')}>Aprovar</button>}
        {item.status !== 'recusado' && <button type="button" onClick={() => void decidir(item, 'recusado')}>Recusar</button>}
        <button type="button" onClick={() => void excluir(item)}>Excluir</button>
      </span>) },
  ];
  return (
    <>
      <div className="wf-head"><div><small>EDIÇÕES</small><h1>Comentários</h1><p>Quem esteve no encontro, ou qualquer pessoa que abrir a página da edição, pode comentar. Só aparece no site o que você aprovar aqui.</p></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <header><small>COMENTÁRIOS</small><h2>{lista.filter((item) => item.status === 'pendente').length} para aprovar</h2></header>
        <Tabela colunas={colunas} linhas={lista} chave={(item) => item.id} inicial={{ id: 'data', desc: true }} vazio="Nenhum comentário ainda." filtros={[{ id: 'situacao', titulo: 'Situação', valor: (item) => SITUACAO[item.status] || item.status }, { id: 'edicao', titulo: 'Edição', valor: (item) => item.editions?.titulo || '' }]} />
      </section>
    </>
  );
}
