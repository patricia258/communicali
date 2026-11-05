/* Pessoas da edição: todo mundo que vai estar no encontro, de qualquer origem, numa tabela só.
   Participantes (formulário ou site), convidados (link de convite), kids (cadastro manual), staff, fornecedores e organização.
   A situação decide quem recebe os e-mails de quem vai: só "Confirmado". */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../lib';
import { downloadXlsx } from '../forms/formExports';
import { Email, Tabela, Telefone } from './AdminTabela';
import { chamar } from './AdminEmails';

type Pessoa = { fonte: string; id: string; categoria: string; nome: string; email: string | null; whatsapp: string | null; situacao: string; detalhe: string | null; vezes: number; criado_em: string };
type Cadastro = { id: string; nome: string; detalhe: string; eventos: string[] | null };

export const SITUACOES: Array<[string, string]> = [['inscrito', 'Inscrito'], ['contatado', 'Contatado'], ['confirmado', 'Confirmado'], ['sem_resposta', 'Sem resposta'], ['nao_vai', 'Não vai']];
const NOME_SITUACAO = Object.fromEntries(SITUACOES);
const EDITAVEL = ['form', 'registro', 'convidado', 'kids'];
const chave = (item: Pessoa) => `${item.fonte}:${item.id}`;
const recorrencia = (item: Pessoa) => (item.categoria === 'Kids' || !item.email ? '-' : item.vezes ? `Já veio a ${item.vezes} ${item.vezes === 1 ? 'encontro' : 'encontros'}` : 'Primeira vez');

