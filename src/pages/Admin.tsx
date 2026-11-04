/* Área administrativa: login por link no e-mail. Quem não está em public.admins não entra; o banco repete essa regra. */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AdminFormsPage } from '../forms/AdminFormsPage';
import { downloadXlsx } from '../forms/formExports';
import { slugify } from '../forms/formModel';
import { MembersPanel, PollsPanel, TextsPanel, exportPresencasCsv } from './AdminPrograma';
import { GuestsPanel } from './Convidados';
import { HomePanel, ProgramPanel } from './AdminInicio';
import { StaffPanel } from './Staff';
import { FornecedorPanel } from './Fornecedor';
import { EmailsCard, chamar } from './AdminEmails';
import { ImpactosPanel, IndicacoesPanel, MatchesPanel, RecommendationsPanel } from './AdminRecomendacoes';
import { Email, Tabela, Telefone, dataBr, type Coluna } from './AdminTabela';
import { AdminRedeExtras } from './AdminRedeExtras';
import './admin.css';

type Edition = { limite_convidados?: number; inscricoes_abertas: boolean; lembrete_ativo: boolean; id: string; capacidade: number | null; checkin_abre: string; checkin_fecha: string; slug: string; numero: number | null; titulo: string; selo: string; data_evento: string; horario: string; local: string; cidade: string; endereco: string | null; capa_url: string | null; resumo: string | null; fotos_url: string | null; inscricao_url: string | null; publica: boolean };
type Photo = { id: string; url: string; legenda: string | null; no_carrossel: boolean };
type Partner = { id: string; nome: string; logo_url: string | null; site_url: string | null; ativo: boolean; ordem: number };
type Attendee = { id: string; checked_in_at: string; codigo: string; origem: string; members: { nome: string; email: string; whatsapp: string | null; empresa: string | null; cargo: string | null; categoria: string; autoriza_imagem: boolean } };

const localTime = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** Recorta o fundo pela cor dos cantos e devolve o logo branco e transparente, como na faixa do site. */
async function logoBranco(file: File) {
  const imagem = await createImageBitmap(file);
  const tela = document.createElement('canvas');
  tela.width = imagem.width;
  tela.height = imagem.height;
  const contexto = tela.getContext('2d', { willReadFrequently: true })!;
  contexto.drawImage(imagem, 0, 0);
  const quadro = contexto.getImageData(0, 0, tela.width, tela.height);
  const pixels = quadro.data;
  const canto = (x: number, y: number) => { const i = (y * tela.width + x) * 4; return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]]; };
  const cantos = [canto(4, 4), canto(tela.width - 5, 4), canto(4, tela.height - 5), canto(tela.width - 5, tela.height - 5)];
  const transparente = cantos.every((item) => item[3] < 20);
  const escuro = cantos.reduce((soma, item) => soma + item[0] + item[1] + item[2], 0) / 12 < 128;
  const [inicio, fim] = escuro ? [95, 170] : [30, 110];
  for (let i = 0; i < pixels.length; i += 4) {
    const distancia = Math.min(...cantos.map((item) => Math.hypot(pixels[i] - item[0], pixels[i + 1] - item[1], pixels[i + 2] - item[2])));
    const alfa = transparente ? pixels[i + 3] : Math.max(0, Math.min(1, (distancia - inicio) / (fim - inicio))) * 255;
    pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = alfa;
  }
  contexto.putImageData(quadro, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => tela.toBlob((item) => (item ? resolve(item) : reject(new Error('logo'))), 'image/png'));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' });
}

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
  const [codigo, setCodigo] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    const { error: failure } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (failure) setError('Não foi possível enviar o código. Confira o e-mail ou tente de novo em alguns minutos.');
    else setSent(true);
  }

  // O e-mail traz um código de 6 números; o acesso só abre para quem está na lista da organização.
  async function confirmar(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    const { error: failure } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo.trim(), type: 'email' });
    setBusy(false);
    if (failure) setError('Código inválido ou vencido. Confira o último e-mail ou peça um novo código.');
  }

  return (
    <main className="adm-login">
      <section className="adm-login__marca">
        <img className="adm-login__logo" src="/brand/communicali-branco.png" alt="ComuniCALI" />
        <div>
          <p className="adm-login__eyebrow">Painel da organização</p>
          <h1>Bastidores da <em>ComuniCALI</em></h1>
          <ul>
            <li><span>01</span>Edições, check-in e votação</li>
            <li><span>02</span>Pessoas, indicações e conexões</li>
            <li><span>03</span>Formulários, parceiros e e-mails</li>
          </ul>
        </div>
        <img className="adm-login__selo" src="/selos/carimbo-fundadora.png" alt="" aria-hidden="true" />
      </section>
      <section className="adm-login__acesso">
        <h2>Entrar no painel</h2>
        {sent ? (
          <form onSubmit={confirmar}>
            <p className="adm-login__ok">Enviamos um código de 6 números para <strong>{email}</strong>.</p>
            <label>Código do e-mail<input inputMode="numeric" autoComplete="one-time-code" required maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={codigo} onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ''))} /></label>
            {error && <p className="adm-login__erro" role="alert">{error}</p>}
            <button type="submit" disabled={busy || codigo.length < 6}>{busy ? 'Entrando...' : 'Entrar no painel'}</button>
            <button type="button" className="adm-login__outro" onClick={() => { setSent(false); setCodigo(''); setError(''); }}>Usar outro e-mail ou pedir novo código</button>
          </form>
        ) : (
          <form onSubmit={submit}>
            <p>Use o e-mail cadastrado na organização. Você recebe um código de 6 números para entrar.</p>
            <label>E-mail<input type="email" required autoComplete="email" placeholder="voce@calirh.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            {error && <p className="adm-login__erro" role="alert">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Receber código de acesso'}</button>
          </form>
        )}
        <a className="adm-login__voltar" href="/meu-passaporte">Sou membro, quero meu passaporte</a>
      </section>
    </main>
  );
}

