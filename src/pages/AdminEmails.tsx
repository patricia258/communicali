/* E-mails da edição: confirmação e lembrete automáticos, boas-vindas enviadas pelo painel. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { erroAmigavel } from '../lib/erros';
import { Tabela, dataBr } from './AdminTabela';
import { esc, imprimirFolhas } from './listaImpressa';

type Resumo = { todos: number; acionados: number; confirmacoes: number; lembretes: number; convites: number; cards?: number; agradecimentos: number; erros: number };
type Linha = { email: string; nome: string; tipo: string; situacao: string; created_at: string; aberto_em: string | null; clicado_em: string | null; entrega?: string | null };
const ENTREGA: Record<string, string> = { delivered: 'Entregue', bounced: 'Voltou', failed: 'Falhou', suppressed: 'Bloqueado', complained: 'Marcou como spam', delivery_delayed: 'Atrasado', sent: 'Saiu, sem retorno', opened: 'Entregue', clicked: 'Entregue' };
const NOMES: Record<string, string> = { recebido: 'Inscrição recebida', confirmacao: 'Reserva confirmada', espera: 'Lista de espera', lembrete: 'Lembrete', convite: 'Convite de agenda', boasvindas: 'Boas-vindas', agradecimento: 'Agradecimento', card: 'Card Eu vou', pesquisa: 'Pesquisa de satisfação', posevento: 'Pós-evento (material e pesquisa)' };

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
  const carregar = () => Promise.all([chamar({ acao: 'resumo', edicao: edition.id }).then(setResumo), chamar({ acao: 'acompanhar', edicao: edition.id }).then((result) => setLinhas(result.linhas))]).catch((error: Error) => setNote(erroAmigavel(error)));
  useEffect(() => { void carregar(); }, [edition.id]);

  const faltamBoasVindas = resumo ? Math.max(resumo.acionados - resumo.convites, 0) : 0;
  const faltamAgradecimento = resumo ? Math.max(resumo.todos - resumo.acionados - resumo.agradecimentos, 0) : 0;
  const diaLembrete = new Date(new Date(`${edition.data_evento}T12:00:00Z`).getTime() - 1 * 86400000).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const quando = (iso: string | null) => (iso ? `${dataBr(iso)} ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}` : '-');

  async function teste() {
    setBusy(true); setNote('');
    try { const result = await chamar({ acao: 'teste', edicao: edition.id, tipo: 'todos' }); setNote(`${result.enviados} e-mails de teste enviados para ${result.para}.`); }
    catch (error) { setNote(erroAmigavel(error)); }
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
    } catch (error) { setNote(erroAmigavel(error)); }
    await carregar();
    setBusy(false);
  }

  // Lê na Resend se cada e-mail foi entregue ou voltou. Repete em blocos de 15 até acabar.
  async function conferirEntregas() {
    setBusy(true); setNote('Conferindo entregas...');
    try {
      for (let rodada = 0; rodada < 20; rodada += 1) {
        const result = await chamar({ acao: 'entregas', edicao: edition.id });
        if (result.lidos < 15) break;
      }
      await carregar();
      setNote('Entregas conferidas.');
    } catch (error) { setNote(erroAmigavel(error)); }
    setBusy(false);
  }

  const enviadas = linhas.filter((item) => item.situacao === 'enviado');
  const entregues = enviadas.filter((item) => ['delivered', 'opened', 'clicked'].includes(item.entrega || '')).length;
  const voltaram = enviadas.filter((item) => ['bounced', 'failed', 'suppressed'].includes(item.entrega || '')).length;
  const spam = enviadas.filter((item) => item.entrega === 'complained').length;
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
          <button type="button" className="wf-secondary" disabled={busy} onClick={() => void conferirEntregas()}>Conferir entregas</button>
          <button type="button" className="wf-secondary" disabled={busy} onClick={() => void carregar()}>Atualizar</button>
        </div>
      </header>

      <div className="adm-cards">
        <div className="adm-card"><span>Enviados</span><strong>{enviadas.length}</strong><small>{resumo ? `${resumo.convites} boas-vindas · ${resumo.agradecimentos} agradecimentos` : ''}</small></div>
        <div className="adm-card"><span>Abriram</span><strong>{abriram}</strong><small>{pct(abriram).replace(' · ', '') || '-'} dos enviados (aproximado)</small></div>
        <div className="adm-card"><span>Clicaram</span><strong>{clicaram}</strong><small>{pct(clicaram).replace(' · ', '') || '-'} dos enviados</small></div>
        <div className="adm-card"><span>Entregues</span><strong>{entregues}</strong><small>{voltaram} voltaram · {spam} marcados como spam · {resumo?.erros ?? 0} com erro</small></div>
      </div>

      <label className="v2-forms-check"><input type="checkbox" checked={lembrete} onChange={(event) => onLembrete(event.target.checked)} /><span><strong>Lembrete automático em {diaLembrete}</strong><small>Vai na véspera, pela manhã, com local e agenda, para quem foi aprovado e para os contatados.</small></span></label>


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
          { id: 'entrega', titulo: 'Entrega', valor: (item: Linha) => ENTREGA[item.entrega || ''] || 'Não conferido', render: (item: Linha) => { const nome = ENTREGA[item.entrega || ''] || 'Não conferido'; return <span className={`adm-status${['delivered', 'opened', 'clicked'].includes(item.entrega || '') ? ' adm-status--sim' : ['bounced', 'failed', 'suppressed', 'complained'].includes(item.entrega || '') ? ' adm-status--erro' : ''}`}>{nome}</span>; } },
          { id: 'aberto', titulo: 'Abriu', valor: (item: Linha) => item.aberto_em || '', render: (item: Linha) => marca(item.aberto_em) },
          { id: 'clicado', titulo: 'Clicou', valor: (item: Linha) => item.clicado_em || '', render: (item: Linha) => marca(item.clicado_em) },
        ]} filtros={[{ id: 'tipo', titulo: 'Qual e-mail', valor: (item: Linha) => NOMES[item.tipo] || item.tipo }, { id: 'entrega', titulo: 'Entrega', valor: (item: Linha) => ENTREGA[item.entrega || ''] || 'Não conferido' }]} linhas={linhas} chave={(item) => `${item.email}-${item.tipo}`} inicial={{ id: 'enviado', desc: true }} vazio="Nenhum e-mail enviado." />
        <p className="adm-hint">"Entregue" quer dizer que o servidor da pessoa aceitou o e-mail; se ele foi para a caixa de entrada ou para o spam, só a pessoa vê. A abertura é aproximada: o Apple Mail marca sozinho e alguns programas bloqueiam a contagem. O clique é o sinal seguro.</p>
      </details>}
    </section>
  );
}

type Participacao = { id: string; nome: string | null; email: string; gerado_em: string | null; formatos: string[]; redes: string[]; compartilhado_em: string | null; conferido_em: string | null };
const quandoBr = (iso: string | null) => (iso ? `${dataBr(iso)} ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}` : '');
const formatoNome = (item: string) => (item === 'story' ? 'Story' : 'Feed e LinkedIn');

/** Card Eu vou! e mimos: quem recebeu o convite, quem gerou o card (e em qual formato), quem postou e onde,
    a aprovação do post pela organização e a lista impressa para a recepção entregar os mimos. */
