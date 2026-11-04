import { useEffect, useMemo, useState } from 'react';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import { useParams } from 'react-router-dom';
import { editionSlug, errorMessage, formatDate, supabase, type Edition } from '../lib';

type Step = 'email' | 'codigo' | 'dados';

export function Convidar() {
  const slug = editionSlug();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.rpc('communicali_edicao', { p_slug: slug }).then(({ data }) => setEdition(data as Edition | null));
  }, [slug]);

  const meta = edition ? `${edition.titulo} · ${formatDate(edition.data_evento)} · ${edition.local}` : '';
  const preset = useMemo<FormPreset>(() => {
    const base = { title: 'Indicar um convidado', category: 'ComuniCALI', skipWelcome: true };
    if (step === 'email') return {
      ...base, submitLabel: 'Receber código',
      questions: [{ id: 'email', kind: 'email', label: 'Qual é o seu e-mail de membro?', help: `${meta}\nA indicação não garante vaga. A organização confirma conforme a disponibilidade do encontro.`, required: true }],
      submit: async (answers) => {
        const clean = String(answers.email).trim().toLowerCase();
        const { error } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
        if (error) return 'Não conseguimos enviar o código agora. Tente de novo em alguns minutos.';
        setEmail(clean); setStep('codigo');
        return '';
      },
    };
    if (step === 'codigo') return {
      ...base, submitLabel: 'Continuar',
      questions: [{ id: 'codigo', kind: 'short_text', label: 'Digite o código que enviamos', help: `Confira o e-mail ${email}.`, required: true }],
      submit: async (answers) => {
        const { error } = await supabase.auth.verifyOtp({ email, token: String(answers.codigo).trim(), type: 'email' });
        if (error) return 'Código inválido ou vencido. Confira o e-mail e tente de novo.';
        setStep('dados');
        return '';
      },
    };
    return {
      ...base, submitLabel: 'Enviar indicação', successText: 'Indicação recebida. A organização vai avaliar e, se houver vaga, enviar o convite à pessoa.',
      questions: [
        { id: 'nome', kind: 'name', label: 'Qual é o nome do convidado?', required: true },
        { id: 'email', kind: 'email', label: 'Qual é o e-mail do convidado?', required: true },
      ],
      submit: async (answers) => {
        const { error } = await supabase.rpc('communicali_indicar', { p_slug: slug, p_nome: answers.nome, p_email: answers.email });
        await supabase.auth.signOut({ scope: 'local' });
        return error ? errorMessage(error) : '';
      },
    };
  }, [step, email, slug, meta]);

  return <PublicFormPage key={step} preset={preset} />;
}

type Invite = { nome: string; status: string; edicao: string; data_evento: string; horario: string; local: string; cidade: string; condicoes: string };

export function Convite() {
  const { token = '' } = useParams();
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    supabase.rpc('communicali_convite', { p_token: token }).then(({ data, error: failure }) => setInvite(failure ? null : data as Invite | null));
  }, [token]);

  async function accept() {
    const { error: failure } = await supabase.rpc('communicali_aceitar_convite', { p_token: token });
    if (failure) setError(errorMessage(failure));
    else setAccepted(true);
  }

  return (
    <main className="event-page">
      <section className="event-card">
        <p className="eyebrow">ComuniCALI</p>
        {invite === null && <><h1>Convite não encontrado</h1><p>Confira o link que você recebeu.</p></>}
        {invite && (
          <>
            <h1>{invite.nome}, você foi convidado</h1>
            <p className="event-card__meta">{invite.edicao} · {formatDate(invite.data_evento)} · {invite.horario} · {invite.local}, {invite.cidade}</p>
            {invite.condicoes && <p>{invite.condicoes}</p>}
            {accepted || ['inscrito', 'confirmado', 'presente'].includes(invite.status)
              ? <p className="notice">Inscrição registrada. No dia, faça o check-in pelo QR Code do telão.</p>
              : invite.status === 'convidado'
                ? <div className="form">
                    <label className="check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>Li e aceito as condições do encontro.</span></label>
                    {error && <p className="notice notice--alert">{error}</p>}
                    <button className="button" type="button" disabled={!checked} onClick={() => void accept()}>Confirmar minha inscrição</button>
                  </div>
                : <p className="notice">Este convite não está disponível para aceite.</p>}
          </>
        )}
      </section>
    </main>
  );
}

const STATUS = ['indicado', 'convidado', 'inscrito', 'confirmado', 'presente', 'ausente', 'cancelado'];
const STATUS_LABEL: Record<string, string> = { indicado: 'Indicado', convidado: 'Convidado', inscrito: 'Inscrito', confirmado: 'Confirmado', presente: 'Presente', ausente: 'Ausente', cancelado: 'Cancelado' };
type GuestRow = { id: string; nome: string; email: string; status: string; token: string; member_id: string; members: { nome: string } };
type EditionRow = { id: string; slug: string; titulo: string; limite_convidados: number; condicoes_convite: string };

