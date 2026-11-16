import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Paperclip, Plus, Save, Download, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { selecionarCustos, situacaoCusto, situacoesCusto, vencimentoLista, agendarCusto, brl, categoriaCusto, consolidarCustos, decimalInteiro, distribuirParcelas, entradaDecimal, resumoCusto, totalCusto, type CategoriaCusto, type Custo, type ParcelaCusto, type Recebedor } from '../lib/custos';
import { dataBr } from './AdminTabela';

type Evento = { id: string; titulo: string; data_evento: string; slug: string };
type Cadastro = { id: string; nome: string; cpf?: string; cnpj?: string; documento?: string; tipo?: string; email?: string; pix?: string; pix_tipo?: string; banco?: string; funcao?: string; comprovante?: string; valor_combinado?: string; pagamento_combinado?: string; created_at?: string };
type Anexo = { id: string; cost_id: string; tipo: string; nome: string; storage_path: string };
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const novoRecebedor = (): Recebedor => ({ nome: '', pessoa: 'a_definir', documento: '', email: '', pix: '', pix_tipo: '', banco: '' });
const parcela = (descricao = 'Pagamento integral', bp = 10000, regra = ''): ParcelaCusto => ({ id: crypto.randomUUID(), descricao, percentual_bp: bp, vencimento: null, regra, pago_centavos: 0, pago_em: null, forma: 'Pix', vencimento_modo: /primeiro dia útil/i.test(regra) ? 'pos_evento' : 'manual' });
const novoCusto = (edition_id: string): Custo => ({ id: crypto.randomUUID(), edition_id, categoria: 'staff', titulo: '', origem_tabela: 'manual', origem_id: null, recebedor: novoRecebedor(), itens: [{ id: crypto.randomUUID(), descricao: 'Serviço', quantidade_mil: 1000, unitario_centavos: null }], parcelas: [parcela('Pagamento integral', 10000, 'Primeiro dia útil após o evento.')], documento: 'a_definir', observacoes: '', version: 0 });
async function buscarTodos(tabela: string, campos = '*') {
  const rows: unknown[] = [];
  for (;;) {
    const result = await supabase.from(tabela).select(campos, { count: 'exact' }).order('id').range(rows.length, rows.length + 999);
    if (result.error) return { data: null, error: result.error };
    const page = result.data || []; rows.push(...page);
    if (result.count !== null && rows.length >= result.count) return { data: rows, error: null };
    if (!page.length || (result.count === null && page.length < 1000)) return { data: rows, error: null };
  }
}
const nomesDoc: Record<string, string> = { nf: 'Nota fiscal', recibo: 'Recibo', comprovante: 'Comprovante de pagamento', outro: 'Outro documento', a_definir: 'A definir', nao_exige: 'Sem documento exigido' };

