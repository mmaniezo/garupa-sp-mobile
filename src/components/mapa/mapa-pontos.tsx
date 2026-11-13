import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { nivelDeRisco } from '@/domain/risco';
import { useTema } from '@/lib/tema';
import { alerta, brand } from '@/theme';

import { ESTILO_MAPA_CLARO, ESTILO_MAPA_ESCURO } from './estilo-google';
import { MapaEsquematico, MarcadorNumero } from './mapa-esquematico';
import type { PropsMapaPontos, TipoDeMapa } from './tipos';

/**
 * Android: Google Maps. O Expo Go já traz uma chave; no build, ela vem do GOOGLE_MAPS_API_KEY
 * (app.config.js). Sem chave o SDK do Google fecha o app, então aí fica o mapa esquemático.
 * iOS: Apple Maps, que não precisa de chave.
 */
const temChaveGoogle = Constants.expoConfig?.extra?.mapaGoogle === true;
export const tipoDoMapa: TipoDeMapa =
  Platform.OS === 'ios' ? 'apple' : isRunningInExpoGo() || temChaveGoogle ? 'google' : 'esquematico';

/** Célula H3 de resolução 8 do modelo: cerca de 0,74 km². O círculo marca a área, não um ponto exato. */
const RAIO_CELULA_METROS = 400;
const SAO_PAULO: Region = { latitude: -23.56, longitude: -46.64, latitudeDelta: 0.3, longitudeDelta: 0.3 };
const AMBAR = (opacidade: number) => `rgba(245, 165, 36, ${opacidade})`;

export function MapaPontos(props: PropsMapaPontos) {
  return tipoDoMapa === 'esquematico' ? <MapaEsquematico {...props} /> : <MapaReal {...props} />;
}

function regiaoQueCobre(coordenadas: { latitude: number; longitude: number }[]): Region {
  if (coordenadas.length === 0) return SAO_PAULO;
  const lats = coordenadas.map((c) => c.latitude);
  const lons = coordenadas.map((c) => c.longitude);
  const [latMin, latMax, lonMin, lonMax] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  return {
    latitude: (latMin + latMax) / 2,
    longitude: (lonMin + lonMax) / 2,
    latitudeDelta: Math.max(0.03, (latMax - latMin) * 1.8),
    longitudeDelta: Math.max(0.03, (lonMax - lonMin) * 1.8),
  };
}