function EditionsPanel() {
  const [list, setList] = useState<Edition[]>([]);
  const [open, setOpen] = useState<Edition | null>(null);
  const [error, setError] = useState('');
  const load = () => supabase.from('editions').select('*').order('data_evento', { ascending: false }).then(({ data, error: failure }) => { if (failure) setError(failure.message); else setList((data || []) as Edition[]); });
  const [contagens, setContagens] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    void Promise.all([supabase.from('registrations').select('edition_id,status'), supabase.from('checkins').select('edition_id')]).then(([inscricoes, presencas]) => {
      const totais: Record<string, Record<string, number>> = {};
      const somar = (id: string, chave: string) => { totais[id] = { ...totais[id], [chave]: (totais[id]?.[chave] || 0) + 1 }; };
      for (const row of inscricoes.data || []) somar(row.edition_id, row.status);
      for (const row of presencas.data || []) somar(row.edition_id, 'checkins');
      setContagens(totais);
    });
  }, []);
  useEffect(() => { void load(); }, []);

  async function create() {
    const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const numero = Math.max(0, ...list.map((item) => item.numero || 0)) + 1;
    const titulo = `${numero}ª edição`;
    const { data, error: failure } = await supabase.from('editions').insert({ slug: slugify(`edicao-${numero}`), numero, titulo, selo: titulo, data_evento: date, horario: '9h às 12h', local: 'A definir', cidade: 'Curitiba', checkin_abre: `${date} 07:00-03`, checkin_fecha: `${date} 13:00-03`, publica: false }).select('*').single();
    if (failure) setError(failure.message); else { await load(); setOpen(data as Edition); }
  }

  const colunasEdicoes: Array<Coluna<Edition>> = [
    { id: 'titulo', titulo: 'Edição', valor: (item) => item.titulo, render: (item) => <button type="button" className="adm-nome" onClick={() => setOpen(item)}>{item.titulo}</button> },
    { id: 'data', titulo: 'Data', valor: (item) => item.data_evento, render: (item) => dataBr(item.data_evento) },
    { id: 'horario', titulo: 'Horário', valor: (item) => item.horario },
    { id: 'local', titulo: 'Local', valor: (item) => `${item.local}, ${item.cidade}` },
    { id: 'capacidade', titulo: 'Vagas', valor: (item) => item.capacidade ?? 0, render: (item) => item.capacidade ?? '-' },
    { id: 'analise', titulo: 'Para aprovar', valor: (item) => contagens[item.id]?.analise || 0 },
    { id: 'aprovados', titulo: 'Aprovados', valor: (item) => contagens[item.id]?.inscrito || 0 },
    { id: 'checkins', titulo: 'Check-ins', valor: (item) => contagens[item.id]?.checkins || 0 },
    { id: 'inscricoes', titulo: 'Inscrições', valor: (item) => (item.inscricoes_abertas ? 'Abertas' : 'Fechadas') },
    { id: 'site', titulo: 'No site', valor: (item) => (item.publica ? 'Sim' : 'Não') },
  ];
  if (open) return <EditionEditor key={open.id} edition={open} onBack={() => { setOpen(null); void load(); }} />;
  return (
    <>
      <div className="wf-head"><div><small>EDIÇÕES</small><h1>Encontros</h1><p>Abra uma edição para ajustar data e local, enviar capa e fotos, abrir os telões e ver quem fez check-in.</p></div><div className="v2-head-actions"><button type="button" className="wf-primary" onClick={() => void create()}>Nova edição</button></div></div>
      {error && <p className="inline-notice">{error}</p>}
      <Tabela colunas={colunasEdicoes} linhas={list} chave={(item) => item.id} inicial={{ id: 'data', desc: true }} vazio="Nenhuma edição cadastrada." filtros={[{ id: 'site', titulo: 'No site', valor: (item) => (item.publica ? 'No site' : 'Fora do site') }, { id: 'inscricoes', titulo: 'Inscrições', valor: (item) => (item.inscricoes_abertas ? 'Abertas' : 'Fechadas') }]} />
    </>
  );
}