export function AdminCustos({ edicaoId }: { edicaoId?: string }) {
  const [params, setParams] = useSearchParams();
  const eventoId = edicaoId || params.get('evento') || '';
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [cadastros, setCadastros] = useState<Record<string, Cadastro[]>>({ staff: [], fornecedores: [], partners: [] });
  const [aviso, setAviso] = useState('');
  const [pronto, setPronto] = useState(false);
  const [atualizar, setAtualizar] = useState(0);
  const [aberto, setAberto] = useState<Custo | null>(null);
  const [situacao,setSituacao]=useState('todos'),[categoria,setCategoria]=useState(''),[busca,setBusca]=useState(''),[ordem,setOrdem]=useState('vencimento_asc');
  const [periodo,setPeriodo]=useState('todos'),[de,setDe]=useState(''),[ate,setAte]=useState('');
  const listaId=useId();
  const dia=hoje();
  const somarDias=(data:string,n:number)=>new Date(new Date(`${data}T12:00:00Z`).getTime()+n*86400000).toISOString().slice(0,10);
  const inicio=periodo==='hoje'||periodo==='semana'?dia:periodo==='mes'?dia.slice(0,7)+'-01':periodo==='personalizado'?de:'';
  const fim=periodo==='hoje'?dia:periodo==='semana'?somarDias(dia,6):periodo==='mes'?new Date(Date.UTC(Number(dia.slice(0,4)),Number(dia.slice(5,7)),0,12)).toISOString().slice(0,10):periodo==='personalizado'?ate:'';
  const intervaloInvalido=Boolean(inicio&&fim&&inicio>fim);
  useEffect(() => {
    let ativo = true;
    void Promise.all([
      supabase.from('editions').select('id,titulo,data_evento,slug').order('data_evento', { ascending: false }),
      buscarTodos('event_costs'),
      buscarTodos('event_cost_documents', 'id,cost_id,tipo,nome,storage_path'),
      supabase.from('staff').select('id,nome,cpf,cnpj,email,pix,pix_tipo,banco,funcao,comprovante,valor_combinado,pagamento_combinado,created_at').order('created_at', { ascending: false }),
      supabase.from('fornecedores').select('id,nome,tipo,documento,email,pix,pix_tipo,banco,created_at').order('created_at', { ascending: false }),
      supabase.from('partners').select('id,nome'),
    ]).then(([eds, valores, documentos, staff, fornecedores, partners]) => {
      if (!ativo) return;
      if (eds.error || valores.error || documentos.error) { setAviso('Não foi possível carregar os custos. A área financeira precisa estar ativa no banco.'); setPronto(false); return; }
      setEventos(eds.data || []); setCustos(((valores.data || []) as Custo[]).map(c => agendarCusto(c, eds.data?.find(e => e.id === c.edition_id)?.data_evento))); setAnexos((documentos.data || []) as Anexo[]); setPronto(true);
      setCadastros({ staff: staff.data || [], fornecedores: fornecedores.data || [], partners: partners.data || [] });
      setAviso(staff.error || fornecedores.error || partners.error ? 'Parte dos cadastros não carregou. Confira o cadastro antes de preencher os dados manualmente.' : '');
    });
    return () => { ativo = false; };
  }, [atualizar]);
  const recarregar = () => setAtualizar((v) => v + 1);
  const filtrados = custos.filter((c) => !eventoId || c.edition_id === eventoId);
  let resumo; let erroCalculo = '';
  try { resumo = consolidarCustos(filtrados, hoje()); } catch { erroCalculo = 'Há um registro com valores inconsistentes. Confira os itens antes de usar os totais.'; }
  const anteriores=selecionarCustos(filtrados,dia,{categoria,busca,de:inicio,ate:fim});
  const visiveis=intervaloInvalido?[]:selecionarCustos(anteriores,dia,{situacao,ordem,de:inicio,ate:fim});
  const abasLista=[['todos','Todos'],['a_pagar','A pagar'],['pago','Pagos'],['parcial','Parciais'],['vencido','Vencidos'],['a_definir','A definir']].map(([id,label])=>({id,label,quantidade:selecionarCustos(anteriores,dia,{situacao:id}).length}));
  if (aberto) return <EditorCusto key={aberto.id} base={aberto} eventos={eventos} cadastros={cadastros} voltar={() => { setAberto(null); recarregar(); }} salvo={recarregar} />;
  const documentoPendente = (c: Custo) => ['nf', 'recibo'].includes(c.documento) && !anexos.some((a) => a.cost_id === c.id && a.tipo === c.documento);
  return <>
    <div className="wf-head"><div><small>CUSTOS DOS ENCONTROS</small><h1>Quanto cada encontro custa</h1><p>Registre serviços, materiais, despesas de parceria e pagamentos. Confira o que já foi pago e o que ainda falta.</p></div><button className="wf-primary" type="button" disabled={!pronto} onClick={() => setAberto(novoCusto(eventoId))}><Plus size={16} />Adicionar custo</button></div>
    <div className="adm-custos-filtro">{!edicaoId && <label>Encontro<select value={eventoId} onChange={(e) => { const p = new URLSearchParams(params); if (e.target.value) p.set('evento', e.target.value); else p.delete('evento'); setParams(p); }}><option value="">Todos os encontros</option>{eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.titulo} · {dataBr(ev.data_evento)}</option>)}</select></label>}<button type="button" className="wf-secondary" onClick={recarregar}>Atualizar</button></div>
    <div className="adm-custos-totais" aria-label="Resumo dos custos">
      <div><span>Total informado{resumo?.pendentes ? ' (parcial)' : ''}</span><strong>{pronto && resumo ? brl(resumo.informado) : '—'}</strong><small>{resumo?.pendentes ? `${resumo.pendentes} custo(s) com valor a definir` : 'Valores conhecidos'}</small></div>
      <div><span>Já pago</span><strong>{pronto && resumo ? brl(resumo.pago) : '—'}</strong><small>Pagamentos registrados</small></div>
      <div><span>A pagar{resumo?.pendentes ? ' (parcial)' : ''}</span><strong>{pronto && resumo ? brl(resumo.saldo) : '—'}</strong><small>Saldo dos valores já informados</small></div>
      <div><span>Vencido</span><strong>{pronto && resumo ? brl(resumo.vencido) : '—'}</strong><small>Somente parcelas com vencimento informado</small></div>
    </div>
    {(aviso || erroCalculo) && <p className="inline-notice" role="status">{aviso || erroCalculo}</p>}
    <NavAbas nome="Situação dos custos" itens={abasLista} ativa={situacao} mudar={setSituacao} prefixo={listaId} painelUnico />
    <div className="adm-custos-controles">
      <label className="adm-custos-busca"><span>Buscar custo ou responsável</span><input type="search" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Nome do item ou responsável" /></label>
      <label><span>Categoria</span><select value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="">Todas as categorias</option>{Object.entries(categoriaCusto).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label><span>Período de vencimento</span><select value={periodo} onChange={e=>setPeriodo(e.target.value)}><option value="todos">Todos os períodos</option><option value="hoje">Hoje</option><option value="semana">Próximos 7 dias</option><option value="mes">Este mês</option><option value="personalizado">Escolher período</option></select></label>
      <label><span>Ordenar por</span><select value={ordem} onChange={e=>setOrdem(e.target.value)}><option value="vencimento_asc">Vencimento: mais próximo</option><option value="vencimento_desc">Vencimento: mais distante</option><option value="valor_desc">Maior valor</option><option value="valor_asc">Menor valor</option><option value="nome">Nome: A–Z</option></select></label>
      {periodo==='personalizado'&&<><label><span>Vencimento a partir de</span><input type="date" value={de} onInput={e=>setDe(e.currentTarget.value)} /></label><label><span>Vencimento até</span><input type="date" value={ate} onInput={e=>setAte(e.currentTarget.value)} /></label></>}
    </div>
    {intervaloInvalido&&<p role="alert" className="inline-notice">A data inicial precisa ser anterior ou igual à data final.</p>}
    <div className="adm-custos-lista-head"><p>{visiveis.length} custo(s) nesta visualização</p><button className="wf-secondary" type="button" onClick={()=>{setSituacao('todos');setCategoria('');setBusca('');setPeriodo('todos');setDe('');setAte('');setOrdem('vencimento_asc');}}>Limpar filtros</button></div>
    <div id={`${listaId}-painel`} role="tabpanel" aria-labelledby={`${listaId}-${situacao}`} className="adm-tabela">
      <table aria-label="Custos por vencimento"><thead><tr><th scope="col">Item e responsável</th><th scope="col">Vencimento</th><th scope="col">Custo</th><th scope="col">Pagamento e documentos</th></tr></thead><tbody>
      {(pronto?visiveis:[]).map(c=>{const r=resumoCusto(c,dia),t=totalCusto(c.itens),status=situacaoCusto(c,dia),vencimento=vencimentoLista(c,inicio,fim);return <tr key={c.id}>
        <td data-label="Item e responsável"><button className="adm-nome adm-custo-nome" type="button" onClick={()=>setAberto(c)}><strong>{c.titulo}</strong><small>{c.recebedor.nome} · {categoriaCusto[c.categoria]}</small><small>{eventos.find(e=>e.id===c.edition_id)?.titulo}</small></button></td>
        <td data-label="Vencimento">{vencimento?dataBr(vencimento):'A definir'}{c.parcelas.length>1&&<small className="adm-custo-pendente">{c.parcelas.length} parcelas · {inicio||fim?'no período':status==='pago'?'quitado':'próximo vencimento'}</small>}</td>
        <td data-label="Custo">{t.total===null&&t.conhecido===0?'A definir':brl(t.conhecido)}{t.pendentes>0&&t.conhecido>0&&<small className="adm-custo-pendente">+ valor a definir</small>}</td>
        <td data-label="Pagamento e documentos"><span className={`adm-custo-status adm-custo-status--${status}`}>{situacoesCusto[status]}</span>{documentoPendente(c)&&<small className="adm-custo-pendente"><span className="adm-custo-status adm-custo-status--documento">Falta {nomesDoc[c.documento].toLowerCase()}</span></small>}{r.vencido>0&&<small className="adm-custo-pendente">Vencido: {brl(r.vencido)}</small>}</td>
      </tr>;})}
      {(!pronto||!visiveis.length)&&<tr><td colSpan={4} className="adm-vazio">{pronto?'Nenhum custo encontrado com estes filtros.':'Carregando custos…'}</td></tr>}
      </tbody></table>
    </div>
    <p className="adm-hint">O resumo acima considera todos os custos dos encontros selecionados. O período filtra vencimentos; o valor da linha corresponde ao custo completo.</p>
    <p className="adm-hint">O primeiro dia útil após o evento é calculado automaticamente. Reserva e entrega usam a data combinada. Inclua os feriados locais no calendário do custo.</p>
  </>;
}

