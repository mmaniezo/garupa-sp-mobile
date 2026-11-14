import type { PropsMapaPontos, TipoDeMapa } from './tipos';

/**
 * Prévia web: o react-native-maps não roda no navegador, então o mapa é o Google Maps em HTML
 * (o "incorporar mapa" do próprio Google, gratuito e sem chave), com o ponto escolhido marcado.
 */
export const tipoDoMapa: TipoDeMapa = 'embed';

function urlGoogleMaps(lat: number, lon: number, zoom: number): string {
  return `https://maps.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}&z=${zoom}&hl=pt-BR&output=embed`;
}

function MapaGoogle({ lat, lon, zoom, largura, altura, titulo }: { lat: number; lon: number; zoom: number; largura: number | string; altura: number; titulo: string }) {
  return (
    <iframe
      title={titulo}
      src={urlGoogleMaps(lat, lon, zoom)}
      style={{ width: largura, height: altura, border: 0, display: 'block' }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export function MapaPontos({ pontos, destaqueId, posicao, largura, altura }: PropsMapaPontos) {
  const alvo = pontos.find((p) => p.celulaId === destaqueId) ?? pontos[0];
  const lat = alvo?.centroLat ?? posicao?.lat ?? -23.56;
  const lon = alvo?.centroLon ?? posicao?.lon ?? -46.64;
  return (
    <MapaGoogle
      key={`${lat},${lon}`}
      lat={lat}
      lon={lon}
      zoom={15}
      largura={largura}
      altura={altura}
      titulo={alvo ? `Google Maps: ponto crítico em ${alvo.viaReferencia}` : 'Google Maps'}
    />
  );
}

export function MapaPosicao({ lat, lon, altura, rotulo }: { lat: number; lon: number; altura: number; rotulo: string; titulo?: string; detalhe?: string }) {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden' }}>
      <MapaGoogle lat={lat} lon={lon} zoom={16} largura="100%" altura={altura} titulo={rotulo} />
    </div>
  );
}
