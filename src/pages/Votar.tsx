import { useEffect, useState } from 'react';
import { deviceCode, editionSlug, errorMessage, supabase, type Poll } from '../lib';

export function Votar() {
  const slug = editionSlug();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loadError, setLoadError] = useState('');
  const [nota, setNota] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<'novo' | 'repetido' | null>(null);

  useEffect(() => {
    supabase.rpc('communicali_votacao', { p_slug: slug }).then(({ data, error: failure }) => {
      if (failure || !data) setLoadError('Não foi possível abrir a votação. Recarregue a página.');
      else setPoll(data as Poll);
    });
  }, [slug]);

  async function submit() {
    if (nota === null || sending) return;
    setSending(true);
    setError('');
    const { data, error: failure } = await supabase.rpc('communicali_votar', { p_slug: slug, p_aparelho: deviceCode(), p_nota: nota });
    setSending(false);
    if (failure) setError(errorMessage(failure));
    else setSent((data as { repetido: boolean }).repetido ? 'repetido' : 'novo');
  }

  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">CommuniCALI</p>
        {loadError && <p className="notice notice--alert">{loadError}</p>}
        {sent && <h1>{sent === 'novo' ? 'Voto registrado.' : 'Este aparelho já votou.'}</h1>}
        {sent && <p className="event-card__meta">A média aparece no telão.</p>}
        {!sent && poll && <h1 className="question">{poll.pergunta}</h1>}
        {!sent && poll?.situacao === 'antes' && <p className="notice">A votação abre no dia do encontro.</p>}
        {!sent && poll?.situacao === 'encerrado' && <p className="notice">A votação foi encerrada.</p>}
        {!sent && poll?.situacao === 'aberto' && (
          <>
            <div className="scale" role="radiogroup" aria-label="Nota de 0 a 10">
              {Array.from({ length: 11 }, (_, value) => (
                <button key={value} type="button" role="radio" aria-checked={nota === value} className={nota === value ? 'is-on' : ''} onClick={() => setNota(value)}>{value}</button>
              ))}
            </div>
            {error && <p className="notice notice--alert">{error}</p>}
            <button className="button" type="button" disabled={nota === null || sending} onClick={submit}>{sending ? 'Enviando...' : 'Enviar nota'}</button>
          </>
        )}
      </section>
    </main>
  );
}
