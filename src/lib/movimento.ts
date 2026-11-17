import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Movimento do app, num lugar só. Regras:
 * - Animação explica o que mudou (entrou, foi tocado, foi escolhido); nunca atrasa uma ação.
 * - Tudo curto: toque responde na hora, entrada de tela termina em menos de meio segundo.
 * - Quem pediu "reduzir movimento" no celular não vê deslocamento nem laço: só o estado final.
 * - Telas de emergência (queda, SOS) não ganham nada que atrapalhe ler ou tocar.
 */
export const mola = {
  /** Resposta ao toque: firme, sem balanço. */
  toque: { mass: 0.6, damping: 26, stiffness: 520 },
  /** Algo que "nasce" (✓, selo, ícone da aba): passa um pouco do ponto e assenta. */
  viva: { mass: 0.7, damping: 13, stiffness: 260 },
  /** Algo que desliza de um lugar a outro (indicador da aba, opção do seletor). */
  desliza: { mass: 0.8, damping: 22, stiffness: 260 },
} as const;

export const tempo = {
  rapido: 160,
  medio: 260,
  entrada: 460,
  /** Intervalo entre um bloco e o próximo quando a tela entra em cascata. */
  cascata: 55,
} as const;

/** Desacelera no fim: o que entra chega rápido e pousa devagar. */
export const curvaEntrada = Easing.bezier(0.16, 1, 0.3, 1);
export const curvaVaiEVolta = Easing.inOut(Easing.quad);

export type Toque = 'leve' | 'medio' | 'selecao' | 'sucesso' | 'nenhum';

/** Resposta tátil curta ao tocar. Sem efeito na web e em aparelho sem motor de vibração. */
export function vibrar(toque: Toque): void {
  if (toque === 'nenhum' || Platform.OS === 'web') return;
  const pedido =
    toque === 'selecao'
      ? Haptics.selectionAsync()
      : toque === 'sucesso'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(toque === 'medio' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  pedido.catch(() => undefined);
}

/**
 * Entrada de um bloco na tela: sobe alguns pontos e aparece. `ordem` atrasa o bloco para a
 * tela entrar em cascata (0 = primeiro).
 */
export function useEntrada(ordem = 0, distancia = 16) {
  const reduzido = useReducedMotion();
  const p = useSharedValue(reduzido ? 1 : 0);
  useEffect(() => {
    p.set(withDelay(Math.min(ordem, 10) * tempo.cascata, withTiming(1, { duration: tempo.entrada, easing: curvaEntrada })));
  }, [p, ordem]);
  return useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * distancia }],
  }));
}

/**
 * Valor que vai de 0 a 1 em laço (respiração, onda). Com "reduzir movimento" ou `ativo`
 * desligado, fica parado em 0.
 */
export function usePulso(duracao = 2400, ativo = true, vaiEVolta = true, atraso = 0): SharedValue<number> {
  const reduzido = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!ativo || reduzido) {
      p.set(0);
      return;
    }
    p.set(
      withDelay(
        atraso,
        withRepeat(withTiming(1, { duration: duracao, easing: vaiEVolta ? curvaVaiEVolta : Easing.out(Easing.quad) }), -1, vaiEVolta),
      ),
    );
    return () => cancelAnimation(p);
  }, [p, duracao, ativo, vaiEVolta, atraso, reduzido]);
  return p;
}
