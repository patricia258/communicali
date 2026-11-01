import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { editionSlug, errorMessage, formatDate, supabase, type Edition } from '../lib';
import { answerArgs, memberQuestions, useSiteTexts } from './MemberFields';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';

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
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    supabase.rpc('communicali_edicao', { p_slug: slug }).then(({ data, error: failure }) => {
      if (failure || !data) setLoadError('Não foi possível abrir o check-in. Recarregue a página.');
      else setEdition(data as Edition);
    });
  }, [slug]);

  const meta = edition ? `${edition.titulo} · ${formatDate(edition.data_evento)} · ${edition.local}` : '';

  const preset = useMemo<FormPreset | null>(() => {
    if (step === 'email') return {
      title: 'Check-in', category: 'CommuniCALI', skipWelcome: true, submitLabel: 'Continuar',
      questions: [{ id: 'email', kind: 'email', label: 'Qual é o seu e-mail?', help: meta, required: true }],
      submit: async (answers) => {
        const clean = String(answers.email).trim().toLowerCase();
        const { data, error } = await supabase.rpc('communicali_situacao_email', { p_slug: slug, p_email: clean });
        if (error) return errorMessage(error);
        setEmail(clean);
        if (!(data as { membro: boolean }).membro) { setStep('novo'); return ''; }
        const { error: sendFailure } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
        if (sendFailure) return 'Não conseguimos enviar o código agora. Procure a organização na recepção para registrar sua presença.';
        setStep('codigo');
        return '';
      },
    };
    if (step === 'codigo') return {
      title: 'Check-in', category: 'CommuniCALI', skipWelcome: true, submitLabel: 'Confirmar presença',
      questions: [{ id: 'codigo', kind: 'short_text', label: 'Digite o código que enviamos', help: `Confira o e-mail ${email}.`, required: true }],
      submit: async (answers) => {
        const { error } = await supabase.auth.verifyOtp({ email, token: String(answers.codigo).trim(), type: 'email' });
        if (error) return 'Código inválido ou vencido. Confira o e-mail e tente de novo.';
        const { data, error: checkinFailure } = await supabase.rpc('communicali_checkin_membro', { p_slug: slug });
        await supabase.auth.signOut({ scope: 'local' });
        if (checkinFailure) return errorMessage(checkinFailure);
        setDone(data as Done);
        return '';
      },
    };
    if (!texts) return null;
    return {
      title: 'Check-in', category: 'CommuniCALI', skipWelcome: true, submitLabel: 'Confirmar presença',
      questions: memberQuestions(texts, { imagem: true }),
      submit: async (answers) => {
        const { data, error } = await supabase.rpc('communicali_checkin_novo', { p_slug: slug, ...answerArgs(answers, email), p_imagem: answers.imagem === 'Sim' });
        if (error) return errorMessage(error);
        setDone(data as Done);
        return '';
      },
    };
  }, [step, email, slug, meta, texts]);

  if (done) return <Success done={done} />;
  if (edition?.situacao === 'aberto' && preset) return <PublicFormPage key={step} preset={preset} />;

  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">CommuniCALI</p>
        <h1>Check-in</h1>
        {loadError && <p className="notice notice--alert">{loadError}</p>}
        {edition && <p className="event-card__meta">{meta}</p>}
        {edition?.situacao === 'antes' && <p className="notice">O check-in abre no dia do encontro.</p>}
        {edition?.situacao === 'encerrado' && <p className="notice">O check-in desta edição foi encerrado.</p>}
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
