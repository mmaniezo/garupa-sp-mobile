import { api, ehErroDeRede } from '@/api';
import type { CelulaCritica, FaixaHoraria, Mensagem, TipoDia } from '@/api/types';
import { regras } from '@/config';
import { obterPreferencias } from '@/dados-locais/preferencias';
import { gravarCache, lerCache, lerVisitas, mensagensDispensadasHoje } from '@/dados-locais/repositorios';
import { faixaHoraria, tipoDia } from '@/domain/contexto';
import { celulaLocal } from '@/domain/geo';
import { contextoDaMensagem } from '@/domain/mensagens';
import { criarStore } from '@/lib/store';
import { obterSessao } from '@/state/sessao';

import { obterPosicao } from './posicao';

/**
 * Plano do turno (RF07, RF10, RF11, RB07):
 * - com distritos: GET /plano-do-turno (pontos dos distritos e até 2 mensagens);
 * - sem distritos: GET /risco num raio de 3 km da posição atual e convite para completar o perfil;
 * - sem internet: o último plano do cache, com o horário em que foi atualizado (RNF10).
 * A personalização muda a ordem e o conteúdo, nunca o score (RB06). Os locais frequentes
 * (P1) só reordenam, e nunca saem do aparelho.
 */

export type ContextoPlano = { faixa: FaixaHoraria; tipoDia: TipoDia; chuva: boolean };
export type PontoDoPlano = CelulaCritica & { visitas: number };

export type DadosPlano = {
  pontos: PontoDoPlano[];
  mensagens: Mensagem[];
  contexto: ContextoPlano;
  origem: 'api' | 'cache';
  atualizadoEm: string;
  semDistritos: boolean;
  semLocalizacao: boolean;
};

export type EstadoPlano = { carregando: boolean; dados: DadosPlano | null; erro: string | null };

const store = criarStore<EstadoPlano>({ carregando: false, dados: null, erro: null });
export const usePlano = store.useStore;
export const obterPlano = store.obter;

export function contextoAgora(chuva = obterPreferencias().chuva): ContextoPlano {
  const agora = new Date();
  return { faixa: faixaHoraria(agora), tipoDia: tipoDia(agora), chuva };
}

const chaveCache = (c: ContextoPlano, distritos: number[]) =>
  `${c.faixa}|${c.tipoDia}|${c.chuva ? 1 : 0}|${distritos.join(',') || 'raio'}`;

type Bruto = { pontos: CelulaCritica[]; mensagens: Mensagem[]; semLocalizacao: boolean };

async function buscarNaApi(c: ContextoPlano, distritos: number[]): Promise<Bruto> {
  const prefs = obterPreferencias();
  const usuarioId = obterSessao().usuarioId!;
  if (distritos.length > 0) {
    const plano = await api.obterPlanoDoTurno({ usuarioId, faixaHoraria: c.faixa, tipoDia: c.tipoDia, chuva: c.chuva });
    return { pontos: plano.pontosCriticos, mensagens: plano.mensagens, semLocalizacao: false };
  }
  // RB07: sem distritos, pontos num raio da posição atual.
  const tipoDeUso = prefs.perfil.tiposDeUso[0];
  const mensagens = await api.listarMensagens({ contexto: contextoDaMensagem(c.faixa, c.tipoDia, c.chuva), tipoDeUso });
  const pos = await obterPosicao(5 * 60_000, 6_000);
  if (!pos) return { pontos: [], mensagens: mensagens.slice(0, 2), semLocalizacao: true };
  const pontos = await api.obterRisco({
    lat: pos.lat,
    lon: pos.lon,
    raioMetros: regras.raioSemDistritosKm * 1000,
    faixaHoraria: c.faixa,
    tipoDia: c.tipoDia,
    chuva: c.chuva,
  });
  return { pontos, mensagens: mensagens.slice(0, 2), semLocalizacao: false };
}

/** Ordem final: só acima do corte; locais frequentes primeiro (P1), depois o score. */
async function ordenar(pontos: CelulaCritica[]): Promise<PontoDoPlano[]> {
  const usarVisitas = obterPreferencias().consentimentos.historicoDeLocais;
  const visitas = usarVisitas ? await lerVisitas() : new Map<string, number>();
  return pontos
    .filter((p) => p.percentil >= regras.percentilCorte)
    .map((p) => ({ ...p, visitas: visitas.get(celulaLocal({ lat: p.centroLat, lon: p.centroLon })) ?? 0 }))
    .sort((a, b) => Number(b.visitas > 0) - Number(a.visitas > 0) || b.score - a.score);
}

export async function carregarPlano(contexto: ContextoPlano = contextoAgora()): Promise<void> {
  if (!obterSessao().usuarioId) return;
  const distritos = obterPreferencias().perfil.distritos.map((d) => d.distritoId);
  const chave = chaveCache(contexto, distritos);
  store.definir({ ...store.obter(), carregando: true, erro: null });

  try {
    const bruto = await buscarNaApi(contexto, distritos);
    await gravarCache('cache_plano', chave, bruto);
    await publicar(bruto, contexto, 'api', new Date().toISOString(), distritos.length === 0);
  } catch (e) {
    const cache = await lerCache<Bruto>('cache_plano', chave);
    if (cache) {
      await publicar(cache.payload, contexto, 'cache', cache.atualizadoEm, distritos.length === 0);
    } else {
      store.definir({
        carregando: false,
        dados: store.obter().dados,
        erro: ehErroDeRede(e)
          ? 'Sem internet e sem plano guardado. Tente de novo quando tiver sinal.'
          : 'Não foi possível montar o plano agora.',
      });
    }
  }
}

async function publicar(b: Bruto, contexto: ContextoPlano, origem: 'api' | 'cache', em: string, semDistritos: boolean) {
  const dispensadas = await mensagensDispensadasHoje();
  store.definir({
    carregando: false,
    erro: null,
    dados: {
      pontos: await ordenar(b.pontos),
      mensagens: b.mensagens.filter((m) => !dispensadas.has(m.id)),
      contexto,
      origem,
      atualizadoEm: em,
      semDistritos,
      semLocalizacao: b.semLocalizacao,
    },
  });
}

/** Tira a mensagem dispensada da tela na hora (o registro fica no SQLite). */
export function esconderMensagem(id: string) {
  const atual = store.obter();
  if (!atual.dados) return;
  store.definir({ ...atual, dados: { ...atual.dados, mensagens: atual.dados.mensagens.filter((m) => m.id !== id) } });
}

export function limparPlano() {
  store.definir({ carregando: false, dados: null, erro: null });
}
