import { StyleSheet, View } from 'react-native';

import { alerta, brand, raio } from '@/theme';

import { Icone } from './icone';
import { Texto } from './texto';

type Props = {
  /** Até 6 palavras (RB17): o aviso de verdade é o som e a vibração. */
  titulo: string;
  linha?: string;
};

/** Banner âmbar de ponto crítico: ícone + título curto + uma linha. */
export function BannerAlerta({ titulo, linha }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <View style={styles.icone}>
        <Icone nome="alerta" tamanho={30} cor={alerta.atencao} espessura={2.4} />
      </View>
      <View style={styles.textos}>
        <Texto variante="alerta" cor={brand.asfalto} style={styles.titulo}>
          {titulo}
        </Texto>
        {linha ? (
          <Texto variante="legenda" cor={brand.asfalto} style={styles.linha}>
            {linha}
          </Texto>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: alerta.atencao,
    borderRadius: raio.cartao,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  icone: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: brand.asfalto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: 2 },
  titulo: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, lineHeight: 26 },
  linha: { fontFamily: 'BricolageGrotesque_600SemiBold' },
});
