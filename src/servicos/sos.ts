import { definirSobreBloqueio } from 'tela-bloqueio';

import { api, ehErroApi, ehErroDeRede } from '@/api';
import type { NovoSos, OrigemSos, TipoSos } from '@/api/types';
import {
  atualizarSos,
  inserirSos,
  lerSos,
  sosMaisRecenteAtivo,
  sosPendentes,
  type RegistroSos,
} from '@/dados-locais/repositorios';
import { novoEventoId } from '@/lib/ids';
import { criarStore } from '@/lib/store';
import { obterSessao } from '@/state/sessao';

import { notificarSosAtivo, removerNotificacaoSos } from './notificacoes';
import { obterPosicao } from './posicao';
import { avisarPulseira } from './vestivel';

/**
 * SOS (RF20 a RF24, RB11, RB13):
 * - gravado primeiro no SQLite, com eventoId gerado no aparelho;
 * - enviado à API; sem internet, fica na fila e sai quando a conexão volta, com o mesmo id;
 * - cancelar ("estou bem") e encerrar ("já fui atendido") mudam o estado do link;
 * - com SOS ativo, a tela da testemunha pode abrir por cima da tela de bloqueio (RF22).
 */

export type SosAtual = RegistroSos & { link: string | null };

const store = criarStore<SosAtual | null>(null);
export const useSos = store.useStore;
export const obterSos = store.obter;

/** RB11 (proposta): sem ação da pessoa, o SOS é encerrado sozinho 12 horas depois. */
const ENCERRAMENTO_AUTOMATICO_MS = 12 * 60 * 60 * 1000;

async function recarregar(eventoId: string) {
  const r = await lerSos(eventoId);
  store.definir(r ? { ...r, link: r.token ? api.urlAcompanhamento(r.token) : null } : null);
}

export async function carregarSosAtivo(): Promise<void> {
  const r = await sosMaisRecenteAtivo();
  if (r && Date.now() - Date.parse(r.criadoEm) > ENCERRAMENTO_AUTOMATICO_MS) {
    await atualizarSos(r.eventoId, { situacao: 'encerrado' });
    store.definir(null);
    return;
  }
  if (r) {
    await recarregar(r.eventoId);
    await definirSobreBloqueio(true);
  } else {
    store.definir(null);
  }
}

/** Tenta mandar um SOS que ainda está só no aparelho. */
async function tentarEnviar(eventoId: string): Promise<void> {
  const r = await lerSos(eventoId);
  if (!r || r.enviado || r.situacao !== 'ativo') return;

  let payload = r.payload;
  if (payload.lat === null || payload.lon === null) {
    const pos = await obterPosicao(5 * 60_000, 5_000);
    if (!pos) {
      await atualizarSos(eventoId, { tentativa: true });
      return; // sem posição ainda: tenta de novo no próximo ciclo da fila
    }
    payload = { ...payload, lat: pos.lat, lon: pos.lon };
    await atualizarSos(eventoId, { payload });
  }

  try {
    const criado = await api.enviarSos(payload as NovoSos);
    await atualizarSos(eventoId, { enviado: true, sosId: criado.sosId, token: criado.tokenAcompanhamento });
    await notificarSosAtivo(eventoId, true);
  } catch (e) {
    await atualizarSos(eventoId, { tentativa: true });
    if (!ehErroDeRede(e) && __DEV__) console.warn('[sos] envio recusado:', (e as Error).message);
  } finally {
    await recarregar(eventoId);
  }
}

/** Dispara o SOS (automático ao fim da contagem, pela pulseira ou manual). Devolve o eventoId. */
export async function dispararSos(opcoes: { tipo: TipoSos; origem: OrigemSos }): Promise<string | null> {
  const atual = store.obter();
  if (atual?.situacao === 'ativo') return atual.eventoId; // um SOS por vez

  const usuarioId = obterSessao().usuarioId;
  if (!usuarioId) return null;

  const eventoId = novoEventoId();
  const pos = await obterPosicao(2 * 60_000, 6_000);
  const payload = {
    eventoId,
    usuarioId,
    tipo: opcoes.tipo,
    origem: opcoes.origem,
    ocorridoEm: new Date().toISOString(),
    lat: pos?.lat ?? null,
    lon: pos?.lon ?? null,
  } as RegistroSos['payload'];

  await inserirSos({ eventoId, payload, tipo: opcoes.tipo, origem: opcoes.origem });
  await recarregar(eventoId);
  await notificarSosAtivo(eventoId, false);
  await definirSobreBloqueio(true);
  void avisarPulseira('sos_enviado');
  await tentarEnviar(eventoId);
  return eventoId;
}

async function mudarSituacao(eventoId: string, acao: 'cancelar' | 'encerrar') {
  const r = await lerSos(eventoId);
  if (!r || r.situacao !== 'ativo') return;
  await atualizarSos(eventoId, { situacao: acao === 'cancelar' ? 'cancelado' : 'encerrado' });

  // Só fala com a API se o SOS chegou a sair do aparelho; se não saiu, basta não enviar.
  if (r.enviado && r.sosId) {
    try {
      await (acao === 'cancelar' ? api.cancelarSos(r.sosId) : api.encerrarSos(r.sosId));
    } catch (e) {
      if (ehErroDeRede(e)) await atualizarSos(eventoId, { acaoPendente: acao });
    }
  }
  await removerNotificacaoSos();
  await definirSobreBloqueio(false);
  if (acao === 'cancelar') void avisarPulseira('cancelado');
  await recarregar(eventoId);
}

/** "Estou bem" depois do envio (RB03): o link passa a mostrar "cancelado". */
export const cancelarSos = (eventoId: string) => mudarSituacao(eventoId, 'cancelar');

/** "Já fui atendido": o link passa a mostrar "encerrado". */
export const encerrarSos = (eventoId: string) => mudarSituacao(eventoId, 'encerrar');

/** Reenvia o que ficou na fila (chamado quando a conexão volta e periodicamente). */
export async function processarFilaSos(): Promise<void> {
  for (const r of await sosPendentes()) {
    if (!r.enviado && r.situacao === 'ativo') {
      await tentarEnviar(r.eventoId);
    } else if (r.acaoPendente && r.sosId) {
      try {
        await (r.acaoPendente === 'cancelar' ? api.cancelarSos(r.sosId) : api.encerrarSos(r.sosId));
        await atualizarSos(r.eventoId, { acaoPendente: null });
      } catch (e) {
        // 404 ou 409: o SOS já saiu do estado ativo na API (encerrado em 12 h, por exemplo).
        // Não há mais o que reenviar; só erro de rede continua na fila.
        if (ehErroApi(e, 404) || ehErroApi(e, 409)) await atualizarSos(r.eventoId, { acaoPendente: null });
      }
    }
  }
  const atual = store.obter();
  if (atual) await recarregar(atual.eventoId);
}
