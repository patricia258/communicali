// Envia os avisos pendentes: nível, missão e perfil indicado para o membro; formulário preenchido, inscrição em encontro e cadastro de staff para a organização.
// Pode ser chamado a qualquer momento: cada aviso é marcado antes do envio e vai uma vez só.
import { banco, emailFluxo, emailFornecedorOrganizacao, emailStaff, emailStaffOrganizacao, enviar, escape, layoutSimples, pausa } from './_email.js';

const MEU = 'https://comuni.calirh.com/meu-passaporte';
const PAINEL = 'https://comuni.calirh.com/admin';
const primeiro = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';
const desde = () => new Date(Date.now() - 3 * 86400000).toISOString();
// Marca como avisado e devolve a linha só se ninguém marcou antes.
async function reservar(tabela, id, coluna) {
  const r = await banco(`${tabela}?id=eq.${id}&${coluna}=is.null`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ [coluna]: new Date().toISOString() }) });
  return r.ok && (await r.json()).length > 0;
}

function mensagemMembro(aviso, nome, missoes, edicoes) {
  const saudacao = `Oi, ${primeiro(nome)}!`;
  if (aviso.tipo === 'nivel') {
    const nivel = (aviso.texto.match(/agora é (.+?)\.?$/) || [])[1] || 'um novo nível';
    const selo = { Conector: 'conector', Embaixador: 'embaixador', Membro: 'membro' }[nivel];
    return { assunto: `Parabéns! Você agora é ${nivel} na ComuniCALI`, html: layoutSimples({ titulo: 'Novo nível conquistado', imagem: selo ? `https://comuni.calirh.com/selos/novo/png/${selo}.png` : undefined, saudacao: `Parabéns, ${primeiro(nome)}!`, linhas: ['Você subiu de nível na comunidade!', `Agora você é<br><strong>${escape(nivel)}</strong>`, 'Abra seu passaporte para ver o novo selo<br>e o que muda para você.'], botao: { texto: 'Ver meu passaporte', href: MEU } }) };
  }
  if (aviso.tipo === 'missao') {
    const missao = (aviso.texto.match(/^Missão concluída: (.+?)\. O selo/) || [])[1] || 'uma missão';
    const slug = missoes.find((item) => item.titulo === missao)?.slug;
    return { assunto: 'Missão concluída! Seu selo novo chegou', html: layoutSimples({ titulo: 'Missão concluída', imagem: slug ? `https://comuni.calirh.com/selos/missao-${slug}.png` : undefined, saudacao: `Parabéns, ${primeiro(nome)}!`, linhas: ['Você concluiu uma missão!', `<strong>${escape(missao)}</strong>`, 'O selo já está no seu passaporte.'], botao: { texto: 'Ver meus selos', href: MEU } }) };
  }
  if (aviso.tipo === 'carimbo') {
    const edicao = (aviso.texto.match(/passaporte: (.+?)\.$/) || [])[1] || 'o encontro';
    const carimbo = edicoes.find((item) => item.titulo === edicao)?.carimbo_url;
    return { assunto: 'Novo carimbo no seu passaporte ComuniCALI', html: layoutSimples({ titulo: 'Novo carimbo', imagem: carimbo ? new URL(carimbo, 'https://comuni.calirh.com').href : undefined, saudacao, linhas: ['Que bom ter você com a gente!', 'Seu passaporte ganhou o carimbo de', `<strong>${escape(edicao)}</strong>`, 'Entre no Meu passaporte para ver seus carimbos,<br>milhas e missões.'], botao: { texto: 'Ver meu passaporte', href: MEU } }) };
  }
  const [, quem, perfil, recado] = aviso.texto.match(/^(.+?) indicou o perfil de (.+?) para você\.(?: "(.*)")?$/) || [];
  return { assunto: `${quem || 'Alguém'} indicou um perfil para você`, html: layoutSimples({ titulo: 'Perfil indicado', saudacao, linhas: [`<strong>${escape(quem || 'Alguém da Rede')}</strong> indicou um perfil para você:`, `<strong>${escape(perfil || 'um membro da comunidade')}</strong>`, ...(recado ? [`<em>"${escape(recado)}"</em>`] : []), 'Abra seu passaporte para ver o perfil<br>e se conectar.'], botao: { texto: 'Ver o perfil', href: MEU } }) };
}

