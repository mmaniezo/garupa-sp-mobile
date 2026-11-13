import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useState } from 'react';

import { Vigia } from '@/components/navegacao/vigia';
import { usePreferencias } from '@/dados-locais/preferencias';
import { aplicarTemaNoSistema, useTema } from '@/lib/tema';
import { iniciarServicos } from '@/servicos/inicializacao';
import { cadastroConcluido, carregarSessao, useSessao } from '@/state/sessao';
import { brand, tons, type NomeTema, type Paleta } from '@/theme';

SplashScreen.preventAutoHideAsync();

function temaDaNavegacao(nome: NomeTema, c: Paleta): Theme {
  const base = nome === 'claro' ? DefaultTheme : DarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: brand.teal,
      background: c.fundo,
      card: c.fundo,
      text: c.texto,
      border: c.divisor,
      notification: tons.emergenciaLed,
    },
  };
}

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
  const { nome: tema, c } = useTema();
  const { tema: preferenciaTema } = usePreferencias();
  const temaNavegacao = useMemo(() => temaDaNavegacao(tema, c), [tema, c]);

  // Aparência: a escolha do Perfil vale também para o sistema (alertas, teclado),
  // e o fundo da janela acompanha o tema (sem flash da cor errada ao trocar de tela).
  useEffect(() => {
    aplicarTemaNoSistema(preferenciaTema);
  }, [preferenciaTema]);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.fundo).catch(() => undefined);
  }, [c.fundo]);

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
          contentStyle: { backgroundColor: c.fundo },
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
