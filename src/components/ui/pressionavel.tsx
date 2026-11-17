import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { mola, vibrar, type Toque } from '@/lib/movimento';

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Quanto encolhe ao ser tocado (1 = não encolhe). Itens largos usam 0,98; botões, 0,96. */
  escala?: number;
  /** Resposta tátil ao tocar. */
  toque?: Toque;
  /** Opacidade em repouso (0,45 para desabilitado). Ao tocar, escurece um pouco a partir dela. */
  opacidade?: number;
};

/**
 * Base de tudo o que é tocável: encolhe de leve sob o dedo e volta com mola, com um toque
 * tátil curto. A resposta é imediata (não espera a animação para chamar o onPress).
 */
export function Pressionavel({
  children,
  style,
  escala = 0.96,
  toque = 'leve',
  opacidade = 1,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const p = useSharedValue(0);
  const animado = useAnimatedStyle(() => ({
    opacity: opacidade * (1 - 0.14 * p.get()),
    transform: [{ scale: 1 - (1 - escala) * p.get() }],
  }));

  return (
    <PressableAnimado
      {...rest}
      onPressIn={(e) => {
        p.set(withSpring(1, mola.toque));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.set(withSpring(0, mola.toque));
        onPressOut?.(e);
      }}
      onPress={
        onPress
          ? (e) => {
              vibrar(toque);
              onPress(e);
            }
          : undefined
      }
      style={[style, animado]}>
      {children}
    </PressableAnimado>
  );
}
