import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { usePulso } from '@/lib/movimento';
import { useTema } from '@/lib/tema';
import { brand } from '@/theme';

const ALTURA = 420;

type Props = {
  /** Cor da luz. Padrão: o teal da marca. Telas de estado passam a cor do estado (verde no turno ativo). */
  cor?: string;
  /** 0 a 1: quanto a luz aparece. */
  forca?: number;
};

/**
 * Luz suave no topo da tela, na cor da marca, que respira bem devagar. É só ambiente:
 * fica atrás de tudo, não pega toque e é fraca o bastante para não mexer no contraste do texto.
 */
export function Aurora({ cor = brand.teal, forca = 1 }: Props) {
  const { nome } = useTema();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pulso = usePulso(5200);
  const animado = useAnimatedStyle(() => ({ opacity: 0.72 + 0.28 * pulso.get() }));
  const base = (nome === 'claro' ? 0.2 : 0.26) * forca;

  return (
    <Animated.View style={[styles.camada, animado]} aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width="100%" height={ALTURA}>
        <Defs>
          <RadialGradient id={`${id}a`} cx="92%" cy="0%" rx="85%" ry="62%" fx="92%" fy="0%">
            <Stop offset="0" stopColor={cor} stopOpacity={base} />
            <Stop offset="1" stopColor={cor} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}b`} cx="0%" cy="8%" rx="60%" ry="46%" fx="0%" fy="8%">
            <Stop offset="0" stopColor={cor} stopOpacity={base * 0.5} />
            <Stop offset="1" stopColor={cor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={ALTURA} fill={`url(#${id}a)`} />
        <Rect x="0" y="0" width="100%" height={ALTURA} fill={`url(#${id}b)`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  camada: { position: 'absolute', top: 0, left: 0, right: 0, height: ALTURA, pointerEvents: 'none' },
});
