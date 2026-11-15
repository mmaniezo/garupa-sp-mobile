import { useEffect, useRef, useState } from 'react';

/**
 * Ação com alguns segundos para desfazer (relato e SOS manual).
 * O relógio roda num intervalo, fora do render; ao chegar a zero, chama `aoConcluir`.
 * `enviarAgora` não espera o fim da contagem (quem tem pressa não fica parado olhando o relógio).
 */
export function useDesfazer<T>(segundos: number, aoConcluir: (valor: T) => void) {
  const [pendente, setPendente] = useState<{ valor: T; restante: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const valorAtual = useRef<{ valor: T } | null>(null);
  const concluir = useRef(aoConcluir);

  useEffect(() => {
    concluir.current = aoConcluir;
  }, [aoConcluir]);

  const parar = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => parar, []);

  /** Para a contagem e envia (uma vez só, mesmo com dois toques seguidos). */
  function finalizar() {
    const atual = valorAtual.current;
    parar();
    valorAtual.current = null;
    setPendente(null);
    if (atual) concluir.current(atual.valor);
  }

  function iniciar(valor: T) {
    parar();
    let restante = segundos;
    valorAtual.current = { valor };
    setPendente({ valor, restante });
    timer.current = setInterval(() => {
      restante -= 1;
      if (restante <= 0) finalizar();
      else setPendente({ valor, restante });
    }, 1000);
  }

  function desfazer() {
    parar();
    valorAtual.current = null;
    setPendente(null);
  }

  return { pendente, total: segundos, iniciar, desfazer, enviarAgora: finalizar };
}
