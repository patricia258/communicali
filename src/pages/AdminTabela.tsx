/* Tabela do painel: ordena pelas colunas, filtra e busca. Contatos viram links com botão de copiar. */
import { useMemo, useState, type ReactNode } from 'react';

export type Coluna<T> = { id: string; titulo: string; valor: (linha: T) => string | number; render?: (linha: T) => ReactNode };
export type Filtro<T> = { id: string; titulo: string; valor: (linha: T) => string };

export function Tabela<T>({ colunas, linhas, chave, filtros = [], inicial, vazio }: { colunas: Array<Coluna<T>>; linhas: T[]; chave: (linha: T) => string; filtros?: Array<Filtro<T>>; inicial?: { id: string; desc?: boolean }; vazio: string }) {
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
        <p className="adm-contagem">{visiveis.length} de {linhas.length}</p>
      </div>
      <div className="adm-tabela">
        <table>
          <thead><tr>{colunas.map((coluna) => (
            <th key={coluna.id} aria-sort={ordem.id === coluna.id ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>
              <button type="button" onClick={() => setOrdem({ id: coluna.id, desc: ordem.id === coluna.id ? !ordem.desc : false })}>{coluna.titulo}{ordem.id === coluna.id ? (ordem.desc ? ' ↓' : ' ↑') : ''}</button>
            </th>
          ))}</tr></thead>
          <tbody>
            {visiveis.map((linha) => <tr key={chave(linha)}>{colunas.map((coluna) => <td key={coluna.id}>{coluna.render ? coluna.render(linha) : coluna.valor(linha)}</td>)}</tr>)}
            {!visiveis.length && <tr><td colSpan={colunas.length} className="adm-vazio">{vazio}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Copiar({ texto }: { texto: string }) {
  const [feito, setFeito] = useState(false);
  return <button type="button" className="adm-copiar" aria-label={`Copiar ${texto}`} onClick={() => void navigator.clipboard.writeText(texto).then(() => { setFeito(true); window.setTimeout(() => setFeito(false), 1500); })}>{feito ? 'Copiado' : 'Copiar'}</button>;
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

export const dataBr = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-');

export function Categoria({ id, nome }: { id: string; nome: string }) {
  return <span className={`adm-pill adm-pill--${id}`}>{nome}</span>;
}
