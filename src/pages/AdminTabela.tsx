/* Tabela do painel: ordena pelas colunas, filtra e busca. Contatos viram links com botão de copiar. */
import { useMemo, useState, type ReactNode } from 'react';

export type Coluna<T> = { id: string; titulo: string; valor: (linha: T) => string | number; render?: (linha: T) => ReactNode; longo?: boolean; /** Cabeçalho próprio (ex.: caixa de selecionar todos), sem ordenação. */ cabecalho?: ReactNode; estreita?: boolean };
export type Filtro<T> = { id: string; titulo: string; valor: (linha: T) => string };

/** `acoes` (imprimir, exportar...) ficam na mesma linha da busca e dos filtros, encostadas à direita. */
export function Tabela<T>({ colunas, linhas, chave, filtros = [], inicial, vazio, acoes }: { colunas: Array<Coluna<T>>; linhas: T[]; chave: (linha: T) => string; filtros?: Array<Filtro<T>>; inicial?: { id: string; desc?: boolean }; vazio: string; acoes?: ReactNode }) {
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

  return (
    <>
      <div className="adm-filtros">
        <label><span>Buscar</span><input value={busca} onChange={(event) => setBusca(event.target.value)} /></label>
        {filtros.map((filtro) => (
          <label key={filtro.id}><span>{filtro.titulo}</span>
            <select value={escolha[filtro.id] || ''} onChange={(event) => setEscolha({ ...escolha, [filtro.id]: event.target.value })}>
              <option value="">Todos</option>
              {[...new Set(linhas.map(filtro.valor).filter(Boolean))].sort().map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        ))}
        <div className="adm-filtros__fim"><p className="adm-contagem">{visiveis.length} de {linhas.length}</p>{acoes}</div>
      </div>
      <div className="adm-tabela">
        <table>
          <thead><tr>{colunas.map((coluna) => (
            <th key={coluna.id} className={coluna.estreita ? 'estreita' : undefined} aria-sort={ordem.id === coluna.id ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>
              {coluna.cabecalho !== undefined ? coluna.cabecalho : <button type="button" onClick={() => setOrdem({ id: coluna.id, desc: ordem.id === coluna.id ? !ordem.desc : false })}>{coluna.titulo}{ordem.id === coluna.id ? (ordem.desc ? ' ↓' : ' ↑') : ''}</button>}
            </th>
          ))}</tr></thead>
          <tbody>
            {visiveis.map((linha) => <tr key={chave(linha)}>{colunas.map((coluna) => <td key={coluna.id} className={coluna.longo ? 'longo' : coluna.estreita ? 'estreita' : undefined}>{coluna.render ? coluna.render(linha) : coluna.valor(linha)}</td>)}</tr>)}
            {!visiveis.length && <tr><td colSpan={colunas.length} className="adm-vazio">{vazio}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
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
