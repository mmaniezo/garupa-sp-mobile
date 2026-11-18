import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { mola, vibrar } from '@/lib/movimento';
import { useEstilos } from '@/lib/tema';
import { familias, raio, type Paleta } from '@/theme';

import { Texto } from './texto';

type Opcao<T extends string> = { valor: T; rotulo: string };

type Props<T extends string> = {
  rotulo: string;
  opcoes: Opcao<T>[];
  valor: T;
  onChange: (v: T) => void;
  /** Opções dividindo a largura toda, com o texto centralizado (ex.: tema do app no Perfil). */
  preencher?: boolean;
};

type Medida = { x: number; largura: number };

/**
 * Escolha entre poucas opções (Seco | Chovendo). Selecionada: fundo invertido e texto em negrito;
 * o fundo desliza de uma opção para a outra.
 */
export function Segmentado<T extends string>({ rotulo, opcoes, valor, onChange, preencher }: Props<T>) {
  const styles = useEstilos(criarEstilos);
  const [medidas, setMedidas] = useState<Record<string, Medida>>({});
  const alvo = medidas[valor];
  const alvoX = alvo?.x;
  const alvoLargura = alvo?.largura;

  const x = useSharedValue(0);
  const largura = useSharedValue(0);
  const medido = useSharedValue(0);
  useEffect(() => {
    if (alvoX === undefined || alvoLargura === undefined) return;
    if (medido.get() === 0) {
      x.set(alvoX);
      largura.set(alvoLargura);
      medido.set(1);
    } else {
      x.set(withSpring(alvoX, mola.desliza));
      largura.set(withSpring(alvoLargura, mola.desliza));
    }
  }, [alvoX, alvoLargura, x, largura, medido]);

  const estiloFundo = useAnimatedStyle(() => ({
    opacity: medido.get(),
    width: largura.get(),
    transform: [{ translateX: x.get() }],
  }));

  return (
    <View style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      <Animated.View style={[styles.fundoAtivo, estiloFundo]} aria-hidden />
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => {
              if (ativo) return; // já escolhida: tocar de novo não muda nada
              vibrar('selecao');
              onChange(o.valor);
            }}
            onLayout={(e) => {
              const { x: px, width } = e.nativeEvent.layout;
              setMedidas((m) => (m[o.valor]?.x === px && m[o.valor]?.largura === width ? m : { ...m, [o.valor]: { x: px, largura: width } }));
            }}
            accessibilityRole="radio"
            accessibilityLabel={o.rotulo}
            accessibilityState={{ checked: ativo }}
            hitSlop={4}
            style={[styles.opcao, preencher && styles.preenche]}>
            <Texto
              variante="corpoMenor"
              cor={ativo ? 'textoInverso' : 'texto'}
              style={{ fontFamily: ativo ? familias.bold : familias.semibold, fontSize: 15 }}>
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const criarEstilos = (c: Paleta) =>
  StyleSheet.create({
    grupo: { flexDirection: 'row', backgroundColor: c.superficieElevada, borderRadius: raio.pilula, padding: 4, gap: 4 },
    opcao: { minHeight: 40, paddingHorizontal: 14, borderRadius: raio.pilula, justifyContent: 'center' },
    preenche: { flex: 1, alignItems: 'center' },
    // O x medido de cada opção já inclui a folga de 4 do grupo.
    fundoAtivo: { position: 'absolute', left: 0, top: 4, bottom: 4, borderRadius: raio.pilula, backgroundColor: c.texto },
  });
