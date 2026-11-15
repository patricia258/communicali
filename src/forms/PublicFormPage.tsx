/* CALI Forms — página pública (/f/:slug): uma pergunta por tela, no estilo Typeform, com a identidade CALI.
   Sem login. Lê e envia pelas funções públicas cali_form_public e cali_form_submit. */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, Check, CornerDownLeft, Paperclip, X } from 'lucide-react';
import { anonPublicRpc, anonStorage, supabase } from '../lib/supabase';
import { type FormAnswer, type FormQuestion, applyMask, FILE_ACCEPT, FILE_HINT, fileLabel, isAnswerable, joinPhone, MASK_PLACEHOLDER, maskOf, nextQuestionIndex, phoneParts, richTextHtml, scaleRange, validateAnswer, visivel, comRespostas } from './formModel';
import { FooterLinks } from '../components/SiteFooter';
import './public-form.css';

type PublicForm = { id: string; aviso?: string | null; submit_label?: string | null; success_text?: string | null; slug: string; title: string; category?: string; description: string; thank_you: string; status: 'open' | 'closed'; confirm_email: boolean; questions: FormQuestion[] };
type Phase = 'loading' | 'missing' | 'closed' | 'welcome' | 'questions' | 'sending' | 'done';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Cadastro, check-in e indicação usam este mesmo fluxo, com perguntas fixas e envio próprio. */
export type FormPreset = {
  title: string;
  category?: string;
  /** 'claro': marfim com bordô, no visual das telas do encontro. */
  tema?: 'claro';
  description?: string;
  /** Cartão de destaque na abertura (aceita **negrito**, *itálico* e ==destaque==). */
  aviso?: string;
  questions: FormQuestion[];
  submitLabel?: string;
  successText?: string;
  skipWelcome?: boolean;
  /** Devolve a mensagem de erro, ou vazio quando deu certo. */
  submit: (answers: Record<string, FormAnswer>) => Promise<string>;
  /** Ao avançar de uma pergunta, pode buscar dados e devolver respostas para preencher (ex.: cadastro anterior). */
  onAdvance?: (questionId: string, answers: Record<string, FormAnswer>) => Promise<Record<string, FormAnswer> | null>;
};

