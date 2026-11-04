// E-mails da ComuniCALI: layout próprio, convite de agenda e registro de envio. Cada pessoa recebe cada tipo uma vez por edição.
export const SUPABASE = 'https://cyyrrtekbkltdiatixhp.supabase.co';
export const PUBLIC_KEY = 'sb_publishable_57ZoSr7YGi1KqVdKmXMUxw_wGS-H19P';
import { createHmac } from 'node:crypto';
const SITE = 'https://comuni.calirh.com';
const FROM = 'ComuniCALI <comuni@calirh.com>';
const REPLY_TO = 'contato@calirh.com';
export const EDITION_FIELDS = 'id,slug,numero,titulo,data_evento,horario,local,cidade,endereco,capa_url,lembrete_ativo,publica';

// Topo em imagem (fundo vinho, logo branco, faixa de cores): nenhum aplicativo inverte imagem, então a marca
// aparece igual no modo claro e no escuro. Página branca, sem moldura. A cor de cada tipo aparece na etiqueta e no botão; os blocos têm cantos arredondados.
const COR = { tinta: '#22100F', bordo: '#5A1E2D', vivo: '#7A1F3D', mostarda: '#C9973B', clara: '#DDB160', suave: '#CBB9B1', marfim: '#F7F0EA', rose: '#FBF1EC', oliva: '#5F6238', terra: '#A9502E' };
const VIVAS = { ouro: 'linear-gradient(135deg,#E8B954,#C9973B)', vinho: 'linear-gradient(135deg,#A8275A,#7A1F3D)', terra: 'linear-gradient(135deg,#D9673A,#A9502E)', oliva: 'linear-gradient(135deg,#8A9A3E,#5F6238)', rosa: 'linear-gradient(135deg,#E86A8E,#B83A62)' };
const FAIXA = {
  recebido: { etiqueta: '#C9973B', fundo: VIVAS.ouro, etiquetaTexto: COR.tinta },
  confirmacao: { etiqueta: '#7A1F3D', fundo: VIVAS.vinho, etiquetaTexto: '#FFFFFF', botao: COR.vivo, botaoTexto: COR.marfim },
  espera: { etiqueta: '#5F6238', fundo: VIVAS.oliva, etiquetaTexto: '#FFFFFF' },
  lembrete: { etiqueta: '#A9502E', fundo: VIVAS.terra, etiquetaTexto: '#FFFFFF', botao: COR.vivo, botaoTexto: COR.marfim },
  convite: { etiqueta: '#C9973B', fundo: VIVAS.ouro, etiquetaTexto: COR.tinta, botao: COR.vivo, botaoTexto: COR.marfim },
  agradecimento: { etiqueta: '#C9973B', fundo: VIVAS.ouro, etiquetaTexto: COR.tinta, botao: COR.vivo, botaoTexto: COR.marfim },
  card: { etiqueta: '#C9973B', fundo: VIVAS.ouro, etiquetaTexto: COR.tinta, botao: COR.vivo, botaoTexto: COR.marfim },
  boasvindas: { etiqueta: '#B83A62', fundo: VIVAS.rosa, etiquetaTexto: '#FFFFFF', botao: COR.vivo, botaoTexto: COR.marfim },
};
const FONTES = '<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@600;700&family=Inter:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">';
const NAO_RESPONDA = 'Este é um e-mail automático. Por favor, não responda.';
const WHATS = 'https://wa.me/554187879244';

const TITULO = "'Funnel Display',Helvetica,Arial,sans-serif";
const TEXTO = 'Inter,Helvetica,Arial,sans-serif';

export const escape = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
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

// Junta as duas últimas palavras para nenhuma linha terminar com uma palavra sozinha.
function semViuva(html) {
  for (let i = html.length - 1; i >= 0; i -= 1) {
    if (html[i] === '>') { i = html.lastIndexOf('<', i); continue; }
    if (html[i] === ' ') return `${html.slice(0, i)}&nbsp;${html.slice(i + 1)}`;
  }
  return html;
}

