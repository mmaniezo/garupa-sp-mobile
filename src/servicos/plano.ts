import { api, ehErroDeRede } from '@/api';
import { sessaoExpirada } from '@/api/token';
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
  /** Com origem 'cache': se foi por falta de internet (o aviso diz "Sem internet"). */
  semInternet: boolean;
  /** Com origem 'cache': o plano guardado é de outro horário ou clima (o contexto é o dele). */
  outroContexto: boolean;
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
/** No cache vai junto o contexto (versões antigas não guardavam). */
type Guardado = Bruto & { contexto?: ContextoPlano };

/** Um raio de 50 km (o máximo da API) a partir deste ponto cobre o município inteiro. */
const COBERTURA_SP = { lat: -23.68, lon: -46.6, raioMetros: 50_000 };

async function buscarNaApi(c: ContextoPlano, distritos: number[]): Promise<Bruto> {
  const prefs = obterPreferencias();
  const usuarioId = obterSessao().usuarioId!;
  const tipoDeUso = prefs.perfil.tiposDeUso[0];
  const contexto = contextoDaMensagem(c.faixa, c.tipoDia, c.chuva);
  if (distritos.length > 0) {
    // A API só guarda o perfil com o consentimento e ao menos um tipo de uso (servicos/cadastro.ts).
    const perfilNaApi = prefs.consentimentos.perfilDeUso && prefs.perfil.tiposDeUso.length > 0;
    if (perfilNaApi) {
      const plano = await api.obterPlanoDoTurno({ usuarioId, faixaHoraria: c.faixa, tipoDia: c.tipoDia, chuva: c.chuva });
      return { pontos: plano.pontosCriticos, mensagens: plano.mensagens, semLocalizacao: false };
    }
    // Perfil só no aparelho: os mesmos pontos, da cidade toda, filtrados pelos distritos aqui.
    const [todos, mensagens] = await Promise.all([
      api.obterRisco({ ...COBERTURA_SP, faixaHoraria: c.faixa, tipoDia: c.tipoDia, chuva: c.chuva }),
      api.listarMensagens({ contexto, tipoDeUso }),
    ]);
    const pontos = todos.filter((p) => p.distritoId !== undefined && distritos.includes(p.distritoId));
    return { pontos, mensagens: mensagens.slice(0, 2), semLocalizacao: false };
  }
  // RB07: sem distritos, pontos num raio da posição atual.
  const mensagens = await api.listarMensagens({ contexto, tipoDeUso });
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

// "Usar meu perfil de uso e distritos" desmarcado: o plano não usa os distritos (raio da posição).
function distritosDoPlano(): number[] {
  const prefs = obterPreferencias();
  return prefs.consentimentos.perfilDeUso ? prefs.perfil.distritos.map((d) => d.distritoId) : [];
}

/**
 * Tudo o que muda o plano: conta, faixa horária, tipo de dia, chuva, distritos, tipo de uso e os
 * consentimentos que ele usa. Se algo disso muda, o plano é montado de novo sozinho.
 */
function assinatura(contexto: ContextoPlano): string {
  const prefs = obterPreferencias();
  return [
    obterSessao().usuarioId,
    chaveCache(contexto, distritosDoPlano()),
    prefs.perfil.tiposDeUso.join(','),
    prefs.consentimentos.perfilDeUso ? 1 : 0,
    prefs.consentimentos.historicoDeLocais ? 1 : 0,
  ].join('|');
}

let assinaturaCarregada: string | null = null;
let ultimaTentativa = 0;
/** Cada carga ganha um número; se outra começou depois, a resposta mais velha é descartada. */
let geracao = 0;

export async function carregarPlano(contexto: ContextoPlano = contextoAgora()): Promise<void> {
  if (!obterSessao().usuarioId) return;
  const distritos = distritosDoPlano();
  const chave = chaveCache(contexto, distritos);
  const minha = ++geracao;
  assinaturaCarregada = assinatura(contexto);
  ultimaTentativa = Date.now();
  store.definir({ ...store.obter(), carregando: true, erro: null });
  const vale = () => minha === geracao;

  try {
    const bruto = await buscarNaApi(contexto, distritos);
    const guardado: Guardado = { ...bruto, contexto };
    await gravarCache('cache_plano', chave, guardado);
    if (vale()) await publicar(bruto, contexto, 'api', new Date().toISOString(), distritos.length === 0, false, false, vale);
  } catch (e) {
    if (!vale()) return;
    // O cache desta chave; sem ele, o último guardado, mas mostrado com o contexto dele (outra
    // faixa ou outra chuva), nunca com a etiqueta de agora.
    const cache = await lerCache<Guardado>('cache_plano', chave);
    const contextoDoCache = cache?.mesmaChave ? contexto : cache?.payload.contexto;
    if (cache && contextoDoCache) {
      const semInternet = ehErroDeRede(e);
      const outro = !cache.mesmaChave;
      await publicar(cache.payload, contextoDoCache, 'cache', cache.atualizadoEm, distritos.length === 0, semInternet, outro, vale);
    } else if (vale()) {
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

/** Intervalo mínimo para tentar de novo quando a última carga não veio da API. */
const TENTAR_DE_NOVO_MS = 60_000;

/**
 * Monta o plano de novo se algo que o define mudou (faixa horária, distritos, chuva, conta…),
 * ou se a última carga não veio da API (sem internet, erro) e já dá para tentar de novo.
 * Barato: sem mudança, não chama a API.
 */
export function atualizarPlanoSeMudou(): void {
  const prefs = obterPreferencias();
  if (!obterSessao().usuarioId || !prefs.carregadas) return;
  const agora = contextoAgora();
  if (assinatura(agora) !== assinaturaCarregada) {
    void carregarPlano(agora);
    return;
  }
  const { carregando, dados, erro } = store.obter();
  const semApi = !!erro || dados?.origem === 'cache';
  if (semApi && !carregando && !sessaoExpirada() && Date.now() - ultimaTentativa >= TENTAR_DE_NOVO_MS) {
    void carregarPlano(agora);
  }
}

async function publicar(
  b: Bruto,
  contexto: ContextoPlano,
  origem: 'api' | 'cache',
  em: string,
  semDistritos: boolean,
  semInternet: boolean,
  outroContexto: boolean,
  vale: () => boolean,
) {
  const dispensadas = await mensagensDispensadasHoje();
  const pontos = await ordenar(b.pontos);
  if (!vale()) return;
  store.definir({
    carregando: false,
    erro: null,
    dados: {
      pontos,
      mensagens: b.mensagens.filter((m) => !dispensadas.has(m.id)),
      contexto,
      origem,
      semInternet,
      outroContexto,
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
  geracao += 1;
  assinaturaCarregada = null;
  store.definir({ carregando: false, dados: null, erro: null });
}