function EditorCusto({ base, eventos, cadastros, voltar, salvo }: { base: Custo; eventos: Evento[]; cadastros: Record<string, Cadastro[]>; voltar: () => void; salvo: () => void }) {
  const [draft, setDraft] = useState<Custo>(() => agendarCusto(base, eventos.find(e => e.id === base.edition_id)?.data_evento));
  const [feriado, setFeriado] = useState('');
  const [aba,setAba]=useState('cadastro');
  const editorId=useId();
  const abasEditor=[{id:'cadastro',label:'Cadastro'},{id:'itens',label:'Itens e valores'},{id:'pagamentos',label:'Parcelas e pagamentos'},{id:'documentos',label:'Documentos'},{id:'observacoes',label:'Observações'}];
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState('');
  const [docs, setDocs] = useState<Anexo[]>([]);
  const [tipoDoc, setTipoDoc] = useState('nf');
  const input = useRef<HTMLInputElement>(null);
  const set = (novo: Partial<Custo>) => { setDraft(d => { const c={...d,...novo};return agendarCusto(c,eventos.find(e=>e.id===c.edition_id)?.data_evento); }); setAviso(''); };
  const rec = (campo: keyof Recebedor, valor: string) => set({ recebedor: { ...draft.recebedor, [campo]: valor } });
  const atualizarDocs = async () => { const { data, error } = await supabase.from('event_cost_documents').select('id,cost_id,tipo,nome,storage_path').eq('cost_id', draft.id); if (error) throw error; setDocs(data || []); };
  useEffect(() => { if (base.version) void atualizarDocs().catch(() => setAviso('Não foi possível carregar os documentos.')); }, [base.id]);
  const tabelaOrigem = draft.categoria === 'staff' ? 'staff' : draft.categoria === 'fornecedor' ? 'fornecedores' : 'partners';
  function importar(id: string) {
    const origem = cadastros[tabelaOrigem].find((p) => p.id === id); if (!origem) { set({ origem_tabela: 'manual', origem_id: null }); return; }
    const pessoa = tabelaOrigem === 'partners' ? 'a_definir' : origem.cnpj || origem.tipo === 'empresa' || origem.comprovante === 'nota' ? 'PJ' : 'PF';
    let valor = null; try { valor = decimalInteiro(origem.valor_combinado || ''); } catch { /* Condições descritivas continuam nas observações, sem adivinhar um preço. */ }
    set({ origem_tabela: tabelaOrigem, origem_id: id, recebedor: { nome: origem.nome, pessoa, documento: origem.cnpj || origem.documento || origem.cpf || '', email: origem.email || '', pix: origem.pix || '', pix_tipo: origem.pix_tipo || '', banco: origem.banco || '', importado_em: new Date().toISOString() },
      documento: origem.comprovante === 'nota' ? 'nf' : origem.comprovante === 'recibo' ? 'recibo' : draft.documento,
      observacoes: [draft.observacoes, origem.pagamento_combinado].filter(Boolean).join('\n'),
      itens: valor !== null && draft.itens.length === 1 && draft.itens[0].unitario_centavos === null ? [{ ...draft.itens[0], descricao: origem.funcao || draft.itens[0].descricao, unitario_centavos: valor }] : draft.itens });
  }
  let totais: ReturnType<typeof resumoCusto> | null = null, erro = '';
  try { totais = resumoCusto(draft, hoje()); } catch (e) { erro = e instanceof Error ? e.message : 'Confira os valores.'; }
  async function salvar(alvo = draft, mensagem = 'Custo salvo.') {
    setAviso(''); if (!alvo.edition_id || !alvo.titulo.trim() || !alvo.recebedor.nome.trim()) { setAba('cadastro'); setAviso('Escolha o encontro e preencha o item e o nome do recebedor.'); return; }
    if (alvo.itens.some((i) => !i.descricao.trim())) { setAba('itens'); setAviso('Descreva todos os itens do custo.'); return; }
    try { resumoCusto(alvo, hoje()); } catch (e) { setAba(alvo.itens.some(i=>!Number.isInteger(i.quantidade_mil)||i.quantidade_mil<=0||(i.unitario_centavos!==null&&(!Number.isInteger(i.unitario_centavos)||i.unitario_centavos<0)))?'itens':'pagamentos'); setAviso(e instanceof Error ? e.message : 'Confira os valores.'); return; }
    setBusy(true);
    try {
      const { version, updated_at: _updated, ...campos } = alvo;
      const query = version ? supabase.from('event_costs').update(campos).eq('id', alvo.id).eq('version', version) : supabase.from('event_costs').insert(campos);
      const { data, error } = await query.select('*').single();
      if (error || !data) throw new Error('Não foi possível salvar. Se o item foi alterado em outra janela, reabra-o antes de editar.');
      setDraft(data as Custo); setAviso(mensagem); salvo();
    } catch (e) { setAviso(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  async function anexar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf','xml','jpg','jpeg','png'].includes(ext || '') || file.size > 10 * 1024 * 1024) { setAviso('Anexe PDF, XML, JPG ou PNG de até 10 MB.'); return; }
    const mime = ext === 'xml' ? 'application/xml' : ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';
    setBusy(true);
    const path = `${draft.id}/${crypto.randomUUID()}.${ext}`;
    try {
      const { error } = await supabase.storage.from('event-cost-documents').upload(path, file, { contentType: mime }); if (error) throw error;
      const { error: metadata } = await supabase.from('event_cost_documents').insert({ cost_id: draft.id, tipo: tipoDoc, nome: file.name, storage_path: path });
      if (metadata) { await supabase.storage.from('event-cost-documents').remove([path]); throw metadata; }
      await atualizarDocs(); salvo(); setAviso('Documento anexado. Acesso restrito à organização.');
    } catch { setAviso('Não foi possível anexar o documento.'); }
    finally { setBusy(false); }
  }
  async function baixar(doc: Anexo) {
    const { data, error } = await supabase.storage.from('event-cost-documents').createSignedUrl(doc.storage_path, 120, { download: doc.nome });
    if (error || !data) { setAviso('Não foi possível abrir o documento.'); return; }
    window.location.assign(data.signedUrl);
  }
  function alterarParcela(id: string, novo: Partial<ParcelaCusto>) { set({ parcelas: draft.parcelas.map((p) => p.id === id ? { ...p, ...novo } : p) }); }
  return <>
    <button className="v2-forms-back" type="button" onClick={voltar}>Voltar para custos</button>
    <div className="wf-head"><div><small>CUSTOS · {categoriaCusto[draft.categoria].toUpperCase()}</small><h1>{base.version ? base.titulo : 'Novo custo'}</h1><p>Valores, condições e documentos do que foi combinado para este encontro.</p></div><button className="wf-primary" type="button" disabled={busy} onClick={() => void salvar()}><Save size={15} />{busy ? 'Aguarde…' : 'Salvar custo'}</button></div>
    <NavAbas nome="Seções do custo" itens={abasEditor} ativa={aba} mudar={setAba} prefixo={editorId} />
    <fieldset className="adm-custo-campos" disabled={busy}>
    <div className="adm-custo-painel" role="tabpanel" id={`${editorId}-cadastro-painel`} aria-labelledby={`${editorId}-cadastro`} hidden={aba!=='cadastro'}>
    <section className="v2-forms-card"><header><h2>Item e cadastro</h2></header><div className="v2-forms-grid">
      <label><span>Encontro</span><select value={draft.edition_id} onChange={(e) => set({ edition_id: e.target.value })}><option value="">Escolha o encontro</option>{eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.titulo} · {dataBr(ev.data_evento)}</option>)}</select></label>
      <label><span>Categoria</span><select value={draft.categoria} onChange={(e) => set({ categoria: e.target.value as CategoriaCusto, origem_tabela: 'manual', origem_id: null })}>{Object.entries(categoriaCusto).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
      <label className="wide"><span>Importar cadastro existente</span><select value={draft.origem_id || ''} onChange={(e) => importar(e.target.value)}><option value="">Preenchimento manual / cadastro pendente</option>{cadastros[tabelaOrigem].map((p) => <option key={p.id} value={p.id}>{p.nome}{p.funcao ? ` · ${p.funcao}` : ''}{p.created_at ? ` · ${dataBr(p.created_at)}` : ''}</option>)}</select></label>
      <label className="wide"><span>Nome do custo</span><input placeholder="Ex.: recepção e apoio" value={draft.titulo} onChange={(e) => set({ titulo: e.target.value })} /></label>
      <label><span>Nome / razão social</span><input value={draft.recebedor.nome} onChange={(e) => rec('nome', e.target.value)} /></label>
      <label><span>Pessoa física ou jurídica</span><select value={draft.recebedor.pessoa} onChange={(e) => rec('pessoa', e.target.value)}><option value="a_definir">A definir</option><option value="PF">Pessoa física (PF)</option><option value="PJ">Pessoa jurídica (PJ)</option></select></label>
      {(['documento','email','pix_tipo','pix','banco'] as const).map((campo) => <label key={campo}><span>{{ documento: 'CPF / CNPJ', email: 'E-mail', pix_tipo: 'Tipo da chave Pix', pix: 'Chave Pix', banco: 'Banco' }[campo]}</span><input value={draft.recebedor[campo]} onChange={(e) => rec(campo, e.target.value)} /></label>)}
    </div><details className="adm-ajuda"><summary>Orientações</summary><p>{draft.origem_id ? `Dados importados do cadastro em ${dataBr(draft.recebedor.importado_em)}. Confira a titularidade e a chave antes de pagar.` : 'Preenchimento manual: confira se o recebedor ainda precisa enviar o cadastro de Staff ou Fornecedor.'}</p></details></section>
</div>
    <div className="adm-custo-painel" role="tabpanel" id={`${editorId}-itens-painel`} aria-labelledby={`${editorId}-itens`} hidden={aba!=='itens'}>
    <section className="v2-forms-card"><header><h2>Composição do custo</h2></header><div className="adm-custo-itens">{draft.itens.map((item, i) => <div className="adm-custo-item" key={item.id}>
      <label><span>Item {i + 1}</span><input value={item.descricao} onChange={(e) => set({ itens: draft.itens.map((r) => r.id === item.id ? { ...r, descricao: e.target.value } : r) })} /></label>
      <Numero label={`Quantidade do item ${i + 1}`} value={item.quantidade_mil} casas={3} onChange={(v) => set({ itens: draft.itens.map((r) => r.id === item.id ? { ...r, quantidade_mil: v ?? 0 } : r) })} />
      <Numero label={`Valor unitário do item ${i + 1} (R$)`} value={item.unitario_centavos} onChange={(v) => set({ itens: draft.itens.map((r) => r.id === item.id ? { ...r, unitario_centavos: v } : r) })} />
      <button className="wf-secondary" type="button" aria-label={`Retirar item ${i + 1}`} disabled={draft.itens.length === 1} onClick={() => set({ itens: draft.itens.filter((r) => r.id !== item.id) })}><X size={16} /></button>
    </div>)}</div><button className="wf-secondary" type="button" onClick={() => set({ itens: [...draft.itens, { id: crypto.randomUUID(), descricao: '', quantidade_mil: 1000, unitario_centavos: null }] })}><Plus size={14} />Adicionar item / VT</button>
    <p className="adm-custo-total"><strong>{totais ? brl(totais.conhecido) : 'Confira os valores'}</strong>{totais?.pendentes ? ' + valores a definir' : ' total combinado'}</p><p className="adm-hint">Deixe o valor vazio quando ainda não foi combinado. Zero significa custo gratuito, confirmado.</p></section>
</div>
    <div className="adm-custo-painel" role="tabpanel" id={`${editorId}-pagamentos-painel`} aria-labelledby={`${editorId}-pagamentos`} hidden={aba!=='pagamentos'}>
    <section className="v2-forms-card"><header><h2>Parcelas e pagamentos</h2></header><div className="adm-links">
      <button type="button" className="wf-secondary" disabled={draft.parcelas.some((p) => p.pago_centavos > 0)} onClick={() => set({ parcelas: [parcela('Pagamento integral', 10000, 'Primeiro dia útil após o evento.')] })}>Integral após o evento</button>
      <button type="button" className="wf-secondary" disabled={draft.parcelas.some((p) => p.pago_centavos > 0)} onClick={() => set({ parcelas: [parcela('Reserva da data', 5000, 'Na reserva; confirmar data.'), parcela('Após a entrega', 5000, 'Após a entrega dos materiais; confirmar data.')] })}>50% na reserva / 50% na entrega</button>
    </div>{draft.parcelas.map((p, i) => <div className="adm-custo-parcela" key={p.id}><h3>Parcela {i + 1} · {brl(totais?.valores[i] ?? null)}</h3><div className="v2-forms-grid">
      <label><span>Descrição da parcela {i + 1}</span><input value={p.descricao} onChange={(e) => alterarParcela(p.id, { descricao: e.target.value })} /></label>
      <Numero label={`Percentual da parcela ${i + 1} (%)`} value={p.percentual_bp} onChange={(v) => alterarParcela(p.id, { percentual_bp: v ?? 0 })} />
      <label className="wide"><span>Condição / marco da parcela {i + 1}</span><input value={p.regra} onChange={(e) => alterarParcela(p.id, { regra: e.target.value })} /></label>
      <label><span>Regra do vencimento da parcela {i + 1}</span><select value={p.vencimento_modo || 'manual'} onChange={e=>alterarParcela(p.id,{vencimento_modo:e.target.value as 'manual'|'pos_evento'})}><option value="manual">Data combinada / manual</option><option value="pos_evento">Primeiro dia útil após o evento</option></select></label>
      <label><span>Vencimento da parcela {i + 1}</span><input type="date" readOnly={p.vencimento_modo==='pos_evento'} value={p.vencimento || ''} onChange={(e) => alterarParcela(p.id, { vencimento: e.target.value || null })} />{p.vencimento_modo==='pos_evento'&&<small>Calculado pela data do encontro e pelo calendário de dias úteis.</small>}</label>
      <label><span>Forma de pagamento da parcela {i + 1}</span><input value={p.forma} onChange={(e) => alterarParcela(p.id, { forma: e.target.value })} /></label>
      <Numero label={`Valor pago da parcela ${i + 1} (R$)`} value={p.pago_centavos} onChange={(v) => alterarParcela(p.id, { pago_centavos: v ?? 0 })} />
      <label><span>Data do pagamento da parcela {i + 1}</span><input type="date" value={p.pago_em || ''} onChange={(e) => alterarParcela(p.id, { pago_em: e.target.value || null })} /></label>
    </div><div className="adm-custo-pagar"><div><strong>{totais?.valores[i] !== null && totais?.valores[i] === p.pago_centavos && p.pago_centavos>0 ? 'Parcela paga' : p.pago_centavos>0 ? `Pago parcialmente: ${brl(p.pago_centavos)}` : 'Pagamento pendente'}</strong>{p.pago_registrado_em&&<small>Registrado em {new Date(p.pago_registrado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · Brasília</small>}<small>Registra a quitação no painel após o pagamento no banco.</small></div><button className="wf-primary" type="button" disabled={!totais || totais.valores[i]===null || totais.valores[i]!<=p.pago_centavos || busy} onClick={()=>{if(!totais||totais.valores[i]===null)return;const novo={...draft,parcelas:draft.parcelas.map(r=>r.id===p.id?{...r,pago_centavos:totais!.valores[i]!,pago_em:hoje()}:r)};void salvar(novo,'Pagamento registrado. Data e hora salvas.');}}><Check size={16}/>{totais?.valores[i]!==null&&totais?.valores[i]===p.pago_centavos&&p.pago_centavos>0?'Pago':'Marcar como pago'}</button></div>{totais?.valores[i]===null&&<p className="adm-hint">Defina os valores dos itens para quitar esta parcela. Pagamentos parciais podem ser preenchidos nos campos acima.</p>}<button className="wf-secondary" type="button" disabled={draft.parcelas.length === 1 || p.pago_centavos > 0} onClick={() => set({ parcelas: draft.parcelas.filter((r) => r.id !== p.id) })}>Retirar parcela</button></div>)}
    <button className="wf-secondary" type="button" onClick={() => set({ parcelas: [...draft.parcelas, parcela('Nova parcela', 0)] })}>Adicionar parcela</button><p className="adm-hint">As parcelas precisam somar 100%. Datas de reserva e entrega são informadas quando combinadas. “Marcar como pago” salva o custo e registra a quitação com a data de hoje e a hora do servidor.</p>{erro && <p className="inline-notice" role="status">{erro}</p>}<details className="adm-custo-calendario"><summary>Calendário de dias úteis · feriados locais</summary><p className="adm-hint">Estas datas são exceções do calendário, não datas de pagamento. Adicione somente feriados locais ou dias sem expediente para o cálculo automático. Sábados, domingos e feriados nacionais já são desconsiderados.</p><div className="adm-custo-calendario-linha"><label><span>Feriado local ou dia sem expediente</span><input type="date" value={feriado} onChange={e=>setFeriado(e.target.value)} /></label><button type="button" className="wf-secondary" disabled={!feriado} onClick={()=>{set({feriados_adicionais:[...new Set([...(draft.feriados_adicionais||[]),feriado])].sort()});setFeriado('');}}>Adicionar data</button></div>{(draft.feriados_adicionais||[]).length>0&&<ul className="adm-custo-feriados">{draft.feriados_adicionais!.map(data=><li key={data}>{dataBr(data)}<button type="button" aria-label={`Retirar feriado ${dataBr(data)}`} onClick={()=>set({feriados_adicionais:draft.feriados_adicionais!.filter(d=>d!==data)})}><X size={14}/></button></li>)}</ul>}</details></section>
</div>
    <div className="adm-custo-painel" role="tabpanel" id={`${editorId}-documentos-painel`} aria-labelledby={`${editorId}-documentos`} hidden={aba!=='documentos'}>
    <section className="v2-forms-card"><header><h2>Notas fiscais e comprovantes</h2></header><div className="v2-forms-grid"><label><span>Documento exigido</span><select value={draft.documento} onChange={(e) => set({ documento: e.target.value as Custo['documento'] })}>{['a_definir','nf','recibo','nao_exige'].map((id) => <option key={id} value={id}>{nomesDoc[id]}</option>)}</select></label><label><span>Tipo do anexo</span><select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>{['nf','recibo','comprovante','outro'].map((id) => <option key={id} value={id}>{nomesDoc[id]}</option>)}</select></label></div>
    <div className="adm-custo-anexar"><button className="wf-secondary" type="button" disabled={busy || draft.version < 1} onClick={() => input.current?.click()}><Paperclip size={15} />Anexar documento</button><input hidden ref={input} type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={(e) => void anexar(e)} /></div>
    <p className="adm-hint">PDF, XML, JPG ou PNG de até 10 MB. {draft.version < 1 ? 'Salve o custo antes de anexar.' : 'Arquivos privados, somente para a organização.'}</p>
    <ul className="adm-custo-docs">{docs.map((doc) => <li key={doc.id}><span>{nomesDoc[doc.tipo]} · {doc.nome}</span><button type="button" className="wf-secondary" onClick={() => void baixar(doc)}><Download size={14} />Abrir</button></li>)}</ul>
    {['nf','recibo'].includes(draft.documento) && !docs.some((d) => d.tipo === draft.documento) && <p className="adm-hint">Pendente: {nomesDoc[draft.documento].toLowerCase()}.</p>}
    </section>
</div>
    <div className="adm-custo-painel" role="tabpanel" id={`${editorId}-observacoes-painel`} aria-labelledby={`${editorId}-observacoes`} hidden={aba!=='observacoes'}>
    <section className="v2-forms-card adm-custo-observacoes"><label><span>Observações e combinado</span><textarea rows={6} value={draft.observacoes} onChange={(e) => set({ observacoes: e.target.value })} /></label></section>
    </div>
    </fieldset>
    {aviso && <p className="v2-forms-ok" role="status">{aviso}</p>}
  </>;
}

function Numero({ label, value, casas = 2, onChange }: { label: string; value: number | null; casas?: number; onChange: (n: number | null) => void }) {
  const [texto, setTexto] = useState(entradaDecimal(value, casas));
  const [erro, setErro] = useState('');
  const ultimo = useRef(value);
  useEffect(() => { if (!Number.isNaN(value) && value !== ultimo.current) { setTexto(entradaDecimal(value, casas)); ultimo.current = value; } }, [value, casas]);
  return <label><span>{label}</span><input inputMode="decimal" value={texto} aria-invalid={Boolean(erro)} onChange={(e) => { const v = e.target.value; setTexto(v); try { const n = decimalInteiro(v, casas); ultimo.current = n; onChange(n); setErro(''); } catch (ex) { setErro(ex instanceof Error ? ex.message : 'Valor inválido.'); onChange(Number.NaN); } }} onBlur={() => { if (!erro) setTexto(entradaDecimal(value, casas)); }} />{erro && <small role="alert">{erro}</small>}</label>;
}

function NavAbas({nome,itens,ativa,mudar,prefixo,painelUnico=false}:{nome:string;itens:Array<{id:string;label:string;quantidade?:number}>;ativa:string;mudar:(id:string)=>void;prefixo:string;painelUnico?:boolean}) {
 return <div className="adm-custos-abas" role="tablist" aria-label={nome}>{itens.map((item,index)=><button key={item.id} id={`${prefixo}-${item.id}`} type="button" role="tab" aria-selected={ativa===item.id} tabIndex={ativa===item.id?0:-1} aria-controls={painelUnico?`${prefixo}-painel`:`${prefixo}-${item.id}-painel`} onClick={()=>mudar(item.id)} onKeyDown={e=>{const proximo=e.key==='ArrowRight'?(index+1)%itens.length:e.key==='ArrowLeft'?(index+itens.length-1)%itens.length:e.key==='Home'?0:e.key==='End'?itens.length-1:-1;if(proximo<0)return;e.preventDefault();mudar(itens[proximo].id);(e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[proximo])?.focus();}}>{item.label}{item.quantidade!==undefined&&<span>{item.quantidade}</span>}</button>)}</div>;
}
