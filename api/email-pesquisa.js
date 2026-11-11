// Roda todo dia pelo agendador da Vercel (17h UTC, 14h em Curitiba) e envia a pesquisa de satisfação às pessoas que fizeram check-in
// nas edições que acontecem hoje, quando a edição tem pesquisa e o envio automático está ligado. Cada pessoa recebe uma vez só.
import { EDITION_FIELDS, banco, enviarUmaVez, pausa, presentes } from './_email.js';

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const found = await banco(`editions?data_evento=eq.${hoje}&publica=eq.true&pesquisa_auto=eq.true&form_pesquisa=not.is.null&select=${EDITION_FIELDS}`);
  const editions = found.ok ? await found.json() : [];
  const total = { enviado: 0, ja_enviado: 0, erro: 0 };
  for (const edition of editions) {
    for (const pessoa of await presentes(edition.id)) {
      const situacao = await enviarUmaVez('pesquisa', edition, pessoa);
      total[situacao] += 1;
      if (situacao !== 'ja_enviado') await pausa();
    }
  }
  res.status(200).json({ hoje, edicoes: editions.length, ...total });
}
