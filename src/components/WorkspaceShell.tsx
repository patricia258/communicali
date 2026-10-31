import type { ReactNode } from 'react';

/** O CALI Forms veio do app com esta moldura; aqui a moldura é a do Admin, que já envolve a página. */
export function Shell({ children }: { role?: string; children: ReactNode }) {
  return <>{children}</>;
}
