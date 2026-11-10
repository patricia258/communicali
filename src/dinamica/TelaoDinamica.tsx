/* Telão da dinâmica ao vivo: o QR Code leva as pessoas a /dinamica e as palavras aparecem aqui, uma por uma. */
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { editionSlug, supabase } from '../lib';
import { linkEvento, QR_COR } from './api';
import { Mural, type EstadoMural } from './Mural';
import './dinamica.css';

const VAZIO: EstadoMural = { status_1: 'aguardando', status_2: 'aguardando', modo: 'ambos', qr: true, congelado: false, respostas: [] };

export function TelaoDinamica() {
  const slug = editionSlug();
  const palco = useRef<HTMLDivElement>(null);
  const [qr, setQr] = useState('');
  useEffect(() => { void QRCode.toDataURL(linkEvento('/dinamica'), { width: 900, margin: 1, color: QR_COR }).then(setQr); }, []);
  useEffect(() => {
    if (!qr || !palco.current) return undefined;
    const mural = new Mural(palco.current, qr);
    let vivo = true;
    const carregar = async () => {
      const { data } = await supabase.rpc('communicali_dinamica_telao', { p_slug: slug });
      if (!vivo || !data) return;
      mural.aplicar(data.existe ? { status_1: data.status_1, status_2: data.status_2, modo: data.modo, qr: data.qr, congelado: data.congelado, respostas: data.respostas || [] } : VAZIO);
    };
    mural.aplicar(VAZIO, false);
    void carregar();
    const timer = window.setInterval(carregar, 2000);
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'f' || ev.key === 'F') void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()); };
    window.addEventListener('keydown', tecla);
    return () => { vivo = false; window.clearInterval(timer); window.removeEventListener('keydown', tecla); mural.destruir(); };
  }, [qr, slug]);
  return (
    <main className="dn-tela">
      <div className="dn-stage" ref={palco} />
      <div className="dn-acoes"><button type="button" onClick={() => void document.documentElement.requestFullscreen?.()}>Tela cheia</button></div>
      <p className="dn-dica">Aperte F para tela cheia</p>
    </main>
  );
}
