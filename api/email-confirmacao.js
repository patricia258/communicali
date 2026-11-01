// Confirmação logo após a inscrição pelo site. Só envia para quem está inscrito naquela edição, e uma vez só.
import { EDITION_FIELDS, banco, enviarUmaVez } from './_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const slug = String(req.body?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const email = String(req.body?.email || '').trim().toLowerCase();
  const found = await banco(`editions?slug=eq.${slug}&select=${EDITION_FIELDS}`);
  const edition = found.ok ? (await found.json())[0] : null;
  if (!edition) return res.status(404).json({ ok: false });
  const signup = await banco(`registrations?edition_id=eq.${edition.id}&email=eq.${encodeURIComponent(email)}&status=in.(inscrito,espera)&select=nome,email,status`);
  const pessoa = signup.ok ? (await signup.json())[0] : null;
  if (!pessoa) return res.status(404).json({ ok: false });
  const situacao = await enviarUmaVez(pessoa.status === 'espera' ? 'espera' : 'confirmacao', edition, pessoa);
  res.status(situacao === 'erro' ? 502 : 200).json({ ok: situacao !== 'erro' });
}
