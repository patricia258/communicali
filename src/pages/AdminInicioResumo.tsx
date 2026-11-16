/* Início do painel: o que importa agora, num olhar. Próximo encontro, última edição e pagamentos que vencem. */
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { dataBr } from './AdminTabela';
import './admin-inicio.css';

type Edicao = { id: string; slug: string; titulo: string; data_evento: string; horario: string; local: string; cidade: string; capacidade: number | null };
type Vence = { custo: string; edicao: string; vencimento: string; saldo: number };
const moeda = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hojeBr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const total = (consulta: PromiseLike<{ count: number | null }>) => Promise.resolve(consulta).then(({ count }) => count || 0).catch(() => 0);

function Bloco({ rotulo, valor, apoio, para, aviso }: { rotulo: string; valor: ReactNode; apoio?: string; para?: string; aviso?: boolean }) {
  const miolo = <><span className="ini__rotulo">{rotulo}</span><strong className={aviso ? 'is-aviso' : undefined}>{valor}</strong>{apoio && <small>{apoio}</small>}</>;
  return para ? <Link className="ini__bloco" to={para}>{miolo}</Link> : <div className="ini__bloco">{miolo}</div>;
}

/** Números de uma edição. Por vir: inscrições e vagas. Já realizada: presença, álbum, recados e e-mails. */
function ResumoEdicao({ edicao, futura }: { edicao: Edicao; futura: boolean }) {
  const [d, setD] = useState({ inscritos: 0, aprovar: 0, checkins: 0, recados: 0, albumPessoas: 0, album: '', enviados: 0, entregues: 0, abriram: 0 });
  useEffect(() => {
    let vivo = true;
    void Promise.all([
      total(supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('edition_id', edicao.id).eq('status', 'inscrito')),
      total(supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('edition_id', edicao.id).eq('status', 'analise')),
      total(supabase.from('checkins').select('id', { count: 'exact', head: true }).eq('edition_id', edicao.id)),
      total(supabase.from('edition_comments').select('id', { count: 'exact', head: true }).eq('edition_id', edicao.id).eq('status', 'pendente')),
      Promise.resolve(supabase.from('edition_album_stats').select('pessoas').eq('edition_id', edicao.id).maybeSingle()).then(({ data }) => Number((data as { pessoas?: number } | null)?.pessoas) || 0).catch(() => 0),
      Promise.resolve(supabase.from('edition_albums').select('publicado,album_url').eq('edition_id', edicao.id).maybeSingle()).then(({ data }) => { const a = data as { publicado?: boolean; album_url?: string | null } | null; return !a ? 'Sem álbum' : a.publicado ? (a.album_url ? 'Publicado' : 'Sem link') : 'Não publicado'; }).catch(() => ''),
      Promise.resolve(supabase.from('email_log').select('entrega,aberto_em').eq('edition_id', edicao.id).eq('situacao', 'enviado')).then(({ data }) => data || []).catch(() => []),
    ]).then(([inscritos, aprovar, checkins, recados, albumPessoas, album, emails]) => {
      if (!vivo) return;
      const lista = emails as Array<{ entrega: string | null; aberto_em: string | null }>;
      setD({ inscritos, aprovar, checkins, recados, albumPessoas, album, enviados: lista.length, entregues: lista.filter((e) => ['delivered', 'opened', 'clicked'].includes(e.entrega || '')).length, abriram: lista.filter((e) => e.aberto_em).length });
    });
    return () => { vivo = false; };
  }, [edicao.id]);
  const base = `/admin/edicoes?abrir=${edicao.slug}`;
  return (
    <section className="ini__secao">
      <header className="ini__topo">
        <div><small>{futura ? 'PRÓXIMO ENCONTRO' : 'ÚLTIMA EDIÇÃO'}</small><h2>{edicao.titulo}</h2><p>{dataBr(edicao.data_evento)} · {edicao.horario} · {edicao.local}, {edicao.cidade}</p></div>
        <div className="ini__acoes"><Link className="wf-primary" to={base}>Abrir a edição</Link>{futura && <a className="wf-secondary" href={`/telao/checkin?edicao=${edicao.slug}`} target="_blank" rel="noopener noreferrer">Telão do check-in</a>}</div>
      </header>
      <div className="ini__grade">
        {futura ? <>
          <Bloco rotulo="Inscritos" valor={d.inscritos} apoio={edicao.capacidade ? `de ${edicao.capacidade} vagas` : 'sem limite de vagas'} para={`${base}&secao=pessoas`} />
          <Bloco rotulo="Para aprovar" valor={d.aprovar} apoio={d.aprovar ? 'esperando sua decisão' : 'nada esperando'} para={`${base}&secao=pessoas`} aviso={d.aprovar > 0} />
          <Bloco rotulo="Check-ins" valor={d.checkins} apoio="no dia do encontro" para={`${base}&secao=pessoas`} />
        </> : <>
          <Bloco rotulo="Presentes" valor={d.checkins} apoio="check-ins feitos" para={`${base}&secao=pessoas`} />
          <Bloco rotulo="Álbum" valor={d.album || '-'} apoio={`${d.albumPessoas} ${d.albumPessoas === 1 ? 'pessoa abriu' : 'pessoas abriram'}`} para={`${base}&secao=site`} />
          <Bloco rotulo="Recados" valor={d.recados} apoio={d.recados ? 'para aprovar' : 'nada para aprovar'} para={`${base}&secao=comentarios`} aviso={d.recados > 0} />
          <Bloco rotulo="E-mails" valor={d.enviados} apoio={`${d.entregues} entregues · ${d.abriram} abriram`} para={`${base}&secao=emails`} />
        </>}
      </div>
    </section>
  );
}

