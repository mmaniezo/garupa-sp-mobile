import * as Location from 'expo-location';

import type { Ponto } from '@/domain/geo';
import { criarStore } from '@/lib/store';

/**
 * Última posição conhecida (só em memória). Nunca vai para log nem para a API fora do SOS
 * e do relato (RNF15); os agregados usam só a célula.
 */
export type Posicao = Ponto & { kmh: number | null; precisao: number | null; em: number };

const store = criarStore<Posicao | null>(null);

export const usePosicao = store.useStore;
export const obterPosicaoMemoria = store.obter;

export function registrarPosicao(p: Posicao) {
  store.definir(p);
}

function comPrazo<T>(promessa: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promessa, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/**
 * Melhor posição disponível sem travar: a da memória (até `idadeMaxMs`), a última do sistema
 * ou uma leitura nova com prazo. Devolve null se não houver permissão ou sinal.
 */
export async function obterPosicao(idadeMaxMs = 60_000, prazoMs = 8_000): Promise<Ponto | null> {
  const memoria = store.obter();
  if (memoria && Date.now() - memoria.em <= idadeMaxMs) return { lat: memoria.lat, lon: memoria.lon };
  try {
    const permissao = await Location.getForegroundPermissionsAsync();
    if (!permissao.granted) return memoria ? { lat: memoria.lat, lon: memoria.lon } : null;
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: idadeMaxMs * 5 }).catch(() => null);
    if (ultima) return { lat: ultima.coords.latitude, lon: ultima.coords.longitude };
    const atual = await comPrazo(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null),
      prazoMs,
    );
    if (atual) return { lat: atual.coords.latitude, lon: atual.coords.longitude };
  } catch {
    // sem serviço de localização
  }
  return memoria ? { lat: memoria.lat, lon: memoria.lon } : null;
}
