// Card "Eu vou!": quem tem presença confirmada no próximo encontro entra com o e-mail (ou o link do e-mail) e recebe
// os dados para montar o card: primeiro nome, foto do formulário de inscrição (link temporário) e a edição.
// Não devolve nada de quem não está confirmado.
import { assinatura, banco, destinatarios, SUPABASE } from './_email.js';

const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const primeiro = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';

async function fotoAssinada(caminho) {
  if (!caminho) return null;
  if (/^https?:\/\//.test(caminho)) return caminho;
  const r = await fetch(`${SUPABASE}/storage/v1/object/sign/cali-forms/${caminho.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 1800 }),
  });
  if (!r.ok) return null;
  const { signedURL } = await r.json();
  return signedURL ? `${SUPABASE}/storage/v1${signedURL}` : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const { email, c, edicao, acao, redes } = req.body || {};
  const filtro = edicao ? `slug=eq.${String(edicao).replace(/[^a-z0-9-]/g, '')}` : `publica=eq.true&data_evento=gte.${hoje()}`;
  const edicoes = await (await banco(`editions?${filtro}&select=id,slug,numero,titulo,data_evento,horario,local,cidade,form_inscricao&order=data_evento&limit=1`)).json();
  const edition = Array.isArray(edicoes) ? edicoes[0] : null;
  if (!edition) return res.status(200).json({ encontrado: false, motivo: 'sem_encontro' });

  // Só quem está confirmado: inscrição aprovada, convidado confirmado, pessoa contatada pelo formulário ou a organização.
  const pessoas = (await destinatarios(edition.id)).filter((item) => item.acionado);
  // A organização (fundadora e organizadores) também vai ao encontro.
  const organizacao = await (await banco('members?categoria=in.(fundadora,organizador)&select=nome,email')).json();
  for (const item of Array.isArray(organizacao) ? organizacao : []) if (!pessoas.some((p) => p.email === item.email.toLowerCase())) pessoas.push({ email: item.email.toLowerCase(), nome: item.nome, acionado: true });
  const alvo = String(email || '').trim().toLowerCase();
  const pessoa = c ? pessoas.find((item) => assinatura(item.email) === String(c)) : pessoas.find((item) => item.email === alvo);
  if (!pessoa) return res.status(200).json({ encontrado: false, motivo: 'nao_confirmado' });

  // Mimo: a pessoa avisa que compartilhou o card marcando a CALI. Uma linha por pessoa e edição.
  if (acao === 'compartilhei') {
    const lista = (Array.isArray(redes) ? redes : []).filter((rede) => ['Instagram', 'LinkedIn'].includes(rede));
    if (!lista.length) return res.status(400).json({ error: 'Marque onde você compartilhou.' });
    const salvo = await banco('compartilhamentos?on_conflict=edition_id,email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ edition_id: edition.id, email: pessoa.email, nome: pessoa.nome, redes: lista }) });
    return salvo.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'Não foi possível anotar agora.' });
  }

  // Foto: a do formulário de inscrição; se não houver, a do passaporte.
  let foto = null;
  if (edition.form_inscricao) {
    const form = (await (await banco(`forms?slug=eq.${encodeURIComponent(edition.form_inscricao)}&select=id`)).json())[0];
    if (form) {
      const respostas = await (await banco(`form_responses?form_id=eq.${form.id}&respondent_email=ilike.${encodeURIComponent(pessoa.email)}&select=answers&order=submitted_at.desc&limit=3`)).json();
      const comFoto = (Array.isArray(respostas) ? respostas : []).find((item) => item.answers?.foto);
      foto = await fotoAssinada(comFoto?.answers?.foto || null);
    }
  }
  if (!foto) {
    const membro = (await (await banco(`members?email=ilike.${encodeURIComponent(pessoa.email)}&select=foto_url`)).json())[0];
    foto = membro?.foto_url || null;
  }

  return res.status(200).json({
    encontrado: true,
    nome: primeiro(pessoa.nome),
    foto,
    edicao: { titulo: edition.titulo, numero: edition.numero, data_evento: edition.data_evento, horario: edition.horario, local: [edition.local, edition.cidade].filter(Boolean).join(', ') },
  });
}
