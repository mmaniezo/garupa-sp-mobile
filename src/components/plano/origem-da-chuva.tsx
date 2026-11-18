import { StyleSheet, View } from 'react-native';

import { Botao, Texto } from '@/components/ui';
import { usePreferencias } from '@/dados-locais/preferencias';
import { horaCurta } from '@/lib/hora';
import { useClima, voltarChuvaAutomatica } from '@/servicos/clima';

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

  // Com uma previsão já em mãos, a consulta seguinte não troca o texto (nada de piscar).
  const texto =
    clima.situacao === 'sem-dados'
      ? clima.em
        ? `Previsão do tempo das ${horaCurta(clima.em)}; sem atualizar agora.`
        : 'Sem a previsão do tempo agora. Se precisar, escolha você.'
      : clima.em
        ? `Automático, pela previsão do tempo das ${horaCurta(clima.em)}.`
        : 'Consultando a previsão do tempo…';

  return (
    <Texto variante="legenda" cor="textoSecundario">
      {texto}
    </Texto>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 4 },
});
