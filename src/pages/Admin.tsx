import { useEnquadramento, type ImagemEnquadrada } from '../components/EditorEnquadramento';
import { prepararImagem, enviarLoteFotos, erroUpload } from '../lib/imagensUpload';
import { AdminCustos } from './AdminCustos';
/* Área administrativa: login por link no e-mail. Quem não está em public.admins não entra; o banco repete essa regra. */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AdminFormsPage } from '../forms/AdminFormsPage';
import { PessoasDaEdicao } from './AdminPessoasEdicao';
import { ComentariosPanel } from './AdminComentarios';
import { DiaDoEncontro } from './DiaDoEncontro';
import { downloadXlsx } from '../forms/formExports';
import { slugify } from '../forms/formModel';
import { PollsPanel, VotacoesDaEdicao, exportPresencasCsv } from './AdminPrograma';
import { CardEMimos, EmailsCard, chamar } from './AdminEmails';
import { AppPage, Secoes, AprovacoesPage, ConfigPage, EmailsPage, InicioPage, MenuLateral, PessoasPage, ProgramaPage, SitePage, useAba } from './AdminPainel';
import { Email, Tabela, Telefone, dataBr, type Coluna } from './AdminTabela';
import { AdminRedeExtras } from './AdminRedeExtras';
import './admin.css';

type Edition = { capa_original_url?: string | null; limite_convidados?: number; inscricoes_abertas: boolean; lembrete_ativo: boolean; id: string; capacidade: number | null; checkin_abre: string; checkin_fecha: string; slug: string; numero: number | null; titulo: string; selo: string; data_evento: string; horario: string; local: string; cidade: string; endereco: string | null; capa_url: string | null; resumo: string | null; fotos_url: string | null; inscricao_url: string | null; publica: boolean; form_inscricao?: string | null; inscricao_modo?: 'aberta' | 'espera' | 'fechada'; form_pesquisa?: string | null; pesquisa_auto?: boolean };
type Photo = { original_url?: string | null; id: string; url: string; legenda: string | null; no_carrossel: boolean };
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

