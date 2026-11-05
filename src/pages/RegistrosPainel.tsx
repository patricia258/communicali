/* Tabela de cadastros (STAFF, fornecedores) no mesmo modelo das respostas de formulário:
   busca, filtro, exportar, editar na gaveta lateral, excluir uma ou várias. */
import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, FileSpreadsheet, Pencil, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { supabase } from '../lib';
import { downloadXlsx } from '../forms/formExports';
import '../forms/admin-forms.css';

export type Campo<T> = {
  id: string;
  titulo: string;
  valor: (linha: T) => string;
  /** Coluna do banco que o campo edita na gaveta; sem ela, o campo só aparece para leitura. */
  coluna?: keyof T & string;
  longo?: boolean;
  /** Fica fora da tabela (aparece na gaveta e no Excel). */
  soDetalhe?: boolean;
};

type Linha = { id: string; created_at: string; status?: string };

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function RegistrosPainel<T extends Linha>({ tabela, campos, nome, alerta, filtro, arquivo, vazio }: {
  tabela: 'staff' | 'fornecedores';
  campos: Array<Campo<T>>;
  nome: (linha: T) => string;
  alerta?: (linha: T) => string | null;
  filtro?: { titulo: string; valor: (linha: T) => string };
  arquivo: string;
  vazio: string;
}) {
  const [linhas, setLinhas] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [escolha, setEscolha] = useState('');
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);
  const [vendo, setVendo] = useState<T | null>(null);
  const [aviso, setAviso] = useState('');

  async function carregar() {
    setCarregando(true); setErro('');
    const { data, error } = await supabase.from(tabela).select('*').order('created_at', { ascending: false });
    if (error) setErro('Não foi possível carregar os cadastros.'); else setLinhas((data || []) as T[]);
    setCarregando(false); setSelecao(new Set());
  }
  useEffect(() => { void carregar(); }, [tabela]);

  const flash = (texto: string) => { setAviso(texto); window.setTimeout(() => setAviso(''), 2500); };
  const opcoes = useMemo(() => (filtro ? [...new Set(linhas.map(filtro.valor).filter(Boolean))].sort() : []), [linhas, filtro]);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter((linha) => (!escolha || filtro?.valor(linha) === escolha) && (!termo || campos.map((campo) => campo.valor(linha)).join(' ').toLowerCase().includes(termo)));
  }, [linhas, busca, escolha, campos, filtro]);
  const colunas = campos.filter((campo) => !campo.soDetalhe);
  const todos = visiveis.length > 0 && visiveis.every((linha) => selecao.has(linha.id));
  const alternar = (id: string) => setSelecao((atual) => { const novo = new Set(atual); if (novo.has(id)) novo.delete(id); else novo.add(id); return novo; });

  function exportar() {
    downloadXlsx(arquivo, 'Cadastros', ['Data', ...campos.map((campo) => campo.titulo)], visiveis.map((linha) => [dataHora(linha.created_at), ...campos.map((campo) => campo.valor(linha))]));
  }

  function excluirUm(linha: T) { setSelecao(new Set([linha.id])); setEditando(null); setConfirmar(true); }

  async function excluir() {
    setExcluindo(true);
    const ids = [...selecao];
    const { error } = await supabase.from(tabela).delete().in('id', ids);
    setExcluindo(false); setConfirmar(false);
    if (error) { setErro('Não foi possível excluir.'); return; }
    setLinhas((atual) => atual.filter((item) => !selecao.has(item.id))); setSelecao(new Set());
    flash(`${ids.length} ${ids.length === 1 ? 'cadastro excluído' : 'cadastros excluídos'}`);
  }

  return <div className="v2-forms-responses">
    <div className="wf-controls v2-forms-controls">
      <label className="v2-forms-search"><Search size={15} /><input value={busca} placeholder="Buscar nos cadastros" onChange={(event) => setBusca(event.target.value)} /></label>
      {filtro && <select className="v2-forms-filter-select" aria-label={filtro.titulo} value={escolha} onChange={(event) => setEscolha(event.target.value)}><option value="">{filtro.titulo}: todos</option>{opcoes.map((item) => <option key={item}>{item}</option>)}</select>}
      <span className="v2-forms-total">{visiveis.length} de {linhas.length}</span>
      <button type="button" className="wf-secondary" onClick={() => void carregar()} disabled={carregando}><RefreshCw size={15} /> Atualizar</button>
      <button type="button" className="wf-primary" disabled={!visiveis.length} onClick={exportar}><FileSpreadsheet size={15} /> Exportar Excel</button>
    </div>
    {selecao.size > 0 && !confirmar && <div className="v2-forms-selbar" role="status"><strong>{selecao.size} {selecao.size === 1 ? 'cadastro selecionado' : 'cadastros selecionados'}</strong><button type="button" className="v2-forms-delete" onClick={() => setConfirmar(true)}><Trash2 size={14} /> Excluir</button></div>}
    {erro && <div className="inline-notice" role="alert">{erro}</div>}
    {carregando ? <div className="data-loading">Carregando cadastros…</div> : !linhas.length ? <div className="wf-empty"><strong>{vazio}</strong></div>
      : <div className="v2-forms-table-wrap"><table className="v2-forms-table">
        <thead><tr>
          <th className="v2-forms-check-col"><input type="checkbox" aria-label="Selecionar todos" checked={todos} onChange={() => setSelecao(todos ? new Set() : new Set(visiveis.map((linha) => linha.id)))} /></th>
          <th className="v2-forms-edit-col" aria-label="Ver, editar ou excluir" />
          <th className="v2-forms-date-col">Data</th>
          {colunas.map((campo) => <th key={campo.id} title={campo.titulo}>{campo.titulo}</th>)}
        </tr></thead>
        <tbody>{visiveis.map((linha) => <tr key={linha.id} className={selecao.has(linha.id) ? 'is-selected' : ''}>
          <td className="v2-forms-check-col"><input type="checkbox" aria-label="Selecionar cadastro" checked={selecao.has(linha.id)} onChange={() => alternar(linha.id)} /></td>
          <td className="v2-forms-edit-col"><span className="v2-forms-row-actions"><button type="button" className="v2-forms-edit" title="Ver cadastro completo" aria-label="Ver cadastro completo" onClick={() => setVendo(linha)}><Eye size={14} /></button><button type="button" className="v2-forms-edit" title="Editar cadastro" aria-label="Editar cadastro" onClick={() => setEditando(linha)}><Pencil size={13} /></button><button type="button" className="v2-forms-edit v2-forms-edit--excluir" title="Excluir cadastro" aria-label="Excluir cadastro" onClick={() => excluirUm(linha)}><Trash2 size={13} /></button></span></td>
          <td className="v2-forms-date v2-forms-date-col">{dataHora(linha.created_at)}{alerta?.(linha) && <span className="v2-forms-alerta" title={alerta(linha) || ''}> · Conferir</span>}</td>
          {colunas.map((campo) => { const texto = campo.valor(linha); return <td key={campo.id} title={texto}>{texto || '—'}</td>; })}
        </tr>)}</tbody>
      </table></div>}
    {vendo && <VerRegistro linha={vendo} campos={campos} nome={nome(vendo)} alerta={alerta?.(vendo) || ''} onClose={() => setVendo(null)} onEdit={() => { setEditando(vendo); setVendo(null); }} />}
    {editando && <EditarRegistro tabela={tabela} linha={editando} campos={campos} nome={nome(editando)} alerta={alerta?.(editando) || ''} onClose={() => setEditando(null)} onDelete={() => excluirUm(editando)}
      onSaved={(salvo) => { setLinhas((atual) => atual.map((item) => (item.id === salvo.id ? salvo : item))); setEditando(null); flash('Cadastro atualizado'); }} />}
    {confirmar && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !excluindo) setConfirmar(false); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Excluir cadastros">
      <div><small>CADASTROS</small><h2>Excluir {selecao.size === 1 ? 'cadastro' : `${selecao.size} cadastros`}?</h2><p>{linhas.filter((linha) => selecao.has(linha.id)).slice(0, 4).map(nome).join(', ')}{selecao.size > 4 ? ` e mais ${selecao.size - 4}` : ''}. Esta ação não pode ser desfeita.</p></div>
      <footer><button type="button" disabled={excluindo} onClick={() => setConfirmar(false)}>Cancelar</button><button type="button" className="danger" disabled={excluindo} onClick={() => void excluir()}>{excluindo ? 'Excluindo…' : 'Excluir'}</button></footer>
    </section></div>}
    {aviso && <div className="v2-forms-toast" role="status"><Check size={14} /> {aviso}</div>}
  </div>;
}

