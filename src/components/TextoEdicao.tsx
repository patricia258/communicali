import { Fragment, type ReactNode } from 'react';

/** Texto do resumo da edição: respeita parágrafos (linha em branco), **negrito**, listas com "- " e subtítulos com "## ". Nada de HTML solto. */
const negrito = (linha: string): ReactNode[] => linha.split(/(\*\*[^*]+\*\*)/g).map((parte, i) => parte.startsWith('**') && parte.endsWith('**') && parte.length > 4 ? <strong key={i}>{parte.slice(2, -2)}</strong> : <Fragment key={i}>{parte}</Fragment>);

export function TextoEdicao({ texto }: { texto: string }) {
  const blocos = texto.replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="hn-ed__corpo">
      {blocos.map((bloco, i) => {
        const linhas = bloco.split('\n');
        if (linhas.every((l) => /^\s*[-•]\s+/.test(l))) return <ul key={i}>{linhas.map((l, j) => <li key={j}>{negrito(l.replace(/^\s*[-•]\s+/, ''))}</li>)}</ul>;
        if (/^##\s+/.test(bloco) && linhas.length === 1) return <h3 key={i}>{negrito(bloco.replace(/^##\s+/, ''))}</h3>;
        return <p key={i}>{linhas.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{negrito(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
