/* E-mails da edição: confirmação e lembrete automáticos, boas-vindas enviadas pelo painel. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Tabela, dataBr } from './AdminTabela';

type Resumo = { todos: number; acionados: number; confirmacoes: number; lembretes: number; convites: number; cards?: number; agradecimentos: number; erros: number };
type Linha = { email: string; nome: string; tipo: string; situacao: string; created_at: string; aberto_em: string | null; clicado_em: string | null };
const NOMES: Record<string, string> = { recebido: 'Inscrição recebida', confirmacao: 'Reserva confirmada', espera: 'Lista de espera', lembrete: 'Lembrete', convite: 'Convite de agenda', boasvindas: 'Boas-vindas', agradecimento: 'Agradecimento', card: 'Card Eu vou' };

type Compartilhou = { id: string; nome: string | null; email: string; redes: string[]; entregue_em: string | null; created_at: string };

/** Quem disse que compartilhou o card marcando a CALI: quantos mimos preparar e, na recepção, quem já retirou. */
function Mimos({ editionId }: { editionId: string }) {
  const [lista, setLista] = useState<Compartilhou[]>([]);
  const carregar = () => supabase.from('compartilhamentos').select('id,nome,email,redes,entregue_em,created_at').eq('edition_id', editionId).order('created_at').then(({ data }) => setLista((data || []) as Compartilhou[]));
  useEffect(() => { void carregar(); }, [editionId]);
  async function entregar(item: Compartilhou) {
    await supabase.from('compartilhamentos').update({ entregue_em: item.entregue_em ? null : new Date().toISOString() }).eq('id', item.id);
    void carregar();
  }
  const entregues = lista.filter((item) => item.entregue_em).length;
  return <details className="adm-suspensa">
    <summary>Mimos: {lista.length} {lista.length === 1 ? 'pessoa compartilhou' : 'pessoas compartilharam'}{lista.length ? ` · ${entregues} retirados` : ''}</summary>
    {lista.length ? <div className="adm-list">{lista.map((item) => (
      <label className="adm-row adm-row--static adm-mimo" key={item.id}>
        <input type="checkbox" checked={Boolean(item.entregue_em)} onChange={() => void entregar(item)} aria-label={`Mimo entregue para ${item.nome || item.email}`} />
        <strong>{item.nome || item.email}</strong><span>{item.redes.join(' e ')} · {dataBr(item.created_at)}</span><em>{item.entregue_em ? 'Mimo retirado' : 'Aguardando'}</em>
      </label>
    ))}</div> : <p className="adm-hint">Quando alguém tocar em "Já compartilhei" na página do card, aparece aqui.</p>}
    <p className="adm-hint">Confira o post na recepção antes de entregar e marque a caixinha.</p>
  </details>;
}

export async function chamar(body: Record<string, string>) {
  const { data } = await supabase.auth.getSession();
  const response = await fetch('/api/email-admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir o envio.');
  return result;
}

