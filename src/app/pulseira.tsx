import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { api, mock } from '@/api';
import type { TipoAlertaVestivel, TipoEventoVestivel } from '@/api/types';
import { Aviso, Botao, BotaoIcone, Campo, Tela, Texto } from '@/components/ui';
import { usePreferencias } from '@/dados-locais/preferencias';
import { mensagemDeErro, voltarOu } from '@/lib/navegacao';
import { useTurno } from '@/servicos/turno';
import { avisarPulseira, desparearPulseira, parearPulseira } from '@/servicos/vestivel';
import { useSessao } from '@/state/sessao';
import { brand, raio, tons } from '@/theme';

type Luz = { tipo: TipoAlertaVestivel | null; titulo: string; padrao: string; cor: string; fixa?: boolean; contorno?: boolean };

/** Mesma linguagem do app e da pulseira (RF39, RB19): cor e padrão de piscada, nunca só cor. */
const LUZES: Luz[] = [
  { tipo: 'turno_ativo', titulo: 'Turno ativo', padrao: 'pulso a cada 10 s', cor: tons.seguroClaro },
  { tipo: 'ponto_critico', titulo: 'Ponto crítico', padrao: '3 piscadas + bipe', cor: '#F5A524' },
  { tipo: 'mensagem', titulo: 'Mensagem', padrao: '1 piscada lenta', cor: tons.informacaoLed },
  { tipo: 'contagem_queda', titulo: 'Contagem da queda', padrao: 'rápida + buzzer', cor: tons.emergenciaLed },
  { tipo: 'sos_enviado', titulo: 'SOS enviado', padrao: 'fixa + 2 bipes', cor: tons.emergenciaLed, fixa: true },
  { tipo: 'cancelado', titulo: 'Estou bem', padrao: 'fixa por 3 s', cor: tons.seguroClaro, fixa: true },
  { tipo: 'turno_encerrado', titulo: 'Turno encerrado ou pausado', padrao: '2 piscadas e apaga', cor: tons.seguroClaro, contorno: true },
  { tipo: null, titulo: 'Sem conexão', padrao: 'piscada lenta', cor: brand.branco },
];

/**
 * Tela 20 · Pulseira (RF39, RF41, RF28). Pareamento simulado pelo código do dispositivo
 * (o mesmo `dispositivoId` do firmware no Wokwi). Tocar numa luz manda esse alerta para testar.
 */
