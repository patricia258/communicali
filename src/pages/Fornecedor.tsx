/* Fornecedor: cadastro simples para a organização acionar quem fornece para os encontros. O formulário só grava; os dados ficam no painel. */
import { useState } from 'react';
import { errorMessage, supabase } from '../lib';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import { RegistrosPainel, type Campo } from './RegistrosPainel';
import { CONFERI, chavePix, perguntasPix } from './Staff';

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
    ...perguntasPix({ id: 'tipo', in: [EMPRESA] }, { id: 'tipo', in: [PESSOA] }),
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
      p_pix_tipo: dados ? chavePix(answers).tipo : null, p_pix: dados ? chavePix(answers).chave : null, p_banco: dados ? value('banco') : null,
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

const CAMPOS_FORNECEDOR: Array<Campo<Fornecedor>> = [
  { id: 'nome', titulo: 'Nome', valor: (item) => item.nome, coluna: 'nome' },
  { id: 'categoria', titulo: 'Categoria', valor: (item) => item.categoria, coluna: 'categoria' },
  { id: 'fornece', titulo: 'O que fornece', valor: (item) => item.fornece, coluna: 'fornece', longo: true },
  { id: 'contato', titulo: 'Contato', valor: (item) => item.contato_nome || '', coluna: 'contato_nome' },
  { id: 'whatsapp', titulo: 'WhatsApp', valor: (item) => item.whatsapp, coluna: 'whatsapp' },
  { id: 'email', titulo: 'E-mail', valor: (item) => item.email, coluna: 'email' },
  { id: 'cadastro', titulo: 'Cadastro', valor: (item) => (item.primeira_vez ? 'Primeira vez' : item.atualizou_dados ? 'Voltou, atualizou dados' : 'Voltou, mesmos dados') },
  { id: 'acionado', titulo: 'Pode ser acionado', valor: (item) => (item.quer_ser_acionado ? 'Sim' : 'Não') },
  { id: 'tipo', titulo: 'Tipo', valor: (item) => (item.tipo === 'empresa' ? 'Empresa' : 'Pessoa física'), soDetalhe: true },
  { id: 'documento', titulo: 'CPF/CNPJ', valor: formatarDoc, soDetalhe: true },
  { id: 'cep', titulo: 'CEP', valor: (item) => item.cep || '', coluna: 'cep', soDetalhe: true },
  { id: 'endereco', titulo: 'Endereço', valor: (item) => item.endereco || '', coluna: 'endereco', soDetalhe: true },
  { id: 'cidade', titulo: 'Cidade/UF', valor: (item) => item.cidade_uf || '', coluna: 'cidade_uf', soDetalhe: true },
  { id: 'pix_tipo', titulo: 'Tipo da chave Pix', valor: (item) => item.pix_tipo || '', coluna: 'pix_tipo', soDetalhe: true },
  { id: 'pix', titulo: 'Chave Pix', valor: (item) => item.pix || '', coluna: 'pix', soDetalhe: true },
  { id: 'banco', titulo: 'Banco', valor: (item) => item.banco || '', coluna: 'banco', soDetalhe: true },
  { id: 'observacoes', titulo: 'Observações', valor: (item) => item.observacoes || '', coluna: 'observacoes', longo: true, soDetalhe: true },
];

export function FornecedorPanel() {
  const [note, setNote] = useState('');
  const link = `${window.location.origin}/fornecedor`;
  return (
    <>
      <div className="wf-head"><div><small>FORNECEDORES</small><h1>Quem fornece para os encontros</h1><p>Alimentos, brindes, decoração, espaço, equipamentos e serviços. Envie o link para o fornecedor preencher. Documento, endereço e Pix só aparecem aqui.</p></div></div>
      {note && <p className="v2-forms-ok" role="status">{note}</p>}
      <section className="v2-forms-card">
        <header><small>FORMULÁRIO DE CADASTRO</small><h2>Link para enviar ao fornecedor</h2></header>
        <div className="adm-links">
          <input readOnly aria-label="Link do cadastro de fornecedor" value={link} onFocus={(event) => event.target.select()} />
          <button type="button" className="wf-primary" onClick={() => { void navigator.clipboard.writeText(link); setNote('Link copiado.'); }}>Copiar link</button>
          <a className="wf-secondary" href={link} target="_blank" rel="noopener noreferrer">Abrir formulário</a>
        </div>
      </section>
      <RegistrosPainel<Fornecedor> tabela="fornecedores" campos={CAMPOS_FORNECEDOR} nome={(item) => item.nome}
        alerta={(item) => (!item.atualizou_dados && !item.anterior_id ? 'Disse que nada mudou, mas não há cadastro anterior com este documento. Peça os dados.' : null)}
        filtro={{ titulo: 'Categoria', valor: (item) => item.categoria }} arquivo="communicali-fornecedores.xlsx" vazio="Nenhum cadastro de fornecedor ainda." />
    </>
  );
}
