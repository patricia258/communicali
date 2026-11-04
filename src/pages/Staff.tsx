/* Staff: cadastro de quem presta serviço nos encontros. O formulário só grava; a lista com CPF e endereço fica no painel. */
import { useEffect, useMemo, useState } from 'react';
import { errorMessage, supabase } from '../lib';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import { downloadXlsx } from '../forms/formExports';

const ACEITE = 'Autorizo';
const DE_ACORDO = 'Estou de acordo';
const OUTRO = 'Outro';
const FUNCOES = ['Fotografia', 'Vídeo', 'Fotografia e vídeo', 'Recepção', 'Apoio de produção', OUTRO];
const FOTO_VIDEO = ['Fotografia', 'Vídeo', 'Fotografia e vídeo'];
const APOIO = ['Recepção', 'Apoio de produção'];
const PAGAMENTO_APOIO = 'Integral por Pix no primeiro dia útil após o evento.';
const TITULARIDADE = 'em chave da **mesma titularidade** (seu CPF ou, com nota fiscal, o CNPJ da empresa), mediante **nota fiscal** ou, para pessoa física, **recibo**.';
const NOTA = 'Nota fiscal (tenho CNPJ)';
const RECIBO = 'Recibo (pessoa física)';

export const PRESET_STAFF: FormPreset = {
  title: 'Cadastro de staff',
  description: 'Para quem vai trabalhar nos encontros, como fotografia, vídeo, recepção e apoio. Seus dados ficam restritos à organização.',
  submitLabel: 'Enviar cadastro',
  successText: 'Cadastro recebido! A organização vai entrar em contato com os próximos passos.',
  questions: [
    { id: 'nome', kind: 'name', label: 'Qual é o seu nome completo?', required: true },
    { id: 'cpf', kind: 'short_text', label: 'Qual é o seu CPF?', required: true },
    { id: 'email', kind: 'email', label: 'Qual é o seu e-mail?', required: true },
    { id: 'whatsapp', kind: 'phone', label: 'Qual é o seu WhatsApp com DDD?', required: true },
    // Quem escolhe uma função da lista pula a pergunta "Outro".
    { id: 'funcao', kind: 'single_choice', label: 'Qual será a sua função no encontro?', options: FUNCOES, required: true,
      logic: FUNCOES.filter((item) => item !== OUTRO).map((item) => ({ when: item, goTo: 'assistente' })) },
    { id: 'funcao_outra', kind: 'short_text', label: 'Conte qual será a sua função', help: 'Ex.: maquiagem, som, decoração.', required: true },
    { id: 'assistente', kind: 'yes_no', label: 'Você vai levar assistente?', help: 'Por exemplo, um assistente de fotografia.', required: true, logic: [{ when: 'Não', goTo: 'comprovante' }] },
    { id: 'assistente_nome', kind: 'short_text', label: 'Nome completo do assistente', required: true },
    { id: 'assistente_cpf', kind: 'short_text', label: 'CPF do assistente', required: true },
    { id: 'assistente_whatsapp', kind: 'phone', label: 'WhatsApp do assistente com DDD', required: true },
    { id: 'assistente_funcao', kind: 'long_text', label: 'O que o assistente vai fazer?', help: 'Uma descrição breve.', required: true },
    { id: 'comprovante', kind: 'single_choice', label: 'Como você vai emitir o comprovante dos pagamentos?', options: [NOTA, RECIBO], required: true, logic: [{ when: RECIBO, goTo: 'cep' }] },
    { id: 'empresa', kind: 'short_text', label: 'Qual é o nome da sua empresa?', required: true },
    { id: 'cnpj', kind: 'short_text', label: 'Qual é o CNPJ da empresa?', required: true },
    { id: 'cep', kind: 'short_text', label: 'Qual é o seu CEP?' },
    { id: 'endereco', kind: 'short_text', label: 'Qual é o seu endereço completo?', help: 'Rua, número, complemento e bairro.', required: true },
    { id: 'cidade', kind: 'short_text', label: 'Em qual cidade e estado?', required: true },
    { id: 'pix', kind: 'short_text', label: 'Qual é a sua chave Pix?', help: 'A chave precisa ser da mesma titularidade do cadastro: no seu nome (o CPF informado) ou, se você emite nota fiscal, no CNPJ da empresa.', required: true },
    { id: 'valor', kind: 'short_text', label: 'Qual foi o valor combinado com a organização?', help: 'Ex.: R$ 800,00.', required: true },
    // Condições de pagamento conforme a função escolhida.
    { id: 'combinado_foto', kind: 'long_text', label: 'O que ficou combinado sobre o pagamento?', help: 'O padrão é 50% na reserva e 50% após a entrega dos materiais. Descreva como ficou no seu caso, com datas se houver.', required: true, showIf: { id: 'funcao', in: FOTO_VIDEO } },
    { id: 'pagamento_foto', kind: 'single_choice', label: 'Condições de pagamento', help: `Pagamento conforme o combinado com a organização. O padrão é **50% na reserva** e **50% após a entrega dos materiais**, por **Pix** ${TITULARIDADE}`, options: [DE_ACORDO], required: true, showIf: { id: 'funcao', in: FOTO_VIDEO } },
    { id: 'pagamento_apoio', kind: 'single_choice', label: 'Condições de pagamento', help: `Pagamento **integral** por **Pix** no **primeiro dia útil após o evento**, ${TITULARIDADE}`, options: [DE_ACORDO], required: true, showIf: { id: 'funcao', in: APOIO } },
    { id: 'combinado_outro', kind: 'long_text', label: 'O que ficou combinado sobre o pagamento?', help: 'Descreva como e quando será pago, com datas se houver.', required: true, showIf: { id: 'funcao', in: [OUTRO] } },
    { id: 'pagamento_outro', kind: 'single_choice', label: 'Condições de pagamento', help: `Pagamento conforme o combinado com a organização, por **Pix** ${TITULARIDADE}`, options: [DE_ACORDO], required: true, showIf: { id: 'funcao', in: [OUTRO] } },
    { id: 'aceite', kind: 'single_choice', label: 'Uso dos dados', help: 'Autorizo a CALI RH a guardar estes dados para organizar minha participação nos encontros, conforme a [política de privacidade](https://comuni.calirh.com/privacidade).', options: [ACEITE], required: true },
  ],
  submit: async (answers) => {
    const value = (key: string) => String(answers[key] ?? '');
    const assistente = answers.assistente === 'Sim';
    const nota = answers.comprovante === NOTA;
    const { error } = await supabase.rpc('communicali_cadastrar_staff', {
      p_nome: value('nome'), p_cpf: value('cpf'), p_email: value('email'), p_whatsapp: value('whatsapp'),
      p_funcao: answers.funcao === OUTRO ? value('funcao_outra') : value('funcao'),
      p_empresa: nota ? value('empresa') : '', p_cnpj: nota ? value('cnpj') : '', p_cep: value('cep'), p_endereco: value('endereco'), p_cidade: value('cidade'), p_pix: value('pix'), p_aceite: answers.aceite === ACEITE,
      p_assistente_nome: assistente ? value('assistente_nome') : null, p_assistente_cpf: assistente ? value('assistente_cpf') : null,
      p_assistente_whatsapp: assistente ? value('assistente_whatsapp') : null, p_assistente_funcao: assistente ? value('assistente_funcao') : null,
      p_comprovante: nota ? 'nota' : answers.comprovante === RECIBO ? 'recibo' : '', p_valor: value('valor'),
      p_aceite_pagamento: [answers.pagamento_foto, answers.pagamento_apoio, answers.pagamento_outro].includes(DE_ACORDO),
      p_combinado: APOIO.includes(value('funcao')) ? PAGAMENTO_APOIO : value('combinado_foto') || value('combinado_outro'),
    });
    return error ? errorMessage(error) : '';
  },
};

