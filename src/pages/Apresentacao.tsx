/* Modo apresentação: slides em tela cheia, passados pelo passador ou pelas setas. Quando chega numa enquete,
   ela abre para votação, aparece o QR Code e o gráfico cresce ao vivo; ao seguir, a enquete fecha. Só para administradoras. */
import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { supabase, type Poll } from '../lib';
import { Results } from './Telao';
import type { ApresentacaoDados } from './AdminApresentacao';
import './apresentacao.css';

type Passo = { tipo: 'slide'; url: string; numero: number } | { tipo: 'enquete'; poll_id: string };
type Enquete = { id: string; pergunta: string; tipo: Poll['tipo']; opcoes: string[]; anonima: boolean; titulo: string };
type Voto = { nota: number | null; opcao: string | null; texto: string | null };

const ID = new URLSearchParams(window.location.search).get('id') || '';
const lerPosicao = () => { try { return Number(sessionStorage.getItem(`apresentacao:${ID}`) || 0); } catch { return 0; } };

function montarPassos(dados: ApresentacaoDados): Passo[] {
  const enquetesDepois = (n: number) => dados.pausas.filter((item) => item.depois === n).map((item): Passo => ({ tipo: 'enquete', poll_id: item.poll_id }));
  return [...enquetesDepois(0), ...dados.slides.flatMap((url, indice): Passo[] => [{ tipo: 'slide', url, numero: indice + 1 }, ...enquetesDepois(indice + 1)])];
}

// Votos lidos direto do banco (a apresentação é aberta por quem administra): o gráfico mostra tudo, sem esperar revelar.
function resultado(enquete: Enquete, votos: Voto[]): Poll {
  const contar = (lista: Array<string | number | null>) => lista.reduce<Record<string, number>>((acc, item) => { if (item !== null && item !== undefined) acc[String(item)] = (acc[String(item)] || 0) + 1; return acc; }, {});
  const notas = votos.map((voto) => voto.nota).filter((nota): nota is number => nota !== null);
  return {
    titulo: enquete.titulo, pergunta: enquete.pergunta, tipo: enquete.tipo, opcoes: enquete.opcoes, anonima: enquete.anonima, situacao: 'ativa', revelada: true,
    votos: votos.length, media: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null,
    distribuicao: contar(notas), por_opcao: contar(votos.map((voto) => voto.opcao)), textos: votos.map((voto) => voto.texto).filter(Boolean).slice(-12).reverse() as string[],
  };
}

function EnqueteAoVivo({ enquete, link }: { enquete: Enquete; link: string }) {
  const [votos, setVotos] = useState<Voto[]>([]);
  const [qr, setQr] = useState('');
  useEffect(() => { void QRCode.toDataURL(link, { width: 900, margin: 1, color: { dark: '#5A1E2D', light: '#FFFFFF' } }).then(setQr); }, [link]);
  useEffect(() => {
    const carregar = () => supabase.from('poll_votes').select('nota,opcao,texto').eq('poll_id', enquete.id).order('created_at').then(({ data }) => setVotos((data || []) as Voto[]));
    void carregar();
    const timer = window.setInterval(carregar, 2000);
    return () => window.clearInterval(timer);
  }, [enquete.id]);
  const poll = resultado(enquete, votos);
  return (
    <main className="screen screen--poll screen--revealed apr-ao-vivo">
      <div className="screen__text">
        <img className="screen__logo" src="/brand/communicali-branco.png" alt="ComuniCALI" />
        <p className="eyebrow">Responda pelo celular</p>
        <h1>{enquete.pergunta}</h1>
        {votos.length ? <Results poll={poll} /> : <div className="screen__numbers"><div><strong>0</strong><span>respostas até agora</span></div></div>}
      </div>
      <div className="screen__side">
        {qr && <img className="screen__qr" src={qr} alt="QR Code para responder" />}
        <p className="screen__url">{window.location.host}/votar</p>
        <p className="apr-contagem"><strong>{votos.length}</strong> {votos.length === 1 ? 'resposta' : 'respostas'}</p>
      </div>
    </main>
  );
}