const valor = (resposta) => (Array.isArray(resposta) ? resposta.join(', ') : resposta && typeof resposta === 'object' ? (resposta.name || resposta.nome || 'arquivo enviado') : String(resposta ?? ''));

export default async function handler(req, res) {
  const total = { membros: 0, adesoes: 0, pos_presenca: 0, formularios: 0, inscricoes: 0, staff: 0, fornecedores: 0 };
  const admins = ((await (await banco('admins?select=email')).json()) || []).map((item) => item.email);

  const avisos = await (await banco(`notifications?email_em=is.null&tipo=in.(nivel,missao,perfil,carimbo)&created_at=gte.${desde()}&select=id,tipo,texto,member:members!member_id(nome,email)&limit=30`)).json();
  const missoes = (await (await banco('missions?select=slug,titulo')).json()) || [];
  const edicoes = (await (await banco('editions?select=titulo,carimbo_url')).json()) || [];
  for (const aviso of Array.isArray(avisos) ? avisos : []) {
    if (!aviso.member?.email || aviso.member.email.endsWith('.test') || !(await reservar('notifications', aviso.id, 'email_em'))) continue;
    const r = await enviar(aviso.member.email, mensagemMembro(aviso, aviso.member.nome, missoes, edicoes));
    if (!r.erro && !r.pulado) total.membros += 1;
    await pausa();
  }

  // Regras v23: e-mails da adesão a Membro (pedido recebido, aprovado, ajustes, não aprovado) e aviso à organização quando chega um pedido.
  const configuracao = (await (await banco('site_settings?select=passaporte_aberto')).json()) || [];
  const passaporteAberto = Boolean(configuracao[0]?.passaporte_aberto);
  const adesoes = await (await banco(`adesao_log?email_enviado_em=is.null&para=in.(solicitada,aprovada,ajustes,nao_aprovada)&em=gte.${desde()}&select=id,para,motivo,member:members!member_id(nome,email)&limit=20`)).json();
  for (const item of Array.isArray(adesoes) ? adesoes : []) {
    if (!item.member?.email || item.member.email.endsWith('.test') || !(await reservar('adesao_log', item.id, 'email_enviado_em'))) continue;
    const tipo = { solicitada: 'adesao_recebida', aprovada: 'adesao_aprovada', ajustes: 'adesao_ajustes', nao_aprovada: 'adesao_nao_aprovada' }[item.para];
    const r = await enviar(item.member.email, emailFluxo(tipo, { nome: item.member.nome, motivo: item.motivo, passaporteAberto }));
    if (!r.erro && !r.pulado) total.adesoes += 1;
    if (item.para === 'solicitada') {
      for (const email of admins) {
        await enviar(email, { assunto: `Novo pedido de adesão: ${item.member.nome}`, html: layoutSimples({ titulo: 'Pedido de adesão', saudacao: 'Chegou um pedido!', linhas: [`<strong>${escape(item.member.nome)}</strong> pediu para ser Membro.`, 'Abra o painel para aprovar, pedir ajustes ou não aprovar, sempre com o motivo.'], botao: { texto: 'Abrir os pedidos', href: `${PAINEL}/aprovacoes` }, semSair: true }) });
        await pausa();
      }
    }
    await pausa();
  }

  // Depois da presença de quem ainda não é Membro: convite à adesão (1ª presença) ou aviso do limite (2ª presença).
  const presencas = await (await banco(`checkins?email_pos_em=is.null&checked_in_at=gte.${desde()}&select=id,member:members!member_id(id,nome,email,adesao_status),edition:editions!edition_id(titulo,elegivel_pre_membro)&limit=30`)).json();
  for (const item of Array.isArray(presencas) ? presencas : []) {
    if (!item.member?.email || item.member.email.endsWith('.test') || !(await reservar('checkins', item.id, 'email_pos_em'))) continue;
    if (item.member.adesao_status || item.edition?.elegivel_pre_membro === false) continue;
    const contagem = await banco('rpc/communicali_presencas_pre_membro', { method: 'POST', body: JSON.stringify({ p_member: item.member.id }) });
    const n = contagem.ok ? Number(await contagem.json()) : 1;
    const r = await enviar(item.member.email, emailFluxo(n >= 2 ? 'limite_atingido' : 'pos_presenca', { nome: item.member.nome, edicao: item.edition?.titulo, n }));
    if (!r.erro && !r.pulado) total.pos_presenca += 1;
    await pausa();
  }

  const respostas = await (await banco(`form_responses?admin_avisado_em=is.null&submitted_at=gte.${desde()}&select=id,answers,respondent_name,respondent_email,form:forms!form_id(title,questions)&limit=20`)).json();
  for (const item of Array.isArray(respostas) ? respostas : []) {
    if (!(await reservar('form_responses', item.id, 'admin_avisado_em'))) continue;
    // Só o aviso: as respostas completas ficam no painel.
    const quem = item.respondent_name || item.respondent_email || 'Alguém';
    for (const email of admins) {
      await enviar(email, { assunto: `Novo preenchimento: ${item.form?.title || 'formulário'}`, html: layoutSimples({ titulo: 'Formulário preenchido', saudacao: 'Mais um preenchimento!', linhas: [`<strong>${escape(quem)}</strong> preencheu o formulário`, `<strong>${escape(item.form?.title || 'um formulário')}</strong>.`, 'As respostas estão no painel.'], botao: { texto: 'Ver no painel', href: `${PAINEL}/formularios` }, semSair: true }) });
      await pausa();
    }
    total.formularios += 1;
  }

  const inscricoes = await (await banco(`registrations?admin_avisado_em=is.null&created_at=gte.${desde()}&select=id,nome,email,whatsapp,cargo,empresa,edition:editions!edition_id(titulo)&limit=20`)).json();
  for (const item of Array.isArray(inscricoes) ? inscricoes : []) {
    if (item.email?.endsWith('.test') || !(await reservar('registrations', item.id, 'admin_avisado_em'))) continue;
    const itens = [['Nome', item.nome], ['E-mail', item.email], ['WhatsApp', item.whatsapp], ['Cargo', item.cargo], ['Empresa', item.empresa]].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    for (const email of admins) {
      await enviar(email, { assunto: `Nova inscrição: ${item.edition?.titulo || 'encontro'}`, html: layoutSimples({ titulo: 'Nova inscrição', saudacao: 'Mais uma pessoa quer vir!', linhas: [`<strong>${escape(item.nome)}</strong> se inscreveu no encontro`, `<strong>${escape(item.edition?.titulo || '')}</strong>`, 'Aprove, coloque em espera ou recuse no painel.'], itens, botao: { texto: 'Abrir Edições', href: `${PAINEL}/edicoes` }, semSair: true }) });
      await pausa();
    }
    total.inscricoes += 1;
  }
  // Cadastro de STAFF: boas-vindas para a pessoa e aviso para a organização (sem CPF, endereço nem Pix no e-mail).
  const staff = await (await banco(`staff?or=(admin_avisado_em.is.null,staff_avisado_em.is.null)&created_at=gte.${desde()}&select=id,nome,email,whatsapp,funcao,valor_combinado,pagamento_combinado,comprovante,assistente_nome,assistente_funcao,quer_ser_acionado,primeira_vez,atualizou_dados,conferir,admin_avisado_em,staff_avisado_em,eventos&limit=20`)).json();
  for (const item of Array.isArray(staff) ? staff : []) {
    if (!item.staff_avisado_em && !item.email?.endsWith('.test') && (await reservar('staff', item.id, 'staff_avisado_em'))) { await enviar(item.email, emailStaff(item)); await pausa(); }
    if (item.admin_avisado_em || !(await reservar('staff', item.id, 'admin_avisado_em'))) continue;
    for (const email of admins) { await enviar(email, emailStaffOrganizacao(item, `${PAINEL}/staff`)); await pausa(); }
    total.staff += 1;
  }

  // Cadastro de fornecedor: sem documento, endereço ou Pix no e-mail; os dados completos ficam no painel.
  const fornecedores = await (await banco(`fornecedores?admin_avisado_em=is.null&created_at=gte.${desde()}&select=id,nome,contato_nome,email,whatsapp,categoria,fornece,primeira_vez,atualizou_dados&limit=20`)).json();
  for (const item of Array.isArray(fornecedores) ? fornecedores : []) {
    if (!(await reservar('fornecedores', item.id, 'admin_avisado_em'))) continue;
    for (const email of admins) { await enviar(email, emailFornecedorOrganizacao(item, `${PAINEL}/fornecedores`)); await pausa(); }
    total.fornecedores += 1;
  }
  res.status(200).json(total);
}
