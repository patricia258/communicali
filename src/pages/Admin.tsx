/* Área administrativa: login por link no e-mail. Quem não está em public.admins não entra; o banco repete essa regra. */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AdminFormsPage } from '../forms/AdminFormsPage';
import { downloadXlsx } from '../forms/formExports';
import { slugify } from '../forms/formModel';
import { MembersPanel, PollsPanel, TextsPanel, exportPresencasCsv } from './AdminPrograma';
import { GuestsPanel } from './Convidados';
import './admin.css';

type Edition = { id: string; capacidade: number | null; checkin_abre: string; checkin_fecha: string; slug: string; numero: number | null; titulo: string; selo: string; data_evento: string; horario: string; local: string; cidade: string; endereco: string | null; capa_url: string | null; resumo: string | null; fotos_url: string | null; inscricao_url: string | null; publica: boolean };
type Photo = { id: string; url: string; legenda: string | null; no_carrossel: boolean };
type Partner = { id: string; nome: string; logo_url: string | null; site_url: string | null; ativo: boolean; ordem: number };
type Attendee = { id: string; checked_in_at: string; codigo: string; origem: string; members: { nome: string; email: string; whatsapp: string | null; empresa: string | null; cargo: string | null; categoria: string; autoriza_imagem: boolean } };

const localTime = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

async function uploadImage(file: File, folder: string) {
  const name = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60);
  const path = `${folder}/${crypto.randomUUID()}-${name}`;
  const { error } = await supabase.storage.from('site').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('site').getPublicUrl(path).data.publicUrl;
}

function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    const { error: failure } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (failure) setError('Não foi possível enviar o link. Confira o e-mail ou tente de novo em alguns minutos.');
    else setSent(true);
  }

  return (
    <main className="event-page">
      <section className="event-card">
        <img className="login__logo" src="/brand/communicali-bordo.png" alt="CommuniCALI" />
        <h1>Área administrativa</h1>
        {sent ? <p className="notice">Enviamos um link de acesso para {email}. Abra pelo e-mail neste mesmo navegador.</p> : (
          <form className="form" onSubmit={submit}>
            <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            {error && <p className="notice notice--alert">{error}</p>}
            <button className="button" type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Receber link de acesso'}</button>
          </form>
        )}
      </section>
    </main>
  );
}

function EditionsPanel() {
  const [list, setList] = useState<Edition[]>([]);
  const [open, setOpen] = useState<Edition | null>(null);
  const [error, setError] = useState('');
  const load = () => supabase.from('editions').select('*').order('data_evento', { ascending: false }).then(({ data, error: failure }) => { if (failure) setError(failure.message); else setList((data || []) as Edition[]); });
  useEffect(() => { void load(); }, []);

  async function create() {
    const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const numero = Math.max(0, ...list.map((item) => item.numero || 0)) + 1;
    const titulo = `${numero}ª edição`;
    const { data, error: failure } = await supabase.from('editions').insert({ slug: slugify(`edicao-${numero}`), numero, titulo, selo: titulo, data_evento: date, horario: '9h às 12h', local: 'A definir', cidade: 'Curitiba', checkin_abre: `${date} 07:00-03`, checkin_fecha: `${date} 13:00-03`, publica: false }).select('*').single();
    if (failure) setError(failure.message); else { await load(); setOpen(data as Edition); }
  }

  if (open) return <EditionEditor key={open.id} edition={open} onBack={() => { setOpen(null); void load(); }} />;
  return (
    <>
      <div className="wf-head"><div><small>ÁREA ADMINISTRATIVA</small><h1>Edições</h1><p>Dados do encontro, capa, resumo, fotos e lista de presença.</p></div><div className="v2-head-actions"><button type="button" className="wf-primary" onClick={() => void create()}>Nova edição</button></div></div>
      {error && <p className="inline-notice">{error}</p>}
      <div className="adm-list">
        {list.map((item) => (
          <button type="button" className="adm-row" key={item.id} onClick={() => setOpen(item)}>
            <strong>{item.titulo}</strong>
            <span>{item.data_evento.split('-').reverse().join('/')} · {item.local}</span>
            <em>{item.publica ? 'No site' : 'Fora do site'}</em>
          </button>
        ))}
      </div>
    </>
  );
}