async function uploadImage(original: File, folder: string) {
  const file = await prepararImagem(original, true);
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
        <img className="adm-login__logo" src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" />
        <div>
          <p className="adm-login__eyebrow">Painel da organização</p>
          <h1>Bastidores da <em>ComuniCALI</em></h1>
          <ul>
            <li><span>01</span>Edições, check-in e votação</li>
            <li><span>02</span>Pessoas, indicações e conexões</li>
            <li><span>03</span>Formulários, parceiros e e-mails</li>
          </ul>
        </div>
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

function EdicoesPage() {
  const [aba, mudar] = useAba('encontros', ['encontros', 'votacoes'], 'topo');
  const [params] = useSearchParams();
  if (params.get('abrir') || params.get('secao')) return <EditionsPanel />;
  return <Secoes atual={aba} onChange={mudar} abas={[['encontros', 'Encontros'], ['votacoes', 'Perguntas para o telão']]}>
    {aba === 'votacoes' ? <PollsPanel /> : <EditionsPanel />}
  </Secoes>;
}

function EditionsPanel() {
  const [list, setList] = useState<Edition[]>([]);
  const [open, setOpen] = useState<Edition | null>(null);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const load = () => supabase.from('editions').select('*').order('data_evento', { ascending: false }).then(({ data, error: failure }) => { if (failure) setError(failure.message); else { const itens = (data || []) as Edition[]; setList(itens); const pedida = params.get('abrir'); if (pedida) setOpen((atual) => atual || itens.find((item) => item.slug === pedida) || null); } });
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
    if (failure) setError(failure.message); else { await load(); const proximo = new URLSearchParams(params); proximo.set('abrir', data.slug); setParams(proximo); }
  }

  const colunasEdicoes: Array<Coluna<Edition>> = [
    { id: 'titulo', titulo: 'Edição', valor: (item) => item.titulo, render: (item) => <button type="button" className="adm-nome" onClick={() => { const proximo = new URLSearchParams(params); proximo.set('abrir', item.slug); setParams(proximo); }}>{item.titulo}</button> },
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
  if (open) return <EditionEditor key={open.id} edition={open} onBack={() => { setOpen(null); const proximo = new URLSearchParams(params); proximo.delete('abrir'); proximo.delete('secao'); setParams(proximo, { replace: true }); void supabase.from('editions').select('*').order('data_evento', { ascending: false }).then(({ data }) => { if (data) setList(data as Edition[]); }); }} />;
  return (
    <>
      <div className="wf-head"><div><small>EDIÇÕES</small><h1>Encontros</h1><p>Abra uma edição para ajustar data e local, enviar capa e fotos, abrir os telões e ver quem fez check-in.</p></div><div className="v2-head-actions"><button type="button" className="wf-primary" onClick={() => void create()}>Nova edição</button></div></div>
      {error && <p className="inline-notice">{error}</p>}
      <Tabela colunas={colunasEdicoes} colunasIniciais={['titulo', 'data', 'local', 'inscricoes']} linhas={list} chave={(item) => item.id} inicial={{ id: 'data', desc: true }} vazio="Nenhuma edição cadastrada." filtros={[{ id: 'site', titulo: 'No site', valor: (item) => (item.publica ? 'No site' : 'Fora do site') }, { id: 'inscricoes', titulo: 'Inscrições', valor: (item) => (item.inscricoes_abertas ? 'Abertas' : 'Fechadas') }]} />
    </>
  );
}


function EditionEditor({ edition, onBack }: { edition: Edition; onBack: () => void }) {
  const [pendentesComentarios, setPendentesComentarios] = useState(0);
  useEffect(() => { void supabase.from('edition_comments').select('id', { count: 'exact', head: true }).eq('edition_id', edition.id).eq('status', 'pendente').then(({ count }) => setPendentesComentarios(count || 0)); }, [edition.id]);
  const [aba, mudarAba] = useAba('dados', ['dia', 'dados', 'pessoas', 'emails', 'site', 'comentarios', 'custos'], 'secao');
  const [draft, setDraft] = useState(edition);
  const { enquadrar, editor } = useEnquadramento();
  const [confirmados, setConfirmados] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [people, setPeople] = useState<Attendee[]>([]);
  const [note, setNote] = useState('');
  const [noteErro, setNoteErro] = useState(false);
  const [progressoFotos, setProgressoFotos] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (next: Partial<Edition>) => { setDraft({ ...draft, ...next }); setNote(''); };
  const text = (key: keyof Edition, label: string, hint?: string) => (
    <label><span>{label}{hint && <em> {hint}</em>}</span><input value={String(draft[key] ?? '')} onChange={(event) => set({ [key]: event.target.value } as Partial<Edition>)} /></label>
  );

  const loadPhotos = () => supabase.from('edition_photos').select('id,url,original_url,legenda,no_carrossel').eq('edition_id', edition.id).order('ordem').then(({ data }) => setPhotos((data || []) as Photo[]));
  const loadPeople = () => supabase.from('checkins').select('id,checked_in_at,codigo,origem,members(nome,email,whatsapp,empresa,cargo,categoria,autoriza_imagem)').eq('edition_id', edition.id).order('checked_in_at').then(({ data }) => setPeople((data || []) as unknown as Attendee[]));
  useEffect(() => {
    void loadPhotos(); void loadPeople();
    void supabase.rpc('communicali_pessoas_edicao', { p_edition: edition.id }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) setConfirmados(data.filter((item: { situacao: string }) => item.situacao === 'confirmado').length);
    });
  }, [edition.id]);

  async function save() {
    setBusy(true);
    const { id, slug, fotos_url: _legacyAlbum, ...fields } = draft;
    const clean = { ...fields, endereco: fields.endereco || null, resumo: fields.resumo || null, inscricao_url: fields.inscricao_url || null };
    const { error } = await supabase.from('editions').update(clean).eq('id', id);
    setBusy(false);
    setNoteErro(Boolean(error));
    setNote(error ? `Não foi possível salvar: ${error.message}` : `Alterações salvas em ${slug}.`);
  }

  async function cover(file?: File) {
    if (!file) return;
    setBusy(true); setNote(''); setNoteErro(false);
    try { const imagem = await enquadrar(file, {proporcao:16/7,rotulo:'Moldura da capa',fixa:true}); if (!imagem) return; const urls = await enviarImagemOriginal(imagem); set({ capa_url: urls.url, capa_original_url: urls.original_url }); setNote('Capa enviada. Clique em Salvar alterações para publicá-la.'); }
    catch (erro) { setNoteErro(true); setNote(`Não foi possível enviar a capa: ${erroUpload(erro)}`); }
    finally { setBusy(false); }
  }

  async function addPhotos(arquivos: File[]) {
    if (!arquivos.length) return;
    setBusy(true); setNote(''); setNoteErro(false);
    try {
      const resultado = await enviarLoteFotos(arquivos, async (file, index) => {
        const imagem = await enquadrar(file); if (!imagem) throw new Error('Envio cancelado.');
        const { url, original_url } = await enviarImagemOriginal(imagem);
        const { error } = await supabase.from('edition_photos').insert({ edition_id: edition.id, url, original_url, ordem: photos.length + index });
        if (error) throw error;
      }, indice => setProgressoFotos(`Preparando e enviando foto ${indice} de ${arquivos.length}…`));
      await loadPhotos();
      setNoteErro(resultado.falhas.length > 0);
      setNote(`${resultado.enviados} de ${arquivos.length} foto(s) enviada(s).${resultado.falhas.length ? ' '+resultado.falhas.join(' · ') : ' As fotos já estão disponíveis no carrossel público.'}`);
    } finally { setBusy(false); setProgressoFotos(''); }
  }

  async function enviarImagemOriginal(imagem: ImagemEnquadrada) {
    const original_url = await uploadImage(imagem.original, `edicoes/${edition.slug}/originais`);
    const url = imagem.exibicao === imagem.original ? original_url : await uploadImage(imagem.exibicao, `edicoes/${edition.slug}/enquadradas`);
    return { url, original_url };
  }

  async function reenquadrar(url: string, photo?: Photo) {
    setBusy(true); setNote(''); setNoteErro(false);
    try {
      const resposta = await fetch(photo ? (photo.original_url || url) : (draft.capa_original_url || url));
      if (!resposta.ok) throw new Error('Não foi possível carregar o original.');
      const blob = await resposta.blob();
      const imagem = await enquadrar(new File([blob], 'foto-original.'+(blob.type==='image/png'?'png':'jpg'), {type:blob.type}), photo ? {proporcao:4/3,rotulo:'Moldura da foto'} : {proporcao:16/7,rotulo:'Moldura da capa',fixa:true});
      if (!imagem) return;
      const novaUrl = imagem.exibicao === imagem.original ? (photo ? (photo.original_url || url) : (draft.capa_original_url || url)) : await uploadImage(imagem.exibicao, `edicoes/${edition.slug}/enquadradas`);
      if (photo) {
        const { error } = await supabase.from('edition_photos').update({url:novaUrl,original_url:photo.original_url || photo.url}).eq('id',photo.id); if (error) throw error;
        await loadPhotos(); setNote('Enquadramento salvo.');
      } else { set({capa_url:novaUrl,capa_original_url:draft.capa_original_url || url});setNote('Enquadramento ajustado. Clique em Salvar alterações para publicar a capa.'); }
    } catch(e) { setNoteErro(true);setNote(erroUpload(e)); }
    finally {setBusy(false);}
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

  // Para testes e demonstrações: apaga a edição com votações, presenças, milhas da edição, inscrições e fotos.
  async function excluirEdicao() {
    const digitado = window.prompt(`Excluir "${edition.titulo}" e tudo o que pertence a ela (inscrições, presenças, milhas desta edição, votações e fotos)? Esta ação não pode ser desfeita.\n\nPara confirmar, digite o nome da edição:`);
    if (digitado === null) return;
    if (digitado.trim().toLowerCase() !== edition.titulo.trim().toLowerCase()) { setNote('O nome digitado não confere. Nada foi excluído.'); return; }
    const { error } = await supabase.rpc('communicali_excluir_edicao', { p_id: edition.id });
    if (error) { setNote(`Não foi possível excluir: ${error.message}`); return; }
    onBack();
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

  const origin = window.location.origin;
  return (
    <>
      {editor}
      <div className="adm-edicao">
      <button type="button" className="v2-forms-back" onClick={onBack}>Voltar para edições</button>
      <div className="wf-head"><div><small>EDIÇÃO</small><h1>{draft.titulo}</h1></div><div className="v2-head-actions"><button type="button" className="wf-secondary adm-perigo" disabled={busy} onClick={() => void excluirEdicao()}>Excluir edição</button><button type="button" className="wf-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar alterações'}</button></div></div>
      {note && <p className={noteErro ? "v2-forms-error" : "v2-forms-ok"} role={noteErro ? "alert" : "status"}>{note}</p>}
      <dl className="adm-edicao-resumo" aria-label="Resumo da edição">
        <div><dt>Data e horário</dt><dd>{dataBr(draft.data_evento)}<small>{draft.horario}</small></dd></div>
        <div><dt>Local</dt><dd>{draft.local}<small>{draft.cidade}</small></dd></div>
        <div><dt>Vagas</dt><dd>{draft.capacidade ?? 'Não definida'}</dd></div>
        <div><dt>Confirmados</dt><dd>{confirmados ?? 'Indisponível'}</dd></div>
        <div><dt>Inscrições</dt><dd>{draft.inscricoes_abertas ? 'Abertas' : 'Fechadas'}<small>{draft.publica ? 'No site' : 'Fora do site'}</small></dd></div>
      </dl>
      <Secoes atual={aba} onChange={mudarAba} abas={[['dados', 'Dados e vagas'], ['pessoas', 'Pessoas'], ['emails', 'E-mails'], ['dia', 'Dia do encontro'], ['site', 'Site e fotos'], ['comentarios', pendentesComentarios ? `Comentários · ${pendentesComentarios} novo${pendentesComentarios > 1 ? 's' : ''}` : 'Comentários'], ['custos', 'Custos']]}><div>
      {aba === 'dia' && <DiaDoEncontro edition={draft} />}
      {aba === 'dados' && (<>
      <section className="v2-forms-card" id="secao-dados">
        <header><small>DADOS DO ENCONTRO</small><h2>Data, local, check-in e o que aparece no site</h2></header>
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
          <label className="v2-forms-check"><input type="checkbox" checked={draft.publica} onChange={(event) => set({ publica: event.target.checked })} /><span><strong>Mostrar no site</strong></span></label>
          <label className="wide"><span>Resumo do encontro</span><textarea rows={8} maxLength={1200} value={draft.resumo || ''} onChange={(event) => set({ resumo: event.target.value })} /><small className="adm-hint">{(draft.resumo || '').length} de 1200 caracteres. Pule uma linha para começar um novo parágrafo. Use **assim** para negrito, "- " no começo da linha para lista e "## " para um subtítulo.</small></label>
        </div>
      </section>
      </>)}
      {aba === 'site' && (<>
      <section className="v2-forms-card" id="secao-imagens">
        <header><small>IMAGENS PÚBLICAS</small><h2>Capa da edição</h2></header>
        <p className="adm-hint">Aqui fica só a capa. As fotos da galeria e o link do álbum completo ficam em um lugar só: <a href={`/admin/site?aba=encontros&encontro=${edition.slug}`}>Site, Encontros e fotos</a>.</p>
        <div className="adm-cover">
          {draft.capa_url && <img src={draft.capa_url} alt="Capa da edição" />}
          <label className="wf-secondary" aria-disabled={busy}>{draft.capa_url ? 'Trocar a capa' : 'Enviar a capa'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void cover(file); }} /></label>
          {draft.capa_url && <button type="button" className="wf-secondary" disabled={busy} onClick={() => void reenquadrar(draft.capa_url!)}>Enquadrar capa</button>}
        </div>
        <p className="adm-hint">Até 50 MB. Use Enquadrar para ajustar o recorte.</p>{progressoFotos && <p role="status" aria-live="polite">{progressoFotos}</p>}
        <a className="wf-primary" href={`/admin/site?aba=encontros&encontro=${edition.slug}`}>Gerenciar as fotos da galeria</a>
      </section>
      </>)}
      {aba === 'comentarios' && <ComentariosPanel edicaoId={edition.id} />}
      {aba === 'custos' && <AdminCustos edicaoId={edition.id} />}
      {aba === 'pessoas' && <PessoasDaEdicao edition={draft} />}
      {aba === 'emails' && (<>
      <div id="secao-emails"><EmailsCard edition={edition} lembrete={draft.lembrete_ativo} onLembrete={(value) => set({ lembrete_ativo: value })} /></div>
      <CardEMimos edition={edition} />
      </>)}
      {aba === 'dia' && (<>
      <div id="secao-votacao"><VotacoesDaEdicao editionId={edition.id} editionSlug={edition.slug} /></div>
      <section className="v2-forms-card" id="secao-presencas">
        <header className="adm-secao__topo"><div><small>PRESENÇAS</small><h2>{people.length} {people.length === 1 ? 'check-in' : 'check-ins'}</h2></div>
          <div className="adm-links">
            <a className="wf-secondary" href={`${origin}/telao/checkin?edicao=${edition.slug}`} target="_blank" rel="noopener noreferrer">Telão do check-in</a>
            <button type="button" className="wf-secondary" title="Para quem não conseguiu fazer o check-in pelo celular" onClick={() => void manualCheckin()}>Registrar presença manualmente</button>
          </div></header>
        <Tabela<Attendee> colunas={[
          { id: 'hora', titulo: 'Horário', valor: (item) => item.checked_in_at, render: (item) => new Date(item.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) },
          { id: 'nome', titulo: 'Nome', valor: (item) => item.members.nome },
          { id: 'email', titulo: 'E-mail', valor: (item) => item.members.email, render: (item) => <Email email={item.members.email} /> },
          { id: 'empresa', titulo: 'Empresa', valor: (item) => item.members.empresa || '-' },
          { id: 'codigo', titulo: 'Código', valor: (item) => item.codigo },
          { id: 'imagem', titulo: 'Uso de imagem', valor: (item) => (item.members.autoriza_imagem ? 'Autoriza' : 'Não autoriza') },
          { id: 'tirar', titulo: '', valor: () => '', render: (item) => <span className="adm-acoes"><button type="button" onClick={() => void removeCheckin(item)}>Tirar presença</button></span> },
        ]} filtros={[{ id: 'imagem', titulo: 'Uso de imagem', valor: (item) => (item.members.autoriza_imagem ? 'Autoriza' : 'Não autoriza') }]}
          linhas={people} chave={(item) => item.id} inicial={{ id: 'hora' }} vazio="Nenhum check-in ainda."
          acoes={<><button type="button" className="wf-secondary" disabled={!people.length} onClick={exportCsv}>Exportar CSV</button><button type="button" className="wf-secondary" disabled={!people.length} onClick={exportPeople}>Exportar Excel</button></>} />
      </section>
      </>)}
      </div></Secoes>
      </div>
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

function Frame({ session, children }: { session: Session; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  // Mantém o envio já existente ao navegar. A moldura só controla a apresentação.
  useEffect(() => { void fetch('/api/avisos', { method: 'POST' }).catch(() => null); setAberto(false); }, [pathname]);
  useEffect(() => {
    const dialogo = menu.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, [aberto]);
  return (
    <div className="adm adm--lateral">
      <header className="adm__bar">
        <a className="adm__skip" href="#conteudo-painel">Ir para o conteúdo</a>
        <button type="button" className="adm__menu" aria-label="Abrir menu do painel" aria-controls="menu-painel" aria-expanded={aberto} onClick={() => setAberto(true)}><Menu size={18} aria-hidden="true" /><span>Menu</span></button>
        <Link className="adm__bar-marca" to="/admin" aria-label="ComuniCALI, início do painel"><img src="/brand/novo/comunicali-b-fundo-claro.svg" alt="ComuniCALI" /></Link>
        <span className="adm__bar-rotulo">Painel da organização</span>
      </header>
      <dialog ref={menu} id="menu-painel" className="adm__drawer" aria-label="Navegação da organização" onCancel={() => setAberto(false)} onClose={() => setAberto(false)} onClick={(event) => { if (event.target === event.currentTarget) setAberto(false); }}>
        <div className="adm__drawer-topo"><span>Navegação</span><button type="button" aria-label="Fechar menu do painel" onClick={() => setAberto(false)}><X size={18} aria-hidden="true" /><span>Fechar</span></button></div>
        <MenuLateral email={session.user.email || ''} onSair={() => void supabase.auth.signOut()} fechar={() => setAberto(false)} />
      </dialog>
      <main id="conteudo-painel" tabIndex={-1} className="adm__corpo adm__main ap-app v2-admin-page v2-forms v2-client-module"><div className="ap-content"><div className="wf">{children}</div></div></main>
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
        <Route index element={<InicioPage />} />
        <Route path="edicoes" element={<EdicoesPage />} />
        <Route path="pessoas" element={<PessoasPage />} />
        <Route path="custos" element={<AdminCustos />} />
        <Route path="aprovacoes" element={<AprovacoesPage />} />
        <Route path="programa" element={<ProgramaPage />} />
        <Route path="rede" element={<PartnersPanel />} />
        <Route path="emails" element={<EmailsPage />} />
        <Route path="formularios" element={<AdminFormsPage />} />
        <Route path="site" element={<SitePage />} />
        <Route path="app" element={<AppPage />} />
        <Route path="configuracoes" element={<ConfigPage />} />
        {/* Endereços antigos continuam funcionando */}
        <Route path="membros" element={<Navigate to="/admin/pessoas?aba=membros" replace />} />
        <Route path="convidados" element={<Navigate to="/admin/pessoas?aba=convidados" replace />} />
        <Route path="staff" element={<Navigate to="/admin/pessoas?aba=staff" replace />} />
        <Route path="fornecedores" element={<Navigate to="/admin/pessoas?aba=fornecedores" replace />} />
        <Route path="indicacoes" element={<Navigate to="/admin/pessoas?aba=indicacoes" replace />} />
        <Route path="matches" element={<Navigate to="/admin/pessoas?aba=matches" replace />} />
        <Route path="missoes" element={<Navigate to="/admin/aprovacoes?aba=missoes" replace />} />
        <Route path="comentarios" element={<Navigate to="/admin/aprovacoes?aba=comentarios" replace />} />
        <Route path="impacto" element={<Navigate to="/admin/programa?aba=impacto" replace />} />
        <Route path="parceiros" element={<Navigate to="/admin/rede" replace />} />
        <Route path="votacoes" element={<Navigate to="/admin/edicoes?topo=votacoes" replace />} />
        <Route path="contador" element={<Navigate to="/admin/site?aba=contador" replace />} />
        <Route path="textos" element={<Navigate to="/admin/site?aba=textos" replace />} />
      </Routes>
    </Frame>
  );
}
