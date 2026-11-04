// Avisa por e-mail que alguém se conectou. Vale uma vez por conexão, e quem chama precisa ser o autor dela.
import { PUBLIC_KEY, SUPABASE, banco, enviar, escape, layoutSimples } from './_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const authorization = req.headers.authorization || '';
  const user = await fetch(`${SUPABASE}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, Authorization: authorization } });
  if (!user.ok) return res.status(401).end();
  const eu = (await user.json()).email?.toLowerCase();
  const para = String(req.body?.para || '').replace(/[^a-f0-9-]/g, '');
  const autor = await (await banco(`members?email=eq.${encodeURIComponent(eu)}&select=id,nome,apelido`)).json();
  const destino = await (await banco(`members?id=eq.${para}&select=nome,apelido,email`)).json();
  if (!autor[0] || !destino[0]) return res.status(404).end();
  const marcada = await banco(`connections?de=eq.${autor[0].id}&para=eq.${para}&email_enviado=eq.false`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ email_enviado: true }) });
  const linhas = marcada.ok ? await marcada.json() : [];
  if (!linhas.length || destino[0].email.endsWith('.test')) return res.status(200).json({ enviado: false });
  const nome = (autor[0].apelido || autor[0].nome).trim().split(/\s+/)[0];
  const quem = (destino[0].apelido || destino[0].nome).trim().split(/\s+/)[0];
  const result = await enviar(destino[0].email, { assunto: `🤝 ${nome} quer se conectar com você`, html: layoutSimples({ titulo: '🤝 Nova conexão', saudacao: `Oi, ${quem}!`, linhas: [`<strong>${escape(nome)}</strong> quer se conectar com você<br>na ComuniCALI!`, '<strong>Abra seu passaporte</strong> para ver o perfil<br>e se conectar de volta.'], botao: { texto: 'Abrir meu passaporte', href: 'https://comuni.calirh.com/meu-passaporte' } }), ics: null });
  res.status(result.erro ? 502 : 200).json({ enviado: !result.erro });
}
