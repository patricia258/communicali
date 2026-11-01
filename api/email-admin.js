// Ações do painel: resumo dos envios, convite de agenda em lotes e teste para quem está logado. Exige sessão de administrador.
import { EDITION_FIELDS, PUBLIC_KEY, SUPABASE, banco, destinatarios, enviar, enviarUmaVez, montar, pausa } from './_email.js';

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
  const { acao, edicao, publico, tipo, registro, status } = req.body || {};
  const found = await banco(`editions?id=eq.${String(edicao).replace(/[^a-f0-9-]/g, '')}&select=${EDITION_FIELDS}`);
  const edition = found.ok ? (await found.json())[0] : null;
  if (!edition) return res.status(404).json({ error: 'Edição não encontrada.' });

  if (acao === 'teste') {
    const tipos = tipo === 'todos' ? ['recebido', 'confirmacao', 'espera', 'lembrete', 'convite'] : [tipo];
    for (const item of tipos) {
      const result = await enviar(email, montar(item, edition, { nome: 'Patrícia', email }));
      if (result.erro) return res.status(502).json({ error: result.erro });
      await pausa();
    }
    return res.status(200).json({ para: email, enviados: tipos.length });
  }

  if (acao === 'decidir') {
    if (!['inscrito', 'espera', 'cancelado'].includes(status)) return res.status(400).json({ error: 'Situação inválida.' });
    const id = String(registro).replace(/[^a-f0-9-]/g, '');
    const achou = await banco(`registrations?id=eq.${id}&edition_id=eq.${edition.id}&select=id,nome,email,status`);
    const pessoa = achou.ok ? (await achou.json())[0] : null;
    if (!pessoa) return res.status(404).json({ error: 'Inscrição não encontrada.' });
    const mudou = await banco(`registrations?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (!mudou.ok) return res.status(502).json({ error: 'Não foi possível salvar.' });
    if (status === 'cancelado') return res.status(200).json({ email: null });
    return res.status(200).json({ email: await enviarUmaVez(status === 'inscrito' ? 'confirmacao' : 'espera', edition, pessoa) });
  }

  const pessoas = await destinatarios(edition.id);
  const log = await (await banco(`email_log?edition_id=eq.${edition.id}&select=email,tipo,situacao`)).json();
  const enviados = (item) => new Set(log.filter((row) => row.tipo === item && row.situacao === 'enviado').map((row) => row.email));

  if (acao === 'resumo') {
    return res.status(200).json({ todos: pessoas.length, acionados: pessoas.filter((item) => item.acionado).length, confirmacoes: enviados('confirmacao').size, lembretes: enviados('lembrete').size, convites: enviados('convite').size, erros: log.filter((row) => row.situacao === 'erro').length });
  }

  if (acao === 'convite') {
    const ja = enviados('convite');
    const fila = pessoas.filter((item) => (publico === 'todos' || item.acionado) && !ja.has(item.email));
    let erros = 0;
    for (const pessoa of fila.slice(0, LOTE)) {
      if ((await enviarUmaVez('convite', edition, pessoa)) === 'erro') erros += 1;
      await pausa();
    }
    return res.status(200).json({ enviados: Math.min(fila.length, LOTE) - erros, restantes: Math.max(fila.length - LOTE, 0), erros });
  }

  res.status(400).json({ error: 'Ação desconhecida.' });
}
