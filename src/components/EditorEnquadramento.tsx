import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { prepararImagem } from '../lib/imagensUpload';
import './editor-enquadramento.css';

type Moldura = { proporcao: number; rotulo: string; fixa?: boolean };
export type ImagemEnquadrada = { original: File; exibicao: File };
export function useEnquadramento() {
  const [pedido, setPedido] = useState<{ file: File; moldura?: Moldura; resolver: (r: ImagemEnquadrada | null) => void } | null>(null);
  const resolverPendente = useRef<((r: ImagemEnquadrada | null) => void) | null>(null);
  useEffect(() => () => resolverPendente.current?.(null), []);
  const enquadrar = async (file: File, moldura?: Moldura) => {
    await prepararImagem(file);
    return new Promise<ImagemEnquadrada | null>(resolver => { resolverPendente.current = resolver; setPedido({ file, moldura, resolver }); });
  };
  const editor = pedido ? <EditorEnquadramento file={pedido.file} moldura={pedido.moldura} concluir={r => { pedido.resolver(r); resolverPendente.current = null; setPedido(null); }} /> : null;
  return { enquadrar, editor };
}

function EditorEnquadramento({ file, moldura, concluir }: { file: File; moldura?: Moldura; concluir: (r: ImagemEnquadrada | null) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const quadro = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [tamanho, setTamanho] = useState({ w: 600, h: 400 });
  const [formato, setFormato] = useState(String(moldura?.proporcao || 4/3));
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const arrasto = useRef<{ x: number; y: number; inicialX: number; inicialY: number } | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file); setUrl(u);
    const imagem = new Image(); imagem.onload = () => setFoto(imagem); imagem.onerror = () => setErro('Não foi possível ler esta imagem.'); imagem.src = u;
    const d = dialog.current; d?.showModal();
    return () => { URL.revokeObjectURL(u); d?.close(); };
  }, [file]);
  useEffect(() => {
    const q = quadro.current; if (!q) return;
    const observer = new ResizeObserver(([e]) => setTamanho({ w: e.contentRect.width, h: e.contentRect.height })); observer.observe(q); return () => observer.disconnect();
  }, [foto, formato]);
  const proporcao = formato === 'inteira' ? (foto ? foto.naturalWidth / foto.naturalHeight : 1.5) : Number(formato);
  const escala = foto ? Math.max(tamanho.w / foto.naturalWidth, tamanho.h / foto.naturalHeight) * zoom : 1;
  const largura = (foto?.naturalWidth || 0) * escala, altura = (foto?.naturalHeight || 0) * escala;
  const sobraX = Math.max(0, largura - tamanho.w), sobraY = Math.max(0, altura - tamanho.h);
  const esquerda = -sobraX / 2 + x * sobraX / 200, topo = -sobraY / 2 + y * sobraY / 200;
  function mover(e: PointerEvent) {
    const a = arrasto.current; if (!a) return;
    const limitar = (v: number) => Math.max(-100, Math.min(100, v));
    setX(sobraX ? limitar(a.inicialX + (e.clientX-a.x)*200/sobraX) : 0);
    setY(sobraY ? limitar(a.inicialY + (e.clientY-a.y)*200/sobraY) : 0);
  }
  async function salvar() {
    if (!foto) return;
    if (formato === 'inteira' && zoom === 1) { concluir({ original: file, exibicao: file }); return; }
    setOcupado(true); setErro('');
    try {
      const sx = Math.max(0, Math.round(-esquerda / escala)), sy = Math.max(0, Math.round(-topo / escala));
      const w = Math.min(foto.naturalWidth-sx, Math.round(tamanho.w/escala)), h = Math.min(foto.naturalHeight-sy, Math.round(tamanho.h/escala));
      const tela = document.createElement('canvas'); tela.width = w; tela.height = h;
      const ctx = tela.getContext('2d'); if (!ctx) throw new Error('Não foi possível preparar o recorte.');
      ctx.drawImage(foto, sx, sy, w, h, 0, 0, w, h);
      // PNG conserva os pixels do recorte sem compressão com perda ou ampliação.
      const blob = await new Promise<Blob | null>(r => tela.toBlob(r, 'image/png'));
      if (!blob) throw new Error('Não foi possível preparar o recorte.');
      const exibicao = new File([blob], file.name.replace(/\.[^.]+$/, '')+'-enquadrada.png', { type:'image/png' });
      await prepararImagem(exibicao); concluir({ original:file, exibicao });
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar o recorte.'); }
    finally { setOcupado(false); }
  }
  return <dialog ref={dialog} className="adm-enquadrar" aria-labelledby="titulo-enquadrar" onCancel={e => { e.preventDefault(); if (!ocupado) concluir(null); }}>
    <header><div><small>FOTO DO ENCONTRO</small><h2 id="titulo-enquadrar">Ajustar enquadramento</h2><p>{file.name}</p></div><button type="button" className="wf-secondary" disabled={ocupado} onClick={() => concluir(null)}>Cancelar</button></header>
    <div className="adm-enquadrar__formatos" aria-label="Formato do enquadramento">{(moldura?.fixa ? [[String(moldura.proporcao),moldura.rotulo]] : [[String(moldura?.proporcao || 4/3),moldura?.rotulo || 'Moldura 4:3'],['1.7777777777777777','Horizontal 16:9'],['2.6666666666666665','Moldura larga'],['1','Quadrado']]).map(([id,nome]) => <button type="button" key={id} aria-pressed={formato===id} className={formato===id ? 'wf-primary' : 'wf-secondary'} onClick={() => { setFormato(id);setZoom(1);setX(0);setY(0); }}>{nome}</button>)}</div>
    <div className="adm-enquadrar__fundo"><div ref={quadro} className="adm-enquadrar__quadro" style={{ aspectRatio:String(proporcao), width:`min(100%, ${proporcao*48}vh)` }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); arrasto.current={x:e.clientX,y:e.clientY,inicialX:x,inicialY:y}; }} onPointerMove={mover} onPointerUp={() => {arrasto.current=null;}} onPointerCancel={() => {arrasto.current=null;}}>
      {foto && <img src={url} alt="Prévia do enquadramento" draggable={false} style={{ width:largura,height:altura,left:esquerda,top:topo }}/>}<span className="adm-enquadrar__grade" aria-hidden="true"/>
    </div></div>
    <p>Arraste a foto para posicionar o recorte dentro da moldura.</p>
    <div className="adm-enquadrar__controles"><label>Zoom · {zoom.toFixed(1)}×<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label><label>Posição horizontal<input type="range" min="-100" max="100" value={x} disabled={!sobraX} onChange={e => setX(Number(e.target.value))}/></label><label>Posição vertical<input type="range" min="-100" max="100" value={y} disabled={!sobraY} onChange={e => setY(Number(e.target.value))}/></label></div>
    {foto && foto.naturalWidth<1600 && <p className="v2-forms-warn">Esta imagem tem {foto.naturalWidth} × {foto.naturalHeight} pixels. Use o arquivo original em alta resolução para uma capa mais nítida.</p>}
    {erro && <p className="v2-forms-error" role="alert">{erro}</p>}
    <footer><button type="button" className="wf-secondary" disabled={ocupado} onClick={() => {setFormato(String(moldura?.proporcao || 4/3));setZoom(1);setX(0);setY(0);}}>Centralizar recorte</button><button type="button" className="wf-primary" disabled={!foto || ocupado} onClick={() => void salvar()}>{ocupado ? 'Preparando…' : 'Usar este enquadramento'}</button></footer>
  </dialog>;
}
