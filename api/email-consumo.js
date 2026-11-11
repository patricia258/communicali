// Lembrete de consumação mínima, enviado uma vez às 9h de 12/11/2026 (Brasília) só para quem está confirmado na 1ª edição.
// Agendado pela Vercel em vercel.json. Cada pessoa recebe uma vez só (email_log), então o segundo horário é só repetição de segurança.
import { EDITION_FIELDS, banco, destinatarios, enviarUmaVez, pausa } from './_email.js';

const DIA = '2026-11-12';

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  if (hoje !== DIA) return res.status(200).json({ pulado: true, hoje });
  const found = await banco(`editions?slug=eq.fundadora&select=${EDITION_FIELDS}`);
  const [edition] = found.ok ? await found.json() : [];
  if (!edition) return res.status(404).json({ error: 'Edição não encontrada.' });
  const pessoas = (await destinatarios(edition.id)).filter((item) => item.acionado && item.email && !item.email.endsWith('.test'));
  const total = { enviado: 0, ja_enviado: 0, erro: 0 };
  for (const pessoa of pessoas) {
    const situacao = await enviarUmaVez('consumo', edition, pessoa);
    total[situacao] = (total[situacao] || 0) + 1;
    if (situacao !== 'ja_enviado') await pausa();
  }
  res.status(200).json({ hoje, confirmados: pessoas.length, ...total });
}
