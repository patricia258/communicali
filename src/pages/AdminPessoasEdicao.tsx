/* Pessoas da edição: todo mundo que vai estar no encontro, de qualquer origem, numa tabela só.
   Participantes (formulário ou site), convidados (link de convite), pessoas adicionadas à mão (kids, assistente...),
   staff (com o assistente), fornecedores e organização. A situação decide quem recebe os e-mails de quem vai: só "Confirmado". */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib';
import { downloadXlsx } from '../forms/formExports';
import { PlanilhaDaEdicao, RespostaGaveta } from '../forms/AdminFormsPage';
import { Email, Tabela, Telefone } from './AdminTabela';
import { chamar } from './AdminEmails';
import { esc, imprimirFolhas, type Folha } from './listaImpressa';

type Pessoa = { fonte: string; id: string; categoria: string; nome: string; email: string | null; whatsapp: string | null; situacao: string; detalhe: string | null; vezes: number; criado_em: string; nivel: string | null };
type Manual = { id: string; categoria: string; nome: string; funcao: string | null; idade: number | null; responsavel: string | null; email: string | null; whatsapp: string | null };
type Cadastro = { id: string; nome: string; detalhe: string };

export const SITUACOES: Array<[string, string]> = [['inscrito', 'Inscrito'], ['contatado', 'Contatado'], ['confirmado', 'Confirmado'], ['sem_resposta', 'Sem resposta'], ['nao_vai', 'Não vai']];
const CATEGORIAS = ['Participante', 'Convidado', 'Kids', 'Staff', 'Fornecedor', 'Organização'];
const NOME_SITUACAO = Object.fromEntries(SITUACOES);
// De onde vem cada pessoa decide o que dá para mudar aqui. Staff, fornecedor e organização vêm do cadastro deles.
const MUDA = ['form', 'registro', 'convidado', 'manual'];
const chave = (item: Pessoa) => `${item.fonte}:${item.id}`;
const recorrencia = (item: Pessoa) => (item.categoria === 'Kids' || !item.email ? '-' : item.vezes ? `Já veio a ${item.vezes} ${item.vezes === 1 ? 'encontro' : 'encontros'}` : 'Primeira vez');
const classeCategoria = (categoria: string) => `adm-cat--${categoria.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase()}`;
const ORIGEM_CADASTRO: Record<string, string> = { staff: 'Vem do cadastro de Staff', assistente: 'Assistente de um staff: vem do cadastro de Staff', fornecedor: 'Vem do cadastro de Fornecedores', organizacao: 'Organização: sempre confirmada' };

