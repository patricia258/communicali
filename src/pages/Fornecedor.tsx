/* Fornecedor: cadastro simples para a organização acionar quem fornece para os encontros. O formulário só grava; os dados ficam no painel. */
import { useEffect, useMemo, useState } from 'react';
import { errorMessage, supabase } from '../lib';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import { downloadXlsx } from '../forms/formExports';
import { CONFERI, PERGUNTAS_PIX, PIX_CAMPO, PIX_TIPOS } from './Staff';

const ACEITE = 'Autorizo';
const EMPRESA = 'Empresa (CNPJ)';
const PESSOA = 'Pessoa física (CPF)';
const CATEGORIAS = ['Alimentos e bebidas', 'Brindes e materiais gráficos', 'Decoração e flores', 'Espaço para eventos', 'Som, luz e equipamentos', 'Serviços', 'Outro'];

const PRESET: FormPreset = {
  title: 'Cadastro de fornecedor',
  description: `Olá! Obrigada pelo interesse em fornecer para a ComuniCALI.

Este cadastro é simples e serve para a gente acionar você sempre que um encontro precisar do que você oferece.

Seus dados ficam restritos à organização.`,
  submitLabel: 'Enviar cadastro',
  successText: 'Cadastro recebido! Obrigada. A organização vai entrar em contato quando um encontro precisar do que você fornece.',
  questions: [
    { id: 'primeira_vez', kind: 'yes_no', label: 'É a primeira vez que você fornece para a ComuniCALI?', required: true },
    { id: 'tipo', kind: 'single_choice', label: 'Você fornece como empresa ou como pessoa física?', options: [EMPRESA, PESSOA], required: true, logic: [{ when: PESSOA, goTo: 'cpf' }] },
    { id: 'cnpj', kind: 'short_text', label: 'Qual é o número do CNPJ registrado da empresa?', help: 'Os 14 números do cartão do CNPJ.', mask: 'cnpj', required: true },
    { id: 'razao', kind: 'short_text', label: 'Qual é a razão social ou o nome da empresa?', required: true },
    { id: 'contato', kind: 'short_text', label: 'Nome de quem vai falar com a gente', required: true },
    { id: 'cpf', kind: 'short_text', label: 'Qual é o seu CPF?', mask: 'cpf', required: true, showIf: { id: 'tipo', in: [PESSOA] } },
    { id: 'nome', kind: 'name', label: 'Qual é o seu nome completo?', required: true, showIf: { id: 'tipo', in: [PESSOA] } },
    { id: 'email', kind: 'email', label: 'Qual é o e-mail para contato?', required: true },
    { id: 'whatsapp', kind: 'phone', label: 'Qual é o WhatsApp para contato?', required: true },
    { id: 'categoria', kind: 'single_choice', label: 'O que você fornece?', options: CATEGORIAS, required: true },
    { id: 'fornece', kind: 'long_text', label: 'Conte um pouco mais sobre o que você fornece', help: 'Produtos, serviços, quantidades ou o que mais ajudar a organização.', required: true },
    // Quem já forneceu e não mudou nada pula endereço e Pix: usamos o cadastro anterior.
    { id: 'atualizar', kind: 'yes_no', label: 'Algum dado mudou desde o seu último cadastro?', help: 'Endereço, chave Pix ou banco. Se nada mudou, usamos o seu cadastro anterior.', required: true, logic: [{ when: 'Não', goTo: 'acionado' }], showIf: { id: 'primeira_vez', in: ['Não'] } },
    { id: 'cep', kind: 'short_text', label: 'Qual é o CEP?', help: 'Com o CEP, preenchemos a rua, o bairro e a cidade para você conferir.', mask: 'cep', required: true },
    { id: 'endereco', kind: 'short_text', label: 'Endereço: rua e bairro', help: 'Confira e corrija se precisar.', required: true },
    { id: 'numero', kind: 'short_text', label: 'Número', required: true },
    { id: 'complemento', kind: 'short_text', label: 'Complemento', help: 'Apartamento, bloco ou sala. Se não tiver, deixe em branco.' },
    { id: 'cidade', kind: 'short_text', label: 'Cidade e estado', required: true },
    { id: 'pix_tipo', kind: 'single_choice', label: 'Qual é o tipo da chave Pix?', help: 'A chave precisa ser da mesma titularidade do cadastro: o CNPJ da empresa ou o CPF da pessoa física.', options: PIX_TIPOS, required: true },
    ...PERGUNTAS_PIX,
    { id: 'acionado', kind: 'yes_no', label: 'Podemos acionar você para os próximos eventos?', required: true },
    { id: 'observacoes', kind: 'long_text', label: 'Quer acrescentar alguma informação?', help: 'Opcional.' },
    { id: 'aceite', kind: 'single_choice', label: 'Uso dos dados', help: 'Autorizo a CALI RH a guardar estes dados para contato e pagamentos relacionados aos encontros, conforme a [política de privacidade](https://comuni.calirh.com/privacidade).', options: [ACEITE], required: true },
  ],
  submit: async (answers) => {
    const value = (key: string) => String(answers[key] ?? '').trim();
    const empresa = answers.tipo === EMPRESA;
    const primeira = answers.primeira_vez !== 'Não';
    const dados = primeira || answers.atualizar === 'Sim';
    if (dados && answers.conferi !== CONFERI) return 'Confira seus dados antes de enviar.';
    const { error } = await supabase.rpc('communicali_cadastrar_fornecedor', {
      p_primeira_vez: primeira, p_tipo: empresa ? 'empresa' : 'pessoa', p_documento: empresa ? value('cnpj') : value('cpf'),
      p_nome: empresa ? value('razao') : value('nome'), p_contato: empresa ? value('contato') : null,
      p_email: value('email'), p_whatsapp: value('whatsapp'), p_categoria: value('categoria'), p_fornece: value('fornece'),
      p_atualizar: dados, p_cep: dados ? value('cep') : null,
      p_endereco: dados ? [value('endereco'), value('numero'), value('complemento')].filter(Boolean).join(', ') : null, p_cidade: dados ? value('cidade') : null,
      p_pix_tipo: dados ? value('pix_tipo') : null, p_pix: dados ? value(PIX_CAMPO[value('pix_tipo')] || '') : null, p_banco: dados ? value('banco') : null,
      p_acionado: answers.acionado === 'Sim', p_observacoes: value('observacoes') || null, p_aceite: answers.aceite === ACEITE,
    });
    return error ? errorMessage(error) : '';
  },
};

