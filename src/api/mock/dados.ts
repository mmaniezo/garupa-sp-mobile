/**
 * Dados de exemplo da API simulada. NÃO são dados reais de risco.
 *
 * - Distritos: os 96 distritos do município de São Paulo, com ids sequenciais só do mock
 *   (os ids reais vêm de GET /distritos, a partir da camada do GeoSampa).
 * - Células: pontos fictícios perto do centro aproximado de alguns distritos, com vias
 *   genéricas ("Via de exemplo A"). O mapa real vem do risco_celula.csv do modelo.
 * - Mensagens: rascunhos do design; a equipe escreve o catálogo final, com fonte oficial
 *   para cada texto (RB05, RNF22).
 */
import type { ContextoMensagem, Mensagem, TipoUso } from '../types';

const NOMES_DISTRITOS = [
  'Água Rasa', 'Alto de Pinheiros', 'Anhanguera', 'Aricanduva', 'Artur Alvim', 'Barra Funda',
  'Bela Vista', 'Belém', 'Bom Retiro', 'Brás', 'Brasilândia', 'Butantã', 'Cachoeirinha', 'Cambuci',
  'Campo Belo', 'Campo Grande', 'Campo Limpo', 'Cangaíba', 'Capão Redondo', 'Carrão', 'Casa Verde',
  'Cidade Ademar', 'Cidade Dutra', 'Cidade Líder', 'Cidade Tiradentes', 'Consolação', 'Cursino',
  'Ermelino Matarazzo', 'Freguesia do Ó', 'Grajaú', 'Guaianases', 'Iguatemi', 'Ipiranga',
  'Itaim Bibi', 'Itaim Paulista', 'Itaquera', 'Jabaquara', 'Jaçanã', 'Jaguara', 'Jaguaré', 'Jaraguá',
  'Jardim Ângela', 'Jardim Helena', 'Jardim Paulista', 'Jardim São Luís', 'José Bonifácio', 'Lajeado',
  'Lapa', 'Liberdade', 'Limão', 'Mandaqui', 'Marsilac', 'Moema', 'Mooca', 'Morumbi', 'Parelheiros',
  'Pari', 'Parque do Carmo', 'Pedreira', 'Penha', 'Perdizes', 'Perus', 'Pinheiros', 'Pirituba',
  'Ponte Rasa', 'Raposo Tavares', 'República', 'Rio Pequeno', 'Sacomã', 'Santa Cecília', 'Santana',
  'Santo Amaro', 'São Domingos', 'São Lucas', 'São Mateus', 'São Miguel', 'São Rafael', 'Sapopemba',
  'Saúde', 'Sé', 'Socorro', 'Tatuapé', 'Tremembé', 'Tucuruvi', 'Vila Andrade', 'Vila Curuçá',
  'Vila Formosa', 'Vila Guilherme', 'Vila Jacuí', 'Vila Leopoldina', 'Vila Maria', 'Vila Mariana',
  'Vila Matilde', 'Vila Medeiros', 'Vila Prudente', 'Vila Sônia',
];

export const DISTRITOS = NOMES_DISTRITOS.map((nome, i) => ({ distritoId: i + 1, nome }));

export function distritoPorNome(nome: string) {
  return DISTRITOS.find((d) => d.nome === nome);
}

/** Centros aproximados, só para espalhar as células de exemplo no mapa. */
const ANCORAS: [string, number, number][] = [
  ['Pinheiros', -23.5671, -46.6937],
  ['Butantã', -23.5718, -46.7085],
  ['Vila Mariana', -23.5893, -46.6345],
  ['Sé', -23.5503, -46.634],
  ['República', -23.5446, -46.6424],
  ['Mooca', -23.559, -46.599],
  ['Itaim Bibi', -23.5846, -46.678],
  ['Lapa', -23.5225, -46.704],
  ['Santo Amaro', -23.654, -46.709],
  ['Tatuapé', -23.5404, -46.5763],
  ['Santana', -23.502, -46.625],
  ['Jabaquara', -23.646, -46.641],
  ['Consolação', -23.553, -46.66],
  ['Bela Vista', -23.561, -46.645],
  ['Campo Limpo', -23.633, -46.76],
  ['Capão Redondo', -23.672, -46.779],
  ['São Mateus', -23.61, -46.48],
  ['Itaquera', -23.536, -46.456],
  ['Freguesia do Ó', -23.496, -46.697],
  ['Penha', -23.526, -46.543],
];

