import { Tabs } from 'expo-router/js-tabs';

import { BarraAbas } from '@/components/navegacao/barra-abas';
import { useTema } from '@/lib/tema';

/** Abas principais do design: Plano, Mapa, Relatar e Perfil. */
export default function AbasLayout() {
  const { c } = useTema();
  return (
    <Tabs
      tabBar={(props) => <BarraAbas {...props} />}
      // "shift": a aba nova entra deslizando de leve enquanto a anterior some.
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: c.fundo } }}>
      <Tabs.Screen name="plano" />
      <Tabs.Screen name="mapa" />
      <Tabs.Screen name="relatar" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
