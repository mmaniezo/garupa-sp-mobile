/**
 * Cores do manual da marca Garupa SP (v0.2 · 07/11/2026).
 *
 * Regras do manual:
 * - Teal é marca, não alerta: nunca usar teal para dizer "seguro" ou "perigo".
 * - Vermelho fica reservado para queda e SOS.
 * - A cor nunca vem sozinha: cada estado de alerta tem ícone, texto e (na pulseira) padrão de piscada.
 * - Contraste mínimo 4,5:1 em todo texto (RNF09).
 */
export const brand = {
  /** Marca, botões, mapa. Texto sobre ele: Asfalto (5,5:1). */
  teal: '#099BA9',
  /** Texto e links teal no tema claro (5,8:1). */
  tealProfundo: '#06707A',
  /** Fundo do tema escuro e texto principal. */
  asfalto: '#111417',
  /** Cartões e superfícies no tema escuro. */
  viseira: '#2A3237',
  /** Fundo do tema claro. */
  neblina: '#F4F6F7',
  branco: '#FFFFFF',
} as const;

/** Cores de alerta: a mesma linguagem do app e do LED da pulseira (RF39, RB19). */
export const alerta = {
  /** Turno ativo e "Estou bem". */
  seguro: '#15803D',
  /** Ponto crítico à frente. Texto em Asfalto. */
  atencao: '#F5A524',
  /** Mensagem de conscientização, só com a moto parada. */
  informacao: '#1D5FD1',
  /** Contagem da queda e SOS enviado. */
  emergencia: '#D62828',
  /** Pulseira sem conexão com a API. */
  semConexao: '#5B666D',
} as const;

/**
 * Tons de apoio usados nas telas do design (derivados da paleta acima).
 * Cada um tem um uso definido; não criar tons novos fora daqui.
 */
export const tons = {
  // Tema escuro
  superficie: '#1B2125', // campos e cartões sobre Asfalto
  borda: '#3A444A', // borda de campo, chip não selecionado
  textoSecundario: '#B7C0C5', // texto de apoio sobre Asfalto
  neutroBarra: '#8A949A', // barras neutras, borda tracejada
  tealSelecionadoFundo: '#0F3A3F', // cartão selecionado
  tealClaro: '#6FD6DF', // texto teal sobre fundo teal escuro
  mapaFundo: '#0C0F11',
  telaBloqueio: '#0B0E10',

  // Verde (seguro) em fundo escuro
  seguroClaro: '#3CCB7F',

  // Azul (informação)
  informacaoFundo: '#17305E',
  informacaoTexto: '#B9CBF2',
  informacaoIcone: '#9DBBFF',
  informacaoLed: '#5B8CFF',

  // Vermelho (emergência)
  emergenciaProfunda: '#B31B1B', // fundo de tela cheia (contagem, testemunha bloqueada)
  emergenciaSuave: '#FDECEC', // fundo de item no tema claro
  emergenciaEscura: '#2A1416', // botão de SOS manual no tema escuro
  emergenciaTexto: '#FF8A8A', // ação destrutiva em texto sobre Asfalto
  emergenciaLed: '#FF5A5A',

  // Tema claro
  textoSecundarioClaro: '#3D474D',
  divisorClaro: '#DDE2E4',
  cinzaMapaClaro: '#D5DBDE',
} as const;

/** Paleta semântica do tema escuro (padrão do app, RB: menos ofuscamento à noite). */
export const cores = {
  fundo: brand.asfalto,
  superficie: tons.superficie,
  superficieElevada: brand.viseira,
  borda: tons.borda,
  divisor: brand.viseira,
  texto: brand.branco,
  textoSecundario: tons.textoSecundario,
  textoSobreTeal: brand.asfalto,
  textoSobreAtencao: brand.asfalto,
  primaria: brand.teal,
  link: brand.teal,
  foco: brand.teal,
  ...alerta,
} as const;

export type CorSemantica = keyof typeof cores;
