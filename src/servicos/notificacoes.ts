import * as Notifications from 'expo-notifications';
import {
  AndroidAudioUsage as U,
  AndroidImportance as I,
  AndroidNotificationVisibility as V,
} from 'expo-notifications';
import { Platform } from 'react-native';

import type { Mensagem } from '@/api/types';
import { TITULO_BANNER_ALERTA } from '@/domain/alertas';
import { alerta, brand } from '@/theme';

/**
 * Notificações do turno (RT19). Dois níveis de prioridade:
 * - baixa: turno ativo (notificação fixa) e mensagens com a moto parada;
 * - alta: alerta de ponto crítico e queda (no iOS, "tempo urgente").
 * Nada aqui exige leitura em movimento: o aviso é o som e a vibração (RB17).
 * Nenhum texto de notificação leva coordenada, telefone ou ficha (RNF15).
 */

export const CANAIS = {
  turno: 'turno',
  mensagens: 'mensagens',
  pontoCritico: 'ponto-critico',
  queda: 'queda',
  quedaContagem: 'queda-contagem',
  sos: 'sos',
} as const;

export const IDS = {
  turno: 'turno-fixo',
  avisoPausa: 'aviso-pausa',
  mensagem: 'mensagem',
  queda: 'queda',
  sos: 'sos-ativo',
} as const;

export const ACOES = {
  pausar: 'pausar',
  retomar: 'retomar',
  finalizar: 'finalizar',
  estouBem: 'estou_bem',
  comoAjudar: 'como_ajudar',
} as const;

export type DadosNotificacao =
  | { tipo: 'turno' }
  | { tipo: 'pausa' }
  | { tipo: 'ponto_critico'; celulaId: string }
  | { tipo: 'mensagem'; mensagemId: string }
  | { tipo: 'queda' }
  | { tipo: 'sos'; eventoId: string };

const suportado = Platform.OS !== 'web';
let configurado = false;

async function apresentar(
  identifier: string,
  canal: string,
  content: Notifications.NotificationContentInput & { data: DadosNotificacao },
) {
  if (!suportado) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger: Platform.OS === 'android' ? { channelId: canal } : null,
    });
  } catch (e) {
    if (__DEV__) console.warn('[notificacoes]', (e as Error).message);
  }
}

async function remover(identifier: string) {
  if (!suportado) return;
  try {
    await Notifications.dismissNotificationAsync(identifier);
  } catch {
    // já não estava na bandeja
  }
}

/** Cria canais e categorias (idempotente). Chamada na abertura do app e antes do turno. */
export async function configurarNotificacoes(): Promise<void> {
  if (!suportado || configurado) return;
  configurado = true;

  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const dados = n.request.content.data as DadosNotificacao | undefined;
      // Com o app aberto, a própria tela mostra o turno e a contagem; o resto aparece como banner.
      const silenciosa = dados?.tipo === 'turno';
      return {
        shouldShowBanner: !silenciosa,
        shouldShowList: true,
        shouldPlaySound: !silenciosa,
        shouldSetBadge: false,
      };
    },
  });

  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync(CANAIS.turno, {
        name: 'Turno ativo',
        description: 'Notificação fixa enquanto o turno está ligado.',
        importance: I.LOW,
        sound: null,
        enableVibrate: false,
        lockscreenVisibility: V.PUBLIC,
        showBadge: false,
      }),
      Notifications.setNotificationChannelAsync(CANAIS.mensagens, {
        name: 'Mensagens com a moto parada',
        description: 'Dicas curtas de segurança, só com a moto parada.',
        importance: I.LOW,
        sound: null,
        enableVibrate: false,
        showBadge: false,
      }),
      Notifications.setNotificationChannelAsync(CANAIS.pontoCritico, {
        name: 'Ponto crítico à frente',
        description: 'Bipe curto e vibração ao chegar perto de um ponto crítico.',
        importance: I.HIGH,
        sound: 'bipe.wav',
        vibrationPattern: [0, 250, 120, 250],
        enableVibrate: true,
        lightColor: alerta.atencao,
        lockscreenVisibility: V.PUBLIC,
        audioAttributes: { usage: U.NOTIFICATION_EVENT },
      }),
      Notifications.setNotificationChannelAsync(CANAIS.queda, {
        name: 'Queda detectada',
        description: 'Alarme alto e contagem de 30 segundos antes do SOS.',
        importance: I.MAX,
        sound: 'alarme.wav',
        vibrationPattern: [0, 800, 300, 800, 300, 800, 300, 800],
        enableVibrate: true,
        bypassDnd: true,
        lightColor: alerta.emergencia,
        lockscreenVisibility: V.PUBLIC,
        audioAttributes: { usage: U.ALARM },
      }),
      Notifications.setNotificationChannelAsync(CANAIS.quedaContagem, {
        name: 'Contagem da queda',
        description: 'Atualiza os segundos da contagem sem tocar de novo.',
        importance: I.HIGH,
        sound: null,
        enableVibrate: false,
        lockscreenVisibility: V.PUBLIC,
      }),
      Notifications.setNotificationChannelAsync(CANAIS.sos, {
        name: 'SOS ativo',
        description: 'Aparece na tela de bloqueio para quem for ajudar.',
        importance: I.MAX,
        sound: 'alarme.wav',
        vibrationPattern: [0, 600, 200, 600],
        enableVibrate: true,
        bypassDnd: true,
        lightColor: alerta.emergencia,
        lockscreenVisibility: V.PUBLIC,
        audioAttributes: { usage: U.ALARM },
      }),
    ]);
  }

  await Promise.all([
    Notifications.setNotificationCategoryAsync('turno', [
      { identifier: ACOES.pausar, buttonTitle: 'Pausar', options: { opensAppToForeground: false } },
      { identifier: ACOES.finalizar, buttonTitle: 'Finalizar', options: { opensAppToForeground: false } },
    ]),
    Notifications.setNotificationCategoryAsync('turno-pausado', [
      { identifier: ACOES.retomar, buttonTitle: 'Retomar', options: { opensAppToForeground: false } },
      { identifier: ACOES.finalizar, buttonTitle: 'Finalizar', options: { opensAppToForeground: false } },
    ]),
    Notifications.setNotificationCategoryAsync('queda', [
      { identifier: ACOES.estouBem, buttonTitle: 'Estou bem', options: { opensAppToForeground: false } },
    ]),
    // Sem "Estou bem" aqui: na tela de bloqueio, quem toca pode ser a testemunha.
    Notifications.setNotificationCategoryAsync('sos', [
      { identifier: ACOES.comoAjudar, buttonTitle: 'Como ajudar', options: { opensAppToForeground: true } },
    ]),
  ]).catch(() => undefined);
}

