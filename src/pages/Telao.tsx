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
        <p className="eyebrow">CommuniCALI</p>
        <h1>Faça seu <span className="nowrap">check-in</span></h1>
        <p className="screen__url">{url.replace(/^https?:\/\//, '')}</p>
      </div>
      {qr && <img className="screen__qr" src={qr} alt="QR Code do check-in" />}
    </main>
  );
}

export function TelaoVotacao() {
  const slug = editionSlug();
  const url = shortUrl('/votar');
  const qr = useQr(url);
  const [poll, setPoll] = useState<Poll | null>(null);

  useEffect(() => {
    const load = () => supabase.rpc('communicali_votacao', { p_slug: slug }).then(({ data }) => { if (data) setPoll(data as Poll); });
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [slug]);

  return (
    <main className="screen screen--poll">
      <div className="screen__text">
        <p className="eyebrow">Percepção de quem está nesta sala</p>
        <h1>{poll?.pergunta}</h1>
        <div className="screen__numbers">
          <div><strong>{poll?.votos ?? 0}</strong><span>{poll?.votos === 1 ? 'voto' : 'votos'}</span></div>
          <div><strong>{poll?.media === null || poll?.media === undefined ? '-' : Number(poll.media).toFixed(1).replace('.', ',')}</strong><span>média</span></div>
        </div>
      </div>
      <div className="screen__side">
        {qr && <img className="screen__qr" src={qr} alt="QR Code da votação" />}
        <p className="screen__url">{url.replace(/^https?:\/\//, '')}</p>
      </div>
    </main>
  );
}