function rodape() {
  return `<tr><td align="center" style="padding:32px 0 0;font-family:${TEXTO};font-size:15px;line-height:22px;font-style:italic;color:${COR.vivo}">Falar de pessoas pode mudar o mundo.</td></tr>
<tr><td align="center" style="padding:4px 0 0;font-family:${TEXTO};font-size:14px;line-height:22px;color:${COR.tinta}"><strong>Toda honra a Deus! 🙏</strong><br><a href="${SITE}" style="color:${COR.vivo}">comuni.calirh.com</a> · <a href="https://www.instagram.com/calirh_/" style="color:${COR.vivo}">@calirh_</a></td></tr>
<tr><td align="center" style="padding:18px 0 0;font-family:${TEXTO};font-size:12px;line-height:18px;color:#8A7A72">${NAO_RESPONDA}</td></tr>`;
}

function layout({ previa, titulo, saudacao, paragrafos, edition, botao, depois, cor, destaque, detalhes = true, comFoto = true }) {
  const texto = paragrafos.map((item) => `<p style="margin:0 0 14px;font-family:${TEXTO};font-size:15px;line-height:24px;text-align:center;color:${COR.tinta}">${semViuva(item)}</p>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">${FONTES}<title>${escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:#FFFFFF" bgcolor="#FFFFFF">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF"><tr><td align="center" style="padding:32px 20px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 28px"><img src="${SITE}/email/topo.png" width="560" alt="ComuniCALI" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:14px"></td></tr>
${comFoto ? foto(edition) : ''}
<tr><td align="center" style="padding:0 0 14px"><span style="display:inline-block;padding:8px 18px;border-radius:999px;background-color:${cor.etiqueta};background-image:${cor.fundo};font-family:${TEXTO};font-size:14px;font-weight:600;color:${cor.etiquetaTexto}">${escape(titulo)}</span></td></tr>
<tr><td align="center" style="padding:0 0 16px;font-family:${TITULO};font-size:36px;line-height:42px;font-weight:700;letter-spacing:-.015em;color:${COR.vivo}">${saudacao}</td></tr>
<tr><td style="padding:0 0 8px">${texto}</td></tr>
${detalhes ? `<tr><td bgcolor="${COR.rose}" style="background:${COR.rose};border-radius:20px;padding:22px 24px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${detalhe('Quando', `${longDate(edition.data_evento)}, ${edition.horario}`)}${detalhe('Onde', endereco(edition))}
</table></td></tr>` : ''}
${destaque ? `<tr><td style="padding:10px 0 6px"><div style="padding:22px 24px;border-radius:20px;background:${COR.rose};border:2px dashed ${COR.mostarda};font-family:${TEXTO};font-size:15px;line-height:24px;text-align:center;color:${COR.tinta}">${destaque}</div></td></tr>` : ''}
${botao ? `<tr><td align="center" style="padding:24px 0 4px"><a href="${escape(botao.href)}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:${cor.botao};font-family:${TITULO};font-size:16px;font-weight:600;color:${cor.botaoTexto};text-decoration:none">${escape(botao.texto)}</a></td></tr>` : ''}
${depois ? `<tr><td align="center" style="padding:16px 0 0;font-family:${TEXTO};font-size:14px;line-height:22px;color:${COR.bordo}">${depois}</td></tr>` : ''}
${rodape()}
</table></td></tr></table></body></html>`;
}

// Cartão de STAFF: etiqueta colorida, saudação, texto e um bloco com os dados combinados. Sem foto de encontro.
function layoutCartao({ previa, titulo, cor, saudacao, paragrafos, itens = [], aviso, botao, depois }) {
  const texto = paragrafos.map((item) => `<p style="margin:0 0 14px;font-family:${TEXTO};font-size:15px;line-height:24px;text-align:center;color:${COR.tinta}">${semViuva(item)}</p>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">${FONTES}<title>${escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:#FFFFFF" bgcolor="#FFFFFF">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF"><tr><td align="center" style="padding:32px 20px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 28px"><img src="${SITE}/email/topo.png" width="560" alt="ComuniCALI" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:14px"></td></tr>
<tr><td align="center" style="padding:0 0 14px"><span style="display:inline-block;padding:8px 18px;border-radius:999px;background-color:${cor.etiqueta};background-image:${cor.fundo};font-family:${TEXTO};font-size:14px;font-weight:600;color:${cor.etiquetaTexto}">${escape(titulo)}</span></td></tr>
<tr><td align="center" style="padding:0 0 16px;font-family:${TITULO};font-size:36px;line-height:42px;font-weight:700;letter-spacing:-.015em;color:${COR.vivo}">${saudacao}</td></tr>
<tr><td style="padding:0 0 8px">${texto}</td></tr>
${aviso ? `<tr><td style="padding:0 0 16px"><div style="padding:14px 18px;border-radius:14px;background:#FBEDE6;border-left:4px solid ${COR.terra};font-family:${TEXTO};font-size:15px;line-height:23px;font-weight:600;color:${COR.terra}">${semViuva(escape(aviso))}</div></td></tr>` : ''}
${itens.length ? `<tr><td bgcolor="${COR.rose}" style="background:${COR.rose};border-radius:20px;padding:22px 24px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itens.filter(([, valor]) => valor).map(([rotulo, valor]) => detalhe(rotulo, valor)).join('')}</table></td></tr>` : ''}
${botao ? `<tr><td align="center" style="padding:24px 0 4px"><a href="${escape(botao.href)}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:${COR.vivo};font-family:${TITULO};font-size:16px;font-weight:600;color:${COR.marfim};text-decoration:none">${escape(botao.texto)}</a></td></tr>` : ''}
${depois ? `<tr><td style="padding:22px 0 0"><div style="padding:18px 22px;border-radius:20px;border:1px dashed ${COR.mostarda};font-family:${TEXTO};font-size:15px;line-height:24px;text-align:center;color:${COR.tinta}">${depois}</div></td></tr>` : ''}
${rodape()}
</table></td></tr></table></body></html>`;
}

const comprovanteTexto = (item) => (item.comprovante === 'nota' ? 'Nota fiscal' : item.comprovante === 'recibo' ? 'Recibo de pessoa física' : '');

/** Boas-vindas para quem acabou de se cadastrar no STAFF. Não confirma data de encontro: é só o cadastro. */
export function emailStaff(item) {
  const nome = escape(primeiroNome(item.nome));
  return {
    assunto: 'Boas-vindas ao STAFF da ComuniCALI!',
    html: layoutCartao({
      previa: 'Seu cadastro chegou e você já faz parte do time deste encontro.',
      titulo: 'Boas-vindas ao STAFF', cor: FAIXA.boasvindas, saudacao: nome ? `Oi, ${nome}!` : 'Oi!',
      paragrafos: [
        'Que alegria ter você com a gente! 🎉',
        'Seu cadastro chegou, e agora você faz parte<br>do <strong>STAFF da ComuniCALI</strong> neste encontro.',
        'É com esse time que a gente recebe as pessoas,<br>cuida de cada detalhe e transforma<br>um café em boas conversas. ☕',
      ],
      itens: [['Encontro', (item.eventos || []).join(', ')], ['Sua função', item.funcao], ['Valor combinado', item.valor_combinado], ['Pagamento', item.pagamento_combinado], ['Comprovante', comprovanteTexto(item)]],
      depois: `<strong>E nos próximos encontros?</strong><br>O STAFF é montado a cada evento.<br>Se a gente chamar você de novo, é só preencher<br>o cadastro outra vez. Se nada tiver mudado,<br>ele fica bem mais rapidinho. 😉<br><br>Ficou alguma dúvida? Chama a organização<br>no <a href="${WHATS}" style="color:${COR.vivo}">WhatsApp</a>.`,
    }),
  };
}

/** Aviso para a organização a cada cadastro de STAFF. Sem CPF, endereço nem Pix: os dados completos ficam no painel. */
export function emailStaffOrganizacao(item, painel) {
  const voltou = item.primeira_vez === false;
  const participacao = voltou ? (item.atualizou_dados ? 'Já participou antes e atualizou os dados' : 'Já participou antes, com os mesmos dados de empresa, endereço e Pix') : 'Primeira vez no STAFF';
  return {
    assunto: `Novo cadastro de STAFF: ${item.nome}`,
    html: layoutCartao({
      previa: `${item.nome} acabou de entrar para o STAFF.`,
      titulo: 'Cadastro de STAFF', cor: FAIXA.confirmacao, saudacao: voltou ? 'Olha quem voltou!' : 'Tem gente nova no time!',
      paragrafos: [voltou ? 'Mais um cadastro de STAFF chegou,<br>de alguém que já esteve com a gente. 💛' : 'Acabou de chegar um cadastro de STAFF. 💛', 'Os dados completos, com CPF,<br>endereço e chave Pix, estão no painel.'],
      aviso: item.conferir || '',
      itens: [['Nome', item.nome], ['Participação', participacao], ['Encontro', (item.eventos || []).join(', ')], ['Função', item.funcao], ['WhatsApp', item.whatsapp], ['E-mail', item.email], ['Valor combinado', item.valor_combinado], ['Pagamento', item.pagamento_combinado], ['Comprovante', comprovanteTexto(item)],
        ['Assistente', item.assistente_nome ? `${item.assistente_nome}: ${item.assistente_funcao || ''}` : 'Não vai levar'], ['Próximos eventos', item.quer_ser_acionado ? 'Quer ser chamado de novo' : 'Prefere não ser chamado']],
      botao: { texto: 'Ver no painel', href: painel },
    }),
  };
}

/** Aviso para a organização a cada cadastro de fornecedor. Sem documento, endereço nem Pix: os dados completos ficam no painel. */
export function emailFornecedorOrganizacao(item, painel) {
  const cadastro = item.primeira_vez ? 'Primeira vez' : item.atualizou_dados ? 'Já forneceu antes e atualizou os dados' : 'Já forneceu antes, com os mesmos dados';
  return {
    assunto: `Novo cadastro de fornecedor: ${item.nome}`,
    html: layoutCartao({
      previa: `${item.nome} se cadastrou como fornecedor.`,
      titulo: 'Cadastro de fornecedor', cor: FAIXA.convite, saudacao: 'Novo fornecedor por aqui!',
      paragrafos: ['Chegou um cadastro de fornecedor. 📦', 'Os dados completos, com documento,<br>endereço e chave Pix, estão no painel.'],
      itens: [['Nome', item.nome], ['Cadastro', cadastro], ['Fornece', `${item.categoria}: ${item.fornece}`], ['Contato', item.contato_nome], ['WhatsApp', item.whatsapp], ['E-mail', item.email]],
      botao: { texto: 'Ver no painel', href: painel },
    }),
  };
}

export function layoutSimples({ titulo, saudacao, texto, destaque, linhas, botao, itens = [], semSair = false, imagem }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">${FONTES}<title>${escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:#FFFFFF" bgcolor="#FFFFFF"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF"><tr><td align="center" style="padding:32px 20px 36px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td align="center" style="padding:0 0 28px"><img src="${SITE}/email/topo.png" width="560" alt="ComuniCALI" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:14px"></td></tr>
${imagem ? `<tr><td align="center" style="padding:0 0 18px"><img src="${escape(imagem)}" width="200" alt="" style="display:block;width:200px;max-width:70%;height:auto;border:0"></td></tr>` : ''}
<tr><td align="center" style="padding:0 0 12px"><span style="display:inline-block;padding:7px 16px;border-radius:999px;background:${COR.mostarda};font-family:${TEXTO};font-size:14px;font-weight:600;color:${COR.tinta}">${escape(titulo)}</span></td></tr>
<tr><td align="center" style="padding:0 0 12px;font-family:${TITULO};font-size:36px;line-height:42px;font-weight:700;color:${COR.vivo}">${escape(saudacao)}</td></tr>
<tr><td align="center" style="padding:0 0 22px;font-family:${TEXTO};font-size:15px;line-height:24px;color:${COR.tinta}">${linhas ? linhas.map((item) => `<div style="margin:0 0 8px">${semViuva(item)}</div>`).join('') : `${semViuva(escape(texto))}${destaque ? `<br><strong>${semViuva(escape(destaque))}</strong>` : ''}`}</td></tr>
${itens.length ? `<tr><td bgcolor="${COR.rose}" style="background:${COR.rose};border-radius:20px;padding:18px 22px;font-family:${TEXTO};font-size:15px;line-height:24px;color:${COR.tinta}">${itens.map((item) => `✓ ${escape(item)}`).join('<br>')}</td></tr><tr><td height="20"></td></tr>` : ''}
${botao ? `<tr><td align="center"><a href="${escape(botao.href)}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:${COR.vivo};font-family:${TITULO};font-size:16px;font-weight:600;color:${COR.marfim};text-decoration:none">${escape(botao.texto)}</a></td></tr>` : ''}
${rodape()}
${semSair ? '' : `<tr><td align="center" style="padding:8px 0 0;font-family:${TEXTO};font-size:12px;line-height:18px;color:#8A7A72"><a href="${DESCADASTRO}" style="color:#8A7A72">Parar de receber estes e-mails</a></td></tr>`}
</table></td></tr></table></body></html>`;
}

export function montar(tipo, edition, pessoa) {
  const nome = escape(primeiroNome(pessoa.nome));
  const saudacao = nome ? `Oi, ${nome}!` : 'Oi!';
  const titulo = escape(edition.titulo);
  const agenda = { texto: 'Colocar na minha agenda', href: linkGoogle(edition) };
  const responder = `Se não puder ir, avise a gente pelo <a href="${WHATS}" style="color:${COR.vivo}">WhatsApp</a> para liberarmos o seu lugar.`;
  const textos = {
    recebido: { assunto: `Recebemos sua inscrição: ${edition.titulo}`, previa: 'A equipe vai analisar e você recebe a confirmação por e-mail.', titulo: 'Inscrição recebida', saudacao, paragrafos: ['Ficamos muito felizes com o seu interesse!', `Recebemos sua inscrição para o encontro<br><strong>${titulo}</strong>`, 'A equipe vai analisar e você recebe<br>a <strong>confirmação por e-mail</strong>.'], detalhes: false, anexo: false },
    confirmacao: { assunto: `Reserva confirmada: ${edition.titulo}`, previa: 'Sua vaga está reservada.', titulo: 'Reserva confirmada!', saudacao, paragrafos: ['Boa notícia!', `Sua vaga no encontro<br><strong>${titulo}</strong><br>está reservada.`, 'Coloque na sua agenda pelo botão abaixo.'], botao: agenda, depois: `Para Outlook ou celular, use o convite anexo. ${responder}`, anexo: true },
    espera: { assunto: `Lista de espera: ${edition.titulo}`, previa: 'Avisaremos você se abrir um lugar.', titulo: 'Lista de espera', saudacao, paragrafos: ['Ficamos muito felizes com o seu interesse!', `As vagas do encontro<br><strong>${titulo}</strong><br>estão preenchidas.`, 'Seu nome entrou na <strong>lista de espera</strong>.', 'Se abrir um lugar, avisamos você por e-mail.'], detalhes: false, anexo: false },
    lembrete: { assunto: `É amanhã: ${edition.titulo}`, previa: `Nos vemos ${longDate(edition.data_evento)}.`, titulo: 'É amanhã!', saudacao, paragrafos: ['Amanhã é dia de ComuniCALI!', '<strong>Na chegada</strong>, a recepção confirma o seu nome<br>e indica a sua mesa.', '<strong>Na mesa</strong>, é só fazer o check-in<br>pelo QR Code.'], botao: agenda, depois: responder, anexo: true },
    boasvindas: { assunto: `Boas-vindas à ComuniCALI, ${primeiroNome(pessoa.nome) || 'pessoa querida'}!`, previa: 'Estamos ansiosos para ver você no nosso encontro!', titulo: 'Uhull! Boas-vindas', saudacao: nome ? `Olá, ${nome}!` : 'Olá!', paragrafos: ['Ficamos <em>muito felizes</em> que você esteja com a gente nessa jornada!', 'A <strong>ComuniCALI</strong> nasceu sem pretensão, era pra ser só "um cafezinho entre colegas de trabalho". Ainda não sabemos onde isso vai chegar, mas temos certeza de que vai trazer <em>grandes contribuições</em> para cada pessoa que faz parte dela.', '<strong><u>Estamos ansiosos para ver você no nosso encontro!</u></strong>', 'Ah, e uma novidade: <strong>nosso site está no ar!</strong>'], botao: { texto: 'Acesse o site', href: SITE }, detalhes: false, anexo: false },
    agradecimento: { assunto: `Obrigado pelo interesse na ComuniCALI, ${primeiroNome(pessoa.nome) || 'pessoa querida'}!`, previa: 'Essa é só a primeira de muitas edições.', titulo: 'Obrigado pelo interesse', saudacao: nome ? `Olá, ${nome}!` : 'Olá!', paragrafos: ['Muito obrigado pelo seu interesse na <strong>ComuniCALI</strong>!', 'As vagas da nossa <em>primeira edição</em> já estão fechadas, e que pena que desta vez você não vai poder estar com a gente.', '<strong><u>Mas essa é só a primeira de muitas!</u></strong> Queremos muito conhecer você nos próximos encontros.', 'Ah, e uma novidade: <strong>nosso site está no ar!</strong> Lá você conhece a comunidade e registra seu interesse para as próximas edições.'], botao: { texto: 'Conheça a ComuniCALI', href: SITE }, detalhes: false, comFoto: false, anexo: false },
    card: { assunto: `Seu card "Eu vou!" está pronto, ${primeiroNome(pessoa.nome) || 'pessoa querida'}!`, previa: 'Crie o seu card, poste marcando a CALI e ganhe um mimo no encontro.', titulo: 'Eu vou!', saudacao: nome ? `Olá, ${nome}!` : 'Olá!',
      paragrafos: [`Faltam poucos dias para o nosso <strong>${edition.numero === 1 ? 'primeiro encontro' : 'próximo encontro'}</strong>, e a gente já está na contagem regressiva! 🎉`, 'Preparamos um <strong>card especial</strong> para você mostrar que vai estar com a gente. Ele já sai pronto, com a <em>sua foto</em>.'],
      // Mimo em destaque: quem posta e toca em "Já compartilhei" na página do card entra na lista de retirada.
      destaque: `<div style="font-family:${TITULO};font-size:21px;line-height:28px;font-weight:700;color:${COR.vivo}">Temos um mimo super especial para você! 🎁</div><div style="margin-top:10px">Poste o seu card no <strong>Instagram</strong> ou no <strong>LinkedIn</strong> marcando a <strong>CALI RH</strong> (no Instagram, <strong>@calirh_</strong>).</div><div style="margin-top:8px">Depois, toque em <strong>Já compartilhei</strong> na página do card.</div><div style="margin-top:8px">No dia do encontro, é só <strong>retirar o seu mimo surpresa</strong>. 💛</div>`,
      botao: { texto: 'Criar meu card', href: `${SITE}/eu-vou?c=${assinatura(pessoa.cardEmail || pessoa.email)}` }, detalhes: false, comFoto: false, anexo: false },
    convite: { assunto: `Convite para a sua agenda: ${edition.titulo}`, previa: 'Aceite o convite e o encontro entra na sua agenda.', titulo: 'Convite de agenda', saudacao, paragrafos: [`Aceite o convite do encontro <strong>${titulo}</strong> neste e-mail para ele entrar na sua agenda, ou use o botão abaixo.`], botao: agenda, depois: `Para Outlook ou celular, abra o arquivo anexo. ${responder}`, anexo: true },
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
// Botões e links passam pelo site para contar o clique; uma imagem invisível conta a abertura.
export function rastrear(html, id) {
  const marcado = html.replace(/href="(https?:[^"]+)"/g, (_, url) => `href="${SITE}/api/r?i=${id}&amp;u=${encodeURIComponent(url.replace(/&amp;/g, '&'))}"`);
  return marcado.replace('</body>', `<img src="${SITE}/api/o?i=${id}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0"></body>`);
}

export async function enviarUmaVez(tipo, edition, pessoa) {
  const email = pessoa.email.toLowerCase();
  await banco(`email_log?edition_id=eq.${edition.id}&email=eq.${encodeURIComponent(email)}&tipo=eq.${tipo}&situacao=eq.erro`, { method: 'DELETE' });
  const reserved = await banco('email_log?on_conflict=edition_id,email,tipo', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ edition_id: edition.id, email, tipo }) });
  const rows = reserved.ok ? await reserved.json() : [];
  if (!rows.length) return 'ja_enviado';
  const mensagem = montar(tipo, edition, pessoa);
  const result = await enviar(email, { ...mensagem, html: rastrear(mensagem.html, rows[0].id) });
  await banco(`email_log?id=eq.${rows[0].id}`, { method: 'PATCH', body: JSON.stringify(result.erro ? { situacao: 'erro', erro: result.erro.slice(0, 300) } : { situacao: 'enviado', resend_id: result.id }) });
  return result.erro ? 'erro' : 'enviado';
}

export async function destinatarios(editionId) {
  const found = await banco('rpc/communicali_destinatarios', { method: 'POST', body: JSON.stringify({ p_edition: editionId }) });
  if (!found.ok) throw new Error('Não foi possível ler os inscritos.');
  return found.json();
}

export const pausa = () => new Promise((resolve) => setTimeout(resolve, 600));