export function FornecedorForm() {
  return <PublicFormPage preset={PRESET} />;
}
export const PRESET_FORNECEDOR = PRESET;

type Fornecedor = { id: string; tipo: string; documento: string; nome: string; contato_nome: string | null; email: string; whatsapp: string; categoria: string; fornece: string; primeira_vez: boolean; atualizou_dados: boolean; anterior_id: string | null; cep: string | null; endereco: string | null; cidade_uf: string | null; pix_tipo: string | null; pix: string | null; banco: string | null; quer_ser_acionado: boolean | null; observacoes: string | null; status: string; created_at: string };

const formatarDoc = (item: Fornecedor) => item.tipo === 'empresa'
  ? item.documento.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  : item.documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

export function FornecedorPanel() {
  const [list, setList] = useState<Fornecedor[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState('');
  const [note, setNote] = useState('');
  const load = () => supabase.from('fornecedores').select('*').order('created_at', { ascending: false }).then(({ data }) => setList((data || []) as Fornecedor[]));
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => { const term = query.trim().toLowerCase(); return list.filter((item) => !term || `${item.nome} ${item.categoria} ${item.fornece} ${item.email}`.toLowerCase().includes(term)); }, [list, query]);
  const link = `${window.location.origin}/fornecedor`;
  // Quem voltou sem mudar nada aparece com os dados do cadastro anterior.
  const base = (item: Fornecedor) => (item.atualizou_dados ? item : list.find((outro) => outro.id === item.anterior_id) || item);

  async function toggle(item: Fornecedor) {
    await supabase.from('fornecedores').update({ status: item.status === 'ativo' ? 'inativo' : 'ativo', updated_at: new Date().toISOString() }).eq('id', item.id);
    void load();
  }

  async function remove(item: Fornecedor) {
    if (!window.confirm(`Excluir o cadastro de ${item.nome}? Esta ação não pode ser desfeita.`)) return;
    await supabase.from('fornecedores').delete().eq('id', item.id);
    void load();
  }

  function exportAll() {
    downloadXlsx('communicali-fornecedores.xlsx', 'Fornecedores', ['Nome', 'Tipo', 'CPF/CNPJ', 'Contato', 'E-mail', 'WhatsApp', 'Categoria', 'O que fornece', 'Endereço', 'Cidade/UF', 'CEP', 'Tipo da chave Pix', 'Pix', 'Banco', 'Pode ser acionado', 'Observações', 'Primeira vez', 'Data', 'Situação'],
      visible.map((item) => { const dados = base(item); return [item.nome, item.tipo === 'empresa' ? 'Empresa' : 'Pessoa física', formatarDoc(item), item.contato_nome || '', item.email, item.whatsapp, item.categoria, item.fornece, dados.endereco || '', dados.cidade_uf || '', dados.cep || '', dados.pix_tipo || '', dados.pix || '', dados.banco || '', item.quer_ser_acionado ? 'Sim' : 'Não', item.observacoes || '', item.primeira_vez ? 'Sim' : 'Não', new Date(item.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), item.status]; }));
  }

  return (
    <>
      <div className="wf-head"><div><small>FORNECEDORES</small><h1>Quem fornece para os encontros</h1><p>Alimentos, brindes, decoração, espaço, equipamentos e serviços. Envie o link para o fornecedor preencher. Documento, endereço e Pix só aparecem aqui.</p></div><div className="v2-head-actions"><button type="button" className="wf-secondary" disabled={!visible.length} onClick={exportAll}>Exportar Excel</button></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <header><small>FORMULÁRIO DE CADASTRO</small><h2>Link para enviar ao fornecedor</h2></header>
        <div className="adm-links">
          <input readOnly aria-label="Link do cadastro de fornecedor" value={link} onFocus={(event) => event.target.select()} />
          <button type="button" className="wf-primary" onClick={() => { void navigator.clipboard.writeText(link); setNote('Link copiado.'); }}>Copiar link</button>
          <a className="wf-secondary" href={link} target="_blank" rel="noopener noreferrer">Abrir formulário</a>
        </div>
      </section>
      <div className="wf-controls"><input aria-label="Buscar fornecedor" placeholder="Buscar por nome, categoria ou e-mail" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="adm-list">
        {visible.map((item) => {
          const dados = base(item);
          return (
            <div className="adm-row adm-row--static adm-row--stack" key={item.id}>
              <div className="adm-row__line">
                <strong>{item.nome}</strong>
                <span>{item.categoria} · {item.whatsapp}</span>
                <em>{item.status === 'ativo' ? 'Ativo' : 'Inativo'}</em>
                <button type="button" onClick={() => setOpen(open === item.id ? '' : item.id)}>{open === item.id ? 'Fechar' : 'Ver dados'}</button>
                <button type="button" onClick={() => void toggle(item)}>{item.status === 'ativo' ? 'Inativar' : 'Reativar'}</button>
                <button type="button" className="adm-danger" onClick={() => void remove(item)}>Excluir</button>
              </div>
              <p className="adm-hint">{item.fornece}</p>
              {open === item.id && <p className="adm-hint">{item.tipo === 'empresa' ? 'CNPJ' : 'CPF'} {formatarDoc(item)}{item.contato_nome ? ` · Contato: ${item.contato_nome}` : ''} · {item.email}{item.quer_ser_acionado ? ' · Pode ser acionado para próximos eventos' : ''}</p>}
              {open === item.id && <p className="adm-hint">{!item.atualizou_dados ? (item.anterior_id ? 'Sem mudanças desde o cadastro anterior. ' : 'Disse que nada mudou, mas não há cadastro anterior com este documento. Peça os dados. ') : ''}{dados.endereco ? `${dados.endereco}, ${dados.cidade_uf}${dados.cep ? ` · CEP ${dados.cep}` : ''}` : ''}{dados.pix ? ` · Pix (${dados.pix_tipo}) ${dados.pix}${dados.banco ? `, ${dados.banco}` : ''}` : ''}</p>}
              {open === item.id && item.observacoes && <p className="adm-hint">Observações: {item.observacoes}</p>}
            </div>
          );
        })}
        {!visible.length && <p className="adm-hint">Nenhum cadastro de fornecedor ainda.</p>}
      </div>
    </>
  );
}
