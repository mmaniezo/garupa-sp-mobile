import { StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/tema';
import { altura, brand, raio } from '@/theme';

import { Surgir } from './entrada';
import { Icone } from './icone';
import { Pressionavel } from './pressionavel';
import { Texto } from './texto';

type Props = {
  rotulo: string;
  selecionado: boolean;
  onPress: () => void;
  /** 'multipla' anuncia como caixa de seleção; 'unica' como opção de rádio. */
  escolha?: 'multipla' | 'unica';
  formato?: 'pilula' | 'bloco';
  desabilitado?: boolean;
};

/**
 * Opção que liga e desliga (horários, dias, tipo sanguíneo, distritos escolhidos).
 * Selecionado: fundo teal e um ✓, para não depender só da cor.
 */
export function Chip({
  rotulo,
  selecionado,
  onPress,
  escolha = 'multipla',
  formato = 'pilula',
  desabilitado,
}: Props) {
  const { c } = useTema();
  return (
    <Pressionavel
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole={escolha === 'unica' ? 'radio' : 'checkbox'}
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: selecionado, disabled: !!desabilitado }}
      hitSlop={4}
      toque="selecao"
      escala={0.94}
      opacidade={desabilitado ? 0.45 : 1}
      style={[
        styles.base,
        formato === 'bloco' ? styles.bloco : styles.pilula,
        selecionado ? styles.selecionado : [styles.normal, { borderColor: c.borda }],
      ]}>
      <View style={styles.linha}>
        <Texto
          variante="corpoMenor"
          style={{ fontFamily: selecionado ? 'BricolageGrotesque_700Bold' : 'BricolageGrotesque_600SemiBold' }}
          cor={selecionado ? brand.asfalto : c.texto}>
          {rotulo}
        </Texto>
        {selecionado ? (
          <Surgir>
            <Icone nome="check" tamanho={16} cor={brand.asfalto} espessura={3} />
          </Surgir>
        ) : null}
      </View>
    </Pressionavel>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: altura.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  pilula: { borderRadius: raio.pilula, paddingHorizontal: 14 },
  bloco: { borderRadius: raio.md, paddingHorizontal: 8, flexGrow: 1, flexBasis: 0 },
  normal: { backgroundColor: 'transparent' },
  selecionado: { backgroundColor: brand.teal, borderColor: brand.teal },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
