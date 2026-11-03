// Abertura de e-mail: imagem transparente de 1 pixel que marca o email_log.
import { banco } from './_email.js';

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export default async function handler(req, res) {
  const id = String(req.query?.i || '');
  if (/^[0-9a-f-]{36}$/.test(id)) await banco(`email_log?id=eq.${id}&aberto_em=is.null`, { method: 'PATCH', body: JSON.stringify({ aberto_em: new Date().toISOString() }) }).catch(() => null);
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).send(PIXEL);
}
