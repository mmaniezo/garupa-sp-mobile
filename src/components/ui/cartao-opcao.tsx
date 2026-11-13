import { Pressable, StyleSheet, View } from 'react-native';

import { useEstilos } from '@/lib/tema';
import { brand, raio, type Paleta } from '@/theme';

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
  const styles = useEstilos(criarEstilos);
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
        {selecionado ? <Icone nome="check" tamanho={18} cor={styles.cores.check} espessura={3} /> : null}
      </View>
      {descricao ? (
        <Texto variante="legenda" cor="textoSecundario">
          {descricao}
        </Texto>
      ) : null}
    </Pressable>
  );
}

const criarEstilos = (c: Paleta) => ({
  cores: { check: c.link },
  ...StyleSheet.create({
  base: {
    minHeight: 88,
    borderRadius: raio.xl,
    borderWidth: 2,
    padding: 12,
    gap: 4,
    flexGrow: 1,
    flexBasis: '45%',
  },
  normal: { borderColor: c.borda, backgroundColor: c.superficie },
  selecionado: { borderColor: brand.teal, backgroundColor: c.selecionadoFundo },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  titulo: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 17, lineHeight: 21, flexShrink: 1 },
  }),
});