const SITUACAO_INSCRICAO: Record<string, string> = { analise: 'Para aprovar', inscrito: 'Aprovado', espera: 'Lista de espera', cancelado: 'Recusado' };

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

  const [signups, setSignups] = useState<Array<{ id: string; nome: string; email: string; whatsapp: string; status: string }>>([]);
  const loadSignups = () => supabase.from('registrations').select('id,nome,email,whatsapp,status').eq('edition_id', edition.id).order('created_at').then(({ data }) => setSignups(data || []));
  useEffect(() => { void loadSignups(); }, [edition.id]);
  async function decidir(item: { id: string; nome: string }, status: 'inscrito' | 'espera' | 'cancelado') {
    const pergunta = { inscrito: `Aprovar ${item.nome}? A pessoa recebe a confirmação por e-mail.`, espera: `Colocar ${item.nome} na lista de espera? A pessoa recebe um aviso por e-mail.`, cancelado: `Recusar a inscrição de ${item.nome}? Nenhum e-mail é enviado.` }[status];
    if (!window.confirm(pergunta)) return;
    try { await chamar({ acao: 'decidir', edicao: edition.id, registro: item.id, status }); setNote('Inscrição atualizada.'); } catch (error) { setNote((error as Error).message); }
    await loadSignups();
  }
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
    if (!window.confirm(`Tirar a presença de ${person.members.nome}? As milhas desta edição saem junto.`)) return;
    const { data: row } = await supabase.from('checkins').select('member_id').eq('id', person.id).single();
    await supabase.from('point_events').delete().eq('member_id', row?.member_id).eq('edition_id', edition.id).eq('acao', 'presenca');
    await supabase.from('checkins').delete().eq('id', person.id);
    await loadPeople();
  }

  async function manualCheckin() {
    const email = window.prompt('E-mail do membro para registrar a presença:');
    if (!email || !window.confirm(`Registrar presença de ${email} em ${edition.titulo}? Soma 10 milhas se ainda não tiver presença.`)) return;
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

  type Inscricao = (typeof signups)[number];
  const colunasInscritos: Array<Coluna<Inscricao>> = [
    { id: 'nome', titulo: 'Nome', valor: (item) => item.nome },
    { id: 'whatsapp', titulo: 'WhatsApp', valor: (item) => item.whatsapp, render: (item) => <Telefone numero={item.whatsapp} /> },
    { id: 'email', titulo: 'E-mail', valor: (item) => item.email, render: (item) => <Email email={item.email} /> },
    { id: 'situacao', titulo: 'Situação', valor: (item) => SITUACAO_INSCRICAO[item.status] || item.status },
    { id: 'acoes', titulo: 'Decisão', valor: (item) => item.status, render: (item) => (item.status === 'analise' || item.status === 'espera'
      ? <span className="adm-acoes"><button type="button" onClick={() => void decidir(item, 'inscrito')}>Aprovar</button>{item.status === 'analise' && <button type="button" onClick={() => void decidir(item, 'espera')}>Espera</button>}<button type="button" onClick={() => void decidir(item, 'cancelado')}>Recusar</button></span> : '-') },
  ];
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
          <label><span>Convidados por membro</span><input inputMode="numeric" value={draft.limite_convidados ?? 1} onChange={(event) => set({ limite_convidados: Math.max(0, Number(event.target.value.replace(/\D/g, '')) || 0) })} /></label>
          <label><span>Check-in abre</span><input type="datetime-local" value={localTime(draft.checkin_abre)} onChange={(event) => set({ checkin_abre: new Date(event.target.value).toISOString() })} /></label>
          <label><span>Check-in fecha</span><input type="datetime-local" value={localTime(draft.checkin_fecha)} onChange={(event) => set({ checkin_fecha: new Date(event.target.value).toISOString() })} /></label>
          <label className="v2-forms-check"><input type="checkbox" checked={draft.inscricoes_abertas} onChange={(event) => set({ inscricoes_abertas: event.target.checked })} /><span><strong>Inscrições abertas</strong><small>O site mostra "Quero me inscrever". Não precisa criar formulário.</small></span></label>
          {text('inscricao_url', 'Link externo de inscrição', 'opcional, só se quiser usar outro formulário')}
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
        <header><small>INSCRIÇÕES PELO SITE</small><h2>{signups.filter((item) => item.status === 'analise').length} para aprovar, {signups.filter((item) => item.status === 'inscrito').length} {signups.filter((item) => item.status === 'inscrito').length === 1 ? 'aprovado' : 'aprovados'}{signups.some((item) => item.status === 'espera') ? `, ${signups.filter((item) => item.status === 'espera').length} na lista de espera` : ''}</h2></header>
        <div className="adm-links">
          <input readOnly aria-label="Link da página da edição" value={`https://comuni.calirh.com/e/${edition.slug}`} onFocus={(event) => event.target.select()} />
          <button type="button" className="wf-secondary" disabled={!signups.length} onClick={() => downloadXlsx(`communicali-${edition.slug}-inscritos.xlsx`, 'Inscritos', ['Nome', 'E-mail', 'WhatsApp', 'Situação'], signups.map((item) => [item.nome, item.email, item.whatsapp, item.status]))}>Exportar Excel</button>
        </div>
        <Tabela colunas={colunasInscritos} linhas={signups} chave={(item) => item.id} vazio="Nenhuma inscrição pelo site." filtros={[{ id: 'situacao', titulo: 'Situação', valor: (item) => SITUACAO_INSCRICAO[item.status] || item.status }]} />
      </section>
      <EmailsCard edition={edition} lembrete={draft.lembrete_ativo} onLembrete={(value) => set({ lembrete_ativo: value })} />
      <section className="v2-forms-card">
        <header><small>PRESENÇAS</small><h2>{people.length} {people.length === 1 ? 'check-in' : 'check-ins'}</h2></header>
        <div className="adm-links">
          <a className="wf-secondary" href={`${origin}/telao/checkin?edicao=${edition.slug}`} target="_blank" rel="noopener noreferrer">Telão do check-in</a>
          <a className="wf-secondary" href={`${origin}/telao/votacao?edicao=${edition.slug}`} target="_blank" rel="noopener noreferrer">Telão da votação</a>
          <button type="button" className="wf-secondary" title="Para quem não conseguiu fazer o check-in pelo celular" onClick={() => void manualCheckin()}>Registrar presença manualmente</button>
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
      // O site usa o logo branco; o espaço do membro usa o original.
      const logo_url = logo ? await uploadImage(await logoBranco(logo), 'parceiros') : null;
      const logo_original_url = logo ? await uploadImage(logo, 'parceiros-originais') : null;
      const { data: criado, error: failure } = await supabase.from('partners').insert({ nome: nome.trim(), site_url: site.trim() || null, logo_url, ordem: list.length }).select('id').single();
      if (failure) throw failure;
      if (logo_original_url) await supabase.from('communicali_partner_profiles').upsert({ partner_id: criado.id, logo_original_url }, { onConflict: 'partner_id' });
      setNome(''); setSite(''); setLogo(undefined); (event.target as HTMLFormElement).reset();
      await load();
    } catch { setError('Não foi possível salvar o parceiro.'); }
  }

  return (
    <>
      <div className="wf-head"><div><small>PARCEIROS</small><h1>Logos na faixa do site</h1><p>Cada parceiro cadastrado aqui entra na faixa, com o logo convertido para branco e sem fundo, "Quem apoia a ComuniCALI". Sem parceiros, o site mostra os espaços "Sua marca aqui". As propostas recebidas ficam em Formulários, no formulário de parceiros.</p></div></div>
      {error && <p className="inline-notice">{error}</p>}
      <section className="v2-forms-card">
        <header><small>NOVO PARCEIRO</small><h2>Cadastre só parceiros confirmados</h2></header>
        <form className="v2-forms-grid" onSubmit={(event) => void add(event)}>
          <label><span>Nome</span><input required value={nome} onChange={(event) => setNome(event.target.value)} /></label>
          <label><span>Site <em>opcional</em></span><input value={site} placeholder="https://" onChange={(event) => setSite(event.target.value)} /></label>
          <label><span>Logo <em>o site converte para branco e tira o fundo</em></span><input type="file" accept="image/*" onChange={(event) => setLogo(event.target.files?.[0])} /></label>
          <div className="adm-submit"><button type="submit" className="wf-primary">Adicionar parceiro</button></div>
        </form>
      </section>
      <div className="adm-partners">
        {list.map((partner) => (
          <article key={partner.id}>
            <div className="adm-partners__logo">{partner.logo_url ? <img src={partner.logo_url} alt={partner.nome} /> : <span>Sem logo</span>}</div>
            <strong>{partner.nome}</strong>
            <small>{partner.ativo ? 'Aparece no site' : 'Fora do site'}</small>
            <button type="button" className="wf-secondary" onClick={() => void supabase.from('partners').update({ ativo: !partner.ativo }).eq('id', partner.id).then(load)}>{partner.ativo ? 'Tirar do site' : 'Voltar ao site'}</button>
          </article>
        ))}
      </div>
      {!list.length && <p className="adm-hint">Nenhum parceiro cadastrado ainda.</p>}
      <AdminRedeExtras parceiros={list} uploadOriginal={(file) => uploadImage(file, 'parceiros-originais')} />
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
      <div className="wf-head"><div><small>CONTADOR</small><h1>Contador de membros</h1><p>Com o campo vazio, o site conta quem fez check-in em edições públicas. Com um número, mostra esse número. Em zero, o contador some.</p></div></div>
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

// Menu do painel em poucos grupos; cada grupo mostra as suas abas logo abaixo.
const GRUPOS: Array<{ nome: string; itens: Array<[string, string]> }> = [
  { nome: 'Início', itens: [['/admin', 'Início']] },
  { nome: 'Pessoas', itens: [['/admin/membros', 'Membros'], ['/admin/indicacoes', 'Indicações'], ['/admin/matches', 'Matches']] },
  { nome: 'Edições', itens: [['/admin/edicoes', 'Edições'], ['/admin/votacoes', 'Votações']] },
  { nome: 'Programa', itens: [['/admin/programa', 'Como funciona'], ['/admin/missoes', 'Missões'], ['/admin/impacto', 'Impacto']] },
  { nome: 'Formulários', itens: [['/admin/formularios', 'Formulários'], ['/admin/staff', 'Staff'], ['/admin/fornecedores', 'Fornecedores']] },
  { nome: 'Parceiros', itens: [['/admin/parceiros', 'Parceiros']] },
];

function Frame({ session, children }: { session: Session; children: ReactNode }) {
  const { pathname } = useLocation();
  const caminho = pathname.replace(/\/$/, '') || '/admin';
  // Ao navegar no painel, os avisos de nível e missão que você acabou de liberar saem por e-mail.
  useEffect(() => { void fetch('/api/avisos', { method: 'POST' }).catch(() => null); }, [pathname]);
  const grupoAtual = GRUPOS.find((grupo) => grupo.itens.some(([to]) => to === caminho)) || (caminho === '/admin/convidados' ? GRUPOS[1] : undefined);
  return (
    <div className="adm">
      <header className="adm__top">
        <NavLink to="/admin" className="adm__logo"><img src="/brand/communicali-branco.png" alt="ComuniCALI" /></NavLink>
        <nav>
          {GRUPOS.map((grupo) => <NavLink key={grupo.nome} to={grupo.itens[0][0]} end={grupo.itens[0][0] === '/admin'} className={() => (grupoAtual === grupo ? 'active' : '')}>{grupo.nome}</NavLink>)}
        </nav>
        <div className="adm__user"><a href="/" target="_blank" rel="noopener noreferrer">Ver o site</a><NavLink to="/admin/textos" title="Regras, privacidade e textos do site" className="adm__config">⚙ Configurações</NavLink><button type="button" onClick={() => void supabase.auth.signOut()}>Sair</button></div>
      </header>
      {grupoAtual && grupoAtual.itens.length > 1 && <nav className="adm__sub" aria-label={grupoAtual.nome}>{grupoAtual.itens.map(([to, nome]) => <NavLink key={to} to={to} end>{nome}</NavLink>)}</nav>}
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
        <Route index element={<HomePanel />} />
        <Route path="programa" element={<ProgramPanel />} />
        <Route path="missoes" element={<RecommendationsPanel />} />
        <Route path="matches" element={<MatchesPanel />} />
        <Route path="indicacoes" element={<IndicacoesPanel />} />
        <Route path="impacto" element={<ImpactosPanel />} />
        <Route path="staff" element={<StaffPanel />} />
        <Route path="fornecedores" element={<FornecedorPanel />} />
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