export type CelulaMock = {
  celulaId: string;
  centroLat: number;
  centroLon: number;
  viaReferencia: string;
  distritoId: number;
  distritoNome: string;
  /** Base de 0 a 1 que o mock modula por faixa, dia e chuva. */
  base: number;
};

/** Número pseudoaleatório estável a partir de um texto (mesmo texto, mesmo valor). */
export function hash01(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

const LETRAS = ['A', 'B', 'C'];
const DESLOCAMENTOS: [number, number][] = [
  [0.004, -0.003],
  [-0.005, 0.004],
  [0.002, 0.006],
];

export const CELULAS: CelulaMock[] = ANCORAS.flatMap(([nome, lat, lon]) => {
  const distrito = distritoPorNome(nome)!;
  return LETRAS.map((letra, i) => {
    const celulaId = `mock-${distrito.distritoId}-${letra}`;
    return {
      celulaId,
      centroLat: +(lat + DESLOCAMENTOS[i][0]).toFixed(5),
      centroLon: +(lon + DESLOCAMENTOS[i][1]).toFixed(5),
      viaReferencia: `Via de exemplo ${letra}`,
      distritoId: distrito.distritoId,
      distritoNome: distrito.nome,
      base: 0.35 + 0.6 * hash01(celulaId),
    };
  });
});

/** Rascunhos do catálogo. A fonte oficial de cada texto ainda será definida pela equipe. */
const FONTE_A_DEFINIR = '[FONTE OFICIAL]';

export const MENSAGENS: (Mensagem & { contexto: ContextoMensagem; tipoDeUso: TipoUso | null })[] = [
  {
    id: 'msg-chuva-1',
    texto: 'Na chuva, a frenagem fica mais longa. Dobre a distância do carro da frente.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'chuva',
    tipoDeUso: null,
  },
  {
    id: 'msg-chuva-2',
    texto: 'Chuva no pico do jantar: freie antes e dobre a distância do carro da frente.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'chuva',
    tipoDeUso: 'entregador_app',
  },
  {
    id: 'msg-ponto-1',
    texto: 'Parar perto da esquina tira a visão de quem vem. Encoste um pouco antes ou depois.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'ponto_critico',
    tipoDeUso: 'entregador_app',
  },
  {
    id: 'msg-ponto-2',
    texto: 'Cruzamento à frente: reduza antes e evite o corredor entre os carros.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'ponto_critico',
    tipoDeUso: null,
  },
  {
    id: 'msg-noite-1',
    texto: 'À noite, farol aceso e roupa com faixa refletiva ajudam quem vem a te ver.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'noite',
    tipoDeUso: null,
  },
  {
    id: 'msg-noite-2',
    texto: 'Fim de jornada pesa nos reflexos. Uma pausa curta antes do próximo pedido ajuda.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'noite',
    tipoDeUso: 'trabalho_moto',
  },
  {
    id: 'msg-domingo-1',
    texto: 'Domingo é o dia com mais mortes no trânsito da capital. Vá com calma.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'domingo',
    tipoDeUso: 'lazer',
  },
  {
    id: 'msg-geral-1',
    texto: 'A entrega espera. Você chegar inteiro é o que importa.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'geral',
    tipoDeUso: 'entregador_app',
  },
  {
    id: 'msg-geral-2',
    texto: 'Horário de pico: mais carro trocando de faixa. Deixe espaço dos dois lados.',
    fonte: FONTE_A_DEFINIR,
    contexto: 'geral',
    tipoDeUso: 'ida_volta',
  },
];
