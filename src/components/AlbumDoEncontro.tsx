/* Álbum da edição, versão real: usa o contrato de `docs/ALBUNS_ENCONTROS.md` (acesso só com o e-mail do check-in, sem código).
   POST /api/edicao?acao=album_previa | album_fotos | album_abrir. O e-mail nunca vai na URL e a lista de check-ins não fica no navegador.
   A ciência do termo é lembrada neste aparelho; o servidor também recebe `ciente: true` ao abrir, para guardar a confirmação. */
import { useEffect, useRef, useState } from 'react';
import { GaleriaDoEncontro, type FotoPrevia } from './GaleriaDoEncontro';
import { AlbumAcessoVisual, type EstadoAlbum, type LinkAlbum } from './AlbumAcessoVisual';

async function api<T>(acao: string, corpo: Record<string, unknown>): Promise<T> {
  const resposta = await fetch(`/api/edicao?acao=${acao}`, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.error || 'Não foi possível abrir as fotos agora.');
  return dados as T;
}

const lembrete = (slug: string) => `album-ciente:${slug}`;
const lerCiencia = (slug: string) => { try { return localStorage.getItem(lembrete(slug)) === '1'; } catch { return false; } };
const guardarCiencia = (slug: string) => { try { localStorage.setItem(lembrete(slug), '1'); } catch { /* sem armazenamento: o termo aparece de novo */ } };

export function AlbumDoEncontro({ slug, titulo, rotulo }: { slug: string; titulo: string; rotulo: string }) {
  const [previa, setPrevia] = useState<FotoPrevia[]>([]);
  const [fotos, setFotos] = useState<FotoPrevia[]>([]);
  const [estado, setEstado] = useState<EstadoAlbum>('entrar');
  const [email, setEmail] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [links, setLinks] = useState<LinkAlbum[]>([]);
  const tentativa = useRef('');

  useEffect(() => {
    let ativo = true;
    api<{ fotos: FotoPrevia[] }>('album_previa', { slug }).then((dados) => { if (ativo) setPrevia(dados.fotos || []); }).catch(() => undefined);
    return () => { ativo = false; };
  }, [slug]);

  const limpo = () => email.trim().toLowerCase();

  async function entrar() {
    setOcupado(true); setMensagem('');
    tentativa.current = crypto.randomUUID();
    try {
      const dados = await api<{ fotos: FotoPrevia[]; album_disponivel: boolean; ciente?: boolean; links?: LinkAlbum[] }>('album_fotos', { slug, email: limpo(), request_id: tentativa.current });
      setFotos(dados.fotos || []); setLinks(dados.links && dados.links.length ? dados.links : [{ id: 'fotos', rotulo: 'Acesse aqui as suas fotos' }]);
      if (!dados.album_disponivel) setEstado('preparando');
      else { if (dados.ciente) guardarCiencia(slug); setEstado(dados.ciente || lerCiencia(slug) ? 'confirmado' : 'termo'); }
    } catch (erro) {
      const texto = erro instanceof Error ? erro.message : '';
      if (/N[ãa]o encontramos/i.test(texto)) setEstado('nao-encontrado');
      else if (/ainda n[ãa]o est[ãa]o dispon/i.test(texto)) setEstado('preparando');
      else setMensagem(texto || 'Não foi possível abrir as fotos agora. Tente novamente em instantes.');
    } finally { setOcupado(false); }
  }

  async function abrir(ciente: boolean, linkId?: string) {
    setOcupado(true); setMensagem('');
    // O álbum abre em outra aba e o site continua aberto. A aba é criada já no clique, para o navegador não bloquear.
    const aba = window.open('', '_blank');
    try {
      const dados = await api<{ url: string }>('album_abrir', { slug, email: limpo(), request_id: crypto.randomUUID(), ciente, link_id: linkId });
      if (ciente) guardarCiencia(slug);
      if (aba) { aba.opener = null; aba.location.href = dados.url; } else window.location.assign(dados.url);
    } catch (erro) { aba?.close(); setMensagem(erro instanceof Error ? erro.message : 'Não foi possível abrir o álbum agora.'); }
    finally { setOcupado(false); }
  }

  const trocar = () => { setEstado('entrar'); setEmail(''); setFotos([]); setMensagem(''); };
  const liberado = fotos.length > 0 && (estado === 'termo' || estado === 'confirmado');

  return (
    <GaleriaDoEncontro fotos={liberado ? fotos : previa} titulo={titulo} rotulo={rotulo} completa={liberado} acesso={
      <AlbumAcessoVisual estado={estado} email={email} setEmail={setEmail} ocupado={ocupado} mensagem={mensagem} aoEntrar={() => void entrar()} aoTrocar={trocar} links={links.length ? links : undefined} aoAbrir={(id) => void abrir(true, id)} aoAceitar={(id) => void abrir(true, id)} />
    } />
  );
}
