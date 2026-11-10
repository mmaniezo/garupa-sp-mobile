/** Contas de geografia simples, sem biblioteca. */

export type Ponto = { lat: number; lon: number };

const RAIO_TERRA_M = 6_371_000;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distância em metros entre dois pontos (haversine). */
export function distanciaMetros(a: Ponto, b: Ponto): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** m/s → km/h; valor negativo ou ausente (GPS sem velocidade) vira null. */
export function paraKmh(metrosPorSegundo: number | null | undefined): number | null {
  if (metrosPorSegundo === null || metrosPorSegundo === undefined || metrosPorSegundo < 0) return null;
  return metrosPorSegundo * 3.6;
}

/**
 * Célula da grade local de ~500 m usada só para os locais frequentes (P1, RF12).
 * Guarda a célula, nunca a coordenada nem o trajeto.
 */
export function celulaLocal(p: Ponto, tamanhoGraus = 0.0045): string {
  const i = Math.floor(p.lat / tamanhoGraus);
  const j = Math.floor(p.lon / tamanhoGraus);
  return `g${i}_${j}`;
}

/** Projeta pontos numa área de desenho (mapa esquemático), mantendo a proporção. */
export function projetar(
  pontos: Ponto[],
  largura: number,
  altura: number,
  margem = 40,
): { x: (p: Ponto) => number; y: (p: Ponto) => number } {
  if (pontos.length === 0) return { x: () => largura / 2, y: () => altura / 2 };
  const lats = pontos.map((p) => p.lat);
  const lons = pontos.map((p) => p.lon);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  const cosLat = Math.cos(rad((latMin + latMax) / 2));
  const larguraGeo = Math.max((lonMax - lonMin) * cosLat, 0.004);
  const alturaGeo = Math.max(latMax - latMin, 0.004);
  const escala = Math.min((largura - 2 * margem) / larguraGeo, (altura - 2 * margem) / alturaGeo);
  const cx = (lonMin + lonMax) / 2;
  const cy = (latMin + latMax) / 2;
  return {
    x: (p) => largura / 2 + (p.lon - cx) * cosLat * escala,
    y: (p) => altura / 2 - (p.lat - cy) * escala,
  };
}