/** Parcelas de custo com vencimento nos próximos 7 dias ou já vencidas, ainda com saldo. */
function VenceEmBreve() {
  const [itens, setItens] = useState<Vence[] | null>(null);
  useEffect(() => {
    const limite = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    void Promise.resolve(supabase.from('event_costs').select('titulo,parcelas,editions(titulo)')).then(({ data }) => {
      const lista: Vence[] = [];
      for (const c of (data || []) as unknown as Array<{ titulo: string; parcelas: Array<{ vencimento?: string | null; valor_centavos?: number | null; pago_centavos?: number | null }>; editions: { titulo: string } | null }>) {
        for (const p of c.parcelas || []) {
          const saldo = (Number(p.valor_centavos) || 0) - (Number(p.pago_centavos) || 0);
          if (p.vencimento && p.valor_centavos != null && saldo > 0 && p.vencimento <= limite) lista.push({ custo: c.titulo, edicao: c.editions?.titulo || '', vencimento: p.vencimento, saldo });
        }
      }
      lista.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
      setItens(lista);
    }).catch(() => setItens([]));
  }, []);
  if (itens === null) return null;
  const hoje = hojeBr();
  return (
    <section className="ini__secao">
      <header className="ini__topo"><div><small>CUSTOS</small><h2>Vence em breve</h2><p>Pagamentos que vencem nos próximos 7 dias ou já venceram.</p></div><div className="ini__acoes"><Link className="wf-secondary" to="/admin/custos">Ver todos os custos</Link></div></header>
      {itens.length === 0 ? <p className="ini__vazio">Nada vencendo nos próximos 7 dias.</p> : (
        <ul className="ini__lista">{itens.slice(0, 6).map((i, n) => (
          <li key={n}><span className={`ini__data${i.vencimento < hoje ? ' is-vencido' : ''}`}>{i.vencimento < hoje ? 'Venceu ' : ''}{dataBr(i.vencimento)}</span><span className="ini__nome">{i.custo}{i.edicao ? <small>{i.edicao}</small> : null}</span><strong>{moeda(i.saldo)}</strong></li>
        ))}</ul>
      )}
    </section>
  );
}

export function InicioResumo() {
  const [proxima, setProxima] = useState<Edicao | null | undefined>(undefined);
  const [ultima, setUltima] = useState<Edicao | null | undefined>(undefined);
  useEffect(() => {
    const hoje = hojeBr();
    const campos = 'id,slug,titulo,data_evento,horario,local,cidade,capacidade';
    void Promise.resolve(supabase.from('editions').select(campos).eq('publica', true).gte('data_evento', hoje).order('data_evento').limit(1).maybeSingle()).then(({ data }) => setProxima((data as Edicao | null) || null)).catch(() => setProxima(null));
    void Promise.resolve(supabase.from('editions').select(campos).eq('publica', true).lt('data_evento', hoje).order('data_evento', { ascending: false }).limit(1).maybeSingle()).then(({ data }) => setUltima((data as Edicao | null) || null)).catch(() => setUltima(null));
  }, []);
  return (
    <>
      {proxima && <ResumoEdicao edicao={proxima} futura />}
      {ultima && <ResumoEdicao edicao={ultima} futura={false} />}
      {proxima === null && ultima === null && <p className="ini__vazio">Nenhuma edição publicada ainda. Crie uma em Edições.</p>}
      <VenceEmBreve />
    </>
  );
}
