/* Memória da área do membro: o que já veio do servidor fica guardado enquanto a página está aberta.
   Ao voltar para uma aba, a tela aparece pronta e só se atualiza por trás, sem texto ou botão surgindo depois. */
import { useEffect, useState } from 'react';

const memoria = new Map<string, unknown>();
const pendentes = new Map<string, Promise<unknown>>();

/** Busca de novo e guarda o resultado. Se a mesma busca já está em andamento, aproveita a que existe. */
export function buscar<T>(chave: string, fonte: () => PromiseLike<T>): Promise<T> {
  const andamento = pendentes.get(chave) as Promise<T> | undefined;
  if (andamento) return andamento;
  const promessa = Promise.resolve(fonte()).then(
    (valor) => { memoria.set(chave, valor); pendentes.delete(chave); return valor; },
    (falha) => { pendentes.delete(chave); throw falha; },
  );
  pendentes.set(chave, promessa);
  return promessa;
}

export const lembrado = <T,>(chave: string) => memoria.get(chave) as T | undefined;
export const guardar = <T,>(chave: string, valor: T) => { memoria.set(chave, valor); };
export const esquecerTudo = () => { memoria.clear(); pendentes.clear(); };

/** Estado que começa com o valor guardado e se atualiza ao abrir a tela. */
export function useLembrado<T>(chave: string, fonte: () => PromiseLike<T>): [T | undefined, (valor: T) => void] {
  const [valor, setValor] = useState<T | undefined>(() => lembrado<T>(chave));
  useEffect(() => {
    let ativo = true;
    buscar(chave, fonte).then((novo) => { if (ativo) setValor(novo); }).catch(() => null);
    return () => { ativo = false; };
  }, [chave]);
  return [valor, (novo: T) => { guardar(chave, novo); setValor(novo); }];
}

/** Baixa as fotos antes de a tela abrir, para elas não aparecerem uma a uma. */
export function preCarregarFotos(urls: Array<string | null | undefined>) {
  for (const url of new Set(urls.filter(Boolean) as string[])) { const imagem = new Image(); imagem.decoding = 'async'; imagem.src = url; }
}
