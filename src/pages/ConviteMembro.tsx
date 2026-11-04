import { useEffect, useRef, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { Share2 } from 'lucide-react';
import { errorMessage, supabase } from '../lib';
import { recursoAusente } from './RedeExtras';
import { buscar, guardar, lembrado } from './lembrar';

export const linkConvite = (codigo: string) => `https://comuni.calirh.com/c/${encodeURIComponent(codigo)}`;
export const textoConvite = (codigo: string) => `Quero te convidar para fazer parte da nossa comunidade ComuniCALI. Use meu convite ${codigo}: ${linkConvite(codigo)}`;
type Config = { codigo: string; alteracoes: number; restantes: number };
const imagem = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => resolve(img); img.onerror = () => reject(new Error('imagem')); img.src = url;
});

// Carimbo redondo do canto superior: texto em volta e "Café & Pessoas" no meio.
function carimbo(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.save(); c.translate(x, y); c.rotate(-0.2);
  c.fillStyle = '#A9502E'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#F7F0EA'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r - 9, 0, Math.PI * 2); c.stroke();
  c.setLineDash([4, 5]); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r - 46, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  const texto = 'CONVITE · COMUNICALI · CONVITE · COMUNICALI · ';
  c.fillStyle = '#F7F0EA'; c.font = '700 17px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const passo = (Math.PI * 2) / texto.length;
  [...texto].forEach((letra, n) => { c.save(); c.rotate(n * passo); c.translate(0, -(r - 27)); c.fillText(letra, 0, 0); c.restore(); });
  c.font = '700 27px "Funnel Display", sans-serif'; c.fillText('Café &', 0, -15); c.fillText('Pessoas', 0, 17);
  c.restore();
}

