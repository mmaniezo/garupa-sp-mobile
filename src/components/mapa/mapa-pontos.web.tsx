import { StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/tema';
import { alerta, brand } from '@/theme';

import { MapaEsquematico } from './mapa-esquematico';
import type { PropsMapaPontos, TipoDeMapa } from './tipos';

/** Na web (prévia das telas), o react-native-maps não roda: fica o mapa esquemático. */
export const tipoDoMapa: TipoDeMapa = 'esquematico';

export function MapaPontos(props: PropsMapaPontos) {
  return <MapaEsquematico {...props} />;
}

/** Na web, um quadro com o pino no lugar do mapa pequeno da posição. */
export function MapaPosicao({ altura, rotulo }: { lat: number; lon: number; altura: number; rotulo: string }) {
  const { c } = useTema();
  return (
    <View style={[styles.quadro, { height: altura, backgroundColor: c.mapaFundo }]} accessibilityLabel={rotulo}>
      <View style={styles.pino} />
    </View>
  );
}

const styles = StyleSheet.create({
  quadro: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pino: { width: 20, height: 20, borderRadius: 10, backgroundColor: alerta.emergencia, borderWidth: 3, borderColor: brand.branco },
});
