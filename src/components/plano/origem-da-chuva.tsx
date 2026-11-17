import { StyleSheet, View } from 'react-native';

import { Botao, Texto } from '@/components/ui';
import { usePreferencias } from '@/dados-locais/preferencias';
import { useClima, voltarChuvaAutomatica } from '@/servicos/clima';

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Embaixo de "Seco / Chovendo": diz de onde veio a chuva. Automática, pela previsão do tempo
 * (Open-Meteo); ou escolhida à mão, com o atalho para voltar a detectar sozinho.
 */
export function OrigemDaChuva() {
  const prefs = usePreferencias();
  const clima = useClima();

  if (!prefs.chuvaAutomatica) {
    return (
      <View style={styles.linha}>
        <Texto variante="legenda" cor="textoSecundario">
          Escolhido por você.
        </Texto>
        <Botao
          titulo="Detectar sozinho"
          variante="link"
          tamanho="compacto"
          larguraTotal={false}
          onPress={() => void voltarChuvaAutomatica()}
        />
      </View>
    );
  }

  const texto =
    clima.situacao === 'ok' && clima.em
      ? `Automático, pela previsão do tempo das ${hora(clima.em)}.`
      : clima.situacao === 'sem-dados'
        ? clima.em
          ? `Previsão do tempo das ${hora(clima.em)}; sem atualizar agora.`
          : 'Sem a previsão do tempo agora. Se precisar, escolha você.'
        : 'Consultando a previsão do tempo…';

  return (
    <Texto variante="legenda" cor="textoSecundario" accessibilityLiveRegion="polite">
      {texto}
    </Texto>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 4 },
});
