// E-mails da ComuniCALI: layout próprio, convite de agenda e registro de envio. Cada pessoa recebe cada tipo uma vez por edição.
export const SUPABASE = 'https://cyyrrtekbkltdiatixhp.supabase.co';
export const PUBLIC_KEY = 'sb_publishable_57ZoSr7YGi1KqVdKmXMUxw_wGS-H19P';
import { createHmac } from 'node:crypto';
const SITE = 'https://comuni.calirh.com';
const FROM = 'ComuniCALI <comuni@calirh.com>';
const REPLY_TO = 'contato@calirh.com';
export const EDITION_FIELDS = 'id,slug,titulo,data_evento,horario,local,cidade,endereco,capa_url,lembrete_ativo,publica';

// Página branca, sem moldura. A cor de cada tipo aparece na etiqueta e no botão; os blocos têm cantos arredondados.
const COR = { tinta: '#22100F', bordo: '#5A1E2D', vivo: '#7A1F3D', mostarda: '#C9973B', clara: '#DDB160', suave: '#CBB9B1', marfim: '#F7F0EA', rose: '#FBF1EC', oliva: '#5F6238', terra: '#A9502E' };
const VIVAS = { ouro: 'linear-gradient(135deg,#E8B954,#C9973B)', vinho: 'linear-gradient(135deg,#A8275A,#7A1F3D)', terra: 'linear-gradient(135deg,#D9673A,#A9502E)', oliva: 'linear-gradient(135deg,#8A9A3E,#5F6238)', rosa: 'linear-gradient(135deg,#E86A8E,#B83A62)' };
const FAIXA = {
  recebido: { etiqueta: '#C9973B', fundo: VIVAS.ouro, etiquetaTexto: COR.tinta },
  confirmacao: { etiqueta: '#7A1F3D', fundo: VIVAS.vinho, etiquetaTexto: '#FFFFFF', botao: COR.vivo, botaoTexto: COR.marfim },
  espera: { etiqueta: '#5F6238', fundo: VIVAS.oliva, etiquetaTexto: '#FFFFFF' },
  lembrete: { etiqueta: '#A9502E', fundo: VIVAS.terra, etiquetaTexto: '#FFFFFF', botao: COR.vivo, botaoTexto: COR.marfim },
  convite: { etiqueta: '#C9973B', fundo: VIVAS.ouro, etiquetaTexto: COR.tinta, botao: COR.vivo, botaoTexto: COR.marfim },
  boasvindas: { etiqueta: '#B83A62', fundo: VIVAS.rosa, etiquetaTexto: '#FFFFFF', botao: COR.vivo, botaoTexto: COR.marfim },
};
const FONTES = '<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@600;700&family=Inter:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">';
const NAO_RESPONDA = 'Este é um e-mail automático. Por favor, não responda.';
const WHATS = 'https://wa.me/554187879244';

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
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CALI RH//ComuniCALI//PT', 'METHOD:REQUEST', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${edition.id}@comuni.calirh.com`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(inicio)}`, `DTEND:${utc(fim)}`,
    `SUMMARY:${icsText(`${edition.titulo} | ComuniCALI`)}`, `LOCATION:${icsText(endereco(edition))}`,
    `DESCRIPTION:${icsText(`Encontro da comunidade ComuniCALI. ${SITE}/e/${edition.slug}`)}`,
    'ORGANIZER;CN=ComuniCALI:mailto:comuni@calirh.com',
    `ATTENDEE;CN=${icsText(pessoa.nome || pessoa.email)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${pessoa.email}`,
    'STATUS:CONFIRMED', 'SEQUENCE:0', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Encontro ComuniCALI amanhã', 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

function linkGoogle(edition) {
  const { inicio, fim } = horarios(edition);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: `${edition.titulo} | ComuniCALI`, dates: `${utc(inicio)}/${utc(fim)}`, location: endereco(edition), details: `${SITE}/e/${edition.slug}`, ctz: 'America/Sao_Paulo' });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const absoluta = (url) => (url ? new URL(url, SITE).href : '');

