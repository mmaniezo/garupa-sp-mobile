import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Entrada } from './entrada';

import { useTema } from '@/lib/tema';
import { alerta, raio } from '@/theme';

import { Botao } from './botao';
import { Texto } from './texto';

type Props = {
  /** Ex.: "Buraco: enviando em 4 s". É o que o leitor de tela anuncia a cada segundo. */
  titulo: string;
  descricao?: string;
  restante: number;
  total: number;
  /** "emergencia" para o SOS (vermelho); "atencao" para o relato de perigo. */
  tom: 'atencao' | 'emergencia';
  onDesfazer: () => void;
  onEnviarAgora: () => void;
};

/**
 * Contagem antes de enviar (relato e SOS manual): a barra esvazia até o envio. "Desfazer" à
 * esquerda e "Enviar agora" à direita, os dois grandes, para quem tem pressa não precisar esperar.
 */
export function ContagemDesfazer({ titulo, descricao, restante, total, tom, onDesfazer, onEnviarAgora }: Props) {
  const { c } = useTema();
  const [progresso] = useState(() => new Animated.Value(restante / total));
  const [largura] = useState(() => progresso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }));
  const emergencia = tom === 'emergencia';
  const corBarra = emergencia ? alerta.emergencia : c.atencaoTexto;

  // A barra anda sozinha do início ao fim (sem pular de segundo em segundo).
  useEffect(() => {
    const animacao = Animated.timing(progresso, {
      toValue: 0,
      duration: restante * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animacao.start();
    return () => animacao.stop();
    // Só na montagem: cada contagem nova monta o componente de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Entrada
      distancia={12}
      style={[
        styles.cartao,
        emergencia
          ? { borderColor: alerta.emergencia, backgroundColor: c.emergenciaSuperficie }
          : { borderColor: c.atencaoTexto, backgroundColor: c.superficieElevada },
      ]}>
      <View style={{ gap: 4 }} accessibilityLiveRegion="assertive">
        <Texto variante="alerta">{titulo}</Texto>
        {descricao ? (
          <Texto variante="legenda" cor="textoSecundario">
            {descricao}
          </Texto>
        ) : null}
      </View>
      <View style={[styles.trilho, { backgroundColor: c.divisor }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Animated.View
          style={[styles.barra, { backgroundColor: corBarra, width: largura }]}
        />
      </View>
      <View style={styles.acoes}>
        <View style={styles.acao}>
          <Botao titulo="Desfazer" variante="contorno" tamanho="padrao" style={styles.botao} dica="Cancela o envio" onPress={onDesfazer} />
        </View>
        <View style={styles.acao}>
          <Botao
            titulo="Enviar agora"
            variante={emergencia ? 'perigo' : 'primario'}
            tamanho="padrao"
            style={styles.botao}
            dica={`Envia agora, sem esperar os ${total} segundos`}
            onPress={onEnviarAgora}
          />
        </View>
      </View>
    </Entrada>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: 14, padding: 16, borderRadius: raio.xl, borderWidth: 2 },
  trilho: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4 },
  acoes: { flexDirection: 'row', gap: 10 },
  acao: { flex: 1 },
  // Menos folga dos lados: "Enviar agora" cabe numa linha com os dois botões lado a lado.
  botao: { paddingHorizontal: 10 },
});
