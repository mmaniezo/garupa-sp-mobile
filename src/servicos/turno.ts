import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { AppState, Platform } from 'react-native';

import { api } from '@/api';
import type { CelulaCritica, Mensagem } from '@/api/types';
import { regras } from '@/config';
import { obterPreferencias } from '@/dados-locais/preferencias';
import {
  alertasDoTurno,
  gravarCache,
  lerCache,
  mensagensDispensadasHoje,
  mudarEstadoTurno,
  registrarAlerta,
  registrarMensagemExibida,
  registrarTurno,
  registrarVisita,
  ultimasMensagensExibidas,
} from '@/dados-locais/repositorios';
import { gravarValor, lerValor } from '@/db';
import { escolherAlerta } from '@/domain/alertas';
import { celulaLocal, distanciaMetros, paraKmh, type Ponto } from '@/domain/geo';
import { contextoDaMensagem, escolherMensagem } from '@/domain/mensagens';
import { novoEventoId } from '@/lib/ids';
import { criarStore } from '@/lib/store';
import { brand } from '@/theme';

import {
  configurarNotificacoes,
  notificarAvisoPausa,
  notificarMensagem,
  notificarPontoCritico,
  notificarTurno,
  removerAvisoPausa,
  removerNotificacaoTurno,
} from './notificacoes';
import { faltasParaOTurno, lerStatusPermissoes } from './permissoes';
import { contextoAgora, obterPlano } from './plano';
import { registrarPosicao } from './posicao';
import { eventoQueda, impactoExterno, obterQueda, relogioDaQueda, estouBem } from './queda';
import { dispararSos, processarFilaSos } from './sos';
import { avisarPulseira, consultarEventosPulseira, pulseiraPareada } from './vestivel';

/**
 * Turno ativo em segundo plano (RF13, RB18, RT03).
 *
 * O entregador abre o app de entregas e o Garupa segue monitorando:
 * - Android: serviço em primeiro plano do expo-location (notificação fixa do sistema)
 *   + uma notificação do turno com Pausar e Finalizar;
 * - GPS a cada ~1 s (posição e velocidade) alimenta alertas, pausa e o detector de queda;
 * - acelerômetro a 20 Hz alimenta o detector de queda;
 * - cada leitura do GPS também é o "relógio" do turno em segundo plano (contagem, pulseira, fila).
 *
 * Se o acelerômetro não entregar leituras com a tela bloqueada (o maior risco do projeto),
 * a tela de diagnóstico mostra isso; ver o plano de saída em docs/ETAPAS_MOBILE.md.
 */

export const TAREFA_LOCALIZACAO = 'garupa-turno-localizacao';

export type SituacaoTurno = 'inativo' | 'ativo' | 'pausado';

export type Diagnostico = {
  leiturasSensor: number;
  leiturasSensorEmSegundoPlano: number;
  maiorIntervaloSensorMs: number;
  leiturasGps: number;
  leiturasGpsEmSegundoPlano: number;
  segundoPlanoDesde: number | null;
  tempoEmSegundoPlanoMs: number;
};

export type EstadoTurno = {
  situacao: SituacaoTurno;
  turnoId: string | null;
  iniciadoEm: number | null;
  pausadoEm: number | null;
  motivoPausa: 'manual' | 'inatividade' | null;
  ultimoMovimentoEm: number | null;
  avisoPausaDado: boolean;
  ultimaLeituraSensorEm: number | null;
  ultimoGpsEm: number | null;
  pontosProximos: number;
  alertados: string[];
  alertasEm: number[];
  diagnostico: Diagnostico;
};

const DIAGNOSTICO_VAZIO: Diagnostico = {
  leiturasSensor: 0,
  leiturasSensorEmSegundoPlano: 0,
  maiorIntervaloSensorMs: 0,
  leiturasGps: 0,
  leiturasGpsEmSegundoPlano: 0,
  segundoPlanoDesde: null,
  tempoEmSegundoPlanoMs: 0,
};

const INICIAL: EstadoTurno = {
  situacao: 'inativo',
  turnoId: null,
  iniciadoEm: null,
  pausadoEm: null,
  motivoPausa: null,
  ultimoMovimentoEm: null,
  avisoPausaDado: false,
  ultimaLeituraSensorEm: null,
  ultimoGpsEm: null,
  pontosProximos: 0,
  alertados: [],
  alertasEm: [],
  diagnostico: DIAGNOSTICO_VAZIO,
};

