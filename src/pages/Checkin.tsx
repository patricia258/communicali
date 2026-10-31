import { useEffect, useState, type FormEvent } from 'react';
import { editionSlug, errorMessage, formatDate, supabase, type Edition } from '../lib';

type Done = { nome: string; categoria: string; selo: string; repetido: boolean };

export function Checkin() {
  const slug = editionSlug();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ nome: '', email: '', whatsapp: '', empresa: '', cargo: '' });
  const [termos, setTermos] = useState(false);
  const [imagem, setImagem] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    supabase.rpc('communicali_edicao', { p_slug: slug }).then(({ data, error: failure }) => {
      if (failure || !data) setLoadError('Não foi possível abrir o check-in. Recarregue a página.');
      else setEdition(data as Edition);
    });
  }, [slug]);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value }),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    const { data, error: failure } = await supabase.rpc('communicali_checkin', {
      p_slug: slug, p_nome: form.nome, p_email: form.email, p_whatsapp: form.whatsapp,
      p_empresa: form.empresa, p_cargo: form.cargo, p_termos: termos, p_imagem: imagem,
    });
    setSending(false);
    if (failure) setError(errorMessage(failure));
    else setDone(data as Done);
  }

  if (done) {
    return (
      <main className="event-page event-page--wine">
        <section className="pass">
          <img className="pass__mark" src="/brand/cali-lime-mark.svg" alt="" />
          <h1>Check-in confirmado.</h1>
          <p className="pass__lead">Você agora é membro da CommuniCALI!</p>
          <dl className="pass__data">
            <div><dt>Nome</dt><dd>{done.nome}</dd></div>
            <div><dt>Categoria</dt><dd>{done.categoria === 'membro' ? 'Membro' : done.categoria}</dd></div>
            <div><dt>Selo</dt><dd>{done.selo}</dd></div>
          </dl>
          <p className="pass__hint">{done.repetido ? 'Sua presença já estava registrada. ' : ''}Mostre esta tela na recepção para retirar seu crachá.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">CommuniCALI</p>
        <h1>Check-in</h1>
        {loadError && <p className="notice notice--alert">{loadError}</p>}
        {edition && <p className="event-card__meta">{edition.titulo} · {formatDate(edition.data_evento)} · {edition.local}</p>}
        {edition?.situacao === 'antes' && <p className="notice">O check-in abre no dia do encontro.</p>}
        {edition?.situacao === 'encerrado' && <p className="notice">O check-in desta edição foi encerrado.</p>}
        {edition?.situacao === 'aberto' && (
          <form className="form" onSubmit={submit}>
            <label>Nome completo<input required minLength={2} autoComplete="name" {...field('nome')} /></label>
            <label>E-mail<input required type="email" inputMode="email" autoComplete="email" {...field('email')} /></label>
            <label>WhatsApp com DDD<input type="tel" inputMode="tel" autoComplete="tel" {...field('whatsapp')} /></label>
            <label>Empresa (opcional)<input autoComplete="organization" {...field('empresa')} /></label>
            <label>Cargo (opcional)<input autoComplete="organization-title" {...field('cargo')} /></label>
            <label className="check">
              <input type="checkbox" required checked={termos} onChange={(event) => setTermos(event.target.checked)} />
              <span>Autorizo a CALI RH a guardar estes dados para registrar minha presença e meu histórico na CommuniCALI.</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={imagem} onChange={(event) => setImagem(event.target.checked)} />
              <span>Autorizo o uso da minha imagem em fotos do encontro publicadas pela CALI RH (opcional).</span>
            </label>
            {error && <p className="notice notice--alert">{error}</p>}
            <button className="button" type="submit" disabled={sending}>{sending ? 'Enviando...' : 'Confirmar presença'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
