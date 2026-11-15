// Link "Parar de receber estes e-mails" dos e-mails do espaço do membro. O endereço vem assinado, então ninguém tira outra pessoa da lista.
import { assinatura, banco } from './_email.js';

const pagina = (titulo, texto) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo} · ComuniCALI</title>
<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet"></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(180deg,#C6DAEA 0%,#E4EEF6 40%,#fff 100%);color:#1B0A10;font:16px/1.6 Inter,sans-serif;text-align:center;padding:24px;box-sizing:border-box">
<main style="max-width:460px"><img src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" style="width:220px;max-width:100%"><h1 style="font:700 30px/1.2 'Funnel Display',sans-serif;margin:28px 0 12px">${titulo}</h1><p style="color:#5D4F55;margin:0 0 24px">${texto}</p>
<a href="/" style="display:inline-block;padding:10px 22px;border-radius:999px;background:#1B0A10;color:#fff;font-weight:700;text-decoration:none">Voltar ao site</a></main></body></html>`;

export default async function handler(req, res) {
  const email = String(req.query?.e || '').trim().toLowerCase();
  const valido = email.includes('@') && process.env.CRON_SECRET && String(req.query?.t || '') === assinatura(email);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!valido) return res.status(400).send(pagina('Link inválido', 'Este link não está completo. Abra de novo pelo e-mail que você recebeu.'));
  const gravado = await banco('email_descadastro?on_conflict=email', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ email }) });
  if (!gravado.ok) return res.status(502).send(pagina('Não deu certo', 'Tente de novo em alguns minutos.'));
  return res.status(200).send(pagina('Pronto, você saiu da lista', 'Você não vai mais receber os e-mails de conexões, sugestões e indicações do seu passaporte na ComuniCALI. Seu passaporte continua disponível no site.'));
}
