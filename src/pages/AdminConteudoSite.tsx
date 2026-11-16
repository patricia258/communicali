import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import campos from '../lib/conteudoHome.json';

const secoes: Record<string, string> = { abertura: 'Abertura', comunidade: 'A comunidade', manifesto: 'Manifesto', selos: 'Selos', programa: 'Sua jornada', agenda: 'Agenda', embaixadores: 'Embaixadores', 'como-entrar': 'Como entrar', edicoes: 'Edições passadas', parceiros: 'Parceiros', perguntas: 'Perguntas frequentes', outros: 'Outros textos' };
const imagemValida = (s: string) => { try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password && !/["\\\n\r]/.test(s); } catch { return false; } };

export function AdminConteudoSite() {
  const [secao, setSecao] = useState('abertura');
  const [dados, setDados] = useState<Record<string, string>>({});
  const [versao, setVersao] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [publicadoEm, setPublicadoEm] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([supabase.from('site_content_drafts').select('conteudo,versao').eq('id', 'home').single(), supabase.from('site_content_published').select('updated_at').eq('id', 'home').maybeSingle()]).then(([r, p]) => {
      if (r.error) { setAviso('Não foi possível carregar o conteúdo do site.'); return; }
      setDados(r.data.conteudo || {}); setVersao(r.data.versao); setPublicadoEm(p.data?.updated_at || null);
    });
  }, []);
  useEffect(() => {
    const sair = (e: BeforeUnloadEvent) => { if (sujo) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', sair); return () => window.removeEventListener('beforeunload', sair);
  }, [sujo]);
  async function salvar(publicar: boolean) {
    if (versao === null) return;
    for (const campo of campos) {
      const valor = dados[campo.id];
      if (campo.tipo === 'imagem' && valor && !imagemValida(valor)) { setSecao(campo.secao); setAviso('Use um endereço HTTPS válido para a imagem.'); return; }
    }
    setOcupado(true); setAviso('');
    try {
      const limpo = Object.fromEntries(Object.entries(dados).map(([k,v]) => [k,v.trim()]).filter(([,v]) => v));
      const { data, error } = await supabase.from('site_content_drafts').update({ conteudo: limpo }).eq('id', 'home').eq('versao', versao).select('versao').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Outra pessoa atualizou o conteúdo. Recarregue a página antes de salvar.');
      setVersao(data.versao); setSujo(false);
      if (publicar) {
        const { error: falha } = await supabase.rpc('publish_site_home', { p_versao: data.versao });
        if (falha) throw falha;
        setPublicadoEm(new Date().toISOString()); setAviso('Conteúdo publicado. Abra ou atualize o site para conferir.');
      } else setAviso('Rascunho salvo. O site recebe as alterações quando você clicar em Publicar no site.');
    } catch (e) { setAviso(e instanceof Error ? e.message : 'Não foi possível concluir. O rascunho permanece na tela.'); }
    finally { setOcupado(false); }
  }
  const grupos = [...new Set(campos.map(c => c.secao))];
  return <>
    <div className="wf-head"><div><small>SITE · CONTEÚDO</small><h1>Home e páginas</h1><p>Edite os textos por seção. Salve um rascunho ou publique as alterações na home.</p></div><div className="v2-head-actions"><button className="wf-secondary" disabled={ocupado || versao === null} onClick={() => void salvar(false)}>Salvar rascunho</button><button className="wf-primary" disabled={ocupado || versao === null} onClick={() => void salvar(true)}>{ocupado ? 'Aguarde…' : 'Publicar no site'}</button></div></div>
    <details className="adm-ajuda"><summary>Orientações</summary><p>{publicadoEm ? `Última publicação: ${new Date(publicadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Brasília.` : 'O site está usando os textos aprovados.'} {sujo && 'Há alterações ainda não salvas.'} <a href="/" target="_blank" rel="noopener noreferrer">Ver site</a></p></details>
    <nav className="adm-conteudo-abas" aria-label="Seções da home">{grupos.map(g => <button type="button" key={g} aria-pressed={g===secao} className={g===secao ? 'wf-primary' : 'wf-secondary'} onClick={() => setSecao(g)}>{secoes[g] || g}</button>)}</nav>
    <section className="v2-forms-card"><header><h2>{secoes[secao] || secao}</h2></header><div className="v2-forms-grid">{campos.filter(c => c.secao === secao).map(campo => <label key={campo.id} className="wide"><span>{'rotulo' in campo ? String(campo.rotulo) : campo.padrao.length > 85 ? campo.padrao.slice(0,82)+'…' : campo.padrao}</span>{campo.tipo==='imagem' ? <input type="url" maxLength={2048} value={dados[campo.id] || ''} placeholder="https://…" disabled={versao===null || ocupado} onChange={e => { setDados({...dados,[campo.id]:e.target.value});setSujo(true); }} /> : <textarea rows={campo.padrao.length > 160 ? 5 : 2} maxLength={5000} disabled={versao===null || ocupado} value={dados[campo.id] ?? campo.padrao} onChange={e => { setDados({...dados,[campo.id]:e.target.value});setSujo(true); }} />}<small>Deixe em branco para usar o conteúdo aprovado.</small></label>)}</div></section>
    {aviso && <p className="inline-notice" role="status">{aviso}</p>}
  </>;
}
