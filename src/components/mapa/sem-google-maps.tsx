import { Linking, StyleSheet, View } from 'react-native';

import { Botao, Icone, Texto } from '@/components/ui';
import { linkGoogleMaps } from '@/domain/sms';
import { useTema } from '@/lib/tema';

type Props = { altura: number; lat?: number; lon?: number; compacto?: boolean };

/**
 * Build Android sem a chave do Google Maps: em vez de um mapa desenhado (que não mostraria o
 * lugar de verdade), avisa e abre o ponto no app do Google Maps.
 */
export function SemGoogleMaps({ altura, lat, lon, compacto }: Props) {
  const { c } = useTema();
  return (
    <View style={[styles.caixa, { height: altura, backgroundColor: c.mapaFundo }]}>
      <Icone nome="mapa" tamanho={compacto ? 22 : 30} cor={c.textoSecundario} />
      <Texto variante="legenda" cor="textoSecundario" centro style={{ maxWidth: 280 }}>
        O mapa do Google não está ativado neste build (falta a chave do Google Maps).
      </Texto>
      {lat !== undefined && lon !== undefined ? (
        <Botao
          titulo="Ver no Google Maps"
          variante="link"
          tamanho="compacto"
          larguraTotal={false}
          onPress={() => void Linking.openURL(linkGoogleMaps(lat, lon))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16 },
});
