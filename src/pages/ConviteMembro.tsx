import { useEffect, useRef, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { Share2 } from 'lucide-react';
import { errorMessage, supabase } from '../lib';
import { recursoAusente } from './RedeExtras';

export const linkConvite = (codigo: string) => `https://comuni.calirh.com/c/${encodeURIComponent(codigo)}`;
export const textoConvite = (codigo: string) => `Quero te convidar para fazer parte da nossa comunidade ComuniCALI. Use meu convite ${codigo}: ${linkConvite(codigo)}`;
type Config = { codigo: string; alteracoes: number; restantes: number };
const imagem = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('imagem')); img.src = url;
});

export async function gerarCartaoConvite(_nome: string, codigo: string): Promise<Blob> {
  await Promise.all([document.fonts.load('700 72px "Funnel Display"'), document.fonts.load('400 36px Inter'), document.fonts.load('600 32px Inter')]);
  const [logo, qr] = await Promise.all([
    imagem('/brand/communicali-horizontal.png'),
    QRCode.toDataURL(linkConvite(codigo), { width: 360, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#22100F', light: '#FFFFFF' } }).then(imagem),
  ]);
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const c = canvas.getContext('2d'); if (!c) throw new Error('canvas');
  c.fillStyle = '#F7F0EA'; c.fillRect(0, 0, 1080, 1350);
  c.fillStyle = '#5A1E2D'; c.fillRect(0, 0, 1080, 18);
  c.drawImage(logo, 80, 68, 430, 430 * logo.height / logo.width);
  c.fillStyle = '#A9502E'; c.font = '600 23px Inter, sans-serif'; c.fillText('UM CONVITE ESPECIAL', 80, 265);
  c.fillStyle = '#22100F'; c.font = '700 76px "Funnel Display", sans-serif';
  c.fillText('Olá, vamos', 80, 350); c.fillText('nos conectar?', 80, 430);
  c.fillStyle = '#665049'; c.font = '400 34px Inter, sans-serif';
  c.fillText('Quero convidar você para fazer parte', 80, 500, 920);
  c.fillText('da nossa comunidade, a ComuniCALI.', 80, 548, 920);
  c.fillStyle = '#5A1E2D'; c.font = '600 32px Inter, sans-serif';
  c.fillText('Desenvolvimento humano e gestão.', 80, 610, 920);
  c.fillStyle = '#665049'; c.font = '400 32px Inter, sans-serif';
  c.fillText('Conexões que vão além do online.', 80, 652, 920);
  // Bilhete com cantos suaves, recortes laterais e código com tamanho ajustado.
  c.fillStyle = '#5A1E2D'; c.beginPath(); c.roundRect(80, 700, 920, 205, 18); c.fill();
  c.strokeStyle = '#DDB160'; c.lineWidth = 1.5; c.setLineDash([5, 6]);
  c.beginPath(); c.roundRect(96, 716, 888, 173, 10); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#F7F0EA';
  for (const x of [80, 1000]) { c.beginPath(); c.arc(x, 802, 14, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#F7F0EA'; c.font = '600 24px Inter, sans-serif'; c.fillText('USE MEU CONVITE', 120, 753);
  c.font = '400 26px Inter, sans-serif'; c.fillText('para participar do encontro', 120, 790);
  let tamanho = 66;
  do { c.font = `700 ${tamanho}px "Funnel Display", sans-serif`; tamanho -= 1; } while (c.measureText(codigo).width > 840 && tamanho > 30);
  c.fillText(codigo, 120, 865, 840);
  c.drawImage(qr, 80, 948, 300, 300);
  c.fillStyle = '#22100F'; c.font = '700 40px "Funnel Display", sans-serif';
  c.fillText('Veja nosso próximo encontro', 420, 1005, 580);
  c.fillStyle = '#665049'; c.font = '400 28px Inter, sans-serif';
  c.fillText('Aponte a câmera do celular para o QR', 420, 1062, 580);
  c.fillText('e faça sua inscrição.', 420, 1102, 580);
  c.font = '600 28px Inter, sans-serif'; c.fillStyle = '#5A1E2D';
  c.fillText('Depois, aguarde o contato da equipe.', 420, 1170, 580);
  c.strokeStyle = '#D8C7B9'; c.lineWidth = 1; c.beginPath(); c.moveTo(80, 1280); c.lineTo(1000, 1280); c.stroke();
  c.fillStyle = '#7A1F3D'; c.font = '600 24px Inter, sans-serif'; c.fillText('comuni.calirh.com', 80, 1320);
  c.textAlign = 'right'; c.fillStyle = '#5A1E2D'; c.font = '400 24px Inter, sans-serif'; c.fillText('Toda honra a Deus!', 1000, 1320);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('imagem')), 'image/png'));
}

function CartaoConvite({ nome, codigo, fechar }: { nome: string; codigo: string; fechar: () => void }) {
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
    void gerarCartaoConvite(nome, codigo).then((blob) => {
      if (!ativo) return;
      objeto = URL.createObjectURL(blob); setArquivo(blob); setUrl(objeto);
    }).catch(() => { if (ativo) setErro('Não foi possível montar o cartão. Tente novamente.'); });
    return () => { ativo = false; if (objeto) URL.revokeObjectURL(objeto); };
  }, [nome, codigo, tentativa]);
  const file = arquivo ? new File([arquivo], `convite-${codigo}.png`, { type: 'image/png' }) : null;
  const podeCompartilhar = !!file && !!navigator.canShare?.({ files: [file] });
  async function compartilhar() {
    if (!file || busy) return;
    setBusy(true); setErro('');
    try { await navigator.share({ files: [file], text: textoConvite(codigo) }); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setErro('Não foi possível compartilhar. Você pode baixar a imagem.'); }
    finally { setBusy(false); }
  }
  return <div className="passe__modal" role="dialog" aria-modal="true" aria-label="Seu cartão de convite" onKeyDown={(event) => {
    if (event.key !== 'Tab') return;
    const botoes = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
    const primeiro = botoes[0], ultimo = botoes[botoes.length - 1];
    if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo?.focus(); }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro?.focus(); }
  }}><div className="passe__janela">
    <h2>Seu cartão de convite</h2>
    {url ? <img className="passe__previa" src={url} alt={`Convite ${codigo} com QR para inscrição no próximo encontro`} /> : !erro && <p role="status">Montando seu cartão…</p>}
    {erro && <p className="passe__erro" role="alert">{erro}</p>}
    {!arquivo && erro && <button type="button" className="passe__botao" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button>}
    {podeCompartilhar && <button type="button" className="passe__botao" disabled={busy} onClick={() => void compartilhar()}>Compartilhar imagem</button>}
    {url && <a className="passe__botao passe__botao--linha" href={url} download={`convite-${codigo}.png`}>Baixar imagem</a>}
    <button ref={fecharRef} type="button" className="passe__link" onClick={fechar}>Fechar</button>
  </div></div>;
}

export function ConviteMembro({ nome, codigoAtual, recarregar }: { nome: string; codigoAtual: string; recarregar: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [codigo, setCodigo] = useState(codigoAtual);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [cartao, setCartao] = useState(false);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let ativo = true; setCarregando(true); setConfig(null); setCodigo(codigoAtual);
    void supabase.rpc('communicali_convite_config').then(({ data, error }) => {
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
      const c = data as Config; setConfig(c); setCodigo(c.codigo); setAviso('Código salvo. Use o novo link e gere novamente seus cartões.'); recarregar();
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
