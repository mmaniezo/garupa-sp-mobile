import { useSyncExternalStore } from 'react';

/** Estado global mínimo, sem biblioteca: um valor, quem escuta e um hook. */
export function criarStore<T>(inicial: T) {
  let estado = inicial;
  const ouvintes = new Set<() => void>();

  const store = {
    obter: () => estado,
    definir(proximo: T | ((atual: T) => T)) {
      estado = typeof proximo === 'function' ? (proximo as (atual: T) => T)(estado) : proximo;
      ouvintes.forEach((o) => o());
    },
    assinar(ouvinte: () => void) {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
  };

  function useStore(): T {
    return useSyncExternalStore(store.assinar, store.obter, store.obter);
  }

  return { ...store, useStore };
}
