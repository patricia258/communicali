/* Painéis do Programa de Membros: Membros, Votações e Textos. Tudo o que muda dado fica em audit_log pelo banco. */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { downloadXlsx } from '../forms/formExports';
import { slugify } from '../forms/formModel';
import { CATEGORIAS } from './Checkin';
import { FAIXAS, PONTOS } from './AdminInicio';
import { Categoria, Email, Rede, Tabela, Telefone, dataBr, type Coluna } from './AdminTabela';

type Member = { segmento: string | null; regiao: string | null; busca: string[]; aberto_trabalho: boolean; recrutador: boolean; curriculo_path: string | null; na_rede: boolean; presta_servicos: boolean; instagram: string | null; codigo: string | null; temas: string[]; interesse_palestras: boolean; foto_url: string | null; id: string; status: string; nome: string; apelido: string | null; email: string; whatsapp: string | null; cidade_uf: string | null; empresa: string | null; cargo: string | null; linkedin: string | null; interesses: string[]; como_conheceu: string | null; categoria: string; cracha_status: string; autoriza_imagem: boolean; autoriza_comunicacoes: boolean; created_at: string };
type Extra = { adesao_status: string | null; adesao_motivo: string | null; adesao_origem: string | null; estagio_entrada: string | null; na_comunidade_whatsapp: boolean; termos_aceitos_em: string | null; privacidade_aceita_em: string | null; regras_aceitas_em: string | null };
type Ficha = { member_id: string; estagio: string; presencas_pre_membro: number; limite_pre_membro: number; limite_atingido: boolean };
type LogAdesao = { id: string; de: string | null; para: string; motivo: string | null; por: string | null; em: string };
const ESTAGIO: Record<string, string> = { convidado: 'Convidado', visitante: 'Visitante', membro: 'Membro' };
const ADESAO: Record<string, string> = { solicitada: 'Solicitada', em_analise: 'Em análise', ajustes: 'Ajustes necessários', aprovada: 'Aprovada', nao_aprovada: 'Não aprovada' };
type History = { id: string; checked_in_at: string; codigo: string; editions: { titulo: string } };
type Point = { id: string; acao: string; pontos: number; created_at: string; motivo: string | null };
type Poll = { id: string; slug: string; titulo: string; pergunta: string; pergunta_2: string | null; tipo: 'nota' | 'multipla' | 'aberta'; opcoes: string[]; anonima: boolean; status: 'rascunho' | 'ativa' | 'encerrada'; revelada: boolean; edition_id: string };
type Vote = { nota: number | null; nota_2?: number | null; opcao: string | null; texto: string | null; respondente: string | null; created_at: string };

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

