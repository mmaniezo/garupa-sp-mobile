import { randomUUID } from 'expo-crypto';

/**
 * ID de evento (SOS, relato) gerado no aparelho, em GUID (RB13).
 * O mesmo eventoId reenviado não cria registro duplicado na API.
 */
export function novoEventoId(): string {
  return randomUUID();
}
