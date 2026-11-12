/**
 * Dados da API simulada, os mesmos da API real (garupa-sp-api):
 *
 * - Distritos: os 96 do município, com os ids IBGE que a API usa (distritos.json).
 * - Risco: as células e os scores do modelo de ML (risco-modelo.json, gerado do
 *   risco_celula.csv do garupa-sp-ml). É histórico de sinistros, não previsão individual.
 * - Mensagens: o catálogo inicial da API (CatalogoInicial.cs), com o link da fonte.
 *
 * Para atualizar quando o modelo mudar:
 *   node scripts/gerar-dados-mock.mjs <risco_celula.csv> <distritos.json da API>
 */
import type { ContextoMensagem, Distrito, FaixaHoraria, Mensagem, TipoDia, TipoUso } from '../types';

import distritos from './distritos.json';
import modelo from './risco-modelo.json';

export const DISTRITOS: Distrito[] = distritos;

export function distritoPorNome(nome: string) {
  return DISTRITOS.find((d) => d.nome === nome);
}

export const VERSAO_MODELO: string = modelo.versaoModelo;

export type CelulaMock = {
  celulaId: string;
  centroLat: number;
  centroLon: number;
  viaReferencia: string;
  distritoId: number;
  distritoNome: string;
  /** [score, percentil] por contexto; índice = faixa × 6 + dia × 2 + chuva. */
  risco: [number, number][];
};

const nomes = new Map(DISTRITOS.map((d) => [d.distritoId, d.nome]));

export const CELULAS: CelulaMock[] = modelo.celulas.map((c) => ({
  ...c,
  distritoNome: nomes.get(c.distritoId) ?? '',
  risco: c.risco as [number, number][],
}));

export const DIAS: readonly TipoDia[] = ['util', 'sabado', 'domingo'];

/** Score e percentil do modelo para a célula no contexto. O mesmo para todos (RB06). */
export function riscoDaCelula(c: CelulaMock, faixa: FaixaHoraria, dia: TipoDia, chuva: boolean) {
  const [score, percentil] = c.risco[faixa * 6 + DIAS.indexOf(dia) * 2 + (chuva ? 1 : 0)];
  return { score, percentil };
}

const DNIT = 'https://www.gov.br/dnit/pt-br/assuntos/noticias/motociclista-no-transito-a-atencao-precisa-ser-redobrada';
const VITORIA = 'https://vitoria.es.gov.br/setran/dicas-para-motociclistas';

type MensagemCatalogo = Mensagem & { contexto: ContextoMensagem; tipoDeUso: TipoUso | null };

const m = (id: number, texto: string, contexto: ContextoMensagem, tipoDeUso: TipoUso | null, fonte = DNIT): MensagemCatalogo => ({
  id: String(id),
  texto,
  fonte,
  contexto,
  tipoDeUso,
});

/** Catálogo inicial da API, na mesma ordem e com os mesmos ids. */
export const MENSAGENS: MensagemCatalogo[] = [
  m(1, 'Mantenha o capacete afivelado e a viseira em boas condições.', 'geral', null),
  m(2, 'Com chuva, diminua a velocidade: o piso molhado reduz a aderência.', 'chuva', null),
  m(3, 'Use luvas, roupa de proteção e calçado fechado ao pilotar.', 'geral', 'trabalho_moto'),
  m(4, 'Na entrega com chuva, reduza a velocidade e preserve sua segurança.', 'chuva', 'entregador_app'),
  m(5, 'Mantenha atenção às condições da via e espaço para reagir.', 'ponto_critico', null),
  m(6, 'No passeio, use capacete afivelado e equipamento de proteção.', 'domingo', 'lazer'),
  m(7, 'À noite, roupas claras e resistentes ajudam a manter você visível no trânsito.', 'noite', null, VITORIA),
  m(8, 'Antes de sair no domingo, confira as condições dos freios, luzes e pneus.', 'domingo', null),
];
