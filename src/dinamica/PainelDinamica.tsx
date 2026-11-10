/* Painel da dinâmica ao vivo, dentro da edição: abrir e encerrar cada pergunta, o que aparece no telão, moderação e exportação. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { linkEvento, QR_COR } from './api';
import { imagemDoMural, type EstadoMural } from './Mural';

type Dinamica = { edition_id: string; status_1: string; status_2: string; modo: 'ambos' | '1' | '2'; qr: boolean; congelado_em: string | null; limite: number; pergunta_1: string; pergunta_2: string };
type Resposta = { id: number; etapa: 1 | 2; texto: string; chave: string; removida: boolean; created_at: string };
const NOMES = { 1: 'Barreiras', 2: 'Caminhos' } as const;
const STATUS_TEXTO: Record<string, string> = { aguardando: 'Ainda não aberta', aberta: 'Recebendo respostas', encerrada: 'Encerrada' };
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' });

/** Endereços da dinâmica para esta edição (o telão e a página do celular que o QR Code abre). */
export function linksDinamica(slug: string) {
  const sufixo = slug === 'fundadora' ? '' : `?edicao=${slug}`;
  return { telao: `${window.location.origin}/telao/dinamica${sufixo}`, celular: `${window.location.origin}/dinamica${sufixo}` };
}