function MapaReal({ pontos, focoId, destaqueId, posicao, onSelecionar, largura, altura, folgaTopo, folgaBaixo }: PropsMapaPontos) {
  const mapa = useRef<MapView>(null);
  const [pronto, setPronto] = useState(false);
  const { nome: tema, c } = useTema();

  const coordenadas = useMemo(() => {
    const lista = pontos.map((p) => ({ latitude: p.centroLat, longitude: p.centroLon }));
    if (posicao) lista.push({ latitude: posicao.lat, longitude: posicao.lon });
    return lista;
  }, [pontos, posicao]);
  const [regiaoInicial] = useState(() => regiaoQueCobre(coordenadas));

  // Marcadores com desenho próprio: o Android redesenha enquanto `tracksViewChanges` está ligado.
  // Liga ao mudar o destaque ou a lista e desliga logo depois, para não gastar bateria.
  const assinatura = `${destaqueId}|${pontos.map((p) => p.celulaId).join(',')}`;
  const [assinaturaDesenhada, setAssinaturaDesenhada] = useState(assinatura);
  const [redesenhar, setRedesenhar] = useState(true);
  if (assinatura !== assinaturaDesenhada) {
    setAssinaturaDesenhada(assinatura);
    setRedesenhar(true);
  }
  useEffect(() => {
    const t = setTimeout(() => setRedesenhar(false), 900);
    return () => clearTimeout(t);
  }, [assinatura]);

  // Ponto escolhido (toque ou vindo do plano): o mapa vai até ele.
  const foco = pontos.find((p) => p.celulaId === focoId);
  const focoLat = foco?.centroLat;
  const focoLon = foco?.centroLon;
  useEffect(() => {
    if (!pronto || focoLat === undefined || focoLon === undefined) return;
    mapa.current?.animateToRegion({ latitude: focoLat, longitude: focoLon, latitudeDelta: 0.035, longitudeDelta: 0.035 }, 450);
  }, [pronto, focoLat, focoLon]);

  function aoAbrir() {
    setPronto(true);
    // Sem ponto escolhido, mostra todos os pontos e você de uma vez.
    if (focoId || coordenadas.length < 2) return;
    mapa.current?.fitToCoordinates(coordenadas, {
      edgePadding: { top: 40, right: 48, bottom: 40, left: 48 },
      animated: false,
    });
  }

  return (
    <MapView
      ref={mapa}
      style={{ width: largura, height: altura }}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      customMapStyle={tema === 'claro' ? ESTILO_MAPA_CLARO : ESTILO_MAPA_ESCURO}
      userInterfaceStyle={tema === 'claro' ? 'light' : 'dark'}
      initialRegion={regiaoInicial}
      // A pílula, o seletor e a folha ficam por cima: o padding mantém o logo do Google e o
      // enquadramento dentro da parte visível.
      mapPadding={{ top: folgaTopo, right: 0, bottom: folgaBaixo, left: 0 }}
      onMapReady={aoAbrir}
      moveOnMarkerPress={false}
      toolbarEnabled={false}
      showsCompass={false}
      showsBuildings={false}
      showsIndoors={false}
      showsPointsOfInterests={false}
      rotateEnabled={false}
      pitchEnabled={false}
      loadingEnabled
      loadingBackgroundColor={c.mapaFundo}
      loadingIndicatorColor={brand.teal}
      accessibilityLabel="Mapa com os pontos críticos e a sua posição. A mesma informação está em Lista.">
      {pontos.map((p) => {
        const sel = p.celulaId === destaqueId;
        return (
          <Circle
            key={`area-${p.celulaId}`}
            center={{ latitude: p.centroLat, longitude: p.centroLon }}
            radius={RAIO_CELULA_METROS}
            fillColor={AMBAR(sel ? 0.3 : 0.16)}
            strokeColor={AMBAR(sel ? 0.9 : 0.45)}
            strokeWidth={sel ? 2 : 1}
            zIndex={sel ? 2 : 1}
          />
        );
      })}
      {pontos.map((p, i) => {
        const sel = p.celulaId === destaqueId;
        return (
          <Marker
            key={p.celulaId}
            coordinate={{ latitude: p.centroLat, longitude: p.centroLon }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={redesenhar}
            zIndex={sel ? 20 : 10}
            onPress={() => onSelecionar(p.celulaId)}
            accessibilityLabel={`Ponto ${i + 1}: ${p.viaReferencia}, risco ${nivelDeRisco(p.percentil)}`}>
            <MarcadorNumero numero={i + 1} selecionado={sel} />
          </Marker>
        );
      })}
      {posicao ? (
        <Marker
          coordinate={{ latitude: posicao.lat, longitude: posicao.lon }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={redesenhar}
          zIndex={30}
          accessibilityLabel="Você está aqui">
          <View style={styles.voceHalo}>
            <View style={styles.voce} />
          </View>
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  voceHalo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(9, 155, 169, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voce: { width: 18, height: 18, borderRadius: 9, backgroundColor: brand.teal, borderWidth: 3, borderColor: brand.branco },
  posicaoFallback: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pino: { width: 20, height: 20, borderRadius: 10, backgroundColor: alerta.emergencia, borderWidth: 3, borderColor: brand.branco },
});

type PropsMapaPosicao = { lat: number; lon: number; altura: number; rotulo: string };

/**
 * Mapa pequeno com um ponto (a posição do SOS), sem gestos: no Android usa o modo "lite" do
 * Google Maps, uma imagem estática barata. Sem Google Maps, um quadro com o pino.
 */
export function MapaPosicao({ lat, lon, altura, rotulo }: PropsMapaPosicao) {
  const { nome: tema, c } = useTema();
  if (tipoDoMapa === 'esquematico') {
    return (
      <View style={[styles.posicaoFallback, { height: altura, backgroundColor: c.mapaFundo }]} accessibilityLabel={rotulo}>
        <View style={styles.pino} />
      </View>
    );
  }
  return (
    <MapView
      style={{ height: altura, borderRadius: 14 }}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      liteMode
      customMapStyle={tema === 'claro' ? ESTILO_MAPA_CLARO : ESTILO_MAPA_ESCURO}
      userInterfaceStyle={tema === 'claro' ? 'light' : 'dark'}
      initialRegion={{ latitude: lat, longitude: lon, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      showsPointsOfInterests={false}
      accessibilityLabel={rotulo}>
      <Marker coordinate={{ latitude: lat, longitude: lon }} pinColor={alerta.emergencia} />
    </MapView>
  );
}
