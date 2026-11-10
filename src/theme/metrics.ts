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
