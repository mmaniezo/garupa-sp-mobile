import { StyleSheet, View } from 'react-native';

import { Entrada, Pressionavel, Texto } from '@/components/ui';
import type { PontoDoPlano } from '@/servicos/plano';
import { useTema } from '@/lib/tema';
import { alerta, brand, raio } from '@/theme';
import { nivelDeRisco } from '@/domain/risco';

type Props = {
  ponto: PontoDoPlano;
  posicao: number;
  linha: string;
  destaque: boolean;
  onPress?: () => void;
  /** Posição na cascata de entrada da lista. */
  ordem?: number;
};

/** Item da lista de pontos críticos (tela 07): número, via, onde e por quê, nível de risco. */
export function ItemPonto({ ponto, posicao, linha, destaque, onPress, ordem = 0 }: Props) {
  const nivel = nivelDeRisco(ponto.percentil);
  const { c } = useTema();
  return (
    <Entrada ordem={ordem}>
      <Pressionavel
        onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ponto ${posicao}: ${ponto.viaReferencia}. ${linha}. Risco ${nivel}.`}
      accessibilityHint="Mostra o ponto no mapa e o risco por horário"
        escala={0.98}
        style={[styles.item, { backgroundColor: c.superficie, borderColor: destaque ? 'rgba(245,165,36,0.38)' : c.fio }]}>
      <View style={[styles.numero, { backgroundColor: destaque ? alerta.atencao : c.borda }]}>
        <Texto variante="corpo" cor={destaque ? brand.asfalto : c.texto} style={styles.numeroTexto}>
          {posicao}
        </Texto>
      </View>
      <View style={styles.textos}>
        <Texto variante="corpo" style={styles.via} numberOfLines={2}>
          {ponto.viaReferencia}
        </Texto>
        <Texto variante="legenda" cor="textoSecundario" style={{ fontSize: 14 }}>
          {linha}
        </Texto>
        {ponto.visitas > 0 ? (
          <Texto variante="legenda" cor="link" style={{ fontSize: 14 }}>
            Você costuma passar aqui
          </Texto>
        ) : null}
      </View>
      <View style={[styles.selo, { backgroundColor: destaque ? 'rgba(245,165,36,0.16)' : c.superficieElevada }]}>
        <Texto variante="overline" cor={destaque ? c.atencaoTexto : c.textoSecundario} style={styles.nivel}>
          {nivel}
        </Texto>
      </View>
      </Pressionavel>
    </Entrada>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: raio.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 68,
    borderWidth: 1,
  },
  selo: { borderRadius: raio.pilula, paddingHorizontal: 10, paddingVertical: 5 },
  numero: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 17 },
  textos: { flex: 1, gap: 2 },
  via: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 17, lineHeight: 21 },
  nivel: { textTransform: 'none', letterSpacing: 0 },
});
