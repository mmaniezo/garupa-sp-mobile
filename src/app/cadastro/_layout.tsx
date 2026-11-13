import { Stack } from 'expo-router';

import { useTema } from '@/lib/tema';

/** Cadastro em camadas (telas 02 a 06 do design). */
export default function CadastroLayout() {
  const { c } = useTema();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.fundo },
        animation: 'slide_from_right',
      }}
    />
  );
}
