// Avisa quem indicou que a inscrição da pessoa chegou e será avaliada. Vale uma vez por inscrição.
import { banco, enviar, layoutSimples } from './_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const slug = String(req.body?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const email = String(req.body?.email || '').trim().toLowerCase();
  const edicao = await (await banco(`editions?slug=eq.${slug}&select=id,titulo`)).json();
  if (!edicao[0]) return res.status(404).end();
  const marcada = await banco(`registrations?edition_id=eq.${edicao[0].id}&email=eq.${encodeURIComponent(email)}&indicado_por=not.is.null&aviso_indicador=eq.false&select=nome,indicado_por`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ aviso_indicador: true }) });
  const linhas = marcada.ok ? await marcada.json() : [];
  if (!linhas.length) return res.status(200).json({ enviado: false });
  const quem = (await (await banco(`members?id=eq.${linhas[0].indicado_por}&select=nome,apelido,email`)).json())[0];
  if (!quem || quem.email.endsWith('.test')) return res.status(200).json({ enviado: false });
  const nome = (quem.apelido || quem.nome).trim().split(/\s+/)[0];
  const convidada = linhas[0].nome.trim().split(/\s+/)[0];
  const result = await enviar(quem.email, { assunto: `💌 ${convidada} se inscreveu com sua indicação`, html: layoutSimples({ titulo: '💌 Nova indicação', saudacao: `Oi, ${nome}!`, texto: `${linhas[0].nome} se inscreveu no encontro ${edicao[0].titulo} com a sua indicação. A equipe vai avaliar a inscrição e avisar vocês por e-mail. Os 5 pontos entram quando a pessoa fizer o check-in.`, botao: { texto: 'Acompanhar minhas indicações', href: 'https://comuni.calirh.com/meu-espaco' } }), ics: null });
  res.status(result.erro ? 502 : 200).json({ enviado: !result.erro });
}
