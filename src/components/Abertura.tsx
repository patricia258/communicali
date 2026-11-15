import { useEffect, useState } from 'react';
import { LOGO_NOVO_LETRAS, LOGO_NOVO_VIEWBOX } from './logoNovoLetras';

/**
 * Abertura animada do lançamento (72 horas). Só aparece na home, no primeiro acesso, dentro da janela.
 * A data de publicação fica aqui, num lugar só. Se for null, a abertura NÃO aparece para ninguém.
 * Para ver na prévia: acrescente ?abertura=1 ao endereço (não grava que já foi vista).
 */
const LANCAMENTO: string | null = '2026-11-16T01:00:00-03:00';
const JANELA_HORAS = 72;
const CHAVE = 'cali_abertura_v1';

const lembrou = () => { try { return !!localStorage.getItem(CHAVE); } catch { return false; } };
const gravar = () => { try { localStorage.setItem(CHAVE, '1'); } catch { /* sem armazenamento: mostra normalmente */ } };

export function Abertura() {
  const [ativa, setAtiva] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const [forcada, setForcada] = useState(false);

  useEffect(() => {
    const forca = new URLSearchParams(location.search).has('abertura');
    const agora = Date.now();
    const dentro = !!LANCAMENTO && agora >= Date.parse(LANCAMENTO) && agora < Date.parse(LANCAMENTO) + JANELA_HORAS * 3600_000;
    if (!forca && !(dentro && !lembrou())) return;
    const menos = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    setReduzido(menos); setForcada(forca); setAtiva(true);
  }, []);

  useEffect(() => {
    if (!ativa) return;
    const fim = setTimeout(() => encerrar(), reduzido ? 4100 : 6600);
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') encerrar(); };
    addEventListener('keydown', tecla);
    return () => { clearTimeout(fim); removeEventListener('keydown', tecla); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, reduzido, forcada]);

  function encerrar() { if (!forcada) gravar(); setAtiva(false); }
  if (!ativa) return null;
  return (
    <>
      <div className={`hn-ab${reduzido ? ' hn-ab--simples' : ''}`} aria-hidden="true">
        <div className="hn-ab__veu" />
        <img className="hn-ab__antiga" src="/brand/communicali-bordo.png" alt="" />
        <svg className="hn-ab__nova" viewBox={LOGO_NOVO_VIEWBOX} role="presentation" focusable="false">
          {LOGO_NOVO_LETRAS.map(([cor, d], i) => <path key={i} className="hn-ab__letra" style={{ ['--i' as string]: i }} fill={cor} d={d} />)}
        </svg>
      </div>
      <button type="button" className="hn-ab__pular" onClick={encerrar}>Pular</button>
    </>
  );
}