function detalhe(rotulo, valor) {
  return `<tr><td style="padding:0 0 12px;font-family:${TEXTO};font-size:13px;font-weight:600;color:${COR.vivo}">${rotulo}<div style="padding-top:3px;font-size:16px;font-weight:400;line-height:23px;color:${COR.tinta}">${escape(valor)}</div></td></tr>`;
}

// A foto entra como fundo da célula para qualquer formato virar uma faixa recortada; sem capa, o espaço some.
function foto(edition) {
  const capa = absoluta(edition.capa_url);
  return capa ? `<tr><td style="padding:0 0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td height="220" bgcolor="${COR.rose}" background="${escape(capa)}" style="height:220px;border-radius:20px;background-color:${COR.rose};background-image:url('${escape(capa)}');background-position:center 18%;background-size:cover;background-repeat:no-repeat;font-size:1px;line-height:1px">&nbsp;</td></tr></table></td></tr>` : '';
}

function rodape() {
  return `<tr><td align="center" style="padding:32px 0 0;font-family:${TEXTO};font-size:15px;line-height:22px;font-style:italic;color:${COR.vivo}">Falar de pessoas pode mudar o mundo.</td></tr>
<tr><td align="center" style="padding:4px 0 0;font-family:${TEXTO};font-size:14px;line-height:22px;color:${COR.tinta}"><strong>Toda honra a Deus! 🙏</strong><br><a href="${SITE}" style="color:${COR.vivo}">comuni.calirh.com</a> · <a href="https://www.instagram.com/calirh_/" style="color:${COR.vivo}">@calirh_</a></td></tr>
<tr><td align="center" style="padding:18px 0 0;font-family:${TEXTO};font-size:12px;line-height:18px;color:#8A7A72">${NAO_RESPONDA}</td></tr>`;
}

