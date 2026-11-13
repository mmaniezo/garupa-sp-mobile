import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/tema';
import { brand } from '@/theme';

import { BotaoIcone } from './botao-icone';
import { Texto } from './texto';

type Props = {
  /** Ex.: "Passo 1 de 4 · obrigatório". */
  rotulo: string;
  onVoltar?: () => void;
  onPular?: () => void;
  /** Barra de progresso do cadastro: quantos dos `total` passos estão preenchidos. */
  passo?: number;
  total?: number;
};

/** Cabeçalho do cadastro em camadas: voltar, passo atual, "Pular" e barra de progresso. */
export function CabecalhoPasso({ rotulo, onVoltar, onPular, passo, total = 4 }: Props) {
  const { c } = useTema();
  return (
    <View style={styles.bloco}>
      <View style={styles.linha}>
        {onVoltar ? <BotaoIcone icone="voltar" rotulo="Voltar" onPress={onVoltar} /> : <View style={styles.vazio} />}
        <Texto variante="rotulo" cor="textoSecundario">
          {rotulo}
        </Texto>
        {onPular ? (
          <Pressable
            onPress={onPular}
            accessibilityRole="button"
            accessibilityLabel="Pular este passo"
            hitSlop={8}
            style={styles.pular}>
            <Texto variante="botao" cor="link" style={{ fontSize: 17 }}>
              Pular
            </Texto>
          </Pressable>
        ) : (
          <View style={styles.vazio} />
        )}
      </View>
      {passo ? (
        <View
          style={styles.progresso}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Cadastro: passo ${passo} de ${total}`}
          accessibilityValue={{ min: 0, max: total, now: passo }}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[styles.segmento, { backgroundColor: i < passo ? brand.teal : c.divisor }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: 20 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vazio: { width: 48, height: 48 },
  pular: { height: 48, justifyContent: 'center', paddingHorizontal: 4 },
  progresso: { flexDirection: 'row', gap: 6 },
  segmento: { flex: 1, height: 6, borderRadius: 3 },
});
