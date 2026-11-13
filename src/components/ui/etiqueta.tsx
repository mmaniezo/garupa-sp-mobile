import { StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/tema';

import { Texto } from './texto';

type Props = {
  texto: string;
  /** 'contorno' = pílula com borda (boas-vindas, "dados de exemplo"); 'cheia' = fundo próprio. */
  aparencia?: 'contorno' | 'cheia';
  fundo?: string;
  cor?: string;
};

/** Pílula curta de texto (selo, estado). */
export function Etiqueta({ texto, aparencia = 'contorno', fundo, cor }: Props) {
  const { c } = useTema();
  return (
    <View
      style={[
        styles.base,
        aparencia === 'contorno'
          ? { borderWidth: 1, borderColor: c.borda }
          : { backgroundColor: fundo ?? c.superficie },
      ]}>
      <Texto
        variante="legenda"
        cor={cor ?? (aparencia === 'contorno' ? 'textoSecundario' : 'texto')}
        style={styles.texto}>
        {texto}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  texto: { fontFamily: 'BricolageGrotesque_600SemiBold', fontSize: 14, lineHeight: 18 },
});
