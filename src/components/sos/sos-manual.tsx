import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TipoSos } from '@/api/types';
import { Botao, ContagemDesfazer } from '@/components/ui';
import { useEstilos } from '@/lib/tema';
import { useDesfazer } from '@/lib/use-desfazer';
import { dispararSos } from '@/servicos/sos';
import { alerta, raio, type Paleta } from '@/theme';

/** Tempo para desfazer o SOS manual depois de escolher o tipo. */
export const SEGUNDOS_PARA_DESFAZER_SOS = 10;

/**
 * SOS manual por tipo de emergência (RF25). Depois de escolher, 10 s para desfazer, ou
 * "Enviar agora" para não esperar.
 * "Agressão ou assalto" segue como tipo de emergência (ponto em aberto no documento de requisitos).
 */
export const TIPOS_SOS: { id: TipoSos; rotulo: string; larguraTotal?: boolean }[] = [
  { id: 'queda', rotulo: 'Queda' },
  { id: 'mal_estar', rotulo: 'Mal-estar' },
  { id: 'agressao_assalto', rotulo: 'Agressão ou assalto', larguraTotal: true },
];

type Props = {
  onEnviado: (eventoId: string) => void;
  /** Avisa quando a contagem começa e termina (a folha do turno esconde o "Fechar" enquanto conta). */
  aoMudarContagem?: (contando: boolean) => void;
};

export function SosManual({ onEnviado, aoMudarContagem }: Props) {
  const { pendente, total, iniciar, desfazer, enviarAgora } = useDesfazer<TipoSos>(SEGUNDOS_PARA_DESFAZER_SOS, (tipo) => {
    void dispararSos({ tipo, origem: 'celular' }).then((id) => id && onEnviado(id));
  });
  const styles = useEstilos(criarEstilos);
  const contando = !!pendente;

  useEffect(() => {
    aoMudarContagem?.(contando);
  }, [contando, aoMudarContagem]);

  if (pendente) {
    const rotulo = TIPOS_SOS.find((t) => t.id === pendente.valor)?.rotulo ?? '';
    return (
      <ContagemDesfazer
        tom="emergencia"
        titulo={`SOS de ${rotulo.toLowerCase()} em ${pendente.restante} s`}
        descricao="Seus contatos recebem um SMS com a sua localização."
        restante={pendente.restante}
        total={total}
        onDesfazer={desfazer}
        onEnviarAgora={enviarAgora}
      />
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
            dica={`Envia em ${SEGUNDOS_PARA_DESFAZER_SOS} segundos, com opção de desfazer ou enviar na hora`}
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
  });