// ---------- Turno ----------

export function notificarTurno(situacao: 'ativo' | 'pausado', detalhe: string) {
  return apresentar(IDS.turno, CANAIS.turno, {
    title: situacao === 'ativo' ? 'Garupa SP · turno ativo' : 'Garupa SP · turno pausado',
    body: detalhe,
    categoryIdentifier: situacao === 'ativo' ? 'turno' : 'turno-pausado',
    sticky: true,
    autoDismiss: false,
    color: brand.teal,
    data: { tipo: 'turno' },
  });
}

export const removerNotificacaoTurno = () => remover(IDS.turno);

export function notificarAvisoPausa(minutosParado: number, minutosParaPausar: number) {
  return apresentar(IDS.avisoPausa, CANAIS.turno, {
    title: `Parado há ${minutosParado} min`,
    body: `Em ${minutosParaPausar} min o turno pausa. Volta quando você andar.`,
    data: { tipo: 'pausa' },
  });
}

export const removerAvisoPausa = () => remover(IDS.avisoPausa);

// ---------- Alertas e mensagens ----------

/** Bipe, vibração e banner curto que some sozinho; o motivo fica para quando abrir (RF14). */
export function notificarPontoCritico(celulaId: string, distanciaM: number) {
  return apresentar(`alerta-${celulaId}`, CANAIS.pontoCritico, {
    title: TITULO_BANNER_ALERTA,
    body: `Garupa SP · ${Math.round(distanciaM / 10) * 10} m`,
    sound: 'bipe.wav',
    color: alerta.atencao,
    interruptionLevel: 'timeSensitive',
    data: { tipo: 'ponto_critico', celulaId },
  });
}

/** Com a moto parada, uma mensagem discreta (RB05). */
export function notificarMensagem(m: Mensagem) {
  return apresentar(IDS.mensagem, CANAIS.mensagens, {
    title: 'Para o seu turno',
    body: `${m.texto} Fonte: ${m.fonte}`,
    color: alerta.informacao,
    data: { tipo: 'mensagem', mensagemId: m.id },
  });
}

// ---------- Queda e SOS ----------

/** Alta prioridade, alarme, contagem visível e "Estou bem" (RF19). */
export function notificarQueda(segundos: number, primeira: boolean) {
  return apresentar(IDS.queda, primeira ? CANAIS.queda : CANAIS.quedaContagem, {
    title: `Queda detectada · ${segundos} s`,
    body: 'Sem resposta, seu contato recebe o SOS com a sua posição.',
    categoryIdentifier: 'queda',
    sticky: true,
    autoDismiss: false,
    color: alerta.emergencia,
    sound: primeira ? 'alarme.wav' : false,
    interruptionLevel: 'timeSensitive',
    data: { tipo: 'queda' },
  });
}

export const removerNotificacaoQueda = () => remover(IDS.queda);

/** SOS ativo na tela de bloqueio: abre a tela da testemunha (RF22). */
export function notificarSosAtivo(eventoId: string, enviado: boolean) {
  return apresentar(IDS.sos, CANAIS.sos, {
    title: 'SOS ativo · este motociclista precisa de ajuda',
    body: enviado
      ? 'Toque para ver a ficha médica e ligar 192. Não precisa da senha.'
      : 'Sem internet: o SOS sai assim que a conexão voltar. Toque para ver como ajudar.',
    categoryIdentifier: 'sos',
    sticky: true,
    autoDismiss: false,
    color: alerta.emergencia,
    interruptionLevel: 'timeSensitive',
    data: { tipo: 'sos', eventoId },
  });
}

export const removerNotificacaoSos = () => remover(IDS.sos);
