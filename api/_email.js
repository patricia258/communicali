// E-mails da CommuniCALI: layout próprio, convite de agenda e registro de envio. Cada pessoa recebe cada tipo uma vez por edição.
export const SUPABASE = 'https://cyyrrtekbkltdiatixhp.supabase.co';
export const PUBLIC_KEY = 'sb_publishable_57ZoSr7YGi1KqVdKmXMUxw_wGS-H19P';
const SITE = 'https://comuni.calirh.com';
const FROM = 'CommuniCALI <comuni@calirh.com>';
const REPLY_TO = 'contato@calirh.com';
export const EDITION_FIELDS = 'id,slug,titulo,data_evento,horario,local,cidade,endereco,lembrete_ativo,publica';

const COR = { fundo: '#1F0E14', painel: '#2A151C', mostarda: '#C9973B', clara: '#DDB160', marfim: '#F7F0EA', suave: '#CBB9B1', tinta: '#22100F' };
const TITULO = "'Funnel Display',Helvetica,Arial,sans-serif";
const TEXTO = 'Inter,Helvetica,Arial,sans-serif';

const escape = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const longDate = (iso) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';
const endereco = (e) => [e.local, e.endereco, e.cidade].filter(Boolean).join(', ');

/** Lê "9h às 12h" ou "9h30 - 12h". Brasília não tem horário de verão, então o fuso é sempre -03:00. */
export function horarios(edition) {
  const found = /(\d{1,2})(?:[:h](\d{2}))?\s*h?\s*(?:às|as|a|-|–)\s*(\d{1,2})(?:[:h](\d{2}))?/i.exec(edition.horario || '');
  const start = found ? [found[1], found[2] || '00'] : ['9', '00'];
  const end = found ? [found[3], found[4] || '00'] : ['12', '00'];
  const at = ([h, m]) => new Date(`${edition.data_evento}T${h.padStart(2, '0')}:${m}:00-03:00`);
  return { inicio: at(start), fim: at(end) };
}

const utc = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function fold(line) {
  const parts = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    if (size + bytes > 73) { parts.push(current); current = ' '; size = 1; }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n');
}

export function convite(edition, pessoa) {
  const { inicio, fim } = horarios(edition);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CALI RH//CommuniCALI//PT', 'METHOD:REQUEST', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${edition.id}@comuni.calirh.com`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(inicio)}`, `DTEND:${utc(fim)}`,
    `SUMMARY:${icsText(`${edition.titulo} | CommuniCALI`)}`, `LOCATION:${icsText(endereco(edition))}`,
    `DESCRIPTION:${icsText(`Encontro da comunidade CommuniCALI. ${SITE}/e/${edition.slug}`)}`,
    'ORGANIZER;CN=CommuniCALI:mailto:comuni@calirh.com',
    `ATTENDEE;CN=${icsText(pessoa.nome || pessoa.email)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${pessoa.email}`,
    'STATUS:CONFIRMED', 'SEQUENCE:0', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Encontro CommuniCALI amanhã', 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

function linkGoogle(edition) {
  const { inicio, fim } = horarios(edition);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: `${edition.titulo} | CommuniCALI`, dates: `${utc(inicio)}/${utc(fim)}`, location: endereco(edition), details: `${SITE}/e/${edition.slug}`, ctz: 'America/Sao_Paulo' });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function detalhe(rotulo, valor) {
  return `<tr><td style="padding:0 0 12px;font-family:${TEXTO};font-size:12px;letter-spacing:.14em;color:${COR.clara}">${rotulo}<div style="padding-top:3px;font-size:15px;letter-spacing:0;line-height:22px;color:${COR.marfim}">${escape(valor)}</div></td></tr>`;
}

