import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib';
import { Tabela, dataBr, type Coluna } from './AdminTabela';
import { recursoAusente, type PerfilParceiro } from './RedeExtras';

type Partner = { id: string; nome: string };
const vazio = (id: string): PerfilParceiro => ({ partner_id: id, logo_original_url: null, descricao: '', whatsapp: '', email: '', instagram: '', linkedin: '' });

export function AdminRedeExtras({ parceiros, uploadOriginal }: { parceiros: Partner[]; uploadOriginal: (file: File) => Promise<string> }) {
  const [perfis, setPerfis] = useState<PerfilParceiro[]>([]);
  const [ativo, setAtivo] = useState(false);
  const [beneficiosAtivos, setBeneficiosAtivos] = useState(false);
  const [form, setForm] = useState<PerfilParceiro | null>(null);
  const [logo, setLogo] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [nota, setNota] = useState('');
  const [erro, setErro] = useState('');
  const carregar = async () => {
    const { data, error } = await supabase.from('communicali_partner_profiles').select('*');
    if (recursoAusente(error)) return;
    setAtivo(true);
    if (error) setErro('Não foi possível carregar os perfis das empresas.');
    else {
      setPerfis((data || []) as PerfilParceiro[]);
      const campos = await supabase.from('communicali_partner_profiles').select('beneficio,desconto,beneficio_detalhes,cupom').limit(0);
      setBeneficiosAtivos(!campos.error);
    }
  };
  useEffect(() => { void carregar(); }, []);
  const editar = (id: string) => { setForm(perfis.find((p) => p.partner_id === id) || vazio(id)); setLogo(undefined); setNota(''); setErro(''); };
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    setBusy(true); setNota(''); setErro('');
    try {
      const logo_original_url = logo ? await uploadOriginal(logo) : form.logo_original_url;
      const { beneficio, desconto, beneficio_detalhes, cupom, ...base } = form;
      const atualizado = { ...base, logo_original_url, ...(beneficiosAtivos ? { beneficio: beneficio?.trim() || null, desconto: desconto?.trim() || null, beneficio_detalhes: beneficio_detalhes?.trim() || null, cupom: cupom?.trim() || null } : {}) };
      const { error } = await supabase.from('communicali_partner_profiles').upsert(atualizado, { onConflict: 'partner_id' });
      if (error) throw error;
      setForm(atualizado); setLogo(undefined); await carregar(); setNota('Perfil da empresa salvo.');
    } catch { setErro('Não foi possível salvar. Confira os campos e tente novamente.'); }
    finally { setBusy(false); }
  }
  const colunas: Array<Coluna<Partner>> = [
    { id: 'nome', titulo: 'Empresa', valor: (p) => p.nome },
    { id: 'descricao', titulo: 'Apresentação', valor: (p) => perfis.find((x) => x.partner_id === p.id)?.descricao || 'Não informada', longo: true },
    { id: 'logo', titulo: 'Logo original', valor: (p) => perfis.find((x) => x.partner_id === p.id)?.logo_original_url ? 'Enviado' : 'Pendente' },
    { id: 'editar', titulo: 'Ações', valor: () => '', render: (p) => <button type="button" className="wf-secondary" disabled={busy} onClick={() => editar(p.id)}>Editar perfil</button> },
  ];
  // Sem a atualização de banco, o cadastro já existente continua funcionando.
  if (!ativo) return null;
  return <>
    <section className="v2-forms-card"><header><small>REDE</small><h2>Perfis das empresas</h2><p>Descrição, contatos e logo original. A faixa do site mantém a versão branca já cadastrada.</p></header>
      <Tabela colunas={colunas} linhas={parceiros} chave={(p) => p.id} vazio="Cadastre uma empresa para editar o perfil na Rede." />
      {form && <form className="v2-forms-grid" onSubmit={(event) => void salvar(event)}>
        <h3 className="wide">{parceiros.find((p) => p.id === form.partner_id)?.nome}</h3>
        <label className="wide"><span>Apresentação da empresa</span><textarea rows={3} maxLength={800} disabled={busy} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label>
        <label><span>Logo original para a Rede</span><input type="file" disabled={busy} accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setLogo(e.target.files?.[0])} /></label>
        {form.logo_original_url && <img src={form.logo_original_url} alt="Logo original cadastrado" style={{ maxWidth: 100, maxHeight: 70, objectFit: 'contain' }} />}
        {(['whatsapp', 'email', 'instagram', 'linkedin'] as const).map((campo) => <label key={campo}><span>{{ whatsapp: 'WhatsApp com DDD', email: 'E-mail', instagram: 'Instagram', linkedin: 'LinkedIn' }[campo]}</span><input type={campo === 'email' ? 'email' : 'text'} disabled={busy} maxLength={campo === 'whatsapp' ? 40 : 300} value={form[campo] || ''} onChange={(e) => setForm({ ...form, [campo]: e.target.value })} /></label>)}
        {beneficiosAtivos ? <fieldset className="wide adm-beneficio">
          <legend>Vantagem confirmada para a comunidade</legend>
          <p>Preencha somente o que foi combinado com a empresa. Campos vazios não aparecem na Rede.</p>
          <label><span>Benefício</span><input maxLength={120} disabled={busy} value={form.beneficio || ''} onChange={(e) => setForm({ ...form, beneficio: e.target.value })} /></label>
          <label><span>Desconto ou condição especial</span><input maxLength={40} placeholder="Ex.: 10% de desconto" disabled={busy} value={form.desconto || ''} onChange={(e) => setForm({ ...form, desconto: e.target.value })} /></label>
          <label><span>Detalhes, validade e condições de uso</span><textarea rows={3} maxLength={1000} disabled={busy} value={form.beneficio_detalhes || ''} onChange={(e) => setForm({ ...form, beneficio_detalhes: e.target.value })} /></label>
          <label><span>Cupom combinado com a empresa</span><input maxLength={60} disabled={busy} value={form.cupom || ''} onChange={(e) => setForm({ ...form, cupom: e.target.value })} /></label>
        </fieldset> : <p className="wide">O cadastro de benefícios aguarda atualização.</p>}
        <div className="adm-submit"><button type="submit" className="wf-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil na Rede'}</button><button type="button" className="wf-secondary" disabled={busy} onClick={() => setForm(null)}>Fechar</button></div>
      </form>}
      {nota && <p className="inline-notice" role="status">{nota}</p>}{erro && <p className="inline-notice" role="alert">{erro}</p>}
    </section>
    <FeedbackModeracao />
  </>;
}