const store = criarStore<EstadoTurno>(INICIAL);
export const useTurno = store.useStore;
export const obterTurno = store.obter;

const nativo = Platform.OS !== 'web';
const CHAVE = 'turno';

// ---------- Memória de trabalho (não vai para a tela a cada leitura) ----------

let restaurado = false;
let assinaturaSensor: { remove(): void } | null = null;
let ultimaLeituraSensor: number | null = null;
const contadores = { ...DIAGNOSTICO_VAZIO };
let ancoraMovimento: Ponto | null = null;
let anterior: { lat: number; lon: number; em: number } | null = null;
let paradaDesde: number | null = null;
let ultimaMensagemEm = 0;
let pontos: CelulaCritica[] = [];
let centroPontos: Ponto | null = null;
let pontosAtualizadosEm = 0;
let buscandoPontos = false;
let mensagensDoTurno: Mensagem[] = [];
let ultimaConsultaPulseira = 0;
let ultimaFila = 0;
let ultimoPulsoTela = 0;
const visitaRegistradaEm = new Map<string, number>();

async function persistir() {
  const s = store.obter();
  await gravarValor(CHAVE, {
    situacao: s.situacao,
    turnoId: s.turnoId,
    iniciadoEm: s.iniciadoEm,
    pausadoEm: s.pausadoEm,
    motivoPausa: s.motivoPausa,
    ultimoMovimentoEm: s.ultimoMovimentoEm,
    avisoPausaDado: s.avisoPausaDado,
  });
}

function definir(mudanca: Partial<EstadoTurno>) {
  store.definir({ ...store.obter(), ...mudanca });
}

// ---------- Localização em segundo plano ----------

async function ligarLocalizacao(modo: 'ativo' | 'pausado') {
  if (!nativo) return;
  if (await Location.hasStartedLocationUpdatesAsync(TAREFA_LOCALIZACAO).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TAREFA_LOCALIZACAO).catch(() => undefined);
  }
  const ativo = modo === 'ativo';
  await Location.startLocationUpdatesAsync(TAREFA_LOCALIZACAO, {
    accuracy: ativo ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
    timeInterval: ativo ? 1_000 : 15_000,
    distanceInterval: ativo ? 0 : 20,
    activityType: Location.ActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: ativo ? 'Garupa SP · monitorando o turno' : 'Garupa SP · turno pausado',
      notificationBody: ativo ? 'Posição e sensor ligados para o alerta e a queda.' : 'Volta sozinho quando você andar.',
      notificationColor: brand.teal,
      killServiceOnDestroy: false,
    },
  });
}

async function desligarLocalizacao() {
  if (!nativo) return;
  if (await Location.hasStartedLocationUpdatesAsync(TAREFA_LOCALIZACAO).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TAREFA_LOCALIZACAO).catch(() => undefined);
  }
}

// ---------- Acelerômetro ----------

function emSegundoPlano() {
  return AppState.currentState !== 'active';
}

function ligarSensor() {
  if (assinaturaSensor || !nativo) return; // na prévia web não há acelerômetro
  try {
    Accelerometer.setUpdateInterval(50); // 20 Hz
  } catch {
    return;
  }
  assinaturaSensor = Accelerometer.addListener(({ x, y, z }) => {
    const em = Date.now();
    if (ultimaLeituraSensor !== null) {
      contadores.maiorIntervaloSensorMs = Math.max(contadores.maiorIntervaloSensorMs, em - ultimaLeituraSensor);
    }
    ultimaLeituraSensor = em;
    contadores.leiturasSensor += 1;
    if (emSegundoPlano()) contadores.leiturasSensorEmSegundoPlano += 1;
    if (store.obter().situacao === 'ativo') eventoQueda({ tipo: 'aceleracao', em, x, y, z });
  });
}

function desligarSensor() {
  assinaturaSensor?.remove();
  assinaturaSensor = null;
}

// ---------- Pontos críticos perto (para os alertas) ----------

