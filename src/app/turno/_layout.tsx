import { Stack } from 'expo-router';

import { brand } from '@/theme';

/** Antes do turno, turno ativo, alerta e pausa (telas 09 a 13 do design). */
export default function TurnoLayout() {
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
