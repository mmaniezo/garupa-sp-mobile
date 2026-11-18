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

/** Guarda uma leitura do sistema, sem trocar uma posição mais nova (a do turno) por uma mais velha. */
function guardarLeitura(loc: Location.LocationObject): Ponto {
  const ponto = { lat: loc.coords.latitude, lon: loc.coords.longitude };
  const em = loc.timestamp || Date.now();
  const atual = store.obter();
  if (!atual || em >= atual.em) {
    const kmh = loc.coords.speed !== null && loc.coords.speed >= 0 ? loc.coords.speed * 3.6 : null;
    store.definir({ ...ponto, kmh, precisao: loc.coords.accuracy ?? null, em });
  }
  return ponto;
}

/**
 * Acompanha a posição enquanto uma tela precisa dela (o mapa aberto), com ou sem turno.
 * Não pede permissão: sem ela, não faz nada. Mostra logo a última posição do sistema e segue
 * atualizando. Devolve a função que para.
 */
export function acompanharPosicao(): () => void {
  let ativo = true;
  let parar: (() => void) | null = null;
  void (async () => {
    try {
      const permissao = await Location.getForegroundPermissionsAsync();
      if (!ativo || !permissao.granted) return;
      const ultima = await Location.getLastKnownPositionAsync().catch(() => null);
      if (ativo && ultima) guardarLeitura(ultima);
      const assinatura = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 5_000 },
        (loc) => {
          if (ativo) guardarLeitura(loc);
        },
      );
      if (ativo) parar = () => assinatura.remove();
      else assinatura.remove();
    } catch {
      // sem serviço de localização
    }
  })();
  return () => {
    ativo = false;
    parar?.();
  };
}

function comPrazo<T>(promessa: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promessa, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/**
 * Melhor posição disponível sem travar, nunca mais velha que `idadeMaxMs`: a da memória, a
 * última do sistema ou uma leitura nova com prazo. Sem permissão, sem sinal ou só com posição
 * velha, devolve null: para o SOS, um local antigo pode estar a quilômetros de onde a pessoa está.
 */
export async function obterPosicao(idadeMaxMs = 60_000, prazoMs = 8_000): Promise<Ponto | null> {
  const recente = (em: number) => Date.now() - em <= idadeMaxMs;
  const memoria = store.obter();
  if (memoria && recente(memoria.em)) return { lat: memoria.lat, lon: memoria.lon };
  try {
    const permissao = await Location.getForegroundPermissionsAsync();
    if (!permissao.granted) return null;
    // O que for lido fica na memória: o mapa já mostra "Você" sem esperar o turno.
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: idadeMaxMs }).catch(() => null);
    if (ultima && recente(ultima.timestamp)) return guardarLeitura(ultima);
    const atual = await comPrazo(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null),
      prazoMs,
    );
    if (atual) return guardarLeitura(atual);
  } catch {
    // sem serviço de localização
  }
  return null;
}