async function atualizarPontosProximos(pos: Ponto, agora: number) {
  const longe = !centroPontos || distanciaMetros(centroPontos, pos) > 1_500;
  if (buscandoPontos || (!longe && agora - pontosAtualizadosEm < 10 * 60_000)) return;
  buscandoPontos = true;
  const c = contextoAgora();
  const chave = `${celulaLocal(pos, 0.02)}|${c.faixa}|${c.tipoDia}|${c.chuva ? 1 : 0}`;
  try {
    const lista = await api.obterRisco({
      lat: pos.lat,
      lon: pos.lon,
      raioMetros: 3_000,
      faixaHoraria: c.faixa,
      tipoDia: c.tipoDia,
      chuva: c.chuva,
    });
    pontos = lista;
    await gravarCache('cache_risco', chave, lista);
  } catch {
    const cache = await lerCache<CelulaCritica[]>('cache_risco', chave);
    if (cache) pontos = cache.payload;
  } finally {
    centroPontos = pos;
    pontosAtualizadosEm = agora;
    buscandoPontos = false;
  }
}

function pontosParaAlerta(): CelulaCritica[] {
  const doPlano = obterPlano().dados?.pontos ?? [];
  const todos = new Map<string, CelulaCritica>();
  [...doPlano, ...pontos].forEach((p) => todos.set(p.celulaId, p));
  return [...todos.values()];
}

async function verificarAlerta(pos: Ponto, agora: number) {
  const s = store.obter();
  if (s.situacao !== 'ativo' || !s.turnoId) return;
  const escolha = escolherAlerta(pos, pontosParaAlerta(), new Set(s.alertados), s.alertasEm, agora);
  if (!escolha) return;
  const { ponto, distanciaM } = escolha;
  definir({ alertados: [...s.alertados, ponto.celulaId], alertasEm: [...s.alertasEm, agora] });
  await registrarAlerta(s.turnoId, ponto.celulaId, agora);
  await notificarPontoCritico(ponto.celulaId, distanciaM);
  void avisarPulseira('ponto_critico');
}

// ---------- Mensagens com a moto parada (RB05) ----------

async function carregarMensagensDoTurno() {
  const prefs = obterPreferencias();
  const c = contextoAgora();
  const contextos = [...new Set([contextoDaMensagem(c.faixa, c.tipoDia, c.chuva), 'ponto_critico' as const, 'geral' as const])];
  const lista: Mensagem[] = [...(obterPlano().dados?.mensagens ?? [])];
  for (const contexto of contextos) {
    try {
      lista.push(...(await api.listarMensagens({ contexto, tipoDeUso: prefs.perfil.tiposDeUso[0] })));
    } catch {
      // sem internet: fica com as do plano
    }
  }
  mensagensDoTurno = [...new Map(lista.map((m) => [m.id, m])).values()];
}

async function talvezMostrarMensagem(agora: number) {
  if (store.obter().situacao !== 'ativo' || obterQueda().ctx.estado !== 'monitorando') return;
  if (agora - ultimaMensagemEm < 20 * 60_000) return;
  const m = escolherMensagem(mensagensDoTurno, await ultimasMensagensExibidas(), await mensagensDispensadasHoje());
  if (!m) return;
  ultimaMensagemEm = agora;
  await registrarMensagemExibida(m.id);
  await notificarMensagem(m);
  void avisarPulseira('mensagem');
}

// ---------- Processamento de cada leitura do GPS ----------

export async function processarLocalizacoes(locs: Location.LocationObject[]): Promise<void> {
  if (!restaurado) await restaurarTurno({ religar: false });
  const s = store.obter();
  if (s.situacao === 'inativo') return;
  const prefs = obterPreferencias();

  for (const loc of locs) {
    const em = loc.timestamp || Date.now();
    const pos = { lat: loc.coords.latitude, lon: loc.coords.longitude };
    let kmh = paraKmh(loc.coords.speed);
    if (kmh === null && anterior && em > anterior.em) {
      kmh = (distanciaMetros(anterior, pos) / ((em - anterior.em) / 1000)) * 3.6;
    }
    anterior = { ...pos, em };
    contadores.leiturasGps += 1;
    if (emSegundoPlano()) contadores.leiturasGpsEmSegundoPlano += 1;
    registrarPosicao({ ...pos, kmh, precisao: loc.coords.accuracy ?? null, em });

    // Movimento (RB18): andou de verdade?
    const andou =
      (kmh !== null && kmh > regras.motoParadaKmh) || (ancoraMovimento !== null && distanciaMetros(ancoraMovimento, pos) > 50);
    if (andou || !ancoraMovimento) ancoraMovimento = pos;
    if (andou) {
      definir({ ultimoMovimentoEm: em, avisoPausaDado: false });
      paradaDesde = null;
      if (store.obter().situacao === 'pausado' && store.obter().motivoPausa === 'inatividade' && (kmh ?? 0) > 10) {
        await retomarTurno();
      }
    } else if (paradaDesde === null) {
      paradaDesde = em;
    }
    definir({ ultimoGpsEm: em });

    if (store.obter().situacao !== 'ativo') continue;

    if (kmh !== null) eventoQueda({ tipo: 'velocidade', em, kmh });

    // Locais frequentes (P1): uma visita por célula a cada 10 min, só com consentimento.
    if (prefs.consentimentos.historicoDeLocais) {
      const celula = celulaLocal(pos);
      if (em - (visitaRegistradaEm.get(celula) ?? 0) > 10 * 60_000) {
        visitaRegistradaEm.set(celula, em);
        void registrarVisita(celula);
      }
    }

    void atualizarPontosProximos(pos, em);
    await verificarAlerta(pos, em);

    if (paradaDesde !== null && em - paradaDesde >= regras.motoParadaSegundos * 1000) {
      await talvezMostrarMensagem(em);
    }
  }
}

