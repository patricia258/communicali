/* Apresentação do encontro: slides exportados do Canva (PDF ou imagens) e as enquetes que entram entre eles.
   O modo apresentação (/apresentacao?id=) passa slide a slide e abre cada enquete com QR Code e gráfico ao vivo. */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Plus, Presentation, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../lib';

export type Pausa = { depois: number; poll_id: string };
export type ApresentacaoDados = { id: string; edition_id: string | null; titulo: string; slides: string[]; pausas: Pausa[]; poll_atual: string | null };
type Edicao = { id: string; titulo: string; data_evento: string };
type Enquete = { id: string; slug: string; titulo: string; pergunta: string; tipo: string; status: string; edition_id: string | null };

// Canva exporta "1.png, 2.png, ... 10.png": ordena pelo número, não pela letra.
const ordemNatural = (a: File, b: File) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true });

/** Transforma cada página do PDF em JPEG de 1920 px de largura, no próprio navegador. */
async function paginasDoPdf(arquivo: File, progresso: (texto: string) => void) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
  const imagens: Blob[] = [];
  for (let numero = 1; numero <= pdf.numPages; numero += 1) {
    progresso(`Preparando slide ${numero} de ${pdf.numPages}…`);
    const pagina = await pdf.getPage(numero);
    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: 1920 / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
    // intent 'print' desenha de uma vez, sem depender da aba estar visível.
    await pagina.render({ canvasContext: canvas.getContext('2d')!, viewport, intent: 'print' }).promise;
    imagens.push(await new Promise<Blob>((ok) => canvas.toBlob((blob) => ok(blob!), 'image/jpeg', 0.9)));
  }
  return imagens;
}

