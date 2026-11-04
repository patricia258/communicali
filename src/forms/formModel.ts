/* CALI Forms: modelo comum à tela da administradora e à página pública (/f/:slug). As perguntas ficam numa lista
   JSON no próprio formulário (cali_workspace.forms.questions); as respostas, por id de pergunta, em form_responses. */

export type QuestionKind = 'name' | 'email' | 'phone' | 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'scale' | 'yes_no' | 'date' | 'number' | 'file' | 'statement';

export type FormQuestion = {
  id: string;
  kind: QuestionKind;
  label: string;
  help?: string;
  required?: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
  /** Pergunta condicional: se a resposta for `when`, segue para a pergunta `goTo` (id) ou END_OF_FORM. */
  logic?: Array<{ when: string; goTo: string }>;
  /** Só aparece quando a resposta da pergunta `id` é uma das opções em `in` (ex.: condições de pagamento por função).
      Com uma lista, todas as condições precisam bater. Resposta vazia conta como ''. */
  showIf?: ShowIf | ShowIf[];
  /** Formato do campo de texto. CPF, CNPJ e CEP também são reconhecidos pelo título da pergunta. */
  mask?: TextMask;
  /** Pergunta de arquivo: 'images_pdf' aceita só PDF e imagens; padrão aceita também documentos, áudio e vídeo. */
  accept?: 'images_pdf' | 'any';
  /** Tela de texto pode mostrar um material: capa, link e chamada. */
  attachment?: { url: string; cover: string; title: string; text?: string };
};

export const END_OF_FORM = '__end';

type Condicao = { id: string; in: string[] };
/** Uma condição, ou `any` quando basta uma delas bater. */
export type ShowIf = Condicao | { any: Condicao[] };

/** A pergunta aparece com as respostas dadas até aqui? */
export function visivel(question: FormQuestion, answers: Record<string, FormAnswer | undefined>) {
  if (!question.showIf) return true;
  const bate = (regra: Condicao) => regra.in.includes(String(answers[regra.id] ?? ''));
  const regras = Array.isArray(question.showIf) ? question.showIf : [question.showIf];
  return regras.every((regra) => ('any' in regra ? regra.any.some(bate) : bate(regra)));
}

/** Troca {id} no título ou na ajuda pela resposta já dada (ex.: "A chave Pix é o CNPJ {cnpj}?"). */
export function comRespostas(texto: string, answers: Record<string, FormAnswer | undefined>) {
  // {a|b}: usa a primeira resposta preenchida.
  return texto.replace(/\{([\w|]+)\}/g, (marca, ids: string) => { const id = ids.split('|').find((item) => answers[item] !== undefined && String(answers[item]).trim()); return id ? String(answers[id]) : marca; });
}

export type TextMask = 'cpf' | 'cnpj' | 'cep' | 'money' | 'pix_aleatoria';

/** Formato do campo: o informado na pergunta ou, em texto curto, o que o título indica (vale para os formulários do painel). */
export function maskOf(question: FormQuestion): TextMask | undefined {
  if (question.mask) return question.mask;
  if (question.kind !== 'short_text') return undefined;
  if (/\bCNPJ\b/i.test(question.label)) return 'cnpj';
  if (/\bCPF\b/i.test(question.label)) return 'cpf';
  if (/\bCEP\b/i.test(question.label)) return 'cep';
  return undefined;
}

const digitos = (value: string) => value.replace(/\D/g, '');
const agrupar = (valor: string, partes: Array<[number, string]>) => {
  let resto = valor; let saida = '';
  for (const [tamanho, antes] of partes) { if (!resto) break; saida += (saida ? antes : '') + resto.slice(0, tamanho); resto = resto.slice(tamanho); }
  return saida;
};