// ---------- Pulso: relógio do turno (tela aberta: 1 s; segundo plano: cada leitura do GPS) ----------

export async function pulso(agora = Date.now()): Promise<void> {
  relogioDaQueda(agora);

  const s = store.obter();

  // Pulseira: consulta a cada 2 s com o app aberto ou o turno ativo (RF28).
  if (pulseiraPareada() && agora - ultimaConsultaPulseira >= regras.intervaloVestivelMs) {
    ultimaConsultaPulseira = agora;
    for (const ev of await consultarEventosPulseira()) {
      if (ev.tipo === 'impacto') impactoExterno('vestivel');
      else if (ev.tipo === 'sos') await dispararSos({ tipo: 'queda', origem: 'vestivel' });
      else if (ev.tipo === 'cancelar') await estouBem();
    }
  }

  // Fila de SOS a cada 15 s (além de quando a conexão volta).
  if (agora - ultimaFila >= 15_000) {
    ultimaFila = agora;
    void processarFilaSos();
  }

  // Inatividade (RB18): aviso aos 25 min, pausa aos 30 min.
  if (s.situacao === 'ativo' && s.ultimoMovimentoEm) {
    const paradoMin = (agora - s.ultimoMovimentoEm) / 60_000;
    const limite = regras.pausaInatividadeMinutos;
    const aviso = limite - regras.avisoAntesDaPausaMinutos;
    if (paradoMin >= limite) {
      await pausarTurno('inatividade');
    } else if (paradoMin >= aviso && !s.avisoPausaDado) {
      definir({ avisoPausaDado: true });
      await notificarAvisoPausa(Math.floor(paradoMin), Math.ceil(limite - paradoMin));
    }
  }

  // Diagnóstico e indicadores da tela: no máximo uma vez por segundo.
  if (agora - ultimoPulsoTela >= 1_000) {
    ultimoPulsoTela = agora;
    const bg = emSegundoPlano();
    if (bg && contadores.segundoPlanoDesde === null) contadores.segundoPlanoDesde = agora;
    if (!bg && contadores.segundoPlanoDesde !== null) {
      contadores.tempoEmSegundoPlanoMs += agora - contadores.segundoPlanoDesde;
      contadores.segundoPlanoDesde = null;
    }
    definir({
      ultimaLeituraSensorEm: ultimaLeituraSensor,
      pontosProximos: pontosParaAlerta().length,
      diagnostico: { ...contadores },
    });
  }
}

// ---------- Ações do turno ----------

function textoTurno(): string {
  const n = pontosParaAlerta().length;
  return n > 0 ? `${n} pontos críticos na sua área agora` : 'Monitorando em segundo plano';
}

export type ResultadoInicio = { ok: true } | { ok: false; faltas: string[] };