function layout({ previa, titulo, paragrafos, edition, botao, depois }) {
  const texto = paragrafos.map((item) => `<p style="margin:0 0 14px;font-family:${TEXTO};font-size:16px;line-height:25px;color:${COR.suave}">${item}</p>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:${COR.fundo}" bgcolor="${COR.fundo}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COR.fundo}" style="background:${COR.fundo}"><tr><td align="center" style="padding:32px 16px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 28px"><img src="${SITE}/brand/communicali-branco.png" width="186" height="40" alt="CommuniCALI" style="display:block;border:0"></td></tr>
<tr><td style="padding:0 0 18px;font-family:${TITULO};font-size:32px;line-height:37px;font-weight:700;letter-spacing:-.015em;color:${COR.marfim}">${escape(titulo)}</td></tr>
<tr><td style="padding:0 0 12px">${texto}</td></tr>
<tr><td bgcolor="${COR.painel}" style="background:${COR.painel};padding:22px 24px 10px;border-top:1px solid ${COR.mostarda}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${detalhe('QUANDO', `${longDate(edition.data_evento)}, ${edition.horario}`)}${detalhe('ONDE', endereco(edition))}
</table></td></tr>
${botao ? `<tr><td style="padding:24px 0 8px"><a href="${escape(botao.href)}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:${COR.mostarda};font-family:${TITULO};font-size:15px;font-weight:600;color:${COR.tinta};text-decoration:none">${escape(botao.texto)}</a></td></tr>` : ''}
${depois ? `<tr><td style="padding:12px 0 0;font-family:${TEXTO};font-size:14px;line-height:22px;color:${COR.suave}">${depois}</td></tr>` : ''}
<tr><td style="padding:36px 0 0"><div style="border-top:1px solid ${COR.mostarda};height:1px;line-height:1px;font-size:1px">&nbsp;</div></td></tr>
<tr><td style="padding:18px 0 0;font-family:${TITULO};font-size:16px;line-height:22px;color:${COR.marfim}">Falar de pessoas pode mudar o mundo.</td></tr>
<tr><td style="padding:8px 0 0;font-family:${TEXTO};font-size:13px;line-height:20px;color:${COR.suave}">Toda honra a Deus!<br>CommuniCALI, uma comunidade organizada pela CALI RH<br><a href="${SITE}" style="color:${COR.clara}">comuni.calirh.com</a> · <a href="https://www.instagram.com/calirh_/" style="color:${COR.clara}">@calirh_</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function montar(tipo, edition, pessoa) {
  const nome = escape(primeiroNome(pessoa.nome));
  const oi = nome ? `Oi, ${nome}.` : 'Oi.';
  const titulo = escape(edition.titulo);
  const agenda = { texto: 'Colocar na minha agenda', href: linkGoogle(edition) };
  const responder = 'Se não puder ir, responda este e-mail para liberarmos o seu lugar.';
  const textos = {
    confirmacao: { assunto: `Inscrição confirmada: ${edition.titulo}`, previa: 'Seu lugar está guardado.', titulo: 'Seu lugar está guardado', paragrafos: [`${oi} Recebemos sua inscrição para o encontro <strong style="color:${COR.marfim}">${titulo}</strong>.`], botao: agenda, depois: `O botão abre o Google Agenda. Para Outlook ou celular, use o convite anexo. ${responder}`, anexo: true },
    espera: { assunto: `Lista de espera: ${edition.titulo}`, previa: 'Avisaremos você se abrir um lugar.', titulo: 'Você está na lista de espera', paragrafos: [`${oi} As vagas do encontro <strong style="color:${COR.marfim}">${titulo}</strong> estão preenchidas, e seu nome entrou na lista de espera.`, 'Avisaremos você por e-mail se abrir um lugar.'], anexo: false },
    lembrete: { assunto: `Faltam 2 dias: ${edition.titulo}`, previa: `Nos vemos ${longDate(edition.data_evento)}.`, titulo: 'Faltam 2 dias para o nosso encontro', paragrafos: [`${oi} Na chegada, a recepção confirma o seu nome e indica a sua mesa. Depois de sentar, você faz o check-in pelo QR Code do telão.`], botao: agenda, depois: responder, anexo: true },
    convite: { assunto: `Convite para a sua agenda: ${edition.titulo}`, previa: 'Aceite o convite e o encontro entra na sua agenda.', titulo: 'Coloque o encontro na sua agenda', paragrafos: [`${oi} Este e-mail traz o convite do encontro <strong style="color:${COR.marfim}">${titulo}</strong>. Aceite o convite no seu e-mail para ele entrar na agenda, ou use o botão abaixo.`], botao: agenda, depois: `Para Outlook ou celular, abra o arquivo anexo. ${responder}`, anexo: true },
  }[tipo];
  return { assunto: textos.assunto, html: layout({ ...textos, edition }), ics: textos.anexo ? convite(edition, pessoa) : null };
}

export const banco = (path, options = {}) => fetch(`${SUPABASE}/rest/v1/${path}`, { ...options, headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', ...options.headers } });

export async function enviar(para, mensagem) {
  const attachments = mensagem.ics ? [{ filename: 'convite-communicali.ics', content: Buffer.from(mensagem.ics).toString('base64'), content_type: 'text/calendar; method=REQUEST; charset=UTF-8' }] : undefined;
  const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: FROM, to: [para], reply_to: REPLY_TO, subject: mensagem.assunto, html: mensagem.html, attachments }) });
  const body = await sent.json().catch(() => ({}));
  return sent.ok ? { id: body.id } : { erro: `${sent.status} ${body.message || ''}`.trim() };
}

/** Reserva o envio no registro antes de mandar: duas chamadas ao mesmo tempo nunca geram dois e-mails. Envio com erro pode ser refeito. */
export async function enviarUmaVez(tipo, edition, pessoa) {
  const email = pessoa.email.toLowerCase();
  await banco(`email_log?edition_id=eq.${edition.id}&email=eq.${encodeURIComponent(email)}&tipo=eq.${tipo}&situacao=eq.erro`, { method: 'DELETE' });
  const reserved = await banco('email_log?on_conflict=edition_id,email,tipo', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ edition_id: edition.id, email, tipo }) });
  const rows = reserved.ok ? await reserved.json() : [];
  if (!rows.length) return 'ja_enviado';
  const result = await enviar(email, montar(tipo, edition, pessoa));
  await banco(`email_log?id=eq.${rows[0].id}`, { method: 'PATCH', body: JSON.stringify(result.erro ? { situacao: 'erro', erro: result.erro.slice(0, 300) } : { situacao: 'enviado', resend_id: result.id }) });
  return result.erro ? 'erro' : 'enviado';
}

export async function destinatarios(editionId) {
  const found = await banco('rpc/communicali_destinatarios', { method: 'POST', body: JSON.stringify({ p_edition: editionId }) });
  if (!found.ok) throw new Error('Não foi possível ler os inscritos.');
  return found.json();
}

export const pausa = () => new Promise((resolve) => setTimeout(resolve, 600));
