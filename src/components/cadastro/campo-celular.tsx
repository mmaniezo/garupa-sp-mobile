import { useState } from 'react';
import { View } from 'react-native';

import { Botao, Campo } from '@/components/ui';
import type { PropsCampo } from '@/components/ui/campo';
import { mascararTelefone, validarCelular } from '@/domain/telefone';

type Props = Omit<PropsCampo, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (valor: string) => void;
};

/**
 * Campo de celular com a máscara (11) 91234-5678. Ao sair do campo (ou com erro), se faltou o 9
 * depois do DDD, avisa na hora e oferece o número corrigido num toque: sem o 9, o SMS do
 * socorro não chega. Enquanto a pessoa digita, não avisa nada (o 9 pode estar vindo).
 */
export function CampoCelular({ value, onChangeText, erro, onBlur, ...props }: Props) {
  const [saiu, setSaiu] = useState(false);
  const validado = validarCelular(value);
  const falta9 = !validado.valido && validado.motivo === 'falta9' && (saiu || !!erro) ? validado : null;

  return (
    <View style={{ gap: 4 }}>
      <Campo
        autoComplete="tel"
        textContentType="telephoneNumber"
        {...props}
        value={value}
        keyboardType="phone-pad"
        onChangeText={(texto) => {
          setSaiu(false);
          onChangeText(mascararTelefone(texto));
        }}
        onBlur={(e) => {
          setSaiu(true);
          onBlur?.(e);
        }}
        erro={falta9 ? falta9.mensagem : erro}
      />
      {falta9?.sugestao ? (
        <Botao
          titulo={`Usar ${falta9.sugestao}`}
          variante="link"
          tamanho="compacto"
          larguraTotal={false}
          dica="Coloca o 9 depois do DDD"
          onPress={() => onChangeText(falta9.sugestao!)}
        />
      ) : null}
    </View>
  );
}