function EditarRegistro<T extends Linha>({ tabela, linha, campos, nome, alerta, onClose, onSaved, onDelete }: { tabela: 'staff' | 'fornecedores'; linha: T; campos: Array<Campo<T>>; nome: string; alerta: string; onClose: () => void; onSaved: (linha: T) => void; onDelete: () => void }) {
  const editaveis = campos.filter((campo) => campo.coluna);
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(editaveis.map((campo) => [campo.coluna!, String((linha as Record<string, unknown>)[campo.coluna!] ?? '')])));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function salvar() {
    setSalvando(true); setErro('');
    const mudou = Object.fromEntries(Object.entries(valores).filter(([coluna, valor]) => valor !== String((linha as Record<string, unknown>)[coluna] ?? '')).map(([coluna, valor]) => [coluna, valor.trim() || null]));
    if (!Object.keys(mudou).length) { setSalvando(false); onClose(); return; }
    const { data, error } = await supabase.from(tabela).update({ ...mudou, updated_at: new Date().toISOString() }).eq('id', linha.id).select('*').single();
    setSalvando(false);
    if (error || !data) { setErro('Não foi possível salvar.'); return; }
    onSaved(data as T);
  }

  return <div className="ap-pd-overlay v2-forms-drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) onClose(); }}>
    <aside className="v2-forms-drawer" role="dialog" aria-modal="true" aria-label="Ver e editar cadastro">
      <header><div><small>CADASTRO · {dataHora(linha.created_at)}</small><h2>{nome}</h2><p>Corrija o que chegou errado. Os campos sem caixa são só para conferência.</p></div><button type="button" aria-label="Fechar" onClick={onClose}><X size={18} /></button></header>
      <div className="v2-forms-drawer-body">
        {alerta && <p className="v2-forms-error is-largo" role="note">Conferir: {alerta}</p>}
        {campos.map((campo) => <div className={`v2-forms-edit-field${campo.longo ? ' is-largo' : ''}`} key={campo.id}><span>{campo.titulo}</span>
          {campo.coluna
            ? (campo.longo ? <textarea rows={3} value={valores[campo.coluna]} onChange={(event) => setValores({ ...valores, [campo.coluna!]: event.target.value })} /> : <input value={valores[campo.coluna]} onChange={(event) => setValores({ ...valores, [campo.coluna!]: event.target.value })} />)
            : <p className="v2-forms-leitura">{campo.valor(linha) || '—'}</p>}
        </div>)}
      </div>
      {erro && <p className="v2-forms-error" role="alert">{erro}</p>}
      <footer><button type="button" className="v2-forms-delete v2-forms-drawer-excluir" disabled={salvando} onClick={onDelete}><Trash2 size={14} /> Excluir cadastro</button><button type="button" className="wf-secondary" disabled={salvando} onClick={onClose}>Cancelar</button><button type="button" className="wf-primary" disabled={salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar'}</button></footer>
    </aside>
  </div>;
}