/** Aplica o formato enquanto a pessoa digita: só números (ou hexadecimal na chave aleatória) e no tamanho certo. */
export function applyMask(mask: TextMask, raw: string) {
  if (mask === 'cpf') return agrupar(digitos(raw).slice(0, 11), [[3, ''], [3, '.'], [3, '.'], [2, '-']]);
  if (mask === 'cnpj') return agrupar(digitos(raw).slice(0, 14), [[2, ''], [3, '.'], [3, '.'], [4, '/'], [2, '-']]);
  if (mask === 'cep') return agrupar(digitos(raw).slice(0, 8), [[5, ''], [3, '-']]);
  if (mask === 'money') {
    const centavos = digitos(raw).replace(/^0+/, '').slice(0, 11);
    if (!centavos) return '';
    const numero = Number(centavos) / 100;
    return `R$ ${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return agrupar(raw.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 32), [[8, ''], [4, '-'], [4, '-'], [4, '-'], [12, '-']]);
}

export const MASK_PLACEHOLDER: Record<TextMask, string> = { cpf: '000.000.000-00', cnpj: '00.000.000/0000-00', cep: '00000-000', money: 'R$ 0,00', pix_aleatoria: '00000000-0000-0000-0000-000000000000' };

function cpfValido(valor: string) {
  const n = digitos(valor);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const dv = (fim: number) => { let soma = 0; for (let i = 0; i < fim; i += 1) soma += Number(n[i]) * (fim + 1 - i); const resto = (soma * 10) % 11; return resto === 10 ? 0 : resto; };
  return dv(9) === Number(n[9]) && dv(10) === Number(n[10]);
}

function cnpjValido(valor: string) {
  const n = digitos(valor);
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;
  const dv = (fim: number) => { const pesos = fim === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const soma = pesos.reduce((total, peso, i) => total + Number(n[i]) * peso, 0); const resto = soma % 11; return resto < 2 ? 0 : 11 - resto; };
  return dv(12) === Number(n[12]) && dv(13) === Number(n[13]);
}

/** Telefone do Brasil guardado como "(41) 98779-1933": DDD de 2 dígitos e número de 8 ou 9 (celular começa com 9). */
export function phoneParts(value: string) {
  const m = value.match(/^\((\d{0,2})\)\s?(.*)$/);
  return m ? { ddd: m[1], numero: digitos(m[2]) } : { ddd: '', numero: digitos(value) };
}
export function joinPhone(ddd: string, numero: string) {
  const d = digitos(ddd).slice(0, 2); const n = digitos(numero).slice(0, 9);
  if (!d && !n) return '';
  return `(${d}) ${n.length > 4 ? `${n.slice(0, n.length - 4)}-${n.slice(-4)}` : n}`;
}
export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export type FormStatus = 'draft' | 'open' | 'closed';
export type FormAudience = 'cali' | 'client';

export const AUDIENCE_LABELS: Record<FormAudience, string> = { cali: 'Comunidade', client: 'Parceiros' };

export const CATEGORY_SUGGESTIONS = ['Inscrição', 'Parceria', 'Avaliação do encontro', 'Pesquisa', 'Cadastro', 'Feedback'];

export type FormRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thank_you: string;
  status: FormStatus;
  company_id: string | null;
  questions: FormQuestion[];
  confirm_email: boolean;
  /** Aparece para quem responde, acima do título (ex.: Pesquisa de satisfação). */
  category: string;
  /** Organização interna: formulário da própria CALI ou feito para um cliente. */
  audience: FormAudience;
  /** Etapas de acompanhamento das respostas (triagem). Vazio: só Contato e Nota. */
  stages?: string[] | null;
  /** Texto do botão final e mensagem da tela de sucesso (vazios = padrão). */
  submit_label?: string | null;
  success_text?: string | null;
  created_at: string;
  updated_at: string;
};

export type FormAnswer = string | number | string[];

export const KIND_LABELS: Record<QuestionKind, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone / WhatsApp',
  short_text: 'Resposta curta',
  long_text: 'Resposta longa',
  single_choice: 'Escolha única',
  multi_choice: 'Múltipla escolha',
  scale: 'Escala de nota',
  yes_no: 'Sim ou não',
  date: 'Data',
  number: 'Número',
  file: 'Arquivo ou foto',
  statement: 'Texto informativo (sem resposta)',
};

export const KIND_ORDER: QuestionKind[] = ['name', 'email', 'phone', 'short_text', 'long_text', 'single_choice', 'multi_choice', 'scale', 'yes_no', 'date', 'number', 'file', 'statement'];

export const STATUS_LABELS: Record<FormStatus, string> = { draft: 'Rascunho', open: 'Recebendo respostas', closed: 'Encerrado' };

export const PUBLIC_FORM_BASE = 'https://comuni.calirh.com/f/';

export function questionId() {
  return `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newQuestion(kind: QuestionKind): FormQuestion {
  const base: FormQuestion = { id: questionId(), kind, label: '', required: kind !== 'statement' };
  if (kind === 'name') return { ...base, label: 'Qual é o seu nome?' };
  if (kind === 'email') return { ...base, label: 'Qual é o seu e-mail?', help: 'Enviaremos a confirmação para este endereço.' };
  if (kind === 'phone') return { ...base, label: 'Qual é o seu telefone ou WhatsApp?' };
  if (kind === 'single_choice' || kind === 'multi_choice') return { ...base, options: ['Opção 1', 'Opção 2'] };
  if (kind === 'scale') return { ...base, scaleMin: 0, scaleMax: 10, minLabel: 'Nada provável', maxLabel: 'Muito provável' };
  return base;
}

export function slugify(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
}

export function isAnswerable(question: FormQuestion) {
  return question.kind !== 'statement';
}

export function isEmpty(value: FormAnswer | undefined) {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
}

export function scaleRange(question: FormQuestion) {
  const min = Number.isFinite(question.scaleMin) ? Number(question.scaleMin) : 0;
  const max = Number.isFinite(question.scaleMax) ? Number(question.scaleMax) : 10;
  const lo = Math.max(0, Math.min(min, 10));
  const hi = Math.max(lo + 1, Math.min(max, 10));
  return Array.from({ length: hi - lo + 1 }, (_, index) => lo + index);
}

/** Valida uma resposta antes de avançar; devolve a mensagem de erro ou vazio. */
export function validateAnswer(question: FormQuestion, value: FormAnswer | undefined) {
  if (!isAnswerable(question)) return '';
  if (isEmpty(value)) return question.required ? 'Esta pergunta é obrigatória.' : '';
  if (question.kind === 'email' && typeof value === 'string' && !EMAIL_RE.test(value.trim())) return 'Confira o e-mail: ele precisa ter o formato nome@provedor.com, sem espaços nem acentos.';
  if (question.kind === 'phone' && typeof value === 'string') {
    const { ddd, numero } = phoneParts(value);
    if (!/^[1-9][1-9]$/.test(ddd)) return 'Confira o DDD: são 2 números, sem o zero.';
    if (!(numero.length === 8 || (numero.length === 9 && numero.startsWith('9')))) return 'Confira o número: 9 dígitos para celular (começa com 9) ou 8 para fixo.';
  }
  const mask = maskOf(question);
  if (mask && typeof value === 'string') {
    if (mask === 'cpf' && !cpfValido(value)) return 'Confira o CPF: são 11 números.';
    if (mask === 'cnpj' && !cnpjValido(value)) return 'Confira o CNPJ: são 14 números.';
    if (mask === 'cep' && digitos(value).length !== 8) return 'Confira o CEP: são 8 números.';
    if (mask === 'money' && !digitos(value).replace(/^0+/, '')) return 'Informe o valor.';
    if (mask === 'pix_aleatoria' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) return 'Confira a chave aleatória: são 32 letras e números, no formato que o banco mostra.';
  }
  return '';
}

export const FILE_ACCEPT = { any: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,video/*,audio/*', images_pdf: 'image/*,application/pdf' } as const;
export const FILE_HINT = { any: 'Foto, PDF, documento, áudio ou vídeo · até 25 MB', images_pdf: 'PDF ou imagem · até 25 MB' } as const;

export function fileLabel(value: string) {
  if (/^https?:\/\//.test(value)) return 'Arquivo enviado (link)';
  const last = value.split('/').pop() || value;
  return last.replace(/^\d{10,}-/, '');
}

export function formatAnswer(question: FormQuestion, value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  if (question.kind === 'file' && typeof value === 'string') return fileLabel(value);
  if (Array.isArray(value)) return value.join(', ');
  if (question.kind === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  return String(value);
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** Texto com marcação simples: **negrito**, *itálico*, __sublinhado__, links e [links com nome](https://...). Escapa o HTML antes de aplicar. */
export function richTextHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
    // Links digitados viram clicáveis (abrem em nova aba). Com nome: [texto](https://...).
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s<)]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, (_, label?: string, href?: string, bare?: string) => `<a href="${href || bare}" target="_blank" rel="noopener noreferrer">${label || bare}</a>`);
}

