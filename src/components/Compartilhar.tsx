import { useState } from 'react';

const SITE = 'https://comuni.calirh.com';

/** Botão "Compartilhar" que abre, na própria linha, as formas de enviar o link da edição. Funciona em qualquer navegador. */
export function Compartilhar({ slug, titulo, className = 'hn-pill hn-pill--line-ink' }: { slug: string; titulo: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const url = `${SITE}/e/${slug}`;
  const texto = `${titulo} | ComuniCALI`;

  async function copiar() {
    try { await navigator.clipboard.writeText(url); }
    catch {
      const campo = document.createElement('textarea');
      campo.value = url; campo.setAttribute('readonly', ''); campo.style.position = 'fixed'; campo.style.opacity = '0';
      document.body.appendChild(campo); campo.select(); try { document.execCommand('copy'); } catch { /* sem permissão */ } campo.remove();
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2200);
  }

  return (
    <>
      <button type="button" className={className} aria-expanded={aberto} onClick={() => setAberto(!aberto)}>Compartilhar</button>
      {aberto && (
        <div className="hn-share" role="group" aria-label="Formas de compartilhar">
          <button type="button" onClick={() => void copiar()}>{copiado ? 'Link copiado' : 'Copiar link'}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={`mailto:?subject=${encodeURIComponent(texto)}&body=${encodeURIComponent(url)}`}>E-mail</a>
        </div>
      )}
    </>
  );
}