export async function gerarCartaoConvite(nome: string, codigo: string): Promise<Blob> {
  await Promise.all([document.fonts.load('700 72px "Funnel Display"'), document.fonts.load('400 36px Inter'), document.fonts.load('600 32px Inter'), document.fonts.load('700 17px Inter')]);
  const [logo, qr] = await Promise.all([
    imagem('/brand/communicali-horizontal.png'),
    QRCode.toDataURL(linkConvite(codigo), { width: 360, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#22100F', light: '#FFFFFF' } }).then(imagem),
  ]);
  const primeiro = (nome.trim().split(/\s+/)[0] || '').toUpperCase();
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const c = canvas.getContext('2d'); if (!c) throw new Error('canvas');
  c.fillStyle = '#F7F0EA'; c.fillRect(0, 0, 1080, 1350);
  // Faixa com as cores da marca, como no topo do site.
  [['#7A1F3D', 0], ['#A9502E', 270], ['#C9973B', 540], ['#5F6238', 810]].forEach(([cor, x]) => { c.fillStyle = cor as string; c.fillRect(x as number, 0, 270, 16); });
  c.drawImage(logo, 80, 80, 400, 400 * logo.height / logo.width);
  carimbo(c, 888, 205, 132);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#A9502E'; c.font = '600 24px Inter, sans-serif'; c.fillText(primeiro ? `CONVITE DE ${primeiro}` : 'UM CONVITE ESPECIAL', 80, 330, 640);
  c.fillStyle = '#22100F'; c.font = '700 74px "Funnel Display", sans-serif';
  c.fillText('Tem um lugar para', 80, 415); c.fillText('você nessa mesa.', 80, 495);
  c.fillStyle = '#5A4740'; c.font = '400 32px Inter, sans-serif';
  c.fillText('Quero convidar você para a ComuniCALI,', 80, 565, 920);
  c.fillText('uma comunidade de quem gosta de falar', 80, 610, 920);
  c.fillText('sobre gente, gestão e desenvolvimento humano.', 80, 655, 920);
  // Bilhete com picote lateral e o código em destaque.
  const grad = c.createLinearGradient(80, 700, 1000, 900); grad.addColorStop(0, '#7A1F3D'); grad.addColorStop(1, '#4A1424');
  c.fillStyle = grad; c.beginPath(); c.roundRect(80, 705, 920, 200, 22); c.fill();
  c.fillStyle = '#F7F0EA'; for (const x of [80, 1000]) { c.beginPath(); c.arc(x, 805, 18, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = 'rgba(221,177,96,.7)'; c.lineWidth = 2; c.setLineDash([2, 9]); c.beginPath(); c.moveTo(760, 725); c.lineTo(760, 885); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#DDB160'; c.font = '600 22px Inter, sans-serif'; c.fillText('MEU CÓDIGO DE CONVITE', 125, 765);
  c.fillStyle = '#FFFFFF'; let tamanho = 84;
  do { c.font = `700 ${tamanho}px "Funnel Display", sans-serif`; tamanho -= 1; } while (c.measureText(codigo).width > 600 && tamanho > 30);
  c.fillText(codigo, 125, 860, 600);
  c.textAlign = 'center'; c.fillStyle = '#F7F0EA'; c.font = '600 22px Inter, sans-serif'; c.fillText('use na', 880, 795); c.fillText('inscrição', 880, 828);
  c.textAlign = 'left';
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(80, 955, 290, 290, 20); c.fill();
  c.drawImage(qr, 95, 970, 260, 260);
  c.fillStyle = '#22100F'; c.font = '700 40px "Funnel Display", sans-serif'; c.fillText('Inscreva-se pelo QR', 420, 1025, 580);
  c.fillStyle = '#5A4740'; c.font = '400 28px Inter, sans-serif';
  c.fillText('Aponte a câmera do celular e escolha', 420, 1080, 580); c.fillText('o próximo encontro.', 420, 1120, 580);
  c.fillStyle = '#7A1F3D'; c.font = '600 28px Inter, sans-serif'; c.fillText('A equipe confirma sua vaga por e-mail.', 420, 1185, 580);
  c.strokeStyle = '#D8C7B9'; c.lineWidth = 1; c.beginPath(); c.moveTo(80, 1282); c.lineTo(1000, 1282); c.stroke();
  c.fillStyle = '#7A1F3D'; c.font = '600 24px Inter, sans-serif'; c.fillText('comuni.calirh.com', 80, 1322);
  c.textAlign = 'right'; c.fillStyle = '#5A1E2D'; c.font = '600 24px Inter, sans-serif'; c.fillText('Toda honra a Deus!', 1000, 1322);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('imagem')), 'image/png'));
}

export function CartaoConvite({ nome, codigo, fechar, gerar, titulo = 'Convide para essa experiência', texto, arquivoNome }: { nome: string; codigo: string; fechar: () => void; gerar?: () => Promise<Blob>; titulo?: string; texto?: string; arquivoNome?: string }) {
  const [arquivo, setArquivo] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [busy, setBusy] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    fecharRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') fechar(); };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('keydown', escape); anterior?.focus(); };
  }, [fechar]);
  useEffect(() => {
    let ativo = true; let objeto = ''; setErro(''); setArquivo(null); setUrl('');
    void (gerar ? gerar() : gerarCartaoConvite(nome, codigo)).then((blob) => {
      if (!ativo) return;
      objeto = URL.createObjectURL(blob); setArquivo(blob); setUrl(objeto);
    }).catch(() => { if (ativo) setErro('Não foi possível montar o cartão. Tente novamente.'); });
    return () => { ativo = false; if (objeto) URL.revokeObjectURL(objeto); };
  }, [nome, codigo, tentativa]);
  const nomeArquivo = arquivoNome || `convite-${codigo}.png`;
  const file = arquivo ? new File([arquivo], nomeArquivo, { type: 'image/png' }) : null;
  const podeCompartilhar = !!file && !!navigator.canShare?.({ files: [file] });
  async function compartilhar() {
    if (!file || busy) return;
    setBusy(true); setErro('');
    try { await navigator.share({ files: [file], text: texto ?? textoConvite(codigo) }); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setErro('Não foi possível compartilhar. Você pode baixar a imagem.'); }
    finally { setBusy(false); }
  }
  return <div className="passe__modal" role="dialog" aria-modal="true" aria-label={titulo} onKeyDown={(event) => {
    if (event.key !== 'Tab') return;
    const botoes = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
    const primeiro = botoes[0], ultimo = botoes[botoes.length - 1];
    if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo?.focus(); }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro?.focus(); }
  }}><div className="passe__janela">
    <h2>{titulo}</h2>
    {url ? <img className="passe__previa" src={url} alt={titulo} /> : !erro && <p role="status">Montando seu cartão…</p>}
    {erro && <p className="passe__erro" role="alert">{erro}</p>}
    {!arquivo && erro && <button type="button" className="passe__botao" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button>}
    {podeCompartilhar && <button type="button" className="passe__botao" disabled={busy} onClick={() => void compartilhar()}>Compartilhar imagem</button>}
    {url && <a className="passe__botao passe__botao--linha" href={url} download={nomeArquivo}>Baixar imagem</a>}
    <button ref={fecharRef} type="button" className="passe__link" onClick={fechar}>Fechar</button>
  </div></div>;
}

const guardado = () => (lembrado<{ data: unknown }>('convite')?.data as Config | null | undefined);
export const FONTE_CONVITE = () => supabase.rpc('communicali_convite_config').then(({ data, error }) => ({ data, error }));