export default function Pulseira() {
  const prefs = usePreferencias();
  const sessao = useSessao();
  const turno = useTurno();
  const [codigo, setCodigo] = useState('pulseira-demo-01');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const pareada = prefs.pulseira;

  async function parear() {
    setErro(null);
    setEnviando(true);
    try {
      await parearPulseira(codigo.trim());
      setAviso('Pulseira pareada. Os alertas do app vão acender a luz dela.');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível parear. Confira o código.'));
    } finally {
      setEnviando(false);
    }
  }

  function desparear() {
    Alert.alert('Desparear a pulseira?', 'O app para de mandar os alertas para ela.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desparear', style: 'destructive', onPress: () => void desparearPulseira().then(() => setAviso(null)) },
    ]);
  }

  async function testar(l: Luz) {
    if (!l.tipo || !pareada) return;
    await avisarPulseira(l.tipo);
    setAviso(`Enviado: ${l.titulo.toLowerCase()}. A luz acende em até 3 s.`);
  }

  /** Faz o papel da pulseira: com a API real, manda o evento para POST /eventos-vestivel. */
  async function simular(tipo: TipoEventoVestivel) {
    if (!sessao.usuarioId || !pareada) return;
    setErro(null);
    try {
      if (mock) mock.simularEventoVestivel(sessao.usuarioId, tipo);
      else await api.enviarEventoVestivel({ dispositivoId: pareada.dispositivoId, tipo, ocorridoEm: new Date().toISOString() });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível simular o evento.'));
      return;
    }
    setAviso(
      tipo === 'cancelar' && turno.situacao === 'inativo'
        ? 'Evento simulado. "Cancelar" só tem efeito com a contagem ou um SOS em andamento.'
        : 'Evento simulado: o app lê em até 2 s.',
    );
  }

  return (
    <Tela gap={16}>
      <View style={styles.topo}>
        <BotaoIcone icone="voltar" rotulo="Voltar" onPress={() => voltarOu('/perfil')} />
        <Texto variante="titulo" accessibilityRole="header" style={{ fontSize: 28 }}>
          Pulseira
        </Texto>
      </View>

      {pareada ? (
        <View style={styles.dispositivo}>
          <View style={styles.icone} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.corpo}>
              <View style={styles.led} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="corpo" style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
              Pulseira Garupa
            </Texto>
            <Texto variante="legenda" cor="textoSecundario" style={{ fontSize: 14 }}>
              Pareada · {pareada.dispositivoId} · protótipo simulado
            </Texto>
          </View>
          <Botao
            titulo="Testar luz"
            variante="contorno"
            tamanho="compacto"
            larguraTotal={false}
            style={{ borderColor: tons.borda }}
            onPress={() => void testar(LUZES[0])}
          />
        </View>
      ) : (
        <View style={styles.parear}>
          <Texto variante="corpoMenor" cor="textoSecundario">
            A pulseira é opcional: confirma a queda, cancela a contagem sem tocar no celular e repete os alertas
            do app com luz. Sem ela, o app funciona igual.
          </Texto>
          <Campo
            rotulo="Código da pulseira"
            aparencia="interno"
            value={codigo}
            onChangeText={setCodigo}
            autoCapitalize="none"
            autoCorrect={false}
            dica="O mesmo código do firmware no Wokwi."
            erro={erro}
          />
          <Botao titulo="Parear (simulado)" tamanho="padrao" onPress={parear} carregando={enviando} />
        </View>
      )}

      {aviso ? <Aviso tom="sucesso" texto={aviso} anunciar /> : null}

      <View style={{ gap: 4 }}>
        <Texto variante="tituloSecao" accessibilityRole="header">
          O que cada luz quer dizer
        </Texto>
        <Texto variante="legenda" cor="textoSecundario">
          A cor nunca vem sozinha: cada aviso pisca de um jeito.{pareada ? ' Toque numa luz para testar.' : ''}
        </Texto>
      </View>
      <View style={styles.lista}>
        {LUZES.map((l, i) => (
          <Pressable
            key={l.titulo}
            disabled={!l.tipo || !pareada}
            onPress={() => void testar(l)}
            accessibilityRole={l.tipo && pareada ? 'button' : undefined}
            accessibilityLabel={`${l.titulo}: ${l.padrao}`}
            style={[styles.luz, i > 0 && styles.divisor]}>
            <View
              style={[
                styles.cor,
                l.contorno ? { borderWidth: 3, borderColor: l.cor } : { backgroundColor: l.cor },
                l.fixa && { outlineWidth: 3, outlineColor: l.cor, outlineOffset: 2, outlineStyle: 'solid' },
              ]}
            />
            <Texto variante="corpoMenor" style={{ flex: 1, fontFamily: 'BricolageGrotesque_600SemiBold' }}>
              {l.titulo}
            </Texto>
            <Texto variante="legenda" cor="textoSecundario" style={{ fontSize: 14 }}>
              {l.padrao}
            </Texto>
          </Pressable>
        ))}
      </View>

      <View style={styles.dica}>
        <Texto variante="corpoMenor" style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
          Na pulseira, sem tocar no celular
        </Texto>
        <Texto variante="legenda" cor="textoSecundario">
          Toque curto cancela a contagem. Segure o botão por 3 s para pedir SOS.
        </Texto>
      </View>

      {pareada && (mock || __DEV__) ? (
        <View style={{ gap: 8 }}>
          <Texto variante="overline" cor="textoSecundario">
            Demonstração sem o Wokwi
          </Texto>
          <View style={styles.linha}>
            <Botao titulo="Impacto" variante="neutro" tamanho="compacto" larguraTotal={false} onPress={() => void simular('impacto')} />
            <Botao titulo="SOS" variante="neutro" tamanho="compacto" larguraTotal={false} onPress={() => void simular('sos')} />
            <Botao titulo="Cancelar" variante="neutro" tamanho="compacto" larguraTotal={false} onPress={() => void simular('cancelar')} />
          </View>
        </View>
      ) : null}

      {pareada ? <Botao titulo="Desparear pulseira" variante="perigoTexto" tamanho="padrao" onPress={desparear} /> : null}
    </Tela>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dispositivo: {
    backgroundColor: tons.superficie,
    borderRadius: raio.xxl,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  icone: { width: 64, height: 64, borderRadius: 20, backgroundColor: brand.viseira, alignItems: 'center', justifyContent: 'center' },
  corpo: {
    width: 30,
    height: 44,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: tons.neutroBarra,
    alignItems: 'center',
    justifyContent: 'center',
  },
  led: { width: 12, height: 12, borderRadius: 6, backgroundColor: tons.seguroClaro, boxShadow: '0 0 10px #3CCB7F' },
  parear: { backgroundColor: tons.superficie, borderRadius: raio.xxl, padding: 16, gap: 12 },
  lista: { backgroundColor: tons.superficie, borderRadius: raio.xxl, overflow: 'hidden' },
  luz: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 48 },
  divisor: { borderTopWidth: 1, borderTopColor: brand.viseira },
  cor: { width: 16, height: 16, borderRadius: 8 },
  dica: { backgroundColor: tons.superficie, borderRadius: raio.xl, padding: 16, gap: 4 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