function MemberEditor({ member: base, ficha, onBack, alternar, excluir }: { member: Member & Extra; ficha?: Ficha; onBack: () => void; alternar: () => void; excluir: () => void }) {
  const member = base;
  const [draft, setDraft] = useState(member);
  const [adesao, setAdesao] = useState({ status: member.adesao_status, motivo: member.adesao_motivo || '' });
  const [motivoAdesao, setMotivoAdesao] = useState('');
  const [naComunidade, setNaComunidade] = useState(member.na_comunidade_whatsapp);
  const [logAdesao, setLogAdesao] = useState<LogAdesao[]>([]);
  const [fichaAtual, setFichaAtual] = useState<Ficha | undefined>(ficha);
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
  useEffect(() => {
    supabase.from('adesao_log').select('id,de,para,motivo,por,em').eq('member_id', member.id).order('em', { ascending: false }).then(({ data }) => setLogAdesao((data || []) as LogAdesao[]));
    supabase.from('members_ficha').select('*').eq('member_id', member.id).maybeSingle().then(({ data }) => { if (data) setFichaAtual(data as Ficha); });
  }, [member.id, launch]);
  const text = (key: 'nome' | 'apelido' | 'whatsapp' | 'cidade_uf' | 'empresa' | 'cargo' | 'linkedin', label: string) => (
    <label><span>{label}</span><input value={draft[key] || ''} onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); setNote(''); }} /></label>
  );

  const total = points.reduce((sum, item) => sum + item.pontos, 0);
  const faixa = FAIXAS.find((band) => total >= band.de && total <= band.ate)?.nome;
  const label = (acao: string) => acao === 'presenca' ? 'Presença em encontro' : acao.startsWith('convidado:') ? 'Convidado compareceu' : acao.startsWith('contribuicao') ? 'Contribuição aprovada' : acao.startsWith('parceiro') ? 'Indicação de parceiro' : acao.startsWith('palestra') ? 'Palestra a convite' : acao.startsWith('recomendacao') ? 'Recomendação validada' : acao.startsWith('indicacao') ? 'Visitante indicado compareceu' : 'Ajuste';

  async function addPoints() {
    const valor = PONTOS.find(([key]) => key === kind)?.[2] || 0;
    if (!motivo.trim()) { setNote('Descreva o motivo do lançamento.'); return; }
    if (!window.confirm(`Lançar +${valor} milhas para ${member.nome}?`)) return;
    const { error } = await supabase.from('point_events').insert({ member_id: member.id, acao: `${kind}:${crypto.randomUUID()}`, pontos: valor, motivo: motivo.trim() });
    setNote(error ? `Não foi possível lançar: ${error.message}` : 'Pontos lançados.');
    if (!error) { setMotivo(''); setLaunch(launch + 1); }
  }

  async function decidir(status: string) {
    if ((status === 'ajustes' || status === 'nao_aprovada') && !motivoAdesao.trim()) { setNote('Escreva o motivo para esta decisão.'); return; }
    if (!window.confirm(`${{ em_analise: 'Marcar como em análise', aprovada: 'Aprovar a adesão de', ajustes: 'Pedir ajustes a', nao_aprovada: 'Não aprovar a adesão de' }[status]} ${member.nome}?`)) return;
    const { error } = await supabase.rpc('communicali_decidir_adesao', { p_member: member.id, p_status: status, p_motivo: motivoAdesao.trim() || null });
    if (error) { setNote(`Não foi possível registrar: ${error.message}`); return; }
    setAdesao({ status, motivo: motivoAdesao.trim() }); setMotivoAdesao(''); setNote('Decisão registrada.'); setLaunch((valor) => valor + 1);
  }

  async function marcarComunidade(valor: boolean) {
    setNaComunidade(valor);
    const { error } = await supabase.from('members').update({ na_comunidade_whatsapp: valor, na_comunidade_whatsapp_em: valor ? new Date().toISOString() : null }).eq('id', member.id);
    if (error) { setNaComunidade(!valor); setNote('Não foi possível salvar.'); }
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
      <section className="adm-ficha">
        {member.foto_url ? <img src={member.foto_url} alt={`Foto de ${member.nome}`} /> : <span className="adm-ficha__foto">{member.nome.charAt(0)}</span>}
        <div className="adm-ficha__dados">
          <div className="adm-ficha__titulo"><h1>{member.nome}</h1><Categoria id={draft.categoria} nome={CATEGORIAS[draft.categoria]} />{member.status === 'suspenso' && <Categoria id="suspenso" nome="Suspenso" />}{member.aberto_trabalho && <Categoria id="trabalho" nome="Open to work" />}{member.recrutador && <Categoria id="recrutador" nome="Recruta" />}</div>
          <p>{[member.cargo, member.empresa].filter(Boolean).join(', ') || 'Cargo não informado'} · {member.cidade_uf || member.regiao || 'Cidade não informada'}{member.segmento ? ` · ${member.segmento}` : ''}</p>
          <div className="adm-ficha__numeros"><p><strong>{total}</strong> milhas</p><p><strong>{history.length}</strong> encontros</p><p><strong>{dataBr(member.created_at)}</strong> desde</p><p><strong>{faixa}</strong> pela pontuação</p></div>
          <div className="adm-ficha__contatos"><Telefone numero={member.whatsapp} /><Email email={member.email} /><Rede valor={member.instagram} tipo="instagram" /><Rede valor={member.linkedin} tipo="linkedin" />{member.curriculo_path && <button type="button" className="adm-copiar" onClick={() => void supabase.storage.from('curriculos').createSignedUrl(member.curriculo_path!, 300).then(({ data }) => { if (data) window.open(data.signedUrl, '_blank', 'noopener'); })}>Abrir currículo</button>}</div>
        </div>
        <div className="adm-ficha__acoes"><button type="button" className="wf-primary" onClick={() => void save()}>Salvar alterações</button><button type="button" className="wf-secondary" onClick={alternar}>{member.status === 'suspenso' ? 'Reativar' : 'Suspender'}</button><button type="button" className="wf-secondary adm-danger" onClick={excluir}>Excluir</button></div>
      </section>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <div className="v2-forms-grid">
          {text('nome', 'Nome completo')}{text('apelido', 'Como prefere ser chamado')}{text('whatsapp', 'WhatsApp')}{text('cidade_uf', 'Cidade/UF')}{text('empresa', 'Empresa')}{text('cargo', 'Cargo')}{text('linkedin', 'LinkedIn')}
          <label><span>Categoria</span><select value={draft.categoria} onChange={(event) => setDraft({ ...draft, categoria: event.target.value })}>{Object.entries(CATEGORIAS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>Crachá</span><select value={draft.cracha_status} onChange={(event) => setDraft({ ...draft, cracha_status: event.target.value })}>{Object.entries(CRACHA).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
      </section>
      <section className="v2-forms-card">
        <header><small>ENTRADA E ADESÃO</small><h2>{ESTAGIO[fichaAtual?.estagio || 'visitante']}{adesao.status ? `, adesão ${ADESAO[adesao.status].toLowerCase()}` : ', sem pedido de adesão'}</h2></header>
        <div className="adm-perfil">
          <div><strong>Presenças antes da adesão</strong><p>{member.adesao_origem === 'legado' ? 'Membro desde antes da regra nova' : `${fichaAtual?.presencas_pre_membro ?? 0} de ${fichaAtual?.limite_pre_membro ?? 2}`}</p></div>
          <div><strong>Limite automático</strong><p>{fichaAtual?.limite_atingido ? 'Atingido: nova participação aberta exige adesão aprovada' : adesao.status === 'aprovada' ? 'Não se aplica (adesão aprovada)' : 'Dentro do limite'}</p></div>
          <div><strong>Pode pedir adesão</strong><p>{adesao.status === 'aprovada' ? 'Já é Membro' : (fichaAtual?.presencas_pre_membro ?? 0) >= 1 ? 'Sim, tem ao menos 1 presença validada' : 'Ainda não: falta a primeira presença validada'}</p></div>
          {adesao.motivo && <div><strong>Motivo registrado</strong><p>{adesao.motivo}</p></div>}
        </div>
        <ul className="adm-checklist">
          <li><b>{member.foto_url ? '✓' : '○'}</b> Foto enviada</li>
          <li><b>{member.whatsapp ? '✓' : '○'}</b> WhatsApp informado</li>
          <li><b>{member.termos_aceitos_em || member.regras_aceitas_em ? '✓' : '○'}</b> Aceite dos termos e regras</li>
          <li><b>{member.privacidade_aceita_em ? '✓' : '○'}</b> Aceite da política de privacidade</li>
          <li><label><input type="checkbox" checked={naComunidade} onChange={(event) => void marcarComunidade(event.target.checked)} /> <b>{naComunidade ? '✓' : '○'}</b> Está na comunidade do WhatsApp <em>(você marca)</em></label></li>
        </ul>
        {adesao.status !== 'aprovada' && (
          <div className="v2-forms-grid">
            <label className="wide"><span>Motivo <em>obrigatório para pedir ajustes ou não aprovar</em></span><input value={motivoAdesao} onChange={(event) => setMotivoAdesao(event.target.value)} /></label>
            <div className="adm-submit">
              <button type="button" className="wf-primary" onClick={() => void decidir('aprovada')}>Aprovar</button>
              <button type="button" className="wf-secondary" onClick={() => void decidir('ajustes')}>Pedir ajustes</button>
              <button type="button" className="wf-secondary" onClick={() => void decidir('nao_aprovada')}>Não aprovar</button>
              {adesao.status !== 'em_analise' && <button type="button" className="wf-secondary" onClick={() => void decidir('em_analise')}>Marcar em análise</button>}
            </div>
          </div>
        )}
        {!!logAdesao.length && <div className="adm-list">{logAdesao.map((item) => <div className="adm-row adm-row--static" key={item.id}><strong>{ADESAO[item.para] || item.para}</strong><span>{item.motivo || 'Sem motivo'}{item.por ? ` · ${item.por}` : ''}</span><em>{new Date(item.em).toLocaleString('pt-BR')}</em></div>)}</div>}
      </section>
      <section className="v2-forms-card">
        <header><small>NO ESPAÇO DO MEMBRO</small><h2>Perfil</h2></header>
        <div className="adm-perfil">
          <div><strong>Código</strong><p>{member.codigo || 'Ainda não gerado'}</p></div>
          <div><strong>O que faz</strong><p>{member.temas?.join(', ') || 'Não informado'}</p></div>
          <div><strong>O que busca</strong><p>{member.busca?.join(', ') || 'Não informado'}</p></div>
          <div><strong>Interesses</strong><p>{member.interesses?.join(', ') || 'Não informado'}</p></div>
          <div><strong>Palestras</strong><p>{member.interesse_palestras ? 'Quer contribuir' : 'Não marcou'}</p></div>
          <div><strong>Rede</strong><p>{member.na_rede ? 'Aparece' : 'Fora da Rede'}{member.presta_servicos ? ', oferece serviços' : ''}</p></div>
        </div>
      </section>
      <section className="v2-forms-card">
        <header><small>MILHAS</small><h2>Extrato: {total} milhas</h2></header>
        <div className="adm-list">{points.map((item) => <div className="adm-row adm-row--static" key={item.id}><strong>+{item.pontos}</strong><span>{label(item.acao)}{item.motivo ? ` · ${item.motivo}` : ''}</span><em>{new Date(item.created_at).toLocaleDateString('pt-BR')}</em></div>)}</div>
        {!points.length && <p className="adm-hint">Nenhuma milha ainda. O cadastro não gera milhas; a primeira presença soma 10.</p>}
        <div className="v2-forms-grid">
          <label><span>Lançar milhas</span><select value={kind} onChange={(event) => setKind(event.target.value)}>{PONTOS.filter(([key]) => key === 'contribuicao' || key === 'parceiro' || key === 'palestra').map(([key, text, value]) => <option key={key} value={key}>+{value} {text}</option>)}</select></label>
          <label><span>Motivo</span><input value={motivo} onChange={(event) => setMotivo(event.target.value)} /></label>
          <div className="adm-submit"><button type="button" className="wf-secondary" onClick={() => void addPoints()}>Lançar milhas</button></div>
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
  const [list, setList] = useState<Array<Member & Extra>>([]);
  const [points, setPoints] = useState<Record<string, number>>({});
  const [encontros, setEncontros] = useState<Record<string, { total: number }>>({});
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<(Member & Extra) | null>(null);
  const [fichas, setFichas] = useState<Record<string, Ficha>>({});
  const [params, setParams] = useSearchParams();
  const load = (abrirPedida = true) => {
    supabase.from('members_ficha').select('*').then(({ data }) => setFichas(Object.fromEntries(((data || []) as Ficha[]).map((item) => [item.member_id, item]))));
    supabase.from('members').select('*').order('created_at', { ascending: false }).then(({ data }) => { const itens = (data || []) as Array<Member & Extra>; setList(itens); const pedido = params.get('abrir'); if (abrirPedida && pedido) setOpen((atual) => atual || itens.find((item) => item.id === pedido) || null); });
    supabase.from('checkins').select('member_id').then(({ data }) => { const totais: Record<string, { total: number }> = {}; for (const row of data || []) totais[row.member_id] = { total: (totais[row.member_id]?.total || 0) + 1 }; setEncontros(totais); });
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
    const typed = window.prompt(`Excluir ${item.nome} apaga cadastro, presenças e milhas e não pode ser desfeito. Para confirmar, digite o e-mail da pessoa:`);
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== item.email) { window.alert('O e-mail não confere. Nada foi excluído.'); return; }
    const { error } = await supabase.rpc('admin_excluir_membro', { p_member: item.id });
    if (error) window.alert('Não foi possível excluir.');
    load();
  }

  if (open) return <MemberEditor key={open.id} member={open} ficha={fichas[open.id]} onBack={() => { setOpen(null); const proximo = new URLSearchParams(params); proximo.delete('abrir'); setParams(proximo, { replace: true }); load(false); }} alternar={() => void toggleStatus(open).then(() => setOpen(null))} excluir={() => void remove(open).then(() => setOpen(null))} />;
  const categoriaDe = (item: Member) => (item.status === 'suspenso' ? 'Suspenso' : fichas[item.id] && fichas[item.id].estagio !== 'membro' ? 'Ainda não é Membro' : CATEGORIAS[item.categoria] || item.categoria);
  const dias = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  const tempo = (iso: string) => { const total = dias(iso); return total < 30 ? `${total} dias` : total < 365 ? `${Math.floor(total / 30)} meses` : `${Math.floor(total / 365)} anos`; };
  const colunas: Array<Coluna<Member & Extra>> = [
    { id: 'nome', titulo: 'Nome', valor: (item) => item.nome, render: (item) => <button type="button" className="adm-nome" onClick={() => setOpen(item)}>{item.foto_url ? <img src={item.foto_url} alt="" /> : <span>{item.nome.charAt(0)}</span>}{item.nome}</button> },
    { id: 'categoria', titulo: 'Categoria', valor: categoriaDe, render: (item) => <Categoria id={item.status === 'suspenso' ? 'suspenso' : fichas[item.id] && fichas[item.id].estagio !== 'membro' ? 'visitante' : item.categoria} nome={categoriaDe(item)} /> },
    { id: 'estagio', titulo: 'Estágio', valor: (item) => ESTAGIO[fichas[item.id]?.estagio || 'visitante'], render: (item) => <Categoria id={fichas[item.id]?.estagio || 'visitante'} nome={ESTAGIO[fichas[item.id]?.estagio || 'visitante']} /> },
    { id: 'adesao', titulo: 'Adesão', valor: (item) => (item.adesao_origem === 'legado' ? 'Membro anterior' : item.adesao_status ? ADESAO[item.adesao_status] : 'Sem pedido') },
    { id: 'pre', titulo: 'Pré-Membro', valor: (item) => (item.adesao_origem === 'legado' ? '' : `${fichas[item.id]?.presencas_pre_membro ?? 0} de 2`) },
    { id: 'pontos', titulo: 'Milhas', valor: (item) => points[item.id] || 0 },
    { id: 'encontros', titulo: 'Encontros', valor: (item) => encontros[item.id]?.total || 0 },
    { id: 'desde', titulo: 'Desde', valor: (item) => item.created_at, render: (item) => dataBr(item.created_at) },
    { id: 'tempo', titulo: 'Tempo de casa', valor: (item) => dias(item.created_at), render: (item) => tempo(item.created_at) },
    { id: 'segmento', titulo: 'Segmento', valor: (item) => item.segmento || '' },
    { id: 'regiao', titulo: 'Região', valor: (item) => item.regiao || item.cidade_uf || '' },
    { id: 'whatsapp', titulo: 'WhatsApp', valor: (item) => item.whatsapp || '', render: (item) => <Telefone numero={item.whatsapp} /> },
    { id: 'email', titulo: 'E-mail', valor: (item) => item.email, render: (item) => <Email email={item.email} /> },
    { id: 'instagram', titulo: 'Instagram', valor: (item) => item.instagram || '', render: (item) => <Rede valor={item.instagram} tipo="instagram" /> },
    { id: 'mercado', titulo: 'Mercado', valor: (item) => (item.aberto_trabalho ? 'Open to work' : item.recrutador ? 'Recruta' : ''), },
  ];
  return (
    <>
      <div className="wf-head"><div><small>PESSOAS</small><h1>Membros e visitantes</h1><p>Veja o estágio e a adesão de cada pessoa. Abra o nome para consultar ou editar a ficha.</p></div><div className="v2-head-actions"><button type="button" className="wf-secondary" disabled={!visible.length} onClick={exportAll}>Exportar Excel</button></div></div>
      <Tabela colunas={colunas} colunasIniciais={['nome', 'estagio', 'adesao', 'pre']} linhas={list} chave={(item) => item.id} vazio="Nenhum membro encontrado." filtros={[{ id: 'categoria', titulo: 'Categoria', valor: categoriaDe }, { id: 'adesao', titulo: 'Adesão', valor: (item) => (item.adesao_origem === 'legado' ? 'Membro anterior' : item.adesao_status ? ADESAO[item.adesao_status] : 'Sem pedido') }, { id: 'segmento', titulo: 'Segmento', valor: (item) => item.segmento || '' }, { id: 'regiao', titulo: 'Região', valor: (item) => item.regiao || '' }, { id: 'mercado', titulo: 'Mercado', valor: (item) => (item.aberto_trabalho ? 'Open to work' : item.recrutador ? 'Recruta' : '') }]} />
    </>
  );
}

function PollEditor({ poll, onBack }: { poll: Poll; onBack: () => void }) {
  async function excluir() {
    if (!window.confirm(`Excluir a votação "${draft.titulo}" e todas as respostas? Esta ação não pode ser desfeita.`)) return;
    await supabase.from('poll_votes').delete().eq('poll_id', poll.id);
    const { error } = await supabase.from('polls').delete().eq('id', poll.id);
    if (error) { setNote(`Não foi possível excluir: ${error.message}`); return; }
    onBack();
  }
  const [draft, setDraft] = useState({ ...poll, pergunta_2: poll.pergunta_2 || '', opcoesTexto: poll.opcoes.join('\n') });
  const [votes, setVotes] = useState<Vote[]>([]);
  const [note, setNote] = useState('');
  useEffect(() => { if (!note) return undefined; const timer = window.setTimeout(() => setNote(''), 3500); return () => window.clearTimeout(timer); }, [note]);
  const load = () => supabase.from('poll_votes').select('nota,nota_2,opcao,texto,respondente,created_at').eq('poll_id', poll.id).order('created_at').then(({ data }) => setVotes((data || []) as Vote[]));
  useEffect(() => { void load(); const timer = window.setInterval(load, 4000); return () => window.clearInterval(timer); }, [poll.id]);

  async function persist(extra: Partial<Poll> = {}) {
    const next = { titulo: draft.titulo, pergunta: draft.pergunta, pergunta_2: draft.tipo === 'nota' && draft.pergunta_2.trim() ? draft.pergunta_2.trim() : null, tipo: draft.tipo, anonima: draft.anonima, opcoes: draft.opcoesTexto.split('\n').map((item) => item.trim()).filter(Boolean), status: draft.status, revelada: draft.revelada, ...extra };
    if (next.tipo === 'multipla' && next.opcoes.length < 2) { setNote('Cadastre ao menos duas opções.'); return; }
    const { error } = await supabase.from('polls').update(next).eq('id', poll.id);
    if (error) { setNote(`Não foi possível salvar: ${error.message}`); return; }
    setDraft({ ...draft, ...next, pergunta_2: next.pergunta_2 || '' }); setNote('Alterações salvas.');
  }

  const notas = votes.filter((vote) => vote.nota !== null).map((vote) => vote.nota as number);
  const notas2 = votes.filter((vote) => vote.nota_2 !== null && vote.nota_2 !== undefined).map((vote) => vote.nota_2 as number);
  const media2 = notas2.length ? (notas2.reduce((sum, value) => sum + value, 0) / notas2.length).toFixed(1).replace('.', ',') : '-';
  const media = notas.length ? (notas.reduce((sum, value) => sum + value, 0) / notas.length).toFixed(1).replace('.', ',') : '-';
  const origin = window.location.origin;
  const linkTelao = `${origin}/telao/resultado?edicao=${poll.slug}`;
  const linkVotar = `${origin}/votar?edicao=${poll.slug}`;
  const distancia = notas.length && notas2.length ? Math.abs(notas.reduce((a, b) => a + b, 0) / notas.length - notas2.reduce((a, b) => a + b, 0) / notas2.length).toFixed(1).replace('.', ',') : '-';
  const copiar = (link: string, texto: string) => { void navigator.clipboard.writeText(link); setNote(texto); };
  // Testes antes do encontro: apaga os votos e mantém as perguntas.
  async function zerar() {
    if (!window.confirm(`Apagar as ${votes.length} ${votes.length === 1 ? 'resposta' : 'respostas'} desta votação? As perguntas continuam. Use para limpar os testes antes do encontro.`)) return;
    const { error } = await supabase.from('poll_votes').delete().eq('poll_id', poll.id);
    setNote(error ? `Não foi possível apagar: ${error.message}` : 'Respostas apagadas. A votação está zerada.');
    void load();
  }
  return (
    <>
      <section className="v2-forms-card">
        <header className="adm-secao__topo"><div><small>VOTAÇÃO · {{ rascunho: 'RASCUNHO', ativa: 'RECEBENDO RESPOSTAS', encerrada: 'ENCERRADA' }[draft.status]}</small><h2>{draft.titulo}</h2></div>
          <div className="adm-links">
            <button type="button" className="wf-secondary" onClick={onBack}>Voltar para votações</button>
            {draft.status !== 'ativa' && <button type="button" className="wf-secondary" onClick={() => void persist({ status: 'ativa' })}>Ativar votação</button>}
            {draft.status === 'ativa' && <button type="button" className="wf-secondary" onClick={() => void persist({ status: 'encerrada' })}>Encerrar votação</button>}
          </div>
        </header>
        <div className="adm-cards">
          <div className="adm-card"><span>Respostas</span><strong>{votes.length}</strong><small>{draft.status === 'ativa' ? 'recebendo agora' : draft.status === 'encerrada' ? 'votação encerrada' : 'ainda em rascunho'}</small></div>
          {draft.tipo === 'nota' && <div className="adm-card"><span>{draft.pergunta_2 ? 'Na opinião' : 'Média'}</span><strong>{media}</strong><small>primeira pergunta</small></div>}
          {draft.tipo === 'nota' && draft.pergunta_2 && <div className="adm-card"><span>Na prática</span><strong>{media2}</strong><small>segunda pergunta</small></div>}
          {draft.tipo === 'nota' && draft.pergunta_2 && <div className="adm-card"><span>Distância</span><strong>{distancia}</strong><small>pontos entre as duas</small></div>}
        </div>
        <div className="adm-linha-acoes">
          <p className="adm-hint">Votou para testar? Zere antes do encontro: as perguntas continuam, só os votos saem.</p>
          <div className="adm-links">
            <button type="button" className="wf-secondary" disabled={!votes.length} onClick={() => csv(`communicali-votacao-${poll.slug}.csv`, [['Data', 'Nota', 'Nota 2', 'Opção', 'Resposta', 'Respondente'], ...votes.map((vote) => [new Date(vote.created_at).toLocaleString('pt-BR'), vote.nota ?? '', vote.nota_2 ?? '', vote.opcao || '', vote.texto || '', vote.respondente || ''])])}>Exportar CSV</button>
            <button type="button" className="wf-secondary adm-perigo" disabled={!votes.length} onClick={() => void zerar()}>Zerar respostas</button>
          </div>
        </div>
      </section>
      {note && <div className="v2-forms-toast" role="status">{note}</div>}

      <section className="v2-forms-card">
        <header className="adm-secao__topo"><div><small>NO DIA DO ENCONTRO</small><h2>O que abrir e onde</h2></div></header>
        <div className="adm-dia">
          <div className="adm-dia__item">
            <div><strong>Telão da sala</strong><p>Projete no telão. Mostra o QR Code para votar e o resultado mudando ao vivo. Abrindo por aqui, logada, a votação abre sozinha.</p></div>
            <div className="adm-links"><a className="wf-primary" href={linkTelao} target="_blank" rel="noopener noreferrer">Abrir telão</a><button type="button" className="wf-secondary" onClick={() => copiar(linkTelao, 'Link do telão copiado.')}>Copiar link</button></div>
          </div>
          <div className="adm-dia__item">
            <div><strong>Página de votar</strong><p>É o que o público vê no celular depois de ler o QR Code. Abra para conferir como fica.</p></div>
            <div className="adm-links"><a className="wf-secondary" href={linkVotar} target="_blank" rel="noopener noreferrer">Ver como o público vê</a><button type="button" className="wf-secondary" onClick={() => copiar(linkVotar, 'Link de votar copiado.')}>Copiar link</button></div>
          </div>
        </div>
      </section>

      <section className="v2-forms-card">
        <header className="adm-secao__topo"><div><small>PERGUNTAS</small><h2>O que a sala vai responder</h2></div>
          <div className="adm-links"><button type="button" className="wf-secondary" onClick={() => void persist()}>Salvar alterações</button></div></header>
        <div className="v2-forms-grid">
          <label><span>Título da dinâmica</span><input value={draft.titulo} onChange={(event) => setDraft({ ...draft, titulo: event.target.value })} /></label>
          <label><span>Tipo de resposta</span><select value={draft.tipo} disabled={votes.length > 0} title={votes.length ? 'Zere as respostas para trocar o tipo' : undefined} onChange={(event) => setDraft({ ...draft, tipo: event.target.value as Poll['tipo'] })}><option value="nota">Nota de 0 a 10</option><option value="multipla">Múltipla escolha</option><option value="aberta">Resposta aberta</option></select></label>
          <label className="wide"><span>Pergunta</span><textarea rows={2} value={draft.pergunta} onChange={(event) => setDraft({ ...draft, pergunta: event.target.value })} /></label>
          {draft.tipo === 'nota' && <label className="wide"><span>Segunda pergunta (opcional)</span><textarea rows={2} value={draft.pergunta_2} placeholder="Respondida em seguida, também de 0 a 10" onChange={(event) => setDraft({ ...draft, pergunta_2: event.target.value })} /></label>}
          {draft.tipo === 'multipla' && <label className="wide"><span>Opções, uma por linha</span><textarea rows={4} value={draft.opcoesTexto} onChange={(event) => setDraft({ ...draft, opcoesTexto: event.target.value })} /></label>}
          <label className="v2-forms-check wide"><input type="checkbox" checked={draft.anonima} onChange={(event) => setDraft({ ...draft, anonima: event.target.checked })} /><span><strong>Votação anônima</strong><small>Ninguém vê quem deu qual nota.</small></span></label>
        </div>
      </section>

      <div className="adm-zona-perigo"><span>Não vai mais usar esta votação?</span><button type="button" className="wf-secondary adm-perigo" onClick={() => void excluir()}>Excluir esta votação</button></div>
    </>
  );
}

export function VotacoesDaEdicao({ editionId, editionSlug }: { editionId: string; editionSlug: string }) {
  const [list, setList] = useState<Poll[]>([]);
  const [open, setOpen] = useState<Poll | null>(null);
  const load = () => supabase.from('polls').select('*').eq('edition_id', editionId).order('created_at').then(({ data }) => setList((data || []) as Poll[]));
  useEffect(() => { void load(); }, [editionId]);
  async function create() {
    // A primeira votação usa o mesmo endereço da edição (o QR Code de comuni.calirh.com/votar cai nela).
    const slug = list.length ? `${editionSlug}-${Date.now().toString(36)}` : editionSlug;
    const { data } = await supabase.from('polls').insert({ edition_id: editionId, slug, titulo: 'Nova votação', pergunta: 'Escreva a pergunta' }).select('*').single();
    if (data) { await load(); setOpen(data as Poll); }
  }
  if (open) return <PollEditor key={open.id} poll={open} onBack={() => { setOpen(null); void load(); }} />;
  return (
    <section className="v2-forms-card">
      <header className="adm-envios__topo"><div><small>VOTAÇÃO</small><h2>{list.length ? `${list.length} ${list.length === 1 ? 'votação' : 'votações'} desta edição` : 'Nenhuma votação ainda'}</h2></div>
        <div className="adm-links"><button type="button" className="wf-secondary" onClick={() => void create()}>Nova votação</button></div></header>
      <div className="adm-list">{list.map((item) => <button type="button" className="adm-row" key={item.id} onClick={() => setOpen(item)}><strong>{item.titulo}</strong><span>{item.pergunta}</span><em>{{ rascunho: 'Rascunho', ativa: 'Recebendo respostas', encerrada: 'Encerrada' }[item.status]}</em></button>)}</div>
    </section>
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
  const [form, setForm] = useState({ cadastro_aberto: false, regras_texto: '', privacidade_texto: '', termos_texto: '', opcoes: '' });
  const [note, setNote] = useState('');
  useEffect(() => {
    supabase.from('site_settings').select('cadastro_aberto,regras_texto,privacidade_texto,termos_texto,como_conheceu_opcoes').single().then(({ data }) => { if (data) setForm({ ...data, termos_texto: data.termos_texto || '', opcoes: data.como_conheceu_opcoes.join('\n') }); });
  }, []);

  async function save() {
    if (form.cadastro_aberto && (!form.regras_texto.trim() || !form.privacidade_texto.trim())) { setNote('Para abrir o cadastro, preencha as regras e a política.'); return; }
    const { error } = await supabase.from('site_settings').update({ cadastro_aberto: form.cadastro_aberto, regras_texto: form.regras_texto.trim(), privacidade_texto: form.privacidade_texto.trim(), termos_texto: form.termos_texto.trim(), como_conheceu_opcoes: form.opcoes.split('\n').map((item) => item.trim()).filter(Boolean), updated_at: new Date().toISOString() }).eq('id', true);
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
          <label className="wide"><span>Termos de participação</span><textarea rows={12} value={form.termos_texto} onChange={(event) => setForm({ ...form, termos_texto: event.target.value })} /></label>
          <label className="wide"><span>Opções de “Como conheceu”, uma por linha</span><textarea rows={6} value={form.opcoes} onChange={(event) => setForm({ ...form, opcoes: event.target.value })} /></label>
        </div>
      </section>
    </>
  );
}
