import { Stack } from 'expo-router';

import { brand } from '@/theme';

/** Cadastro em camadas (telas 02 a 06 do design). */
export default function CadastroLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: brand.asfalto },
        animation: 'slide_from_right',
      }}
    />
  );
}
