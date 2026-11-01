/* Painéis do Programa de Membros: Membros, Votações e Textos. Tudo o que muda dado fica em audit_log pelo banco. */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { downloadXlsx } from '../forms/formExports';
import { slugify } from '../forms/formModel';
import { CATEGORIAS } from './Checkin';
import { FAIXAS, PONTOS } from './AdminInicio';

type Member = { id: string; status: string; nome: string; apelido: string | null; email: string; whatsapp: string | null; cidade_uf: string | null; empresa: string | null; cargo: string | null; linkedin: string | null; interesses: string[]; como_conheceu: string | null; categoria: string; cracha_status: string; autoriza_imagem: boolean; autoriza_comunicacoes: boolean; created_at: string };
type History = { id: string; checked_in_at: string; codigo: string; editions: { titulo: string } };
type Point = { id: string; acao: string; pontos: number; created_at: string; motivo: string | null };
type Poll = { id: string; slug: string; titulo: string; pergunta: string; tipo: 'nota' | 'multipla' | 'aberta'; opcoes: string[]; anonima: boolean; status: 'rascunho' | 'ativa' | 'encerrada'; revelada: boolean; edition_id: string };
type Vote = { nota: number | null; opcao: string | null; texto: string | null; respondente: string | null; created_at: string };

const CRACHA: Record<string, string> = { nao_disponivel: 'Sem presença ainda', disponivel: 'Disponível para retirada', entregue: 'Entregue' };
const csv = (name: string, rows: Array<Array<string | number>>) => {
  const text = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }));
  link.download = name; link.click();
};

export function exportPresencasCsv(slug: string, rows: Array<Array<string | number>>) {
  csv(`communicali-${slug}-presencas.csv`, rows);
}

