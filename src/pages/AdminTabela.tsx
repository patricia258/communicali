/* Tabela do painel: ordena pelas colunas, filtra e busca. Contatos viram links com botão de copiar. */
import { Columns3, MoreHorizontal, Search, SlidersHorizontal, X } from 'lucide-react';
import { Fragment, useEffect, useId, useMemo, useState, type ReactNode } from 'react';

export type Coluna<T> = { id: string; titulo: string; valor: (linha: T) => string | number; render?: (linha: T) => ReactNode; longo?: boolean; /** Cabeçalho próprio (ex.: caixa de selecionar todos), sem ordenação. */ cabecalho?: ReactNode; estreita?: boolean };
export type Filtro<T> = { id: string; titulo: string; valor: (linha: T) => string };

/** `acoes` (imprimir, exportar...) ficam na mesma linha da busca e dos filtros, encostadas à direita. */
export function Tabela<T>({ colunas, linhas, chave, filtros = [], inicial, vazio, acoes, colunasIniciais, suspensa }: { colunas: Array<Coluna<T>>; linhas: T[]; chave: (linha: T) => string; filtros?: Array<Filtro<T>>; inicial?: { id: string; desc?: boolean }; vazio: string; acoes?: ReactNode; colunasIniciais?: string[]; /** Título da lista suspensa: a lista fica recolhida até a pessoa abrir. */ suspensa?: string }) {
  const idTabela = useId();
  // Nos primeiros instantes uma lista vazia ainda pode estar carregando: mostra esqueleto em vez de "nenhum registro".
  const [aguardando, setAguardando] = useState(true);
  useEffect(() => { const t = window.setTimeout(() => setAguardando(false), 1100); return () => window.clearTimeout(t); }, []);
  const [selecionadas, setSelecionadas] = useState(() => colunasIniciais || colunas.map((coluna) => coluna.id));
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set());
  const exibidas = colunas.filter((coluna) => selecionadas.includes(coluna.id));
  const extras = colunas.filter((coluna) => !selecionadas.includes(coluna.id));
  const limite = colunas.length;
  const alternarColuna = (id: string) => setSelecionadas((atuais) => {
    if (atuais.includes(id)) return atuais.length > 1 ? atuais.filter((item) => item !== id) : atuais;
    return [...(atuais.length >= limite ? atuais.slice(0, -1) : atuais), id];
  });
  const alternarLinha = (id: string) => setAbertas((atuais) => { const proximo = new Set(atuais); if (proximo.has(id)) proximo.delete(id); else proximo.add(id); return proximo; });
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState(inicial || { id: colunas[0].id, desc: false });
  const [escolha, setEscolha] = useState<Record<string, string>>({});

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const coluna = colunas.find((item) => item.id === ordem.id) || colunas[0];
    return linhas
      .filter((linha) => filtros.every((filtro) => !escolha[filtro.id] || filtro.valor(linha) === escolha[filtro.id]))
      .filter((linha) => !termo || colunas.map((item) => item.valor(linha)).join(' ').toLowerCase().includes(termo))
      .sort((a, b) => {
        const [x, y] = [coluna.valor(a), coluna.valor(b)];
        const resultado = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
        return ordem.desc ? -resultado : resultado;
      });
  }, [linhas, busca, ordem, escolha, colunas, filtros]);

  const conteudo = (coluna: Coluna<T>, linha: T) => coluna.render ? coluna.render(linha) : ['status', 'situacao', 'adesao', 'inscricoes', 'site'].includes(coluna.id) ? <span className="adm-pill">{coluna.valor(linha)}</span> : coluna.valor(linha);

  const miolo = (
    <>
      <div className="adm-filtros">
        <label className="adm-busca"><span>Buscar</span><div><Search size={15} aria-hidden="true" /><input placeholder="Buscar nesta lista" value={busca} onChange={(event) => setBusca(event.target.value)} /></div></label>
        {filtros.length > 0 && <details className="adm-filtros-avancados"><summary><SlidersHorizontal size={15} aria-hidden="true" />Filtros{Object.values(escolha).filter(Boolean).length ? ` (${Object.values(escolha).filter(Boolean).length})` : ''}</summary><div>{filtros.map((filtro) => (
          <label key={filtro.id}><span>{filtro.titulo}</span>
            <select value={escolha[filtro.id] || ''} onChange={(event) => setEscolha({ ...escolha, [filtro.id]: event.target.value })}>
              <option value="">Todos</option>
              {[...new Set(linhas.map(filtro.valor).filter(Boolean))].sort().map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        ))}</div></details>}
        <div className="adm-filtros__fim"><p className="adm-contagem">{visiveis.length} de {linhas.length}</p>{colunas.length > 5 && <details className="adm-colunas"><summary><Columns3 size={15} aria-hidden="true" />Colunas</summary><div><strong>Colunas da lista</strong><p>Marque as colunas que quer ver na lista. As que ficarem de fora aparecem em Detalhes, no botão de três pontinhos.</p>{colunas.map((coluna) => <label key={coluna.id}><input type="checkbox" checked={selecionadas.includes(coluna.id)} disabled={selecionadas.includes(coluna.id) && selecionadas.length === 1} onChange={() => alternarColuna(coluna.id)} />{coluna.titulo || 'Seleção'}</label>)}</div></details>}{acoes}</div>
      </div>
      <div className="adm-ordenacao"><label>Ordenar por<select value={ordem.id} onChange={(event) => setOrdem({ ...ordem, id: event.target.value })}>{colunas.filter((coluna) => coluna.cabecalho === undefined).map((coluna) => <option key={coluna.id} value={coluna.id}>{coluna.titulo}</option>)}</select></label><button type="button" className="wf-secondary" onClick={() => setOrdem({ ...ordem, desc: !ordem.desc })}>{ordem.desc ? 'Decrescente ↓' : 'Crescente ↑'}</button></div>
      <div className="adm-tabela">
        <table aria-label="Lista de registros">
          <thead><tr>{exibidas.map((coluna) => (
            <th scope="col" key={coluna.id} className={coluna.estreita ? 'estreita' : undefined} aria-sort={ordem.id === coluna.id ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>
              {coluna.cabecalho !== undefined ? coluna.cabecalho : <button type="button" onClick={() => setOrdem({ id: coluna.id, desc: ordem.id === coluna.id ? !ordem.desc : false })}>{coluna.titulo}{ordem.id === coluna.id ? (ordem.desc ? ' ↓' : ' ↑') : ''}</button>}
            </th>
          ))}{extras.length > 0 && <th scope="col" className="adm-tabela__mais"><span className="adm-sr">Detalhes</span></th>}</tr></thead>
          <tbody>
            {visiveis.map((linha) => { const id = chave(linha); const aberta = abertas.has(id); const nome = String(colunas[0].valor(linha)); return <Fragment key={id}>
              <tr>{exibidas.map((coluna) => <td data-label={coluna.titulo} key={coluna.id} className={coluna.longo ? 'longo' : coluna.estreita ? 'estreita' : undefined}>{conteudo(coluna, linha)}</td>)}
                {extras.length > 0 && <td className="adm-tabela__mais"><button type="button" className="adm-mais" aria-label={`${aberta ? 'Fechar' : 'Ver'} detalhes de ${nome}`} aria-expanded={aberta} aria-controls={`${idTabela}-${id}`} onClick={() => alternarLinha(id)}>{aberta ? <X size={17} /> : <MoreHorizontal size={19} />}</button></td>}
              </tr>
              {extras.length > 0 && <tr id={`${idTabela}-${id}`} className="adm-detalhes" hidden={!aberta}><td colSpan={exibidas.length + 1}><dl>{extras.map((coluna) => <div key={coluna.id}><dt>{coluna.titulo || 'Seleção'}</dt><dd>{conteudo(coluna, linha)}</dd></div>)}</dl></td></tr>}
            </Fragment>; })}
            {!visiveis.length && (aguardando && !linhas.length && !busca ? [0, 1, 2].map((n) => <tr key={`esq${n}`} className="adm-esqueleto" aria-hidden="true"><td colSpan={exibidas.length + (extras.length ? 1 : 0)}><span /></td></tr>) : <tr><td colSpan={exibidas.length + (extras.length ? 1 : 0)} className="adm-vazio">{vazio}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
  return suspensa ? <details className="adm-suspensa"><summary>{suspensa} ({linhas.length})</summary>{miolo}</details> : miolo;
}

export function Copiar({ texto }: { texto: string }) {
  const [feito, setFeito] = useState(false);
  return <button type="button" className="adm-copiar" aria-label={`Copiar ${texto}`} title={feito ? 'Copiado' : 'Copiar'} onClick={() => void navigator.clipboard.writeText(texto).then(() => { setFeito(true); window.setTimeout(() => setFeito(false), 1500); })}>{feito ? '✓' : <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>}</button>;
}

export function Telefone({ numero }: { numero: string | null }) {
  if (!numero) return <>-</>;
  const digitos = numero.replace(/\D/g, '');
  return <span className="adm-contato"><a href={`https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`} target="_blank" rel="noopener noreferrer">{numero}</a><Copiar texto={numero} /></span>;
}

export function Email({ email }: { email: string | null }) {
  if (!email) return <>-</>;
  return <span className="adm-contato"><a href={`mailto:${email}`}>{email}</a><Copiar texto={email} /></span>;
}

export function Rede({ valor, tipo }: { valor: string | null; tipo: 'instagram' | 'linkedin' }) {
  if (!valor) return <>-</>;
  const url = /^https?:/.test(valor) ? valor : tipo === 'instagram' ? `https://www.instagram.com/${valor.replace(/^@/, '')}` : `https://${valor}`;
  return <a href={url} target="_blank" rel="noopener noreferrer">{valor}</a>;
}

// Datas só com dia (AAAA-MM-DD) ficam como estão; horários do banco (UTC) aparecem no fuso de São Paulo.
export const dataBr = (iso: string | null | undefined) => (!iso ? '-' : iso.length <= 10 ? iso.split('-').reverse().join('/') : new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

export function Categoria({ id, nome }: { id: string; nome: string }) {
  return <span className={`adm-pill adm-pill--${id}`}>{nome}</span>;
}
