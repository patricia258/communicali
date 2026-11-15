import { useEffect, useRef, useState } from 'react';
import { seloUrl } from '../selosNovos';
import { createPortal } from 'react-dom';
import { Flag, TrendingUp, X } from 'lucide-react';

// Requisitos conforme o Documento Mestre v22 (critérios v21, confirmados em 03/11).
const ETAPAS = [
  { id: 'visitante', nome: 'Visitante', descricao: 'Primeiro contato com a comunidade.',
    detalhes: ['Participe de até 2 encontros abertos como Visitante, com check-in na chegada.', 'A partir do terceiro encontro, o cadastro como Membro é gratuito.'] },
  { id: 'membro', nome: 'Membro', descricao: 'Participa dos encontros e constrói sua história.',
    detalhes: ['Cadastro gratuito, depois de estar presencialmente em um encontro.', 'Crachá e primeiro selo de presença no check-in.', 'Histórico, milhas e selos ficam com você, sem assinatura.'] },
  { id: 'conector', nome: 'Conector', descricao: 'Acolhe e aproxima pessoas com interesses em comum.',
    requisitos: ['60 milhas no ciclo de 12 meses', '4 encontros', '1 contribuição de conexão'],
    detalhes: ['Abre a Rede de membros.', 'A organização avalia e você aceita o convite.', 'Revalidação a cada ano.'] },
  { id: 'embaixador', nome: 'Embaixador', descricao: 'Ajuda a desenvolver a comunidade e a programação.',
    requisitos: ['180 milhas no ciclo de 12 meses', '6 encontros', '2 contribuições diferentes', '12 meses como Conector'],
    detalhes: ['A organização avalia e você aceita o convite.', 'Revalidação a cada ano.'] },
];
const FORA: Record<string, string> = { fundadora: 'Fundadora', organizador: 'Organização', convidado: 'Convidado', kids: 'Kids' };
type Etapa = typeof ETAPAS[number];

// Selo ampliado: entra com zoom, gira e mostra no verso o que a etapa pede.
function SeloDetalhe({ etapa, estado, fechar }: { etapa: Etapa; estado: string; fechar: () => void }) {
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botao.current?.focus();
    const tecla = (event: KeyboardEvent) => { if (event.key === 'Escape') fechar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [fechar]);
  return createPortal(
    <div className="selo-zoom" role="dialog" aria-modal="true" aria-label={`Etapa ${etapa.nome}`} onClick={fechar}>
      <div className="selo-zoom__cartao" onClick={(event) => event.stopPropagation()}>
        <div className="selo-zoom__giro">
          <div className="selo-zoom__frente"><img src={seloUrl(etapa.id)} alt="" /></div>
          <div className="selo-zoom__verso">
            <button ref={botao} type="button" className="selo-zoom__fechar" onClick={fechar} aria-label="Fechar"><X size={18} aria-hidden="true" /></button>
            <span>{estado}</span>
            <h2>{etapa.nome}</h2>
            <p>{etapa.descricao}</p>
            {etapa.requisitos && <><h3>O que é preciso</h3><ul className="selo-zoom__lista">{etapa.requisitos.map((item) => <li key={item}>{item}</li>)}</ul></>}
            <ul className="selo-zoom__notas">{etapa.detalhes.map((item) => <li key={item}>{item}</li>)}</ul>
            {etapa.requisitos && <p className="selo-zoom__aviso">Milhas sozinhas não mudam o nível.</p>}
          </div>
        </div>
      </div>
    </div>, document.body
  );
}

export function TrilhaPrograma({ categoria, previa }: { categoria: string; previa: boolean }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const indice = ETAPAS.findIndex((etapa) => etapa.id === categoria);
  const atual = ETAPAS[indice];
  const estado = (n: number) => n === indice ? 'Você está aqui' : n < indice ? 'Etapa anterior' : indice < 0 ? `Etapa ${n + 1}` : n === indice + 1 ? 'Próxima etapa' : 'Mais adiante';
  return <>
    <header className="passe__rede-titulo"><TrendingUp size={28} aria-hidden="true" /><h1>Minha jornada</h1></header>
    <p>Uma trajetória de participação, contribuição e reconhecimento.</p>
    {previa && <p className="passe__previa-aviso" role="status">Prévia de Membro. Sua categoria e seu histórico permanecem iguais.</p>}
    <section className="passe__programa-atual" aria-label="Seu papel na comunidade">
      {atual || categoria === 'fundadora' ? <img src={seloUrl(categoria)} alt={`Selo ${atual?.nome || 'Fundadora'}`} /> : <Flag size={30} aria-hidden="true" />}
      <div><span>{previa ? 'NÍVEL NA PRÉVIA' : 'SEU PAPEL NA COMUNIDADE'}</span><h2>{atual?.nome || FORA[categoria] || categoria}</h2><p>{categoria === 'fundadora' ? 'Quem plantou esta comunidade.' : atual?.descricao || 'Seu papel tem condições próprias, fora da sequência de níveis abaixo.'}</p></div>
    </section>
    <p className="passe__programa-dica">Toque em um selo para ver o que cada etapa pede.</p>
    <ol className="passe__programa-trilha" aria-label="Etapas do programa">
      {ETAPAS.map((etapa, n) => <li key={etapa.id} className={`${n === indice ? 'is-atual' : n < indice ? 'is-anterior' : 'is-proxima'}`} aria-current={n === indice ? 'step' : undefined}>
        <span className="passe__programa-passo" aria-hidden="true">{n + 1}</span>
        <button type="button" className="passe__programa-etapa" onClick={() => setAberta(n)} aria-haspopup="dialog">
          <img src={seloUrl(etapa.id)} alt={`Selo ${etapa.nome}`} />
          <div><span className="passe__programa-estado">{estado(n)}</span><h3>{etapa.nome}</h3><p>{etapa.descricao}</p><em>Ver detalhes</em></div>
        </button>
      </li>)}
    </ol>
    {aberta !== null && <SeloDetalhe etapa={ETAPAS[aberta]} estado={estado(aberta)} fechar={() => setAberta(null)} />}
  </>;
}
