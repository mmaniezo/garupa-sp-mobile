import { Platform, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useTema } from '@/lib/tema';

import {
  LOGO_CAPACETE_RATIO,
  LOGO_CAPACETE_XML,
  LOGO_HORIZONTAL_BRANCA_XML,
  LOGO_HORIZONTAL_PRETA_XML,
  LOGO_HORIZONTAL_RATIO,
} from './logo-xml';

/** 'horizontal' escolhe sozinha: branca no tema escuro, preta no claro. */
type Variante = 'capacete' | 'horizontal' | 'horizontal-branca' | 'horizontal-preta';

type Props = {
  variante?: Variante;
  /** Informe largura OU altura; a outra medida sai da proporção da logo. */
  largura?: number;
  altura?: number;
  /** Logo puramente decorativa (o nome já está escrito ao lado). */
  decorativa?: boolean;
};

/**
 * Logos do manual. Regras: branca em fundo escuro, preta em fundo claro;
 * horizontal com no mínimo 120 px de largura, abaixo disso só o capacete.
 */
export function Logo({ variante = 'capacete', largura, altura, decorativa }: Props) {
  const { nome: tema } = useTema();
  const escolhida = variante === 'horizontal' ? (tema === 'claro' ? 'horizontal-preta' : 'horizontal-branca') : variante;
  const ratio = escolhida === 'capacete' ? LOGO_CAPACETE_RATIO : LOGO_HORIZONTAL_RATIO;
  const w = largura ?? (altura ? altura * ratio : 120);
  const h = altura ?? w / ratio;
  const xml =
    escolhida === 'capacete'
      ? LOGO_CAPACETE_XML
      : escolhida === 'horizontal-branca'
        ? LOGO_HORIZONTAL_BRANCA_XML
        : LOGO_HORIZONTAL_PRETA_XML;

  return (
    <View
      role={decorativa ? undefined : 'img'}
      aria-label={decorativa ? undefined : 'Garupa SP'}
      aria-hidden={decorativa || undefined}
      {...(Platform.OS !== 'web' && !decorativa ? { accessible: true } : null)}
      style={{ width: w, height: h }}>
      <SvgXml xml={xml} width={w} height={h} />
    </View>
  );
}
