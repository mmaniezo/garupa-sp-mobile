import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { api, mock, origemApi } from '@/api';
import { DISTRITOS } from '@/api/mock/dados';
import {
  atualizarPreferencias,
  carregarPreferencias,
  limparPreferencias,
  obterPreferencias,
} from '@/dados-locais/preferencias';
import { limparSosAntigos } from '@/dados-locais/repositorios';
import { apagarDadosSeguros, lerFicha } from '@/dados-locais/seguro';
import { horariosHabituais } from '@/domain/periodos';
import { atualizarSessao, encerrarSessaoNoAparelho, obterSessao } from '@/state/sessao';

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
 * Um cadastro só existe na API em que foi feito. Se o .env trocou de API (mock ↔ real, ou
 * outro endereço), recomeça o cadastro neste aparelho: sem isso, toda chamada daria 404.
 * Cadastros anteriores a esta marca eram do mock (ids "usr-…").
 */
async function conferirApiDoCadastro(): Promise<void> {
  const { usuarioId, apiDoCadastro } = obterSessao();
  if (!usuarioId) return;
  const onde = apiDoCadastro ?? (usuarioId.startsWith('usr-') ? 'mock' : origemApi);
  if (onde === origemApi) {
    if (!apiDoCadastro) await atualizarSessao({ apiDoCadastro: onde });
    return;
  }
  if (__DEV__) console.info('[inicio] O cadastro deste aparelho é de outra API; recomeçando o cadastro.');
  await apagarDadosSeguros();
  await encerrarSessaoNoAparelho();
  await limparPreferencias();
}

/**
 * Versões antigas do mock numeravam os distritos de 1 a 96. A API usa o id do IBGE
 * (355030801…): troca pelo nome, para o perfil salvo continuar valendo.
 */
async function migrarDistritosAntigos(): Promise<void> {
  const { perfil } = obterPreferencias();
  if (!perfil.distritos.some((d) => d.distritoId < 1000)) return;
  const distritos = perfil.distritos
    .map((d) => (d.distritoId < 1000 ? DISTRITOS.find((x) => x.nome === d.nome) : d))
    .filter((d): d is NonNullable<typeof d> => !!d);
  await atualizarPreferencias({ perfil: { ...perfil, distritos } });
}

/**
 * Só no modo mock: a API simulada vive na memória e zera quando o app reabre.
 * Devolve a ela o que está no aparelho, na ordem que a API exige (consentimentos antes da
 * ficha e do perfil), para o plano e a pulseira continuarem funcionando no demo.
 */
async function reidratarMock(): Promise<void> {
  const usuarioId = obterSessao().usuarioId;
  if (!mock || !usuarioId) return;
  const prefs = obterPreferencias();
  const { perfil, consentimentos } = prefs;
  try {
    await api.salvarConsentimentos(usuarioId, consentimentos);
    if (consentimentos.perfilDeUso && perfil.tiposDeUso.length > 0) {
      await api.salvarPerfil(usuarioId, {
        tiposDeUso: perfil.tiposDeUso,
        horariosHabituais: horariosHabituais(perfil.periodos, perfil.dias),
        distritosFrequentes: perfil.distritos.map((d) => d.distritoId),
      });
    }
    const ficha = await lerFicha();
    if (ficha && consentimentos.fichaMedica) await api.salvarFichaMedica(usuarioId, ficha);
    if (prefs.pulseira) await api.parearVestivel(usuarioId, prefs.pulseira.dispositivoId);
  } catch {
    // demo: segue sem
  }
}

export async function iniciarServicos(): Promise<void> {
  if (iniciado) return;
  iniciado = true;

  await carregarPreferencias();
  await conferirApiDoCadastro();
  await migrarDistritosAntigos();
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
