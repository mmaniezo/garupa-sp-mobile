import type { TextStyle } from 'react-native';

/**
 * Tipografia: Bricolage Grotesque, uma família só para tudo (manual da marca).
 * No Android o peso não é escolhido por `fontWeight`: cada peso é um arquivo,
 * então o estilo aponta para a família do peso certo.
 */
export const familias = {
  regular: 'BricolageGrotesque_400Regular',
  medio: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  extrabold: 'BricolageGrotesque_800ExtraBold',
} as const;

export type Peso = keyof typeof familias;

/**
 * Escala do app (sp), conforme o manual:
 * Display 40 ExtraBold · Título 28 Bold · Alerta/subtítulo 22 SemiBold ·
 * Texto 18 Regular · Botão 18 Bold · Legenda 15 Medium (mínimo).
 *
 * "Texto corrido nunca abaixo de 15." Só rótulos curtos em caixa alta (overline)
 * e a barra de navegação usam 13.
 */
export const texto = {
  display: { fontFamily: familias.extrabold, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
  hero: { fontFamily: familias.extrabold, fontSize: 46, lineHeight: 46, letterSpacing: -1.4 },
  titulo: { fontFamily: familias.extrabold, fontSize: 30, lineHeight: 32, letterSpacing: -0.6 },
  tituloSecao: { fontFamily: familias.bold, fontSize: 20, lineHeight: 25 },
  alerta: { fontFamily: familias.semibold, fontSize: 22, lineHeight: 27 },
  corpo: { fontFamily: familias.regular, fontSize: 18, lineHeight: 25 },
  corpoMenor: { fontFamily: familias.regular, fontSize: 16, lineHeight: 22 },
  rotulo: { fontFamily: familias.semibold, fontSize: 15, lineHeight: 20 },
  legenda: { fontFamily: familias.medio, fontSize: 15, lineHeight: 21 },
  botao: { fontFamily: familias.bold, fontSize: 18, lineHeight: 22 },
  botaoGrande: { fontFamily: familias.extrabold, fontSize: 20, lineHeight: 24 },
  overline: {
    fontFamily: familias.bold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  /** Contagem e horários: números tabulares. */
  numero: {
    fontFamily: familias.extrabold,
    fontSize: 34,
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export type VarianteTexto = keyof typeof texto;
