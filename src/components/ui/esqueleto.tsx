import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { usePulso } from '@/lib/movimento';
import { useTema } from '@/lib/tema';
import { raio } from '@/theme';

type Props = { largura?: DimensionValue; altura?: number; raioBorda?: number };

/** Bloco que pulsa de leve no lugar de um conteúdo que ainda está carregando. */
export function Esqueleto({ largura = '100%', altura = 16, raioBorda = 8 }: Props) {
  const { c } = useTema();
  const pulso = usePulso(900);
  const animado = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * pulso.get() }));
  return <Animated.View style={[{ width: largura, height: altura, borderRadius: raioBorda, backgroundColor: c.superficieElevada }, animado]} />;
}

/** Lista de pontos carregando: a mesma forma do item de verdade, para a tela não pular. */
export function EsqueletoLista({ itens = 4, rotulo }: { itens?: number; rotulo: string }) {
  const { c } = useTema();
  return (
    <View style={styles.lista} accessible accessibilityRole="progressbar" accessibilityLabel={rotulo}>
      {Array.from({ length: itens }, (_, i) => (
        <View key={i} style={[styles.item, { backgroundColor: c.superficie, borderColor: c.fio }]}>
          <Esqueleto largura={36} altura={36} raioBorda={12} />
          <View style={styles.textos}>
            <Esqueleto largura={`${70 - i * 8}%`} altura={16} />
            <Esqueleto largura={`${88 - i * 6}%`} altura={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingHorizontal: 16, borderRadius: raio.xl, borderWidth: 1 },
  textos: { flex: 1, gap: 8 },
});
