/* Staff: cadastro de quem presta serviço nos encontros. O formulário só grava; a lista com CPF e endereço fica no painel. */
import { useEffect, useMemo, useState } from 'react';
import { errorMessage, supabase } from '../lib';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import type { FormQuestion } from '../forms/formModel';
import { downloadXlsx } from '../forms/formExports';

const ACEITE = 'Autorizo';
const DE_ACORDO = 'Estou de acordo';
export const CONFERI = 'Conferi meus dados';
const OUTRO = 'Outro';
const FOTO_VIDEO = ['Fotografia e vídeo'];
// Apoio cobre recepção, produção e o que mais o encontro pedir no dia. Pagamento integral, mediante recibo.
const APOIO = ['Apoio', 'Auxiliar de organização'];
// Quem tem condições próprias: descreve o combinado e escolhe entre nota fiscal e recibo.
const LIVRE = ['Palestrante', 'Facilitação de oficina ou experiência', OUTRO];
const FUNCOES = [...FOTO_VIDEO, ...APOIO, ...LIVRE];
const COM_ASSISTENTE = [...FOTO_VIDEO, ...LIVRE];
const PAGAMENTO_APOIO = 'Integral por Pix no primeiro dia útil após o evento.';
const TITULARIDADE = 'em chave da **mesma titularidade** (seu CPF ou, com nota fiscal, o CNPJ da empresa), mediante **nota fiscal** ou, para pessoa física, **recibo**.';
const TITULARIDADE_FOTO = 'em chave da **mesma titularidade do CNPJ** da empresa, mediante **nota fiscal**.';
const TITULARIDADE_APOIO = 'em chave **no seu nome** (o mesmo CPF do cadastro), mediante **recibo**. Caso você não saiba como emitir o recibo, não se preocupe: nós ajudamos você.';
const NOTA = 'Nota fiscal (tenho CNPJ)';
const RECIBO = 'Recibo (pessoa física)';
// Quem volta e diz que nada mudou pula empresa, endereço e Pix: usamos o cadastro anterior.
export const MUDOU = { id: 'atualizar', in: ['Sim', ''] };
export const PIX_TIPOS = ['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Chave aleatória'];
export const PIX_CAMPO: Record<string, string> = { CPF: 'pix_cpf', CNPJ: 'pix_cnpj', 'E-mail': 'pix_email', Telefone: 'pix_telefone', 'Chave aleatória': 'pix_aleatoria' };

/** Chave Pix por tipo, banco e o aviso de conferência. Também usado no cadastro de fornecedor. */
export const PERGUNTAS_PIX: FormQuestion[] = [
    { id: 'pix_cpf', kind: 'short_text', label: 'Chave Pix: CPF', mask: 'cpf', required: true, showIf: [{ id: 'pix_tipo', in: ['CPF'] }, MUDOU] },
    { id: 'pix_cnpj', kind: 'short_text', label: 'Chave Pix: CNPJ', mask: 'cnpj', required: true, showIf: [{ id: 'pix_tipo', in: ['CNPJ'] }, MUDOU] },
    { id: 'pix_email', kind: 'email', label: 'Chave Pix: e-mail', required: true, showIf: [{ id: 'pix_tipo', in: ['E-mail'] }, MUDOU] },
    { id: 'pix_telefone', kind: 'phone', label: 'Chave Pix: telefone', required: true, showIf: [{ id: 'pix_tipo', in: ['Telefone'] }, MUDOU] },
    { id: 'pix_aleatoria', kind: 'short_text', label: 'Chave Pix: chave aleatória', help: 'Copie a chave do aplicativo do banco e cole aqui.', mask: 'pix_aleatoria', required: true, showIf: [{ id: 'pix_tipo', in: ['Chave aleatória'] }, MUDOU] },
    { id: 'banco', kind: 'short_text', label: 'Qual é o banco ou a instituição da chave Pix?', required: true, showIf: MUDOU },
    { id: 'conferi', kind: 'single_choice', label: 'Confira seus dados', help: 'Revise o CPF, o CNPJ e a chave Pix antes de enviar. A CALI RH não se responsabiliza por pagamentos enviados de forma equivocada por erro de digitação ou por falta de algum dado.', options: [CONFERI], required: true, showIf: MUDOU },
];

