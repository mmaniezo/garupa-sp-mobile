import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useEstilos } from '@/lib/tema';
import { alerta, altura, brand, familias, raio, type Paleta } from '@/theme';

import { Texto } from './texto';

type Props = Omit<TextInputProps, 'style'> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
  /** 'escuro' é o campo padrão sobre o fundo da tela; 'interno' fica dentro de um cartão Superfície. */
  aparencia?: 'escuro' | 'interno';
};

/** Campo de texto com rótulo sempre visível (nunca só placeholder) e erro anunciado. */
export function Campo({ rotulo, erro, dica, aparencia = 'escuro', onFocus, onBlur, ...input }: Props) {
  const [focado, setFocado] = useState(false);
  const styles = useEstilos(criarEstilos);
  const interno = aparencia === 'interno';
  const corBorda = erro ? alerta.emergencia : focado ? brand.teal : styles.cores.borda;

  return (
    <View style={styles.grupo}>
      <Texto variante="rotulo" cor={interno ? 'textoSecundario' : 'texto'} nativeID={`rotulo-${rotulo}`}>
        {rotulo}
      </Texto>
      <TextInput
        accessibilityLabel={rotulo}
        accessibilityHint={dica}
        aria-invalid={!!erro}
        placeholderTextColor={styles.cores.placeholder}
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
        style={[styles.input, interno ? styles.inputInterno : styles.inputEscuro, { borderColor: corBorda }]}
        {...input}
      />
      {erro ? (
        <Texto variante="legenda" cor="emergenciaTexto" accessibilityLiveRegion="polite" role="alert">
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

const criarEstilos = (c: Paleta) => ({
  cores: { borda: c.borda, placeholder: c.neutroBarra },
  ...StyleSheet.create({
    grupo: { gap: 8 },
    input: {
      borderWidth: 2,
      color: c.texto,
      fontFamily: familias.regular,
    },
    inputEscuro: {
      minHeight: altura.campo,
      borderRadius: raio.lg,
      backgroundColor: c.superficie,
      paddingHorizontal: 16,
      fontSize: 18,
    },
    // Dentro de um cartão Superfície: o campo usa o fundo da tela para se destacar.
    inputInterno: {
      minHeight: 52,
      borderRadius: raio.md,
      backgroundColor: c.fundo,
      paddingHorizontal: 14,
      fontSize: 17,
    },
  }),
});