function MemberEditor({ member, onBack }: { member: Member; onBack: () => void }) {
  const [draft, setDraft] = useState(member);
  const [history, setHistory] = useState<History[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [note, setNote] = useState('');
  const [launch, setLaunch] = useState(0);
  const [kind, setKind] = useState('contribuicao');
  const [motivo, setMotivo] = useState('');
  useEffect(() => {
    supabase.from('checkins').select('id,checked_in_at,codigo,editions(titulo)').eq('member_id', member.id).order('checked_in_at', { ascending: false }).then(({ data }) => setHistory((data || []) as unknown as History[]));
    supabase.from('point_events').select('id,acao,pontos,created_at,motivo').eq('member_id', member.id).order('created_at', { ascending: false }).then(({ data }) => setPoints((data || []) as Point[]));
  }, [member.id, launch]);
  const text = (key: 'nome' | 'apelido' | 'whatsapp' | 'cidade_uf' | 'empresa' | 'cargo' | 'linkedin', label: string) => (
    <label><span>{label}</span><input value={draft[key] || ''} onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); setNote(''); }} /></label>
  );

  const total = points.reduce((sum, item) => sum + item.pontos, 0);
  const faixa = FAIXAS.find((band) => total >= band.de && total <= band.ate)?.nome;
  const label = (acao: string) => acao === 'presenca' ? 'Presença em encontro' : acao.startsWith('convidado:') ? 'Convidado compareceu' : acao.startsWith('contribuicao') ? 'Contribuição aprovada' : acao.startsWith('parceiro') ? 'Indicação de parceiro' : 'Ajuste';

  async function addPoints() {
    const valor = PONTOS.find(([key]) => key === kind)?.[2] || 0;
    if (!motivo.trim()) { setNote('Descreva o motivo do lançamento.'); return; }
    if (!window.confirm(`Lançar +${valor} pontos para ${member.nome}?`)) return;
    const { error } = await supabase.from('point_events').insert({ member_id: member.id, acao: `${kind}:${crypto.randomUUID()}`, pontos: valor, motivo: motivo.trim() });
    setNote(error ? `Não foi possível lançar: ${error.message}` : 'Pontos lançados.');
    if (!error) { setMotivo(''); setLaunch(launch + 1); }
  }

  async function save() {
    if (draft.categoria !== member.categoria && !window.confirm(`Mudar a categoria para ${CATEGORIAS[draft.categoria]}?`)) return;
    const { nome, apelido, whatsapp, cidade_uf, empresa, cargo, linkedin, categoria, cracha_status } = draft;
    const delivered = cracha_status === 'entregue' && member.cracha_status !== 'entregue' ? { cracha_entregue_em: new Date().toISOString() } : {};
    const { error } = await supabase.from('members').update({ nome, apelido, whatsapp, cidade_uf, empresa, cargo, linkedin, categoria, cracha_status, updated_at: new Date().toISOString(), ...delivered }).eq('id', member.id);
    setNote(error ? `Não foi possível salvar: ${error.message}` : 'Alterações salvas.');
  }

  return (
    <>
      <button type="button" className="v2-forms-back" onClick={onBack}>Voltar para membros</button>
      <div className="wf-head"><div><small>MEMBRO · {member.email}</small><h1>{member.nome}</h1><p>{total} pontos · faixa de pontos: {faixa} · categoria atual: {CATEGORIAS[draft.categoria]}{draft.status === 'suspenso' ? ' · suspenso' : ''}</p></div><div className="v2-head-actions"><button type="button" className="wf-primary" onClick={() => void save()}>Salvar alterações</button></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <div className="v2-forms-grid">
          {text('nome', 'Nome completo')}{text('apelido', 'Como prefere ser chamado')}{text('whatsapp', 'WhatsApp')}{text('cidade_uf', 'Cidade/UF')}{text('empresa', 'Empresa')}{text('cargo', 'Cargo')}{text('linkedin', 'LinkedIn')}
          <label><span>Categoria</span><select value={draft.categoria} onChange={(event) => setDraft({ ...draft, categoria: event.target.value })}>{Object.entries(CATEGORIAS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>Crachá</span><select value={draft.cracha_status} onChange={(event) => setDraft({ ...draft, cracha_status: event.target.value })}>{Object.entries(CRACHA).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
      </section>
      <section className="v2-forms-card">
        <header><small>PONTOS</small><h2>Extrato: {total} pontos</h2></header>
        <div className="adm-list">{points.map((item) => <div className="adm-row adm-row--static" key={item.id}><strong>+{item.pontos}</strong><span>{label(item.acao)}{item.motivo ? ` · ${item.motivo}` : ''}</span><em>{new Date(item.created_at).toLocaleDateString('pt-BR')}</em></div>)}</div>
        {!points.length && <p className="adm-hint">Nenhum ponto ainda. O cadastro não gera pontos; a primeira presença soma 10.</p>}
        <div className="v2-forms-grid">
          <label><span>Lançar pontos</span><select value={kind} onChange={(event) => setKind(event.target.value)}>{PONTOS.filter(([key]) => key === 'contribuicao' || key === 'parceiro').map(([key, text, value]) => <option key={key} value={key}>+{value} {text}</option>)}</select></label>
          <label><span>Motivo</span><input value={motivo} onChange={(event) => setMotivo(event.target.value)} /></label>
          <div className="adm-submit"><button type="button" className="wf-secondary" onClick={() => void addPoints()}>Lançar pontos</button></div>
        </div>
      </section>
      <section className="v2-forms-card">
        <header><small>HISTÓRICO</small><h2>{history.length} {history.length === 1 ? 'presença' : 'presenças'}</h2></header>
        <div className="adm-list">{history.map((item) => <div className="adm-row adm-row--static" key={item.id}><strong>{item.editions.titulo}</strong><span>{new Date(item.checked_in_at).toLocaleString('pt-BR')} · código {item.codigo}</span></div>)}</div>
      </section>
    </>
  );
}

export function MembersPanel() {
  const [list, setList] = useState<Member[]>([]);
  const [points, setPoints] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Member | null>(null);
  const load = () => {
    supabase.from('members').select('*').order('created_at', { ascending: false }).then(({ data }) => setList((data || []) as Member[]));
    supabase.from('point_events').select('member_id,pontos').then(({ data }) => {
      const totals: Record<string, number> = {};
      for (const row of data || []) totals[row.member_id] = (totals[row.member_id] || 0) + row.pontos;
      setPoints(totals);
    });
  };
  useEffect(load, []);
  const visible = useMemo(() => { const term = query.trim().toLowerCase(); return list.filter((item) => !term || `${item.nome} ${item.email} ${item.empresa || ''}`.toLowerCase().includes(term)); }, [list, query]);

  function exportAll() {
    downloadXlsx('communicali-membros.xlsx', 'Membros', ['Nome', 'E-mail', 'WhatsApp', 'Cidade/UF', 'Empresa', 'Cargo', 'LinkedIn', 'Interesses', 'Como conheceu', 'Categoria', 'Pontos', 'Crachá', 'Comunicações', 'Imagem', 'Cadastro'],
      visible.map((item) => [item.nome, item.email, item.whatsapp || '', item.cidade_uf || '', item.empresa || '', item.cargo || '', item.linkedin || '', item.interesses.join(', '), item.como_conheceu || '', CATEGORIAS[item.categoria], points[item.id] || 0, CRACHA[item.cracha_status], item.autoriza_comunicacoes ? 'Sim' : 'Não', item.autoriza_imagem ? 'Sim' : 'Não', new Date(item.created_at).toLocaleDateString('pt-BR')]));
  }

  async function toggleStatus(item: Member) {
    const status = item.status === 'suspenso' ? 'ativo' : 'suspenso';
    if (!window.confirm(`${status === 'suspenso' ? 'Suspender' : 'Reativar'} ${item.nome}?`)) return;
    await supabase.from('members').update({ status, updated_at: new Date().toISOString() }).eq('id', item.id);
    load();
  }

  async function remove(item: Member) {
    const typed = window.prompt(`Excluir ${item.nome} apaga cadastro, presenças e pontos e não pode ser desfeito. Para confirmar, digite o e-mail da pessoa:`);
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== item.email) { window.alert('O e-mail não confere. Nada foi excluído.'); return; }
    const { error } = await supabase.rpc('admin_excluir_membro', { p_member: item.id });
    if (error) window.alert('Não foi possível excluir.');
    load();
  }

  if (open) return <MemberEditor key={open.id} member={open} onBack={() => { setOpen(null); load(); }} />;
  return (
    <>
      <div className="wf-head"><div><small>MEMBROS</small><h1>Quem faz parte da comunidade</h1><p>{list.length} {list.length === 1 ? 'cadastro' : 'cadastros'}. Abra um membro para ver dados, pontos e presenças. Toda alteração fica registrada.</p></div><div className="v2-head-actions"><button type="button" className="wf-secondary" disabled={!visible.length} onClick={exportAll}>Exportar Excel</button></div></div>
      <div className="wf-controls"><input aria-label="Buscar membro" placeholder="Buscar por nome, e-mail ou empresa" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="adm-list">
        {visible.map((item) => (
          <div className="adm-row adm-row--static" key={item.id}>
            <strong>{item.nome}</strong>
            <span>{item.email}</span>
            <em>{item.status === 'suspenso' ? 'Suspenso' : CATEGORIAS[item.categoria]} · {points[item.id] || 0} pts</em>
            <button type="button" onClick={() => setOpen(item)}>Editar</button>
            <button type="button" onClick={() => void toggleStatus(item)}>{item.status === 'suspenso' ? 'Reativar' : 'Suspender'}</button>
            <button type="button" className="adm-danger" onClick={() => void remove(item)}>Excluir</button>
          </div>
        ))}
        {!visible.length && <p className="adm-hint">Nenhum membro encontrado.</p>}
      </div>
    </>
  );
}

function PollEditor({ poll, onBack }: { poll: Poll; onBack: () => void }) {
  const [draft, setDraft] = useState({ ...poll, opcoesTexto: poll.opcoes.join('\n') });
  const [votes, setVotes] = useState<Vote[]>([]);
  const [note, setNote] = useState('');
  const load = () => supabase.from('poll_votes').select('nota,opcao,texto,respondente,created_at').eq('poll_id', poll.id).order('created_at').then(({ data }) => setVotes((data || []) as Vote[]));
  useEffect(() => { void load(); const timer = window.setInterval(load, 4000); return () => window.clearInterval(timer); }, [poll.id]);

  async function persist(extra: Partial<Poll> = {}) {
    const next = { titulo: draft.titulo, pergunta: draft.pergunta, tipo: draft.tipo, anonima: draft.anonima, opcoes: draft.opcoesTexto.split('\n').map((item) => item.trim()).filter(Boolean), status: draft.status, revelada: draft.revelada, ...extra };
    if (next.tipo === 'multipla' && next.opcoes.length < 2) { setNote('Cadastre ao menos duas opções.'); return; }
    const { error } = await supabase.from('polls').update(next).eq('id', poll.id);
    if (error) { setNote(`Não foi possível salvar: ${error.message}`); return; }
    setDraft({ ...draft, ...next }); setNote('Alterações salvas.');
  }

  const notas = votes.filter((vote) => vote.nota !== null).map((vote) => vote.nota as number);
  const media = notas.length ? (notas.reduce((sum, value) => sum + value, 0) / notas.length).toFixed(1).replace('.', ',') : '-';
  const origin = window.location.origin;
  return (
    <>
      <button type="button" className="v2-forms-back" onClick={onBack}>Voltar para votações</button>
      <div className="wf-head"><div><small>VOTAÇÃO · {{ rascunho: 'RASCUNHO', ativa: 'RECEBENDO RESPOSTAS', encerrada: 'ENCERRADA' }[draft.status]}</small><h1>{draft.titulo}</h1><p>{votes.length} {votes.length === 1 ? 'resposta' : 'respostas'}{draft.tipo === 'nota' ? ` · média ${media}` : ''}</p></div>
        <div className="v2-head-actions">
          {draft.status !== 'ativa' && <button type="button" className="wf-primary" onClick={() => void persist({ status: 'ativa' })}>Ativar votação</button>}
          {draft.status === 'ativa' && <button type="button" className="wf-secondary" onClick={() => void persist({ status: 'encerrada' })}>Encerrar votação</button>}
          <button type="button" className="wf-secondary" onClick={() => void persist({ revelada: !draft.revelada })}>{draft.revelada ? 'Esconder resultado' : 'Revelar no telão'}</button>
        </div>
      </div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <div className="v2-forms-grid">
          <label><span>Título da dinâmica</span><input value={draft.titulo} onChange={(event) => setDraft({ ...draft, titulo: event.target.value })} /></label>
          <label><span>Tipo de resposta</span><select value={draft.tipo} disabled={votes.length > 0} onChange={(event) => setDraft({ ...draft, tipo: event.target.value as Poll['tipo'] })}><option value="nota">Nota de 0 a 10</option><option value="multipla">Múltipla escolha</option><option value="aberta">Resposta aberta</option></select></label>
          <label className="wide"><span>Pergunta</span><textarea rows={2} value={draft.pergunta} onChange={(event) => setDraft({ ...draft, pergunta: event.target.value })} /></label>
          {draft.tipo === 'multipla' && <label className="wide"><span>Opções, uma por linha</span><textarea rows={4} value={draft.opcoesTexto} onChange={(event) => setDraft({ ...draft, opcoesTexto: event.target.value })} /></label>}
          <label className="v2-forms-check"><input type="checkbox" checked={draft.anonima} onChange={(event) => setDraft({ ...draft, anonima: event.target.checked })} /><span><strong>Votação anônima</strong></span></label>
          <div className="adm-submit"><button type="button" className="wf-primary" onClick={() => void persist()}>Salvar alterações</button></div>
        </div>
      </section>
      <section className="v2-forms-card">
        <header><small>TELÃO</small><h2>Links desta dinâmica</h2></header>
        <div className="adm-links">
          <a className="wf-secondary" href={`${origin}/telao/votacao?edicao=${poll.slug}`} target="_blank" rel="noopener noreferrer">Abrir telão</a>
          <a className="wf-secondary" href={`${origin}/votar?edicao=${poll.slug}`} target="_blank" rel="noopener noreferrer">Abrir tela de resposta</a>
          <button type="button" className="wf-secondary" disabled={!votes.length} onClick={() => csv(`communicali-votacao-${poll.slug}.csv`, [['Data', 'Nota', 'Opção', 'Resposta', 'Respondente'], ...votes.map((vote) => [new Date(vote.created_at).toLocaleString('pt-BR'), vote.nota ?? '', vote.opcao || '', vote.texto || '', vote.respondente || ''])])}>Exportar CSV</button>
        </div>
        <p className="adm-hint">O resultado é a percepção de quem está presente, não uma pesquisa representativa do mercado.</p>
      </section>
    </>
  );
}

export function PollsPanel() {
  const [list, setList] = useState<Poll[]>([]);
  const [editions, setEditions] = useState<Array<{ id: string; titulo: string }>>([]);
  const [open, setOpen] = useState<Poll | null>(null);
  const [edition, setEdition] = useState('');
  const load = () => supabase.from('polls').select('*').order('created_at', { ascending: false }).then(({ data }) => setList((data || []) as Poll[]));
  useEffect(() => {
    void load();
    supabase.from('editions').select('id,titulo').order('data_evento', { ascending: false }).then(({ data }) => { setEditions(data || []); setEdition(data?.[0]?.id || ''); });
  }, []);

  async function create() {
    const titulo = 'Nova dinâmica';
    const slug = `${slugify(titulo)}-${Date.now().toString(36)}`;
    const { data } = await supabase.from('polls').insert({ edition_id: edition, slug, titulo, pergunta: 'Escreva a pergunta' }).select('*').single();
    if (data) { await load(); setOpen(data as Poll); }
  }

  if (open) return <PollEditor key={open.id} poll={open} onBack={() => { setOpen(null); void load(); }} />;
  return (
    <>
      <div className="wf-head"><div><small>VOTAÇÕES</small><h1>Perguntas para o telão</h1><p>Crie a pergunta, ative na hora da dinâmica e revele o resultado quando quiser. As respostas aparecem aqui e no telão em poucos segundos.</p></div>
        <div className="v2-head-actions"><select aria-label="Encontro" value={edition} onChange={(event) => setEdition(event.target.value)}>{editions.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select><button type="button" className="wf-primary" disabled={!edition} onClick={() => void create()}>Nova votação</button></div></div>
      <div className="adm-list">{list.map((item) => <button type="button" className="adm-row" key={item.id} onClick={() => setOpen(item)}><strong>{item.titulo}</strong><span>{item.pergunta}</span><em>{{ rascunho: 'Rascunho', ativa: 'Recebendo respostas', encerrada: 'Encerrada' }[item.status]}</em></button>)}</div>
    </>
  );
}

export function TextsPanel() {
  const [form, setForm] = useState({ cadastro_aberto: false, regras_texto: '', privacidade_texto: '', opcoes: '' });
  const [note, setNote] = useState('');
  useEffect(() => {
    supabase.from('site_settings').select('cadastro_aberto,regras_texto,privacidade_texto,como_conheceu_opcoes').single().then(({ data }) => { if (data) setForm({ ...data, opcoes: data.como_conheceu_opcoes.join('\n') }); });
  }, []);

  async function save() {
    if (form.cadastro_aberto && (!form.regras_texto.trim() || !form.privacidade_texto.trim())) { setNote('Para abrir o cadastro, preencha as regras e a política.'); return; }
    const { error } = await supabase.from('site_settings').update({ cadastro_aberto: form.cadastro_aberto, regras_texto: form.regras_texto.trim(), privacidade_texto: form.privacidade_texto.trim(), como_conheceu_opcoes: form.opcoes.split('\n').map((item) => item.trim()).filter(Boolean), updated_at: new Date().toISOString() }).eq('id', true);
    setNote(error ? 'Não foi possível salvar.' : 'Alterações salvas.');
  }

  return (
    <>
      <div className="wf-head"><div><small>TEXTOS</small><h1>Cadastro e textos</h1><p>Regras e política aparecem nas páginas públicas e nos aceites do cadastro e do check-in.</p></div><div className="v2-head-actions"><button type="button" className="wf-primary" onClick={() => void save()}>Salvar alterações</button></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <div className="v2-forms-grid">
          <label className="v2-forms-check wide"><input type="checkbox" checked={form.cadastro_aberto} onChange={(event) => setForm({ ...form, cadastro_aberto: event.target.checked })} /><span><strong>Cadastro aberto ao público</strong></span></label>
          <label className="wide"><span>Regras de participação</span><textarea rows={10} value={form.regras_texto} onChange={(event) => setForm({ ...form, regras_texto: event.target.value })} /></label>
          <label className="wide"><span>Política de privacidade</span><textarea rows={12} value={form.privacidade_texto} onChange={(event) => setForm({ ...form, privacidade_texto: event.target.value })} /></label>
          <label className="wide"><span>Opções de “Como conheceu”, uma por linha</span><textarea rows={6} value={form.opcoes} onChange={(event) => setForm({ ...form, opcoes: event.target.value })} /></label>
        </div>
      </section>
    </>
  );
}
