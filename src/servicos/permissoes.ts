import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import { Linking, Platform } from 'react-native';

import { atualizarPreferencias } from '@/dados-locais/preferencias';

/**
 * Permissões do turno ativo (RF36): localização o tempo todo, notificações, movimento e,
 * no Android, liberar o app da economia de bateria. Cada uma tem uma explicação curta na tela.
 */

export type StatusPermissoes = {
  localizacaoEmUso: boolean;
  localizacaoSempre: boolean;
  notificacoes: boolean;
  movimento: boolean;
};

const web = Platform.OS === 'web';

export async function lerStatusPermissoes(): Promise<StatusPermissoes> {
  if (web) return { localizacaoEmUso: false, localizacaoSempre: false, notificacoes: false, movimento: true };
  const [uso, sempre, notif, mov] = await Promise.all([
    Location.getForegroundPermissionsAsync().catch(() => null),
    Location.getBackgroundPermissionsAsync().catch(() => null),
    Notifications.getPermissionsAsync().catch(() => null),
    Accelerometer.getPermissionsAsync().catch(() => null),
  ]);
  return {
    localizacaoEmUso: !!uso?.granted,
    localizacaoSempre: !!sempre?.granted,
    notificacoes: !!notif?.granted,
    movimento: mov ? mov.granted : true,
  };
}

/** Primeiro "durante o uso", depois "o tempo todo" (o Android exige essa ordem). */
export async function pedirLocalizacaoSempre(): Promise<{ emUso: boolean; sempre: boolean }> {
  if (web) return { emUso: false, sempre: false };
  const uso = await Location.requestForegroundPermissionsAsync();
  if (!uso.granted) return { emUso: false, sempre: false };
  const sempre = await Location.requestBackgroundPermissionsAsync();
  return { emUso: true, sempre: sempre.granted };
}

export async function pedirNotificacoes(): Promise<boolean> {
  if (web) return false;
  const r = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return r.granted;
}

export async function pedirMovimento(): Promise<boolean> {
  if (web) return true;
  const r = await Accelerometer.requestPermissionsAsync().catch(() => null);
  return r ? r.granted : true;
}

/**
 * Celulares de entregador costumam encerrar apps em segundo plano para poupar bateria.
 * No Android, abre o pedido do sistema para liberar o Garupa (ou a lista de apps, se não der).
 */
export async function abrirAjusteDeBateria(): Promise<void> {
  await atualizarPreferencias({ bateriaOrientada: true });
  if (Platform.OS !== 'android') return;
  const pacote = Constants.expoConfig?.android?.package ?? 'br.com.garupasp.app';
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, {
      data: `package:${pacote}`,
    });
  } catch {
    try {
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
    } catch {
      await Linking.openSettings();
    }
  }
}

export const abrirAjustesDoApp = () => Linking.openSettings();

/** O que falta para iniciar o turno e o que deixa de funcionar sem cada item (RF36). */
export function faltasParaOTurno(s: StatusPermissoes, consentiuSegundoPlano: boolean): string[] {
  const faltas: string[] = [];
  if (!s.localizacaoSempre || !consentiuSegundoPlano) {
    faltas.push('Localização o tempo todo: sem ela não há alerta de ponto crítico nem posição no SOS.');
  }
  if (!s.notificacoes) faltas.push('Notificações: sem elas a contagem da queda e os alertas não aparecem.');
  return faltas;
}