export function PublicFormPage({ preset, slugFixo }: { preset?: FormPreset; slugFixo?: string }) {
  const { slug: slugRota = '' } = useParams();
  const slug = slugFixo ?? slugRota;
  const preview = useSearchParams()[0].get('previa') === '1';
  const [form, setForm] = useState<PublicForm | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [trail, setTrail] = useState<number[]>([]);
  const [uploads, setUploads] = useState<Record<string, { busy: boolean; name: string; preview?: string; error?: string }>>({});
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const advanceTimer = useRef<number>();

  useEffect(() => {
    document.title = 'ComuniCALI';
    if (preset) {
      setForm({ id: 'preset', slug: 'preset', title: preset.title, category: preset.category, description: preset.description || '', aviso: preset.aviso, thank_you: '', status: 'open', confirm_email: false, questions: preset.questions, submit_label: preset.submitLabel, success_text: preset.successText });
      setPhase(preset.skipWelcome ? 'questions' : 'welcome');
      return;
    }
    let alive = true;
    void anonPublicRpc<PublicForm | null>('cali_form_public', { p_slug: slug }).then(async ({ data: published }) => {
      let data = published;
      // Prévia da administradora: lê também rascunho e encerrado (só funciona com a sessão dela; RLS barra os demais).
      if (preview && supabase) {
        const own = await supabase.from('forms').select('id,slug,title,description,thank_you,status,confirm_email,category,submit_label,success_text,questions,aviso').eq('slug', slug.toLowerCase()).maybeSingle();
        if (own.data) data = { ...(own.data as PublicForm), status: 'open' };
      }
      if (!alive) return;
      if (!data) { setPhase('missing'); return; }
      setForm(data); document.title = `${data.title} · ComuniCALI`;
      setPhase(data.status === 'open' ? 'welcome' : 'closed');
    });
    return () => { alive = false; };
  }, [slug, preview]);

  const questions = useMemo(() => form?.questions ?? [], [form]);
  const answerable = useMemo(() => questions.filter(isAnswerable), [questions]);
  // Na abertura, conta só o caminho básico: perguntas condicionadas a uma resposta não entram na estimativa.
  const basicas = useMemo(() => { let total = 0; let i = questions.length ? 0 : -1; while (i >= 0) { if (isAnswerable(questions[i])) total += 1; i = nextQuestionIndex(questions, i, undefined, {}); } return total; }, [questions]);
  const question = questions[index];
  const progress = phase === 'done' ? 100 : phase === 'questions' && questions.length ? Math.round((index / questions.length) * 100) : 0;
  const caminho = useMemo(() => { const lista: FormQuestion[] = []; let i = questions.length ? 0 : -1; while (i >= 0) { if (isAnswerable(questions[i])) lista.push(questions[i]); i = nextQuestionIndex(questions, i, answers[questions[i].id], answers); } return lista; }, [questions, answers]);
  const numberOf = (target: FormQuestion) => (caminho.includes(target) ? caminho.indexOf(target) : answerable.indexOf(target)) + 1;

  useEffect(() => {
    if (phase !== 'questions') return;
    document.querySelector('.cali-form-page .cf-stage')?.scrollTo({ top: 0 });
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 380);
    return () => window.clearTimeout(timer);
  }, [index, phase]);

  const submit = useCallback(async () => {
    if (!form) return;
    if (preview) { setConfirmation(false); setPhase('done'); return; }
    setPhase('sending'); setSendError('');
    const visited = [...trail, index].map((position) => questions[position]?.id).filter(Boolean) as string[];
    const sent: Record<string, unknown> = Object.fromEntries(Object.entries(answers).filter(([id]) => visited.includes(id) || id.startsWith('_')));
    if (preset) {
      const problem = await preset.submit(sent as Record<string, FormAnswer>);
      if (problem) { setSendError(problem); setPhase('questions'); return; }
      void fetch('/api/avisos', { method: 'POST' }).catch(() => null);
      if (preset.successText) setPhase('done');
      return;
    }
    sent.__visited = visited;
    const { data, error: rpcError } = await anonPublicRpc<{ ok: boolean; confirmation: boolean }>('cali_form_submit', { p_slug: form.slug, p_answers: sent });
    if (rpcError || !data?.ok) { setSendError(rpcError?.message || 'Não foi possível enviar agora.'); setPhase('questions'); return; }
    setConfirmation(Boolean(data.confirmation)); setPhase('done');
    void fetch('/api/avisos', { method: 'POST' }).catch(() => null);
    // Se a edição está em lista de espera, quem acabou de entrar recebe o aviso por e-mail (o servidor confere e envia uma vez só).
    const perguntaEmail = questions.find((item) => item.kind === 'email');
    const emailInformado = perguntaEmail ? sent[perguntaEmail.id] : null;
    if (typeof emailInformado === 'string' && emailInformado.includes('@')) void fetch('/api/email-confirmacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ form: form.slug, email: emailInformado }) }).catch(() => null);
  }, [answers, form, preset, preview, trail, index, questions]);

  const [buscando, setBuscando] = useState(false);
  const goNext = useCallback(async () => {
    if (!question || buscando) return;
    const problem = validateAnswer(question, answers[question.id]);
    if (problem) { setError(problem); return; }
    if (uploads[question.id]?.busy) { setError('Aguarde terminar o envio do arquivo.'); return; }
    setError('');
    if (maskOf(question) === 'cep') preencherPeloCep(String(answers[question.id] || ''), index);
    let atuais = answers;
    if (preset?.onAdvance) {
      setBuscando(true);
      const extra = await preset.onAdvance(question.id, answers).catch(() => null);
      setBuscando(false);
      if (extra) { atuais = { ...answers, ...extra }; setAnswers(atuais); }
    }
    const next = nextQuestionIndex(questions, index, atuais[question.id], atuais);
    if (next < 0) { void submit(); return; }
    setTrail((current) => [...current, index]); setDirection('next'); setIndex(next);
  }, [answers, buscando, index, preset, question, questions, submit, uploads]);

  // Endereço pelo CEP (ViaCEP): a pessoa vê a rua, o bairro e a cidade preenchidos e pode editar.
  function preencherPeloCep(cep: string, desde: number) {
    const numeros = cep.replace(/\D/g, '');
    if (numeros.length !== 8) return;
    void fetch(`https://viacep.com.br/ws/${numeros}/json/`).then((r) => r.json()).then((dados: { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }) => {
      if (!dados || dados.erro) return;
      const seguintes = questions.slice(desde + 1).filter((item) => item.kind === 'short_text');
      const achar = (re: RegExp) => seguintes.find((item) => re.test(item.label));
      const preencher: Array<[FormQuestion | undefined, string]> = [
        [achar(/bairro/i), dados.bairro || ''],
        [achar(/endere|logradouro|\brua\b/i), [dados.logradouro, achar(/bairro/i) ? '' : dados.bairro].filter(Boolean).join(', ')],
        [achar(/cidade/i), [dados.localidade, dados.uf].filter(Boolean).join('/')],
      ];
      setAnswers((atual) => {
        const novo = { ...atual };
        for (const [item, valor] of preencher) if (item && valor && !String(novo[item.id] ?? '').trim()) novo[item.id] = valor;
        return novo;
      });
    }).catch(() => null);
  }

  const goBack = useCallback(() => {
    if (!trail.length) return;
    const previous = trail[trail.length - 1];
    setError(''); setDirection('back'); setTrail((current) => current.slice(0, -1)); setIndex(previous);
  }, [trail]);

  function setAnswer(value: FormAnswer, autoAdvance = false) {
    if (!question) return;
    // Ao mudar uma resposta, descarta as das perguntas que deixaram de valer (ex.: voltou e trocou "primeira vez").
    setAnswers((current) => {
      const novo: Record<string, FormAnswer> = { ...current, [question.id]: value };
      for (let volta = 0; volta < 3; volta += 1) {
        let mudou = false;
        for (const item of questions) if (item.showIf && novo[item.id] !== undefined && !visivel(item, novo)) { delete novo[item.id]; mudou = true; }
        if (!mudou) break;
      }
      return novo;
    });
    setError('');
    if (autoAdvance) {
      window.clearTimeout(advanceTimer.current);
      const next = nextQuestionIndex(questions, index, value, answers);
      advanceTimer.current = window.setTimeout(() => {
        if (next < 0) return;
        setTrail((current) => [...current, index]); setDirection('next'); setIndex(next);
      }, 380);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (phase === 'welcome' && event.key === 'Enter') { event.preventDefault(); setPhase('questions'); return; }
      if (phase !== 'questions' || !question) return;
      const target = event.target as HTMLElement;
      const typing = target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'checkbox');
      if (event.key === 'Enter' && !(target.tagName === 'TEXTAREA' && event.shiftKey)) {
        if (target.tagName === 'TEXTAREA' && !event.metaKey && !event.ctrlKey && event.shiftKey) return;
        event.preventDefault(); goNext(); return;
      }
      if (typing) return;
      const options = question.kind === 'single_choice' || question.kind === 'multi_choice' ? question.options ?? [] : question.kind === 'yes_no' ? ['Sim', 'Não'] : [];
      const letter = LETTERS.indexOf(event.key.toUpperCase());
      if (letter >= 0 && letter < options.length) {
        event.preventDefault();
        if (question.kind === 'multi_choice') toggleMulti(options[letter]); else setAnswer(options[letter], true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function toggleMulti(option: string) {
    const current = Array.isArray(answers[question!.id]) ? (answers[question!.id] as string[]) : [];
    setAnswer(current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
  }

  function onTextKey(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && event.shiftKey) event.stopPropagation();
  }

  const isLast = question ? nextQuestionIndex(questions, index, answers[question.id], answers) < 0 : false;

  async function chooseFile(item: FormQuestion, file: File | undefined) {
    if (!file || !form) return;
    if (file.size > 25 * 1024 * 1024) { setError('O arquivo passa de 25 MB. Envie um arquivo menor.'); return; }
    if (item.accept === 'images_pdf' && !(file.type.startsWith('image/') || file.type === 'application/pdf')) { setError('Envie um PDF ou uma imagem.'); return; }
    const thumb = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setError(''); setUploads((current) => ({ ...current, [item.id]: { busy: true, name: file.name, preview: thumb } }));
    const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80) || 'arquivo';
    const path = `${form.id}/${crypto.randomUUID()}/${Date.now()}-${safe}`;
    if (!preview) {
      const result = anonStorage ? await anonStorage.from('cali-forms').upload(path, file, { contentType: file.type || undefined, upsert: false }) : { error: { message: 'indisponível' } };
      if (result.error) { setUploads((current) => ({ ...current, [item.id]: { busy: false, name: file.name, preview: thumb, error: 'Não foi possível enviar o arquivo. Tente de novo.' } })); return; }
    }
    setUploads((current) => ({ ...current, [item.id]: { busy: false, name: file.name, preview: thumb } }));
    setAnswers((current) => ({ ...current, [item.id]: path }));
  }

  function renderInput(item: FormQuestion) {
    const value = answers[item.id];
    const text = typeof value === 'string' ? value : value === undefined ? '' : String(value);
    switch (item.kind) {
      case 'statement': return null;
      case 'long_text':
        return <textarea ref={(node) => { inputRef.current = node; }} className="cf-text cf-long" rows={3} value={text} maxLength={5000} placeholder="Digite sua resposta aqui…" onKeyDown={onTextKey} onChange={(event) => setAnswer(event.target.value)} />;
      case 'single_choice': case 'multi_choice': case 'yes_no': {
        const options = item.kind === 'yes_no' ? ['Sim', 'Não'] : item.options ?? [];
        const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
        return <div className={`cf-options${item.kind === 'yes_no' ? ' cf-options-row' : ''}`} role={item.kind === 'multi_choice' ? 'group' : 'radiogroup'}>
          {item.kind === 'multi_choice' && <p className="cf-hint">Escolha quantas quiser</p>}
          {options.map((option, position) => <button type="button" key={option} role={item.kind === 'multi_choice' ? 'checkbox' : 'radio'} aria-checked={selected.includes(option)} className={selected.includes(option) ? 'on' : ''} onClick={() => item.kind === 'multi_choice' ? toggleMulti(option) : setAnswer(option, true)}>
            <kbd>{LETTERS[position]}</kbd><span>{option}</span>{selected.includes(option) && <Check size={18} aria-hidden="true" />}
          </button>)}
        </div>;
      }
      case 'scale': {
        const range = scaleRange(item);
        return <div className="cf-scale-wrap"><div className="cf-scale" role="radiogroup" style={{ gridTemplateColumns: `repeat(${range.length}, minmax(0, 1fr))` }}>
          {range.map((number) => <button type="button" role="radio" aria-checked={value === number} key={number} className={value === number ? 'on' : ''} onClick={() => setAnswer(number, true)}>{number}</button>)}
        </div>{(item.minLabel || item.maxLabel) && <div className="cf-scale-labels"><span>{item.minLabel}</span><span>{item.maxLabel}</span></div>}</div>;
      }
      case 'file': {
        const state = uploads[item.id];
        const hasFile = typeof value === 'string' && value;
        return <div className="cf-file">
          {hasFile || state?.busy ? <div className={`cf-file-chosen${state?.busy ? ' busy' : ''}`}>
            {state?.preview ? <img src={state.preview} alt="" /> : <span className="cf-file-icon"><Paperclip size={20} /></span>}
            <span><strong>{state?.name || fileLabel(String(value))}</strong><small>{state?.busy ? 'Enviando…' : 'Arquivo pronto'}</small></span>
            {!state?.busy && <button type="button" aria-label="Remover arquivo" onClick={() => { setAnswers((current) => { const next = { ...current }; delete next[item.id]; return next; }); setUploads((current) => { const next = { ...current }; delete next[item.id]; return next; }); }}><X size={16} /></button>}
          </div> : <label className="cf-file-drop">
            <input type="file" accept={FILE_ACCEPT[item.accept || 'any']} onChange={(event) => void chooseFile(item, event.target.files?.[0])} />
            <Paperclip size={22} /><strong>Escolher arquivo</strong><small>{FILE_HINT[item.accept || 'any']}</small>
          </label>}
          {state?.error && <p className="cf-error" role="alert">{state.error}</p>}
        </div>;
      }
      case 'date':
        return <input ref={(node) => { inputRef.current = node; }} className="cf-text" type="date" value={text} onChange={(event) => setAnswer(event.target.value)} />;
      case 'number':
        return <input ref={(node) => { inputRef.current = node; }} className="cf-text" inputMode="decimal" value={text} placeholder="Digite um número" onChange={(event) => { const raw = event.target.value.replace(',', '.'); setAnswer(raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : event.target.value); }} />;
      case 'phone': {
        // DDD separado do número, só dígitos e no tamanho máximo de um telefone do Brasil.
        const { ddd, numero } = phoneParts(text);
        return <div className="cf-phone">
          <label><small>DDD</small><input ref={(node) => { inputRef.current = node; }} className="cf-text cf-ddd" type="tel" inputMode="numeric" autoComplete="tel-area-code" value={ddd} placeholder="41" aria-label="DDD"
            onChange={(event) => { const tudo = event.target.value.replace(/\D/g, ''); const d = tudo.slice(0, 2); setAnswer(joinPhone(d, tudo.length > 2 ? tudo.slice(2) : numero)); if (tudo.length >= 2) (event.target.closest('.cf-phone')?.querySelector('.cf-numero') as HTMLInputElement | null)?.focus(); }} /></label>
          <label><small>Número</small><input className="cf-text cf-numero" type="tel" inputMode="numeric" autoComplete="tel-local" maxLength={10} value={numero.length > 4 ? `${numero.slice(0, numero.length - 4)}-${numero.slice(-4)}` : numero} placeholder="99999-9999" aria-label="Número"
            onChange={(event) => setAnswer(joinPhone(ddd, event.target.value))} /></label>
        </div>;
      }
      default: {
        const mask = maskOf(item);
        if (mask) return <input ref={(node) => { inputRef.current = node; }} className="cf-text" type="text" inputMode={mask === 'pix_aleatoria' ? 'text' : 'numeric'} autoComplete={mask === 'cep' ? 'postal-code' : 'off'} autoCapitalize="none" spellCheck={false}
          value={text} placeholder={MASK_PLACEHOLDER[mask]} onChange={(event) => setAnswer(applyMask(mask, event.target.value))} />;
        const type = item.kind === 'email' ? 'email' : 'text';
        const auto = item.kind === 'email' ? 'email' : item.kind === 'name' ? 'name' : 'off';
        return <input ref={(node) => { inputRef.current = node; }} className="cf-text" type={type} autoComplete={auto} value={text} maxLength={item.kind === 'short_text' || item.kind === 'name' ? 300 : 200} placeholder={item.kind === 'email' ? 'nome@empresa.com' : 'Digite sua resposta aqui…'} autoCapitalize={item.kind === 'email' ? 'none' : undefined} spellCheck={item.kind === 'email' ? false : undefined} onChange={(event) => setAnswer(item.kind === 'email' ? event.target.value.replace(/\s/g, '') : event.target.value)} />;
      }
    }
  }

  const claro = true;
  return <div className={`cali-form-page${claro ? ' cf-claro' : ''}`}>
    <div className={`cf-leaf cf-leaf-${phase === 'welcome' || phase === 'loading' || phase === 'missing' || phase === 'closed' ? 'intro' : phase === 'done' ? 'done' : 'questions'}`} key={phase === 'sending' ? 'questions' : phase} aria-hidden="true" />
    <div className="cf-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
    <header className="cf-top"><a href="/"><img src={claro ? '/brand/novo/comunicali-b-fundo-claro.svg' : '/brand/novo/comunicali-b-fundo-escuro.svg'} alt="ComuniCALI" /></a>{preview && <span className="cf-preview">Prévia · as respostas não são salvas</span>}</header>
    <main className="cf-stage">
      {phase === 'loading' && <div className="cf-screen cf-center"><span className="cf-spinner" aria-label="Carregando" /></div>}
      {phase === 'missing' && <div className="cf-screen cf-center cf-enter"><small>ComuniCALI</small><h1>Formulário não encontrado</h1><p>Confira o link que você recebeu ou fale com a CALI RH.</p></div>}
      {phase === 'closed' && form && <div className="cf-screen cf-center cf-enter"><small>ComuniCALI</small><h1>{form.title}</h1><p>Este formulário não está mais recebendo respostas. Obrigada pelo interesse.</p></div>}
      {phase === 'welcome' && form && <div className="cf-screen cf-enter">
        <h1>{form.title}</h1>
        {preset && form.description && <p className="cf-desc" dangerouslySetInnerHTML={{ __html: richTextHtml(form.description) }} />}
        {form.aviso && <p className="cf-aviso" role="note" dangerouslySetInnerHTML={{ __html: richTextHtml(form.aviso) }} />}
        {!preset && form.description && <p className="cf-desc" dangerouslySetInnerHTML={{ __html: richTextHtml(form.description) }} />}
        <div className="cf-actions"><button type="button" className="cf-primary" onClick={() => setPhase('questions')}>Começar <ArrowRight size={18} /></button><span className="cf-enter-hint">ou pressione <b>Enter <CornerDownLeft size={13} /></b></span></div>
        <p className="cf-meta">{basicas} {basicas === 1 ? 'pergunta' : 'perguntas'} · cerca de {Math.max(1, Math.round(basicas * 0.4))} min</p>
      </div>}
      {(phase === 'questions' || phase === 'sending') && question && <div className={`cf-screen cf-q cf-${direction}${question.kind === 'statement' ? ' cf-statement' : ''}`} key={question.id}>
        {question.imagem && <img className="cf-foto" src={question.imagem} alt="" />}
        <div className="cf-label">
          {isAnswerable(question) && <span className="cf-num">{numberOf(question)}<ArrowRight size={14} /></span>}
          <h2>{comRespostas(question.label, answers)}{isAnswerable(question) && (question.required ? <em className="cf-req" aria-label="obrigatória">*</em> : <span className="cf-optional">Opcional</span>)}</h2>
        </div>
        {question.help && <p className="cf-help" dangerouslySetInnerHTML={{ __html: richTextHtml(comRespostas(question.help, answers)) }} />}
        {question.attachment && <a className="cf-anexo" href={question.attachment.url} target="_blank" rel="noopener noreferrer"><img src={question.attachment.cover} alt="" /><span><strong>{question.attachment.title}</strong>{question.attachment.text && <small>{question.attachment.text}</small>}<em>{question.attachment.cta || 'Abrir apresentação'} <ArrowRight size={14} /></em></span></a>}
        {renderInput(question)}
        {error && <p className="cf-error" role="alert">{error}</p>}
        {sendError && isLast && <p className="cf-error" role="alert">{sendError}</p>}
        <div className="cf-actions">
          <button type="button" className="cf-primary" disabled={phase === 'sending'} onClick={goNext}>{phase === 'sending' ? 'Enviando…' : isLast ? <>{form?.submit_label || 'Enviar'} <Check size={18} /></> : question.kind === 'statement' ? <>Continuar <ArrowRight size={18} /></> : <>OK <Check size={18} /></>}</button>
          {phase !== 'sending' && <span className="cf-enter-hint">pressione <b>Enter <CornerDownLeft size={13} /></b>{question.kind === 'long_text' && <> · <b>Shift + Enter</b> quebra linha</>}</span>}
        </div>
      </div>}
      {phase === 'done' && form && <div className="cf-screen cf-center cf-enter cf-done">
        <span className="cf-done-mark"><img src="/brand/cali-oak-mark-light.svg" alt="" /></span>
        {(() => {
          // Mensagem própria do formulário: a primeira frase curta vira o título; o resto, o texto.
          const bruto = form.success_text?.trim();
          // Uma última linha [texto](/endereço) vira um botão que abre em outra aba (ex.: da pesquisa anônima para o formulário identificado).
          const ligacao = bruto?.match(/\n?\[([^\]]+)\]\((\/[^)\s]*)\)\s*$/);
          const custom = ligacao ? bruto!.slice(0, ligacao.index).trim() : bruto;
          const botao = ligacao ? <a className="cf-primary" href={ligacao[2]} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginTop: 18 }}>{ligacao[1]} <ArrowRight size={18} /></a> : null;
          if (!custom) return <><h1>Muito obrigado!</h1><p>Recebemos suas respostas e agradecemos a colaboração.</p></>;
          const match = custom.match(/^(.{4,70}?[!.?])\s+(.+)$/s);
          const paragrafos = (texto: string) => texto.split('\n').filter((linha) => linha.trim()).map((linha, i) => <p key={i} dangerouslySetInnerHTML={{ __html: richTextHtml(linha) }} />);
          return <>{match ? <><h1>{match[1]}</h1>{paragrafos(match[2])}</> : <><h1>Muito obrigado!</h1>{paragrafos(custom)}</>}{botao}</>;
        })()}
      </div>}
    </main>
    {phase === 'questions' && questions.length > 1 && <nav className="cf-nav" aria-label="Navegar entre perguntas">
      {!preset && <span>{question && caminho.includes(question) ? caminho.indexOf(question) + 1 : index + 1} de {caminho.length}</span>}
      <button type="button" aria-label="Pergunta anterior" disabled={!trail.length} onClick={goBack}><ArrowUp size={18} /></button>
      <button type="button" aria-label="Próxima pergunta" disabled={isLast} onClick={goNext}><ArrowDown size={18} /></button>
    </nav>}
    <footer className="cf-foot"><FooterLinks legalOnly /></footer>
  </div>;
}
