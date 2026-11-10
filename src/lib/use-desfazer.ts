import { useEffect, useRef, useState } from 'react';

/**
 * Ação com alguns segundos para desfazer (relato e SOS manual).
 * O relógio roda num intervalo, fora do render; ao chegar a zero, chama `aoConcluir`.
 */
export function useDesfazer<T>(segundos: number, aoConcluir: (valor: T) => void) {
  const [pendente, setPendente] = useState<{ valor: T; restante: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const concluir = useRef(aoConcluir);

  useEffect(() => {
    concluir.current = aoConcluir;
  }, [aoConcluir]);

  const parar = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => parar, []);

  function iniciar(valor: T) {
    parar();
    let restante = segundos;
    setPendente({ valor, restante });
    timer.current = setInterval(() => {
      restante -= 1;
      if (restante <= 0) {
        parar();
        setPendente(null);
        concluir.current(valor);
      } else {
        setPendente({ valor, restante });
      }
    }, 1000);
  }

  function desfazer() {
    parar();
    setPendente(null);
  }

  return { pendente, iniciar, desfazer };
}
