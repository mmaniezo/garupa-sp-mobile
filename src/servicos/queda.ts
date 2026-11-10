import {
  contextoInicial,
  processarEvento,
  segundosRestantes,
  type ContextoQueda,
  type EfeitoQueda,
  type EventoQueda,
  type OrigemQueda,
} from '@/domain/queda/detector';
import { criarStore } from '@/lib/store';

import { notificarQueda, removerNotificacaoQueda } from './notificacoes';
import { cancelarSos, dispararSos, obterSos } from './sos';
import { avisarPulseira } from './vestivel';

/**
 * Executa a máquina de estados da queda (src/domain/queda/detector.ts) e os efeitos:
 * notificação com alarme e "Estou bem", luz na pulseira e envio do SOS.
 *
 * O relógio da contagem não depende de timer de tela: cada leitura do GPS em segundo plano
 * (1 por segundo) e o relógio do app aberto chamam `relogioDaQueda`, e o SOS sai quando o
 * prazo vence, mesmo com a tela bloqueada (RNF04).
 */

type EstadoQuedaApp = { ctx: ContextoQueda; segundos: number };

const store = criarStore<EstadoQuedaApp>({ ctx: contextoInicial(Date.now()), segundos: 0 });
export const useQueda = store.useStore;
export const obterQueda = store.obter;

let ultimoSegundoNotificado = -1;

async function executar(efeitos: EfeitoQueda[], ctx: ContextoQueda) {
  for (const efeito of efeitos) {
    if (efeito === 'iniciar_contagem') {
      ultimoSegundoNotificado = segundosRestantes(ctx, Date.now());
      await notificarQueda(ultimoSegundoNotificado, true);
      void avisarPulseira('contagem_queda');
    } else if (efeito === 'contagem_cancelada') {
      await removerNotificacaoQueda();
      void avisarPulseira('cancelado');
    } else if (efeito === 'enviar_sos') {
      await removerNotificacaoQueda();
      await dispararSos({ tipo: 'queda', origem: ctx.origem ?? 'celular' });
    }
  }
}

/** Entrada única de eventos do detector (sensor, GPS, relógio, pulseira, botões). */
export function eventoQueda(evento: EventoQueda): void {
  const anterior = store.obter();
  const { contexto, efeitos } = processarEvento(anterior.ctx, evento);
  if (contexto !== anterior.ctx) {
    store.definir({ ctx: contexto, segundos: segundosRestantes(contexto, evento.em) });
  }
  if (efeitos.length) void executar(efeitos, contexto);
}

/** Relógio: vence prazos e atualiza os segundos da notificação. */
export function relogioDaQueda(agora: number): void {
  const { ctx } = store.obter();
  if (ctx.estado === 'monitorando' || ctx.estado === 'sos_enviado') return;
  eventoQueda({ tipo: 'tempo', em: agora });
  const atual = store.obter();
  if (atual.ctx.estado === 'contagem') {
    const s = segundosRestantes(atual.ctx, agora);
    if (s !== atual.segundos) store.definir({ ...atual, segundos: s });
    if (s !== ultimoSegundoNotificado && s > 0) {
      ultimoSegundoNotificado = s;
      void notificarQueda(s, false);
    }
  }
}

/** A pulseira (ou a demo) detectou o impacto: abre a contagem direto (RF28). */
export function impactoExterno(origem: OrigemQueda): void {
  eventoQueda({ tipo: 'impacto_externo', em: Date.now(), origem });
}

/**
 * "Estou bem": cancela a contagem; se o SOS já saiu, cancela o SOS (o link mostra "cancelado").
 * Funciona em qualquer ponto da contagem (F05).
 */
export async function estouBem(): Promise<void> {
  const { ctx } = store.obter();
  if (ctx.estado === 'contagem' || ctx.estado === 'impacto_candidato' || ctx.estado === 'verificando_imobilidade') {
    eventoQueda({ tipo: 'cancelar', em: Date.now() });
    return;
  }
  const sos = obterSos();
  if (sos?.situacao === 'ativo') {
    await cancelarSos(sos.eventoId);
    reiniciarDetector();
  }
}

/** "Preciso de ajuda agora" durante a contagem: manda o SOS sem esperar os 30 s. */
export async function pedirAjudaAgora(): Promise<void> {
  const { ctx } = store.obter();
  const origem = ctx.origem ?? 'celular';
  store.definir({ ctx: { ...ctx, estado: 'sos_enviado', desde: Date.now(), fimContagemEm: null }, segundos: 0 });
  await removerNotificacaoQueda();
  await dispararSos({ tipo: 'queda', origem });
}

/** Depois que o SOS foi resolvido (cancelado ou encerrado), volta a monitorar. */
export function reiniciarDetector(): void {
  eventoQueda({ tipo: 'reiniciar', em: Date.now() });
}

/** Demo e testes no aparelho: simula uma queda detectada pelo celular. */
export function simularQueda(): void {
  impactoExterno('celular');
}
