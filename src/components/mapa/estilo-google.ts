import type { MapStyleElement } from 'react-native-maps';

/**
 * Google Maps no tom Asfalto do manual da marca: fundo escuro, ruas discretas, rótulos em
 * cinza claro e sem pontos de interesse, para os pontos críticos (âmbar) e você (teal)
 * serem o que se destaca. Teal e âmbar não aparecem no mapa base.
 */
export const ESTILO_MAPA_ESCURO: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#14191C' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A949A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111417' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3A444A' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#B7C0C5' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#8A949A' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#152019' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262E33' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#161C20' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9AA4A9' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2E373C' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3A444A' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1E262B' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#C9D0D4' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B1F26' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4E6A73' }] },
];

/** Tema claro: fundo no tom Neblina, ruas brancas, rótulos em cinza do manual, sem pontos de interesse. */
export const ESTILO_MAPA_CLARO: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#EEF1F2' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5B666D' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F4F6F7' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#C9D1D5' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#3D474D' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#DCEBDD' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#DDE2E4' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5B666D' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#C9D1D5' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#3D474D' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C7DEE5' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4E6A73' }] },
];
