import { useEffect, useState } from 'react';
import { deviceCode, editionSlug, errorMessage, supabase, type Poll } from '../lib';
import '../dinamica/dinamica.css';

export function Votar() {
  const slug = editionSlug();
  const previa = new URLSearchParams(window.location.search).has('previa');
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loadError, setLoadError] = useState('');
  const [nota, setNota] = useState<number | null>(null);
  const [nota2, setNota2] = useState<number | null>(null);
  // Com duas perguntas, a segunda só aparece depois de responder a primeira.
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [opcao, setOpcao] = useState('');
  const [texto, setTexto] = useState('');
  const [nome, setNome] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<'novo' | 'repetido' | null>(null);

  useEffect(() => {
    supabase.rpc('communicali_votacao', { p_slug: slug }).then(({ data, error: failure }) => {
      if (failure || !data) setLoadError('Não foi possível abrir a votação. Recarregue a página.');
      else setPoll(previa ? { ...(data as Poll), situacao: 'ativa' } : (data as Poll));
    });
  }, [slug, previa]);

  const ready = poll && (poll.tipo === 'nota' ? nota !== null && (!poll.pergunta_2 || nota2 !== null) : poll.tipo === 'multipla' ? Boolean(opcao) : Boolean(texto.trim())) && (poll.anonima || nome.trim().length > 1);

  async function submit() {
    if (!ready || sending) return;
    if (previa) { setSent('novo'); return; }
    setSending(true); setError('');
    const { data, error: failure } = await supabase.rpc('communicali_votar', { p_slug: slug, p_aparelho: deviceCode(), p_nota: nota, p_opcao: opcao, p_texto: texto, p_respondente: nome, p_nota_2: poll?.pergunta_2 ? nota2 : null });
    setSending(false);
    if (failure) setError(errorMessage(failure));
    else setSent((data as { repetido: boolean }).repetido ? 'repetido' : 'novo');
  }

  return (
    <main className="dn-pg">
      <div className="dn-pg-faixa" />
      <img className="dn-pg-logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" />
      <div className="dn-pg-corpo">
        <div className="dn-cartao">
          <p className="dn-pg-etapa">{poll?.pergunta_2 && !sent && poll.situacao === 'ativa' ? `Pergunta ${etapa} de 2` : 'Votação ao vivo'}</p>
          {loadError && <p className="dn-aviso alerta">{loadError}</p>}
          {sent === 'novo' && <h1>Sua resposta foi registrada. Obrigada por contribuir com essa conversa!</h1>}
          {sent === 'repetido' && <h1>Este aparelho já respondeu a esta pergunta.</h1>}
          {!sent && poll && <h1>{etapa === 2 && poll.pergunta_2 ? poll.pergunta_2 : poll.pergunta}</h1>}
          {!sent && poll?.situacao === 'rascunho' && <p className="dn-aviso">A votação ainda não abriu.</p>}
          {!sent && poll?.situacao === 'encerrada' && <p className="dn-aviso">A votação foi encerrada.</p>}
          {!sent && poll?.situacao === 'ativa' && (
            <>
              {poll.tipo === 'nota' && etapa === 1 && (
                <div className="dn-escala" role="radiogroup" aria-label="Nota de 0 a 10">
                  {Array.from({ length: 11 }, (_, value) => (
                    <button key={value} type="button" role="radio" aria-checked={nota === value} className={nota === value ? 'is-on' : ''} onClick={() => setNota(value)}>{value}</button>
                  ))}
                </div>
              )}
              {poll.tipo === 'nota' && poll.pergunta_2 && etapa === 2 && (
                <div className="dn-escala" role="radiogroup" aria-label="Nota de 0 a 10">
                  {Array.from({ length: 11 }, (_, value) => (
                    <button key={value} type="button" role="radio" aria-checked={nota2 === value} className={nota2 === value ? 'is-on' : ''} onClick={() => setNota2(value)}>{value}</button>
                  ))}
                </div>
              )}
              {poll.tipo === 'nota' && <p className="dn-restam">0 é nada, 10 é totalmente.</p>}
              {poll.tipo === 'multipla' && (
                <div className="dn-opcoes" role="radiogroup" aria-label="Opções">
                  {poll.opcoes.map((item) => <button key={item} type="button" role="radio" aria-checked={opcao === item} className={opcao === item ? 'is-on' : ''} onClick={() => setOpcao(item)}>{item}</button>)}
                </div>
              )}
              {poll.tipo === 'aberta' && <textarea rows={4} maxLength={500} aria-label="Sua resposta" value={texto} onChange={(event) => setTexto(event.target.value)} />}
              {!poll.anonima && <label className="dn-nome">Seu nome<input value={nome} autoComplete="name" onChange={(event) => setNome(event.target.value)} /></label>}
              {error && <p className="dn-aviso alerta">{error}</p>}
              {poll.pergunta_2 && etapa === 1
                ? <button className="dn-btn" type="button" disabled={nota === null} onClick={() => setEtapa(2)}>Continuar</button>
                : <button className="dn-btn" type="button" disabled={!ready || sending} onClick={submit}>{sending ? 'Enviando...' : 'Enviar resposta'}</button>}
              {poll.pergunta_2 && etapa === 2 && <button className="dn-link" type="button" onClick={() => setEtapa(1)}>Voltar para a primeira pergunta</button>}
            </>
          )}
        </div>
      </div>
      <p className="dn-rodape">Sem login. {poll?.anonima ? 'A votação é anônima.' : ''} · <a href="/privacidade" style={{ color: 'inherit' }}>Privacidade</a></p>
    </main>
  );
}