export const PRESET_STAFF: FormPreset = {
  title: 'Cadastro de STAFF',
  description: `Olá! Que alegria ter você no time da ComuniCALI. Obrigada por fazer parte deste encontro.

Este cadastro é para o **STAFF**, as pessoas que fazem a organização acontecer com a gente. Você vai estar perto de quem chega e vai representar a ComuniCALI no dia, por isso é importante conhecer o que nos move: encontros humanos e acolhedores, onde **falar de pessoas pode mudar o mundo**.

Seus dados ficam restritos à organização.`,
  submitLabel: 'Enviar cadastro',
  successText: 'Cadastro recebido! Obrigada por fazer parte do STAFF. A organização vai entrar em contato com os próximos passos.',
  questions: [
    { id: 'nome', kind: 'name', label: 'Qual é o seu nome completo?', required: true },
    { id: 'cpf', kind: 'short_text', label: 'Qual é o seu CPF?', mask: 'cpf', required: true },
    { id: 'email', kind: 'email', label: 'Qual é o seu e-mail?', required: true },
    { id: 'whatsapp', kind: 'phone', label: 'Qual é o seu WhatsApp?', required: true },
    { id: 'primeira_vez', kind: 'yes_no', label: 'É a primeira vez que você faz parte do STAFF da ComuniCALI?', required: true },
    { id: 'atualizar', kind: 'yes_no', label: 'Algum dado mudou desde o seu último cadastro?', help: 'Empresa, CNPJ, endereço, chave Pix ou banco. Se nada mudou, usamos o seu cadastro anterior e você responde só sobre este encontro.', required: true, showIf: { id: 'primeira_vez', in: ['Não'] } },
    // Quem escolhe uma função da lista pula a pergunta "Outro".
    { id: 'funcao', kind: 'single_choice', label: 'Qual será a sua função no encontro?', options: FUNCOES, required: true,
      logic: FUNCOES.filter((item) => item !== OUTRO).map((item) => ({ when: item, goTo: 'assistente' })) },
    { id: 'funcao_outra', kind: 'short_text', label: 'Conte qual será a sua função', required: true },
    { id: 'assistente', kind: 'yes_no', label: 'Você vai levar assistente?', required: true, logic: [{ when: 'Não', goTo: 'comprovante' }], showIf: { id: 'funcao', in: COM_ASSISTENTE } },
    { id: 'assistente_nome', kind: 'short_text', label: 'Nome completo do assistente', required: true, showIf: { id: 'assistente', in: ['Sim'] } },
    { id: 'assistente_cpf', kind: 'short_text', label: 'CPF do assistente', mask: 'cpf', required: true, showIf: { id: 'assistente', in: ['Sim'] } },
    { id: 'assistente_whatsapp', kind: 'phone', label: 'WhatsApp do assistente', required: true, showIf: { id: 'assistente', in: ['Sim'] } },
    { id: 'assistente_funcao', kind: 'long_text', label: 'O que o assistente vai fazer?', help: 'Uma descrição breve.', required: true, showIf: { id: 'assistente', in: ['Sim'] } },
    { id: 'comprovante', kind: 'single_choice', label: 'Como você vai emitir o comprovante dos pagamentos?', options: [NOTA, RECIBO], required: true, logic: [{ when: RECIBO, goTo: 'cep' }], showIf: { id: 'funcao', in: LIVRE } },
    { id: 'empresa', kind: 'short_text', label: 'Qual é o nome da sua empresa?', help: 'O pagamento é feito mediante nota fiscal.', required: true, showIf: [{ id: 'funcao', in: COM_ASSISTENTE }, MUDOU] },
    { id: 'cnpj', kind: 'short_text', label: 'Qual é o número do CNPJ registrado da empresa?', help: 'Os 14 números do cartão do CNPJ. É este CNPJ que vai na nota fiscal.', mask: 'cnpj', required: true, showIf: [{ id: 'funcao', in: COM_ASSISTENTE }, MUDOU] },
    { id: 'cep', kind: 'short_text', label: 'Qual é o seu CEP?', help: 'Com o CEP, preenchemos a rua, o bairro e a cidade para você conferir.', mask: 'cep', required: true, showIf: MUDOU },
    { id: 'endereco', kind: 'short_text', label: 'Endereço: rua e bairro', help: 'Confira e corrija se precisar.', required: true, showIf: MUDOU },
    { id: 'numero', kind: 'short_text', label: 'Número', required: true, showIf: MUDOU },
    { id: 'complemento', kind: 'short_text', label: 'Complemento', help: 'Apartamento, bloco ou sala. Se não tiver, deixe em branco.', showIf: MUDOU },
    { id: 'cidade', kind: 'short_text', label: 'Cidade e estado', required: true, showIf: MUDOU },
    { id: 'pix_tipo', kind: 'single_choice', label: 'Qual é o tipo da sua chave Pix?', help: 'A chave precisa ser da mesma titularidade do cadastro: no seu nome (o CPF informado) ou, com nota fiscal, no CNPJ da empresa.', options: PIX_TIPOS, required: true, showIf: MUDOU },
    ...PERGUNTAS_PIX,
    { id: 'valor', kind: 'short_text', label: 'Qual foi o valor combinado com a organização?', mask: 'money', required: true },
    // Condições de pagamento conforme a função escolhida.
    { id: 'combinado_foto', kind: 'long_text', label: 'O que ficou combinado sobre o pagamento?', help: 'O padrão é 50% na reserva e 50% após a entrega dos materiais. Descreva como ficou no seu caso, com datas se houver.', required: true, showIf: { id: 'funcao', in: FOTO_VIDEO } },
    { id: 'pagamento_foto', kind: 'single_choice', label: 'Condições de pagamento', help: `Pagamento conforme o combinado com a organização. O padrão é **50% na reserva** e **50% após a entrega dos materiais**, por **Pix** ${TITULARIDADE_FOTO}`, options: [DE_ACORDO], required: true, showIf: { id: 'funcao', in: FOTO_VIDEO } },
    { id: 'pagamento_apoio', kind: 'single_choice', label: 'Condições de pagamento', help: `Pagamento **integral** por **Pix** no **primeiro dia útil após o evento**, ${TITULARIDADE_APOIO}`, options: [DE_ACORDO], required: true, showIf: { id: 'funcao', in: APOIO } },
    { id: 'combinado_outro', kind: 'long_text', label: 'O que ficou combinado sobre o pagamento?', help: 'Descreva como e quando será pago, com datas se houver.', required: true, showIf: { id: 'funcao', in: LIVRE } },
    { id: 'pagamento_outro', kind: 'single_choice', label: 'Condições de pagamento', help: `Pagamento conforme o combinado com a organização, por **Pix** ${TITULARIDADE}`, options: [DE_ACORDO], required: true, showIf: { id: 'funcao', in: LIVRE } },
    { id: 'acionado', kind: 'yes_no', label: 'Deseja ser acionado para os próximos eventos?', required: true },
    { id: 'observacoes', kind: 'long_text', label: 'Quer acrescentar alguma informação?', help: 'Opcional.' },
    { id: 'aceite', kind: 'single_choice', label: 'Uso dos dados', help: 'Autorizo a CALI RH a guardar estes dados para organizar minha participação nos encontros, conforme a [política de privacidade](https://comuni.calirh.com/privacidade).', options: [ACEITE], required: true },
  ],
  submit: async (answers) => {
    const value = (key: string) => String(answers[key] ?? '').trim();
    const funcao = value('funcao');
    const assistente = answers.assistente === 'Sim';
    const nota = FOTO_VIDEO.includes(funcao) || (LIVRE.includes(funcao) && answers.comprovante === NOTA);
    const pixTipo = value('pix_tipo');
    const primeira = answers.primeira_vez !== 'Não';
    const dados = primeira || answers.atualizar === 'Sim';
    const { error } = await supabase.rpc('communicali_cadastrar_staff', {
      p_nome: value('nome'), p_cpf: value('cpf'), p_email: value('email'), p_whatsapp: value('whatsapp'),
      p_funcao: funcao === OUTRO ? value('funcao_outra') : funcao,
      p_empresa: nota ? value('empresa') : '', p_cnpj: nota ? value('cnpj') : '', p_cep: value('cep'),
      p_endereco: [value('endereco'), value('numero'), value('complemento')].filter(Boolean).join(', '), p_cidade: value('cidade'),
      p_pix: value(PIX_CAMPO[pixTipo] || ''), p_aceite: answers.aceite === ACEITE,
      p_assistente_nome: assistente ? value('assistente_nome') : null, p_assistente_cpf: assistente ? value('assistente_cpf') : null,
      p_assistente_whatsapp: assistente ? value('assistente_whatsapp') : null, p_assistente_funcao: assistente ? value('assistente_funcao') : null,
      p_comprovante: nota ? 'nota' : 'recibo', p_valor: value('valor'),
      p_aceite_pagamento: [answers.pagamento_foto, answers.pagamento_apoio, answers.pagamento_outro].includes(DE_ACORDO) && (!dados || answers.conferi === CONFERI),
      p_combinado: APOIO.includes(funcao) ? PAGAMENTO_APOIO : value('combinado_foto') || value('combinado_outro'),
      p_pix_tipo: dados ? pixTipo : null, p_banco: dados ? value('banco') : null, p_primeira_vez: primeira, p_atualizar: dados, p_acionado: answers.acionado === 'Sim', p_observacoes: value('observacoes') || null,
    });
    return error ? errorMessage(error) : '';
  },
};

