import { useEffect, useState } from 'react';
import { deviceCode, editionSlug, errorMessage, supabase, type Poll } from '../lib';

export function Votar() {
  const slug = editionSlug();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loadError, setLoadError] = useState('');
  const [nota, setNota] = useState<number | null>(null);
  const [opcao, setOpcao] = useState('');
  const [texto, setTexto] = useState('');
  const [nome, setNome] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<'novo' | 'repetido' | null>(null);

  useEffect(() => {
    supabase.rpc('communicali_votacao', { p_slug: slug }).then(({ data, error: failure }) => {
      if (failure || !data) setLoadError('Não foi possível abrir a votação. Recarregue a página.');
      else setPoll(data as Poll);
    });
  }, [slug]);

  const ready = poll && (poll.tipo === 'nota' ? nota !== null : poll.tipo === 'multipla' ? Boolean(opcao) : Boolean(texto.trim())) && (poll.anonima || nome.trim().length > 1);

  async function submit() {
    if (!ready || sending) return;
    setSending(true); setError('');
    const { data, error: failure } = await supabase.rpc('communicali_votar', { p_slug: slug, p_aparelho: deviceCode(), p_nota: nota, p_opcao: opcao, p_texto: texto, p_respondente: nome });
    setSending(false);
    if (failure) setError(errorMessage(failure));
    else setSent((data as { repetido: boolean }).repetido ? 'repetido' : 'novo');
  }

  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">ComuniCALI</p>
        {loadError && <p className="notice notice--alert">{loadError}</p>}
        {sent === 'novo' && <h1 className="question">Sua resposta foi registrada. Obrigada por contribuir com essa conversa!</h1>}
        {sent === 'repetido' && <h1 className="question">Este aparelho já respondeu a esta pergunta.</h1>}
        {!sent && poll && <h1 className="question">{poll.pergunta}</h1>}
        {!sent && poll?.situacao === 'rascunho' && <p className="notice">A votação ainda não abriu.</p>}
        {!sent && poll?.situacao === 'encerrada' && <p className="notice">A votação foi encerrada.</p>}
        {!sent && poll?.situacao === 'ativa' && (
          <>
            {poll.tipo === 'nota' && (
              <div className="scale" role="radiogroup" aria-label="Nota de 0 a 10">
                {Array.from({ length: 11 }, (_, value) => (
                  <button key={value} type="button" role="radio" aria-checked={nota === value} className={nota === value ? 'is-on' : ''} onClick={() => setNota(value)}>{value}</button>
                ))}
              </div>
            )}
            {poll.tipo === 'multipla' && (
              <div className="options" role="radiogroup" aria-label="Opções">
                {poll.opcoes.map((item) => <button key={item} type="button" role="radio" aria-checked={opcao === item} className={opcao === item ? 'is-on' : ''} onClick={() => setOpcao(item)}>{item}</button>)}
              </div>
            )}
            {poll.tipo === 'aberta' && <textarea className="answer" rows={4} maxLength={500} aria-label="Sua resposta" value={texto} onChange={(event) => setTexto(event.target.value)} />}
            {!poll.anonima && <label className="field">Seu nome<input value={nome} autoComplete="name" onChange={(event) => setNome(event.target.value)} /></label>}
            {error && <p className="notice notice--alert">{error}</p>}
            <button className="button" type="button" disabled={!ready || sending} onClick={submit}>{sending ? 'Enviando...' : 'Enviar resposta'}</button>
          </>
        )}
      </section>
    </main>
  );
}