export function stripRichText(value: string) {
  return value.replace(/\*\*([^*\n]+?)\*\*/g, '$1').replace(/__([^_\n]+?)__/g, '$1').replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1$2');
}

/** Próxima pergunta, respeitando a lógica condicional da atual. Devolve -1 para encerrar. */
export function nextQuestionIndex(questions: FormQuestion[], index: number, answer: FormAnswer | undefined, answers: Record<string, FormAnswer | undefined> = {}) {
  const current = questions[index];
  const rule = current?.logic?.find((item) => item.goTo && (Array.isArray(answer) ? answer.includes(item.when) : String(answer ?? '') === item.when));
  let next = index + 1;
  if (rule) {
    if (rule.goTo === END_OF_FORM) return -1;
    const target = questions.findIndex((question) => question.id === rule.goTo);
    if (target > index) next = target;
  }
  // Pula as perguntas condicionadas a outra resposta que não bate.
  const todas = { ...answers, [current?.id ?? '']: answer };
  while (next < questions.length && !visivel(questions[next], todas)) next += 1;
  return next < questions.length ? next : -1;
}

export function choiceOptions(question: FormQuestion) {
  return question.kind === 'yes_no' ? ['Sim', 'Não'] : question.kind === 'single_choice' ? (question.options || []).filter((option) => option.trim()) : [];
}