export function PessoasDaEdicao({ edition }: { edition: { id: string; slug: string; titulo: string; data_evento: string; numero: number | null; cidade: string; form_inscricao?: string | null } }) {
  const [lista, setLista] = useState<Pessoa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [lote, setLote] = useState({ situacao: '', categoria: '' });
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [janela, setJanela] = useState<null | { tipo: 'manual'; item?: Manual } | { tipo: 'equipe' } | { tipo: 'resposta'; id: string; modo: 'ver' | 'editar' }>(null);
  const [copiado, setCopiado] = useState(false);

  // Recarrega sem tirar a tabela da tela: só a primeira carga mostra "Carregando".
  async function carregar() {
    const { data, error } = await supabase.rpc('communicali_pessoas_edicao', { p_edition: edition.id });
    if (error) setAviso('Não foi possível carregar as pessoas.'); else setLista((data || []) as Pessoa[]);
    setCarregando(false);
  }
  // A mudança aparece na hora; o banco grava em seguida.
  const trocarLocal = (pessoas: Pessoa[], mudanca: Partial<Pessoa>) => { const ids = new Set(pessoas.map(chave)); setLista((atual) => atual.map((item) => (ids.has(chave(item)) ? { ...item, ...mudanca } : item))); };
  useEffect(() => { void carregar(); }, [edition.id]);
  const avisar = (texto: string) => { setAviso(texto); window.setTimeout(() => setAviso(''), 4000); };

  const vao = lista.filter((item) => item.situacao === 'confirmado');
  const conta = (categoria: string, base = vao) => base.filter((item) => item.categoria === categoria).length;
  const publico = lista.filter((item) => item.categoria === 'Participante' || item.categoria === 'Convidado');
  const linkInscricao = edition.form_inscricao ? `https://comuni.calirh.com/f/${edition.form_inscricao}` : `https://comuni.calirh.com/e/${edition.slug}`;

  // Inscrição feita pela página do site, quando confirmada, recebe o e-mail de confirmação, como antes.
  async function mudarSituacao(pessoas: Pessoa[], situacao: string) {
    const validas = pessoas.filter((item) => MUDA.includes(item.fonte));
    if (!validas.length) return;
    trocarLocal(validas, { situacao });
    for (const fonte of MUDA) {
      const ids = validas.filter((item) => item.fonte === fonte).map((item) => item.id);
      if (!ids.length) continue;
      const { error } = await supabase.rpc('communicali_definir_situacao', { p_fonte: fonte, p_ids: ids, p_situacao: situacao });
      if (error) { avisar('Não foi possível salvar a situação.'); await carregar(); return; }
      if (fonte === 'registro' && (situacao === 'confirmado' || situacao === 'nao_vai')) {
        for (const id of ids) await chamar({ acao: 'decidir', edicao: edition.id, registro: id, status: situacao === 'confirmado' ? 'inscrito' : 'cancelado' }).catch(() => null);
      }
    }
    avisar(validas.length === 1 ? `${validas[0].nome}: ${NOME_SITUACAO[situacao]}.` : `${validas.length} pessoas agora estão como ${NOME_SITUACAO[situacao]}.`);
    await carregar();
  }
  async function mudarCategoria(pessoas: Pessoa[], categoria: string) {
    const validas = pessoas.filter((item) => MUDA.includes(item.fonte));
    if (!validas.length) return;
    trocarLocal(validas, { categoria });
    for (const fonte of MUDA) {
      const ids = validas.filter((item) => item.fonte === fonte).map((item) => item.id);
      if (ids.length) await supabase.rpc('communicali_definir_categoria', { p_fonte: fonte, p_ids: ids, p_categoria: categoria });
    }
    avisar(validas.length === 1 ? `${validas[0].nome}: ${categoria}.` : `${validas.length} pessoas agora estão como ${categoria}.`);
    await carregar();
  }
  async function aplicarLote() {
    const pessoas = lista.filter((item) => selecao.has(chave(item)));
    setBusy(true);
    if (lote.situacao) await mudarSituacao(pessoas, lote.situacao);
    if (lote.categoria) await mudarCategoria(pessoas, lote.categoria);
    setBusy(false);
    setLote({ situacao: '', categoria: '' }); setSelecao(new Set());
  }

  async function tirar(item: Pessoa) {
    const pergunta = item.fonte === 'manual' ? `Excluir ${item.nome}? Foi adicionado à mão e sai desta edição.` : `Tirar ${item.nome} desta edição? O cadastro continua em ${item.fonte === 'staff' ? 'Staff' : 'Fornecedores'}.`;
    if (!window.confirm(pergunta)) return;
    if (item.fonte === 'manual') await supabase.from('edition_kids').delete().eq('id', item.id);
    else await supabase.rpc('communicali_equipe_edicao', { p_edition: edition.id, p_tipo: item.fonte, p_id: item.id, p_incluir: false });
    await carregar();
  }
  async function editarManual(item: Pessoa) {
    const { data } = await supabase.from('edition_kids').select('id,categoria,nome,funcao,idade,responsavel,email,whatsapp').eq('id', item.id).single();
    if (data) setJanela({ tipo: 'manual', item: data as Manual });
  }

  function exportar() {
    downloadXlsx(`communicali-${edition.slug}-pessoas.xlsx`, 'Pessoas', ['Nome', 'Categoria', 'Situação', 'E-mail', 'WhatsApp', 'Origem ou função', 'Recorrência'],
      lista.map((item) => [item.nome, item.categoria, NOME_SITUACAO[item.situacao] || item.situacao, item.email || '', item.whatsapp || '', item.detalhe || '', recorrencia(item)]));
  }

  // Lista da recepção: só os confirmados, um bloco por categoria (membros separados dos participantes), em ordem alfabética,
  // com o que a recepção usa: nome, primeira vez ou não, e-mail e WhatsApp para achar a pessoa, e a caixa de chegada.
  // Modelo de ticket: cargo, empresa e e-mail ajudam a recepção a achar a pessoa. Staff e fornecedores vão numa folha à parte.
  async function imprimir() {
    const extras = new Map<string, { cargo: string; empresa: string; sobrenome: string; nota?: string }>();
    if (edition.form_inscricao) {
      const { data: form } = await supabase.from('forms').select('id').eq('slug', edition.form_inscricao).maybeSingle();
      if (form) {
        const { data } = await supabase.from('form_responses').select('id,answers,admin_note').eq('form_id', form.id);
        for (const row of (data || []) as Array<{ id: string; answers: Record<string, unknown>; admin_note: string | null }>) extras.set(row.id, { cargo: String(row.answers.cargo ?? ''), empresa: String(row.answers.empresa ?? ''), sobrenome: String(row.answers.sobrenome ?? ''), nota: row.admin_note || '' });
      }
    }
    const regs = vao.filter((item) => item.fonte === 'registro').map((item) => item.id);
    if (regs.length) {
      const { data } = await supabase.from('registrations').select('id,empresa,cargo').in('id', regs);
      for (const row of (data || []) as Array<{ id: string; empresa: string | null; cargo: string | null }>) extras.set(row.id, { cargo: row.cargo || '', empresa: row.empresa || '', sobrenome: '' });
    }
    const semManual = (texto: string | null) => (texto || '').replace(/^Adicionado à mão( · )?/, '');
    const nomeCompleto = (item: Pessoa) => { const sobrenome = extras.get(item.id)?.sobrenome.trim(); return sobrenome && !item.nome.toLowerCase().includes(sobrenome.toLowerCase()) ? `${item.nome} ${sobrenome}` : item.nome; };
    const empresa = (texto: string) => (/open to work|desempregad|recoloca|em transi[cç][aã]o|buscando/i.test(texto) ? '<span class="pill">Open to Work</span>' : esc(texto));
    const linha = (item: Pessoa): string[] => {
      const extra = extras.get(item.id);
      if (item.categoria === 'Kids') return [esc(item.nome), '—', esc(semManual(item.detalhe)), '—'];
      if (item.categoria === 'Organização') return [esc(nomeCompleto(item)), esc(item.detalhe), 'CALI RH', esc(item.email)];
      if (item.categoria === 'Convidado') return [esc(nomeCompleto(item)), esc(extra?.cargo || 'Convidado'), esc(extra?.empresa || extra?.nota?.match(/acompanhante de [^·.\n]+/i)?.[0].trim() || (item.fonte === 'form' ? '' : semManual(item.detalhe))), esc(item.email)];
      return [esc(nomeCompleto(item)), esc(extra?.cargo || semManual(item.detalhe)), empresa(extra?.empresa || ''), esc(item.email)];
    };
    const ordenar = (gente: Pessoa[]) => [...gente].sort((a, b) => nomeCompleto(a).localeCompare(nomeCompleto(b), 'pt-BR'));
    const membro = (item: Pessoa) => item.categoria === 'Participante' && Boolean(item.nivel) && item.nivel !== 'visitante';
    const recepcao = vao.filter((item) => !['Staff', 'Fornecedor'].includes(item.categoria));
    const equipe = vao.filter((item) => ['Staff', 'Fornecedor'].includes(item.categoria));
    const kids = recepcao.filter((item) => item.categoria === 'Kids').length;
    const edicao = edition.numero ? ` · ${edition.numero}ª EDIÇÃO` : '';
    const meta = [edition.data_evento.split('-').reverse().join('/'), edition.cidade, 'Organização CALI RH'].filter(Boolean).join(' · ');
    const daEquipe = (item: Pessoa) => [esc(item.nome), esc(semManual(item.detalhe)), esc(item.whatsapp), esc(item.email)];
    const folhas: Folha[] = [{
      etiqueta: `TICKET DE ENTRADA${edicao}`, titulo: 'Lista de Recepção', meta,
      instrucao: 'Passe <mark>marca-texto</mark> no nome de quem já chegou.',
      resumo: `<b>${recepcao.length}</b> pessoas no local · ${recepcao.length - kids} adultos · ${kids} ${kids === 1 ? 'criança' : 'crianças'}`,
      colunas: ['Nome', 'Cargo', 'Empresa', 'E-mail de cadastro'],
      grupos: [
        { nome: 'Membros', linhas: ordenar(recepcao.filter(membro)).map(linha) },
        { nome: 'Participantes', linhas: ordenar(recepcao.filter((item) => item.categoria === 'Participante' && !membro(item))).map(linha) },
        { nome: 'Convidados', linhas: ordenar(recepcao.filter((item) => item.categoria === 'Convidado')).map(linha) },
        { nome: 'Kids', cor: 'ouro', linhas: ordenar(recepcao.filter((item) => item.categoria === 'Kids')).map(linha) },
        { nome: 'Organização', linhas: ordenar(recepcao.filter((item) => item.categoria === 'Organização')).map(linha) },
      ],
      rodape: equipe.length ? 'Staff e fornecedores: folha seguinte' : '',
    }];
    if (equipe.length) folhas.push({
      etiqueta: `EQUIPE${edicao}`, titulo: 'Staff e Fornecedores', meta,
      instrucao: 'Marque a chegada de cada pessoa da equipe.', resumo: `<b>${equipe.length}</b> na equipe`,
      colunas: ['Nome', 'Função', 'WhatsApp', 'E-mail'],
      grupos: [
        { nome: 'Staff', linhas: ordenar(equipe.filter((item) => item.categoria === 'Staff')).map(daEquipe) },
        { nome: 'Fornecedores', cor: 'ouro', linhas: ordenar(equipe.filter((item) => item.categoria === 'Fornecedor')).map(daEquipe) },
      ],
      rodape: 'Lista da equipe',
    });
    if (!imprimirFolhas(`Recepção · ${edition.titulo}`, folhas)) avisar('Libere as janelas do navegador para imprimir a lista.');
  }

  const selecionaveis = lista.filter((item) => MUDA.includes(item.fonte));
  const todos = selecionaveis.length > 0 && selecionaveis.every((item) => selecao.has(chave(item)));
  const alternar = (item: Pessoa) => setSelecao((atual) => { const novo = new Set(atual); if (novo.has(chave(item))) novo.delete(chave(item)); else novo.add(chave(item)); return novo; });

  const colunas = useMemo(() => [
    { id: 'sel', titulo: '', estreita: true, valor: () => '', cabecalho: <input type="checkbox" aria-label="Selecionar todos" title="Selecionar todos" checked={todos} onChange={() => setSelecao(todos ? new Set() : new Set(selecionaveis.map(chave)))} />,
      render: (item: Pessoa) => (MUDA.includes(item.fonte) ? <input type="checkbox" aria-label={`Selecionar ${item.nome}`} checked={selecao.has(chave(item))} onChange={() => alternar(item)} /> : null) },
    { id: 'acoes', titulo: '', estreita: true, valor: () => '', cabecalho: <span className="adm-sr">Ações</span>, render: (item: Pessoa) => <span className="v2-forms-row-actions">
      {item.fonte === 'form' && edition.form_inscricao && <button type="button" className="v2-forms-edit" title="Ver as respostas" aria-label={`Ver as respostas de ${item.nome}`} onClick={() => setJanela({ tipo: 'resposta', id: item.id, modo: 'ver' })}><Eye size={14} /></button>}
      {item.fonte === 'form' && edition.form_inscricao && <button type="button" className="v2-forms-edit" title="Editar as respostas" aria-label={`Editar ${item.nome}`} onClick={() => setJanela({ tipo: 'resposta', id: item.id, modo: 'editar' })}><Pencil size={13} /></button>}
      {item.fonte === 'manual' && <button type="button" className="v2-forms-edit" title="Editar" aria-label={`Editar ${item.nome}`} onClick={() => void editarManual(item)}><Pencil size={13} /></button>}
      {['staff', 'assistente'].includes(item.fonte) && <a className="v2-forms-edit" title="Ver no cadastro de Staff" aria-label={`Ver ${item.nome} no cadastro de Staff`} href="/admin/staff"><Eye size={14} /></a>}
      {item.fonte === 'fornecedor' && <a className="v2-forms-edit" title="Ver no cadastro de Fornecedores" aria-label={`Ver ${item.nome} no cadastro de Fornecedores`} href="/admin/fornecedores"><Eye size={14} /></a>}
      {['manual', 'staff', 'fornecedor'].includes(item.fonte) && <button type="button" className="v2-forms-edit v2-forms-edit--excluir" title={item.fonte === 'manual' ? 'Excluir' : 'Tirar desta edição'} aria-label={`Tirar ${item.nome} desta edição`} onClick={() => void tirar(item)}><Trash2 size={13} /></button>}
    </span> },
    { id: 'nome', titulo: 'Nome', valor: (item: Pessoa) => item.nome },
    { id: 'categoria', titulo: 'Categoria', valor: (item: Pessoa) => item.categoria, render: (item: Pessoa) => (MUDA.includes(item.fonte)
      ? <select className={`adm-pill adm-pill--select ${classeCategoria(item.categoria)}`} aria-label={`Categoria de ${item.nome}`} value={item.categoria} onChange={(event) => void mudarCategoria([item], event.target.value)}>{CATEGORIAS.map((categoria) => <option key={categoria}>{categoria}</option>)}</select>
      : <span className={`adm-pill ${classeCategoria(item.categoria)}`} title={ORIGEM_CADASTRO[item.fonte]}>{item.categoria}</span>) },
    { id: 'situacao', titulo: 'Situação', valor: (item: Pessoa) => NOME_SITUACAO[item.situacao] || item.situacao, render: (item: Pessoa) => (MUDA.includes(item.fonte)
      ? <select className={`adm-situacao adm-situacao--${item.situacao}`} aria-label={`Situação de ${item.nome}`} value={item.situacao} onChange={(event) => void mudarSituacao([item], event.target.value)}>{SITUACOES.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select>
      : <span className="adm-situacao adm-situacao--confirmado adm-situacao--fixa" title={ORIGEM_CADASTRO[item.fonte]}>Confirmado</span>) },
    { id: 'recorrencia', titulo: 'Recorrência', valor: recorrencia },
    { id: 'whatsapp', titulo: 'WhatsApp', valor: (item: Pessoa) => item.whatsapp || '', render: (item: Pessoa) => <Telefone numero={item.whatsapp} /> },
    { id: 'email', titulo: 'E-mail', valor: (item: Pessoa) => item.email || '', render: (item: Pessoa) => <Email email={item.email} /> },
    { id: 'detalhe', titulo: 'Origem ou função', valor: (item: Pessoa) => item.detalhe || '-' },
  ], [selecao, busy, lista, todos]);

  return (
    <section className="v2-forms-card" id="secao-pessoas">
      <header className="adm-secao__topo"><div><small>PESSOAS DA EDIÇÃO</small><h2>{vao.length} {vao.length === 1 ? 'pessoa confirmada' : 'pessoas confirmadas'} para o encontro</h2></div>
        <div className="adm-links">
          <button type="button" className="wf-secondary" title={linkInscricao} onClick={() => { void navigator.clipboard.writeText(linkInscricao); setCopiado(true); window.setTimeout(() => setCopiado(false), 2000); }}>{copiado ? 'Link copiado' : 'Copiar link de inscrição'}</button>
          <button type="button" className="wf-secondary" onClick={() => setJanela({ tipo: 'manual' })}>Adicionar pessoa</button>
          <button type="button" className="wf-secondary" onClick={() => setJanela({ tipo: 'equipe' })}>Trazer do cadastro de Staff ou Fornecedor</button>
        </div>
      </header>
      <div className="adm-cards">
        <div className="adm-card"><span>Vão estar lá</span><strong>{vao.length}</strong><small>confirmados, contando todas as categorias</small></div>
        <div className="adm-card"><span>Participantes e convidados</span><strong>{conta('Participante') + conta('Convidado')}</strong><small>confirmados de {publico.length} inscritos · {conta('Convidado')} convidados</small></div>
        <div className="adm-card"><span>Falta confirmar</span><strong>{publico.filter((item) => ['inscrito', 'contatado', 'sem_resposta'].includes(item.situacao)).length}</strong><small>{publico.filter((item) => item.situacao === 'inscrito').length} sem contato · {publico.filter((item) => item.situacao === 'contatado').length} contatados · {publico.filter((item) => item.situacao === 'sem_resposta').length} sem resposta</small></div>
        <div className="adm-card"><span>Equipe e kids</span><strong>{conta('Staff') + conta('Fornecedor') + conta('Organização') + conta('Kids')}</strong><small>{conta('Staff')} staff · {conta('Fornecedor')} fornecedores · {conta('Organização')} organização · {conta('Kids')} kids</small></div>
      </div>
      <p className="adm-hint adm-hint--antes">Troque a <strong>categoria</strong> e a <strong>situação</strong> direto na linha. Só quem está <strong>Confirmado</strong> recebe o lembrete, o card Eu vou! e os e-mails de quem vai. O olho mostra tudo o que a pessoa respondeu no formulário.</p>
      {selecao.size > 0 && <div className="adm-lote" role="region" aria-label="Mudar várias pessoas de uma vez">
        <strong>{selecao.size} {selecao.size === 1 ? 'pessoa marcada' : 'pessoas marcadas'} na caixinha</strong>
        <label>Mudar a situação para<select value={lote.situacao} onChange={(event) => setLote({ ...lote, situacao: event.target.value })}><option value="">Manter como está</option>{SITUACOES.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></label>
        <label>Mudar a categoria para<select value={lote.categoria} onChange={(event) => setLote({ ...lote, categoria: event.target.value })}><option value="">Manter como está</option>{CATEGORIAS.map((categoria) => <option key={categoria}>{categoria}</option>)}</select></label>
        <button type="button" className="wf-primary" disabled={busy || (!lote.situacao && !lote.categoria)} onClick={() => void aplicarLote()}>Aplicar</button>
        <button type="button" className="wf-secondary" onClick={() => setSelecao(new Set())}>Desmarcar</button>
      </div>}
      {aviso && <div className="v2-forms-toast" role="status">{aviso}</div>}
      {carregando ? <div className="data-loading">Carregando pessoas…</div> : <Tabela<Pessoa> colunas={colunas} linhas={lista} chave={chave} inicial={{ id: 'nome' }} vazio="Ninguém nesta edição ainda."
        filtros={[{ id: 'categoria', titulo: 'Categoria', valor: (item) => item.categoria }, { id: 'situacao', titulo: 'Situação', valor: (item) => NOME_SITUACAO[item.situacao] || item.situacao }, { id: 'recorrencia', titulo: 'Recorrência', valor: (item) => (recorrencia(item) === 'Primeira vez' ? 'Primeira vez' : recorrencia(item) === '-' ? '' : 'Já veio') }]}
        acoes={<>
          <button type="button" className="wf-primary" disabled={!vao.length} onClick={() => void imprimir()}>Imprimir lista da recepção</button>
          <button type="button" className="wf-secondary" disabled={!lista.length} onClick={exportar}>Exportar Excel</button>
        </>} />}
      {edition.form_inscricao && <details className="adm-suspensa">
        <summary>Planilha com todas as respostas do formulário</summary>
        <p className="adm-hint adm-hint--antes">As mesmas pessoas da tabela acima, com cada pergunta numa coluna. Use para filtrar por resposta ou exportar tudo o que responderam.</p>
        <PlanilhaDaEdicao slug={edition.form_inscricao} />
      </details>}
      {janela?.tipo === 'manual' && <PessoaManual edition={edition.id} item={janela.item} responsaveis={lista.filter((item) => item.categoria !== 'Kids').map((item) => item.nome)} fechar={() => setJanela(null)} salvo={() => { setJanela(null); void carregar(); }} />}
      {janela?.tipo === 'equipe' && <NovaEquipe edition={edition.id} fechar={() => setJanela(null)} salvo={() => { setJanela(null); void carregar(); }} />}
      {janela?.tipo === 'resposta' && edition.form_inscricao && <RespostaGaveta slug={edition.form_inscricao} id={janela.id} modo={janela.modo} fechar={() => setJanela(null)} mudou={() => void carregar()} />}
    </section>
  );
}

/** Adicionar ou editar alguém à mão: kids, assistente, convidado de última hora... Entra como confirmado. */
function PessoaManual({ edition, item, responsaveis, fechar, salvo }: { edition: string; item?: Manual; responsaveis: string[]; fechar: () => void; salvo: () => void }) {
  const [dados, setDados] = useState({ categoria: item?.categoria || 'Kids', nome: item?.nome || '', funcao: item?.funcao || '', idade: item?.idade != null ? String(item.idade) : '', responsavel: item?.responsavel || '', email: item?.email || '', whatsapp: item?.whatsapp || '' });
  const [erro, setErro] = useState('');
  const set = (campo: keyof typeof dados, valor: string) => setDados({ ...dados, [campo]: valor });
  const kids = dados.categoria === 'Kids';
  const equipe = ['Staff', 'Fornecedor', 'Organização'].includes(dados.categoria);
  async function salvar(event: FormEvent) {
    event.preventDefault(); setErro('');
    const linha = { categoria: dados.categoria, nome: dados.nome.trim(), funcao: !kids ? dados.funcao.trim() || null : null, idade: kids && dados.idade ? Number(dados.idade) : null, responsavel: kids ? dados.responsavel.trim() || null : null, email: !kids ? dados.email.trim().toLowerCase() || null : null, whatsapp: !kids ? dados.whatsapp.trim() || null : null };
    const { error } = item ? await supabase.from('edition_kids').update(linha).eq('id', item.id) : await supabase.from('edition_kids').insert({ ...linha, edition_id: edition });
    if (error) setErro('Confira o nome' + (kids ? ' e a idade (até 17 anos).' : '.')); else salvo();
  }
  return <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) fechar(); }}>
    <form className="ap-status-confirm adm-form-pessoa" role="dialog" aria-modal="true" aria-label={item ? 'Editar pessoa' : 'Adicionar pessoa'} onSubmit={(event) => void salvar(event)}>
      <div><small>PESSOAS DA EDIÇÃO</small><h2>{item ? 'Editar pessoa' : 'Adicionar pessoa'}</h2><p>Para quem não passou pelo formulário: kids, o assistente de um staff, alguém de última hora. Entra como confirmado.</p></div>
      <label>Categoria<select value={dados.categoria} onChange={(event) => set('categoria', event.target.value)}>{CATEGORIAS.map((categoria) => <option key={categoria}>{categoria}</option>)}</select></label>
      <label>Nome<input required minLength={2} value={dados.nome} onChange={(event) => set('nome', event.target.value)} /></label>
      {!kids && <label>{equipe ? 'Função no encontro' : 'Observação'}<input value={dados.funcao} placeholder={equipe ? 'Ex.: assistente de fotografia, recepção' : 'Opcional'} onChange={(event) => set('funcao', event.target.value)} /></label>}
      {kids && <label>Idade<input inputMode="numeric" value={dados.idade} onChange={(event) => set('idade', event.target.value.replace(/\D/g, '').slice(0, 2))} /></label>}
      {kids && <label>Responsável<input list="pessoas-responsaveis" value={dados.responsavel} placeholder="Comece a digitar o nome" onChange={(event) => set('responsavel', event.target.value)} /><datalist id="pessoas-responsaveis">{[...new Set(responsaveis)].map((nome) => <option key={nome} value={nome} />)}</datalist></label>}
      {!kids && <label>E-mail<input type="email" value={dados.email} placeholder="Opcional. Com e-mail, recebe os avisos do encontro" onChange={(event) => set('email', event.target.value.replace(/\s/g, ''))} /></label>}
      {!kids && <label>WhatsApp<input value={dados.whatsapp} placeholder="Opcional" onChange={(event) => set('whatsapp', event.target.value)} /></label>}
      {erro && <p className="v2-forms-error" role="alert">{erro}</p>}
      <footer><button type="button" onClick={fechar}>Cancelar</button><button type="submit">{item ? 'Salvar' : 'Adicionar'}</button></footer>
    </form>
  </div>;
}

