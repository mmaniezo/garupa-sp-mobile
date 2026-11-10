import { Pressable, StyleSheet, View } from 'react-native';

import { brand, raio, tons } from '@/theme';

import { Icone } from './icone';
import { Texto } from './texto';

type Props = {
  titulo: string;
  descricao?: string;
  selecionado: boolean;
  onPress: () => void;
};

/** Cartão de múltipla escolha ("Como você usa a moto no dia a dia?"). */
export function CartaoOpcao({ titulo, descricao, selecionado, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={descricao ? `${titulo}. ${descricao}` : titulo}
      accessibilityState={{ checked: selecionado }}
      style={({ pressed }) => [
        styles.base,
        selecionado ? styles.selecionado : styles.normal,
        pressed && { opacity: 0.85 },
      ]}>
      <View style={styles.topo}>
        <Texto variante="corpo" style={styles.titulo}>
          {titulo}
        </Texto>
        {selecionado ? <Icone nome="check" tamanho={18} cor={brand.teal} espessura={3} /> : null}
      </View>
      {descricao ? (
        <Texto variante="legenda" cor="textoSecundario">
          {descricao}
        </Texto>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 88,
    borderRadius: raio.xl,
    borderWidth: 2,
    padding: 12,
    gap: 4,
    flexGrow: 1,
    flexBasis: '45%',
  },
  normal: { borderColor: tons.borda, backgroundColor: tons.superficie },
  selecionado: { borderColor: brand.teal, backgroundColor: tons.tealSelecionadoFundo },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  titulo: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 17, lineHeight: 21, flexShrink: 1 },
});
