import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { altura, brand, cores, familias, raio, tons } from '@/theme';

import { Texto } from './texto';

type Props = Omit<TextInputProps, 'style'> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
  /** 'escuro' é o campo padrão sobre Asfalto; 'interno' fica dentro de um cartão Superfície. */
  aparencia?: 'escuro' | 'interno';
};

/** Campo de texto com rótulo sempre visível (nunca só placeholder) e erro anunciado. */
export function Campo({ rotulo, erro, dica, aparencia = 'escuro', onFocus, onBlur, ...input }: Props) {
  const [focado, setFocado] = useState(false);
  const interno = aparencia === 'interno';
  const corBorda = erro ? cores.emergencia : focado ? brand.teal : tons.borda;

  return (
    <View style={styles.grupo}>
      <Texto variante="rotulo" cor={interno ? 'textoSecundario' : 'texto'} nativeID={`rotulo-${rotulo}`}>
        {rotulo}
      </Texto>
      <TextInput
        accessibilityLabel={rotulo}
        accessibilityHint={dica}
        aria-invalid={!!erro}
        placeholderTextColor={tons.neutroBarra}
        selectionColor={brand.teal}
        cursorColor={brand.teal}
        maxFontSizeMultiplier={1.6}
        onFocus={(e) => {
          setFocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocado(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          interno ? styles.inputInterno : styles.inputEscuro,
          { borderColor: corBorda },
        ]}
        {...input}
      />
      {erro ? (
        <Texto variante="legenda" cor={tons.emergenciaTexto} accessibilityLiveRegion="polite" role="alert">
          {erro}
        </Texto>
      ) : dica ? (
        <Texto variante="legenda" cor="textoSecundario">
          {dica}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 8 },
  input: {
    borderWidth: 2,
    color: brand.branco,
    fontFamily: familias.regular,
  },
  inputEscuro: {
    minHeight: altura.campo,
    borderRadius: raio.lg,
    backgroundColor: tons.superficie,
    paddingHorizontal: 16,
    fontSize: 18,
  },
  inputInterno: {
    minHeight: 52,
    borderRadius: raio.md,
    backgroundColor: brand.asfalto,
    paddingHorizontal: 14,
    fontSize: 17,
  },
});
