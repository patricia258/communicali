// Confirmação logo após a inscrição pelo site. Só envia para quem está inscrito naquela edição, e uma vez só.
import { EDITION_FIELDS, banco, enviarUmaVez } from './_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  // Formulário de inscrição da edição em modo de espera: quem acabou de entrar na lista recebe o aviso, uma vez só.
  const formulario = String(req.body?.form || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (formulario) {
    const alvo = String(req.body?.email || '').trim().toLowerCase();
    const ed = await banco(`editions?form_inscricao=eq.${formulario}&select=${EDITION_FIELDS}`);
    const edicao = ed.ok ? (await ed.json())[0] : null;
    const form = await banco(`forms?slug=eq.${formulario}&select=id`);
    const formId = form.ok ? (await form.json())[0]?.id : null;
    if (!edicao || !formId || !alvo.includes('@')) return res.status(200).json({ ok: false });
    const resposta = await banco(`form_responses?form_id=eq.${formId}&respondent_email=ilike.${encodeURIComponent(alvo)}&stage=eq.${encodeURIComponent('Lista de espera')}&select=respondent_name,respondent_email&limit=1`);
    const quem = resposta.ok ? (await resposta.json())[0] : null;
    if (!quem) return res.status(200).json({ ok: false });
    const situacao = await enviarUmaVez('espera', edicao, { nome: quem.respondent_name, email: quem.respondent_email });
    return res.status(situacao === 'erro' ? 502 : 200).json({ ok: situacao !== 'erro' });
  }
  const slug = String(req.body?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const email = String(req.body?.email || '').trim().toLowerCase();
  const found = await banco(`editions?slug=eq.${slug}&select=${EDITION_FIELDS}`);
  const edition = found.ok ? (await found.json())[0] : null;
  if (!edition) return res.status(404).json({ ok: false });
  const signup = await banco(`registrations?edition_id=eq.${edition.id}&email=eq.${encodeURIComponent(email)}&status=in.(analise,inscrito,espera)&select=nome,email,status`);
  const pessoa = signup.ok ? (await signup.json())[0] : null;
  if (!pessoa) return res.status(404).json({ ok: false });
  const situacao = await enviarUmaVez(({ analise: 'recebido', espera: 'espera', inscrito: 'confirmacao' })[pessoa.status], edition, pessoa);
  res.status(situacao === 'erro' ? 502 : 200).json({ ok: situacao !== 'erro' });
}
