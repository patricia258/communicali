// Clique em link de e-mail: registra no email_log e segue para o destino, só em endereços conhecidos.
import { banco } from './_email.js';

const PERMITIDOS = ['comuni.calirh.com', 'calirh.com', 'www.calirh.com', 'wa.me', 'chat.whatsapp.com', 'calendar.google.com', 'www.google.com', 'www.instagram.com', 'instagram.com'];

export default async function handler(req, res) {
  const id = String(req.query?.i || '');
  let destino = 'https://comuni.calirh.com';
  try { const url = new URL(String(req.query?.u || '')); if (url.protocol === 'https:' && PERMITIDOS.includes(url.hostname)) destino = url.href; } catch { /* volta para o site */ }
  if (/^[0-9a-f-]{36}$/.test(id)) {
    const agora = new Date().toISOString();
    await Promise.all([
      banco(`email_log?id=eq.${id}&clicado_em=is.null`, { method: 'PATCH', body: JSON.stringify({ clicado_em: agora }) }),
      banco(`email_log?id=eq.${id}&aberto_em=is.null`, { method: 'PATCH', body: JSON.stringify({ aberto_em: agora }) }),
    ]).catch(() => null);
  }
  res.redirect(302, destino);
}
