/**
 * Linha do tempo do motion da logo, portada do projeto HyperFrames (GSAP) "garupa-motion":
 * o capacete entra com a viseira aberta, a viseira desce com "Garupa" surgindo nela, fecha com
 * um estalo e um reflexo, o nome sai da viseira para a direita e o "SP" aparece.
 *
 * Tempo em segundos. Coordenadas nas da logo horizontal (viewBox -20 -10 2694 1193): no fim,
 * cada camada volta ao repouso e o desenho é exatamente a logo parada.
 *
 * As funções são worklets: rodam na thread de interface, dentro dos estilos animados.
 */

/** Fim do último movimento (o "SP" assenta). O vídeo segura a imagem até 4,5 s; aqui não precisa. */
export const DURACAO_ABERTURA = 3.35;

/** Dobradiça da viseira, em torno da qual ela gira ao fechar. */
export const DOBRADICA = { x: 448, y: 461 } as const;

/** Centro de onde o "SP" cresce. */
export const ORIGEM_SP = { x: 2525.9, y: 839 } as const;

/** Onde cada letra fica na viseira (o mesmo deslocamento do capacete). */
export const LETRA_NA_VISEIRA = { x: -412, y: -439, escala: 1 } as const;

/** Onde cada letra fica no nome, ao lado do capacete (a mesma posição da logo horizontal). */
export const LETRA_NO_NOME = { x: 266.3, y: -702.3, escala: 1.3 } as const;

// Câmera do motion (1920 × 1080). No último enquadramento, o palco é a logo horizontal.
const PALCO_INICIO = { escala: 0.594, x: 592.61, y: 191.62 };
const PALCO_CAPACETE = { escala: 0.66, x: 551.79, y: 152.91 };
const PALCO_FINAL = { escala: 0.5238, x: 270, y: 232.76 };

// Curvas do GSAP usadas no motion (power1 = quad, power2 = cubic, power3 = quart).
function power1Out(p: number): number {
  'worklet';
  return 1 - (1 - p) ** 2;
}
function power2Out(p: number): number {
  'worklet';
  return 1 - (1 - p) ** 3;
}
function power3Out(p: number): number {
  'worklet';
  return 1 - (1 - p) ** 4;
}
function power2InOut(p: number): number {
  'worklet';
  return p < 0.5 ? 4 * p ** 3 : 1 - (2 - 2 * p) ** 3 / 2;
}
function expoOut(p: number): number {
  'worklet';
  return p >= 1 ? 1 : 1 - 2 ** (-10 * p);
}
/** back.out(1.8): passa um pouco do ponto e volta. */
function backOut(p: number): number {
  'worklet';
  const q = p - 1;
  return q * q * (2.8 * q + 1.8) + 1;
}

/** Quanto do trecho [inicio, inicio + duracao] já passou, de 0 a 1. */
function trecho(t: number, inicio: number, duracao: number): number {
  'worklet';
  return Math.min(1, Math.max(0, (t - inicio) / duracao));
}

function entre(a: number, b: number, p: number): number {
  'worklet';
  return a + (b - a) * p;
}

/** O conjunto todo aparece no começo. */
export function opacidadeGeral(t: number): number {
  'worklet';
  return power3Out(trecho(t, 0, 0.6));
}

/**
 * Câmera: aproxima o capacete no começo e, quando o nome sai, recua para o enquadramento da
 * logo horizontal. Devolve a transformação relativa ao fim (escala 1, deslocamento 0).
 */
export function camera(t: number): { escala: number; x: number; y: number } {
  'worklet';
  const a = expoOut(trecho(t, 0, 0.9));
  const b = power2InOut(trecho(t, 1.6, 1));
  const escala = entre(entre(PALCO_INICIO.escala, PALCO_CAPACETE.escala, a), PALCO_FINAL.escala, b);
  const x = entre(entre(PALCO_INICIO.x, PALCO_CAPACETE.x, a), PALCO_FINAL.x, b);
  const y = entre(entre(PALCO_INICIO.y, PALCO_CAPACETE.y, a), PALCO_FINAL.y, b);
  return {
    escala: escala / PALCO_FINAL.escala,
    x: (x - PALCO_FINAL.x) / PALCO_FINAL.escala,
    y: (y - PALCO_FINAL.y) / PALCO_FINAL.escala,
  };
}

/** Estalo da viseira ao fechar: o capacete desce um tico e volta. */
export function estalo(t: number): number {
  'worklet';
  if (t < 1.66) return 7 * power2Out(trecho(t, 1.6, 0.06));
  return 7 * (1 - power2Out(trecho(t, 1.66, 0.24)));
}

/** Ângulo da viseira (e das letras nela), em graus: aberta em -30, fechada em 0. */
export function anguloViseira(t: number): number {
  'worklet';
  return -30 * (1 - power2InOut(trecho(t, 0.55, 1.05)));
}

export function opacidadeReflexo(t: number): number {
  'worklet';
  return power2Out(trecho(t, 1.62, 0.3));
}

/** Letra `i` (0 = G … 5 = a): surge na viseira em sequência. */
export function opacidadeLetra(t: number, i: number): number {
  'worklet';
  return power1Out(trecho(t, 0.8 + 0.11 * i, 0.18));
}

/**
 * Quanto a letra `i` já saiu da viseira para o nome, de 0 a 1. Saem de trás para a frente
 * (o último "a" primeiro). Também é o quanto ela já mudou de cor, no tema claro.
 */
export function saidaLetra(t: number, i: number): number {
  'worklet';
  return expoOut(trecho(t, 1.8 + 0.035 * (5 - i), 0.9));
}

/** Posição e tamanho da letra para um avanço `p` da saída (0 = na viseira, 1 = no nome). */
export function posicaoLetra(p: number): { x: number; y: number; escala: number } {
  'worklet';
  return {
    x: entre(LETRA_NA_VISEIRA.x, LETRA_NO_NOME.x, p),
    y: entre(LETRA_NA_VISEIRA.y, LETRA_NO_NOME.y, p),
    escala: entre(LETRA_NA_VISEIRA.escala, LETRA_NO_NOME.escala, p),
  };
}

/** O "SP" cresce e assenta, já depois do nome. */
export function sp(t: number): { opacidade: number; escala: number } {
  'worklet';
  const p = backOut(trecho(t, 2.85, 0.5));
  return { opacidade: Math.min(1, p), escala: entre(0.2, 1, p) };
}
