import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';

import { api } from '@/api';
import type { DetalheCelula } from '@/api/types';
import { ItemPonto } from '@/components/plano/item-ponto';
import { Aviso, Botao, Icone, Segmentado, Texto } from '@/components/ui';
import { FAIXAS, rotuloFaixa } from '@/domain/contexto';
import { projetar } from '@/domain/geo';
import { acaoDoPonto, AVISO_HISTORICO, localDoPonto, motivoDoPonto, nivelDeRisco } from '@/domain/risco';
import { mensagemDeErro } from '@/lib/navegacao';
import { usePlano, type PontoDoPlano } from '@/servicos/plano';
import { usePosicao } from '@/servicos/posicao';
import { alerta, brand, raio, tons } from '@/theme';

/**
 * Tela 08 · Mapa de pontos críticos (RF08, RF09).
 * Mapa esquemático (posições relativas, sem chave de mapa de terceiros) e a mesma informação
 * em lista, que é a forma acessível. Tocar num ponto mostra o motivo e o risco por horário.
 */
export default function MapaPontos() {
  const { celula } = useLocalSearchParams<{ celula?: string }>();
  const plano = usePlano();
  const posicao = usePosicao();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [modo, setModo] = useState<'mapa' | 'lista'>('mapa');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(celula ?? null);
  const [celulaAnterior, setCelulaAnterior] = useState(celula);
  const [resposta, setResposta] = useState<{ id: string; detalhe?: DetalheCelula; erro?: string } | null>(null);

  // Veio do plano com outro ponto escolhido: esse passa a ser o selecionado.
  if (celula !== celulaAnterior) {
    setCelulaAnterior(celula);
    if (celula) setSelecionadoId(celula);
  }

  const pontos = useMemo(() => plano.dados?.pontos ?? [], [plano.dados]);
  const contexto = plano.dados?.contexto;
  const selecionado = pontos.find((p) => p.celulaId === selecionadoId) ?? pontos[0] ?? null;
  const idSelecionado = selecionado?.celulaId ?? null;
  const detalhe = resposta?.id === idSelecionado ? (resposta.detalhe ?? null) : null;
  const erroDetalhe = resposta?.id === idSelecionado ? (resposta.erro ?? null) : null;

  useEffect(() => {
    if (!idSelecionado) return;
    api
      .obterCelula(idSelecionado)
      .then((d) => setResposta({ id: idSelecionado, detalhe: d }))
      .catch((e) => setResposta({ id: idSelecionado, erro: mensagemDeErro(e, 'Sem o risco por horário agora.') }));
  }, [idSelecionado]);

  const alturaMapa = Math.round(height * 0.46);
  const geo = useMemo(() => {
    const todos = pontos.map((p) => ({ lat: p.centroLat, lon: p.centroLon }));
    if (posicao) todos.push({ lat: posicao.lat, lon: posicao.lon });
    return projetar(todos, width, alturaMapa, 48);
  }, [pontos, posicao, width, alturaMapa]);

  const distritos = [...new Set(pontos.map((p) => p.distritoNome).filter(Boolean))].slice(0, 3).join(' · ');

  const barras = useMemo(() => {
    if (!detalhe || !contexto) return [];
    const linhas = FAIXAS.map((f) =>
      detalhe.riscoPorFaixa.find((r) => r.faixaHoraria === f && r.tipoDia === contexto.tipoDia && r.chuva === contexto.chuva),
    ).filter((r): r is NonNullable<typeof r> => !!r);
    const max = Math.max(...linhas.map((r) => r.score), 0.01);
    return linhas.map((r) => ({ ...r, largura: r.score / max }));
  }, [detalhe, contexto]);

  const folha = selecionado && contexto ? (
    <View style={styles.folhaConteudo}>
      <View style={styles.folhaTopo}>
        <View style={styles.iconeAlerta}>
          <Icone nome="alerta" tamanho={22} cor={brand.asfalto} espessura={2.4} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Texto variante="corpo" style={styles.via}>
            {selecionado.viaReferencia}
          </Texto>
          <Texto variante="legenda" cor="textoSecundario">
            {localDoPonto(selecionado)} · risco {nivelDeRisco(selecionado.percentil).toLowerCase()}
          </Texto>
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <Texto variante="rotulo">Por quê</Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          {motivoDoPonto(contexto.faixa, contexto.tipoDia, contexto.chuva)}
        </Texto>
      </View>
      <View style={{ gap: 2 }}>
        <Texto variante="rotulo">O que fazer</Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          {acaoDoPonto(contexto.faixa, contexto.chuva)}
        </Texto>
      </View>

      <Texto variante="overline" cor="textoSecundario" accessibilityRole="header">
        Risco por horário neste ponto
      </Texto>
      {erroDetalhe ? <Aviso tom="neutro" texto={erroDetalhe} /> : null}
      {barras.map((b) => {
        const atual = b.faixaHoraria === contexto.faixa;
        const nivel = nivelDeRisco(b.percentil);
        return (
          <View
            key={b.faixaHoraria}
            style={styles.barraLinha}
            accessible
            accessibilityLabel={`${rotuloFaixa(b.faixaHoraria)}: risco ${nivel}${atual ? ', faixa de agora' : ''}`}>
            <Texto variante="legenda" style={[styles.barraRotulo, atual && styles.forte]}>
              {rotuloFaixa(b.faixaHoraria)}
            </Texto>
            <View style={styles.barraTrilho}>
              <View
                style={[
                  styles.barra,
                  { width: `${Math.round(b.largura * 100)}%`, backgroundColor: atual ? alerta.atencao : tons.neutroBarra },
                ]}
              />
            </View>
            <Texto
              variante="legenda"
              cor={atual ? alerta.atencao : tons.textoSecundario}
              style={[styles.barraNivel, atual && styles.forte]}>
              {nivel}
            </Texto>
          </View>
        );
      })}
      <Texto variante="legenda" cor="textoSecundario" style={{ fontSize: 14 }}>
        Mapa esquemático, posições aproximadas. {AVISO_HISTORICO} Base: Infosiga e INMET.
      </Texto>
    </View>
  ) : null;

  const seletorModo = (
    <Segmentado
      rotulo="Ver como"
      valor={modo}
      opcoes={[
        { valor: 'mapa', rotulo: 'Mapa' },
        { valor: 'lista', rotulo: 'Lista' },
      ]}
      onChange={setModo}
    />
  );

  if (!plano.dados || pontos.length === 0) {
    return (
      <View style={[styles.raiz, { paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 16 }]}>
        <Texto variante="titulo" accessibilityRole="header">
          Pontos críticos
        </Texto>
        <Aviso
          tom="neutro"
          texto={
            plano.carregando
              ? 'Carregando os pontos…'
              : 'Nenhum ponto crítico para mostrar agora. Escolha seus distritos ou permita a localização.'
          }
        />
        <Botao titulo="Ir para o plano" variante="contorno" tamanho="padrao" onPress={() => router.navigate('/plano')} />
      </View>
    );
  }

  if (modo === 'lista') {
    return (
      <ScrollView style={styles.raiz} contentContainerStyle={{ paddingTop: insets.top + 16, padding: 20, gap: 12 }}>
        <View style={styles.cabecalho}>
          <Texto variante="titulo" accessibilityRole="header">
            Pontos críticos
          </Texto>
          {seletorModo}
        </View>
        {pontos.map((p: PontoDoPlano, i) => (
          <ItemPonto
            key={p.celulaId}
            ponto={p}
            posicao={i + 1}
            destaque={i < 2}
            linha={localDoPonto(p)}
            onPress={() => {
              setSelecionadoId(p.celulaId);
              setModo('mapa');
            }}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.raiz}>
      <View style={{ height: alturaMapa }} accessibilityLabel="Mapa esquemático com os pontos críticos e a sua posição">
        <Svg width={width} height={alturaMapa} style={StyleSheet.absoluteFill}>
          {Array.from({ length: 9 }, (_, i) => (
            <Line key={`v${i}`} x1={(width / 8) * i} y1={0} x2={(width / 8) * i + 30} y2={alturaMapa} stroke="#161C20" strokeWidth={6} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <Line key={`h${i}`} x1={0} y1={(alturaMapa / 6) * i} x2={width} y2={(alturaMapa / 6) * i - 24} stroke="#1E262B" strokeWidth={8} />
          ))}
          {pontos.map((p) => {
            const x = geo.x({ lat: p.centroLat, lon: p.centroLon });
            const y = geo.y({ lat: p.centroLat, lon: p.centroLon });
            const sel = p.celulaId === selecionado?.celulaId;
            return (
              <Circle key={`h-${p.celulaId}`} cx={x} cy={y} r={sel ? 44 : 30} fill={alerta.atencao} fillOpacity={sel ? 0.28 : 0.16} />
            );
          })}
          {posicao ? (
            <>
              <Circle cx={geo.x(posicao)} cy={geo.y(posicao)} r={20} fill={brand.teal} fillOpacity={0.25} />
              <Circle cx={geo.x(posicao)} cy={geo.y(posicao)} r={9} fill={brand.teal} stroke={brand.branco} strokeWidth={3} />
            </>
          ) : null}
        </Svg>
        {pontos.map((p, i) => {
          const x = geo.x({ lat: p.centroLat, lon: p.centroLon });
          const y = geo.y({ lat: p.centroLat, lon: p.centroLon });
          const sel = p.celulaId === selecionado?.celulaId;
          return (
            <Pressable
              key={p.celulaId}
              onPress={() => setSelecionadoId(p.celulaId)}
              accessibilityRole="button"
              accessibilityLabel={`Ponto ${i + 1}: ${p.viaReferencia}, risco ${nivelDeRisco(p.percentil)}`}
              accessibilityState={{ selected: sel }}
              style={[styles.alvo, { left: x - 24, top: y - 24 }]}>
              <View style={[styles.marcador, sel && styles.marcadorSel]}>
                <Texto variante="overline" cor={brand.asfalto} style={{ letterSpacing: 0 }}>
                  {i + 1}
                </Texto>
              </View>
            </Pressable>
          );
        })}

        <View style={[styles.sobreposicao, { top: insets.top + 12 }]}>
          <View style={styles.pilula}>
            <Texto variante="rotulo" numberOfLines={1}>
              {distritos || 'Perto de você'}
            </Texto>
          </View>
          {seletorModo}
        </View>
        <View style={styles.legenda}>
          <View style={styles.legendaItem}>
            <View style={[styles.ponto, { backgroundColor: alerta.atencao }]} />
            <Texto variante="legenda" style={{ fontSize: 14 }}>
              Ponto crítico
            </Texto>
          </View>
          <View style={styles.legendaItem}>
            <View style={[styles.ponto, { backgroundColor: brand.teal, borderWidth: 2, borderColor: brand.branco }]} />
            <Texto variante="legenda" style={{ fontSize: 14 }}>
              Você
            </Texto>
          </View>
        </View>
      </View>

      <ScrollView style={styles.folha} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.alca} />
        {folha}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: tons.mapaFundo },
  cabecalho: { gap: 12 },
  sobreposicao: { position: 'absolute', left: 16, right: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  pilula: {
    flex: 1,
    minHeight: 48,
    borderRadius: raio.pilula,
    backgroundColor: brand.viseira,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  legenda: { position: 'absolute', left: 16, bottom: 36, flexDirection: 'row', gap: 8 },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brand.asfalto,
    borderRadius: raio.pilula,
    paddingHorizontal: 12,
    minHeight: 34,
  },
  ponto: { width: 12, height: 12, borderRadius: 6 },
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
  folha: {
    flex: 1,
    marginTop: -24,
    backgroundColor: brand.asfalto,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
  },
  alca: { width: 44, height: 5, borderRadius: 3, backgroundColor: tons.borda, alignSelf: 'center', marginVertical: 12 },
  folhaConteudo: { gap: 12 },
  folhaTopo: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconeAlerta: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: alerta.atencao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  via: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 20, lineHeight: 24 },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  barraRotulo: { width: 78 },
  barraTrilho: { flex: 1, height: 12, borderRadius: 6, backgroundColor: brand.viseira, overflow: 'hidden' },
  barra: { height: 12, borderRadius: 6 },
  barraNivel: { width: 84 },
  forte: { fontFamily: 'BricolageGrotesque_700Bold' },
});
