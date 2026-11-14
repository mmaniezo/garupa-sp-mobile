import { useState } from 'react';
import { Pressable } from 'react-native';

import { useTema } from '@/lib/tema';

import { Campo, type PropsCampo } from './campo';
import { Icone } from './icone';

/** Campo de senha com o olho para mostrar ou esconder o que foi digitado. */
export function CampoSenha(props: Omit<PropsCampo, 'secureTextEntry' | 'direita'>) {
  const [visivel, setVisivel] = useState(false);
  const { c } = useTema();
  return (
    <Campo
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      maxLength={64}
      {...props}
      secureTextEntry={!visivel}
      direita={
        <Pressable
          onPress={() => setVisivel((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
          hitSlop={4}
          style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Icone nome={visivel ? 'olhoFechado' : 'olho'} tamanho={22} cor={c.textoSecundario} />
        </Pressable>
      }
    />
  );
}