type Avaliacao = { id: string; estrelas: number; comentario: string; status: string; created_at: string; updated_at: string; autor: { nome: string } | null; perfil: { nome: string } | null };
function FeedbackModeracao() {
  const [lista, setLista] = useState<Avaliacao[]>([]);
  const [busy, setBusy] = useState(false);
  const [ocultar, setOcultar] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const carregar = async () => {
    const { data, error } = await supabase.from('communicali_feedback').select('id,estrelas,comentario,status,created_at,updated_at,autor:members!autor_id(nome),perfil:members!perfil_id(nome)').order('created_at', { ascending: false }).limit(200);
    if (error) setErro('Não foi possível carregar os comentários para revisão.');
    else setLista((data || []) as unknown as Avaliacao[]);
  };
  useEffect(() => { void carregar(); }, []);
  async function moderar(id: string, status: 'aprovado' | 'oculto') {
    if (busy) return;
    setBusy(true); setErro('');
    try {
      const { error } = await supabase.rpc('communicali_feedback_moderar', { p_id: id, p_status: status, p_motivo: status === 'oculto' ? motivo.trim() : null, p_updated_at: lista.find((item) => item.id === id)?.updated_at });
      if (error) throw error;
      setOcultar(''); setMotivo(''); await carregar();
    } catch { setErro('Não foi possível registrar a decisão. Atualize a lista para conferir o comentário.'); }
    finally { setBusy(false); }
  }
  const colunas: Array<Coluna<Avaliacao>> = [
    { id: 'data', titulo: 'Data', valor: (a) => a.created_at, render: (a) => dataBr(a.created_at) },
    { id: 'autor', titulo: 'Autor', valor: (a) => a.autor?.nome || '' },
    { id: 'perfil', titulo: 'Perfil avaliado', valor: (a) => a.perfil?.nome || '' },
    { id: 'estrelas', titulo: 'Estrelas', valor: (a) => a.estrelas },
    { id: 'comentario', titulo: 'Comentário', valor: (a) => a.comentario, longo: true },
    { id: 'status', titulo: 'Situação', valor: (a) => ({ pendente: 'Aguardando revisão', aprovado: 'Publicado', oculto: 'Não publicado' }[a.status] || a.status) },
    { id: 'acoes', titulo: 'Decisão', valor: () => '', render: (a) => <>{a.status !== 'aprovado' && <button type="button" className="wf-secondary" disabled={busy} onClick={() => void moderar(a.id, 'aprovado')}>Aprovar</button>}{a.status !== 'oculto' && <button type="button" className="wf-secondary" disabled={busy} onClick={() => { setOcultar(a.id); setMotivo(''); }}>Não publicar</button>}</> },
  ];
  return <section className="v2-forms-card"><header><small>COMENTÁRIOS</small><h2>Revisão da CALI</h2><p>Só comentários aprovados aparecem nos perfis, com nome do autor e sem foto.</p></header>
    <button type="button" className="wf-secondary" disabled={busy} onClick={() => void carregar()}>Atualizar comentários</button>
    <Tabela colunas={colunas} linhas={lista} chave={(a) => a.id} filtros={[{ id: 'status', titulo: 'Situação', valor: (a) => a.status }]} inicial={{ id: 'data', desc: true }} vazio="Nenhum comentário recebido." />
    {ocultar && <form className="v2-forms-grid" onSubmit={(e) => { e.preventDefault(); void moderar(ocultar, 'oculto'); }}><label className="wide"><span>Motivo para não publicar</span><textarea required minLength={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={busy} /></label><div className="adm-submit"><button type="submit" className="wf-primary" disabled={busy}>Registrar decisão</button><button type="button" className="wf-secondary" onClick={() => setOcultar('')} disabled={busy}>Cancelar</button></div></form>}
    {erro && <p className="inline-notice" role="alert">{erro}</p>}
  </section>;
}