export function ApresentacaoPanel() {
  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [edicao, setEdicao] = useState('');
  const [enquetes, setEnquetes] = useState<Enquete[]>([]);
  const [dados, setDados] = useState<ApresentacaoDados | null>(null);
  const [status, setStatus] = useState('');
  const [erro, setErro] = useState('');
  const [escolhendo, setEscolhendo] = useState<number | null>(null);

  useEffect(() => {
    void supabase.from('editions').select('id,titulo,data_evento').order('data_evento', { ascending: false }).then(({ data }) => {
      const lista = (data || []) as Edicao[];
      setEdicoes(lista);
      const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      const proxima = [...lista].reverse().find((item) => item.data_evento >= hoje && item.titulo !== 'Edição de teste');
      setEdicao(proxima?.id || lista[0]?.id || '');
    });
    void supabase.from('polls').select('id,slug,titulo,pergunta,tipo,status,edition_id').order('created_at').then(({ data }) => setEnquetes((data || []) as Enquete[]));
  }, []);

  useEffect(() => {
    if (!edicao) return;
    setDados(null);
    void supabase.from('apresentacoes').select('*').eq('edition_id', edicao).order('created_at').limit(1).maybeSingle().then(async ({ data }) => {
      if (data) { setDados(data as ApresentacaoDados); return; }
      const titulo = edicoes.find((item) => item.id === edicao)?.titulo || 'Apresentação';
      const criada = await supabase.from('apresentacoes').insert({ edition_id: edicao, titulo }).select('*').single();
      if (criada.data) setDados(criada.data as ApresentacaoDados); else setErro('Não foi possível preparar a apresentação.');
    });
  }, [edicao, edicoes]);

  async function salvar(mudanca: Partial<ApresentacaoDados>) {
    if (!dados) return;
    const { data, error } = await supabase.from('apresentacoes').update({ ...mudanca, updated_at: new Date().toISOString() }).eq('id', dados.id).select('*').single();
    if (error || !data) { setErro('Não foi possível salvar.'); return; }
    setDados(data as ApresentacaoDados);
  }

  async function enviar(event: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(event.target.files || [])];
    event.target.value = '';
    if (!dados || !arquivos.length) return;
    setErro('');
    try {
      const pdf = arquivos.find((item) => item.type === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf'));
      const imagens: Blob[] = pdf ? await paginasDoPdf(pdf, setStatus) : arquivos.filter((item) => item.type.startsWith('image/')).sort(ordemNatural);
      if (!imagens.length) { setErro('Escolha o PDF ou as imagens dos slides.'); setStatus(''); return; }
      const versao = Date.now();
      const urls: string[] = [];
      for (const [indice, imagem] of imagens.entries()) {
        setStatus(`Enviando slide ${indice + 1} de ${imagens.length}…`);
        const tipo = imagem.type === 'image/png' ? 'png' : 'jpg';
        const caminho = `apresentacoes/${dados.id}/${versao}-${String(indice + 1).padStart(3, '0')}.${tipo}`;
        const { error } = await supabase.storage.from('site').upload(caminho, imagem, { contentType: imagem.type || 'image/jpeg', upsert: true });
        if (error) throw error;
        urls.push(supabase.storage.from('site').getPublicUrl(caminho).data.publicUrl);
      }
      // Ao trocar os slides, as enquetes continuam no mesmo ponto; as que passaram do fim vão para o último slide.
      const pausas = dados.pausas.map((item) => ({ ...item, depois: Math.min(item.depois, urls.length) }));
      await salvar({ slides: urls, pausas });
      setStatus(`${urls.length} slides prontos.`);
    } catch {
      setErro('Não foi possível enviar os slides. Tente de novo.'); setStatus('');
    }
  }

  const porSlide = useMemo(() => {
    const mapa = new Map<number, Pausa[]>();
    for (const pausa of dados?.pausas || []) mapa.set(pausa.depois, [...(mapa.get(pausa.depois) || []), pausa]);
    return mapa;
  }, [dados]);
  const enqueteDe = (id: string) => enquetes.find((item) => item.id === id);
  const daEdicao = enquetes.filter((item) => !item.edition_id || item.edition_id === edicao);

  function inserir(depois: number, poll_id: string) {
    if (!dados) return;
    setEscolhendo(null);
    void salvar({ pausas: [...dados.pausas, { depois, poll_id }].sort((a, b) => a.depois - b.depois) });
  }
  function remover(alvo: Pausa) {
    if (!dados) return;
    void salvar({ pausas: dados.pausas.filter((item) => !(item.depois === alvo.depois && item.poll_id === alvo.poll_id)) });
  }

  const Inserir = ({ depois }: { depois: number }) => (
    <div className="apr-pausas">
      {(porSlide.get(depois) || []).map((pausa) => { const enquete = enqueteDe(pausa.poll_id); return (
        <div className="apr-enquete" key={`${pausa.depois}-${pausa.poll_id}`}><small>ENQUETE AO VIVO</small><strong>{enquete?.pergunta || 'Enquete removida'}</strong><button type="button" aria-label="Tirar esta enquete" onClick={() => remover(pausa)}><X size={14} /></button></div>
      ); })}
      {escolhendo === depois
        ? <select autoFocus className="apr-escolha" defaultValue="" onBlur={() => setEscolhendo(null)} onChange={(event) => event.target.value && inserir(depois, event.target.value)}>
            <option value="" disabled>Escolha a enquete</option>
            {daEdicao.map((item) => <option key={item.id} value={item.id}>{item.titulo}: {item.pergunta}</option>)}
          </select>
        : <button type="button" className="apr-mais" onClick={() => setEscolhendo(depois)}><Plus size={14} /> Enquete aqui</button>}
    </div>
  );

  return (
    <>
      <div className="wf-head"><div><small>EDIÇÕES</small><h1>Apresentação do encontro</h1><p>Monte os slides no Canva e baixe como PDF. Suba aqui e marque onde entra cada enquete. No dia, o modo apresentação passa tudo em sequência e abre as enquetes com QR Code e gráfico ao vivo.</p></div>
        <div className="v2-head-actions">
          <select aria-label="Encontro" value={edicao} onChange={(event) => setEdicao(event.target.value)}>{edicoes.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select>
          {dados && dados.slides.length > 0 && <a className="wf-primary" href={`/apresentacao?id=${dados.id}`} target="_blank" rel="noopener noreferrer"><Presentation size={15} /> Abrir modo apresentação</a>}
        </div>
      </div>
      {erro && <p className="inline-notice" role="alert">{erro}</p>}
      <section className="v2-forms-card apr-envio">
        <header><small>SLIDES</small><h2>{dados?.slides.length ? `${dados.slides.length} slides` : 'Nenhum slide ainda'}</h2></header>
        <p className="adm-hint">No Canva: Compartilhar, Baixar, PDF padrão. Se mudar a apresentação, é só subir de novo: as enquetes continuam nos mesmos pontos. As perguntas são criadas em Edições, Votações.</p>
        <label className="wf-secondary apr-botao"><Upload size={15} /> {dados?.slides.length ? 'Trocar slides' : 'Subir slides'}<input type="file" accept="application/pdf,image/png,image/jpeg" multiple hidden onChange={(event) => void enviar(event)} /></label>
        {status && <p className="adm-hint" role="status">{status}</p>}
      </section>
      {dados && dados.slides.length > 0 && (
        <div className="apr-grade">
          <Inserir depois={0} />
          {dados.slides.map((url, indice) => (
            <div className="apr-item" key={url}>
              <figure className="apr-slide"><img src={url} alt={`Slide ${indice + 1}`} loading="lazy" /><figcaption>{indice + 1}</figcaption></figure>
              <Inserir depois={indice + 1} />
            </div>
          ))}
        </div>
      )}
      {dados && dados.slides.length > 0 && <p className="adm-hint">Para recomeçar do zero, <button type="button" className="adm-link-botao" onClick={() => { if (window.confirm('Tirar todos os slides e enquetes desta apresentação?')) void salvar({ slides: [], pausas: [] }); }}><Trash2 size={12} /> limpe a apresentação</button>.</p>}
    </>
  );
}
