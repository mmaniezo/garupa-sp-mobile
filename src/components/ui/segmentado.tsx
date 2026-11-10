import { Pressable, StyleSheet, View } from 'react-native';

import { brand, raio } from '@/theme';

import { Texto } from './texto';

type Opcao<T extends string> = { valor: T; rotulo: string };

type Props<T extends string> = {
  rotulo: string;
  opcoes: Opcao<T>[];
  valor: T;
  onChange: (v: T) => void;
};

/** Escolha entre poucas opções (Seco | Chovendo). Selecionada: fundo branco e texto em negrito. */
export function Segmentado<T extends string>({ rotulo, opcoes, valor, onChange }: Props<T>) {
  return (
    <View style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onChange(o.valor)}
            accessibilityRole="radio"
            accessibilityLabel={o.rotulo}
            accessibilityState={{ checked: ativo }}
            hitSlop={4}
            style={[styles.opcao, ativo && styles.ativa]}>
            <Texto
              variante="corpoMenor"
              cor={ativo ? brand.asfalto : brand.branco}
              style={{ fontFamily: ativo ? 'BricolageGrotesque_700Bold' : 'BricolageGrotesque_600SemiBold', fontSize: 15 }}>
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { flexDirection: 'row', backgroundColor: brand.viseira, borderRadius: raio.pilula, padding: 4, gap: 4 },
  opcao: { minHeight: 40, paddingHorizontal: 14, borderRadius: raio.pilula, justifyContent: 'center' },
  ativa: { backgroundColor: brand.branco },
});
