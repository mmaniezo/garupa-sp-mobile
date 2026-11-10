import { Text, type TextProps } from 'react-native';

import { cores, texto, type CorSemantica, type VarianteTexto } from '@/theme';

type Props = TextProps & {
  variante?: VarianteTexto;
  cor?: CorSemantica | (string & {});
  centro?: boolean;
};

/**
 * Texto do app. Respeita o tamanho de fonte do sistema (acessibilidade),
 * com teto para a tela não quebrar nos alertas e na contagem.
 */
export function Texto({ variante = 'corpo', cor = 'texto', centro, style, ...rest }: Props) {
  const corFinal = cor in cores ? cores[cor as CorSemantica] : cor;
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[texto[variante], { color: corFinal }, centro && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
