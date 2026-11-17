import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';

import { usePulso } from '@/lib/movimento';

type Props = {
  cor: string;
  /** Diâmetro de onde a onda nasce (o do anel ou do objeto no centro). */
  tamanho: number;
  quantidade?: number;
  /** Tempo de uma onda, em ms. */
  duracao?: number;
  /** Até quanto a onda cresce (1,5 = uma vez e meia o tamanho). */
  ate?: number;
  ativo?: boolean;
};

function Onda({ cor, tamanho, duracao, atraso, ate, ativo }: Required<Omit<Props, 'quantidade'>> & { atraso: number }) {
  const p = usePulso(duracao, ativo, false, atraso);
  const animado = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - p.get()),
    transform: [{ scale: 1 + (ate - 1) * p.get() }],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', width: tamanho, height: tamanho, borderRadius: tamanho / 2, borderWidth: 2, borderColor: cor }, animado]}
    />
  );
}

/**
 * Ondas que saem de um centro, como um radar: dizem "isto está ligado, de olho".
 * Vai atrás do conteúdo, centralizada no pai. Com "reduzir movimento", vira um halo parado.
 */
export function Ondas({ cor, tamanho, quantidade = 2, duracao = 2800, ate = 1.5, ativo = true }: Props) {
  const reduzido = useReducedMotion();
  return (
    <View style={styles.camada} aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {reduzido || !ativo ? (
        <View
          style={{
            position: 'absolute',
            width: tamanho * 1.14,
            height: tamanho * 1.14,
            borderRadius: tamanho,
            borderWidth: 2,
            borderColor: cor,
            opacity: 0.25,
          }}
        />
      ) : (
        Array.from({ length: quantidade }, (_, i) => (
          <Onda key={i} cor={cor} tamanho={tamanho} duracao={duracao} atraso={(i * duracao) / quantidade} ate={ate} ativo />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  camada: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
});
