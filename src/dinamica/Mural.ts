/* Mural do telão: duas lousas (Barreiras e Caminhos) em que as palavras entram uma por uma, ficam grandes no centro para dar tempo de ler
   e então grudam no lugar. Palavras iguais (sem maiúsculas, acentos e pontuação) viram uma só e crescem. Feito direto no DOM para animar
   a entrada, o reordenamento e a saída; a página só entrega o estado. */

export type RespostaMural = { id: number; etapa: 1 | 2; texto: string; chave: string };
export type EstadoMural = { status_1: string; status_2: string; modo: 'ambos' | '1' | '2'; qr: boolean; congelado: boolean; respostas: RespostaMural[] };
type Etapa = 1 | 2;
type Item = { li: HTMLLIElement; span: HTMLSpanElement; badge: HTMLElement; n: number; rot: number; texto: string };
type Quadro = { total: HTMLElement; sec: HTMLElement; wrap: HTMLElement; vazio: HTMLElement; chip: HTMLElement; cont: HTMLElement; itens: Map<string, Item> };

export const TEMA = 'Dinâmica ao vivo';
const ROTULOS: Record<string, string> = { aguardando: 'Aguardando abertura', aberta: 'Recebendo respostas', encerrada: 'Etapa encerrada' };
const NOMES: Record<Etapa, string> = { 1: 'Barreiras', 2: 'Caminhos' };
const hash = (texto: string) => { let h = 0; for (const c of texto) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

export const palcoHtml = (qr: string) => `
  <div class="dn-faixa"></div>
  <header class="dn-head">
    <img class="dn-logo" src="/brand/novo/comunicali-b-fundo-escuro.svg" alt="ComuniCALI">
    <div class="dn-tema"><h2><span class="dn-vivo"></span>${TEMA}</h2></div>
    <div class="dn-qr"><span>Aponte a câmera<br>e participe</span><img src="${qr}" alt="QR Code da dinâmica"></div>
  </header>
  <div class="dn-boards">
    <section class="dn-board dn-b1"><header><div><small class="dn-cont">Barreiras</small><h3>O que nos impede?</h3></div><div class="dn-hd-r"><span class="dn-chip"><i></i><b></b></span><span class="dn-total"><b>0</b><small>palavras</small></span></div></header>
      <ul class="dn-words"></ul><div class="dn-vazio">As palavras vão aparecendo aqui,<br>uma por uma.</div></section>
    <span class="dn-seta" aria-hidden="true">→</span>
    <section class="dn-board dn-b2"><header><div><small class="dn-cont">Caminhos</small><h3>O que precisa mudar?</h3></div><div class="dn-hd-r"><span class="dn-chip"><i></i><b></b></span><span class="dn-total"><b>0</b><small>palavras</small></span></div></header>
      <ul class="dn-words"></ul><div class="dn-vazio">As palavras vão aparecendo aqui,<br>uma por uma.</div></section>
  </div>
  <div class="dn-pausa">Exibição congelada</div>`;

export class Mural {
  private B: Record<Etapa, Quadro>;
  private fila: Array<{ e: Etapa; chave: string }> = [];
  private drenando = false;
  private primeira = true;
  private estado: EstadoMural | null = null;
  private timers = new Set<number>();
  private morto = false;

  constructor(private host: HTMLElement, qr: string) {
    host.innerHTML = palcoHtml(qr);
    const quadro = (n: number): Quadro => {
      const sec = host.querySelector(`.dn-b${n}`) as HTMLElement;
      return { total: sec.querySelector('.dn-total') as HTMLElement, sec, wrap: sec.querySelector('.dn-words') as HTMLElement, vazio: sec.querySelector('.dn-vazio') as HTMLElement, chip: sec.querySelector('.dn-chip') as HTMLElement, cont: sec.querySelector('.dn-cont') as HTMLElement, itens: new Map() };
    };
    this.B = { 1: quadro(1), 2: quadro(2) };
    window.addEventListener('resize', this.refit);
  }

  destruir() { this.morto = true; this.timers.forEach((t) => window.clearTimeout(t)); window.removeEventListener('resize', this.refit); }
  private refit = () => { this.fit(this.B[1]); this.fit(this.B[2]); };
  private espera(fn: () => void, ms: number) { const t = window.setTimeout(() => { this.timers.delete(t); if (!this.morto) fn(); }, ms); this.timers.add(t); }

  private grupos(e: Etapa) {
    const m = new Map<string, { chave: string; texto: string; n: number }>();
    for (const r of this.estado?.respostas || []) {
      if (r.etapa !== e) continue;
      const g = m.get(r.chave); if (g) g.n += 1; else m.set(r.chave, { chave: r.chave, texto: r.texto, n: 1 });
    }
    return m;
  }

  /** Recebe o estado mais recente (a página consulta o servidor a cada poucos segundos). */
  aplicar(estado: EstadoMural, animar = true) {
    this.estado = estado;
    for (const e of [1, 2] as Etapa[]) {
      const b = this.B[e], g = this.grupos(e);
      for (const chave of [...b.itens.keys()]) if (!g.has(chave)) this.remover(e, chave);
      for (const [chave, gr] of g) {
        const it = b.itens.get(chave);
        if (it) { if (it.n !== gr.n) { it.n = gr.n; this.comFlip(b, () => this.ajustaContagem(it)); this.pulsar(it); } }
        else if (this.primeira || !animar) this.adicionar(e, gr, false);
        else if (!this.fila.some((x) => x.e === e && x.chave === chave)) this.fila.push({ e, chave });
      }
      if (this.primeira || !animar) this.fit(b);
      b.vazio.style.display = b.itens.size || this.fila.some((x) => x.e === e) ? 'none' : '';
      const n = estado.respostas.filter((r) => r.etapa === e).length;
      const status = e === 1 ? estado.status_1 : estado.status_2;
      b.chip.className = 'dn-chip ' + status; (b.chip.querySelector('b') as HTMLElement).textContent = ROTULOS[status] || '';
      b.cont.textContent = NOMES[e];
      (b.total.querySelector('b') as HTMLElement).textContent = String(n);
      (b.total.querySelector('small') as HTMLElement).textContent = n === 1 ? 'palavra' : 'palavras';
    }
    // Quem tem mais palavras pisca: mais barreiras acende em vermelho, como alerta; mais caminhos, em verde.
    const n1 = estado.respostas.filter((r) => r.etapa === 1).length, n2 = estado.respostas.filter((r) => r.etapa === 2).length;
    this.B[1].sec.classList.toggle('dn-lidera', n1 > n2);
    this.B[2].sec.classList.toggle('dn-lidera', n2 > n1);
    this.primeira = false;
    this.drenar();
    const boards = this.host.querySelector('.dn-boards') as HTMLElement;
    const depois = 'dn-boards' + (estado.modo === 'ambos' ? '' : ` dn-m${estado.modo}`);
    if (boards.className !== depois) { boards.className = depois; requestAnimationFrame(this.refit); }
    (this.host.querySelector('.dn-qr') as HTMLElement).classList.toggle('off', !estado.qr);
    (this.host.querySelector('.dn-pausa') as HTMLElement).classList.toggle('on', estado.congelado);
  }

  private fit(b: Quadro) {
    if (!b.sec.offsetParent) return;
    const lis = [...b.wrap.children] as HTMLElement[];
    let s = 1.5;
    for (let i = 0; i < 24; i += 1) {
      b.wrap.style.setProperty('--s', s.toFixed(3));
      if (!lis.length) break;
      let topo = 1e9, base = 0;
      lis.forEach((l) => { topo = Math.min(topo, l.offsetTop); base = Math.max(base, l.offsetTop + l.offsetHeight); });
      if (base - topo <= b.wrap.clientHeight - 14) break;
      s *= 0.94;
    }
  }
  // Mexe no mural e anima o que mudou de lugar, para ninguém perder a leitura.
  private comFlip(b: Quadro, mutar: () => void) {
    const antes = new Map<Item, DOMRect>();
    b.itens.forEach((it) => { if (it.li.isConnected) antes.set(it, it.li.getBoundingClientRect()); });
    mutar();
    this.fit(b);
    antes.forEach((r0, it) => {
      if (!it.li.isConnected) return;
      const r1 = it.li.getBoundingClientRect(), dx = r0.left - r1.left, dy = r0.top - r1.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      it.li.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], { duration: 650, easing: 'cubic-bezier(.3,.7,.2,1)' });
    });
  }
  private ajustaContagem(it: Item) {
    it.span.style.setProperty('--k', (1 + Math.min(it.n - 1, 5) * 0.22).toFixed(2));
    it.badge.textContent = it.n > 1 ? `×${it.n}` : '';
  }
  private brilho(it: Item, atraso = 0) {
    it.span.animate([{ boxShadow: '0 0 0 0 rgba(198,218,234,0)' }, { boxShadow: '0 0 0 .8cqw rgba(198,218,234,.65)', offset: 0.35 }, { boxShadow: '0 0 0 1.7cqw rgba(198,218,234,0)' }], { duration: 950, delay: atraso });
  }
  private adicionar(e: Etapa, gr: { chave: string; texto: string; n: number }, animar: boolean, vel = 1) {
    const b = this.B[e];
    const li = document.createElement('li'); li.className = 'dn-w';
    const span = document.createElement('span'); span.className = 'dn-p dn-p' + 'abc'[hash(gr.chave) % 3];
    const rot = ((hash(gr.chave) % 7) - 3) * 0.7; span.style.setProperty('--rot', rot + 'deg');
    span.append(document.createTextNode(gr.texto));
    const badge = document.createElement('b'); badge.className = 'dn-n'; span.append(badge); li.append(span);
    const it: Item = { li, span, badge, n: gr.n, rot, texto: gr.texto };
    this.ajustaContagem(it);
    if (!animar) { b.itens.set(gr.chave, it); b.wrap.append(li); return; }
    this.comFlip(b, () => { b.itens.set(gr.chave, it); b.wrap.append(li); });
    this.entrar(b, it, vel);
  }
  // A palavra aparece grande no centro do mural, fica um tempo para dar tempo de ler e então gruda no seu lugar.
  private entrar(b: Quadro, it: Item, vel: number) {
    const wr = b.wrap.getBoundingClientRect(), sr = it.li.getBoundingClientRect();
    const dx = wr.left + wr.width / 2 - (sr.left + sr.width / 2), dy = wr.top + wr.height / 2 - (sr.top + sr.height / 2);
    const grande = Math.min(2.3, (wr.width * 0.78) / Math.max(sr.width, 1));
    const rapido = vel < 0.5; // muitas respostas de uma vez: sem parada no centro, para não empilhar palavras
    const dur = rapido ? 700 : Math.max(1300, 2000 * vel), rot = it.rot, reduz = matchMedia('(prefers-reduced-motion:reduce)').matches;
    it.li.classList.add('entrando');
    const centro = `translate(${dx}px,${dy}px) scale(${grande}) rotate(0deg)`;
    const quadros: Keyframe[] = reduz ? [{ opacity: 0 }, { opacity: 1 }]
      : rapido ? [
        { opacity: 0, transform: `translate(0,-${wr.height * 0.08}px) scale(1.7) rotate(-3deg)`, offset: 0 },
        { opacity: 1, transform: `translate(0,0) scale(.94) rotate(${rot}deg)`, offset: 0.65, easing: 'ease-out' },
        { opacity: 1, transform: `translate(0,0) scale(1) rotate(${rot}deg)`, offset: 1 },
      ] : [
        { opacity: 0, transform: `translate(${dx}px,${dy - 24}px) scale(${grande * 0.7}) rotate(-4deg)`, offset: 0 },
        { opacity: 1, transform: centro, offset: 0.13, easing: 'linear' },
        { opacity: 1, transform: centro, offset: 0.52, easing: 'cubic-bezier(.55,0,.25,1)' },
        { opacity: 1, transform: `translate(0,0) scale(.93) rotate(${rot}deg)`, offset: 0.84, easing: 'ease-out' },
        { opacity: 1, transform: `translate(0,0) scale(1.04) rotate(${rot}deg)`, offset: 0.93 },
        { opacity: 1, transform: `translate(0,0) scale(1) rotate(${rot}deg)`, offset: 1 },
      ];
    const a = it.span.animate(quadros, { duration: dur, easing: 'linear', fill: 'backwards' });
    a.onfinish = () => it.li.classList.remove('entrando');
    this.espera(() => it.li.classList.remove('entrando'), dur + 300);
    this.brilho(it, dur * 0.82);
  }
  private pulsar(it: Item) {
    const r = it.rot;
    it.span.animate([{ transform: `rotate(${r}deg) scale(1)` }, { transform: `rotate(${r}deg) scale(1.3)`, offset: 0.35 }, { transform: `rotate(${r}deg) scale(1)` }], { duration: 750, easing: 'ease-out' });
    this.brilho(it);
  }
  private remover(e: Etapa, chave: string) {
    const b = this.B[e], it = b.itens.get(chave); if (!it) return;
    b.itens.delete(chave);
    const a = it.span.animate([{ opacity: 1, transform: `rotate(${it.rot}deg) scale(1)` }, { opacity: 0, transform: `rotate(${it.rot}deg) scale(.3)` }], { duration: 380, fill: 'forwards' });
    const fim = () => this.comFlip(b, () => it.li.remove());
    a.onfinish = fim;
    this.espera(() => { if (it.li.isConnected) fim(); }, 700);
  }
  private passo = () => {
    const x = this.fila.shift();
    if (!x) { this.drenando = false; return; }
    const gr = this.grupos(x.e).get(x.chave);
    if (gr && !this.B[x.e].itens.has(x.chave)) {
      const vel = this.fila.length >= 3 ? 0.3 : Math.max(0.55, 1 - this.fila.length * 0.15);
      this.adicionar(x.e, gr, true, vel);
      this.espera(this.passo, vel < 0.5 ? 380 : Math.max(650, 1250 * vel));
    } else this.passo();
  };
  // Espera um instante antes de começar, para perceber se chegou uma enxurrada de respostas de uma vez.
  private drenar() { if (this.drenando) return; this.drenando = true; this.espera(this.passo, 230); }

  /** Desenha o telão como imagem 1920x1080, a partir do que está na tela. */
  async desenhar(): Promise<HTMLCanvasElement> {
    await document.fonts.ready;
    const st = this.host, R = st.getBoundingClientRect(), k = 1920 / R.width;
    const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d') as CanvasRenderingContext2D;
    const rel = (el: Element) => { const r = el.getBoundingClientRect(); return { x: (r.left - R.left) * k, y: (r.top - R.top) * k, w: r.width * k, h: r.height * k }; };
    const carrega = (src: string) => new Promise<HTMLImageElement | null>((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    x.fillStyle = '#1B0A10'; x.fillRect(0, 0, 1920, 1080);
    ['#5A1E2D', '#3F6E9A', '#C6DAEA', '#6F6770'].forEach((cor, i) => { x.fillStyle = cor; x.fillRect(i * 480, 0, 480, 13); });
    const logo = await carrega('/brand/novo/comunicali-b-fundo-escuro.svg'), lr = rel(st.querySelector('.dn-logo') as Element); if (logo) x.drawImage(logo, lr.x, lr.y, lr.w, lr.h);
    const texto = (el: Element) => {
      const cs = getComputedStyle(el), r = rel(el);
      x.fillStyle = cs.color; x.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * k}px ${cs.fontFamily.split(',')[0]}`; x.textBaseline = 'middle'; x.textAlign = 'left';
      try { (x as unknown as { letterSpacing: string }).letterSpacing = (parseFloat(cs.letterSpacing) || 0) * k + 'px'; } catch { /* sem suporte */ }
      x.fillText(cs.textTransform === 'uppercase' ? (el.textContent || '').toUpperCase() : el.textContent || '', r.x, r.y + r.h / 2);
      try { (x as unknown as { letterSpacing: string }).letterSpacing = '0px'; } catch { /* sem suporte */ }
    };
    texto(st.querySelector('.dn-tema h2') as Element);
    const qrEl = st.querySelector('.dn-qr img') as HTMLImageElement;
    if (this.estado?.qr !== false) { const q = rel(qrEl), qr = await carrega(qrEl.src); if (qr) { x.fillStyle = '#fff'; x.beginPath(); x.roundRect(q.x, q.y, q.w, q.h, 19); x.fill(); x.drawImage(qr, q.x + q.w * 0.06, q.y + q.h * 0.06, q.w * 0.88, q.h * 0.88); } }
    for (const e of [1, 2] as Etapa[]) {
      const b = this.B[e]; if (!b.sec.offsetParent) continue;
      const br = rel(b.sec); x.fillStyle = getComputedStyle(b.sec).backgroundColor; x.beginPath(); x.roundRect(br.x, br.y, br.w, br.h, 31); x.fill();
      texto(b.sec.querySelector('small') as Element); texto(b.sec.querySelector('h3') as Element);
      b.itens.forEach((it) => {
        if (!it.li.isConnected) return;
        const cs = getComputedStyle(it.span), r = it.span.getBoundingClientRect(), w = it.span.offsetWidth * k, h = it.span.offsetHeight * k;
        x.save(); x.translate((r.left + r.width / 2 - R.left) * k, (r.top + r.height / 2 - R.top) * k); x.rotate((it.rot * Math.PI) / 180);
        x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, h / 2);
        if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') { x.fillStyle = cs.backgroundColor; x.fill(); }
        const bw = parseFloat(cs.borderTopWidth) * k;
        if (cs.borderTopColor !== 'rgba(0, 0, 0, 0)' && bw > 0) { x.lineWidth = bw; x.strokeStyle = cs.borderTopColor; x.stroke(); }
        x.fillStyle = cs.color; x.font = `700 ${parseFloat(cs.fontSize) * k}px "Funnel Display", Inter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(it.texto + (it.n > 1 ? `  ×${it.n}` : ''), 0, h * 0.04); x.restore();
      });
    }
    return c;
  }
}

/** Monta o telão fora da tela, em 1920x1080, só para gerar a imagem final do mural. */
export async function imagemDoMural(estado: EstadoMural, qr: string): Promise<Blob | null> {
  const host = document.createElement('div');
  host.className = 'dn-stage';
  host.style.cssText = 'position:fixed;left:-99999px;top:0;width:1920px;height:1080px;aspect-ratio:auto';
  document.body.append(host);
  const mural = new Mural(host, qr);
  try {
    mural.aplicar({ ...estado, qr: estado.qr }, false);
    await document.fonts.ready;
    mural.aplicar(estado, false);
    const canvas = await mural.desenhar();
    return await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
  } finally { mural.destruir(); host.remove(); }
}