function NovaEquipe({ edition, fechar, salvo }: { edition: string; fechar: () => void; salvo: () => void }) {
  const [tipo, setTipo] = useState<'staff' | 'fornecedor'>('staff');
  const [opcoes, setOpcoes] = useState<Cadastro[]>([]);
  const [escolha, setEscolha] = useState('');
  useEffect(() => {
    setEscolha('');
    const consulta = tipo === 'staff' ? supabase.from('staff').select('id,nome,funcao,cpf,created_at') : supabase.from('fornecedores').select('id,nome,categoria,documento,created_at');
    void consulta.order('created_at', { ascending: false }).then(({ data }) => {
      // Um por pessoa ou empresa: o cadastro mais recente.
      const vistos = new Set<string>();
      setOpcoes(((data || []) as Array<Record<string, string>>).filter((item) => { const doc = item.cpf || item.documento; if (vistos.has(doc)) return false; vistos.add(doc); return true; })
        .map((item) => ({ id: item.id, nome: item.nome, detalhe: item.funcao || item.categoria || '' })));
    });
  }, [tipo]);
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!escolha) return;
    await supabase.rpc('communicali_equipe_edicao', { p_edition: edition, p_tipo: tipo, p_id: escolha, p_incluir: true });
    salvo();
  }
  return <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) fechar(); }}>
    <form className="ap-status-confirm adm-form-pessoa" role="dialog" aria-modal="true" aria-label="Trazer do cadastro" onSubmit={(event) => void salvar(event)}>
      <div><small>EQUIPE</small><h2>Trazer do cadastro</h2><p>Para quem já preencheu o formulário de Staff ou de Fornecedor. O assistente que o staff informou entra junto.</p></div>
      <label>Cadastro de<select value={tipo} onChange={(event) => setTipo(event.target.value as 'staff' | 'fornecedor')}><option value="staff">Staff</option><option value="fornecedor">Fornecedor</option></select></label>
      <label>Quem<select required value={escolha} onChange={(event) => setEscolha(event.target.value)}><option value="">Escolha</option>{opcoes.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.detalhe ? ` · ${item.detalhe}` : ''}</option>)}</select></label>
      <footer><button type="button" onClick={fechar}>Cancelar</button><button type="submit" disabled={!escolha}>Trazer para esta edição</button></footer>
    </form>
  </div>;
}
