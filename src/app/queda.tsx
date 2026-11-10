import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';

import { Botao, Icone, Texto } from '@/components/ui';
import { regras } from '@/config';
import { voltarOu } from '@/lib/navegacao';
import { estouBem, pedirAjudaAgora, useQueda } from '@/servicos/queda';
import { useSos } from '@/servicos/sos';
import { alerta, brand, tons } from '@/theme';

/** Conteúdo que não pega o toque: o toque passa para a camada que cancela. */
const semToque = { pointerEvents: 'none' as const };

const R = 106;
const CIRC = 2 * Math.PI * R;

/** Alarme alto em laço e vibração enquanto a contagem está na tela (RF19). */
function useAlarme(ativo: boolean) {
  useEffect(() => {
    if (!ativo || Platform.OS === 'web') return;
    let player: AudioPlayer | null = null;
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    try {
      player = createAudioPlayer(require('@/assets/sounds/alarme.wav'));
      player.loop = true;
      player.volume = 1;
      player.play();
    } catch {
      player = null;
    }
    Vibration.vibrate([0, 800, 400], true);
    return () => {
      Vibration.cancel();
      player?.pause();
      player?.remove();
    };
  }, [ativo]);
}

/**
 * Tela 15 · Queda: contagem em tela cheia (RF18, RF19).
 * A tela inteira é o botão de cancelar; "Estou bem" funciona até o último segundo.
 * Ao fim dos 30 s, o SOS sai sozinho, mesmo que esta tela esteja fechada (o relógio é do serviço).
 */
export default function ContagemDaQueda() {
  const { ctx, segundos } = useQueda();
  const sos = useSos();
  const insets = useSafeAreaInsets();
  const [cancelado, setCancelado] = useState(false);
  const emContagem = ctx.estado === 'contagem';
  useAlarme(emContagem);

  useEffect(() => {
    if (ctx.estado === 'sos_enviado' && sos) router.replace(`/sos/${sos.eventoId}`);
  }, [ctx.estado, sos]);

  useEffect(() => {
    if (!emContagem && !cancelado && ctx.estado === 'monitorando') {
      const t = setTimeout(() => voltarOu('/turno/ativo'), 300);
      return () => clearTimeout(t);
    }
  }, [emContagem, cancelado, ctx.estado]);

  async function cancelar() {
    setCancelado(true);
    await estouBem();
    setTimeout(() => voltarOu('/turno/ativo'), 1500);
  }

  if (cancelado) {
    return (
      <View style={[styles.raiz, styles.ok, { paddingTop: insets.top + 64 }]} accessibilityLiveRegion="assertive">
        <StatusBar style="light" />
        <Icone nome="check" tamanho={72} cor={brand.branco} espessura={3} />
        <Texto variante="display" centro>
          Que bom que você está bem.
        </Texto>
        <Texto variante="corpo" centro>
          Contagem cancelada. Seguimos de olho.
        </Texto>
      </View>
    );
  }

  const restante = emContagem ? segundos : 0;
  const progresso = restante / regras.contagemQuedaSegundos;

  return (
    <View style={[styles.raiz, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      {/* A tela inteira cancela: camada de toque atrás do conteúdo. Para o leitor de tela,
          o botão é o "Estou bem" (não pode haver botão dentro de botão). */}
      <Pressable onPress={cancelar} style={StyleSheet.absoluteFill} aria-hidden focusable={false} />
      <View style={[styles.topo, semToque]}>
        <View style={styles.selo}>
          <Icone nome="alarme" tamanho={16} cor={brand.branco} espessura={2.4} />
          <Texto variante="rotulo" style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
            Alarme tocando
          </Texto>
        </View>
        <Texto variante="hero" centro>
          Você caiu?
        </Texto>
        <Texto variante="corpo" centro style={{ maxWidth: 300 }}>
          Se não responder, avisamos seu contato e registramos o SOS.
        </Texto>
      </View>

      <View
        style={[styles.anel, semToque]}
        accessible
        accessibilityLabel={`Faltam ${restante} segundos para o SOS`}
        accessibilityLiveRegion="polite">
        <Svg width={236} height={236} style={StyleSheet.absoluteFill}>
          <Circle cx={118} cy={118} r={R} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={14} />
          <Circle
            cx={118}
            cy={118}
            r={R}
            fill="none"
            stroke={brand.branco}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progresso)}
            transform="rotate(-90 118 118)"
          />
        </Svg>
        <Texto style={styles.numero}>{restante}</Texto>
        <Texto variante="rotulo" style={{ fontSize: 17 }}>
          segundos
        </Texto>
      </View>

      <View style={[styles.acoes, { pointerEvents: 'box-none' }]}>
        <Pressable
          onPress={cancelar}
          accessibilityRole="button"
          accessibilityLabel="Estou bem"
          accessibilityHint="Cancela a contagem. Tocar em qualquer lugar da tela também cancela."
          style={({ pressed }) => [styles.estouBem, pressed && { opacity: 0.9 }]}>
          <Icone nome="check" tamanho={32} cor={alerta.seguro} espessura={3} />
          <Texto style={styles.estouBemTexto}>Estou bem</Texto>
        </Pressable>
        <Texto variante="rotulo" centro style={[{ fontSize: 16 }, semToque]}>
          Ou toque em qualquer lugar da tela
        </Texto>
        <Botao
          titulo="Preciso de ajuda agora"
          variante="contorno"
          tamanho="padrao"
          dica="Manda o SOS sem esperar a contagem"
          onPress={() => void pedirAjudaAgora()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: tons.emergenciaProfunda, paddingHorizontal: 24, alignItems: 'center', gap: 22 },
  ok: { backgroundColor: alerta.seguro, gap: 16 },
  topo: { alignItems: 'center', gap: 8 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 34,
  },
  anel: { width: 236, height: 236, alignItems: 'center', justifyContent: 'center' },
  numero: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 104,
    lineHeight: 108,
    color: brand.branco,
    fontVariant: ['tabular-nums'],
  },
  acoes: { marginTop: 'auto', alignSelf: 'stretch', gap: 12 },
  estouBem: {
    height: 96,
    borderRadius: 28,
    backgroundColor: brand.branco,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  estouBemTexto: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 30, color: alerta.seguro },
});
