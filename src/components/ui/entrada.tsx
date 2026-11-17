import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { mola, useEntrada } from '@/lib/movimento';

type PropsEntrada = Omit<ViewProps, 'style'> & {
  children?: ReactNode;
  /** Posição na cascata da tela: 0 entra primeiro. */
  ordem?: number;
  distancia?: number;
  style?: StyleProp<ViewStyle>;
};

/** Bloco que entra na tela subindo e aparecendo, em cascata com os outros. */
export function Entrada({ children, ordem = 0, distancia, style, ...rest }: PropsEntrada) {
  const animado = useEntrada(ordem, distancia);
  return (
    <Animated.View {...rest} style={[style, animado]}>
      {children}
    </Animated.View>
  );
}

type PropsSurgir = { children?: ReactNode; style?: StyleProp<ViewStyle> };

/** Algo pequeno que "nasce" com mola (o ✓ de um item marcado, um selo). */
export function Surgir({ children, style }: PropsSurgir) {
  const reduzido = useReducedMotion();
  const p = useSharedValue(reduzido ? 1 : 0);
  useEffect(() => {
    p.set(withSpring(1, mola.viva));
  }, [p]);
  const animado = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.get() * 2),
    transform: [{ scale: 0.4 + 0.6 * p.get() }],
  }));
  return <Animated.View style={[style, animado]}>{children}</Animated.View>;
}
