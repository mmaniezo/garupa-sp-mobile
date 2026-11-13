import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui';
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
};

/** Item da lista de pontos críticos (tela 07): número, via, onde e por quê, nível de risco. */
export function ItemPonto({ ponto, posicao, linha, destaque, onPress }: Props) {
  const nivel = nivelDeRisco(ponto.percentil);
  const { c } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ponto ${posicao}: ${ponto.viaReferencia}. ${linha}. Risco ${nivel}.`}
      accessibilityHint="Mostra o ponto no mapa e o risco por horário"
      style={({ pressed }) => [styles.item, { backgroundColor: c.superficie }, pressed && { opacity: 0.85 }]}>
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
      <Texto variante="overline" cor={destaque ? c.atencaoTexto : c.textoSecundario} style={styles.nivel}>
        {nivel}
      </Texto>
    </Pressable>
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
    minHeight: 64,
  },
  numero: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 17 },
  textos: { flex: 1, gap: 2 },
  via: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 17, lineHeight: 21 },
  nivel: { textTransform: 'none', letterSpacing: 0 },
});
