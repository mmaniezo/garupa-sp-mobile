import { MapaEsquematico } from './mapa-esquematico';
import type { PropsMapaPontos, TipoDeMapa } from './tipos';

/** Na web (prévia das telas), o react-native-maps não roda: fica o mapa esquemático. */
export const tipoDoMapa: TipoDeMapa = 'esquematico';

export function MapaPontos(props: PropsMapaPontos) {
  return <MapaEsquematico {...props} />;
}
