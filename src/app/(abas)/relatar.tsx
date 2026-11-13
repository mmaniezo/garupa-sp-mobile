import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TipoRelato } from '@/api/types';
import { SEGUNDOS_PARA_DESFAZER_SOS, SosManual } from '@/components/sos/sos-manual';
import { Aviso, Botao, Icone, Tela, Texto } from '@/components/ui';
import { useEstilos, useTema } from '@/lib/tema';
import { useDesfazer } from '@/lib/use-desfazer';
import { relatarPerigo, TIPOS_RELATO, type ResultadoRelato } from '@/servicos/relatos';
import { raio, type Paleta } from '@/theme';

const MENSAGEM: Record<ResultadoRelato['situacao'], string> = {
  enviado: 'Relato enviado. Obrigado: ele volta para a cidade como um ponto observado.',
  na_fila: 'Sem internet: o relato fica guardado e sai quando a conexão voltar.',
  recusado: '',
  sem_local: 'Sem a sua localização não dá para marcar o local. Permita a localização e tente de novo.',
};

/**
 * Tela 19 · Relatar perigo (RF26) e SOS manual (RF25).
 * Relato em dois toques (a aba e o tipo), no local atual, com 5 s para desfazer.
 */
export default function Relatar() {
  const { c } = useTema();
  const styles = useEstilos(criarEstilos);
  const [resultado, setResultado] = useState<{ tom: 'sucesso' | 'neutro' | 'erro'; texto: string } | null>(null);
  const { pendente, iniciar, desfazer } = useDesfazer<TipoRelato>(5, (tipo) => {
    void relatarPerigo(tipo).then((r) =>
      setResultado({
        tom: r.situacao === 'enviado' ? 'sucesso' : r.situacao === 'na_fila' ? 'neutro' : 'erro',
        texto: r.situacao === 'recusado' ? r.motivo : MENSAGEM[r.situacao],
      }),
    );
  });

  function escolher(tipo: TipoRelato) {
    setResultado(null);
    iniciar(tipo);
  }

  const rotuloPendente = TIPOS_RELATO.find((t) => t.id === pendente?.valor)?.rotulo;

  return (
    <Tela dentroDeAbas gap={16}>
      <View style={{ gap: 4 }}>
        <Texto variante="titulo" accessibilityRole="header">
          Viu um perigo?
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          Dois toques e ele volta para a cidade. Local: onde você está agora.
        </Texto>
      </View>

      {pendente ? (
        <View style={styles.pendente} accessibilityLiveRegion="assertive">
          <Texto variante="alerta">
            {rotuloPendente}: enviando em {pendente.restante} s
          </Texto>
          <Botao titulo="Desfazer" variante="claro" tamanho="padrao" onPress={desfazer} />
        </View>
      ) : (
        <View style={styles.grade}>
          {TIPOS_RELATO.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => escolher(t.id)}
              accessibilityRole="button"
              accessibilityLabel={`Relatar ${t.rotulo}`}
              accessibilityHint="Envia em 5 segundos, com opção de desfazer"
              style={({ pressed }) => [styles.tipo, pressed && { opacity: 0.85 }]}>
              <Icone nome={t.icone} tamanho={28} cor={c.atencaoTexto} />
              <Texto variante="corpo" style={styles.tipoTexto}>
                {t.rotulo}
              </Texto>
            </Pressable>
          ))}
        </View>
      )}
      {resultado ? <Aviso tom={resultado.tom} texto={resultado.texto} anunciar /> : null}

      <View style={styles.divisor} />

      <View style={{ gap: 4 }}>
        <Texto variante="titulo" style={{ fontSize: 24 }} accessibilityRole="header">
          Precisa de ajuda?
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          Escolha o que aconteceu. Seus contatos recebem um SMS com a sua localização.
        </Texto>
      </View>
      <SosManual onEnviado={(id) => router.push(`/sos/${id}`)} />
      <Texto variante="legenda" cor="textoSecundario">
        Depois de escolher, você tem {SEGUNDOS_PARA_DESFAZER_SOS} s para desfazer.
      </Texto>
    </Tela>
  );
}

const criarEstilos = (c: Paleta) =>
  StyleSheet.create({
    grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tipo: {
      flexBasis: '45%',
      flexGrow: 1,
      minHeight: 104,
      borderRadius: raio.xxl,
      backgroundColor: c.superficieElevada,
      padding: 14,
      justifyContent: 'space-between',
    },
    tipoTexto: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 18 },
    pendente: { gap: 10, padding: 16, borderRadius: raio.xl, backgroundColor: c.superficieElevada },
    divisor: { height: 1, backgroundColor: c.divisor, marginVertical: 4 },
  });
