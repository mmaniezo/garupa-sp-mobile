import { atualizarPreferencias, obterPreferencias } from '@/dados-locais/preferencias';
import { CENTRO_SP, chovendoAgora, urlDoTempoAtual, type TempoAtual } from '@/domain/clima';
import type { Ponto } from '@/domain/geo';
import { criarStore } from '@/lib/store';

import { obterPlano } from './plano';
import { obterPosicao } from './posicao';

/**
 * Chuva automática (RF10): consulta o tempo atual na Open-Meteo (grátis, sem chave, uso não
 * comercial, dados CC BY 4.0) e liga ou desliga "Chovendo" sozinho. A posição sai do aparelho
 * arredondada em cerca de 5 km (domain/clima.ts) e sem nada que identifique a pessoa.
 * Quem toca em Seco ou Chovendo assume à mão até pedir "Detectar sozinho" de novo.
 */

export type EstadoClima = {
  situacao: 'aguardando' | 'consultando' | 'ok' | 'sem-dados';
  /** Hora (ms) da última consulta que deu certo. */
  em: number | null;
};

const store = criarStore<EstadoClima>({ situacao: 'aguardando', em: null });
export const useClima = store.useStore;

/** A chuva muda rápido, mas não precisa de mais que uma consulta a cada 10 minutos. */
const INTERVALO_MS = 10 * 60_000;
/** Depois de uma falha, tenta de novo em 2 minutos. */
const NOVA_TENTATIVA_MS = 2 * 60_000;
const PRAZO_MS = 8_000;

let proximaConsulta = 0;
let consultando = false;

/** Onde perguntar: a posição (aproximada), o meio dos pontos do plano ou o centro de SP. */
async function pontoDaConsulta(): Promise<Ponto> {
  const pos = await obterPosicao(30 * 60_000, 4_000);
  if (pos) return pos;
  const pontos = obterPlano().dados?.pontos ?? [];
  if (pontos.length > 0) {
    return {
      lat: pontos.reduce((t, p) => t + p.centroLat, 0) / pontos.length,
      lon: pontos.reduce((t, p) => t + p.centroLon, 0) / pontos.length,
    };
  }
  return CENTRO_SP;
}

async function consultar(ponto: Ponto): Promise<boolean> {
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), PRAZO_MS);
  try {
    const resposta = await fetch(urlDoTempoAtual(ponto), { signal: controle.signal });
    if (!resposta.ok) throw new Error(`Open-Meteo respondeu ${resposta.status}`);
    const corpo = (await resposta.json()) as { current?: TempoAtual };
    if (!corpo.current) throw new Error('Open-Meteo sem o tempo atual.');
    return chovendoAgora(corpo.current);
  } finally {
    clearTimeout(prazo);
  }
}

/**
 * Atualiza "Chovendo" pela previsão, se a chuva automática estiver ligada. Sem pressa: respeita
 * o intervalo entre consultas (use `agora` para consultar já, como ao religar o automático).
 * Mudou a chuva? As preferências mudam e o plano se monta de novo sozinho.
 */
export async function atualizarChuvaAutomatica(agora = false): Promise<void> {
  const prefs = obterPreferencias();
  if (!prefs.carregadas || !prefs.chuvaAutomatica || consultando) return;
  if (!agora && Date.now() < proximaConsulta) return;
  consultando = true;
  store.definir((s) => ({ ...s, situacao: 'consultando' }));
  try {
    const chovendo = await consultar(await pontoDaConsulta());
    proximaConsulta = Date.now() + INTERVALO_MS;
    store.definir({ situacao: 'ok', em: Date.now() });
    const atuais = obterPreferencias();
    if (atuais.chuvaAutomatica && atuais.chuva !== chovendo) await atualizarPreferencias({ chuva: chovendo });
  } catch {
    proximaConsulta = Date.now() + NOVA_TENTATIVA_MS;
    store.definir((s) => ({ ...s, situacao: 'sem-dados' }));
  } finally {
    consultando = false;
  }
}

/** A pessoa escolheu Seco ou Chovendo: vale a escolha dela, e o automático desliga. */
export async function escolherChuvaAMao(chuva: boolean): Promise<void> {
  await atualizarPreferencias({ chuva, chuvaAutomatica: false });
}

/** "Detectar sozinho": religa o automático e consulta na hora. */
export async function voltarChuvaAutomatica(): Promise<void> {
  await atualizarPreferencias({ chuvaAutomatica: true });
  await atualizarChuvaAutomatica(true);
}
