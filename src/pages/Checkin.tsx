import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { editionSlug, errorMessage, formatDate, supabase, type Edition } from '../lib';
import { MemberFields, emptyMember, memberArgs, useSiteTexts } from './MemberFields';

type Done = { nome: string; categoria: string; edicao: string; selo: string; codigo: string; repetido: boolean };
type Step = 'email' | 'novo' | 'codigo';

export const CATEGORIAS: Record<string, string> = { membro: 'Membro', participante_ativo: 'Participante Ativo', conector: 'Conector', embaixador: 'Embaixador', convidado: 'Convidado', organizador: 'Organizador', kids: 'Kids' };

function Success({ done }: { done: Done }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/validar/${done.codigo}`, { width: 320, margin: 1, color: { dark: '#5A1E2D', light: '#FFFFFF' } }).then(setQr);
  }, [done.codigo]);
  return (
    <main className="event-page event-page--wine">
      <section className="pass">
        <img className="pass__logo" src="/brand/communicali-bordo.png" alt="CommuniCALI" />
        <h1>Presença confirmada!</h1>
        <p className="pass__lead">Parabéns! Você faz parte da CommuniCALI.</p>
        {done.repetido ? <p className="pass__hint">Sua presença neste encontro já estava registrada.</p> : <p className="pass__hint">Você conquistou 10 pontos pela participação neste encontro.</p>}
        <dl className="pass__data">
          <div><dt>Nome</dt><dd>{done.nome}</dd></div>
          <div><dt>Categoria</dt><dd>{CATEGORIAS[done.categoria] || done.categoria}</dd></div>
          <div><dt>Edição</dt><dd>{done.edicao}</dd></div>
          <div><dt>Código</dt><dd>{done.codigo}</dd></div>
        </dl>
        {qr && <img className="pass__qr" src={qr} alt="QR Code para a organização validar sua presença" />}
        <p className="pass__hint">Apresente esta tela à organização para retirar seu crachá de membro.</p>
      </section>
    </main>
  );
}

export function Checkin() {
  const slug = editionSlug();
  const texts = useSiteTexts();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [form, setForm] = useState(emptyMember());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    supabase.rpc('communicali_edicao', { p_slug: slug }).then(({ data, error: failure }) => {
      if (failure || !data) setLoadError('Não foi possível abrir o check-in. Recarregue a página.');
      else setEdition(data as Edition);
    });
  }, [slug]);

  async function checkEmail(event: FormEvent) {
    event.preventDefault();
    setSending(true); setError('');
    const clean = email.trim().toLowerCase();
    const { data, error: failure } = await supabase.rpc('communicali_situacao_email', { p_slug: slug, p_email: clean });
    if (failure) { setSending(false); setError(errorMessage(failure)); return; }
    if ((data as { membro: boolean }).membro) {
      const { error: sendFailure } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
      setSending(false);
      if (sendFailure) setError('Não conseguimos enviar o código agora. Procure a organização na recepção para registrar sua presença.');
      else setStep('codigo');
      return;
    }
    setSending(false);
    setForm(emptyMember(clean));
    setStep('novo');
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setSending(true); setError('');
    const { error: failure } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo.trim(), type: 'email' });
    if (failure) { setSending(false); setError('Código inválido ou vencido. Confira o e-mail e tente de novo.'); return; }
    const { data, error: checkinFailure } = await supabase.rpc('communicali_checkin_membro', { p_slug: slug });
    await supabase.auth.signOut();
    setSending(false);
    if (checkinFailure) setError(errorMessage(checkinFailure));
    else setDone(data as Done);
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true); setError('');
    const { data, error: failure } = await supabase.rpc('communicali_checkin_novo', { p_slug: slug, ...memberArgs(form), p_imagem: form.imagem });
    setSending(false);
    if (failure) setError(errorMessage(failure));
    else setDone(data as Done);
  }

  if (done) return <Success done={done} />;

  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">CommuniCALI</p>
        <h1>Check-in</h1>
        {loadError && <p className="notice notice--alert">{loadError}</p>}
        {edition && <p className="event-card__meta">{edition.titulo} · {formatDate(edition.data_evento)} · {edition.local}</p>}
        {edition?.situacao === 'antes' && <p className="notice">O check-in abre no dia do encontro.</p>}
        {edition?.situacao === 'encerrado' && <p className="notice">O check-in desta edição foi encerrado.</p>}
        {edition?.situacao === 'aberto' && step === 'email' && (
          <form className="form" onSubmit={checkEmail}>
            <label>Qual é o seu e-mail?<input required type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            {error && <p className="notice notice--alert">{error}</p>}
            <button className="button" type="submit" disabled={sending}>{sending ? 'Verificando...' : 'Continuar'}</button>
          </form>
        )}
        {edition?.situacao === 'aberto' && step === 'codigo' && (
          <form className="form" onSubmit={verify}>
            <p>Enviamos um código para {email}. Digite aqui para confirmar sua presença.</p>
            <label>Código<input required inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={(event) => setCodigo(event.target.value)} /></label>
            {error && <p className="notice notice--alert">{error}</p>}
            <button className="button" type="submit" disabled={sending}>{sending ? 'Confirmando...' : 'Confirmar presença'}</button>
          </form>
        )}
        {edition?.situacao === 'aberto' && step === 'novo' && texts && (
          <form className="form" onSubmit={register}>
            <p>Primeira vez por aqui? Faça seu cadastro para concluir o check-in.</p>
            <MemberFields value={form} onChange={setForm} texts={texts} withImage lockEmail />
            {error && <p className="notice notice--alert">{error}</p>}
            <button className="button" type="submit" disabled={sending}>{sending ? 'Enviando...' : 'Confirmar presença'}</button>
          </form>
        )}
      </section>
    </main>
  );
}

export function Validar() {
  const { codigo = '' } = useParams();
  const [result, setResult] = useState<{ nome: string; categoria: string; edicao: string; horario: string; cracha: string } | null | undefined>(undefined);
  useEffect(() => {
    supabase.rpc('communicali_validar_codigo', { p_codigo: codigo }).then(({ data }) => setResult(data as typeof result));
  }, [codigo]);

  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">Validação de presença</p>
        {result === null && <><h1>Código não encontrado</h1><p className="notice notice--alert">Esta presença não existe no sistema. Confira com a pessoa e registre em Edições, na área administrativa.</p></>}
        {result && (
          <>
            <h1>Presença válida</h1>
            <dl className="pass__data">
              <div><dt>Nome</dt><dd>{result.nome}</dd></div>
              <div><dt>Categoria</dt><dd>{CATEGORIAS[result.categoria] || result.categoria}</dd></div>
              <div><dt>Edição</dt><dd>{result.edicao}</dd></div>
              <div><dt>Horário</dt><dd>{new Date(result.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd></div>
              <div><dt>Crachá</dt><dd>{result.cracha === 'entregue' ? 'Já entregue' : 'Disponível para retirada'}</dd></div>
            </dl>
          </>
        )}
      </section>
    </main>
  );
}