export function GuestsPanel() {
  const [editions, setEditions] = useState<EditionRow[]>([]);
  const [current, setCurrent] = useState('');
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState('');
  const edition = editions.find((item) => item.id === current);

  const loadEditions = () => supabase.from('editions').select('id,slug,titulo,limite_convidados,condicoes_convite').order('data_evento', { ascending: false }).then(({ data }) => {
    const rows = (data || []) as EditionRow[];
    setEditions(rows); setCurrent((id) => id || rows[0]?.id || '');
  });
  const loadGuests = () => {
    if (!current) return;
    supabase.from('guests').select('id,nome,email,status,token,member_id,members(nome)').eq('edition_id', current).order('created_at').then(({ data }) => setGuests((data || []) as unknown as GuestRow[]));
    supabase.from('point_events').select('pontos').eq('edition_id', current).like('acao', 'convidado:%').then(({ data }) => setPoints((data || []).reduce((sum, row) => sum + row.pontos, 0)));
  };
  useEffect(() => { void loadEditions(); }, []);
  useEffect(loadGuests, [current]);

  async function saveEdition() {
    if (!edition) return;
    const { error } = await supabase.from('editions').update({ limite_convidados: edition.limite_convidados, condicoes_convite: edition.condicoes_convite }).eq('id', edition.id);
    setNote(error ? 'Não foi possível salvar.' : 'Alterações salvas.');
  }

  async function setStatus(guest: GuestRow, status: string) {
    await supabase.from('guests').update({ status }).eq('id', guest.id);
    loadGuests();
  }

  const patch = (next: Partial<EditionRow>) => setEditions(editions.map((item) => item.id === current ? { ...item, ...next } : item));
  const count = (status: string) => guests.filter((guest) => guest.status === status).length;
  const origin = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const guest of guests) totals[guest.members.nome] = (totals[guest.members.nome] || 0) + 1;
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [guests]);
  const site = window.location.origin;

  return (
    <>
      <div className="wf-head"><div><small>ÁREA ADMINISTRATIVA</small><h1>Convidados</h1><p>Indicações por encontro. A milha de quem indicou só entra depois do check-in do convidado.</p></div>
        <div className="v2-head-actions"><select aria-label="Encontro" value={current} onChange={(event) => setCurrent(event.target.value)}>{editions.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <div className="adm-stats">
          <p><strong>{guests.length}</strong> indicações</p>
          <p><strong>{count('presente')}</strong> presentes</p>
          <p><strong>{points}</strong> milhas atribuídas</p>
          <p><strong>{edition?.limite_convidados ?? 0}</strong> por membro</p>
        </div>
        {edition && (
          <div className="v2-forms-grid">
            <label><span>Limite de convidados por membro</span><input inputMode="numeric" value={edition.limite_convidados} onChange={(event) => patch({ limite_convidados: Number(event.target.value.replace(/\D/g, '')) || 0 })} /></label>
            <label><span>Link para os membros indicarem</span><input readOnly value={`${site}/convidar?edicao=${edition.slug}`} onFocus={(event) => event.target.select()} /></label>
            <label className="wide"><span>Condições que o convidado aceita</span><textarea rows={3} value={edition.condicoes_convite} onChange={(event) => patch({ condicoes_convite: event.target.value })} /></label>
            <div className="adm-submit"><button type="button" className="wf-primary" onClick={() => void saveEdition()}>Salvar alterações</button></div>
          </div>
        )}
      </section>
      {origin.length > 0 && <p className="adm-hint">Origem das indicações: {origin.map(([nome, total]) => `${nome} (${total})`).join(', ')}.</p>}
      <div className="adm-list">
        {guests.map((guest) => (
          <div className="adm-row adm-row--static" key={guest.id}>
            <strong>{guest.nome}</strong>
            <span>{guest.email} · indicado por {guest.members.nome}</span>
            <button type="button" onClick={() => { void navigator.clipboard.writeText(`${site}/convite/${guest.token}`); setNote('Link do convite copiado.'); }}>Copiar convite</button>
            <select className="adm-status" aria-label="Status" value={guest.status} onChange={(event) => void setStatus(guest, event.target.value)}>{STATUS.map((item) => <option key={item} value={item}>{STATUS_LABEL[item]}</option>)}</select>
          </div>
        ))}
        {!guests.length && <p className="adm-hint">Nenhuma indicação neste encontro.</p>}
      </div>
    </>
  );
}
