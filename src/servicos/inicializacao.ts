import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { api, mock } from '@/api';
import { carregarPreferencias, obterPreferencias } from '@/dados-locais/preferencias';
import { limparSosAntigos } from '@/dados-locais/repositorios';
import { lerFicha } from '@/dados-locais/seguro';
import { horariosHabituais } from '@/domain/periodos';
import { obterSessao } from '@/state/sessao';

import { configurarNotificacoes } from './notificacoes';
import { processarFilaRelatos } from './relatos';
import { tratarRespostaDeNotificacao } from './respostas';
import { carregarSosAtivo, processarFilaSos } from './sos';
import { pulso, restaurarTurno } from './turno';

/**
 * Liga os serviços do app uma vez, na abertura:
 * preferências, notificações, turno salvo, SOS ativo, filas offline e o relógio de 1 s.
 */
let iniciado = false;
let relogio: ReturnType<typeof setInterval> | null = null;

function ligarRelogio() {
  if (relogio) return;
  relogio = setInterval(() => void pulso(Date.now()), 1_000);
}

function desligarRelogio() {
  if (relogio) clearInterval(relogio);
  relogio = null;
}

export async function processarFilas(): Promise<void> {
  await processarFilaSos();
  await processarFilaRelatos();
}

/**
 * Só no modo mock: a API simulada vive na memória e zera quando o app reabre.
 * Devolve a ela o que está no aparelho (perfil, ficha, consentimentos, pulseira),
 * para o plano e a pulseira continuarem funcionando no demo. Com a API real, não faz nada.
 */
async function reidratarMock(): Promise<void> {
  const usuarioId = obterSessao().usuarioId;
  if (!mock || !usuarioId) return;
  const prefs = obterPreferencias();
  const { perfil } = prefs;
  try {
    await api.salvarPerfil(usuarioId, {
      tiposDeUso: perfil.tiposDeUso,
      horariosHabituais: horariosHabituais(perfil.periodos, perfil.dias),
      distritosFrequentes: perfil.distritos.map((d) => d.distritoId),
    });
    await api.salvarConsentimentos(usuarioId, prefs.consentimentos);
    const ficha = await lerFicha();
    if (ficha) await api.salvarFichaMedica(usuarioId, ficha);
    if (prefs.pulseira) await api.parearVestivel(usuarioId, prefs.pulseira.dispositivoId);
  } catch {
    // demo: segue sem
  }
}

export async function iniciarServicos(): Promise<void> {
  if (iniciado) return;
  iniciado = true;

  await carregarPreferencias();
  await reidratarMock();
  await configurarNotificacoes().catch(() => undefined);
  await carregarSosAtivo();
  await restaurarTurno({ religar: true }).catch(() => undefined);
  void limparSosAntigos();
  void processarFilas();

  // Fila offline: reenvia assim que a conexão volta (RF21).
  NetInfo.addEventListener((estado) => {
    if (estado.isConnected) void processarFilas();
  });

  if (Platform.OS !== 'web') {
    Notifications.addNotificationResponseReceivedListener((r) => void tratarRespostaDeNotificacao(r));
  }

  // Relógio de 1 s com o app aberto; em segundo plano quem marca o tempo é o GPS do turno.
  ligarRelogio();
  AppState.addEventListener('change', (estado) => {
    void pulso(Date.now());
    if (estado === 'active') ligarRelogio();
    else desligarRelogio();
  });
}
