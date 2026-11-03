/* E-mails da edição: confirmação e lembrete automáticos, boas-vindas enviadas pelo painel. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Tabela, dataBr } from './AdminTabela';

type Resumo = { todos: number; acionados: number; confirmacoes: number; lembretes: number; convites: number; agradecimentos: number; erros: number };
type Linha = { email: string; nome: string; tipo: string; situacao: string; created_at: string; aberto_em: string | null; clicado_em: string | null };
const NOMES: Record<string, string> = { recebido: 'Inscrição recebida', confirmacao: 'Reserva confirmada', espera: 'Lista de espera', lembrete: 'Lembrete', convite: 'Convite de agenda', boasvindas: 'Boas-vindas', agradecimento: 'Agradecimento' };

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
  const faltamAgradecimento = resumo ? Math.max(resumo.todos - resumo.acionados - resumo.agradecimentos, 0) : 0;
  const diaLembrete = new Date(new Date(`${edition.data_evento}T12:00:00Z`).getTime() - 1 * 86400000).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const quando = (iso: string | null) => (iso ? `${dataBr(iso)} ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}` : '-');

  async function teste() {
    setBusy(true); setNote('');
    try { const result = await chamar({ acao: 'teste', edicao: edition.id, tipo: 'todos' }); setNote(`${result.enviados} e-mails de teste enviados para ${result.para}.`); }
    catch (error) { setNote((error as Error).message); }
    setBusy(false);
  }

  async function enviarLote(tipo: 'boasvindas' | 'agradecimento', faltam: number) {
    const nome = tipo === 'boasvindas' ? 'as boas-vindas para os contatados' : 'o agradecimento para quem ainda está sem contato';
    if (!window.confirm(`Enviar ${nome} (${faltam} ${faltam === 1 ? 'pessoa' : 'pessoas'})? Quem já recebeu não recebe de novo.`)) return;
    setBusy(true); setNote('');
    let enviados = 0;
    try {
      for (;;) {
        const result = await chamar({ acao: 'convite', edicao: edition.id, tipo, publico: tipo === 'boasvindas' ? 'acionados' : 'sem_contato' });
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
  return (
    <section className="v2-forms-card">
      <header><small>E-MAILS</small><h2>Envios e acompanhamento</h2></header>
      <label className="v2-forms-check"><input type="checkbox" checked={lembrete} onChange={(event) => onLembrete(event.target.checked)} /><span><strong>Lembrete automático em {diaLembrete}</strong><small>Vai na véspera, pela manhã, com local e agenda, para quem foi aprovado e para os contatados do formulário.</small></span></label>
      {resumo && <p className="adm-hint">{resumo.todos} inscritos, {resumo.acionados} contatados. Enviados: {resumo.convites} boas-vindas, {resumo.agradecimentos} agradecimentos, {resumo.confirmacoes} confirmações e {resumo.lembretes} lembretes.{resumo.erros ? ` ${resumo.erros} com erro.` : ''}</p>}
      <div className="adm-links">
        <button type="button" className="wf-primary" disabled={busy || !faltamBoasVindas} onClick={() => void enviarLote('boasvindas', faltamBoasVindas)}>{busy ? 'Enviando...' : `Boas-vindas aos contatados (${faltamBoasVindas})`}</button>
        <button type="button" className="wf-secondary" disabled={busy || !faltamAgradecimento} onClick={() => void enviarLote('agradecimento', faltamAgradecimento)}>{`Agradecimento aos sem contato (${faltamAgradecimento})`}</button>
        <button type="button" className="wf-secondary" disabled={busy} onClick={() => void teste()}>Enviar teste para mim</button>
        <button type="button" className="wf-secondary" disabled={busy} onClick={() => void carregar()}>Atualizar</button>
      </div>
      {note && <p className="adm-hint" role="status">{note}</p>}
      {linhas.length > 0 && <>
        <p className="adm-hint">{enviadas.length} entregues ao servidor de e-mail · {enviadas.filter((item) => item.aberto_em).length} abriram · {enviadas.filter((item) => item.clicado_em).length} clicaram. Alguns programas, como o Apple Mail, contam abertura sozinhos, e outros bloqueiam as imagens; use a abertura como sinal aproximado e o clique como sinal seguro.</p>
        <Tabela colunas={[
          { id: 'nome', titulo: 'Nome', valor: (item: Linha) => item.nome || '-' },
          { id: 'email', titulo: 'E-mail', valor: (item: Linha) => item.email },
          { id: 'tipo', titulo: 'E-mail enviado', valor: (item: Linha) => NOMES[item.tipo] || item.tipo },
          { id: 'situacao', titulo: 'Envio', valor: (item: Linha) => (item.situacao === 'enviado' ? 'Enviado' : item.situacao === 'erro' ? 'Erro' : 'Enviando') },
          { id: 'enviado', titulo: 'Quando', valor: (item: Linha) => item.created_at, render: (item: Linha) => quando(item.created_at) },
          { id: 'aberto', titulo: 'Abriu', valor: (item: Linha) => item.aberto_em || '', render: (item: Linha) => quando(item.aberto_em) },
          { id: 'clicado', titulo: 'Clicou', valor: (item: Linha) => item.clicado_em || '', render: (item: Linha) => quando(item.clicado_em) },
        ]} filtros={[{ id: 'tipo', titulo: 'E-mail', valor: (item: Linha) => NOMES[item.tipo] || item.tipo }]} linhas={linhas} chave={(item) => `${item.email}-${item.tipo}`} inicial={{ id: 'enviado', desc: true }} vazio="Nenhum e-mail enviado." />
      </>}
    </section>
  );
}
