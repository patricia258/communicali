/* Dia do encontro: tudo o que roda ao vivo num lugar só, no começo da edição. Telão de boas-vindas, votação, dinâmica de palavras e pesquisa de satisfação. */
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { PlanilhaDaEdicao } from '../forms/AdminFormsPage';
import { PainelDinamica } from '../dinamica/PainelDinamica';
import { chamar } from './AdminEmails';

type Edicao = { id: string; slug: string; titulo: string; data_evento: string; form_pesquisa?: string | null; pesquisa_auto?: boolean };

/** Se esta seção falhar, o resto da edição continua funcionando. */
class Isolada extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };
  static getDerivedStateFromError() { return { falhou: true }; }
  render() {
    if (!this.state.falhou) return this.props.children;
    return <section className="v2-forms-card" id="secao-dia"><p className="adm-hint">Não foi possível abrir o Dia do encontro. Recarregue a página; o restante da edição segue normal.</p></section>;
  }
}

export function DiaDoEncontro(props: { edition: Edicao }) { return <Isolada><DiaDoEncontroInterno {...props} /></Isolada>; }

function DiaDoEncontroInterno({ edition }: { edition: Edicao }) {
  const sufixo = edition.slug === 'fundadora' ? '' : `?edicao=${edition.slug}`;
  const ev = (caminho: string) => `${window.location.origin}${caminho}${sufixo}`;
  const [copiado, setCopiado] = useState('');
  const [auto, setAuto] = useState(edition.pesquisa_auto !== false);
  const [numeros, setNumeros] = useState({ checkins: 0, enviados: 0, respostas: 0 });
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const avisar = (texto: string) => { setAviso(texto); window.setTimeout(() => setAviso(''), 5000); };
  const copiar = (rotulo: string, link: string) => { void navigator.clipboard.writeText(link); setCopiado(rotulo); window.setTimeout(() => setCopiado(''), 2000); };

  const contar = useCallback(async () => {
    const [checkins, enviados] = await Promise.all([
      supabase.from('checkins').select('id', { count: 'exact', head: true }).eq('edition_id', edition.id),
      supabase.from('email_log').select('id', { count: 'exact', head: true }).eq('edition_id', edition.id).eq('tipo', 'pesquisa').eq('situacao', 'enviado'),
    ]);
    let respostas = 0;
    if (edition.form_pesquisa) {
      const { data: form } = await supabase.from('forms').select('id').eq('slug', edition.form_pesquisa).maybeSingle();
      if (form) { const r = await supabase.from('form_responses').select('id', { count: 'exact', head: true }).eq('form_id', form.id); respostas = r.count || 0; }
    }
    setNumeros({ checkins: checkins.count || 0, enviados: enviados.count || 0, respostas });
  }, [edition.id, edition.form_pesquisa]);
  useEffect(() => { void contar(); const timer = window.setInterval(contar, 15000); return () => window.clearInterval(timer); }, [contar]);

  async function mudarAuto() {
    const novo = !auto; setAuto(novo);
    const { error } = await supabase.from('editions').update({ pesquisa_auto: novo }).eq('id', edition.id);
    if (error) { setAuto(!novo); avisar('Não foi possível salvar.'); } else avisar(novo ? 'Envio automático ligado: sai às 14h do dia do encontro.' : 'Envio automático desligado.');
  }
  async function enviar(modo: 'teste' | 'agora') {
    if (modo === 'agora' && !window.confirm(`Enviar a pesquisa agora para as ${numeros.checkins} pessoas que fizeram check-in? Quem já recebeu não recebe de novo.`)) return;
    setBusy(true);
    try {
      const resposta = await chamar({ acao: 'pesquisa', edicao: edition.id, modo });
      avisar(modo === 'teste' ? `Teste enviado para ${resposta.para}.` : `${resposta.enviados} ${resposta.enviados === 1 ? 'e-mail enviado' : 'e-mails enviados'}${resposta.restantes ? `. Faltam ${resposta.restantes}: clique de novo.` : '.'}`);
    } catch (erro) { avisar((erro as Error).message); }
    setBusy(false); void contar();
  }
  const dia = edition.data_evento.split('-').reverse().slice(0, 2).join('/');

  return (
    <section className="v2-forms-card" id="secao-dia">
      <header className="adm-secao__topo"><div><small>DIA DO ENCONTRO</small><h2>Telas e controles ao vivo</h2></div></header>
      <p className="adm-hint adm-hint--antes">Tudo o que roda durante o encontro fica aqui, no mesmo visual. Abra cada telão numa janela e arraste para o projetor; no telão, a tecla F abre a tela cheia.</p>
      <div className="dia-grid">
        <article className="dia-bloco">
          <h3>Boas-vindas e check-in</h3>
          <p>O telão recebe as pessoas e mostra o QR Code do check-in.</p>
          <div className="adm-links">
            <a className="wf-primary" href={ev('/telao/checkin')} target="_blank" rel="noopener noreferrer">Abrir telão</a>
            <button type="button" className="wf-secondary" onClick={() => copiar('checkin', ev('/checkin'))}>{copiado === 'checkin' ? 'Link copiado' : 'Copiar link do check-in'}</button>
          </div>
        </article>
        <article className="dia-bloco">
          <h3>Votação</h3>
          <p>As duas notas de 0 a 10, com o resultado ao vivo.</p>
          <div className="adm-links">
            <a className="wf-primary" href={ev('/telao/resultado')} target="_blank" rel="noopener noreferrer">Abrir telão</a>
            <a className="wf-secondary" href={ev('/votar')} target="_blank" rel="noopener noreferrer">Ver como o público vota</a>
            <button type="button" className="wf-secondary" onClick={() => document.getElementById('secao-votacao')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Perguntas e controles</button>
          </div>
        </article>
        <article className="dia-bloco">
          <h3>Pesquisa de satisfação</h3>
          <p>Sai sozinha às 14h de {dia}, para quem fez check-in.</p>
          <label className="dia-chave"><input type="checkbox" checked={auto} onChange={() => void mudarAuto()} /><span>Envio automático às 14h</span></label>
          <p className="dia-numeros"><b>{numeros.checkins}</b> check-ins · <b>{numeros.enviados}</b> e-mails enviados · <b>{numeros.respostas}</b> respostas</p>
          <div className="adm-links">
            <a className="wf-secondary" href={`/f/${edition.form_pesquisa || ''}`} target="_blank" rel="noopener noreferrer">Ver a pesquisa</a>
            <button type="button" className="wf-secondary" disabled={busy} onClick={() => void enviar('teste')}>Enviar teste para mim</button>
            <button type="button" className="wf-secondary" disabled={busy || !numeros.checkins} onClick={() => void enviar('agora')}>Enviar agora</button>
          </div>
        </article>
      </div>
      <article className="dia-bloco dia-bloco--largo">
        <h3>Dinâmica de palavras</h3>
        <PainelDinamica edition={edition} />
      </article>
      {edition.form_pesquisa && numeros.respostas > 0 && (
        <details className="adm-suspensa"><summary>Respostas da pesquisa de satisfação ({numeros.respostas})</summary><PlanilhaDaEdicao slug={edition.form_pesquisa} /></details>
      )}
      {aviso && <div className="v2-forms-toast" role="status">{aviso}</div>}
    </section>
  );
}
