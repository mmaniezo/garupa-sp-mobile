import { Pressable, StyleSheet } from 'react-native';

import { altura, brand } from '@/theme';

import { Icone, type NomeIcone } from './icone';

type Props = {
  icone: NomeIcone;
  /** Obrigatório: botão só com ícone precisa de nome para o leitor de tela. */
  rotulo: string;
  onPress?: () => void;
  fundo?: string;
  cor?: string;
  tamanho?: number;
};

/** Botão redondo só com ícone (voltar, dispensar). 48 dp por padrão. */
export function BotaoIcone({
  icone,
  rotulo,
  onPress,
  fundo = brand.viseira,
  cor = brand.branco,
  tamanho = altura.minimoToque,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        { width: tamanho, height: tamanho, backgroundColor: fundo },
        pressed && { opacity: 0.8 },
      ]}>
      <Icone nome={icone} tamanho={Math.round(tamanho * 0.45)} cor={cor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
