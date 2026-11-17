import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/components/ui/icone';
import { Texto } from '@/components/ui/texto';
import { mola, tempo, vibrar } from '@/lib/movimento';
import { useTema } from '@/lib/tema';
import { brilho, familias } from '@/theme';

const abas: Record<string, { rotulo: string; icone: NomeIcone }> = {
  plano: { rotulo: 'Plano', icone: 'casa' },
  mapa: { rotulo: 'Mapa', icone: 'mapa' },
  relatar: { rotulo: 'Relatar', icone: 'alerta' },
  perfil: { rotulo: 'Perfil', icone: 'usuario' },
};

const ALTURA_BARRA = 64;
const FOLGA = 6;

type PropsAba = { rotulo: string; icone: NomeIcone; ativa: boolean; cor: string; onPress: () => void };

/** Uma aba: o ícone dá um pulinho ao ser escolhida e afunda de leve sob o dedo. */
function Aba({ rotulo, icone, ativa, cor, onPress }: PropsAba) {
  const pulo = useSharedValue(1);
  const toque = useSharedValue(0);

  useEffect(() => {
    if (ativa) pulo.set(withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, mola.viva)));
  }, [ativa, pulo]);

  const estiloIcone = useAnimatedStyle(() => ({
    transform: [{ scale: pulo.get() * (1 - 0.08 * toque.get()) }, { translateY: ativa ? -1 : 0 }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: ativa }}
      onPressIn={() => toque.set(withSpring(1, mola.toque))}
      onPressOut={() => toque.set(withSpring(0, mola.toque))}
      onPress={onPress}
      style={styles.aba}>
      <Animated.View style={estiloIcone}>
        <Icone nome={icone} cor={cor} espessura={ativa ? 2.5 : 2.2} />
      </Animated.View>
      <Texto
        variante="overline"
        cor={cor}
        style={{ textTransform: 'none', letterSpacing: 0, fontFamily: ativa ? familias.bold : familias.semibold }}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

/**
 * Barra de navegação: quatro abas numa barra que flutua sobre o fundo. A aba ativa fica em
 * teal sobre uma pílula que desliza de uma aba para a outra (cor + posição + negrito, nunca só cor).
 */
export function BarraAbas({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { c } = useTema();
  const [largura, setLargura] = useState(0);
  const visiveis = state.routes.filter((r) => abas[r.name]);
  const indiceAtivo = Math.max(0, visiveis.findIndex((r) => r.key === state.routes[state.index]?.key));
  const larguraAba = visiveis.length ? (largura - FOLGA * 2) / visiveis.length : 0;

  const x = useSharedValue(0);
  const medido = useSharedValue(0);
  useEffect(() => {
    if (larguraAba <= 0) return;
    const destino = indiceAtivo * larguraAba;
    // Primeira medida: a pílula já nasce no lugar; depois disso, desliza.
    if (medido.get() === 0) {
      x.set(destino);
      medido.set(withTiming(1, { duration: tempo.medio }));
    } else {
      x.set(withSpring(destino, mola.desliza));
    }
  }, [indiceAtivo, larguraAba, x, medido]);

  const estiloPilula = useAnimatedStyle(() => ({ opacity: medido.get(), transform: [{ translateX: x.get() }] }));

  return (
    <View style={[styles.area, { backgroundColor: c.fundo, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View
        accessibilityRole="tablist"
        onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
        style={[styles.barra, { backgroundColor: c.superficie, borderColor: c.fio }]}>
        <Animated.View
          style={[styles.pilula, { width: larguraAba, backgroundColor: c.selecionadoFundo }, estiloPilula]}
          aria-hidden
        />
        {visiveis.map((rota, indice) => {
          const aba = abas[rota.name];
          const ativa = indiceAtivo === indice;
          return (
            <Aba
              key={rota.key}
              rotulo={aba.rotulo}
              icone={aba.icone}
              ativa={ativa}
              cor={ativa ? c.tealTexto : c.textoSecundario}
              onPress={() => {
                const evento = emitter.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });
                if (!ativa && !evento.defaultPrevented) {
                  vibrar('selecao');
                  navigateToTab(rota.key);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { paddingHorizontal: 12, paddingTop: 6 },
  barra: {
    height: ALTURA_BARRA,
    flexDirection: 'row',
    borderRadius: 24,
    borderWidth: 1,
    padding: FOLGA,
    boxShadow: brilho.flutuante,
  },
  pilula: { position: 'absolute', left: FOLGA, top: FOLGA, bottom: FOLGA, borderRadius: 18 },
  aba: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
});
