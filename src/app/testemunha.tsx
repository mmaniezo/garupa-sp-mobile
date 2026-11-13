import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { estaBloqueado } from 'tela-bloqueio';

import type { FichaMedica } from '@/api/types';
import { Botao, Icone, Texto } from '@/components/ui';
import { usePreferencias } from '@/dados-locais/preferencias';
import { fichaTemDados, lerFicha } from '@/dados-locais/seguro';
import { voltarOu } from '@/lib/navegacao';
import { useTema } from '@/lib/tema';
import { useSos } from '@/servicos/sos';
import { alerta, brand, raio, tons } from '@/theme';

const INSTRUCOES = ['Não tire o capacete', 'Não mova a pessoa', 'Sinalize a via e ligue 192'];

const TITULO = {
  queda: 'Esta pessoa sofreu uma queda de moto',
  mal_estar: 'Esta pessoa passou mal',
  agressao_assalto: 'Esta pessoa pediu socorro',
} as const;

/** O 192 nunca é chamado sozinho: abre a discagem e quem ajuda confirma (RB12). */
const ligar192 = () => void Linking.openURL('tel:192');

/**
 * Telas 17 e 18 · Testemunha (RF22, RB10, RB12).
 * Abre pela notificação de SOS ativo na tela de bloqueio, sem desbloquear (Android).
 * Mostra ficha médica, instruções curtas e o botão de ligar ao 192. Some quando o SOS
 * é cancelado ou encerrado.
 */