export function EmailsCard({ edition, lembrete, onLembrete }: { edition: { id: string; data_evento: string }; lembrete: boolean; onLembrete: (value: boolean) => void }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const carregar = () => Promise.all([chamar({ acao: 'resumo', edicao: edition.id }).then(setResumo), chamar({ acao: 'acompanhar', edicao: edition.id }).then((result) => setLinhas(result.linhas))]).catch((error: Error) => setNote(error.message));
  useEffect(() => { void carregar(); }, [edition.id]);

  const faltamBoasVindas = resumo ? Math.max(resumo.acionados - resumo.convites, 0) : 0;
  const faltamCard = resumo ? Math.max(resumo.acionados - (resumo.cards || 0), 0) : 0;
  const faltamAgradecimento = resumo ? Math.max(resumo.todos - resumo.acionados - resumo.agradecimentos, 0) : 0;
  const diaLembrete = new Date(new Date(`${edition.data_evento}T12:00:00Z`).getTime() - 1 * 86400000).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const quando = (iso: string | null) => (iso ? `${dataBr(iso)} ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}` : '-');

  async function teste() {
    setBusy(true); setNote('');
    try { const result = await chamar({ acao: 'teste', edicao: edition.id, tipo: 'todos' }); setNote(`${result.enviados} e-mails de teste enviados para ${result.para}.`); }
    catch (error) { setNote((error as Error).message); }
    setBusy(false);
  }

  async function testeCard() {
    setBusy(true); setNote('');
    try { const result = await chamar({ acao: 'teste_card', edicao: edition.id, para: 'pclazumi@gmail.com' }); setNote(`Teste do card enviado para ${result.para}.`); }
    catch (error) { setNote((error as Error).message); }
    setBusy(false);
  }

  async function enviarLote(tipo: 'boasvindas' | 'agradecimento' | 'card', faltam: number) {
    const nome = tipo === 'boasvindas' ? 'as boas-vindas para os contatados' : tipo === 'card' ? 'o convite do card Eu vou! para quem está confirmado' : 'o agradecimento para quem ainda está sem contato';
    if (!window.confirm(`Enviar ${nome} (${faltam} ${faltam === 1 ? 'pessoa' : 'pessoas'})? Quem já recebeu não recebe de novo.`)) return;
    setBusy(true); setNote('');
    let enviados = 0;
    try {
      for (;;) {
        const result = await chamar({ acao: 'convite', edicao: edition.id, tipo, publico: tipo === 'agradecimento' ? 'sem_contato' : 'acionados' });
        enviados += result.enviados;
        setNote(`${enviados} e-mails enviados...`);
        if (!result.restantes) break;
      }
      setNote(`${enviados} e-mails enviados.`);
    } catch (error) { setNote((error as Error).message); }
    await carregar();
    setBusy(false);
  }

  const enviadas = linhas.filter((item) => item.situacao === 'enviado');
  const abriram = enviadas.filter((item) => item.aberto_em).length;
  const clicaram = enviadas.filter((item) => item.clicado_em).length;
  const pct = (valor: number) => (enviadas.length ? ` · ${Math.round((valor / enviadas.length) * 100)}%` : '');
  const marca = (iso: string | null) => (iso ? <span className="adm-status adm-status--sim" title={quando(iso)}>✓ {quando(iso).slice(0, 5)}</span> : <span className="adm-status">Ainda não</span>);
  const pendentes = faltamBoasVindas + faltamAgradecimento;
  return (
    <section className="v2-forms-card adm-envios">
      <header className="adm-envios__topo">
        <div><small>E-MAILS</small><h2>Envios desta edição</h2></div>
        <div className="adm-links">
          <button type="button" className="wf-secondary" disabled={busy} onClick={() => void teste()}>Enviar teste para mim</button>
          <button type="button" className="wf-secondary" disabled={busy} onClick={() => void carregar()}>Atualizar</button>
        </div>
      </header>

      <div className="adm-cards">
        <div className="adm-card"><span>Enviados</span><strong>{enviadas.length}</strong><small>{resumo ? `${resumo.convites} boas-vindas · ${resumo.agradecimentos} agradecimentos` : ''}</small></div>
        <div className="adm-card"><span>Abriram</span><strong>{abriram}</strong><small>{pct(abriram).replace(' · ', '') || '-'} dos enviados (aproximado)</small></div>
        <div className="adm-card"><span>Clicaram</span><strong>{clicaram}</strong><small>{pct(clicaram).replace(' · ', '') || '-'} dos enviados</small></div>
        <div className="adm-card"><span>Com erro</span><strong>{resumo?.erros ?? 0}</strong><small>{resumo ? `${resumo.todos} inscritos · ${resumo.acionados} contatados` : ''}</small></div>
      </div>

      <label className="v2-forms-check"><input type="checkbox" checked={lembrete} onChange={(event) => onLembrete(event.target.checked)} /><span><strong>Lembrete automático em {diaLembrete}</strong><small>Vai na véspera, pela manhã, com local e agenda, para quem foi aprovado e para os contatados.</small></span></label>

      <div className="adm-links adm-card-euvou">
        <span><strong>Card Eu vou!</strong> {resumo ? `${resumo.cards || 0} de ${resumo.acionados} confirmados já receberam` : ''}</span>
        <button type="button" className="wf-secondary" disabled={busy} onClick={() => void testeCard()}>Testar card (pclazumi@gmail.com)</button>
        {faltamCard > 0 && <button type="button" className="wf-primary" disabled={busy} onClick={() => void enviarLote('card', faltamCard)}>{`Enviar card para os confirmados (${faltamCard})`}</button>}
        <a className="wf-secondary" href="/eu-vou" target="_blank" rel="noopener noreferrer">Link para o grupo: comuni.calirh.com/eu-vou</a>
      </div>
      <Mimos editionId={edition.id} />
      {pendentes > 0 && <div className="adm-links">
        {faltamBoasVindas > 0 && <button type="button" className="wf-primary" disabled={busy} onClick={() => void enviarLote('boasvindas', faltamBoasVindas)}>{busy ? 'Enviando...' : `Enviar boas-vindas (${faltamBoasVindas})`}</button>}
        {faltamAgradecimento > 0 && <button type="button" className="wf-secondary" disabled={busy} onClick={() => void enviarLote('agradecimento', faltamAgradecimento)}>{`Enviar agradecimento (${faltamAgradecimento})`}</button>}
      </div>}
      {note && <p className="adm-hint" role="status">{note}</p>}

      {linhas.length > 0 && <details className="adm-suspensa">
        <summary>Ver os e-mails enviados ({linhas.length})</summary>
        <Tabela colunas={[
          { id: 'nome', titulo: 'Nome', valor: (item: Linha) => item.nome || '-' },
          { id: 'email', titulo: 'E-mail', valor: (item: Linha) => item.email },
          { id: 'tipo', titulo: 'Qual e-mail', valor: (item: Linha) => NOMES[item.tipo] || item.tipo, render: (item: Linha) => <span className={`adm-pill adm-tipo--${item.tipo}`}>{NOMES[item.tipo] || item.tipo}</span> },
          { id: 'enviado', titulo: 'Enviado em', valor: (item: Linha) => item.created_at, render: (item: Linha) => (item.situacao === 'erro' ? <span className="adm-status adm-status--erro">Erro</span> : quando(item.created_at)) },
          { id: 'aberto', titulo: 'Abriu', valor: (item: Linha) => item.aberto_em || '', render: (item: Linha) => marca(item.aberto_em) },
          { id: 'clicado', titulo: 'Clicou', valor: (item: Linha) => item.clicado_em || '', render: (item: Linha) => marca(item.clicado_em) },
        ]} filtros={[{ id: 'tipo', titulo: 'Qual e-mail', valor: (item: Linha) => NOMES[item.tipo] || item.tipo }]} linhas={linhas} chave={(item) => `${item.email}-${item.tipo}`} inicial={{ id: 'enviado', desc: true }} vazio="Nenhum e-mail enviado." />
        <p className="adm-hint">A abertura é aproximada: o Apple Mail marca sozinho e alguns programas bloqueiam a contagem. O clique é o sinal seguro.</p>
      </details>}
    </section>
  );
}
