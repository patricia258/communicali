// Roda todo dia pelo agendador da Vercel e lembra quem está inscrito nas edições que acontecem no dia seguinte (sexta-feira, para encontros de sábado).
import { EDITION_FIELDS, banco, destinatarios, enviarUmaVez, pausa } from './_email.js';

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const alvo = new Date(new Date(`${hoje}T12:00:00Z`).getTime() + 1 * 86400000).toISOString().slice(0, 10);
  const found = await banco(`editions?data_evento=eq.${alvo}&publica=eq.true&lembrete_ativo=eq.true&select=${EDITION_FIELDS}`);
  const editions = found.ok ? await found.json() : [];
  const total = { enviado: 0, ja_enviado: 0, erro: 0 };
  for (const edition of editions) {
    // Lembrete só para quem está confirmado.
    for (const pessoa of (await destinatarios(edition.id)).filter((item) => item.acionado)) {
      const situacao = await enviarUmaVez('lembrete', edition, pessoa);
      total[situacao] += 1;
      if (situacao !== 'ja_enviado') await pausa();
    }
  }
  const avisos = await fetch('https://comuni.calirh.com/api/avisos', { method: 'POST' }).then((r) => r.json()).catch(() => null);
  res.status(200).json({ alvo, edicoes: editions.length, ...total, avisos });
}