export default function Testemunha() {
  const sos = useSos();
  const prefs = usePreferencias();
  const insets = useSafeAreaInsets();
  const { c } = useTema();
  const [ficha, setFicha] = useState<FichaMedica | null>(null);
  const [bloqueado, setBloqueado] = useState(estaBloqueado());
  const [etapa, setEtapa] = useState<'chamada' | 'detalhes'>(estaBloqueado() ? 'chamada' : 'detalhes');

  useEffect(() => {
    void lerFicha().then(setFicha);
    const t = setInterval(() => setBloqueado(estaBloqueado()), 2000);
    return () => clearInterval(t);
  }, []);

  const ativo = sos?.situacao === 'ativo';

  if (!ativo) {
    return (
      <View style={[styles.raizEscura, { backgroundColor: c.fundo, paddingTop: insets.top + 32 }]}>
        <StatusBar style={c.barraStatus} />
        <Texto variante="titulo">Nenhum SOS ativo</Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          Esta tela só aparece enquanto há um pedido de socorro ativo.
        </Texto>
        {!bloqueado ? <Botao titulo="Voltar" variante="contorno" tamanho="padrao" onPress={() => voltarOu('/plano')} /> : null}
      </View>
    );
  }

  const hora = new Date(sos.payload.ocorridoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (etapa === 'chamada') {
    return (
      <View style={[styles.raizVermelha, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <StatusBar style="light" />
        <View style={styles.linhaTopo}>
          <View style={styles.chip}>
            <Icone nome="cadeado" tamanho={14} cor={brand.branco} espessura={2.4} />
            <Texto variante="rotulo" cor={brand.branco} style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: 14 }}>
              Celular bloqueado
            </Texto>
          </View>
          <Texto variante="rotulo" cor={brand.branco}>
            SOS ativo · {hora}
          </Texto>
        </View>
        <View style={{ gap: 10 }}>
          <Texto variante="hero" cor={brand.branco} accessibilityRole="header">
            Este motociclista precisa de ajuda
          </Texto>
          <Texto variante="corpo" cor={brand.branco} style={{ fontSize: 19 }}>
            Você não precisa da senha. Toque abaixo para ver como ajudar.
          </Texto>
        </View>
        <View style={{ gap: 8 }}>
          {INSTRUCOES.slice(0, 2).map((t, i) => (
            <View key={t} style={styles.instrucaoEscura}>
              <View style={styles.numeroBranco}>
                <Texto variante="rotulo" cor={tons.emergenciaProfunda} style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
                  {i + 1}
                </Texto>
              </View>
              <Texto variante="corpo" cor={brand.branco} style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
                {t}
              </Texto>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 'auto', gap: 10 }}>
          <Botao
            titulo="Ver ficha médica e como ajudar"
            variante="branco"
            tamanho="emergencia"
            onPress={() => setEtapa('detalhes')}
          />
          <Pressable onPress={ligar192} accessibilityRole="button" accessibilityLabel="Ligar 192" style={styles.ligarContorno}>
            <Icone nome="telefone" tamanho={24} cor={brand.branco} espessura={2.4} />
            <Texto variante="botaoGrande" cor={brand.branco}>
              Ligar 192
            </Texto>
          </Pressable>
        </View>
      </View>
    );
  }

  const temFicha = prefs.consentimentos.fichaMedica && fichaTemDados(ficha);
  const campo = (rotulo: string, valor?: string | null) => (
    <View style={{ gap: 2, width: '47%' }}>
      <Texto variante="legenda" cor={tons.textoSecundarioClaro} style={{ fontSize: 14 }}>
        {rotulo}
      </Texto>
      <Texto variante="corpo" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
        {valor?.trim() || 'Não informado'}
      </Texto>
    </View>
  );

  return (
    <View style={[styles.raizClara, { paddingTop: insets.top + 16 }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 16 }}>
        <View style={styles.seloSos}>
          <Texto variante="rotulo" cor={brand.branco} style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: 14 }}>
            SOS ativo · {hora}
          </Texto>
        </View>
        <View style={{ gap: 6 }}>
          <Texto variante="titulo" cor={brand.asfalto} accessibilityRole="header">
            {TITULO[sos.tipo]}
          </Texto>
          <Texto variante="corpoMenor" cor={tons.textoSecundarioClaro}>
            {sos.enviado ? 'O contato de emergência já foi avisado.' : 'O aviso ao contato sai assim que houver internet.'}
          </Texto>
        </View>
        <View style={{ gap: 8 }} accessibilityRole="list">
          {INSTRUCOES.map((t, i) => (
            <View key={t} style={styles.instrucaoClara}>
              <View style={styles.numeroVermelho}>
                <Texto variante="rotulo" cor={brand.branco} style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 17 }}>
                  {i + 1}
                </Texto>
              </View>
              <Texto variante="corpo" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
                {t}
              </Texto>
            </View>
          ))}
        </View>
        <View style={styles.ficha}>
          <View style={styles.fichaTopo}>
            <Texto variante="tituloSecao" cor={brand.asfalto} style={{ fontSize: 18 }}>
              Ficha médica
            </Texto>
            <Texto variante="legenda" cor={tons.textoSecundarioClaro} style={{ fontSize: 13 }}>
              dados fictícios
            </Texto>
          </View>
          {temFicha ? (
            <View style={styles.fichaGrade}>
              {campo('Tipo sanguíneo', ficha?.tipoSanguineo)}
              {campo('Alergias', ficha?.alergias)}
              {campo('Condições', ficha?.condicoes)}
              {campo('Medicamentos', ficha?.medicamentos)}
            </View>
          ) : (
            <Texto variante="corpoMenor" cor={brand.asfalto}>
              Ficha não informada.
            </Texto>
          )}
        </View>
      </ScrollView>
      <View style={[styles.rodapeClaro, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={ligar192}
          accessibilityRole="button"
          accessibilityLabel="Ligar 192, SAMU"
          style={({ pressed }) => [styles.ligar, pressed && { opacity: 0.9 }]}>
          <Icone nome="telefone" tamanho={28} cor={brand.branco} espessura={2.4} />
          <Texto variante="botaoGrande" cor={brand.branco} style={{ fontSize: 24 }}>
            Ligar 192 (SAMU)
          </Texto>
        </Pressable>
        <Texto variante="legenda" cor={tons.textoSecundarioClaro} centro style={{ fontSize: 14 }}>
          O celular abre a discagem; você confirma a ligação.
        </Texto>
        {!bloqueado ? (
          <Botao
            titulo="Fechar"
            variante="linkProfundo"
            tamanho="compacto"
            onPress={() => (router.canGoBack() ? router.back() : router.replace(`/sos/${sos.eventoId}`))}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raizEscura: { flex: 1, paddingHorizontal: 20, gap: 16 },
  raizVermelha: { flex: 1, backgroundColor: tons.emergenciaProfunda, paddingHorizontal: 20, gap: 20 },
  raizClara: { flex: 1, backgroundColor: brand.branco },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 32,
  },
  instrucaoEscura: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: raio.lg,
    padding: 14,
  },
  numeroBranco: { width: 30, height: 30, borderRadius: 15, backgroundColor: brand.branco, alignItems: 'center', justifyContent: 'center' },
  ligarContorno: {
    minHeight: 64,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: brand.branco,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloSos: { alignSelf: 'flex-start', backgroundColor: alerta.emergencia, borderRadius: 999, paddingHorizontal: 12, minHeight: 30, justifyContent: 'center' },
  instrucaoClara: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: tons.emergenciaSuave,
    borderRadius: raio.lg,
    padding: 14,
  },
  numeroVermelho: { width: 32, height: 32, borderRadius: 16, backgroundColor: alerta.emergencia, alignItems: 'center', justifyContent: 'center' },
  ficha: { borderWidth: 2, borderColor: tons.divisorClaro, borderRadius: raio.xxl, padding: 16, gap: 10 },
  fichaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fichaGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rodapeClaro: { paddingHorizontal: 20, gap: 10, paddingTop: 8 },
  ligar: {
    minHeight: 72,
    borderRadius: 999,
    backgroundColor: alerta.emergencia,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