export function PainelDinamica({ edition }: { edition: { id: string; slug: string; titulo: string } }) {
  const [din, setDin] = useState<Dinamica | null>(null);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [aviso, setAviso] = useState('');
  const [aba, setAba] = useState<1 | 2>(1);
  const links = linksDinamica(edition.slug);
  const avisar = (texto: string) => { setAviso(texto); window.setTimeout(() => setAviso(''), 3500); };

  const carregar = useCallback(async () => {
    let { data } = await supabase.from('dinamicas').select('*').eq('edition_id', edition.id).maybeSingle();
    if (!data) { await supabase.from('dinamicas').insert({ edition_id: edition.id }); ({ data } = await supabase.from('dinamicas').select('*').eq('edition_id', edition.id).maybeSingle()); }
    if (data) setDin(data as Dinamica);
    const lista = await supabase.from('dinamica_respostas').select('id,etapa,texto,chave,removida,created_at').eq('edition_id', edition.id).order('id', { ascending: false }).limit(2000);
    setRespostas((lista.data || []) as Resposta[]);
  }, [edition.id]);
  useEffect(() => { void carregar(); const timer = window.setInterval(carregar, 3000); return () => window.clearInterval(timer); }, [carregar]);

  async function mudar(parte: Partial<Dinamica>) {
    if (!din) return;
    setDin({ ...din, ...parte });
    const { error } = await supabase.from('dinamicas').update(parte).eq('edition_id', edition.id);
    if (error) { avisar('Não foi possível salvar.'); await carregar(); }
  }
  const status = (e: 1 | 2) => (e === 1 ? din?.status_1 : din?.status_2) || 'aguardando';
  const chaveStatus = (e: 1 | 2) => (e === 1 ? 'status_1' : 'status_2') as 'status_1' | 'status_2';
  const total = (e: 1 | 2) => respostas.filter((r) => r.etapa === e && !r.removida).length;
  const novas = din?.congelado_em ? respostas.filter((r) => !r.removida && r.created_at > (din.congelado_em as string)).length : 0;

  async function removerOuRestaurar(r: Resposta) {
    setRespostas((atual) => atual.map((x) => (x.id === r.id ? { ...x, removida: !r.removida } : x)));
    await supabase.from('dinamica_respostas').update({ removida: !r.removida }).eq('id', r.id);
  }
  async function zerar() {
    if (!window.confirm(`Apagar as ${respostas.length} respostas desta dinâmica? As perguntas continuam. Use para limpar os testes antes do encontro.`)) return;
    await supabase.from('dinamica_respostas').delete().eq('edition_id', edition.id);
    await mudar({ status_1: 'aguardando', status_2: 'aguardando', congelado_em: null });
    avisar('Dinâmica zerada.'); await carregar();
  }
  function planilha() {
    import('../forms/formExports').then(({ downloadXlsx }) => downloadXlsx(`communicali-${edition.slug}-dinamica.xlsx`, 'Dinâmica', ['Pergunta', 'Resposta', 'Enviada em', 'Removida pela moderação'],
      [...respostas].reverse().map((r) => [NOMES[r.etapa], r.texto, new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), r.removida ? 'Sim' : 'Não']))).catch(() => avisar('Não foi possível gerar a planilha.'));
  }
  async function imagem() {
    if (!din) return;
    const qr = await QRCode.toDataURL(links.celular, { width: 900, margin: 1, color: QR_COR });
    const estado: EstadoMural = { status_1: din.status_1, status_2: din.status_2, modo: 'ambos', qr: true, congelado: false, respostas: [...respostas].reverse().filter((r) => !r.removida).map((r) => ({ id: r.id, etapa: r.etapa, texto: r.texto, chave: r.chave })) };
    const blob = await imagemDoMural(estado, qr);
    if (!blob) { avisar('Não foi possível gerar a imagem.'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `communicali-${edition.slug}-mural.png`; a.click();
  }
  const lista = useMemo(() => respostas.filter((r) => r.etapa === aba), [respostas, aba]);

  if (!din) return <p className="adm-hint">Preparando a dinâmica…</p>;
  return (
    <div className="dn-adm">
      <div className="dn-adm__perguntas">
        {([1, 2] as const).map((e) => (
          <article key={e} className={`dn-adm__pergunta dn-adm__pergunta--${status(e)}`}>
            <header><strong>{e}. {NOMES[e]}</strong><span className={`dn-adm__status ${status(e)}`}>{STATUS_TEXTO[status(e)]}</span></header>
            <p>{e === 1 ? din.pergunta_1 : din.pergunta_2}</p>
            <footer>
              <span>{total(e)} {total(e) === 1 ? 'resposta' : 'respostas'}</span>
              {status(e) === 'aberta'
                ? <button type="button" className="wf-secondary" onClick={() => void mudar({ [chaveStatus(e)]: 'encerrada' })}>Encerrar</button>
                : <button type="button" className="wf-primary" onClick={() => void mudar({ [chaveStatus(e)]: 'aberta' })}>{status(e) === 'encerrada' ? 'Reabrir' : 'Abrir'}</button>}
            </footer>
          </article>
        ))}
      </div>
      <div className="adm-linha-acoes">
        <p className="adm-hint">As duas perguntas podem ficar abertas juntas. Cada pessoa envia até {din.limite} palavras em cada uma.</p>
        <div className="adm-links">
          <button type="button" className="wf-secondary" onClick={() => void mudar({ status_1: 'aberta', status_2: 'aberta' })}>Abrir as duas</button>
          <button type="button" className="wf-secondary" onClick={() => void mudar({ status_1: 'encerrada', status_2: 'encerrada' })}>Encerrar as duas</button>
        </div>
      </div>

      <div className="dn-adm__telao">
        <div className="adm-links">
          <a className="wf-primary" href={links.telao} target="_blank" rel="noopener noreferrer">Abrir telão da dinâmica</a>
          <button type="button" className="wf-secondary" onClick={() => { void navigator.clipboard.writeText(links.celular); avisar('Link do QR Code copiado.'); }}>Copiar link do celular</button>
          <a className="wf-secondary" href={links.celular} target="_blank" rel="noopener noreferrer">Ver como o público vê</a>
        </div>
        <div className="adm-links">
          {([['ambos', 'Os dois murais'], ['1', 'Só Barreiras'], ['2', 'Só Caminhos']] as const).map(([m, rotulo]) => <button key={m} type="button" className={`wf-secondary${din.modo === m ? ' is-on' : ''}`} aria-pressed={din.modo === m} onClick={() => void mudar({ modo: m })}>{rotulo}</button>)}
          <button type="button" className={`wf-secondary${din.qr ? ' is-on' : ''}`} aria-pressed={din.qr} onClick={() => void mudar({ qr: !din.qr })}>{din.qr ? 'QR Code visível' : 'QR Code oculto'}</button>
          <button type="button" className={`wf-secondary${din.congelado_em ? ' is-ouro' : ''}`} aria-pressed={Boolean(din.congelado_em)} onClick={() => void mudar({ congelado_em: din.congelado_em ? null : new Date().toISOString() })}>{din.congelado_em ? 'Descongelar' : 'Congelar para o debate'}</button>
        </div>
        {din.congelado_em && <p className="adm-hint">Telão congelado. {novas ? `${novas} ${novas === 1 ? 'resposta nova espera' : 'respostas novas esperam'} para entrar.` : 'Nenhuma resposta nova esperando.'} No telão, a tecla F abre a tela cheia.</p>}
      </div>

      <details className="adm-suspensa">
        <summary>Moderação e exportação</summary>
        <div className="adm-links dn-adm__abas">
          {([1, 2] as const).map((e) => <button key={e} type="button" className={`wf-secondary${aba === e ? ' is-on' : ''}`} onClick={() => setAba(e)}>{NOMES[e]} ({respostas.filter((r) => r.etapa === e && !r.removida).length})</button>)}
        </div>
        {lista.length ? (
          <ul className="dn-adm__lista">
            {lista.map((r) => <li key={r.id} className={r.removida ? 'removida' : ''}><span>{r.texto}</span><time>{hora(r.created_at)}</time><button type="button" className="wf-secondary" onClick={() => void removerOuRestaurar(r)}>{r.removida ? 'Restaurar' : 'Remover'}</button></li>)}
          </ul>
        ) : <p className="adm-hint">Nenhuma resposta nesta pergunta ainda.</p>}
        <div className="adm-links">
          <button type="button" className="wf-secondary" disabled={!respostas.length} onClick={planilha}>Respostas (planilha)</button>
          <button type="button" className="wf-secondary" disabled={!respostas.length} onClick={() => void imagem()}>Imagem do mural</button>
          <button type="button" className="wf-secondary adm-perigo" disabled={!respostas.length} onClick={() => void zerar()}>Zerar para testar de novo</button>
        </div>
      </details>
      {aviso && <div className="v2-forms-toast" role="status">{aviso}</div>}
    </div>
  );
}
