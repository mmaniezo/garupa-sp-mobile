import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/components/ui/icone';
import { Texto } from '@/components/ui/texto';
import { useTema } from '@/lib/tema';
import { altura } from '@/theme';

const abas: Record<string, { rotulo: string; icone: NomeIcone }> = {
  plano: { rotulo: 'Plano', icone: 'casa' },
  mapa: { rotulo: 'Mapa', icone: 'mapa' },
  relatar: { rotulo: 'Relatar', icone: 'alerta' },
  perfil: { rotulo: 'Perfil', icone: 'usuario' },
};

/** Barra de navegação do design: quatro abas, ativa em teal, 72 dp de altura. */
export function BarraAbas({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { c } = useTema();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.barra,
        { height: altura.barraNavegacao + insets.bottom, paddingBottom: insets.bottom, backgroundColor: c.fundo, borderTopColor: c.divisor },
      ]}>
      {state.routes.map((rota, indice) => {
        const aba = abas[rota.name];
        if (!aba) return null;
        const ativa = state.index === indice;
        const cor = ativa ? c.link : c.textoSecundario;
        return (
          <Pressable
            key={rota.key}
            accessibilityRole="tab"
            accessibilityLabel={aba.rotulo}
            accessibilityState={{ selected: ativa }}
            onPress={() => {
              const evento = emitter.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });
              if (!ativa && !evento.defaultPrevented) navigateToTab(rota.key);
            }}
            style={styles.aba}>
            <Icone nome={aba.icone} cor={cor} />
            <Texto
              variante="overline"
              cor={cor}
              style={{
                textTransform: 'none',
                letterSpacing: 0,
                fontFamily: ativa ? 'BricolageGrotesque_700Bold' : 'BricolageGrotesque_600SemiBold',
              }}>
              {aba.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  aba: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 48 },
});