export function CardEMimos({ edition }: { edition: { id: string; titulo: string; data_evento: string } }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [lista, setLista] = useState<Participacao[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const carregar = () => {
    void chamar({ acao: 'resumo', edicao: edition.id }).then(setResumo).catch(() => null);
    void supabase.from('compartilhamentos').select('id,nome,email,gerado_em,formatos,redes,compartilhado_em,conferido_em').eq('edition_id', edition.id).order('nome').then(({ data }) => setLista((data || []) as Participacao[]));
  };
  useEffect(carregar, [edition.id]);
  const geraram = lista.filter((item) => item.gerado_em).length;
  const postaram = lista.filter((item) => item.compartilhado_em);
  const aprovados = postaram.filter((item) => item.conferido_em).length;
  const faltam = resumo ? Math.max(resumo.acionados - (resumo.cards || 0), 0) : 0;
  const link = 'https://comuni.calirh.com/eu-vou';

  async function aprovar(item: Participacao) {
    await supabase.from('compartilhamentos').update({ conferido_em: item.conferido_em ? null : new Date().toISOString() }).eq('id', item.id);
    carregar();
  }
  async function teste() {
    setBusy(true); setNote('');
    try { const result = await chamar({ acao: 'teste_card', edicao: edition.id }); setNote(`Teste enviado para ${result.para}.`); } catch (error) { setNote(erroAmigavel(error)); }
    setBusy(false);
  }
  async function enviarFaltam() {
    if (!window.confirm(`Enviar o convite do card para ${faltam} ${faltam === 1 ? 'pessoa confirmada que ainda não recebeu' : 'pessoas confirmadas que ainda não receberam'}?`)) return;
    setBusy(true); setNote('');
    try { const result = await chamar({ acao: 'convite', edicao: edition.id, tipo: 'card', publico: 'acionados' }); setNote(`${result.enviados} e-mails enviados.`); } catch (error) { setNote(erroAmigavel(error)); }
    carregar(); setBusy(false);
  }
  // Lista para a recepção: quem postou, em ordem alfabética, com caixa para marcar a entrega no papel.
  function imprimir() {
    const ordem = (lista: Participacao[]) => [...lista].sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email, 'pt-BR'));
    const linha = (item: Participacao) => [esc(item.nome || item.email), esc(item.redes.join(' e ')), quandoBr(item.compartilhado_em)];
    const ok = imprimirFolhas(`Mimos · ${edition.titulo}`, [{
      etiqueta: 'MIMO DO CARD EU VOU!', titulo: 'Lista dos Mimos', meta: `${dataBr(edition.data_evento)} · ${edition.titulo}`,
      instrucao: 'Marque a caixa ao entregar o mimo.', resumo: `<b>${postaram.length}</b> ${postaram.length === 1 ? 'pessoa postou' : 'pessoas postaram'} marcando a CALI`,
      colunas: ['Nome', 'Onde postou', 'Postou em'],
      grupos: [{ nome: 'Post aprovado', linhas: ordem(postaram.filter((item) => item.conferido_em)).map(linha) }, { nome: 'Ainda sem conferir', cor: 'ouro', linhas: ordem(postaram.filter((item) => !item.conferido_em)).map(linha) }],
      rodape: 'Só quem postou marcando a CALI',
    }]);
    if (!ok) setNote('Libere as janelas do navegador para imprimir a lista.');
  }
  function exportar() {
    void import('../forms/formExports').then(({ downloadXlsx }) => downloadXlsx(`communicali-mimos.xlsx`, 'Card e mimos', ['Nome', 'E-mail', 'Gerou o card em', 'Formatos', 'Compartilhou em', 'Onde', 'Post aprovado'],
      lista.map((item) => [item.nome || '', item.email, quandoBr(item.gerado_em), item.formatos.map(formatoNome).join(', '), quandoBr(item.compartilhado_em), item.redes.join(' e '), item.conferido_em ? 'Sim' : 'Não'])));
  }

  return (
    <section className="v2-forms-card adm-secao" id="secao-card">
      <header className="adm-secao__topo"><div><small>CARD EU VOU! E MIMOS</small><h2>Quem gerou o card e quem postou</h2></div>
        <div className="adm-links">
          <button type="button" className="wf-secondary" onClick={() => { void navigator.clipboard.writeText(link); setNote('Link do grupo copiado.'); }}>Copiar link do grupo</button>
          <button type="button" className="wf-secondary" disabled={busy} onClick={() => void teste()}>Enviar teste do e-mail para mim</button>
          {faltam > 0 && <button type="button" className="wf-secondary" disabled={busy} onClick={() => void enviarFaltam()}>{`Enviar convite para quem falta (${faltam})`}</button>}
        </div>
      </header>
      <div className="adm-cards">
        <div className="adm-card"><span>Receberam o convite</span><strong>{resumo?.cards ?? 0}</strong><small>de {resumo?.acionados ?? 0} confirmados</small></div>
        <div className="adm-card"><span>Geraram o card</span><strong>{geraram}</strong><small>{lista.filter((item) => item.formatos.includes('story')).length} no formato story</small></div>
        <div className="adm-card"><span>Postaram</span><strong>{postaram.length}</strong><small>{postaram.filter((item) => item.redes.includes('Instagram')).length} Instagram · {postaram.filter((item) => item.redes.includes('LinkedIn')).length} LinkedIn</small></div>
        <div className="adm-card"><span>Posts aprovados</span><strong>{aprovados}</strong><small>{postaram.length - aprovados} para conferir</small></div>
      </div>
      {note && <p className="adm-hint" role="status">{note}</p>}
      <Tabela<Participacao> colunas={[
        { id: 'nome', titulo: 'Nome', valor: (item) => item.nome || item.email },
        { id: 'gerou', titulo: 'Gerou o card', valor: (item) => item.gerado_em || '', render: (item) => quandoBr(item.gerado_em) || <span className="adm-status">Ainda não</span> },
        { id: 'formatos', titulo: 'Formatos', valor: (item) => item.formatos.map(formatoNome).join(', ') || '-' },
        { id: 'postou', titulo: 'Postou', valor: (item) => item.compartilhado_em || '', render: (item) => quandoBr(item.compartilhado_em) || <span className="adm-status">Ainda não</span> },
        { id: 'onde', titulo: 'Onde', valor: (item) => item.redes.join(' e ') || '-' },
        { id: 'aprovado', titulo: 'Post aprovado', valor: (item) => (item.conferido_em ? 'Sim' : 'Não'), render: (item) => (item.compartilhado_em
          ? <label className="adm-aprovar"><input type="checkbox" checked={Boolean(item.conferido_em)} onChange={() => void aprovar(item)} /> {item.conferido_em ? 'Aprovado' : 'Conferir'}</label> : '-') },
      ]} filtros={[{ id: 'onde', titulo: 'Onde postou', valor: (item) => item.redes.join(' e ') }, { id: 'aprovado', titulo: 'Post aprovado', valor: (item) => (item.compartilhado_em ? (item.conferido_em ? 'Aprovado' : 'Para conferir') : 'Não postou') }]}
        linhas={lista} chave={(item) => item.id} inicial={{ id: 'nome' }} vazio="Quando alguém gerar o card, aparece aqui."
        acoes={<>
          <button type="button" className="wf-primary" disabled={!postaram.length} onClick={imprimir}>Imprimir lista dos mimos</button>
          <button type="button" className="wf-secondary" disabled={!lista.length} onClick={exportar}>Exportar Excel</button>
        </>} />
      <p className="adm-hint">Aprove depois de ver o post marcando a CALI. A lista impressa leva só quem postou, para a recepção entregar o mimo pelo nome.</p>
    </section>
  );
}
