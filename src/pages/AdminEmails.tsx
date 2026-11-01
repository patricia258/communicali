/* E-mails da edição: confirmação e lembrete automáticos, convite de agenda enviado pelo painel. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Resumo = { todos: number; acionados: number; confirmacoes: number; lembretes: number; convites: number; erros: number };

async function chamar(body: Record<string, string>) {
  const { data } = await supabase.auth.getSession();
  const response = await fetch('/api/email-admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir o envio.');
  return result;
}

export function EmailsCard({ edition, lembrete, onLembrete }: { edition: { id: string; data_evento: string }; lembrete: boolean; onLembrete: (value: boolean) => void }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [publico, setPublico] = useState('acionados');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const carregar = () => chamar({ acao: 'resumo', edicao: edition.id }).then(setResumo).catch((error: Error) => setNote(error.message));
  useEffect(() => { void carregar(); }, [edition.id]);

  const faltam = resumo ? Math.max((publico === 'todos' ? resumo.todos : resumo.acionados) - resumo.convites, 0) : 0;
  const diaLembrete = new Date(new Date(`${edition.data_evento}T12:00:00Z`).getTime() - 2 * 86400000).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  async function teste() {
    setBusy(true); setNote('');
    try { const result = await chamar({ acao: 'teste', edicao: edition.id, tipo: 'todos' }); setNote(`${result.enviados} e-mails de teste enviados para ${result.para}.`); }
    catch (error) { setNote((error as Error).message); }
    setBusy(false);
  }

  async function convidar() {
    if (!window.confirm(`Enviar o convite de agenda para ${faltam} ${faltam === 1 ? 'pessoa' : 'pessoas'}? Quem já recebeu não recebe de novo.`)) return;
    setBusy(true); setNote('');
    let enviados = 0;
    try {
      for (;;) {
        const result = await chamar({ acao: 'convite', edicao: edition.id, publico });
        enviados += result.enviados;
        setNote(`${enviados} convites enviados...`);
        if (!result.restantes) break;
      }
      setNote(`${enviados} convites enviados.`);
    } catch (error) { setNote((error as Error).message); }
    await carregar();
    setBusy(false);
  }

  return (
    <section className="v2-forms-card">
      <header><small>E-MAILS</small><h2>Confirmação, lembrete e agenda</h2></header>
      <label className="v2-forms-check"><input type="checkbox" checked={lembrete} onChange={(event) => onLembrete(event.target.checked)} /><span><strong>Lembrete automático em {diaLembrete}</strong><small>Vai 2 dias antes, pela manhã, para todas as pessoas inscritas. Lembre de salvar as alterações.</small></span></label>
      {resumo && <p className="adm-hint">{resumo.todos} inscritos, {resumo.acionados} acionados. Enviados: {resumo.confirmacoes} confirmações, {resumo.lembretes} lembretes e {resumo.convites} convites.{resumo.erros ? ` ${resumo.erros} com erro.` : ''}</p>}
      <div className="adm-links">
        <select aria-label="Quem recebe o convite" value={publico} onChange={(event) => setPublico(event.target.value)}>
          <option value="acionados">Só quem foi acionado ({resumo?.acionados ?? 0})</option>
          <option value="todos">Todos os inscritos ({resumo?.todos ?? 0})</option>
        </select>
        <button type="button" className="wf-primary" disabled={busy || !faltam} onClick={() => void convidar()}>{busy ? 'Enviando...' : 'Enviar convite de agenda'}</button>
        <button type="button" className="wf-secondary" disabled={busy} onClick={() => void teste()}>Enviar teste para mim</button>
      </div>
      {note && <p className="adm-hint" role="status">{note}</p>}
    </section>
  );
}
