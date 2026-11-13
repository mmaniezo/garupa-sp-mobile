import { Text, type TextProps } from 'react-native';

import { useTema } from '@/lib/tema';
import { alerta, brand, texto, type CorSemantica, type VarianteTexto } from '@/theme';

type Props = TextProps & {
  variante?: VarianteTexto;
  /** Nome da paleta do tema ("texto", "textoSecundario", "link"...), cor de alerta ou uma cor fixa. */
  cor?: CorSemantica | (string & {});
  centro?: boolean;
};

/**
 * Texto do app. Respeita o tamanho de fonte do sistema (acessibilidade),
 * com teto para a tela não quebrar nos alertas e na contagem.
 */
export function Texto({ variante = 'corpo', cor = 'texto', centro, style, ...rest }: Props) {
  const { c } = useTema();
  const nomes: Record<string, string> = { ...c, ...alerta, primaria: brand.teal };
  const corFinal = cor in nomes ? nomes[cor] : cor;
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[texto[variante], { color: corFinal }, centro && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