export function StaffForm() {
  return <PublicFormPage preset={PRESET_STAFF} />;
}

type Staff = { id: string; nome: string; cpf: string; email: string; whatsapp: string; funcao: string; empresa: string | null; cnpj: string | null; cep: string | null; endereco: string; cidade_uf: string; pix: string | null; status: string; created_at: string; assistente_nome: string | null; assistente_cpf: string | null; assistente_whatsapp: string | null; assistente_funcao: string | null; comprovante: string | null; valor_combinado: string | null; pagamento_combinado: string | null; aceite_pagamento_em: string | null; pix_tipo: string | null; banco: string | null; quer_ser_acionado: boolean | null; observacoes: string | null; primeira_vez: boolean | null; atualizou_dados: boolean; conferir: string | null };

const maskCpf = (cpf: string) => `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;

export function StaffPanel() {
  const [list, setList] = useState<Staff[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState('');
  const [note, setNote] = useState('');
  const load = () => supabase.from('staff').select('*').order('created_at', { ascending: false }).then(({ data }) => setList((data || []) as Staff[]));
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => { const term = query.trim().toLowerCase(); return list.filter((item) => !term || `${item.nome} ${item.funcao} ${item.email}`.toLowerCase().includes(term)); }, [list, query]);
  const link = `${window.location.origin}/staff`;
  // Cada participação é um registro: conta quantas vezes o mesmo CPF já veio até esta.
  const participacoes = (item: Staff) => list.filter((outro) => outro.cpf === item.cpf && outro.created_at <= item.created_at).length;

  async function toggle(item: Staff) {
    await supabase.from('staff').update({ status: item.status === 'ativo' ? 'inativo' : 'ativo', updated_at: new Date().toISOString() }).eq('id', item.id);
    void load();
  }

  async function remove(item: Staff) {
    if (!window.confirm(`Excluir o cadastro de ${item.nome}? Esta ação não pode ser desfeita.`)) return;
    await supabase.from('staff').delete().eq('id', item.id);
    void load();
  }

  function exportAll() {
    downloadXlsx('communicali-staff.xlsx', 'Staff', ['Nome', 'CPF', 'Função', 'E-mail', 'WhatsApp', 'Empresa', 'CNPJ', 'CEP', 'Endereço', 'Cidade/UF', 'Tipo da chave Pix', 'Pix', 'Banco', 'Valor combinado', 'Pagamento combinado', 'Comprovante', 'Assistente', 'CPF do assistente', 'WhatsApp do assistente', 'O que o assistente faz', 'Quer ser acionado', 'Observações', 'Primeira vez', 'Conferir', 'Data', 'Situação'],
      visible.map((item) => [item.nome, item.cpf, item.funcao, item.email, item.whatsapp, item.empresa || '', item.cnpj || '', item.cep || '', item.endereco, item.cidade_uf, item.pix_tipo || '', item.pix || '', item.banco || '', item.valor_combinado || '', item.pagamento_combinado || '', item.comprovante === 'nota' ? 'Nota fiscal' : item.comprovante === 'recibo' ? 'Recibo' : '', item.assistente_nome || '', item.assistente_cpf || '', item.assistente_whatsapp || '', item.assistente_funcao || '', item.quer_ser_acionado ? 'Sim' : item.quer_ser_acionado === false ? 'Não' : '', item.observacoes || '', item.primeira_vez === false ? 'Não' : 'Sim', item.conferir || '', new Date(item.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), item.status]));
  }

  return (
    <>
      <div className="wf-head"><div><small>STAFF</small><h1>Quem trabalha nos encontros</h1><p>Fotógrafos, vídeo, recepção e demais prestadores. Envie o link para a pessoa preencher. CPF e endereço só aparecem aqui.</p></div><div className="v2-head-actions"><button type="button" className="wf-secondary" disabled={!visible.length} onClick={exportAll}>Exportar Excel</button></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <header><small>FORMULÁRIO DE CADASTRO</small><h2>Link para enviar ao staff</h2></header>
        <div className="adm-links">
          <input readOnly aria-label="Link do cadastro de staff" value={link} onFocus={(event) => event.target.select()} />
          <button type="button" className="wf-primary" onClick={() => { void navigator.clipboard.writeText(link); setNote('Link copiado.'); }}>Copiar link</button>
          <a className="wf-secondary" href={link} target="_blank" rel="noopener noreferrer">Abrir formulário</a>
        </div>
      </section>
      <div className="wf-controls"><input aria-label="Buscar staff" placeholder="Buscar por nome, função ou e-mail" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="adm-list">
        {visible.map((item) => (
          <div className="adm-row adm-row--static adm-row--stack" key={item.id}>
            <div className="adm-row__line">
              <strong>{item.nome}</strong>
              <span>{item.funcao}{item.assistente_nome ? ' + assistente' : ''} · {item.whatsapp} · {new Date(item.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}{participacoes(item) > 1 ? ` · ${participacoes(item)}ª participação` : ''}</span>
              <em>{item.status === 'ativo' ? 'Ativo' : 'Inativo'}</em>
              <button type="button" onClick={() => setOpen(open === item.id ? '' : item.id)}>{open === item.id ? 'Fechar' : 'Ver dados'}</button>
              <button type="button" onClick={() => void toggle(item)}>{item.status === 'ativo' ? 'Inativar' : 'Reativar'}</button>
              <button type="button" className="adm-danger" onClick={() => void remove(item)}>Excluir</button>
            </div>
            {open === item.id && <p className="adm-hint">CPF {item.cpf} · {item.email} · {item.endereco}, {item.cidade_uf}{item.cep ? ` · CEP ${item.cep}` : ''}{item.empresa ? ` · ${item.empresa}` : ''}{item.cnpj ? ` · CNPJ ${item.cnpj}` : ''}{item.pix ? ` · Pix (${item.pix_tipo || 'chave'}) ${item.pix}${item.banco ? `, ${item.banco}` : ''}` : ''}{item.quer_ser_acionado ? ' · Quer ser acionado para próximos eventos' : ''}</p>}
            {open === item.id && item.observacoes && <p className="adm-hint">Observações: {item.observacoes}</p>}
            {item.conferir && <p className="adm-hint adm-alerta" role="note">Conferir: {item.conferir}</p>}
            {open === item.id && item.primeira_vez === false && <p className="adm-hint">{item.atualizou_dados ? 'Já participou antes e atualizou os dados neste cadastro.' : 'Já participou antes. Dados de empresa, endereço e Pix vieram do cadastro anterior.'}</p>}
            {open === item.id && <p className="adm-hint">{item.valor_combinado ? `Valor combinado: ${item.valor_combinado}` : 'Valor não informado'} · {item.comprovante === 'nota' ? 'Emite nota fiscal' : item.comprovante === 'recibo' ? 'Emite recibo' : 'Comprovante não informado'}{item.aceite_pagamento_em ? ' · Aceitou as condições de pagamento' : ''}{item.pagamento_combinado ? ` · Combinado: ${item.pagamento_combinado}` : ''}</p>}
            {open === item.id && item.assistente_nome && <p className="adm-hint">Assistente: {item.assistente_nome} · CPF {item.assistente_cpf} · {item.assistente_whatsapp} · {item.assistente_funcao}</p>}
            {open !== item.id && <p className="adm-hint">CPF {maskCpf(item.cpf)}</p>}
          </div>
        ))}
        {!visible.length && <p className="adm-hint">Nenhum cadastro de staff ainda.</p>}
      </div>
    </>
  );
}
