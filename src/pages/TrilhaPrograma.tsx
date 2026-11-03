import { Flag, TrendingUp } from 'lucide-react';
const ETAPAS = [
  { id: 'visitante', nome: 'Visitante', descricao: 'Primeiro contato com a comunidade.' },
  { id: 'membro', nome: 'Membro', descricao: 'Participa dos encontros e constrói sua história.' },
  { id: 'conector', nome: 'Conector', descricao: 'Acolhe e aproxima pessoas com interesses em comum.' },
  { id: 'embaixador', nome: 'Embaixador', descricao: 'Ajuda a desenvolver a comunidade e a programação.' },
];
const FORA: Record<string, string> = { fundadora: 'Fundadora', organizador: 'Organização', convidado: 'Convidado', kids: 'Kids' };

export function TrilhaPrograma({ categoria, previa }: { categoria: string; previa: boolean }) {
  const indice = ETAPAS.findIndex((etapa) => etapa.id === categoria);
  const atual = ETAPAS[indice];
  const proximo = indice >= 0 ? ETAPAS[indice + 1] : null;
  return <>
    <header className="passe__rede-titulo"><TrendingUp size={28} aria-hidden="true" /><h1>Programa</h1></header>
    <p>Uma trajetória de participação, contribuição e reconhecimento.</p>
    {previa && <p className="passe__previa-aviso" role="status">Prévia de Membro. Sua categoria e seu histórico permanecem iguais.</p>}
    <section className="passe__programa-atual" aria-label="Seu papel na comunidade">
      {atual || categoria === 'fundadora' ? <img src={`/selos/postal-${categoria}.png`} alt={`Selo ${atual?.nome || 'Fundadora'}`} /> : <Flag size={30} aria-hidden="true" />}
      <div><span>{previa ? 'NÍVEL NA PRÉVIA' : 'SEU PAPEL NA COMUNIDADE'}</span><h2>{atual?.nome || FORA[categoria] || categoria}</h2><p>{categoria === 'fundadora' ? 'Quem plantou esta comunidade.' : atual?.descricao || 'Seu papel tem condições próprias, fora da sequência de níveis abaixo.'}</p></div>
    </section>
    <section className="passe__programa-proximo">
      <span>{proximo ? 'PRÓXIMA ETAPA' : indice === ETAPAS.length - 1 ? 'CONTINUE SUA TRAJETÓRIA' : 'CONHEÇA A TRILHA'}</span>
      <h2>{proximo?.nome || (indice === ETAPAS.length - 1 ? 'Seu papel continua em movimento' : 'Da primeira visita às contribuições para a comunidade')}</h2>
      <p>{proximo ? proximo.descricao : 'Cada etapa representa uma forma de participar e contribuir.'}</p>
      <p className="passe__aviso">Conector: 60 pontos no ciclo de 12 meses, 4 encontros e 1 contribuição de conexão. Embaixador: 180 pontos, 6 encontros, 2 contribuições diferentes e 12 meses como Conector. A organização avalia cada progressão; pontos sozinhos não mudam o nível.</p>
    </section>
    <ol className="passe__programa-trilha" aria-label="Etapas do programa">
      {ETAPAS.map((etapa, n) => <li key={etapa.id} className={`${n === indice ? 'is-atual' : n < indice ? 'is-anterior' : 'is-proxima'}`} aria-current={n === indice ? 'step' : undefined}>
        <span className="passe__programa-passo" aria-hidden="true">{n + 1}</span>
        <div className="passe__programa-etapa"><img src={`/selos/postal-${etapa.id}.png`} alt={`Selo ${etapa.nome}`} />
          <div><span className="passe__programa-estado">{n === indice ? 'Você está aqui' : n < indice ? 'Etapa anterior' : indice < 0 ? `Etapa ${n + 1}` : n === indice + 1 ? 'Próxima etapa' : 'Mais adiante'}</span><h3>{etapa.nome}</h3><p>{etapa.descricao}</p></div>
        </div>
      </li>)}
    </ol>
  </>;
}
