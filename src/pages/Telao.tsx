import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { editionSlug, supabase, type Poll } from '../lib';
import '../dinamica/dinamica.css';

function useQr(url: string) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(url, { width: 900, margin: 1, color: { dark: '#5A1E2D', light: '#FFFFFF' } }).then(setSrc);
  }, [url]);
  return src;
}

const shortUrl = (path: string) => {
  const slug = editionSlug();
  const query = slug === 'fundadora' ? '' : `?edicao=${slug}`;
  return `${window.location.origin}${path}${query}`;
};

export function TelaoCheckin() {
  const url = shortUrl('/checkin');
  const qr = useQr(url);
  return (
    <main className="dn-tela">
      <div className="dn-stage">
        <div className="dn-faixa" />
        <div className="dn-boasvindas">
          <section className="dn-bv-texto">
            <img src="/brand/communicali-branco.png" alt="ComuniCALI" />
            <h1>Bem-vindas <em>e bem-vindos!</em></h1>
            <p>Sinta-se à vontade e escolha uma mesa. Faça o seu check-in pelo QR Code e levante a mão: o seu crachá chega à mesa.</p>
          </section>
          <section className="dn-bv-qr">
            <small>Check-in</small>
            <h2>Aponte a câmera</h2>
            {qr && <img src={qr} alt="QR Code do check-in" />}
            <span>{url.replace(/^https?:\/\//, '')}</span>
          </section>
        </div>
      </div>
    </main>
  );
}

const FAIXAS: Array<[string, number, number]> = [['0 a 4', 0, 4], ['5 a 7', 5, 7], ['8 a 10', 8, 10]];

export function Results({ poll }: { poll: Poll }) {
  const total = poll.votos || 1;
  const percent = (value: number) => `${Math.round((value / total) * 100)}%`;
  if (poll.tipo === 'nota') {
    const counts = Array.from({ length: 11 }, (_, nota) => Number(poll.distribuicao?.[nota] || 0));
    const top = Math.max(1, ...counts);
    return (
      <div className="results">
        <div className="screen__numbers">
          <div><strong>{poll.votos}</strong><span>{poll.votos === 1 ? 'resposta' : 'respostas'}</span></div>
          <div><strong>{poll.media === null || poll.media === undefined ? '-' : Number(poll.media).toFixed(1).replace('.', ',')}</strong><span>média</span></div>
        </div>
        <div className="bars">
          {counts.map((count, nota) => <div key={nota}><i style={{ height: `${(count / top) * 100}%` }} /><span>{nota}</span></div>)}
        </div>
        <div className="bands">
          {FAIXAS.map(([label, from, to]) => <p key={label}><strong>{percent(counts.slice(from, to + 1).reduce((sum, count) => sum + count, 0))}</strong> {label}</p>)}
        </div>
      </div>
    );
  }
  if (poll.tipo === 'multipla') {
    return (
      <div className="results results--list">
        {poll.opcoes.map((item) => {
          const count = Number(poll.por_opcao?.[item] || 0);
          return <div className="option-bar" key={item}><span>{item}</span><strong>{percent(count)}</strong><i style={{ width: percent(count) }} /></div>;
        })}
      </div>
    );
  }
  return <div className="results results--list">{(poll.textos || []).map((texto, index) => <p className="quote" key={index}>{texto}</p>)}</div>;
}

export function TelaoVotacao() {
  const slug = editionSlug();
  const url = shortUrl('/votar');
  const qr = useQr(url);
  const [poll, setPoll] = useState<Poll | null>(null);

  useEffect(() => {
    const load = () => supabase.rpc('communicali_votacao', { p_slug: slug }).then(({ data }) => { if (data) setPoll(data as Poll); });
    void load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [slug]);

  return (
    <main className={`screen screen--poll${poll?.revelada ? ' screen--revealed' : ''}`}>
      <div className="screen__text">
        <img className="screen__logo" src="/brand/communicali-branco.png" alt="ComuniCALI" />
        <p className="eyebrow">Percepção de quem está nesta sala</p>
        <h1>{poll?.pergunta}</h1>
        {poll?.revelada ? <Results poll={poll} /> : (
          <div className="screen__numbers"><div><strong>{poll?.votos ?? 0}</strong><span>{poll?.votos === 1 ? 'resposta' : 'respostas'}</span></div></div>
        )}
      </div>
      {!poll?.revelada && (
        <div className="screen__side">
          {qr && <img className="screen__qr" src={qr} alt="QR Code da votação" />}
          <p className="screen__url">{url.replace(/^https?:\/\//, '')}</p>
        </div>
      )}
    </main>
  );
}

type Resultado = { titulo: string; pergunta: string; pergunta_2: string | null; situacao: 'rascunho' | 'ativa' | 'encerrada'; votos: number; media: number | null; media_2: number | null; dist: Record<string, number>; dist_2: Record<string, number> };
const virgula = (valor: number | null) => (valor === null || valor === undefined ? '–' : Number(valor).toFixed(1).replace('.', ','));

/** Tela ao vivo da votação, aberta pelo link do slide: QR Code para votar e o resultado mudando enquanto a sala responde.
    Mesmo tom da apresentação. Se quem abre está logada como administradora, a votação em rascunho abre sozinha. */
export function TelaoResultado() {
  const slug = editionSlug();
  const url = shortUrl('/votar');
  const qr = useQr(url);
  const [dados, setDados] = useState<Resultado | null>(null);
  const [edicao, setEdicao] = useState<number | null>(null);
  useEffect(() => {
    void supabase.from('editions').select('numero').eq('slug', slug).maybeSingle().then(({ data }) => setEdicao((data as { numero: number | null } | null)?.numero ?? null));
    const carregar = () => supabase.rpc('communicali_resultado', { p_slug: slug }).then(({ data }) => { if (data) setDados(data as Resultado); });
    // Abre a votação ao abrir a tela (só funciona para administradoras; para o público não muda nada).
    void supabase.from('polls').update({ status: 'ativa' }).eq('slug', slug).eq('status', 'rascunho').then(carregar);
    const timer = window.setInterval(carregar, 2500);
    return () => window.clearInterval(timer);
  }, [slug]);

  const duas = Boolean(dados?.pergunta_2);
  const contagem = (dist: Record<string, number> | undefined, nota: number) => Number(dist?.[nota] || 0);
  const topo = Math.max(1, ...Array.from({ length: 11 }, (_, nota) => Math.max(contagem(dados?.dist, nota), duas ? contagem(dados?.dist_2, nota) : 0)));
  const distancia = dados && duas && dados.media !== null && dados.media_2 !== null ? Math.abs(Number(dados.media) - Number(dados.media_2)) : null;
  const votos = dados?.votos ?? 0;
  const situacao = dados?.situacao === 'ativa' ? ['aberta', 'Recebendo votos'] : dados?.situacao === 'encerrada' ? ['encerrada', 'Votação encerrada'] : ['aguardando', 'Aguardando abertura'];
  const quadro = (classe: string, rotulo: string, pergunta: string | null | undefined, media: number | null | undefined, dist: Record<string, number> | undefined) => (
    <section className={`dn-board ${classe} dn-res-quadro`}>
      <header><div><small>{rotulo}</small><h3>{virgula(media ?? null)} <span style={{ fontSize: '.5em', fontWeight: 600, opacity: .75 }}>de média</span></h3></div><span className={`dn-chip ${situacao[0]}`}><i /><b>{situacao[1]}</b></span></header>
      <p className="dn-res-pergunta">{pergunta}</p>
      <div className="dn-barras" role="img" aria-label={`Distribuição das notas de 0 a 10: ${rotulo}`}>
        {Array.from({ length: 11 }, (_, nota) => (
          <div className="dn-col" key={nota}>
            <i style={{ ['--r' as string]: contagem(dist, nota) / topo }}>{contagem(dist, nota) > 0 && <b>{contagem(dist, nota)}</b>}</i>
            <span>{nota}</span>
          </div>
        ))}
      </div>
      {!votos && <div className="dn-vazio">Leia o QR Code e vote.<br />O gráfico se monta aqui, ao vivo.</div>}
    </section>
  );

  return (
    <main className="dn-tela">
      <div className="dn-stage">
        <div className="dn-faixa" />
        <header className="dn-head">
          <img className="dn-logo" src="/brand/communicali-branco.png" alt="ComuniCALI" />
          <div className="dn-tema"><small>Votação ao vivo{edicao ? ` · ${edicao}ª Edição` : ''} · {votos} {votos === 1 ? 'pessoa votou' : 'pessoas votaram'}</small><h2>Antes de debater, vamos votar!</h2></div>
          <div className="dn-qr"><span>Aponte a câmera<br />e vote</span>{qr && <img src={qr} alt="QR Code para votar" />}</div>
        </header>
        <div className={`dn-boards${duas ? '' : ' dn-m1'}`}>
          {quadro('dn-b1', duas ? 'Na opinião' : 'Resultado', dados?.pergunta, dados?.media, dados?.dist)}
          {duas && quadro('dn-b2', 'Na prática', dados?.pergunta_2, dados?.media_2, dados?.dist_2)}
          {distancia !== null && <span className="dn-dist"><b>{virgula(distancia)}</b><small>{distancia === 1 ? 'ponto' : 'pontos'} de distância</small></span>}
        </div>
      </div>
    </main>
  );
}
