// Ações do painel: resumo dos envios, boas-vindas em lotes e teste para quem está logado. Exige sessão de administrador.
import { EDITION_FIELDS, PUBLIC_KEY, SUPABASE, banco, destinatarios, enviar, enviarUmaVez, layoutSimples, montar, pausa, escape } from './_email.js';

const LOTE = 25;

async function administrador(req) {
  const authorization = req.headers.authorization || '';
  const user = await fetch(`${SUPABASE}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, Authorization: authorization } });
  if (!user.ok) return null;
  const admin = await fetch(`${SUPABASE}/rest/v1/rpc/is_admin`, { method: 'POST', headers: { apikey: PUBLIC_KEY, Authorization: authorization, 'Content-Type': 'application/json' }, body: '{}' });
  return admin.ok && (await admin.json()) === true ? (await user.json()).email : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const email = await administrador(req);
  if (!email) return res.status(401).json({ error: 'Entre novamente no painel.' });
  const { acao, edicao, publico, tipo, registro, status, match } = req.body || {};

  // Todos os e-mails recentes que não chegaram (staff, avisos, edição): lista da própria Resend.
  if (acao === 'nao_entregues') {
    const r = await fetch('https://api.resend.com/emails?limit=100', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
    if (!r.ok) return res.status(502).json({ error: 'Não foi possível ler a Resend agora.' });
    const lista = (await r.json()).data || [];
    const ok = ['delivered', 'opened', 'clicked'];
    return res.status(200).json({ total: lista.length, entregues: lista.filter((item) => ok.includes(item.last_event)).length,
      problemas: lista.filter((item) => !ok.includes(item.last_event)).map((item) => ({ para: (item.to || []).join(', '), assunto: item.subject, situacao: item.last_event, em: item.created_at })) });
  }

  if (acao === 'match') {
    if (!['liberado', 'recusado'].includes(status)) return res.status(400).json({ error: 'Situação inválida.' });
    const id = String(match).replace(/[^a-f0-9-]/g, '');
    const achou = await banco(`matches?id=eq.${id}&select=a,b,motivo`);
    const par = achou.ok ? (await achou.json())[0] : null;
    if (!par) return res.status(404).json({ error: 'Match não encontrado.' });
    await banco(`matches?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status, decidido_em: new Date().toISOString() }) });
    if (status === 'liberado') {
      const pessoas = await (await banco(`members?id=in.(${par.a},${par.b})&select=id,nome,apelido,email`)).json();
      for (const pessoa of pessoas) {
        const outra = pessoas.find((item) => item.id !== pessoa.id);
        const nome = (outra.apelido || outra.nome).trim().split(/\s+/)[0];
        await banco('notifications', { method: 'POST', body: JSON.stringify({ member_id: pessoa.id, tipo: 'match', texto: `Temos uma sugestão de conexão: ${nome}.`, de: outra.id }) });
        if (!pessoa.email.endsWith('.test')) {
          await enviar(pessoa.email, { assunto: `Sugestão de conexão: ${nome}`, html: layoutSimples({ titulo: 'Sugestão de conexão', saudacao: `Oi, ${(pessoa.apelido || pessoa.nome).trim().split(/\s+/)[0]}!`, linhas: [`Achamos que vale você conhecer<br><strong>${escape(nome)}</strong>!`, 'O ponto em comum é:', `<strong>${escape(par.motivo)}</strong>`, 'Abra seu passaporte para ver o perfil<br>e trocar figurinhas!'], botao: { texto: 'Ver sugestão', href: 'https://comuni.calirh.com/meu-passaporte' } }), ics: null });
          await pausa();
        }
      }
    }
    return res.status(200).json({ ok: true });
  }

  const found = await banco(`editions?id=eq.${String(edicao).replace(/[^a-f0-9-]/g, '')}&select=${EDITION_FIELDS}`);
  const edition = found.ok ? (await found.json())[0] : null;
  if (!edition) return res.status(404).json({ error: 'Edição não encontrada.' });

  if (acao === 'teste') {
    const tipos = tipo === 'todos' ? ['recebido', 'confirmacao', 'espera', 'lembrete', 'boasvindas', 'agradecimento', 'card'] : [tipo];
    for (const item of tipos) {
      // No teste, o botão do card abre o card da própria fundadora (contato@calirh.com), para dar para conferir.
      const result = await enviar(email, montar(item, edition, { nome: 'Patrícia', email, cardEmail: 'contato@calirh.com' }));
      if (result.erro) return res.status(502).json({ error: result.erro });
      await pausa();
    }
    // Um exemplo de aviso do espaço do membro, com o link de parar de receber.
    const exemplo = await enviar(email, { assunto: '[Teste] Ana quer se conectar com você', html: layoutSimples({ titulo: 'Nova conexão', saudacao: 'Oi, Patrícia!', linhas: ['<strong>Ana</strong> quer se conectar com você<br>na ComuniCALI!', '<strong>Abra seu passaporte</strong> para ver o perfil<br>e se conectar de volta.'], botao: { texto: 'Abrir meu passaporte', href: 'https://comuni.calirh.com/meu-passaporte' } }) });
    if (exemplo.erro) return res.status(502).json({ error: exemplo.erro });
    return res.status(200).json({ para: email, enviados: tipos.length + (exemplo.pulado ? 0 : 1) });
  }

  if (acao === 'teste_card') {
    // Teste só para endereços da própria organização.
    const para = ['pclazumi@gmail.com', 'patricia@calirh.com', 'contato@calirh.com'].includes(String(req.body?.para || '')) ? req.body.para : email;
    const result = await enviar(para, montar('card', edition, { nome: 'Patrícia', email: para, cardEmail: 'contato@calirh.com' }));
    if (result.erro) return res.status(502).json({ error: result.erro });
    return res.status(200).json({ para, enviados: 1 });
  }

  if (acao === 'decidir') {
    if (!['inscrito', 'espera', 'cancelado'].includes(status)) return res.status(400).json({ error: 'Situação inválida.' });
    const id = String(registro).replace(/[^a-f0-9-]/g, '');
    const achou = await banco(`registrations?id=eq.${id}&edition_id=eq.${edition.id}&select=id,nome,email,status,indicado_por`);
    const pessoa = achou.ok ? (await achou.json())[0] : null;
    if (!pessoa) return res.status(404).json({ error: 'Inscrição não encontrada.' });
    const mudou = await banco(`registrations?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (!mudou.ok) return res.status(502).json({ error: 'Não foi possível salvar.' });
    if (status === 'cancelado') return res.status(200).json({ email: null });
    const situacao = await enviarUmaVez(status === 'inscrito' ? 'confirmacao' : 'espera', edition, pessoa);
    if (status === 'inscrito' && pessoa.indicado_por) {
      const quem = (await (await banco(`members?id=eq.${pessoa.indicado_por}&select=nome,apelido,email`)).json())[0];
      if (quem && !quem.email.endsWith('.test')) {
        const convidada = pessoa.nome.trim().split(/\s+/)[0];
        await enviar(quem.email, { assunto: `${convidada} foi confirmada no encontro`, html: layoutSimples({ titulo: 'Indicação aprovada', saudacao: `Oi, ${(quem.apelido || quem.nome).trim().split(/\s+/)[0]}!`, linhas: [`<strong>${escape(pessoa.nome)}</strong> está confirmada no encontro`, `<strong>${escape(edition.titulo)}</strong>`, 'Como vem pela sua indicação,<br>contamos com você para:'], itens: ['Receber a pessoa na chegada', 'Não deixar a pessoa sozinha', 'Apresentar a comunidade e outras pessoas', 'Mostrar como funciona o check-in'], botao: { texto: 'Ver minhas indicações', href: 'https://comuni.calirh.com/meu-passaporte' } }), ics: null });
      }
    }
    return res.status(200).json({ email: situacao });
  }

  // E-mail corrigido: apaga do registro os envios que voltaram para o endereço antigo (o novo recebe de novo pelo 'confirmados').
  if (acao === 'limpar_falhas') {
    const antigo = String(req.body?.email || '').trim().toLowerCase();
    if (!antigo.includes('@')) return res.status(400).json({ error: 'Informe o e-mail.' });
    await banco(`email_log?edition_id=eq.${edition.id}&email=eq.${encodeURIComponent(antigo)}&entrega=in.(bounced,suppressed,failed)`, { method: 'DELETE' });
    return res.status(200).json({ ok: true });
  }

  const pessoas = await destinatarios(edition.id);
  const log = await (await banco(`email_log?edition_id=eq.${edition.id}&select=email,tipo,situacao,created_at,aberto_em,clicado_em,entrega`)).json();
  const enviados = (item) => new Set(log.filter((row) => row.tipo === item && row.situacao === 'enviado').map((row) => row.email));

  if (acao === 'resumo') {
    return res.status(200).json({ todos: pessoas.length, acionados: pessoas.filter((item) => item.acionado).length, confirmacoes: enviados('confirmacao').size, lembretes: enviados('lembrete').size, convites: enviados('boasvindas').size, cards: enviados('card').size, agradecimentos: enviados('agradecimento').size, erros: log.filter((row) => row.situacao === 'erro').length });
  }

  if (acao === 'acompanhar') {
    const nomes = new Map(pessoas.map((item) => [item.email, item.nome]));
    return res.status(200).json({ linhas: log.filter((row) => row.situacao !== 'reservado').map((row) => ({ ...row, nome: nomes.get(row.email) || '' })) });
  }

  // Situação de entrega na Resend (entregue, devolvido, marcado como spam...). Lê 15 por vez; o painel repete até acabar.
  if (acao === 'entregas') {
    const FINAIS = ['delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'suppressed'];
    const linhas = await (await banco(`email_log?edition_id=eq.${edition.id}&resend_id=not.is.null&or=(entrega.is.null,entrega.not.in.(${FINAIS.join(',')}))&select=id,resend_id&order=created_at&limit=15`)).json();
    let lidos = 0;
    for (const linha of Array.isArray(linhas) ? linhas : []) {
      const r = await fetch(`https://api.resend.com/emails/${linha.resend_id}`, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
      if (!r.ok) break;
      const dados = await r.json();
      await banco(`email_log?id=eq.${linha.id}`, { method: 'PATCH', body: JSON.stringify({ entrega: dados.last_event || 'sent', entrega_em: new Date().toISOString() }) });
      lidos += 1;
      await new Promise((resolve) => setTimeout(resolve, 550));
    }
    const resto = await (await banco(`email_log?edition_id=eq.${edition.id}&resend_id=not.is.null&or=(entrega.is.null,entrega.not.in.(${FINAIS.join(',')}))&select=id`)).json();
    return res.status(200).json({ lidos, faltam: Array.isArray(resto) ? resto.length : 0 });
  }

  // Quem acabou de ser marcado Confirmado no painel: boas-vindas e card Eu vou!, uma vez só por pessoa.
  // O servidor confere na lista que a pessoa está mesmo confirmada.
  if (acao === 'confirmados') {
    const pedidos = new Set(String(req.body?.emails || '').toLowerCase().split(',').map((item) => item.trim()).filter(Boolean));
    const fila = pessoas.filter((item) => item.acionado && pedidos.has(item.email)).slice(0, LOTE);
    let enviadosAgora = 0; let erros = 0;
    for (const pessoa of fila) {
      for (const modelo of ['boasvindas', 'card']) {
        const situacao = await enviarUmaVez(modelo, edition, pessoa);
        if (situacao === 'erro') erros += 1; else if (situacao === 'enviado') { enviadosAgora += 1; await pausa(); }
      }
    }
    return res.status(200).json({ pessoas: fila.length, enviados: enviadosAgora, erros });
  }

  if (acao === 'convite') {
    const modelo = tipo === 'agradecimento' || tipo === 'card' ? tipo : 'boasvindas';
    const ja = enviados(modelo);
    const fila = pessoas.filter((item) => (publico === 'todos' || (publico === 'sem_contato' ? !item.acionado : item.acionado)) && !ja.has(item.email));
    // Conta só o que saiu de verdade (antes, uma falha ao registrar aparecia como enviado).
    let erros = 0; let enviadosAgora = 0;
    for (const pessoa of fila.slice(0, LOTE)) {
      const situacao = await enviarUmaVez(modelo, edition, pessoa);
      if (situacao === 'erro') erros += 1; else if (situacao === 'enviado') enviadosAgora += 1;
      await pausa();
    }
    return res.status(200).json({ enviados: enviadosAgora, restantes: Math.max(fila.length - LOTE, 0), erros });
  }

  res.status(400).json({ error: 'Ação desconhecida.' });
}
