import type { Ponto } from './geo';

/**
 * Chuva agora, pela previsão do tempo (Open-Meteo, sem chave e sem custo). Regras puras aqui;
 * a consulta fica em servicos/clima.ts.
 */

/** Tempo atual como a Open-Meteo devolve em `current` (valores dos últimos 15 minutos). */
export type TempoAtual = {
  precipitation?: number | null;
  rain?: number | null;
  showers?: number | null;
  weather_code?: number | null;
};

/**
 * Códigos WMO de chuva: garoa (51–57), chuva (61–67), pancadas (80–82) e trovoada (95–99).
 * Garoa conta: pista molhada já muda o risco para quem está de moto.
 */
const CODIGOS_DE_CHUVA = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export function chovendoAgora(t: TempoAtual): boolean {
  const mm = Math.max(t.precipitation ?? 0, t.rain ?? 0, t.showers ?? 0);
  return mm > 0 || (t.weather_code != null && CODIGOS_DE_CHUVA.has(t.weather_code));
}

/**
 * Posição arredondada para uma grade de 0,05° (cerca de 5 km) antes de sair do aparelho:
 * basta para saber se chove na região e não diz onde a pessoa está.
 */
export function pontoAproximado(p: Ponto): Ponto {
  const grade = (v: number) => Math.round(v * 20) / 20;
  return { lat: grade(p.lat), lon: grade(p.lon) };
}

/** Centro de São Paulo: usado quando não há posição nem pontos do plano. */
export const CENTRO_SP: Ponto = { lat: -23.55, lon: -46.63 };

export function urlDoTempoAtual(p: Ponto): string {
  const { lat, lon } = pontoAproximado(p);
  return (
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}` +
    '&current=precipitation,rain,showers,weather_code&timezone=America%2FSao_Paulo'
  );
}
