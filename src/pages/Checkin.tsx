import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { IdCard } from 'lucide-react';
import { editionSlug, errorMessage, formatDate, supabase, type Edition } from '../lib';
import { answerArgs, confirmQuestions, memberQuestions, useSiteTexts } from './MemberFields';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import '../dinamica/dinamica.css';

type Junto = { id: string; tipo: string; nome: string; chegou: boolean };
type Done = { nome: string; categoria: string; edicao: string; selo: string; codigo: string; repetido: boolean; junto?: Junto[] };

const juntarNomes = (nomes: string[]) => nomes.join(', ').replace(/, ([^,]*)$/, ' e $1');

/** Kids e acompanhantes ligados a quem fez o check-in: a pessoa marca só quem está com ela agora. */
function QuemVeio({ codigo, junto }: { codigo: string; junto: Junto[] }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [feito, setFeito] = useState<string[] | null>(junto.every((item) => item.chegou) ? junto.map((item) => item.nome) : null);
  const [erro, setErro] = useState('');
  const pendentes = junto.filter((item) => !item.chegou);
  async function confirmar() {
    setErro('');
    const { data, error } = await supabase.rpc('communicali_confirmar_junto', { p_codigo: codigo, p_ids: [...marcados] });
    if (error) { setErro('Não foi possível registrar agora. Avise a equipe na recepção.'); return; }
    setFeito([...junto.filter((item) => item.chegou).map((item) => item.nome), ...((data as { nomes: string[] }).nomes || [])]);
  }
  if (feito) return <p className="pass__hint">{feito.length ? <>Chegada registrada também para <strong>{juntarNomes(feito)}</strong>.</> : 'Combinado: só a sua presença foi registrada.'}</p>;
  return (
    <div className="pass__junto">
      <p><strong>Quem está com você agora?</strong> Marque só quem veio.</p>
      {pendentes.map((item) => (
        <label key={item.id}><input type="checkbox" checked={marcados.has(item.id)} onChange={() => setMarcados((atual) => { const novo = new Set(atual); if (novo.has(item.id)) novo.delete(item.id); else novo.add(item.id); return novo; })} /> {item.nome}{item.tipo === 'kids' ? ' (kids)' : ''}</label>
      ))}
      <button type="button" className="button" onClick={() => void confirmar()}>{marcados.size ? `Confirmar ${marcados.size === 1 ? 'chegada' : `${marcados.size} chegadas`}` : 'Ninguém veio comigo'}</button>
      {erro && <p className="notice notice--alert">{erro}</p>}
    </div>
  );
}
type Step = 'email' | 'novo' | 'codigo' | 'inscrito';

export const CATEGORIAS: Record<string, string> = { fundadora: 'Fundadora', membro: 'Membro', conector: 'Conector', embaixador: 'Embaixador', convidado: 'Convidado', organizador: 'Organizador', kids: 'Kids' };

