import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { editionSlug, supabase, type Poll } from '../lib';

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
    <main className="screen">
      <div className="screen__text">
        <img className="screen__logo" src="/brand/communicali-branco.png" alt="ComuniCALI" />
        <h1><span className="nowrap">Bem-vindas e</span> <span className="nowrap">bem-vindos!</span></h1>
        <p className="screen__lead">Sinta-se à vontade, escolha uma mesa e faça seu <span className="nowrap">check-in</span> pelo QR Code.</p>
        <p className="screen__url">{url.replace(/^https?:\/\//, '')}</p>
      </div>
      {qr && <img className="screen__qr" src={qr} alt="QR Code do check-in" />}
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

  return (
    <main className="resultado">
      <header className="resultado__topo"><img src="/brand/communicali-branco.png" alt="ComuniCALI" />{edicao && <span>{edicao}ª Edição</span>}</header>
      <section className="resultado__corpo">
        <div className="resultado__texto">
          <h1><span className="resultado__linha">Antes de debater,</span> <em>vamos votar!</em></h1>
          <i className="resultado__traco" aria-hidden="true" />
          {qr && <img className="resultado__qr" src={qr} alt="QR Code para votar" />}
          <p className="resultado__url">{url.replace(/^https?:\/\//, '')}</p>
          {dados && dados.situacao !== 'ativa' && <p className="resultado__aviso">{dados.situacao === 'encerrada' ? 'Votação encerrada.' : 'A votação ainda não foi aberta. Ative em Votações, no painel.'}</p>}
        </div>
        <div className="resultado__painel">
          <div className="resultado__numeros">
            <p className="resultado__total"><strong>{dados?.votos ?? 0}</strong>{dados?.votos === 1 ? 'pessoa votou' : 'pessoas votaram'}</p>
            <div className="resultado__media resultado__media--opiniao"><small>{duas ? 'Na opinião' : 'Média'}</small><strong>{virgula(dados?.media ?? null)}</strong></div>
            {duas && <div className="resultado__media resultado__media--pratica"><small>Na prática</small><strong>{virgula(dados?.media_2 ?? null)}</strong></div>}
          </div>
          {distancia !== null && <p className="resultado__distancia">Uma distância de <strong>{virgula(distancia)} {distancia === 1 ? 'ponto' : 'pontos'}</strong> entre o que acreditamos e o que vemos acontecer.</p>}
          <div className="resultado__grafico" role="img" aria-label="Distribuição das notas de 0 a 10">
            <div className="resultado__barras">
              {Array.from({ length: 11 }, (_, nota) => (
                <div className="resultado__coluna" key={nota}>
                  <div className="resultado__par">
                    <i className="resultado__barra resultado__barra--opiniao" style={{ height: `${(contagem(dados?.dist, nota) / topo) * 100}%` }}>{contagem(dados?.dist, nota) > 0 && <b>{contagem(dados?.dist, nota)}</b>}</i>
                    {duas && <i className="resultado__barra resultado__barra--pratica" style={{ height: `${(contagem(dados?.dist_2, nota) / topo) * 100}%` }}>{contagem(dados?.dist_2, nota) > 0 && <b>{contagem(dados?.dist_2, nota)}</b>}</i>}
                  </div>
                  <span>{nota}</span>
                </div>
              ))}
            </div>
            {duas && <p className="resultado__legenda"><span className="resultado__ponto resultado__ponto--opiniao" />Na opinião<span className="resultado__ponto resultado__ponto--pratica" />Na prática</p>}
            {!dados?.votos && <p className="resultado__vazio">Leia o QR Code e vote. O gráfico se monta aqui, ao vivo.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
