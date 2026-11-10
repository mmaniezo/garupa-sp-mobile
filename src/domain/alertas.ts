import type { CelulaCritica } from '@/api/types';
import { regras } from '@/config';

import { distanciaMetros, type Ponto } from './geo';

/**
 * Alerta por localização (RF14, RB04):
 * - só em células de percentil alto (corte 95);
 * - ao entrar no raio (150 m);
 * - no máximo uma vez por ponto por turno;
 * - poucos por hora (até 3).
 */
export type EscolhaAlerta = { ponto: CelulaCritica; distanciaM: number } | null;

export function escolherAlerta(
  posicao: Ponto,
  pontos: CelulaCritica[],
  jaAlertados: ReadonlySet<string>,
  alertasRecentes: number[],
  agora: number,
): EscolhaAlerta {
  const naUltimaHora = alertasRecentes.filter((t) => agora - t < 60 * 60 * 1000).length;
  if (naUltimaHora >= regras.maxAlertasPorHora) return null;

  let melhor: EscolhaAlerta = null;
  for (const ponto of pontos) {
    if (ponto.percentil < regras.percentilCorte) continue;
    if (jaAlertados.has(ponto.celulaId)) continue;
    const distanciaM = distanciaMetros(posicao, { lat: ponto.centroLat, lon: ponto.centroLon });
    if (distanciaM > regras.raioAlertaMetros) continue;
    if (!melhor || distanciaM < melhor.distanciaM) melhor = { ponto, distanciaM };
  }
  return melhor;
}

/** Título do banner: no máximo 6 palavras (RB17). O aviso de verdade é o som e a vibração. */
export const TITULO_BANNER_ALERTA = 'Ponto crítico à frente: reduza';

export function contarPalavras(texto: string): number {
  return texto.trim().split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}