/** Leitura do cadastro completo, sem caixas de edição. */
function VerRegistro<T extends Linha>({ linha, campos, nome, alerta, onClose, onEdit }: { linha: T; campos: Array<Campo<T>>; nome: string; alerta: string; onClose: () => void; onEdit: () => void }) {
  return <div className="ap-pd-overlay v2-forms-drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="v2-forms-drawer" role="dialog" aria-modal="true" aria-label="Cadastro completo">
      <header><div><small>CADASTRO · {dataHora(linha.created_at)}</small><h2>{nome}</h2></div><button type="button" aria-label="Fechar" onClick={onClose}><X size={18} /></button></header>
      <div className="v2-forms-drawer-body">
        {alerta && <p className="v2-forms-error is-largo" role="note">Conferir: {alerta}</p>}
        {campos.map((campo) => { const texto = campo.valor(linha); return <div className={`v2-forms-edit-field${campo.longo || texto.length > 60 ? ' is-largo' : ''}`} key={campo.id}><span>{campo.titulo}</span><p className="v2-forms-leitura">{texto || '—'}</p></div>; })}
      </div>
      <footer><button type="button" className="wf-secondary" onClick={onClose}>Fechar</button><button type="button" className="wf-primary" onClick={onEdit}><Pencil size={14} /> Editar</button></footer>
    </aside>
  </div>;
}