function layout({ previa, titulo, saudacao, paragrafos, edition, botao, depois, cor, detalhes = true }) {
  const texto = paragrafos.map((item) => `<p style="margin:0 0 16px;font-family:${TEXTO};font-size:17px;line-height:27px;text-align:center;color:${COR.tinta}">${item}</p>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">${FONTES}<title>${escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:#FFFFFF" bgcolor="#FFFFFF">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF"><tr><td align="center" style="padding:32px 20px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 28px"><img src="${SITE}/brand/communicali-horizontal.png" width="300" alt="ComuniCALI" style="display:block;width:300px;max-width:100%;height:auto;border:0"></td></tr>
${foto(edition)}
<tr><td align="center" style="padding:0 0 14px"><span style="display:inline-block;padding:8px 18px;border-radius:999px;background-color:${cor.etiqueta};background-image:${cor.fundo};font-family:${TEXTO};font-size:14px;font-weight:600;color:${cor.etiquetaTexto}">${escape(titulo)}</span></td></tr>
<tr><td align="center" style="padding:0 0 16px;font-family:${TITULO};font-size:36px;line-height:42px;font-weight:700;letter-spacing:-.015em;color:${COR.vivo}">${saudacao}</td></tr>
<tr><td style="padding:0 0 8px">${texto}</td></tr>
${detalhes ? `<tr><td bgcolor="${COR.rose}" style="background:${COR.rose};border-radius:20px;padding:22px 24px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${detalhe('Quando', `${longDate(edition.data_evento)}, ${edition.horario}`)}${detalhe('Onde', endereco(edition))}
</table></td></tr>` : ''}
${botao ? `<tr><td align="center" style="padding:24px 0 4px"><a href="${escape(botao.href)}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:${cor.botao};font-family:${TITULO};font-size:16px;font-weight:600;color:${cor.botaoTexto};text-decoration:none">${escape(botao.texto)}</a></td></tr>` : ''}
${depois ? `<tr><td align="center" style="padding:16px 0 0;font-family:${TEXTO};font-size:14px;line-height:22px;color:${COR.bordo}">${depois}</td></tr>` : ''}
${rodape()}
</table></td></tr></table></body></html>`;
}

export function layoutSimples({ titulo, saudacao, texto, destaque, botao, itens = [] }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">${FONTES}<title>${escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:#FFFFFF" bgcolor="#FFFFFF"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF"><tr><td align="center" style="padding:32px 20px 36px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td align="center" style="padding:0 0 28px"><img src="${SITE}/brand/communicali-horizontal.png" width="300" alt="ComuniCALI" style="display:block;width:300px;max-width:100%;height:auto;border:0"></td></tr>
<tr><td align="center" style="padding:0 0 12px"><span style="display:inline-block;padding:7px 16px;border-radius:999px;background:${COR.mostarda};font-family:${TEXTO};font-size:14px;font-weight:600;color:${COR.tinta}">${escape(titulo)}</span></td></tr>
<tr><td align="center" style="padding:0 0 12px;font-family:${TITULO};font-size:36px;line-height:42px;font-weight:700;color:${COR.vivo}">${escape(saudacao)}</td></tr>
<tr><td align="center" style="padding:0 0 22px;font-family:${TEXTO};font-size:17px;line-height:27px;color:${COR.tinta}">${escape(texto)}${destaque ? `<br><strong>${escape(destaque)}</strong>` : ''}</td></tr>
${itens.length ? `<tr><td bgcolor="${COR.rose}" style="background:${COR.rose};border-radius:20px;padding:18px 22px;font-family:${TEXTO};font-size:15px;line-height:24px;color:${COR.tinta}">${itens.map((item) => `✓ ${escape(item)}`).join('<br>')}</td></tr><tr><td height="20"></td></tr>` : ''}
<tr><td align="center"><a href="${escape(botao.href)}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:${COR.vivo};font-family:${TITULO};font-size:16px;font-weight:600;color:${COR.marfim};text-decoration:none">${escape(botao.texto)}</a></td></tr>
${rodape()}
<tr><td align="center" style="padding:8px 0 0;font-family:${TEXTO};font-size:12px;line-height:18px;color:#8A7A72"><a href="${DESCADASTRO}" style="color:#8A7A72">Parar de receber estes e-mails</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function montar(tipo, edition, pessoa) {
  const nome = escape(primeiroNome(pessoa.nome));
  const saudacao = nome ? `Oi, ${nome}!` : 'Oi!';
  const titulo = escape(edition.titulo);
  const agenda = { texto: 'Colocar na minha agenda', href: linkGoogle(edition) };
  const responder = `Se não puder ir, avise a gente pelo <a href="${WHATS}" style="color:${COR.vivo}">WhatsApp</a> para liberarmos o seu lugar.`;
  const textos = {
    recebido: { assunto: `💌 Recebemos sua inscrição: ${edition.titulo}`, previa: 'A equipe vai analisar e você recebe a confirmação por e-mail.', titulo: '💌 Inscrição recebida', saudacao, paragrafos: [`Ficamos muito felizes com o seu interesse. Recebemos sua intenção de participar do encontro <strong>${titulo}</strong>.`, 'A equipe vai analisar e você recebe a confirmação por e-mail.'], detalhes: false, anexo: false },
    confirmacao: { assunto: `🎉 Reserva confirmada: ${edition.titulo}`, previa: 'Sua vaga está reservada.', titulo: '🎉 Reserva confirmada!', saudacao, paragrafos: [`Boa notícia: sua vaga no encontro <strong>${titulo}</strong> está reservada.`], botao: agenda, depois: `Para Outlook ou celular, use o convite anexo. ${responder}`, anexo: true },
    espera: { assunto: `⏳ Lista de espera: ${edition.titulo}`, previa: 'Avisaremos você se abrir um lugar.', titulo: '⏳ Lista de espera', saudacao, paragrafos: [`Ficamos muito felizes com o seu interesse. As vagas do encontro <strong>${titulo}</strong> estão preenchidas, e seu nome entrou na lista de espera.`, 'A equipe avisa você por e-mail se abrir um lugar.'], detalhes: false, anexo: false },
    lembrete: { assunto: `⏰ É amanhã: ${edition.titulo}`, previa: `Nos vemos ${longDate(edition.data_evento)}.`, titulo: '⏰ É amanhã!', saudacao, paragrafos: ['Na chegada, a recepção confirma o seu nome e indica a sua mesa.', 'Depois de sentar, é só fazer o check-in pelo QR Code.'], botao: agenda, depois: responder, anexo: true },
    boasvindas: { assunto: `Boas-vindas à ComuniCALI, ${primeiroNome(pessoa.nome) || 'pessoa querida'}!`, previa: 'Estamos ansiosos para ver você no nosso encontro!', titulo: 'Uhull! Boas-vindas', saudacao: nome ? `Olá, ${nome}!` : 'Olá!', paragrafos: ['Ficamos <em>muito felizes</em> que você esteja com a gente nessa jornada!', 'A <strong>ComuniCALI</strong> nasceu sem pretensão, era pra ser só "um cafezinho entre colegas de trabalho". Ainda não sabemos onde isso vai chegar, mas temos certeza de que vai trazer <em>grandes contribuições</em> para cada pessoa que faz parte dela.', '<strong><u>Estamos ansiosos para ver você no nosso encontro!</u></strong>', 'Ah, e uma novidade: <strong>nosso site está no ar!</strong>'], botao: { texto: 'Acesse o site', href: SITE }, detalhes: false, anexo: false },
    convite: { assunto: `🗓️ Convite para a sua agenda: ${edition.titulo}`, previa: 'Aceite o convite e o encontro entra na sua agenda.', titulo: '🗓️ Convite de agenda', saudacao, paragrafos: [`Aceite o convite do encontro <strong>${titulo}</strong> neste e-mail para ele entrar na sua agenda, ou use o botão abaixo.`], botao: agenda, depois: `Para Outlook ou celular, abra o arquivo anexo. ${responder}`, anexo: true },
  }[tipo];
  return { assunto: textos.assunto, html: layout({ ...textos, edition, cor: FAIXA[tipo] }), ics: textos.anexo ? convite(edition, pessoa) : null };
}

export const banco = (path, options = {}) => fetch(`${SUPABASE}/rest/v1/${path}`, { ...options, headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', ...options.headers } });

const DESCADASTRO = '{{DESCADASTRO}}';
export const assinatura = (email) => createHmac('sha256', process.env.CRON_SECRET || '').update(String(email).toLowerCase()).digest('hex').slice(0, 32);
const linkDescadastro = (email) => `${SITE}/api/descadastro?e=${encodeURIComponent(email.toLowerCase())}&t=${assinatura(email)}`;

export async function enviar(para, mensagem) {
  // E-mails do espaço do membro levam o link de parar de receber e respeitam quem já saiu.
  const membro = mensagem.html.includes(DESCADASTRO);
  if (membro) {
    const saiu = await banco(`email_descadastro?email=eq.${encodeURIComponent(para.toLowerCase())}&select=email`);
    if (saiu.ok && (await saiu.json()).length) return { pulado: true };
  }
  const html = membro ? mensagem.html.replaceAll(DESCADASTRO, linkDescadastro(para)) : mensagem.html;
  const headers = membro ? { 'List-Unsubscribe': `<${linkDescadastro(para)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;
  const attachments = mensagem.ics ? [{ filename: 'convite-communicali.ics', content: Buffer.from(mensagem.ics).toString('base64'), content_type: 'text/calendar; method=REQUEST; charset=UTF-8' }] : undefined;
  const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: FROM, to: [para], reply_to: REPLY_TO, subject: mensagem.assunto, html, attachments, headers }) });
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
