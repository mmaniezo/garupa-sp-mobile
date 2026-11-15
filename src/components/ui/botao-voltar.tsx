import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/tema';
import { brand, raio } from '@/theme';

import { Icone } from './icone';
import { Texto } from './texto';

type Props = {
  onPress: () => void;
  /** Texto visível ao lado da seta. */
  rotulo?: string;
  /** Explica ao leitor de tela para onde volta (ex.: "o turno continua"). */
  dica?: string;
};

/**
 * Voltar com seta e texto, em pílula: mais fácil de achar e de entender do que só a seta
 * (pensado também para quem não usa o botão de voltar do celular).
 */
export function BotaoVoltar({ onPress, rotulo = 'Voltar', dica }: Props) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityHint={dica}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: c.superficie, borderColor: c.divisor },
        pressed && { opacity: 0.82 },
      ]}>
      <View style={styles.circulo}>
        <Icone nome="voltar" tamanho={20} cor={brand.asfalto} espessura={2.6} />
      </View>
      <Texto variante="botao" style={{ fontSize: 17 }}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingLeft: 6,
    paddingRight: 18,
    borderRadius: raio.pilula,
    borderWidth: 1,
  },
  circulo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
