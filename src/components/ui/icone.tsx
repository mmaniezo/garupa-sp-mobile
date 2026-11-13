import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { useTema } from '@/lib/tema';

/**
 * Ícones de traço usados nas telas do design (24×24, traço 2,2, pontas arredondadas).
 * Os desenhos vêm do próprio canvas do design, para o app ficar igual às telas.
 */
const desenhos = {
  voltar: <Path d="M15 18l-6-6 6-6" />,
  coracao: (
    <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
  ),
  alerta: (
    <>
      <Path d="M12 3 2 20h20z" />
      <Path d="M12 10v4" />
      <Path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 16v-4" />
      <Path d="M12 8h.01" />
    </>
  ),
  casa: (
    <>
      <Path d="M3 12l9-8 9 8" />
      <Path d="M5 10v10h14V10" />
    </>
  ),
  mapa: (
    <>
      <Path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <Path d="M9 4v14" />
      <Path d="M15 6v14" />
    </>
  ),
  usuario: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  escudo: <Path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />,
  escudoOk: (
    <>
      <Path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
      <Path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  relogio: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  som: (
    <>
      <Path d="M11 5 6 9H2v6h4l5 4z" />
      <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </>
  ),
  alarme: (
    <>
      <Path d="M11 5 6 9H2v6h4l5 4z" />
      <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <Path d="M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  fechar: <Path d="M6 6l12 12M18 6 6 18" />,
  telefone: (
    <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  ),
  cadeado: (
    <>
      <Rect x={5} y={11} width={14} height={10} rx={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  buraco: (
    <>
      <Ellipse cx={12} cy={14} rx={9} ry={4} />
      <Path d="M7 13.5c1.5 1 8.5 1 10 0" />
    </>
  ),
  gota: <Path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  semaforo: (
    <>
      <Rect x={8} y={2} width={8} height={16} rx={2} />
      <Circle cx={12} cy={6.5} r={1.5} />
      <Circle cx={12} cy={13.5} r={1.5} />
      <Path d="M12 18v4" />
    </>
  ),
  pulseira: (
    <>
      <Rect x={7} y={4} width={10} height={16} rx={3} />
      <Circle cx={12} cy={12} r={2} />
    </>
  ),
  chevronDireita: <Path d="M9 6l6 6-6 6" />,
} as const;

/** Ícones preenchidos (não usam traço). */
const preenchidos = {
  play: <Path d="M7 4v16l13-8z" />,
  pausa: (
    <>
      <Rect x={6} y={5} width={4} height={14} rx={1} />
      <Rect x={14} y={5} width={4} height={14} rx={1} />
    </>
  ),
} as const;

export type NomeIcone = keyof typeof desenhos | keyof typeof preenchidos;

type Props = {
  nome: NomeIcone;
  tamanho?: number;
  cor?: string;
  espessura?: number;
};

/** Ícone decorativo: fica escondido do leitor de tela. Quem dá o nome é o botão ou o texto ao lado. */
export function Icone({ nome, tamanho = 24, cor: corInformada, espessura = 2.2 }: Props) {
  const { c } = useTema();
  const cor = corInformada ?? c.texto;
  const preenchido = nome in preenchidos;
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={preenchido ? cor : 'none'}
      stroke={preenchido ? 'none' : cor}
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden>
      {preenchido
        ? preenchidos[nome as keyof typeof preenchidos]
        : desenhos[nome as keyof typeof desenhos]}
    </Svg>
  );
}
