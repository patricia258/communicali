// Acesso privado ao álbum. Reutiliza /api/edicao para manter o limite de funções da Vercel.
import { createClient } from '@supabase/supabase-js';
import { banco, SUPABASE } from './_email.js';

export const albumUrlValida = (value) => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && value.length <= 2048; } catch { return false; }
};
const json = async (response) => { if (!response.ok) throw new Error('banco'); return response.json(); };

export function criarAlbumHandler({ db = banco, signPhotos = async (paths) => {
  const client = createClient(SUPABASE, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.storage.from('edition-albums').createSignedUrls(paths, 300);
  if (error) throw error;
  return data;
} } = {}) {
  return async function albumHandler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    const action = req.query?.acao;
    const slug = String(req.body?.slug || '');
    if (!/^[a-z0-9-]{1,100}$/.test(slug) || !['album_previa','album_fotos','album_abrir'].includes(action)) return res.status(400).json({ error: 'Encontro inválido.' });
    try {
      if (action === 'album_previa') {
        const editions = await json(await db(`editions?slug=eq.${encodeURIComponent(slug)}&publica=eq.true&select=id`));
        if (!editions.length) return res.status(404).json({ error: 'Encontro indisponível.' });
        const published = await json(await db(`edition_albums?edition_id=eq.${editions[0].id}&publicado=eq.true&select=edition_id`));
        if (!published.length) return res.status(200).json({ fotos: [] });
        const photos = await json(await db(`edition_album_photos?edition_id=eq.${editions[0].id}&public_preview=eq.true&select=id,storage_path,legenda&order=ordem,created_at&limit=4`));
        const signed = photos.length ? await signPhotos(photos.map((photo) => photo.storage_path)) : [];
        if (signed.some((photo) => photo.error || !photo.signedUrl)) throw new Error('foto');
        return res.status(200).json({ fotos: photos.map((photo,i) => ({ id: photo.id, legenda: photo.legenda, url: signed[i].signedUrl })) });
      }
      // Acesso simplificado por e-mail informado, a pedido da organização. Não comprova titularidade.
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!/^[^\s@,()]{1,150}@[^\s@,()]{1,100}\.[^\s@,()]{2,30}$/.test(email)) return res.status(400).json({ error: 'Confira o e-mail informado.' });
      const requestId = req.body?.request_id;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId || '')) return res.status(400).json({ error: 'Tente abrir o álbum novamente.' });
      const presence = await json(await db('rpc/communicali_album_presenca', { method: 'POST', body: JSON.stringify({ p_slug: slug, p_email: email }) }));
      if (!presence?.edition_id || !presence.member_id) return res.status(403).json({ error: 'Não encontramos acesso às fotos para este e-mail neste encontro.' });
      const albums = await json(await db(`edition_albums?edition_id=eq.${encodeURIComponent(presence.edition_id)}&publicado=eq.true&select=album_url,links`));
      if (!albums.length) return res.status(404).json({ error: 'As fotos ainda não estão disponíveis.' });
      // Vários botões por álbum (fotos, vídeos...). Álbuns antigos só têm album_url: viram um botão "Acesse aqui as suas fotos".
      const links = (Array.isArray(albums[0].links) && albums[0].links.length ? albums[0].links : (albums[0].album_url ? [{ id: 'fotos', rotulo: 'Acesse aqui as suas fotos', url: albums[0].album_url }] : []));
      const pedido = String(req.body?.link_id || '');
      const escolhido = links.find((item) => item.id === pedido) || (pedido ? null : links[0]);
      const registrar = async () => json(await dbResponse());
      async function dbResponse() { return db('edition_album_clicks?on_conflict=request_id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ request_id: requestId, edition_id: presence.edition_id, member_id: presence.member_id, email_informado: email, tipo: action === 'album_fotos' ? 'galeria' : 'album', link_id: action === 'album_abrir' && escolhido ? escolhido.id : null, ciente_em: action === 'album_abrir' && req.body?.ciente === true ? new Date().toISOString() : null }) }); }
      if (action === 'album_fotos') {
        const photos = await json(await db(`edition_album_photos?edition_id=eq.${encodeURIComponent(presence.edition_id)}&select=id,storage_path,legenda&order=ordem,created_at`));
        const signed = photos.length ? await signPhotos(photos.map((photo) => photo.storage_path)) : [];
        if (signed.some((photo) => photo.error || !photo.signedUrl)) throw new Error('foto');
        await registrar();
        return res.status(200).json({ fotos: photos.map((photo, i) => ({ id: photo.id, legenda: photo.legenda, url: signed[i].signedUrl })), album_disponivel: links.length > 0, links: links.map((item) => ({ id: item.id, rotulo: item.rotulo })) });
      }
      const url = escolhido?.url;
      if (!albumUrlValida(url)) return res.status(404).json({ error: 'O álbum completo ainda não está disponível.' });
      await registrar();
      return res.status(200).json({ url });
    } catch { return res.status(503).json({ error: 'Não foi possível abrir as fotos agora. Tente novamente em instantes.' }); }
  };
}
export const albumHandler = criarAlbumHandler();
