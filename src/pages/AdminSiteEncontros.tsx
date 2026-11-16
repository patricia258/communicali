import '../galeria-encontro.css';
import { enviarLoteFotos } from '../lib/imagensUpload';
import { useEnquadramento } from '../components/EditorEnquadramento';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, ArrowDown, ExternalLink, ImagePlus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dataBr, Tabela } from './AdminTabela';

type Encontro = { id: string; slug: string; titulo: string; data_evento: string; publica: boolean };
type Foto = { original_storage_path?: string | null; public_preview: boolean; id: string; storage_path: string; legenda: string; ordem: number; url?: string };
type Stats = { edition_id: string; cliques: number; pessoas: number; visualizacoes?: number };
const urlValida = (value: string) => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && value.length <= 2048; } catch { return false; } };

export function AdminSiteEncontros() {
  const [lista, setLista] = useState<Encontro[]>([]);
  const [stats, setStats] = useState<Stats[]>([]);
  const [statsProntos, setStatsProntos] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [params, setParams] = useSearchParams();
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let ativo = true;
    void Promise.all([supabase.from('editions').select('id,slug,titulo,data_evento,publica').order('data_evento', { ascending: false }), supabase.from('edition_album_stats').select('*')]).then(([edicoes, contagens]) => {
      if (!ativo) return;
      setCarregando(false);
      if (edicoes.error) setErro('Não foi possível carregar os encontros.'); else setLista(edicoes.data || []);
      if (contagens.error) setErro('Os contadores ainda não estão disponíveis. A configuração do álbum precisa estar ativa no banco.'); else { setStats(contagens.data || []); setStatsProntos(true); }
    });
    return () => { ativo = false; };
  }, [refresh]);
  const encontro = lista.find((item) => item.slug === params.get('encontro'));
  const abrir = (slug?: string) => { const proximo = new URLSearchParams(params); if (slug) proximo.set('encontro', slug); else proximo.delete('encontro'); setParams(proximo); };
  if (encontro) return <EditorAlbum key={encontro.id} encontro={encontro} stats={statsProntos ? stats.find((item) => item.edition_id === encontro.id) || { edition_id: encontro.id, cliques: 0, pessoas: 0 } : undefined} atualizar={() => setRefresh((value) => value + 1)} voltar={() => abrir()} />;
  return <>
    <div className="wf-head"><div><small>SITE</small><h1>Encontros e fotos</h1><p>Alimente a página de cada encontro com fotos e o link do álbum. O acesso ao álbum completo confere o e-mail informado na lista de check-in da edição, sem código.</p></div></div>
    {erro && <p className="inline-notice" role="status">{erro}</p>}
    <Tabela colunas={[
      { id: 'titulo', titulo: 'Encontro', valor: (item: Encontro) => item.titulo, render: (item) => <button className="adm-nome" type="button" onClick={() => abrir(item.slug)}>{item.titulo}</button> },
      { id: 'data', titulo: 'Data', valor: (item) => item.data_evento, render: (item) => dataBr(item.data_evento) },
      { id: 'site', titulo: 'No site', valor: (item) => item.publica ? 'Publicado' : 'Fora do site' },
      { id: 'cliques', titulo: 'Cliques no álbum', valor: (item) => stats.find((row) => row.edition_id === item.id)?.cliques ?? 0, render: (item) => statsProntos ? stats.find((row) => row.edition_id === item.id)?.cliques ?? 0 : '—' },
    ]} linhas={lista} chave={(item) => item.id} vazio={carregando ? 'Carregando encontros…' : 'Nenhum encontro cadastrado.'} />
  </>;
}

