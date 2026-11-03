// Página de uma edição com prévia própria no WhatsApp, LinkedIn e redes: quem lê o link recebe título, data e foto daquela edição.
const SUPABASE = 'https://cyyrrtekbkltdiatixhp.supabase.co';
const KEY = 'sb_publishable_57ZoSr7YGi1KqVdKmXMUxw_wGS-H19P';

const escape = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const longDate = (iso) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

export default async function handler(req, res) {
  const origin = `https://${req.headers.host}`;
  const slug = String(req.query.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const page = await (await fetch(`${origin}/index.html`)).text();
  const found = await fetch(`${SUPABASE}/rest/v1/editions?slug=eq.${slug}&publica=eq.true&select=titulo,data_evento,horario,local,cidade,capa_url`, { headers: { apikey: KEY } });
  const edition = found.ok ? (await found.json())[0] : null;
  let html = page;
  if (edition) {
    const title = escape(`${edition.titulo} | ComuniCALI`);
    const text = escape(`${longDate(edition.data_evento)}, ${edition.horario}, ${edition.local}, ${edition.cidade}`);
    const image = escape(edition.capa_url ? new URL(edition.capa_url, origin).href : `${origin}/og-comunidade.jpg`);
    html = page
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${text}" />`)
      .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`)
      .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${text}" />`)
      .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${image}" />`)
      .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${origin}/e/${slug}" />`);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  res.status(edition ? 200 : 404).send(html);
}
