import { Tabs } from 'expo-router/js-tabs';

import { BarraAbas } from '@/components/navegacao/barra-abas';
import { brand } from '@/theme';

/** Abas principais do design: Plano, Mapa, Relatar e Perfil. */
export default function AbasLayout() {
  return (
    <Tabs
      tabBar={(props) => <BarraAbas {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: brand.asfalto } }}>
      <Tabs.Screen name="plano" />
      <Tabs.Screen name="mapa" />
      <Tabs.Screen name="relatar" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
