import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api';
import type { DetalheCelula } from '@/api/types';
import { MapaPontos as Mapa, tipoDoMapa } from '@/components/mapa/mapa-pontos';
import { ItemPonto } from '@/components/plano/item-ponto';
import { Aviso, Botao, Icone, Segmentado, Texto } from '@/components/ui';
import { FAIXAS, rotuloFaixa } from '@/domain/contexto';
import { acaoDoPonto, AVISO_HISTORICO, localDoPonto, motivoDoPonto, nivelDeRisco } from '@/domain/risco';
import { mensagemDeErro } from '@/lib/navegacao';
import { usePlano, type PontoDoPlano } from '@/servicos/plano';
import { usePosicao } from '@/servicos/posicao';
import { alerta, brand, raio, tons } from '@/theme';

/** Altura da pílula e do seletor por cima do mapa, e da legenda com a borda da folha embaixo. */
const FOLGA_TOPO = 72;
const FOLGA_BAIXO = 84;

/**
 * Tela 08 · Mapa de pontos críticos (RF08, RF09).
 * Google Maps no Android (Apple Maps no iOS) com os pontos do modelo de ML: cada círculo é a
 * célula de risco (~500 m) e o número é a posição no plano. A mesma informação está em lista,
 * que é a forma acessível. Tocar num ponto mostra o motivo e o gráfico de risco por horário.
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
        {tipoDoMapa === 'esquematico'
          ? 'Mapa esquemático, posições aproximadas.'
          : 'Cada círculo é uma área de cerca de 500 m, não um endereço exato.'}{' '}
        {AVISO_HISTORICO} Risco calculado pelo modelo do Garupa
        {detalhe?.versaoModelo ? ` (${detalhe.versaoModelo})` : ''} com dados do Infosiga e do INMET.
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
      <View style={{ height: alturaMapa }}>
        <Mapa
          pontos={pontos}
          focoId={selecionadoId}
          destaqueId={idSelecionado}
          posicao={posicao}
          onSelecionar={setSelecionadoId}
          largura={width}
          altura={alturaMapa}
          folgaTopo={insets.top + FOLGA_TOPO}
          folgaBaixo={FOLGA_BAIXO}
        />

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
  sobreposicao: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  pilula: {
    flex: 1,
    minHeight: 48,
    borderRadius: raio.pilula,
    backgroundColor: brand.viseira,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  legenda: { position: 'absolute', left: 16, bottom: 36, flexDirection: 'row', gap: 8, pointerEvents: 'none' },
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