function Success({ done }: { done: Done }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/validar/${done.codigo}`, { width: 320, margin: 1, color: { dark: '#5A1E2D', light: '#FFFFFF' } }).then(setQr);
  }, [done.codigo]);
  return (
    <main className="dn-pg">
      <div className="dn-pg-faixa" />
      <img className="dn-pg-logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" />
      <div className="dn-pg-corpo">
        <section className="dn-bilhete">
          <p className="dn-bilhete__etapa">Check-in feito</p>
          <h1>Presença confirmada!</h1>
          <p className="dn-bilhete__texto">Que bom ter você aqui. Você faz parte da ComuniCALI.</p>
          {!!done.junto?.length && <QuemVeio codigo={done.codigo} junto={done.junto} />}
          <p className="dn-bilhete__texto">{done.repetido ? 'Sua presença neste encontro já estava registrada.' : 'Você conquistou 10 milhas pela participação neste encontro.'}</p>
          <dl className="dn-dados">
            <div><dt>Nome</dt><dd>{done.nome}</dd></div>
            <div><dt>Categoria</dt><dd>{CATEGORIAS[done.categoria] || done.categoria}</dd></div>
            <div><dt>Edição</dt><dd>{done.edicao}</dd></div>
            <div><dt>Código</dt><dd>{done.codigo}</dd></div>
          </dl>
          {qr && <img className="dn-bilhete__qr" src={qr} alt="QR Code para a organização validar sua presença" />}
          <div className="dn-bilhete__aviso"><IdCard size={26} aria-hidden="true" /><p><strong>Agora é só levantar a mão.</strong> Você recebe o seu crachá na mesa.</p></div>
        </section>
      </div>
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
  const [inscritoNome, setInscritoNome] = useState('');
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
      title: 'Check-in', category: 'ComuniCALI', tema: 'claro', skipWelcome: true, submitLabel: 'Fazer meu check-in',
      questions: [{ id: 'email', kind: 'email', label: 'Bem-vindas e bem-vindos! Qual é o seu e-mail?', help: `Sinta-se à vontade e escolha uma mesa. Use o e-mail da sua inscrição. ${meta}`, required: true }],
      submit: async (answers) => {
        const clean = String(answers.email).trim().toLowerCase();
        const { data, error } = await supabase.rpc('communicali_situacao_email', { p_slug: slug, p_email: clean });
        if (error) return errorMessage(error);
        setEmail(clean);
        const situacao = data as { membro: boolean; inscrito: boolean; nome?: string };
        if (situacao.inscrito) { setInscritoNome(situacao.nome || ''); setStep('inscrito'); return ''; }
        if (!situacao.membro) { setStep('novo'); return ''; }
        const { error: sendFailure } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
        if (sendFailure) return 'Não conseguimos enviar o código agora. Procure a organização na recepção para registrar sua presença.';
        setStep('codigo');
        return '';
      },
    };
    if (step === 'codigo') return {
      title: 'Check-in', category: 'ComuniCALI', tema: 'claro', skipWelcome: true, submitLabel: 'Confirmar presença',
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
    if (step === 'inscrito') return {
      title: 'Check-in', category: 'ComuniCALI', tema: 'claro', skipWelcome: true, submitLabel: 'Confirmar presença',
      questions: confirmQuestions(texts, inscritoNome),
      submit: async (answers) => {
        const { data, error } = await supabase.rpc('communicali_checkin_inscrito', { p_slug: slug, p_email: email, p_privacidade: answers.privacidade === 'Li e aceito', p_regras: answers.regras === 'Li e aceito', p_comunicacoes: answers.comunicacoes === 'Sim', p_imagem: answers.imagem === 'Sim' });
        if (error) return errorMessage(error);
        setDone(data as Done);
        return '';
      },
    };
    return {
      title: 'Check-in', category: 'ComuniCALI', tema: 'claro', skipWelcome: true, submitLabel: 'Confirmar presença',
      questions: memberQuestions(texts, { imagem: true }),
      submit: async (answers) => {
        const { data, error } = await supabase.rpc('communicali_checkin_novo', { p_slug: slug, ...answerArgs(answers, email), p_imagem: answers.imagem === 'Sim' });
        if (error) return errorMessage(error);
        setDone(data as Done);
        return '';
      },
    };
  }, [step, email, slug, meta, texts, inscritoNome]);

  if (done) return <Success done={done} />;
  if (edition?.situacao === 'aberto' && preset) return <PublicFormPage key={step} preset={preset} />;
  if (!edition && !loadError) return <main className="dn-pg" aria-busy="true" />;

  return (
    <main className="dn-pg">
      <div className="dn-pg-faixa" />
      <img className="dn-pg-logo" src="/brand/communicali-horizontal.png" alt="ComuniCALI" />
      <div className="dn-centro">
        <h1>Bem-vindas e bem-vindos!</h1>
        {loadError && <p className="dn-aviso alerta">{loadError}</p>}
        {edition && <p>{meta}</p>}
        {edition?.situacao === 'antes' && <p className="dn-aviso">O check-in abre no dia do encontro. Até lá!</p>}
        {edition?.situacao === 'encerrado' && <p className="dn-aviso">O check-in desta edição foi encerrado.</p>}
      </div>
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
