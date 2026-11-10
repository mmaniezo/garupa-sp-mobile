import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { Vigia } from '@/components/navegacao/vigia';
import { iniciarServicos } from '@/servicos/inicializacao';
import { cadastroConcluido, carregarSessao, useSessao } from '@/state/sessao';
import { brand, tons } from '@/theme';

SplashScreen.preventAutoHideAsync();

const temaNavegacao: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: brand.teal,
    background: brand.asfalto,
    card: brand.asfalto,
    text: brand.branco,
    border: brand.viseira,
    notification: tons.emergenciaLed,
  },
};

export default function RaizLayout() {
  const [fontesProntas, erroFontes] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  const sessao = useSessao();
  const [servicosProntos, setServicosProntos] = useState(false);

  useEffect(() => {
    void (async () => {
      await carregarSessao();
      await iniciarServicos().catch((e) => __DEV__ && console.warn('[inicio]', e));
      setServicosProntos(true);
    })();
  }, []);

  const pronto = (fontesProntas || !!erroFontes) && sessao.carregada && servicosProntos;

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  const cadastrado = cadastroConcluido(sessao);

  return (
    <ThemeProvider value={temaNavegacao}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: brand.asfalto },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="boas-vindas" options={{ animation: 'fade' }} />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="dev" />
        <Stack.Screen name="diagnostico" />

        {/* Só depois do cadastro mínimo e das permissões. */}
        <Stack.Protected guard={cadastrado}>
          <Stack.Screen name="(abas)" options={{ animation: 'fade' }} />
          <Stack.Screen name="turno" />
          <Stack.Screen name="pulseira" />
          <Stack.Screen name="sos/[eventoId]" options={{ gestureEnabled: false }} />
          {/* Contagem da queda: tela inteira, sem gesto de voltar (só "Estou bem" cancela). */}
          <Stack.Screen
            name="queda"
            options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
          />
        </Stack.Protected>

        {/* A testemunha abre pela tela de bloqueio, enquanto houver SOS ativo. */}
        <Stack.Screen name="testemunha" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
      {cadastrado ? <Vigia /> : null}
    </ThemeProvider>
  );
}
