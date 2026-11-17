/** Espaçamentos, raios e alturas mínimas de toque (RNF09: alvo de pelo menos 48 dp). */
export const espaco = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Margem lateral das telas (o design usa 20 nas telas do turno e 24 no cadastro). */
export const margemTela = 20;

export const raio = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  cartao: 24,
  pilula: 999,
} as const;

/**
 * Alturas de botão do manual: mínimo 48 (RNF09); padrão 56;
 * ação principal 60 a 64; emergência 72, largura total.
 */
export const altura = {
  minimoToque: 48,
  chip: 44,
  campo: 56,
  botao: 56,
  botaoPrincipal: 60,
  botaoDestaque: 64,
  botaoEmergencia: 72,
  botaoEstouBem: 96,
  barraNavegacao: 72,
} as const;

/**
 * Luz colorida embaixo dos botões de ação (a cor do próprio botão, esmaecida) e sombra de
 * superfícies que flutuam (barra de abas, folhas). Só profundidade: nenhuma informação depende disso.
 */
export const brilho = {
  teal: '0 10px 26px rgba(9,155,169,0.34)',
  seguro: '0 10px 26px rgba(21,128,61,0.36)',
  emergencia: '0 10px 26px rgba(214,40,40,0.38)',
  flutuante: '0 10px 30px rgba(0,0,0,0.22)',
  foco: '0 0 0 4px rgba(9,155,169,0.24)',
} as const;
