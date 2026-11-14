import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useEstilos } from '@/lib/tema';
import { alerta, altura, brand, familias, raio, type Paleta } from '@/theme';

import { Texto } from './texto';

export type PropsCampo = Omit<TextInputProps, 'style'> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
  /** 'escuro' é o campo padrão sobre o fundo da tela; 'interno' fica dentro de um cartão Superfície. */
  aparencia?: 'escuro' | 'interno';
  /** Botão dentro do campo, à direita (por exemplo, mostrar a senha). */
  direita?: ReactNode;
};

/** Campo de texto com rótulo sempre visível (nunca só placeholder) e erro anunciado. */
export function Campo({ rotulo, erro, dica, aparencia = 'escuro', direita, onFocus, onBlur, ...input }: PropsCampo) {
  const [focado, setFocado] = useState(false);
  const styles = useEstilos(criarEstilos);
  const interno = aparencia === 'interno';
  const corBorda = erro ? alerta.emergencia : focado ? brand.teal : styles.cores.borda;

  return (
    <View style={styles.grupo}>
      <Texto variante="rotulo" cor={interno ? 'textoSecundario' : 'texto'} nativeID={`rotulo-${rotulo}`}>
        {rotulo}
      </Texto>
      <View style={styles.linha}>
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
        style={[
          styles.input,
          interno ? styles.inputInterno : styles.inputEscuro,
          { borderColor: corBorda },
          direita ? styles.comDireita : null,
        ]}
        {...input}
      />
        {direita ? <View style={styles.direita}>{direita}</View> : null}
      </View>
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
    linha: { justifyContent: 'center' },
    direita: { position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center' },
    comDireita: { paddingRight: 56 },
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
