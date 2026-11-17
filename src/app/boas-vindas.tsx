import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Logo } from '@/components/brand/logo';
import { Botao, Entrada, Ondas, Tela, Texto } from '@/components/ui';
import { usePulso } from '@/lib/movimento';
import { brand } from '@/theme';

/** Tela 01 do design: boas-vindas. */
export default function BoasVindas() {
  // O capacete flutua de leve, como quem está de olho.
  const flutua = usePulso(3600);
  const estiloLogo = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * flutua.get() }] }));

  return (
    <Tela
      rolagem={false}
      margem={24}
      rodape={
        <Entrada ordem={5} style={styles.acoes}>
          <Botao titulo="Começar" vivo onPress={() => router.push('/cadastro/basico')} />
          <Botao titulo="Já tenho conta: entrar" variante="fantasma" tamanho="padrao" onPress={() => router.push('/entrar')} />
        </Entrada>
      }>
      <View style={styles.topo}>
        <Entrada ordem={0} distancia={28} style={styles.logo}>
          <Ondas cor={brand.teal} tamanho={170} quantidade={3} duracao={4200} ate={1.7} />
          {/* Em desenvolvimento, toque longo na logo abre o catálogo de telas. */}
          <Pressable onLongPress={__DEV__ ? () => router.push('/dev') : undefined} delayLongPress={800}>
            <Animated.View style={estiloLogo}>
              <Logo variante="capacete" largura={200} />
            </Animated.View>
          </Pressable>
        </Entrada>
        <View style={styles.textos}>
          <Entrada ordem={2}>
            <Texto variante="display" centro>
              A garupa que vai junto, de olho em você.
            </Texto>
          </Entrada>
          <Entrada ordem={3}>
            <Texto variante="corpo" cor="textoSecundario" centro>
              Pontos e horários de maior risco nas suas áreas, alerta no trajeto e socorro se você cair.
            </Texto>
          </Entrada>
        </View>
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  topo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  logo: { alignItems: 'center', justifyContent: 'center' },
  textos: { gap: 12 },
  acoes: { gap: 10 },
});
