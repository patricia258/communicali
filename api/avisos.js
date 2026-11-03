// Envia os avisos pendentes: nível, missão e perfil indicado para o membro; formulário preenchido e inscrição em encontro para a organização.
// Pode ser chamado a qualquer momento: cada aviso é marcado antes do envio e vai uma vez só.
import { banco, enviar, escape, layoutSimples, pausa } from './_email.js';

const MEU = 'https://comuni.calirh.com/meu-espaco';
const PAINEL = 'https://comuni.calirh.com/admin';
const primeiro = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';
const desde = () => new Date(Date.now() - 3 * 86400000).toISOString();
// Marca como avisado e devolve a linha só se ninguém marcou antes.
async function reservar(tabela, id, coluna) {
  const r = await banco(`${tabela}?id=eq.${id}&${coluna}=is.null`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ [coluna]: new Date().toISOString() }) });
  return r.ok && (await r.json()).length > 0;
}

function mensagemMembro(aviso, nome) {
  const saudacao = `Oi, ${primeiro(nome)}!`;
  if (aviso.tipo === 'nivel') {
    const nivel = (aviso.texto.match(/agora é (.+?)\.?$/) || [])[1] || 'um novo nível';
    return { assunto: `🎉 Você agora é ${nivel} na ComuniCALI`, html: layoutSimples({ titulo: '🎉 Novo nível', saudacao, linhas: ['Você subiu de nível na comunidade!', `Agora você é<br><strong>${escape(nivel)}</strong>`, 'Abra seu passaporte para ver o novo selo<br>e o que muda para você.'], botao: { texto: 'Ver meu passaporte', href: MEU } }) };
  }
  if (aviso.tipo === 'missao') {
    const missao = (aviso.texto.match(/^Missão concluída: (.+?)\. O selo/) || [])[1] || 'uma missão';
    return { assunto: '🏅 Missão concluída na ComuniCALI', html: layoutSimples({ titulo: '🏅 Missão concluída', saudacao, linhas: ['Você concluiu uma missão!', `<strong>${escape(missao)}</strong>`, 'O selo já está no seu passaporte.'], botao: { texto: 'Ver meus selos', href: MEU } }) };
  }
  const [, quem, perfil, recado] = aviso.texto.match(/^(.+?) indicou o perfil de (.+?) para você\.(?: "(.*)")?$/) || [];
  return { assunto: `👤 ${quem || 'Alguém'} indicou um perfil para você`, html: layoutSimples({ titulo: '👤 Perfil indicado', saudacao, linhas: [`<strong>${escape(quem || 'Alguém da Rede')}</strong> indicou um perfil para você:`, `<strong>${escape(perfil || 'um membro da comunidade')}</strong>`, ...(recado ? [`<em>"${escape(recado)}"</em>`] : []), 'Abra seu passaporte para ver o perfil<br>e se conectar.'], botao: { texto: 'Ver o perfil', href: MEU } }) };
}

const valor = (resposta) => (Array.isArray(resposta) ? resposta.join(', ') : resposta && typeof resposta === 'object' ? (resposta.name || resposta.nome || 'arquivo enviado') : String(resposta ?? ''));

export default async function handler(req, res) {
  const total = { membros: 0, formularios: 0, inscricoes: 0 };
  const admins = ((await (await banco('admins?select=email')).json()) || []).map((item) => item.email);

  const avisos = await (await banco(`notifications?email_em=is.null&tipo=in.(nivel,missao,perfil)&created_at=gte.${desde()}&select=id,tipo,texto,member:members!member_id(nome,email)&limit=30`)).json();
  for (const aviso of Array.isArray(avisos) ? avisos : []) {
    if (!aviso.member?.email || aviso.member.email.endsWith('.test') || !(await reservar('notifications', aviso.id, 'email_em'))) continue;
    const r = await enviar(aviso.member.email, mensagemMembro(aviso, aviso.member.nome));
    if (!r.erro && !r.pulado) total.membros += 1;
    await pausa();
  }

  const respostas = await (await banco(`form_responses?admin_avisado_em=is.null&submitted_at=gte.${desde()}&select=id,answers,respondent_name,respondent_email,form:forms!form_id(title,questions)&limit=20`)).json();
  for (const item of Array.isArray(respostas) ? respostas : []) {
    if (!(await reservar('form_responses', item.id, 'admin_avisado_em'))) continue;
    const perguntas = (item.form?.questions || []).filter((q) => q.kind !== 'statement');
    const itens = perguntas.filter((q) => item.answers?.[q.id] !== undefined && valor(item.answers[q.id]) !== '').map((q) => `${q.label}: ${valor(item.answers[q.id])}`.slice(0, 220));
    const quem = item.respondent_name || item.respondent_email || 'Alguém';
    for (const email of admins) {
      await enviar(email, { assunto: `📝 Novo preenchimento: ${item.form?.title || 'formulário'}`, html: layoutSimples({ titulo: '📝 Formulário preenchido', saudacao: 'Mais um preenchimento!', linhas: [`<strong>${escape(quem)}</strong> preencheu`, `<strong>${escape(item.form?.title || 'um formulário')}</strong>`], itens, botao: { texto: 'Ver no painel', href: `${PAINEL}/formularios` }, semSair: true }) });
      await pausa();
    }
    total.formularios += 1;
  }

  const inscricoes = await (await banco(`registrations?admin_avisado_em=is.null&created_at=gte.${desde()}&select=id,nome,email,whatsapp,cargo,empresa,edition:editions!edition_id(titulo)&limit=20`)).json();
  for (const item of Array.isArray(inscricoes) ? inscricoes : []) {
    if (item.email?.endsWith('.test') || !(await reservar('registrations', item.id, 'admin_avisado_em'))) continue;
    const itens = [['Nome', item.nome], ['E-mail', item.email], ['WhatsApp', item.whatsapp], ['Cargo', item.cargo], ['Empresa', item.empresa]].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    for (const email of admins) {
      await enviar(email, { assunto: `🙋 Nova inscrição: ${item.edition?.titulo || 'encontro'}`, html: layoutSimples({ titulo: '🙋 Nova inscrição', saudacao: 'Mais uma pessoa quer vir!', linhas: [`<strong>${escape(item.nome)}</strong> se inscreveu no encontro`, `<strong>${escape(item.edition?.titulo || '')}</strong>`, 'Aprove, coloque em espera ou recuse no painel.'], itens, botao: { texto: 'Abrir Edições', href: `${PAINEL}/edicoes` }, semSair: true }) });
      await pausa();
    }
    total.inscricoes += 1;
  }
  res.status(200).json(total);
}
