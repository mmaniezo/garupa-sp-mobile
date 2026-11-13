import { StyleSheet, View } from 'react-native';

import type { TipoSos } from '@/api/types';
import { Botao, Texto } from '@/components/ui';
import { useDesfazer } from '@/lib/use-desfazer';
import { dispararSos } from '@/servicos/sos';
import { useEstilos } from '@/lib/tema';
import { alerta, raio, type Paleta } from '@/theme';

/** Tempo para desfazer o SOS manual depois de escolher o tipo. */
export const SEGUNDOS_PARA_DESFAZER_SOS = 10;

/**
 * SOS manual por tipo de emergência (RF25). Depois de escolher, 10 s para desfazer.
 * "Agressão ou assalto" segue como tipo de emergência (ponto em aberto no documento de requisitos).
 */
export const TIPOS_SOS: { id: TipoSos; rotulo: string; larguraTotal?: boolean }[] = [
  { id: 'queda', rotulo: 'Queda' },
  { id: 'mal_estar', rotulo: 'Mal-estar' },
  { id: 'agressao_assalto', rotulo: 'Agressão ou assalto', larguraTotal: true },
];

type Props = { onEnviado: (eventoId: string) => void };

export function SosManual({ onEnviado }: Props) {
  const { pendente, iniciar, desfazer } = useDesfazer<TipoSos>(SEGUNDOS_PARA_DESFAZER_SOS, (tipo) => {
    void dispararSos({ tipo, origem: 'celular' }).then((id) => id && onEnviado(id));
  });
  const styles = useEstilos(criarEstilos);

  if (pendente) {
    const rotulo = TIPOS_SOS.find((t) => t.id === pendente.valor)?.rotulo ?? '';
    return (
      <View style={styles.pendente} accessibilityLiveRegion="assertive">
        <Texto variante="alerta">
          SOS de {rotulo.toLowerCase()} em {pendente.restante} s
        </Texto>
        <Texto variante="legenda" cor="textoSecundario">
          Seus contatos recebem um SMS com a sua localização.
        </Texto>
        <Botao titulo="Desfazer" variante="claro" tamanho="padrao" onPress={desfazer} />
      </View>
    );
  }

  return (
    <View style={styles.grade}>
      {TIPOS_SOS.map((t) => (
        <View key={t.id} style={t.larguraTotal ? styles.inteira : styles.metade}>
          <Botao
            titulo={t.rotulo}
            variante="neutro"
            tamanho="destaque"
            style={styles.botao}
            dica={`Depois de tocar, você tem ${SEGUNDOS_PARA_DESFAZER_SOS} segundos para desfazer`}
            onPress={() => iniciar(t.id)}
          />
        </View>
      ))}
    </View>
  );
}

const criarEstilos = (c: Paleta) =>
  StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metade: { flexBasis: '45%', flexGrow: 1 },
  inteira: { flexBasis: '100%' },
  botao: { borderRadius: raio.xl, borderWidth: 2, borderColor: alerta.emergencia, backgroundColor: c.emergenciaSuperficie },
  pendente: {
    gap: 10,
    padding: 16,
    borderRadius: raio.xl,
    borderWidth: 2,
    borderColor: alerta.emergencia,
    backgroundColor: c.emergenciaSuperficie,
  },
});
