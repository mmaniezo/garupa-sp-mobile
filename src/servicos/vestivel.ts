import { api } from '@/api';
import type { EventoVestivel, TipoAlertaVestivel } from '@/api/types';
import { atualizarPreferencias, obterPreferencias } from '@/dados-locais/preferencias';
import { obterSessao } from '@/state/sessao';

/**
 * Pulseira (vestível simulado no Wokwi).
 * - O app repete cada alerta na pulseira: POST /usuarios/{id}/alertas-vestivel (RF39, RF40).
 * - O app consulta os eventos da pulseira a cada 2 s: GET /eventos-vestivel/pendentes (RF28).
 * Sem pulseira pareada, nada é enviado e o app funciona igual (RF41).
 * Os alertas levam só o tipo e o horário (RB19).
 */

export function pulseiraPareada(): boolean {
  return !!obterPreferencias().pulseira;
}

/** Repete o alerta na pulseira. Nunca bloqueia nem falha o fluxo principal. */
export async function avisarPulseira(tipo: TipoAlertaVestivel): Promise<void> {
  const usuarioId = obterSessao().usuarioId;
  if (!usuarioId || !pulseiraPareada()) return;
  try {
    await api.enviarAlertaVestivel(usuarioId, { tipo, ocorridoEm: new Date().toISOString() });
  } catch {
    // Sem conexão, a luz perde o sentido (o alerta expira em 30 s na API); segue sem ela.
  }
}

export async function consultarEventosPulseira(): Promise<EventoVestivel[]> {
  const usuarioId = obterSessao().usuarioId;
  if (!usuarioId || !pulseiraPareada()) return [];
  try {
    return await api.listarEventosVestivelPendentes(usuarioId);
  } catch {
    return [];
  }
}

export async function parearPulseira(dispositivoId: string): Promise<void> {
  const usuarioId = obterSessao().usuarioId;
  if (!usuarioId) throw new Error('Faça o cadastro antes de parear a pulseira.');
  await api.parearVestivel(usuarioId, dispositivoId);
  await atualizarPreferencias({ pulseira: { dispositivoId } });
}

export async function desparearPulseira(): Promise<void> {
  const usuarioId = obterSessao().usuarioId;
  if (usuarioId) {
    try {
      await api.desparearVestivel(usuarioId);
    } catch {
      // Mesmo sem resposta, o app para de mandar alertas.
    }
  }
  await atualizarPreferencias({ pulseira: null });
}
