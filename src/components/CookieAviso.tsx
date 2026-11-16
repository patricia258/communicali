import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './cookie-aviso.css';

const CHAVE = 'cali_cookies_v1';
const ja = () => { try { return !!localStorage.getItem(CHAVE); } catch { return false; } };
const gravar = () => { try { localStorage.setItem(CHAVE, '1'); } catch { /* sem armazenamento: some só nesta visita */ } };

/** Aviso de cookies: só o necessário, sem publicidade. Aparece uma vez por pessoa, depois da abertura animada. */
export function CookieAviso() {
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();
  const area = pathname.startsWith('/painel') || pathname.startsWith('/admin') || pathname.startsWith('/telao');

  useEffect(() => {
    if (ja()) return;
    const t = setTimeout(() => setAberto(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!aberto || area) return null;
  const fechar = () => { gravar(); setAberto(false); };
  return (
    <aside className="ck" role="region" aria-label="Aviso de cookies">
      <p><strong>Cookies, só o necessário.</strong> Usamos apenas o que o site precisa para funcionar. Sem publicidade e sem rastreadores. <a href="/privacidade">Saiba mais</a></p>
      <button type="button" onClick={fechar}>Entendi</button>
    </aside>
  );
}
