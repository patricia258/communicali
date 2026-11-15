/* Listas impressas do painel (recepção, staff, mimos) no mesmo modelo: logo, ticket com o título, instrução,
   blocos por categoria com etiqueta e contagem, caixa para marcar, número, nome em destaque e rodapé. */

export type Grupo = { nome: string; cor?: 'vinho' | 'ouro'; linhas: string[][] };
export type Folha = { etiqueta: string; titulo: string; meta: string; instrucao: string; resumo: string; colunas: string[]; grupos: Grupo[]; rodape: string };

export const esc = (texto: string | null | undefined) => String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function folhaHtml(folha: Folha) {
  let n = 0;
  const grupos = folha.grupos.filter((grupo) => grupo.linhas.length).map((grupo) => `
    <tr class="grupo"><td colspan="${folha.colunas.length + 2}"><span class="tag tag--${grupo.cor || 'vinho'}">${esc(grupo.nome)}<i>${String(grupo.linhas.length).padStart(2, '0')}</i></span></td></tr>
    ${grupo.linhas.map((linha) => { n += 1; return `<tr><td class="caixa"><span></span></td><td class="n">${String(n).padStart(2, '0')}</td>${linha.map((celula, i) => `<td${i === 0 ? ' class="nome"' : ''}>${celula || '—'}</td>`).join('')}</tr>`; }).join('')}`).join('');
  return `<section class="folha">
    <header><img src="${window.location.origin}/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI"><div class="ticket"><small>${esc(folha.etiqueta)}</small><strong>${esc(folha.titulo)}</strong><span>${esc(folha.meta)}</span></div></header>
    <p class="linha"><span>${folha.instrucao}</span><span>${folha.resumo}</span></p>
    <table><thead><tr><th></th><th>Nº</th>${folha.colunas.map((coluna) => `<th>${esc(coluna)}</th>`).join('')}</tr></thead><tbody>${grupos || `<tr><td colspan="${folha.colunas.length + 2}">Ninguém nesta lista ainda.</td></tr>`}</tbody></table>
    <footer><span>CommuniCALI · comuni.calirh.com</span><span>${esc(folha.rodape)}</span></footer>
  </section>`;
}

/** Abre a janela de impressão. Devolve false quando o navegador bloqueou a janela. */
export function imprimirFolhas(titulo: string, folhas: Folha[]) {
  const janela = window.open('', '_blank');
  if (!janela) return false;
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap">
  <style>
    @page{size:A4;margin:12mm}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0;font-family:Inter,Arial,sans-serif;color:#1B0A10;font-size:11.5px}
    .folha{padding:8mm 4mm;page-break-after:always}.folha:last-child{page-break-after:auto}
    header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:14px}
    header img{height:44px}
    .ticket{position:relative;display:grid;gap:2px;min-width:270px;padding:12px 22px;border-radius:6px;background:#5a1e2d;color:#F3F6F9;outline:1px dashed rgba(198,218,234,.7);outline-offset:-5px}
    .ticket small{font-size:8.5px;font-weight:600;letter-spacing:.2em;color:#C6DAEA}
    .ticket strong{font:700 21px 'Funnel Display',Inter,sans-serif}
    .ticket span{font-size:9.5px;color:#EAF2F9}
    .linha{display:flex;justify-content:space-between;gap:12px;margin:0 0 4px;padding-top:8px;border-top:1px solid #D3E3F2;font-size:10.5px;color:#5D4F55}
    .linha mark{background:#D3E3F2;padding:0 3px}
    .linha b{font:700 14px 'Funnel Display',Inter,sans-serif;color:#5a1e2d}
    table{width:100%;border-collapse:collapse}
    th{padding:7px 6px;border-bottom:1px solid #1B0A10;text-align:left;font-size:8.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#5D4F55}
    td{padding:6px 6px;border-bottom:1px solid #EAF2F9;vertical-align:middle;line-height:1.25}
    tr{page-break-inside:avoid}
    tbody tr:not(.grupo):nth-child(even) td{background:#F7F9FB}
    td.caixa{width:22px}td.caixa span{display:block;width:13px;height:13px;border:1.3px solid #D3E3F2;border-radius:3px}
    td.n{width:26px;font-weight:600;color:#C6DAEA}
    td.nome{font-weight:700;font-size:12.5px}
    td.nome small.sub{display:block;margin-top:1px;font-weight:500;font-size:9.5px;color:#5A1E2D}
    tr.grupo td{padding:12px 0 6px;border:0;background:none!important}
    .tag{position:relative;display:inline-flex;align-items:center;gap:8px;padding:4px 18px 4px 10px;color:#fff;font-weight:700;font-size:11.5px;clip-path:polygon(0 0,100% 0,calc(100% - 9px) 50%,100% 100%,0 100%)}
    .tag i{font-style:normal;font-weight:600;font-size:9.5px;color:#C6DAEA;padding-left:8px;border-left:1px solid rgba(255,255,255,.35)}
    .tag--vinho{background:#5a1e2d}.tag--ouro{background:#C6DAEA;color:#1B0A10}.tag--ouro i{color:#5a1e2d;border-color:rgba(34,16,15,.25)}
    .pill{display:inline-block;padding:1px 8px;border:1px solid #7f9a6c;border-radius:999px;background:#F4F8FB;color:#3d5a2a;font-size:9.5px;font-weight:600}
    footer{display:flex;justify-content:space-between;margin-top:18px;padding-top:8px;border-top:1px dashed #D3E3F2;font-size:9.5px;color:#6F6770}
  </style></head><body>${folhas.map(folhaHtml).join('')}
  <script>document.fonts.ready.then(()=>setTimeout(()=>window.print(),300))<\/script></body></html>`);
  janela.document.close();
  return true;
}
