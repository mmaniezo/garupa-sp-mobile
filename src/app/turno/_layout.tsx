import { Stack } from 'expo-router';

import { useTema } from '@/lib/tema';

/** Antes do turno, turno ativo, alerta e pausa (telas 09 a 13 do design). */
export default function TurnoLayout() {
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
