import { Coffee, Compass, Heart, Lightbulb, Luggage, MessageCircle, Mountain, Plane, Route, Sprout, Star, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Os 12 avatares de quem deixa um recado: círculo com degradê suave e símbolo branco de traço fino. */
export const AVATARES: Array<{ id: string; nome: string; Icone: LucideIcon }> = [
  { id: 'bagagem', nome: 'Bagagem', Icone: Luggage },
  { id: 'aviao', nome: 'Avião', Icone: Plane },
  { id: 'trilha', nome: 'Trilha', Icone: Route },
  { id: 'estrela', nome: 'Estrela', Icone: Star },
  { id: 'cafe', nome: 'Café', Icone: Coffee },
  { id: 'coracao', nome: 'Coração', Icone: Heart },
  { id: 'bussola', nome: 'Bússola', Icone: Compass },
  { id: 'sol', nome: 'Sol', Icone: Sun },
  { id: 'planta', nome: 'Planta', Icone: Sprout },
  { id: 'ideia', nome: 'Ideia', Icone: Lightbulb },
  { id: 'montanha', nome: 'Montanha', Icone: Mountain },
  { id: 'conversa', nome: 'Conversa', Icone: MessageCircle },
];

export function AvatarRecado({ tipo, tamanho = 42 }: { tipo?: string | null; tamanho?: number }) {
  const item = AVATARES.find((a) => a.id === tipo) || AVATARES[AVATARES.length - 1];
  const { Icone } = item;
  return <span className={`av-recado av-recado--${item.id}`} style={{ width: tamanho, height: tamanho }} aria-hidden="true"><Icone size={Math.round(tamanho * 0.5)} strokeWidth={1.5} /></span>;
}
