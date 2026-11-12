import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Texto } from '@/components/ui';
import { projetar } from '@/domain/geo';
import { nivelDeRisco } from '@/domain/risco';
import { alerta, brand } from '@/theme';

import type { PropsMapaPontos } from './tipos';

/**
 * Mapa esquemático: posições relativas sobre ruas desenhadas, sem serviço de mapa.
 * Usado na web e no build sem a chave do Google Maps.
 */
export function MapaEsquematico({ pontos, destaqueId, posicao, onSelecionar, largura, altura, folgaTopo }: PropsMapaPontos) {
  const geo = useMemo(() => {
    const todos = pontos.map((p) => ({ lat: p.centroLat, lon: p.centroLon }));
    if (posicao) todos.push({ lat: posicao.lat, lon: posicao.lon });
    // A margem de cima deixa os pontos fora da pílula e do seletor.
    return projetar(todos, largura, altura - folgaTopo / 2, 48);
  }, [pontos, posicao, largura, altura, folgaTopo]);
  const deslocamento = folgaTopo / 2;
  const x = (p: { lat: number; lon: number }) => geo.x(p);
  const y = (p: { lat: number; lon: number }) => geo.y(p) + deslocamento;

  return (
    <View style={{ width: largura, height: altura }} accessibilityLabel="Mapa esquemático com os pontos críticos e a sua posição">
      <Svg width={largura} height={altura} style={StyleSheet.absoluteFill}>
        {Array.from({ length: 9 }, (_, i) => (
          <Line key={`v${i}`} x1={(largura / 8) * i} y1={0} x2={(largura / 8) * i + 30} y2={altura} stroke="#161C20" strokeWidth={6} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <Line key={`h${i}`} x1={0} y1={(altura / 6) * i} x2={largura} y2={(altura / 6) * i - 24} stroke="#1E262B" strokeWidth={8} />
        ))}
        {pontos.map((p) => {
          const ponto = { lat: p.centroLat, lon: p.centroLon };
          const sel = p.celulaId === destaqueId;
          return <Circle key={`h-${p.celulaId}`} cx={x(ponto)} cy={y(ponto)} r={sel ? 44 : 30} fill={alerta.atencao} fillOpacity={sel ? 0.28 : 0.16} />;
        })}
        {posicao ? (
          <>
            <Circle cx={x(posicao)} cy={y(posicao)} r={20} fill={brand.teal} fillOpacity={0.25} />
            <Circle cx={x(posicao)} cy={y(posicao)} r={9} fill={brand.teal} stroke={brand.branco} strokeWidth={3} />
          </>
        ) : null}
      </Svg>
      {pontos.map((p, i) => {
        const ponto = { lat: p.centroLat, lon: p.centroLon };
        const sel = p.celulaId === destaqueId;
        return (
          <Pressable
            key={p.celulaId}
            onPress={() => onSelecionar(p.celulaId)}
            accessibilityRole="button"
            accessibilityLabel={`Ponto ${i + 1}: ${p.viaReferencia}, risco ${nivelDeRisco(p.percentil)}`}
            accessibilityState={{ selected: sel }}
            style={[styles.alvo, { left: x(ponto) - 24, top: y(ponto) - 24 }]}>
            <MarcadorNumero numero={i + 1} selecionado={sel} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** O marcador do design: círculo âmbar com o número do ponto na lista. */
export function MarcadorNumero({ numero, selecionado }: { numero: number; selecionado: boolean }) {
  return (
    <View style={[styles.marcador, selecionado && styles.marcadorSel]}>
      <Texto variante="overline" cor={brand.asfalto} style={{ letterSpacing: 0 }}>
        {numero}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  alvo: { position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  marcador: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: alerta.atencao,
    borderWidth: 3,
    borderColor: brand.asfalto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorSel: { width: 36, height: 36, borderRadius: 18, borderColor: brand.branco },
});
