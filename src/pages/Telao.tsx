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
        <img className="screen__logo" src="/brand/communicali-branco.png" alt="CommuniCALI" />
        <h1>Faça seu <span className="nowrap">check-in</span></h1>
        <p className="screen__url">{url.replace(/^https?:\/\//, '')}</p>
      </div>
      {qr && <img className="screen__qr" src={qr} alt="QR Code do check-in" />}
    </main>
  );
}

const FAIXAS: Array<[string, number, number]> = [['0 a 4', 0, 4], ['5 a 7', 5, 7], ['8 a 10', 8, 10]];

function Results({ poll }: { poll: Poll }) {
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
        <img className="screen__logo" src="/brand/communicali-branco.png" alt="CommuniCALI" />
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
