import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/logo';
import { Botao, Tela, Texto } from '@/components/ui';

/** Tela 01 do design: boas-vindas. */
export default function BoasVindas() {
  return (
    <Tela
      rolagem={false}
      margem={24}
      rodape={
        <>
          <Botao titulo="Começar" onPress={() => router.push('/cadastro/basico')} />
          <Botao
            titulo="Já tenho conta"
            variante="fantasma"
            tamanho="padrao"
            onPress={() =>
              Alert.alert(
                'Cadastro neste aparelho',
                'No protótipo, o cadastro fica guardado neste celular. Se trocou de aparelho, faça o cadastro de novo: leva 2 minutos.',
              )
            }
          />
        </>
      }>
      <View style={styles.topo}>
        {/* Em desenvolvimento, toque longo na logo abre o catálogo de telas. */}
        <Pressable onLongPress={__DEV__ ? () => router.push('/dev') : undefined} delayLongPress={800}>
          <Logo variante="capacete" largura={200} />
        </Pressable>
        <View style={styles.textos}>
          <Texto variante="display" centro>
            A garupa que vai junto, de olho em você.
          </Texto>
          <Texto variante="corpo" cor="textoSecundario" centro>
            Pontos e horários de maior risco nas suas áreas, alerta no trajeto e socorro se você cair.
          </Texto>
        </View>
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  topo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  textos: { gap: 12 },
});
