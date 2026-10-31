import { useState, type FormEvent } from 'react';
import { errorMessage, supabase } from '../lib';
import { MemberFields, emptyMember, memberArgs, useSiteTexts } from './MemberFields';

export function Cadastro() {
  const texts = useSiteTexts();
  const [form, setForm] = useState(emptyMember());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true); setError('');
    const { error: failure } = await supabase.rpc('communicali_cadastrar', memberArgs(form));
    setSending(false);
    if (failure) setError(errorMessage(failure));
    else setDone(true);
  }

  if (done) {
    return (
      <main className="event-page event-page--wine">
        <section className="pass">
          <img className="pass__logo" src="/brand/communicali-bordo.png" alt="CommuniCALI" />
          <h1>Bem-vindo à CommuniCALI!</h1>
          <p className="pass__lead">Seu cadastro foi realizado com sucesso.</p>
          <p className="pass__hint">Falar de pessoas pode mudar o mundo.</p>
          <a className="button" href="/">Voltar ao site</a>
        </section>
      </main>
    );
  }

  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">CommuniCALI</p>
        <h1>Cadastro de membro</h1>
        {texts && !texts.cadastro_aberto && <p className="notice">O cadastro abre em breve. Enquanto isso, entre no grupo da comunidade pelo site.</p>}
        {texts?.cadastro_aberto && (
          <form className="form" onSubmit={submit}>
            <MemberFields value={form} onChange={setForm} texts={texts} />
            {error && <p className="notice notice--alert">{error}</p>}
            <button className="button" type="submit" disabled={sending}>{sending ? 'Enviando...' : 'Fazer meu cadastro'}</button>
          </form>
        )}
      </section>
    </main>
  );
}

export function TextoPagina({ tipo }: { tipo: 'regras' | 'privacidade' }) {
  const texts = useSiteTexts();
  const body = tipo === 'regras' ? texts?.regras_texto : texts?.privacidade_texto;
  return (
    <main className="wrap legal">
      <a href="/"><img src="/brand/communicali-bordo.png" alt="CommuniCALI" /></a>
      <h1>{tipo === 'regras' ? 'Regras de participação' : 'Política de privacidade'}</h1>
      {texts && !body && <p>Este texto será publicado em breve.</p>}
      {body?.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </main>
  );
}