export function StaffForm() {
  return <PublicFormPage preset={PRESET_STAFF} />;
}

type Staff = { id: string; nome: string; cpf: string; email: string; whatsapp: string; funcao: string; empresa: string | null; cnpj: string | null; cep: string | null; endereco: string; cidade_uf: string; pix: string | null; status: string; created_at: string; assistente_nome: string | null; assistente_cpf: string | null; assistente_whatsapp: string | null; assistente_funcao: string | null; comprovante: string | null; valor_combinado: string | null; pagamento_combinado: string | null; aceite_pagamento_em: string | null };

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
    downloadXlsx('communicali-staff.xlsx', 'Staff', ['Nome', 'CPF', 'Função', 'E-mail', 'WhatsApp', 'Empresa', 'CNPJ', 'CEP', 'Endereço', 'Cidade/UF', 'Pix', 'Valor combinado', 'Pagamento combinado', 'Comprovante', 'Assistente', 'CPF do assistente', 'WhatsApp do assistente', 'O que o assistente faz', 'Situação'],
      visible.map((item) => [item.nome, item.cpf, item.funcao, item.email, item.whatsapp, item.empresa || '', item.cnpj || '', item.cep || '', item.endereco, item.cidade_uf, item.pix || '', item.valor_combinado || '', item.pagamento_combinado || '', item.comprovante === 'nota' ? 'Nota fiscal' : item.comprovante === 'recibo' ? 'Recibo' : '', item.assistente_nome || '', item.assistente_cpf || '', item.assistente_whatsapp || '', item.assistente_funcao || '', item.status]));
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
              <span>{item.funcao}{item.assistente_nome ? ' + assistente' : ''} · {item.whatsapp}</span>
              <em>{item.status === 'ativo' ? 'Ativo' : 'Inativo'}</em>
              <button type="button" onClick={() => setOpen(open === item.id ? '' : item.id)}>{open === item.id ? 'Fechar' : 'Ver dados'}</button>
              <button type="button" onClick={() => void toggle(item)}>{item.status === 'ativo' ? 'Inativar' : 'Reativar'}</button>
              <button type="button" className="adm-danger" onClick={() => void remove(item)}>Excluir</button>
            </div>
            {open === item.id && <p className="adm-hint">CPF {item.cpf} · {item.email} · {item.endereco}, {item.cidade_uf}{item.cep ? ` · CEP ${item.cep}` : ''}{item.empresa ? ` · ${item.empresa}` : ''}{item.cnpj ? ` · CNPJ ${item.cnpj}` : ''}{item.pix ? ` · Pix ${item.pix}` : ''}</p>}
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