export function Apresentacao() {
  const [dados, setDados] = useState<ApresentacaoDados | null>(null);
  const [enquetes, setEnquetes] = useState<Enquete[]>([]);
  const [erro, setErro] = useState('');
  const [posicao, setPosicao] = useState(lerPosicao);
  const [dica, setDica] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);
  const link = `${window.location.origin}/votar?ao-vivo=${ID}`;

  useEffect(() => {
    void supabase.from('apresentacoes').select('*').eq('id', ID).maybeSingle().then(({ data }) => {
      if (!data) { setErro('Entre no painel com o seu login de administradora e abra a apresentação por lá.'); return; }
      const apresentacao = data as ApresentacaoDados;
      setDados(apresentacao);
      for (const url of apresentacao.slides) { const imagem = new Image(); imagem.src = url; }
      void supabase.from('polls').select('id,pergunta,tipo,opcoes,anonima,titulo').in('id', apresentacao.pausas.map((item) => item.poll_id)).then(({ data: lista }) => setEnquetes((lista || []) as Enquete[]));
    });
    const timer = window.setTimeout(() => setDica(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  const passos = useMemo(() => (dados ? montarPassos(dados) : []), [dados]);
  const atual = passos[Math.min(posicao, passos.length - 1)];
  const enqueteAtual = atual?.tipo === 'enquete' ? atual.poll_id : null;

  useEffect(() => { try { sessionStorage.setItem(`apresentacao:${ID}`, String(posicao)); } catch { /* sem memória da posição */ } }, [posicao]);

  // Ao chegar numa enquete, ela abre e passa a ser a do link ao vivo; ao sair, fecha.
  useEffect(() => {
    if (!enqueteAtual) return;
    void supabase.from('polls').update({ status: 'ativa' }).eq('id', enqueteAtual).then(() => supabase.from('apresentacoes').update({ poll_atual: enqueteAtual }).eq('id', ID));
    return () => { void supabase.from('polls').update({ status: 'encerrada' }).eq('id', enqueteAtual).then(() => supabase.from('apresentacoes').update({ poll_atual: null }).eq('id', ID)); };
  }, [enqueteAtual]);

  useEffect(() => {
    const andar = (passo: number) => setPosicao((valor) => Math.max(0, Math.min(passos.length - 1, valor + passo)));
    function tecla(event: KeyboardEvent) {
      if (['ArrowRight', 'PageDown', ' ', 'Enter', 'ArrowDown'].includes(event.key)) { event.preventDefault(); andar(1); }
      else if (['ArrowLeft', 'PageUp', 'Backspace', 'ArrowUp'].includes(event.key)) { event.preventDefault(); andar(-1); }
      else if (event.key === 'Home') setPosicao(0);
      else if (event.key === 'End') setPosicao(passos.length - 1);
      else if (event.key.toLowerCase() === 'f') void (document.fullscreenElement ? document.exitFullscreen() : raiz.current?.requestFullscreen());
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [passos.length]);

  if (erro) return <div className="apr-tela apr-aviso"><p>{erro}</p><a href="/admin">Ir para o painel</a></div>;
  if (!dados || !atual) return <div className="apr-tela" aria-busy="true" />;
  const enquete = enqueteAtual ? enquetes.find((item) => item.id === enqueteAtual) : null;

  return (
    <div ref={raiz} className="apr-tela" onClick={(event) => setPosicao((valor) => Math.max(0, Math.min(passos.length - 1, valor + (event.clientX < window.innerWidth * 0.25 ? -1 : 1))))}>
      {atual.tipo === 'slide'
        ? <img className="apr-imagem" src={atual.url} alt={`Slide ${atual.numero}`} />
        : enquete ? <EnqueteAoVivo enquete={enquete} link={link} /> : <div className="apr-aviso"><p>Carregando a enquete…</p></div>}
      <span className="apr-pos" aria-live="polite">{posicao + 1} / {passos.length}</span>
      {dica && <p className="apr-dica">Tecle <strong>F</strong> para tela cheia. Passe com o passador ou com as setas.</p>}
    </div>
  );
}