function EditionEditor({ edition, onBack }: { edition: Edition; onBack: () => void }) {
  const [draft, setDraft] = useState(edition);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [people, setPeople] = useState<Attendee[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (next: Partial<Edition>) => { setDraft({ ...draft, ...next }); setNote(''); };
  const text = (key: keyof Edition, label: string, hint?: string) => (
    <label><span>{label}{hint && <em> {hint}</em>}</span><input value={String(draft[key] ?? '')} onChange={(event) => set({ [key]: event.target.value } as Partial<Edition>)} /></label>
  );

  const loadPhotos = () => supabase.from('edition_photos').select('id,url,legenda,no_carrossel').eq('edition_id', edition.id).order('ordem').then(({ data }) => setPhotos((data || []) as Photo[]));
  const loadPeople = () => supabase.from('checkins').select('id,checked_in_at,codigo,origem,members(nome,email,whatsapp,empresa,cargo,categoria,autoriza_imagem)').eq('edition_id', edition.id).order('checked_in_at').then(({ data }) => setPeople((data || []) as unknown as Attendee[]));
  useEffect(() => { void loadPhotos(); void loadPeople(); }, []);

  async function save() {
    setBusy(true);
    const { id, slug, ...fields } = draft;
    const clean = { ...fields, endereco: fields.endereco || null, resumo: fields.resumo || null, fotos_url: fields.fotos_url || null, inscricao_url: fields.inscricao_url || null };
    const { error } = await supabase.from('editions').update(clean).eq('id', id);
    setBusy(false);
    setNote(error ? `Não foi possível salvar: ${error.message}` : `Alterações salvas em ${slug}.`);
  }

  async function cover(file?: File) {
    if (!file) return;
    setBusy(true);
    try { set({ capa_url: await uploadImage(file, `edicoes/${edition.slug}`) }); } catch { setNote('Não foi possível enviar a imagem.'); }
    setBusy(false);
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setNote('');
    try {
      for (const [index, file] of [...files].entries()) {
        const url = await uploadImage(file, `edicoes/${edition.slug}`);
        await supabase.from('edition_photos').insert({ edition_id: edition.id, url, ordem: photos.length + index });
      }
      await loadPhotos();
    } catch { setNote('Não foi possível enviar todas as fotos.'); }
    setBusy(false);
  }

  async function togglePhoto(photo: Photo) {
    await supabase.from('edition_photos').update({ no_carrossel: !photo.no_carrossel }).eq('id', photo.id);
    await loadPhotos();
  }

  async function removePhoto(photo: Photo) {
    if (!window.confirm('Tirar esta foto do site?')) return;
    await supabase.from('edition_photos').delete().eq('id', photo.id);
    await loadPhotos();
  }

  async function removeCheckin(person: Attendee) {
    if (!window.confirm(`Tirar a presença de ${person.members.nome}? Os pontos desta edição saem junto.`)) return;
    const { data: row } = await supabase.from('checkins').select('member_id').eq('id', person.id).single();
    await supabase.from('point_events').delete().eq('member_id', row?.member_id).eq('edition_id', edition.id).eq('acao', 'presenca');
    await supabase.from('checkins').delete().eq('id', person.id);
    await loadPeople();
  }

  async function manualCheckin() {
    const email = window.prompt('E-mail do membro para registrar a presença:');
    if (!email || !window.confirm(`Registrar presença de ${email} em ${edition.titulo}? Soma 10 pontos se ainda não tiver presença.`)) return;
    const { error } = await supabase.rpc('admin_checkin_manual', { p_edition: edition.id, p_email: email });
    setNote(error ? error.message : 'Presença registrada.');
    await loadPeople();
  }

  function exportCsv() {
    exportPresencasCsv(edition.slug, [['Horário', 'Nome', 'E-mail', 'WhatsApp', 'Empresa', 'Cargo', 'Categoria', 'Código', 'Origem', 'Autoriza imagem'],
      ...people.map((person) => [new Date(person.checked_in_at).toLocaleString('pt-BR'), person.members.nome, person.members.email, person.members.whatsapp || '', person.members.empresa || '', person.members.cargo || '', person.members.categoria, person.codigo, person.origem, person.members.autoriza_imagem ? 'Sim' : 'Não'])]);
  }

  function exportPeople() {
    downloadXlsx(`communicali-${edition.slug}-presencas.xlsx`, 'Presenças', ['Horário', 'Nome', 'E-mail', 'WhatsApp', 'Empresa', 'Cargo', 'Categoria', 'Autoriza imagem'],
      people.map((person) => [new Date(person.checked_in_at).toLocaleString('pt-BR'), person.members.nome, person.members.email, person.members.whatsapp || '', person.members.empresa || '', person.members.cargo || '', person.members.categoria, person.members.autoriza_imagem ? 'Sim' : 'Não']));
  }

  const origin = window.location.origin;
  return (
    <>
      <button type="button" className="v2-forms-back" onClick={onBack}>Voltar para edições</button>
      <div className="wf-head"><div><small>EDIÇÃO</small><h1>{draft.titulo}</h1></div><div className="v2-head-actions"><button type="button" className="wf-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar alterações'}</button></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <div className="v2-forms-grid">
          {text('titulo', 'Título')}
          {text('selo', 'Selo', 'aparece na tela do check-in')}
          <label><span>Data</span><input type="date" value={draft.data_evento} onChange={(event) => set({ data_evento: event.target.value })} /></label>
          {text('horario', 'Horário')}
          {text('local', 'Local')}
          {text('endereco', 'Endereço')}
          {text('cidade', 'Cidade')}
          <label><span>Capacidade <em>opcional</em></span><input inputMode="numeric" value={draft.capacidade ?? ''} onChange={(event) => set({ capacidade: event.target.value ? Number(event.target.value) || null : null })} /></label>
          <label><span>Check-in abre</span><input type="datetime-local" value={localTime(draft.checkin_abre)} onChange={(event) => set({ checkin_abre: new Date(event.target.value).toISOString() })} /></label>
          <label><span>Check-in fecha</span><input type="datetime-local" value={localTime(draft.checkin_fecha)} onChange={(event) => set({ checkin_fecha: new Date(event.target.value).toISOString() })} /></label>
          {text('inscricao_url', 'Link de inscrição', 'vazio mostra inscrições encerradas')}
          {text('fotos_url', 'Link para baixar as fotos', 'por exemplo, a pasta do Drive')}
          <label className="v2-forms-check"><input type="checkbox" checked={draft.publica} onChange={(event) => set({ publica: event.target.checked })} /><span><strong>Mostrar no site</strong></span></label>
          <label className="wide"><span>Resumo do encontro</span><textarea rows={5} value={draft.resumo || ''} onChange={(event) => set({ resumo: event.target.value })} /></label>
        </div>
      </section>
      <section className="v2-forms-card">
        <header><small>IMAGENS</small><h2>Capa e fotos do carrossel</h2></header>
        <div className="adm-cover">
          {draft.capa_url && <img src={draft.capa_url} alt="Capa da edição" />}
          <label className="wf-secondary">{draft.capa_url ? 'Trocar a capa' : 'Enviar a capa'}<input type="file" accept="image/*" hidden onChange={(event) => void cover(event.target.files?.[0])} /></label>
          <label className="wf-secondary">Adicionar fotos<input type="file" accept="image/*" multiple hidden onChange={(event) => void addPhotos(event.target.files)} /></label>
        </div>
        <p className="adm-hint">Publique só fotos de quem autorizou o uso de imagem. A lista de presença abaixo mostra quem autorizou.</p>
        <div className="adm-photos">
          {photos.map((photo) => (
            <figure key={photo.id}>
              <img src={photo.url} alt="" />
              <label><input type="checkbox" checked={photo.no_carrossel} onChange={() => void togglePhoto(photo)} /> No carrossel</label>
              <button type="button" onClick={() => void removePhoto(photo)}>Tirar do site</button>
            </figure>
          ))}
        </div>
      </section>
      <section className="v2-forms-card">
        <header><small>PRESENÇAS</small><h2>{people.length} {people.length === 1 ? 'check-in' : 'check-ins'}</h2></header>
        <div className="adm-links">
          <a className="wf-secondary" href={`${origin}/telao/checkin?edicao=${edition.slug}`} target="_blank" rel="noopener noreferrer">Telão do check-in</a>
          <a className="wf-secondary" href={`${origin}/telao/votacao?edicao=${edition.slug}`} target="_blank" rel="noopener noreferrer">Telão da votação</a>
          <button type="button" className="wf-secondary" onClick={() => void manualCheckin()}>Registrar presença</button>
          <button type="button" className="wf-secondary" disabled={!people.length} onClick={exportCsv}>Exportar CSV</button>
          <button type="button" className="wf-secondary" disabled={!people.length} onClick={exportPeople}>Exportar Excel</button>
        </div>
        <div className="adm-list">
          {people.map((person) => (
            <div className="adm-row adm-row--static" key={person.id}>
              <strong>{person.members.nome}</strong>
              <span>{person.members.email} · {person.codigo}{person.members.autoriza_imagem ? ' · autoriza imagem' : ' · sem autorização de imagem'}</span>
              <button type="button" onClick={() => void removeCheckin(person)}>Tirar presença</button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function PartnersPanel() {
  const [list, setList] = useState<Partner[]>([]);
  const [nome, setNome] = useState('');
  const [site, setSite] = useState('');
  const [logo, setLogo] = useState<File | undefined>();
  const [error, setError] = useState('');
  const load = () => supabase.from('partners').select('*').order('ordem').then(({ data }) => setList((data || []) as Partner[]));
  useEffect(() => { void load(); }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const logo_url = logo ? await uploadImage(logo, 'parceiros') : null;
      const { error: failure } = await supabase.from('partners').insert({ nome: nome.trim(), site_url: site.trim() || null, logo_url, ordem: list.length });
      if (failure) throw failure;
      setNome(''); setSite(''); setLogo(undefined); (event.target as HTMLFormElement).reset();
      await load();
    } catch { setError('Não foi possível salvar o parceiro.'); }
  }

  return (
    <>
      <div className="wf-head"><div><small>ÁREA ADMINISTRATIVA</small><h1>Parceiros</h1><p>Cadastre aqui só parceiros confirmados: tudo o que estiver ativo aparece no site.</p></div></div>
      {error && <p className="inline-notice">{error}</p>}
      <section className="v2-forms-card">
        <form className="v2-forms-grid" onSubmit={(event) => void add(event)}>
          <label><span>Nome</span><input required value={nome} onChange={(event) => setNome(event.target.value)} /></label>
          <label><span>Site <em>opcional</em></span><input value={site} placeholder="https://" onChange={(event) => setSite(event.target.value)} /></label>
          <label><span>Logo</span><input type="file" accept="image/*" onChange={(event) => setLogo(event.target.files?.[0])} /></label>
          <div className="adm-submit"><button type="submit" className="wf-primary">Adicionar parceiro</button></div>
        </form>
      </section>
      <div className="adm-list">
        {list.map((partner) => (
          <div className="adm-row adm-row--static" key={partner.id}>
            <strong>{partner.nome}</strong>
            <span>{partner.ativo ? 'No site' : 'Fora do site'}</span>
            <button type="button" onClick={() => void supabase.from('partners').update({ ativo: !partner.ativo }).eq('id', partner.id).then(load)}>{partner.ativo ? 'Tirar do site' : 'Voltar ao site'}</button>
          </div>
        ))}
      </div>
    </>
  );
}

function CounterPanel() {
  const [value, setValue] = useState('');
  const [checkins, setCheckins] = useState(0);
  const [note, setNote] = useState('');
  useEffect(() => {
    supabase.from('site_settings').select('membros_contador').single().then(({ data }) => setValue(data?.membros_contador == null ? '' : String(data.membros_contador)));
    supabase.from('members').select('id', { count: 'exact', head: true }).then(({ count }) => setCheckins(count || 0));
  }, []);

  async function save() {
    const number = value.trim() === '' ? null : Number(value);
    if (number !== null && (!Number.isInteger(number) || number < 0)) { setNote('Digite um número inteiro.'); return; }
    const { error } = await supabase.from('site_settings').update({ membros_contador: number, updated_at: new Date().toISOString() }).eq('id', true);
    setNote(error ? 'Não foi possível salvar.' : 'Contador salvo.');
  }

  return (
    <>
      <div className="wf-head"><div><small>ÁREA ADMINISTRATIVA</small><h1>Contador de membros</h1><p>Com o campo vazio, o site conta quem fez check-in em edições públicas. Com um número, mostra esse número. Em zero, o contador some.</p></div></div>
      <section className="v2-forms-card">
        <div className="v2-forms-grid">
          <label><span>Número no site</span><input inputMode="numeric" value={value} onChange={(event) => { setValue(event.target.value); setNote(''); }} /></label>
          <div className="adm-submit"><button type="button" className="wf-primary" onClick={() => void save()}>Salvar</button></div>
        </div>
        <p className="adm-hint">Cadastros registrados no banco: {checkins}.</p>
        {note && <p className="v2-forms-ok" role="status">{note}</p>}
      </section>
    </>
  );
}

function Frame({ session, children }: { session: Session; children: ReactNode }) {
  return (
    <div className="adm">
      <header className="adm__top">
        <NavLink to="/admin" className="adm__logo"><img src="/brand/communicali-bordo.png" alt="CommuniCALI" /></NavLink>
        <nav>
          <NavLink to="/admin/formularios">Formulários</NavLink>
          <NavLink to="/admin/membros">Membros</NavLink>
          <NavLink to="/admin/edicoes">Edições</NavLink>
          <NavLink to="/admin/convidados">Convidados</NavLink>
          <NavLink to="/admin/votacoes">Votações</NavLink>
          <NavLink to="/admin/parceiros">Parceiros</NavLink>
          <NavLink to="/admin/contador">Contador</NavLink>
          <NavLink to="/admin/textos">Textos</NavLink>
          <a href="/" target="_blank" rel="noopener noreferrer">Ver o site</a>
        </nav>
        <div className="adm__user"><span>{session.user.email}</span><button type="button" onClick={() => void supabase.auth.signOut()}>Sair</button></div>
      </header>
      <main className="adm__main ap-app v2-admin-page v2-forms v2-client-module"><div className="ap-content"><div className="wf">{children}</div></div></main>
    </div>
  );
}

export function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  // As regras copiadas do CALI Forms só valem com esta marca, a mesma que a moldura do app coloca na página.
  useEffect(() => {
    document.documentElement.dataset.workspaceUi = 'v2';
    return () => { delete document.documentElement.dataset.workspaceUi; };
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setAllowed(null); return; }
    void supabase.rpc('is_admin').then(({ data }) => setAllowed(Boolean(data)));
  }, [session]);

  if (session === undefined) return null;
  if (!session) return <Login />;
  if (allowed === null) return null;
  if (!allowed) return <main className="event-page"><section className="event-card"><h1>Sem acesso</h1><p>Este e-mail não tem acesso à área administrativa.</p><button type="button" className="button" onClick={() => void supabase.auth.signOut()}>Sair</button></section></main>;

  return (
    <Frame session={session}>
      <Routes>
        <Route index element={<Navigate to="formularios" replace />} />
        <Route path="formularios" element={<AdminFormsPage />} />
        <Route path="edicoes" element={<EditionsPanel />} />
        <Route path="parceiros" element={<PartnersPanel />} />
        <Route path="contador" element={<CounterPanel />} />
        <Route path="membros" element={<MembersPanel />} />
        <Route path="convidados" element={<GuestsPanel />} />
        <Route path="votacoes" element={<PollsPanel />} />
        <Route path="textos" element={<TextsPanel />} />
      </Routes>
    </Frame>
  );
}
