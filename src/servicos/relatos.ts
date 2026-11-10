import { api, ehErroApi, ehErroDeRede } from '@/api';
import type { NovoRelato, TipoRelato } from '@/api/types';
import { inserirRelato, marcarRelato, relatosPendentes } from '@/dados-locais/repositorios';
import { novoEventoId } from '@/lib/ids';
import { obterSessao } from '@/state/sessao';

import { obterPosicao } from './posicao';

/**
 * Relato de perigo em dois toques (RF26): local atual, tipo e eventoId gerado no aparelho.
 * Sem internet, fica na fila e sai depois com o mesmo id (não duplica).
 */

export const TIPOS_RELATO: { id: TipoRelato; rotulo: string; icone: 'buraco' | 'gota' | 'alerta' | 'semaforo' }[] = [
  { id: 'buraco', rotulo: 'Buraco', icone: 'buraco' },
  { id: 'oleo_pista', rotulo: 'Óleo ou pista lisa', icone: 'gota' },
  { id: 'acidente', rotulo: 'Acidente na via', icone: 'alerta' },
  { id: 'semaforo_apagado', rotulo: 'Semáforo apagado', icone: 'semaforo' },
];

export type ResultadoRelato =
  | { situacao: 'enviado' }
  | { situacao: 'na_fila' }
  | { situacao: 'recusado'; motivo: string }
  | { situacao: 'sem_local' };

async function enviar(relato: NovoRelato): Promise<ResultadoRelato> {
  try {
    await api.enviarRelato(relato);
    await marcarRelato(relato.eventoId, 'enviado');
    return { situacao: 'enviado' };
  } catch (e) {
    if (ehErroDeRede(e)) {
      await marcarRelato(relato.eventoId, 'tentativa');
      return { situacao: 'na_fila' };
    }
    if (ehErroApi(e, 400)) {
      await marcarRelato(relato.eventoId, 'descartado');
      return {
        situacao: 'recusado',
        motivo: e.erroDoCampo('local') ?? e.problema?.title ?? 'O relato não foi aceito.',
      };
    }
    await marcarRelato(relato.eventoId, 'tentativa');
    return { situacao: 'na_fila' };
  }
}

export async function relatarPerigo(tipo: TipoRelato): Promise<ResultadoRelato> {
  const usuarioId = obterSessao().usuarioId;
  const pos = await obterPosicao(60_000, 8_000);
  if (!usuarioId || !pos) return { situacao: 'sem_local' };
  const relato: NovoRelato = { eventoId: novoEventoId(), usuarioId, tipo, lat: pos.lat, lon: pos.lon };
  await inserirRelato(relato);
  return enviar(relato);
}

export async function processarFilaRelatos(): Promise<void> {
  for (const relato of await relatosPendentes()) await enviar(relato);
}