function EditorAlbum({ encontro, stats, voltar, atualizar }: { encontro: Encontro; stats?: Stats; voltar: () => void; atualizar: () => void }) {
  const arquivo = useRef<HTMLInputElement>(null);
  const { enquadrar, editor } = useEnquadramento();
  const [albumUrl, setAlbumUrl] = useState('');
  const [publicado, setPublicado] = useState(false);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [publicacaoPendente, setPublicacaoPendente] = useState(false);
  const [pronto, setPronto] = useState(false);
  const carregarFotos = async () => {
    const { data, error } = await supabase.from('edition_album_photos').select('id,storage_path,original_storage_path,legenda,ordem,public_preview').eq('edition_id', encontro.id).order('ordem').order('created_at');
    if (error) throw error;
    const rows = (data || []) as Foto[];
    const { data: signed, error: failure } = rows.length ? await supabase.storage.from('edition-albums').createSignedUrls(rows.map((row) => row.storage_path), 300) : { data: [], error: null };
    if (failure) throw failure;
    setFotos(rows.map((row, i) => ({ ...row, url: signed?.[i]?.signedUrl || undefined })));
  };
  useEffect(() => {
    void (async () => {
      try {
        const { data, error } = await supabase.from('edition_albums').select('album_url,publicado').eq('edition_id', encontro.id).maybeSingle();
        if (error) throw error;
        setAlbumUrl(data?.album_url || ''); setPublicado(data?.publicado || false);
        await carregarFotos(); setPronto(true);
      } catch { setAviso('Não foi possível carregar o álbum. Confira se a configuração do banco já foi ativada.'); }
    })();
  }, [encontro.id]);
  async function salvar(exibir = true) {
    if (albumUrl.trim() && !urlValida(albumUrl.trim())) { setAviso('Use um link HTTPS válido para o álbum.'); return; }
    const selecionadas = fotos.filter(f => f.public_preview);
    if (selecionadas.length > 4) { setAviso('Use no máximo quatro fotos na prévia.'); return; }
    if (exibir && !selecionadas.length) { setAviso('Escolha ao menos uma foto para publicar a prévia.'); return; }
    setBusy(true); setAviso('');
    try {
      const resultados = await Promise.all(fotos.map((foto) => supabase.from('edition_album_photos').update({ legenda: foto.legenda, ordem: foto.ordem, public_preview: foto.public_preview }).eq('id', foto.id).eq('edition_id', encontro.id)));
      if (resultados.some((item) => item.error)) throw new Error('fotos');
      const {error} = await supabase.from('edition_albums').upsert({edition_id:encontro.id,album_url:albumUrl.trim()||null,publicado:exibir,updated_at:new Date().toISOString()}); if(error)throw error;
      setPublicado(exibir);
      const resposta = await fetch('/api/edicao?acao=album_previa',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:encontro.slug})});
      const previa = await resposta.json();
      const ids = new Set((previa.fotos || []).map((f: {id:string})=>f.id));
      if (!resposta.ok || (exibir ? selecionadas.some(f=>!ids.has(f.id)) || ids.size!==selecionadas.length : ids.size!==0)) throw new Error('A prévia ainda não foi confirmada no site. Tente publicar novamente.');
      setPublicacaoPendente(false);
      setAviso(exibir ? `Publicado no site: ${selecionadas.length} foto(s).` : 'Fotos ocultadas do site.');
    } catch { setAviso('Não foi possível salvar tudo. Confira os dados e tente novamente.'); }
    finally { setBusy(false); }
  }
  async function enviarFotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    const vagas = 4 - fotos.filter(f=>f.public_preview).length;
    if (files.length > vagas) { setAviso(`A prévia tem quatro posições. Você pode adicionar ${Math.max(0,vagas)} foto(s); para trocar, desmarque ou substitua uma prévia.`); return; }
    if (files.some((file) => !['image/jpeg','image/png','image/webp'].includes(file.type))) { setAviso('Envie imagens JPG, PNG ou WebP.'); return; }
    setBusy(true); setAviso('');
    try {
      const resultado = await enviarLoteFotos(files, async (original, i) => {
        const imagem = await enquadrar(original, {proporcao:fotos.filter(f=>f.public_preview).length+i===3?8/3:4/3,rotulo:`Moldura ${fotos.filter(f=>f.public_preview).length+i+1} da prévia`,fixa:true}); if (!imagem) throw new Error('Envio cancelado.');
        const file = imagem.exibicao;
        const originalExt = ({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' })[original.type] || 'jpg';
        const originalPath = `${encontro.id}/originais/${crypto.randomUUID()}.${originalExt}`;
        const { error: originalError } = await supabase.storage.from('edition-albums').upload(originalPath, original, {contentType:original.type}); if (originalError) throw originalError;
        const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[file.type];
        const path = file === original ? originalPath : `${encontro.id}/${crypto.randomUUID()}.${ext}`;
        if (path !== originalPath) { const { error } = await supabase.storage.from('edition-albums').upload(path, file, { contentType: file.type }); if (error) throw error; }
        const { error: failure } = await supabase.from('edition_album_photos').insert({ edition_id: encontro.id, storage_path: path, original_storage_path: originalPath, legenda: '', public_preview: true, ordem: Math.max(-1, ...fotos.map(foto=>foto.ordem)) + 1 + i });
        if (failure) { await supabase.storage.from('edition-albums').remove([path]); throw failure; }
      });
      setPublicacaoPendente(true);
      setAviso(resultado.falhas.length ? `Não foi possível enviar ${resultado.falhas.length} foto(s). ${resultado.enviados} enviada(s). ${resultado.falhas.join(' · ')}` : `${resultado.enviados} foto(s) enviada(s). Clique em Publicar fotos para mostrar no site.`);
    } catch { setAviso('Não foi possível enviar todas as fotos. As já enviadas aparecem abaixo.'); }
    finally { await carregarFotos().catch(() => setAviso('Não foi possível atualizar as fotos. Reabra o álbum.')); setBusy(false); }
  }
  async function remover(foto: Foto) {
    if (!window.confirm('Retirar esta foto do álbum?')) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('edition_album_photos').delete().eq('id', foto.id).eq('edition_id', encontro.id); if (error) throw error;
      const { error: storageError } = await supabase.storage.from('edition-albums').remove([foto.storage_path]);
      setFotos((rows) => rows.filter((row) => row.id !== foto.id)); setAviso(storageError ? 'Foto retirada da página. O arquivo privado ainda precisa ser removido do armazenamento.' : 'Foto retirada do álbum.');
    } catch { setAviso('Não foi possível retirar a foto.'); }
    finally { setBusy(false); }
  }
  // Deixa leves as cópias de exibição já enviadas (até 2200 px, JPEG). O original nunca é alterado nem apagado.
  async function otimizarEnviadas() {
    setBusy(true); setAviso('');
    let feitas = 0;
    try {
      for (const foto of fotos) {
        const origemPath = foto.storage_path;
        const { data, error } = await supabase.storage.from('edition-albums').download(origemPath); if (error || !data) continue;
        if (data.size <= 1_500_000) continue;
        const bitmap = await createImageBitmap(data);
        const reducao = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
        const tela = document.createElement('canvas'); tela.width = Math.round(bitmap.width * reducao); tela.height = Math.round(bitmap.height * reducao);
        const ctx = tela.getContext('2d'); if (!ctx) throw new Error('canvas'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bitmap, 0, 0, tela.width, tela.height);
        const blob = await new Promise<Blob | null>((r) => tela.toBlob(r, 'image/jpeg', 0.86)); if (!blob) continue;
        const novo = `${encontro.id}/${crypto.randomUUID()}.jpg`;
        const { error: up } = await supabase.storage.from('edition-albums').upload(novo, blob, { contentType: 'image/jpeg' }); if (up) throw up;
        const original = foto.original_storage_path || origemPath;
        const { error: db } = await supabase.from('edition_album_photos').update({ storage_path: novo, original_storage_path: original }).eq('id', foto.id).eq('edition_id', encontro.id);
        if (db) { await supabase.storage.from('edition-albums').remove([novo]); throw db; }
        feitas++;
      }
      await carregarFotos();
      setAviso(feitas ? `${feitas} foto(s) otimizadas. Os originais continuam guardados.` : 'As fotos já estão leves.');
    } catch { setAviso('Não foi possível otimizar todas as fotos. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function reenquadrar(foto: Foto) {
    setBusy(true);setAviso('');
    try {
      const originalPath = foto.original_storage_path || foto.storage_path;
      const { data, error } = await supabase.storage.from('edition-albums').download(originalPath); if (error || !data) throw new Error('Não foi possível carregar o original.');
      const imagem = await enquadrar(new File([data], 'foto-original.'+(data.type==='image/png'?'png':'jpg'), {type:data.type}), {proporcao:previas.indexOf(foto)===3?8/3:4/3,rotulo:previas.indexOf(foto)>=0?`Moldura ${previas.indexOf(foto)+1} da prévia`:'Moldura da galeria',fixa:true}); if (!imagem) return;
      let path=originalPath;
      if (imagem.exibicao !== imagem.original) {
        path=`${encontro.id}/enquadradas/${crypto.randomUUID()}.png`;
        const {error:falha}=await supabase.storage.from('edition-albums').upload(path,imagem.exibicao,{contentType:imagem.exibicao.type});if(falha)throw falha;
      }
      const {error:falha}=await supabase.from('edition_album_photos').update({storage_path:path,original_storage_path:originalPath}).eq('id',foto.id).eq('edition_id',encontro.id);if(falha)throw falha;
      await carregarFotos();setAviso('Enquadramento salvo. O arquivo original foi preservado.');
    } catch {setAviso('Não foi possível salvar o enquadramento. Tente novamente.');}
    finally {setBusy(false);}
  }
  function moverFoto(indice: number, direcao: number) {
    setFotos(rows => { const proximo=[...rows];const destino=indice+direcao;if(destino<0||destino>=rows.length)return rows;[proximo[indice],proximo[destino]]=[proximo[destino],proximo[indice]];return proximo.map((foto,ordem)=>({...foto,ordem})); });
    setPublicacaoPendente(true);setAviso('Ordem alterada. Clique em Publicar fotos.');
  }
  const previas = fotos.filter(foto=>foto.public_preview);
  return <>
    {editor}
    <button type="button" className="v2-forms-back" onClick={voltar}>Voltar para encontros</button>
    <div className="wf-head"><div><small>SITE · ENCONTROS E FOTOS</small><h1>{encontro.titulo}</h1><p>{dataBr(encontro.data_evento)} · Escolha as prévias públicas e organize o álbum de quem fez check-in.</p></div><div className="v2-head-actions"><button type="button" className="wf-primary" disabled={busy || !pronto} onClick={() => void salvar()}><Save size={15} />{busy ? 'Aguarde…' : 'Publicar fotos'}</button></div></div>
    <div className="adm-album-numeros"><div><strong>{stats?.cliques ?? '—'}</strong><span>Cliques em abrir álbum</span></div><div><strong>{stats?.pessoas ?? '—'}</strong><span>E-mails que abriram</span></div><div><strong>{fotos.length}</strong><span>Fotos na página</span></div></div>
    <button className="wf-secondary adm-album-atualizar" type="button" onClick={atualizar}>Atualizar contagem</button>
    <section className="v2-forms-card"><header><small>ÁLBUM DO ENCONTRO</small><h2>Fotos e link para baixar</h2></header>
      <div className="v2-forms-grid"><label className="wide"><span>Link do álbum completo</span><input type="url" placeholder="https://…" disabled={!pronto || busy} value={albumUrl} onChange={(event) => setAlbumUrl(event.target.value)} /></label>
      </div>
      <p className="adm-hint">{publicacaoPendente ? 'Há alterações para publicar.' : publicado ? 'Prévia publicada no site.' : 'Prévia ainda não publicada.'} O álbum completo abre pelo e-mail do check-in.</p>{publicado && <button type="button" className="wf-secondary" disabled={busy} onClick={() => void salvar(false)}>Ocultar fotos do site</button>}
      <div className="adm-links"><a className="wf-secondary" href={`/e/${encontro.slug}#fotos`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Ver página do encontro</a><a className="wf-secondary" href={`/admin/edicoes?abrir=${encontro.slug}&secao=site`}>Editar capa e imagens públicas</a></div>
    </section>
    <section className="v2-forms-card"><header><h2>Fotos do encontro</h2></header>
      <button type="button" className="wf-secondary" disabled={busy || !pronto} onClick={() => arquivo.current?.click()}><ImagePlus size={15} />Enviar fotos</button><button type="button" className="wf-secondary" disabled={busy || !pronto || !fotos.length} onClick={() => void otimizarEnviadas()} title="Deixa as fotos já enviadas mais leves para carregarem rápido. Os originais não mudam.">Deixar as fotos leves</button><input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy || !pronto} onChange={(event) => void enviarFotos(event)} />
      <p className="adm-hint">{previas.length} de 4 posições preenchidas.</p><div className="gal__grade adm-album-molduras">{Array.from({length:4},(_,i)=><figure key={i} className={`gal__item gal__item--${i+1}`}>{previas[i]?.url && <img src={previas[i].url} alt={`Prévia ${i+1}`} />}<div className="adm-album-moldura-acoes"><strong>Moldura {i+1}</strong>{previas[i] ? <button type="button" className="wf-secondary" disabled={busy} onClick={()=>void reenquadrar(previas[i])}>Enquadrar</button> : <button type="button" className="wf-secondary" disabled={busy || !pronto} onClick={()=>arquivo.current?.click()}>Escolher foto</button>}</div></figure>)}</div><details className="adm-ajuda"><summary>Como organizar as fotos</summary><p>As quatro primeiras fotos marcadas como públicas formam a prévia. Use as setas para ordenar e Enquadrar para ajustar cada moldura. Depois clique em Publicar fotos. As demais ficam disponíveis após conferir o e-mail do check-in.</p><p>JPG, PNG ou WebP, até 50 MB. O original é preservado. Publique imagens autorizadas.</p></details>
      <div className="adm-album-fotos">{fotos.map((foto, indice) => <figure key={foto.id}><small className="adm-album-posicao">{!foto.public_preview ? 'Após o check-in' : previas.indexOf(foto)<4 ? `Prévia ${previas.indexOf(foto)+1} · ${previas.indexOf(foto)===0?'imagem principal':'imagem de apoio'}` : 'Além das quatro prévias visíveis'}</small>{foto.url && <img src={foto.url} alt={foto.legenda || 'Foto do encontro'} />}<label><span>Descrição da foto</span><input disabled={busy} value={foto.legenda} onChange={(event) => setFotos((rows) => rows.map((row) => row.id === foto.id ? { ...row, legenda: event.target.value } : row))} /></label><label className="adm-foto-publica"><input type="checkbox" disabled={busy || (!foto.public_preview && previas.length >= 4)} checked={foto.public_preview} onChange={(e) => { if(e.target.checked && previas.length>=4){setAviso('Use no máximo quatro prévias.');return;}setPublicacaoPendente(true);setFotos((rows) => rows.map((row) => row.id === foto.id ? { ...row, public_preview: e.target.checked } : row)); }} /><span>Usar na prévia do site</span></label><div className="adm-album-foto-acoes"><button type="button" className="wf-secondary" disabled={busy} onClick={() => void reenquadrar(foto)}>Enquadrar</button><button className="wf-secondary" type="button" aria-label={`Mover foto ${indice+1} para cima`} disabled={busy||indice===0} onClick={()=>moverFoto(indice,-1)}><ArrowUp size={14}/></button><button className="wf-secondary" type="button" aria-label={`Mover foto ${indice+1} para baixo`} disabled={busy||indice===fotos.length-1} onClick={()=>moverFoto(indice,1)}><ArrowDown size={14}/></button><button className="wf-secondary" type="button" disabled={busy} onClick={() => void remover(foto)}><Trash2 size={14} />Retirar foto</button></div></figure>)}</div>
      {pronto && !fotos.length && <p className="adm-hint">Nenhuma foto enviada para este álbum.</p>}
    </section>
    <HistoricoAlbum edicaoId={encontro.id} />
    <details className="adm-ajuda"><summary>Sobre a contagem de acessos</summary><p>Os números registram o e-mail informado e a abertura do link, sem comprovar identidade ou download. As permissões da pasta externa continuam valendo.</p></details>
    {aviso && <p className={/^(Não|Use |Envie |Escolha |A prévia)/.test(aviso) ? "v2-forms-error" : "v2-forms-ok"} role="status">{aviso}</p>}
  </>;
}

function HistoricoAlbum({ edicaoId }: { edicaoId: string }) {
  const [dados, setDados] = useState<Array<{ email_informado: string; galeria: number; album: number; ultimo_acesso: string; ciente_em: string | null }>>([]);
  const [erro, setErro] = useState('');
  const [liberados, setLiberados] = useState<number | null>(null);
  useEffect(() => { void supabase.from('checkins').select('id', {count:'exact',head:true}).eq('edition_id',edicaoId).then(({count,error}) => { if (!error) setLiberados(count || 0); }); }, [edicaoId]);
  const carregar = () => { void supabase.from('edition_album_email_stats').select('email_informado,galeria,album,ultimo_acesso,ciente_em').eq('edition_id', edicaoId).order('ultimo_acesso', { ascending: false }).then(({ data, error }) => { if (error) setErro('Não foi possível carregar os acessos.'); else { setDados(data || []); setErro(''); } }); };
  useEffect(carregar, [edicaoId]);
  return <section className="v2-forms-card"><header><h2>Histórico de acessos ao álbum</h2></header><p className="adm-hint">{liberados === null ? 'A liberação é automática pelo check-in do evento.' : `${liberados} participante(s) com acesso liberado automaticamente pelo check-in.`}</p><button type="button" className="wf-secondary" onClick={carregar}>Atualizar acessos</button>{erro && <p role="status">{erro}</p>}<Tabela colunas={[
    {id:'email',titulo:'E-mail',valor:(r)=>r.email_informado,render:(r)=><>{r.email_informado}<small className="adm-custo-pendente">{r.ciente_em?`Confirmou o termo em ${new Date(r.ciente_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · Brasília`:'Ciência do termo não registrada'}</small></>}, {id:'galeria',titulo:'Aberturas da galeria',valor:(r)=>r.galeria}, {id:'album',titulo:'Cliques no álbum',valor:(r)=>r.album}, {id:'ultimo',titulo:'Último acesso',valor:(r)=>r.ultimo_acesso,render:(r)=>new Date(r.ultimo_acesso).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})},
  ]} linhas={dados} chave={(r)=>r.email_informado} vazio="Ninguém acessou o álbum ainda." /></section>;
}
