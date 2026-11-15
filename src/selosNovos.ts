// Selos do kit novo (convidado, visitante, membro, conector, embaixador). Quem ainda não tem selo novo (fundadora, organização) cai no antigo.
const NOVOS = ['convidado', 'visitante', 'membro', 'conector', 'embaixador'];
export const seloUrl = (categoria: string) => NOVOS.includes(categoria) ? `/selos/novo/${categoria}.svg` : `/selos/postal-${categoria === 'organizador' ? 'fundadora' : categoria}.png`;