/** Inicia o turno: só com localização o tempo todo e notificações (RF36, RB18). */
export async function iniciarTurno(): Promise<ResultadoInicio> {
  if (store.obter().situacao !== 'inativo') return { ok: true };
  if (nativo) {
    const status = await lerStatusPermissoes();
    const faltas = faltasParaOTurno(status, obterPreferencias().consentimentos.localizacaoEmSegundoPlano);
    if (faltas.length) return { ok: false, faltas };
  }
  await configurarNotificacoes();

  const agora = Date.now();
  const turnoId = novoEventoId();
  await registrarTurno(turnoId, agora);
  Object.assign(contadores, DIAGNOSTICO_VAZIO);
  ultimaLeituraSensor = null;
  ancoraMovimento = null;
  paradaDesde = null;
  ultimaMensagemEm = Date.now(); // a mensagem do turno já apareceu na tela "Antes de sair"
  store.definir({ ...INICIAL, situacao: 'ativo', turnoId, iniciadoEm: agora, ultimoMovimentoEm: agora });
  restaurado = true;
  await persistir();

  try {
    await ligarLocalizacao('ativo');
  } catch (e) {
    store.definir(INICIAL);
    await persistir();
    return { ok: false, faltas: [`Não foi possível ligar a localização em segundo plano: ${(e as Error).message}`] };
  }
  ligarSensor();
  void carregarMensagensDoTurno();
  await notificarTurno('ativo', textoTurno());
  void avisarPulseira('turno_ativo');
  return { ok: true };
}

export async function pausarTurno(motivo: 'manual' | 'inatividade' = 'manual'): Promise<void> {
  const s = store.obter();
  if (s.situacao !== 'ativo' || !s.turnoId) return;
  definir({ situacao: 'pausado', pausadoEm: Date.now(), motivoPausa: motivo });
  await persistir();
  await mudarEstadoTurno(s.turnoId, 'pausado');
  desligarSensor();
  eventoQueda({ tipo: 'cancelar', em: Date.now() }); // detector só com turno ativo (RB02)
  await removerAvisoPausa();
  await ligarLocalizacao('pausado').catch(() => undefined);
  await notificarTurno(
    'pausado',
    motivo === 'inatividade' ? '30 min sem movimento. Volta sozinho quando você andar.' : 'Toque em Retomar quando sair.',
  );
  void avisarPulseira('turno_encerrado');
}

export async function retomarTurno(): Promise<void> {
  const s = store.obter();
  if (s.situacao !== 'pausado' || !s.turnoId) return;
  const agora = Date.now();
  definir({ situacao: 'ativo', pausadoEm: null, motivoPausa: null, ultimoMovimentoEm: agora, avisoPausaDado: false });
  await persistir();
  await mudarEstadoTurno(s.turnoId, 'ativo');
  await ligarLocalizacao('ativo').catch(() => undefined);
  ligarSensor();
  await notificarTurno('ativo', textoTurno());
  void avisarPulseira('turno_ativo');
}

export async function finalizarTurno(): Promise<void> {
  const s = store.obter();
  if (s.situacao === 'inativo') return;
  if (s.turnoId) await mudarEstadoTurno(s.turnoId, 'finalizado');
  desligarSensor();
  await desligarLocalizacao();
  if (obterQueda().ctx.estado !== 'sos_enviado') eventoQueda({ tipo: 'cancelar', em: Date.now() });
  await removerNotificacaoTurno();
  await removerAvisoPausa();
  store.definir({ ...INICIAL, diagnostico: { ...contadores } });
  await persistir();
  void avisarPulseira('turno_encerrado');
}

/**
 * Na abertura do app (ou quando o sistema reabre só a tarefa do GPS), recupera o turno salvo.
 * Com `religar`, liga de novo o GPS e o sensor (o sistema pode ter encerrado o app).
 */
export async function restaurarTurno(opcoes: { religar: boolean } = { religar: true }): Promise<void> {
  restaurado = true;
  const salvo = await lerValor<Partial<EstadoTurno>>(CHAVE);
  if (!salvo?.situacao || salvo.situacao === 'inativo' || !salvo.turnoId) return;
  const alertas = await alertasDoTurno(salvo.turnoId);
  store.definir({
    ...INICIAL,
    ...salvo,
    alertados: alertas.map((a) => a.celulaId),
    alertasEm: alertas.map((a) => a.em),
  } as EstadoTurno);
  if (!opcoes.religar) return;
  if (salvo.situacao === 'ativo') {
    if (!(await Location.hasStartedLocationUpdatesAsync(TAREFA_LOCALIZACAO).catch(() => true))) {
      await ligarLocalizacao('ativo').catch(() => undefined);
    }
    ligarSensor();
    void carregarMensagensDoTurno();
  }
}