export function PessoasDaEdicao({ edition }: { edition: { id: string; slug: string; titulo: string; data_evento: string; form_inscricao?: string | null } }) {
  const [lista, setLista] = useState<Pessoa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [janela, setJanela] = useState<'' | 'kids' | 'equipe'>('');
  const [copiado, setCopiado] = useState(false);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc('communicali_pessoas_edicao', { p_edition: edition.id });
    if (error) setAviso('Não foi possível carregar as pessoas.'); else setLista((data || []) as Pessoa[]);
    setCarregando(false); setSelecao(new Set());
  }
  useEffect(() => { void carregar(); }, [edition.id]);

  const vao = lista.filter((item) => item.situacao === 'confirmado');
  const conta = (categoria: string, base = vao) => base.filter((item) => item.categoria === categoria).length;
  const participantes = lista.filter((item) => item.categoria === 'Participante' || item.categoria === 'Convidado');
  const linkInscricao = edition.form_inscricao ? `https://comuni.calirh.com/f/${edition.form_inscricao}` : `https://comuni.calirh.com/e/${edition.slug}`;

  // Mudar a situação de uma ou várias pessoas. Inscrição pela página do site confirmada recebe o e-mail de confirmação, como antes.
  async function mudar(pessoas: Pessoa[], situacao: string) {
    const validas = pessoas.filter((item) => EDITAVEL.includes(item.fonte));
    if (!validas.length) return;
    setBusy(true); setAviso('');
    for (const fonte of EDITAVEL) {
      const ids = validas.filter((item) => item.fonte === fonte).map((item) => item.id);
      if (!ids.length) continue;
      const { error } = await supabase.rpc('communicali_definir_situacao', { p_fonte: fonte, p_ids: ids, p_situacao: situacao });
      if (error) { setAviso('Não foi possível salvar a situação.'); setBusy(false); return; }
      if (fonte === 'registro' && (situacao === 'confirmado' || situacao === 'nao_vai')) {
        for (const id of ids) await chamar({ acao: 'decidir', edicao: edition.id, registro: id, status: situacao === 'confirmado' ? 'inscrito' : 'cancelado' }).catch(() => null);
      }
    }
    setAviso(`${validas.length} ${validas.length === 1 ? 'pessoa marcada' : 'pessoas marcadas'} como ${NOME_SITUACAO[situacao]}.`);
    setBusy(false); await carregar();
  }

  async function tirar(item: Pessoa) {
    if (!window.confirm(`Tirar ${item.nome} desta edição?`)) return;
    if (item.fonte === 'kids') await supabase.from('edition_kids').delete().eq('id', item.id);
    else await supabase.rpc('communicali_equipe_edicao', { p_edition: edition.id, p_tipo: item.fonte, p_id: item.id, p_incluir: false });
    await carregar();
  }

  function exportar() {
    downloadXlsx(`communicali-${edition.slug}-pessoas.xlsx`, 'Pessoas', ['Nome', 'Categoria', 'Situação', 'E-mail', 'WhatsApp', 'Origem', 'Recorrência'],
      lista.map((item) => [item.nome, item.categoria, NOME_SITUACAO[item.situacao] || item.situacao, item.email || '', item.whatsapp || '', item.detalhe || '', recorrencia(item)]));
  }

  // Lista da recepção: todos os confirmados, por categoria e nome, com caixa para marcar a chegada no papel.
  function imprimir() {
    const ordem = ['Participante', 'Convidado', 'Kids', 'Staff', 'Fornecedor', 'Organização'];
    const linhas = [...vao].sort((a, b) => ordem.indexOf(a.categoria) - ordem.indexOf(b.categoria) || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((item, n) => `<tr><td>${n + 1}</td><td>${item.nome.replace(/</g, '&lt;')}</td><td>${item.categoria}</td><td>${(item.detalhe || '').replace(/</g, '&lt;')}</td><td class="caixa"></td></tr>`).join('');
    const nova = window.open('', '_blank');
    if (!nova) { setAviso('Libere as janelas do navegador para imprimir a lista.'); return; }
    nova.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Lista · ${edition.titulo}</title><style>
      body{font-family:Inter,Arial,sans-serif;color:#22100F;margin:32px}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 18px;color:#5a4740;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:14px}th,td{border:1px solid #cdbcae;padding:8px 10px;text-align:left}th{background:#f3ece6;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
      td:first-child{width:36px;text-align:center}.caixa{width:90px}@media print{body{margin:12mm}}</style></head><body>
      <h1>${edition.titulo}</h1><p>${vao.length} pessoas confirmadas. Marque a última coluna na chegada.</p>
      <table><thead><tr><th>Nº</th><th>Nome</th><th>Categoria</th><th>Detalhe</th><th>Chegou</th></tr></thead><tbody>${linhas}</tbody></table>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    nova.document.close();
  }

  const todos = lista.length > 0 && lista.filter((item) => EDITAVEL.includes(item.fonte)).every((item) => selecao.has(chave(item)));
  const alternar = (item: Pessoa) => setSelecao((atual) => { const novo = new Set(atual); if (novo.has(chave(item))) novo.delete(chave(item)); else novo.add(chave(item)); return novo; });
  const selecionadas = lista.filter((item) => selecao.has(chave(item)));

  const colunas = useMemo(() => [
    { id: 'sel', titulo: '', valor: () => '', render: (item: Pessoa) => (EDITAVEL.includes(item.fonte) ? <input type="checkbox" aria-label={`Selecionar ${item.nome}`} checked={selecao.has(chave(item))} onChange={() => alternar(item)} /> : null) },
    { id: 'nome', titulo: 'Nome', valor: (item: Pessoa) => item.nome },
    { id: 'categoria', titulo: 'Categoria', valor: (item: Pessoa) => item.categoria, render: (item: Pessoa) => <span className={`adm-pill adm-cat--${item.categoria.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase()}`}>{item.categoria}</span> },
    { id: 'situacao', titulo: 'Situação', valor: (item: Pessoa) => NOME_SITUACAO[item.situacao] || item.situacao, render: (item: Pessoa) => (EDITAVEL.includes(item.fonte)
      ? <select className={`adm-situacao adm-situacao--${item.situacao}`} aria-label={`Situação de ${item.nome}`} value={item.situacao} disabled={busy} onChange={(event) => void mudar([item], event.target.value)}>{SITUACOES.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select>
      : <span className="adm-situacao adm-situacao--confirmado adm-situacao--fixa">Confirmado</span>) },
    { id: 'recorrencia', titulo: 'Recorrência', valor: recorrencia },
    { id: 'whatsapp', titulo: 'WhatsApp', valor: (item: Pessoa) => item.whatsapp || '', render: (item: Pessoa) => <Telefone numero={item.whatsapp} /> },
    { id: 'email', titulo: 'E-mail', valor: (item: Pessoa) => item.email || '', render: (item: Pessoa) => <Email email={item.email} /> },
    { id: 'detalhe', titulo: 'Origem ou função', valor: (item: Pessoa) => item.detalhe || '-' },
    { id: 'tirar', titulo: '', valor: () => '', render: (item: Pessoa) => (['kids', 'staff', 'fornecedor'].includes(item.fonte) ? <span className="adm-acoes"><button type="button" onClick={() => void tirar(item)}>Tirar</button></span> : null) },
  ], [selecao, busy, lista]);

  return (
    <section className="v2-forms-card" id="secao-pessoas">
      <header className="adm-secao__topo"><div><small>PESSOAS DA EDIÇÃO</small><h2>{vao.length} {vao.length === 1 ? 'pessoa confirmada' : 'pessoas confirmadas'} para o encontro</h2></div>
        <div className="adm-links">
          <button type="button" className="wf-secondary" title={linkInscricao} onClick={() => { void navigator.clipboard.writeText(linkInscricao); setCopiado(true); window.setTimeout(() => setCopiado(false), 2000); }}>{copiado ? 'Link copiado' : 'Copiar link de inscrição'}</button>
          <button type="button" className="wf-secondary" onClick={() => setJanela('kids')}>Adicionar kids</button>
          <button type="button" className="wf-secondary" onClick={() => setJanela('equipe')}>Adicionar staff ou fornecedor</button>
        </div>
      </header>
      <div className="adm-cards">
        <div className="adm-card"><span>Vão estar lá</span><strong>{vao.length}</strong><small>contando todas as categorias</small></div>
        <div className="adm-card"><span>Participantes e convidados</span><strong>{conta('Participante') + conta('Convidado')}</strong><small>{conta('Convidado')} convidados · {participantes.length} inscritos no total</small></div>
        <div className="adm-card"><span>Para confirmar</span><strong>{participantes.filter((item) => ['inscrito', 'contatado', 'sem_resposta'].includes(item.situacao)).length}</strong><small>{participantes.filter((item) => item.situacao === 'inscrito').length} sem contato · {participantes.filter((item) => item.situacao === 'contatado').length} contatados</small></div>
        <div className="adm-card"><span>Equipe e kids</span><strong>{conta('Staff') + conta('Fornecedor') + conta('Organização') + conta('Kids')}</strong><small>{conta('Staff')} staff · {conta('Fornecedor')} fornecedores · {conta('Organização')} organização · {conta('Kids')} kids</small></div>
      </div>
      <p className="adm-hint adm-hint--antes">A inscrição é uma só: o link acima, que é o mesmo do botão da página da edição. Convidados chegam pelo link de convite de cada membro. Só quem está <strong>Confirmado</strong> recebe o lembrete, o card Eu vou! e os e-mails de quem vai ao encontro.</p>
      {selecionadas.length > 0 && <div className="v2-forms-selbar adm-selbar" role="status"><strong>{selecionadas.length} {selecionadas.length === 1 ? 'pessoa selecionada' : 'pessoas selecionadas'}</strong>
        <span>Marcar como</span>{SITUACOES.map(([valor, rotulo]) => <button key={valor} type="button" className="wf-secondary" disabled={busy} onClick={() => void mudar(selecionadas, valor)}>{rotulo}</button>)}
        <button type="button" className="wf-secondary" onClick={() => setSelecao(new Set())}>Limpar seleção</button></div>}
      {aviso && <p className="adm-hint" role="status">{aviso}</p>}
      {carregando ? <div className="data-loading">Carregando pessoas…</div> : <Tabela<Pessoa> colunas={colunas} linhas={lista} chave={chave} inicial={{ id: 'nome' }} vazio="Ninguém nesta edição ainda."
        filtros={[{ id: 'categoria', titulo: 'Categoria', valor: (item) => item.categoria }, { id: 'situacao', titulo: 'Situação', valor: (item) => NOME_SITUACAO[item.situacao] || item.situacao }, { id: 'recorrencia', titulo: 'Recorrência', valor: (item) => (recorrencia(item) === 'Primeira vez' ? 'Primeira vez' : recorrencia(item) === '-' ? '' : 'Já veio') }]}
        acoes={<>
          <label className="adm-todos"><input type="checkbox" checked={todos} onChange={() => setSelecao(todos ? new Set() : new Set(lista.filter((item) => EDITAVEL.includes(item.fonte)).map(chave)))} /> Selecionar todos</label>
          <button type="button" className="wf-primary" disabled={!vao.length} onClick={imprimir}>Imprimir lista da recepção</button>
          <button type="button" className="wf-secondary" disabled={!lista.length} onClick={exportar}>Exportar Excel</button>
        </>} />}
      {janela === 'kids' && <NovoKids edition={edition.id} responsaveis={lista.filter((item) => item.categoria !== 'Kids').map((item) => item.nome)} fechar={() => setJanela('')} salvo={() => { setJanela(''); void carregar(); }} />}
      {janela === 'equipe' && <NovaEquipe edition={edition.id} fechar={() => setJanela('')} salvo={() => { setJanela(''); void carregar(); }} />}
    </section>
  );
}

function NovoKids({ edition, responsaveis, fechar, salvo }: { edition: string; responsaveis: string[]; fechar: () => void; salvo: () => void }) {
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [erro, setErro] = useState('');
  async function salvar(event: FormEvent) {
    event.preventDefault(); setErro('');
    const { error } = await supabase.from('edition_kids').insert({ edition_id: edition, nome: nome.trim(), idade: idade ? Number(idade) : null, responsavel: responsavel.trim() || null });
    if (error) setErro('Confira o nome e a idade (até 17 anos).'); else salvo();
  }
  return <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) fechar(); }}>
    <form className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Adicionar kids" onSubmit={(event) => void salvar(event)}>
      <div><small>KIDS</small><h2>Adicionar criança</h2><p>Entra como confirmada e conta no total de quem vai estar no encontro.</p></div>
      <label>Nome da criança<input required minLength={2} value={nome} onChange={(event) => setNome(event.target.value)} /></label>
      <label>Idade<input inputMode="numeric" value={idade} onChange={(event) => setIdade(event.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
      <label>Responsável<input list="kids-responsaveis" value={responsavel} placeholder="Comece a digitar o nome" onChange={(event) => setResponsavel(event.target.value)} /><datalist id="kids-responsaveis">{[...new Set(responsaveis)].map((item) => <option key={item} value={item} />)}</datalist></label>
      {erro && <p className="v2-forms-error" role="alert">{erro}</p>}
      <footer><button type="button" onClick={fechar}>Cancelar</button><button type="submit">Adicionar</button></footer>
    </form>
  </div>;
}

function NovaEquipe({ edition, fechar, salvo }: { edition: string; fechar: () => void; salvo: () => void }) {
  const [tipo, setTipo] = useState<'staff' | 'fornecedor'>('staff');
  const [opcoes, setOpcoes] = useState<Cadastro[]>([]);
  const [escolha, setEscolha] = useState('');
  useEffect(() => {
    setEscolha('');
    const consulta = tipo === 'staff' ? supabase.from('staff').select('id,nome,funcao,eventos,cpf,created_at') : supabase.from('fornecedores').select('id,nome,categoria,eventos,documento,created_at');
    void consulta.order('created_at', { ascending: false }).then(({ data }) => {
      // Um por pessoa ou empresa: o cadastro mais recente.
      const vistos = new Set<string>();
      setOpcoes(((data || []) as Array<Record<string, string & string[]>>).filter((item) => { const doc = String(item.cpf || item.documento); if (vistos.has(doc)) return false; vistos.add(doc); return true; })
        .map((item) => ({ id: item.id, nome: item.nome, detalhe: String(item.funcao || item.categoria || ''), eventos: item.eventos as unknown as string[] | null })));
    });
  }, [tipo]);
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!escolha) return;
    await supabase.rpc('communicali_equipe_edicao', { p_edition: edition, p_tipo: tipo, p_id: escolha, p_incluir: true });
    salvo();
  }
  return <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) fechar(); }}>
    <form className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Adicionar staff ou fornecedor" onSubmit={(event) => void salvar(event)}>
      <div><small>EQUIPE</small><h2>Adicionar a esta edição</h2><p>Escolha entre quem já tem cadastro. Quem ainda não tem preenche o formulário de Staff ou de Fornecedor.</p></div>
      <label>Tipo<select value={tipo} onChange={(event) => setTipo(event.target.value as 'staff' | 'fornecedor')}><option value="staff">Staff</option><option value="fornecedor">Fornecedor</option></select></label>
      <label>Cadastro<select required value={escolha} onChange={(event) => setEscolha(event.target.value)}><option value="">Escolha</option>{opcoes.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.detalhe ? ` · ${item.detalhe}` : ''}</option>)}</select></label>
      <footer><button type="button" onClick={fechar}>Cancelar</button><button type="submit" disabled={!escolha}>Adicionar</button></footer>
    </form>
  </div>;
}
