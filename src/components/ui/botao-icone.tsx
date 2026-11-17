import { StyleSheet } from 'react-native';

import { useTema } from '@/lib/tema';
import { altura } from '@/theme';

import { Icone, type NomeIcone } from './icone';
import { Pressionavel } from './pressionavel';

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
  fundo,
  cor,
  tamanho = altura.minimoToque,
}: Props) {
  const { c } = useTema();
  return (
    <Pressionavel
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={6}
      escala={0.9}
      style={[styles.base, { width: tamanho, height: tamanho, backgroundColor: fundo ?? c.superficieElevada }]}>
      <Icone nome={icone} tamanho={Math.round(tamanho * 0.45)} cor={cor ?? c.texto} />
    </Pressionavel>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
