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

/**
 * Paletas dos dois temas. O padrão segue o sistema do celular; a pessoa pode fixar um
 * tema no Perfil. Tudo o que muda com o tema sai daqui (via useTema); o que não muda
 * (teal da marca, cores de alerta, texto sobre teal, âmbar, verde e vermelho) continua
 * nas constantes acima.
 *
 * Tema claro do manual: fundo Neblina, cartões brancos, texto Asfalto, texto de apoio
 * #3D474D, divisórias #DDE2E4 e teal profundo para texto e links (5,8:1).
 */
export type NomeTema = 'escuro' | 'claro';
export type PreferenciaTema = 'sistema' | NomeTema;

export type Paleta = {
  /** Fundo das telas. */
  fundo: string;
  /** Campos, cartões e itens de lista. */
  superficie: string;
  /** Chips, pílulas, botão neutro, folhas sobre o mapa. */
  superficieElevada: string;
  /** Borda de campo e de chip não selecionado. */
  borda: string;
  /** Linhas divisórias e trilhos de barra. */
  divisor: string;
  texto: string;
  textoSecundario: string;
  /** Texto sobre uma superfície da cor do texto (o inverso do tema). */
  textoInverso: string;
  /** Links e texto teal (no claro, o teal profundo, por contraste). */
  link: string;
  /** Texto teal sobre o fundo de item selecionado. */
  tealTexto: string;
  /** Fundo de cartão ou chip selecionado. */
  selecionadoFundo: string;
  neutroBarra: string;
  /** Âmbar como texto (no claro, um tom escuro que passa 4,5:1). */
  atencaoTexto: string;
  /** Verde como texto ou indicador sobre o fundo. */
  seguroTexto: string;
  /** Vermelho de ação destrutiva em texto. */
  emergenciaTexto: string;
  /** Fundo de item de emergência (SOS manual, passos da testemunha). */
  emergenciaSuperficie: string;
  informacaoFundo: string;
  informacaoTexto: string;
  informacaoIcone: string;
  /** Fundo e ruas do mapa esquemático. */
  mapaFundo: string;
  mapaRuaFina: string;
  mapaRuaLarga: string;
  /** Véu atrás de folhas e modais. */
  veu: string;
  /** Conteúdo da barra de status do sistema. */
  barraStatus: 'light' | 'dark';
};

export const paletas: Record<NomeTema, Paleta> = {
  escuro: {
    fundo: brand.asfalto,
    superficie: tons.superficie,
    superficieElevada: brand.viseira,
    borda: tons.borda,
    divisor: brand.viseira,
    texto: brand.branco,
    textoSecundario: tons.textoSecundario,
    textoInverso: brand.asfalto,
    link: brand.teal,
    tealTexto: tons.tealClaro,
    selecionadoFundo: tons.tealSelecionadoFundo,
    neutroBarra: tons.neutroBarra,
    atencaoTexto: alerta.atencao,
    seguroTexto: tons.seguroClaro,
    emergenciaTexto: tons.emergenciaTexto,
    emergenciaSuperficie: tons.emergenciaEscura,
    informacaoFundo: tons.informacaoFundo,
    informacaoTexto: tons.informacaoTexto,
    informacaoIcone: tons.informacaoIcone,
    mapaFundo: tons.mapaFundo,
    mapaRuaFina: '#161C20',
    mapaRuaLarga: '#1E262B',
    veu: 'rgba(0,0,0,0.6)',
    barraStatus: 'light',
  },
  claro: {
    fundo: brand.neblina,
    superficie: brand.branco,
    superficieElevada: '#E6EBED',
    borda: '#9AA4A9',
    divisor: tons.divisorClaro,
    texto: brand.asfalto,
    textoSecundario: tons.textoSecundarioClaro,
    textoInverso: brand.branco,
    link: brand.tealProfundo,
    tealTexto: brand.tealProfundo,
    selecionadoFundo: '#DDF1F3',
    neutroBarra: tons.neutroBarra,
    atencaoTexto: '#8A5A00',
    seguroTexto: alerta.seguro,
    emergenciaTexto: tons.emergenciaProfunda,
    emergenciaSuperficie: tons.emergenciaSuave,
    informacaoFundo: '#E3ECFB',
    informacaoTexto: '#173F8A',
    informacaoIcone: alerta.informacao,
    mapaFundo: tons.cinzaMapaClaro,
    mapaRuaFina: '#E9EDEF',
    mapaRuaLarga: '#F7F9FA',
    veu: 'rgba(17,20,23,0.45)',
    barraStatus: 'dark',
  },
};

/** Paleta do tema escuro, para código fora de componentes (notificações, por exemplo). */
export const cores = { ...paletas.escuro, primaria: brand.teal, foco: brand.teal, ...alerta } as const;

/** Nome de cor aceito pelo <Texto cor="...">: chave da paleta ou cor de alerta. */
export type CorSemantica = Exclude<keyof Paleta, 'barraStatus'> | keyof typeof alerta | 'primaria';