export function ConviteMembro({ nome, codigoAtual, recarregar }: { nome: string; codigoAtual: string; recarregar: () => void }) {
  const [config, setConfig] = useState<Config | null>(() => guardado() || null);
  const [codigo, setCodigo] = useState(() => guardado()?.codigo || codigoAtual);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [cartao, setCartao] = useState(false);
  const [carregando, setCarregando] = useState(() => !lembrado('convite'));
  useEffect(() => {
    let ativo = true;
    void buscar('convite', FONTE_CONVITE).then(({ data, error }) => {
      if (!ativo) return;
      if (!error && data) { const c = data as Config; setConfig(c); setCodigo(c.codigo); }
      else if (error && !recursoAusente(error)) setErro('Não foi possível consultar as alterações disponíveis.');
      setCarregando(false);
    });
    return () => { ativo = false; };
  }, [codigoAtual]);
  const atual = config?.codigo || codigoAtual;
  const mudou = codigo.trim().toUpperCase() !== atual;
  async function salvar(event: FormEvent) {
    event.preventDefault(); if (!config || config.restantes <= 0 || !mudou || busy) return;
    setBusy(true); setErro(''); setAviso('');
    try {
      const { data, error } = await supabase.rpc('communicali_convite_alterar', { p_codigo: codigo });
      if (error) throw new Error(errorMessage(error));
      const c = data as Config; guardar('convite', { data: c, error: null }); setConfig(c); setCodigo(c.codigo); setAviso('Código salvo. Use o novo link e gere novamente seus cartões.'); recarregar();
    } catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível salvar o código. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(textoConvite(atual)); setAviso('Convite copiado.'); setErro(''); }
    catch { setErro('Não foi possível copiar. Use o link do convite abaixo.'); }
  }
  return <section className="passe__bilhete passe__convite">
    <form onSubmit={(event) => void salvar(event)}>
      <label>CÓDIGO DO SEU CONVITE<input value={codigo} readOnly={!config || config.restantes <= 0} disabled={busy} maxLength={20} minLength={4} pattern="[A-Z0-9-]{4,20}" onChange={(event) => setCodigo(event.target.value.toUpperCase().replace(/\s/g, ''))} /></label>
      <p>{carregando ? 'Consultando alterações disponíveis…' : !config ? 'A personalização do código está indisponível no momento.' : config.restantes > 0 ? `${config.restantes} ${config.restantes === 1 ? 'alteração disponível' : 'alterações disponíveis'}. Use de 4 a 20 letras, números ou hífen.` : 'Você já usou as duas alterações do código.'}</p>
      {mudou && config && <button type="submit" className="passe__botao" disabled={busy || config.restantes <= 0}>{busy ? 'Salvando…' : 'Salvar código'}</button>}
    </form>
    <div className="passe__bilhete-acoes">
      <button type="button" className="passe__botao" disabled={busy} onClick={() => void copiar()}>Copiar convite</button>
      <a className="passe__botao passe__botao--linha" href={`https://wa.me/?text=${encodeURIComponent(textoConvite(atual))}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <button type="button" className="passe__botao passe__botao--linha passe__convite-cartao" disabled={busy} onClick={() => setCartao(true)}><Share2 size={16} aria-hidden="true" />Gerar cartão com QR</button>
      <a className="passe__convite-link" href={linkConvite(atual)} target="_blank" rel="noopener noreferrer">{linkConvite(atual)}</a>
    </div>
    {mudou && <p className="passe__aviso">O compartilhamento usa seu código salvo. Salve a alteração antes de gerar um novo convite.</p>}
    {aviso && <p className="passe__ok" role="status">{aviso}</p>}{erro && <p className="passe__erro" role="alert">{erro}</p>}
    {cartao && <CartaoConvite nome={nome} codigo={atual} fechar={() => setCartao(false)} />}
  </section>;
}

// Card "Eu vou!" para quem tem inscrição confirmada: foto de passaporte e cartão de embarque, nas cores do site, com respiro.
export async function gerarCartaoEuVou(nome: string, foto: string | null, encontro: { titulo: string; data: string; local: string }): Promise<Blob> {
  await Promise.all([document.fonts.load('700 72px "Funnel Display"'), document.fonts.load('400 36px Inter'), document.fonts.load('600 32px Inter'), document.fonts.load('700 20px Inter')]);
  const [logo, retrato] = await Promise.all([imagem('/brand/communicali-branco.png'), foto ? imagem(foto).catch(() => null) : Promise.resolve(null)]);
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const c = canvas.getContext('2d'); if (!c) throw new Error('canvas');
  const fundo = c.createLinearGradient(0, 0, 0, 1350); fundo.addColorStop(0, '#2A151C'); fundo.addColorStop(1, '#1F0E14');
  c.fillStyle = fundo; c.fillRect(0, 0, 1080, 1350);
  [['#7A1F3D', 0], ['#A9502E', 270], ['#C9973B', 540], ['#5F6238', 810]].forEach(([cor, x]) => { c.fillStyle = cor as string; c.fillRect(x as number, 0, 270, 12); });
  // Rota pontilhada ao fundo, discreta.
  c.strokeStyle = 'rgba(221,177,96,.18)'; c.lineWidth = 3; c.setLineDash([2, 14]);
  c.beginPath(); c.moveTo(-20, 760); c.bezierCurveTo(260, 620, 820, 900, 1100, 700); c.stroke(); c.setLineDash([]);
  const largura = 300; c.drawImage(logo, (1080 - largura) / 2, 70, largura, largura * logo.height / logo.width);
  c.textAlign = 'center';
  c.fillStyle = '#DDB160'; c.font = '700 168px "Funnel Display", sans-serif'; c.fillText('Eu vou!', 540, 330);
  c.fillStyle = '#E9DDD5'; c.font = '400 34px Inter, sans-serif'; c.fillText('Vou estar no próximo encontro da ComuniCALI.', 540, 392, 900);
  // Foto de passaporte no centro.
  c.save(); c.translate(540, 640); c.rotate(-0.035);
  c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  c.fillStyle = '#FFFFFF'; c.fillRect(-165, -200, 330, 400); c.shadowColor = 'transparent';
  if (retrato) { const proporcao = 300 / 370; const w = Math.min(retrato.width, retrato.height * proporcao); const h = w / proporcao; c.drawImage(retrato, (retrato.width - w) / 2, (retrato.height - h) / 2, w, h, -150, -185, 300, 370); }
  else { c.fillStyle = '#F3E9E0'; c.fillRect(-150, -185, 300, 370); c.fillStyle = '#7A1F3D'; c.font = '700 150px "Funnel Display", sans-serif'; c.fillText(nome.charAt(0), 0, 50); }
  c.restore();
  // Cartão de embarque.
  const y = 900, h = 300;
  c.fillStyle = '#F7F0EA'; c.beginPath(); c.roundRect(70, y, 940, h, 26); c.fill();
  c.fillStyle = '#1F0E14'; for (const px of [70, 1010]) { c.beginPath(); c.arc(px, y + h / 2, 22, 0, Math.PI * 2); c.fill(); }
  c.beginPath(); c.arc(770, y, 18, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(770, y + h, 18, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#C9B6A3'; c.lineWidth = 3; c.setLineDash([4, 10]); c.beginPath(); c.moveTo(770, y + 30); c.lineTo(770, y + h - 30); c.stroke(); c.setLineDash([]);
  c.textAlign = 'left';
  c.fillStyle = '#A9502E'; c.font = '700 20px Inter, sans-serif'; c.fillText('CARTÃO DE EMBARQUE', 120, y + 58);
  c.fillStyle = '#22100F'; let t = 46; do { c.font = `700 ${t}px "Funnel Display", sans-serif`; t -= 2; } while (c.measureText(encontro.titulo).width > 600 && t > 28); c.fillText(encontro.titulo, 120, y + 118);
  c.fillStyle = '#8A7A72'; c.font = '700 18px Inter, sans-serif'; c.fillText('DATA', 120, y + 172); c.fillText('LOCAL', 120, y + 232);
  c.fillStyle = '#3A2A24'; c.font = '600 26px Inter, sans-serif'; c.fillText(encontro.data, 210, y + 174, 530); c.fillText(encontro.local, 210, y + 234, 530);
  c.textAlign = 'center'; c.fillStyle = '#7A1F3D'; c.font = '700 22px "Funnel Display", sans-serif'; c.fillText('Café &', 890, y + 120); c.fillText('Pessoas', 890, y + 150);
  c.strokeStyle = '#7A1F3D'; c.lineWidth = 3; c.strokeRect(830, y + 185, 120, 58); c.font = '700 15px Inter, sans-serif'; c.fillText('EMBARQUE', 890, y + 210); c.fillText('CONFIRMADO', 890, y + 232);
  c.fillStyle = '#DDB160'; c.font = 'italic 400 30px Inter, sans-serif'; c.fillText('Falar de pessoas pode mudar o mundo.', 540, 1268);
  c.fillStyle = '#CBB9B1'; c.font = '600 22px Inter, sans-serif'; c.fillText('comuni.calirh.com  ·  Toda honra a Deus!', 540, 1312);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('imagem')), 'image/png'));
}
