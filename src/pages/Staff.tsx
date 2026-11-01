/* Staff: cadastro de quem presta serviço nos encontros. O formulário só grava; a lista com CPF e endereço fica no painel. */
import { useEffect, useMemo, useState } from 'react';
import { errorMessage, supabase } from '../lib';
import { PublicFormPage, type FormPreset } from '../forms/PublicFormPage';
import { downloadXlsx } from '../forms/formExports';

const ACEITE = 'Autorizo';

const PRESET: FormPreset = {
  title: 'Cadastro de staff',
  category: 'CommuniCALI | Café & Pessoas',
  description: 'Para quem vai trabalhar nos encontros, como fotografia, vídeo e apoio. Seus dados ficam restritos à organização.',
  submitLabel: 'Enviar cadastro',
  successText: 'Cadastro recebido! A organização vai entrar em contato com os próximos passos.',
  questions: [
    { id: 'nome', kind: 'name', label: 'Qual é o seu nome completo?', required: true },
    { id: 'cpf', kind: 'short_text', label: 'Qual é o seu CPF?', required: true },
    { id: 'email', kind: 'email', label: 'Qual é o seu e-mail?', required: true },
    { id: 'whatsapp', kind: 'phone', label: 'Qual é o seu WhatsApp com DDD?', required: true },
    { id: 'funcao', kind: 'short_text', label: 'Qual será a sua função?', help: 'Ex.: fotografia, vídeo, recepção.', required: true },
    { id: 'empresa', kind: 'short_text', label: 'Empresa, se houver' },
    { id: 'cnpj', kind: 'short_text', label: 'CNPJ, se houver' },
    { id: 'cep', kind: 'short_text', label: 'Qual é o seu CEP?' },
    { id: 'endereco', kind: 'short_text', label: 'Qual é o seu endereço completo?', help: 'Rua, número, complemento e bairro.', required: true },
    { id: 'cidade', kind: 'short_text', label: 'Em qual cidade e estado?', required: true },
    { id: 'pix', kind: 'short_text', label: 'Qual é a sua chave Pix?', help: 'Só para pagamentos combinados com a organização.' },
    { id: 'aceite', kind: 'single_choice', label: 'Uso dos dados', help: 'Autorizo a CALI RH a guardar estes dados para organizar minha participação nos encontros, conforme a [política de privacidade](https://comuni.calirh.com/privacidade).', options: [ACEITE], required: true },
  ],
  submit: async (answers) => {
    const value = (key: string) => String(answers[key] ?? '');
    const { error } = await supabase.rpc('communicali_cadastrar_staff', {
      p_nome: value('nome'), p_cpf: value('cpf'), p_email: value('email'), p_whatsapp: value('whatsapp'), p_funcao: value('funcao'), p_empresa: value('empresa'),
      p_cnpj: value('cnpj'), p_cep: value('cep'), p_endereco: value('endereco'), p_cidade: value('cidade'), p_pix: value('pix'), p_aceite: answers.aceite === ACEITE,
    });
    return error ? errorMessage(error) : '';
  },
};

export function StaffForm() {
  return <PublicFormPage preset={PRESET} />;
}

type Staff = { id: string; nome: string; cpf: string; email: string; whatsapp: string; funcao: string; empresa: string | null; cnpj: string | null; cep: string | null; endereco: string; cidade_uf: string; pix: string | null; status: string; created_at: string };

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
    downloadXlsx('communicali-staff.xlsx', 'Staff', ['Nome', 'CPF', 'Função', 'E-mail', 'WhatsApp', 'Empresa', 'CNPJ', 'CEP', 'Endereço', 'Cidade/UF', 'Pix', 'Situação'],
      visible.map((item) => [item.nome, item.cpf, item.funcao, item.email, item.whatsapp, item.empresa || '', item.cnpj || '', item.cep || '', item.endereco, item.cidade_uf, item.pix || '', item.status]));
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
              <span>{item.funcao} · {item.whatsapp}</span>
              <em>{item.status === 'ativo' ? 'Ativo' : 'Inativo'}</em>
              <button type="button" onClick={() => setOpen(open === item.id ? '' : item.id)}>{open === item.id ? 'Fechar' : 'Ver dados'}</button>
              <button type="button" onClick={() => void toggle(item)}>{item.status === 'ativo' ? 'Inativar' : 'Reativar'}</button>
              <button type="button" className="adm-danger" onClick={() => void remove(item)}>Excluir</button>
            </div>
            {open === item.id && <p className="adm-hint">CPF {item.cpf} · {item.email} · {item.endereco}, {item.cidade_uf}{item.cep ? ` · CEP ${item.cep}` : ''}{item.empresa ? ` · ${item.empresa}` : ''}{item.cnpj ? ` · CNPJ ${item.cnpj}` : ''}{item.pix ? ` · Pix ${item.pix}` : ''}</p>}
            {open !== item.id && <p className="adm-hint">CPF {maskCpf(item.cpf)}</p>}
          </div>
        ))}
        {!visible.length && <p className="adm-hint">Nenhum cadastro de staff ainda.</p>}
      </div>
    </>
  );
}
