import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { SosManual } from '@/components/sos/sos-manual';
import { Aviso, Botao, BotaoVoltar, Entrada, Icone, Ondas, Tela, Texto } from '@/components/ui';
import { config } from '@/config';
import { usePreferencias } from '@/dados-locais/preferencias';
import { usePulso } from '@/lib/movimento';
import { voltarOu } from '@/lib/navegacao';
import { useEstilos, useTema } from '@/lib/tema';
import { simularQueda } from '@/servicos/queda';
import { finalizarTurno, pausarTurno, turnoSoComAppAberto, useTurno } from '@/servicos/turno';
import { alerta, brand, raio, tons, type NomeTema, type Paleta } from '@/theme';

function duracao(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function Indicador({ titulo, ok, texto }: { titulo: string; ok: boolean; texto: string }) {
  const styles = useEstilos(criarEstilos);
  const { c } = useTema();
  // Ligado: a luz respira, como um LED. Com problema, fica parada (o texto diz o que é).
  const pulso = usePulso(1500, ok);
  const estiloLuz = useAnimatedStyle(() => ({ opacity: 1 - 0.55 * pulso.get() }));
  return (
    <View style={styles.indicador} accessible accessibilityLabel={`${titulo}: ${texto}`}>
      <Animated.View style={[styles.bolinha, { backgroundColor: ok ? c.seguroTexto : tons.emergenciaLed }, estiloLuz]} />
      <Texto variante="rotulo" style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
        {titulo}
      </Texto>
      <Texto variante="legenda" cor="textoSecundario" style={{ fontSize: 14 }}>
        {texto}
      </Texto>
    </View>
  );
}

/**
 * Tela 10 · Turno ativo (RF13). Depois de iniciado, a pessoa abre o app de entregas e o Garupa
 * segue em segundo plano, com a notificação fixa (Pausar e Finalizar). O "Voltar" do topo leva
 * ao plano sem parar o turno (não depende do botão de voltar do celular).
 */
export default function TurnoAtivo() {
  const turno = useTurno();
  const prefs = usePreferencias();
  const { c } = useTema();
  const styles = useEstilos(criarEstilos);
  const [agora, setAgora] = useState(() => Date.now());
  const [sosAberto, setSosAberto] = useState(false);
  const [sosContando, setSosContando] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (turno.situacao === 'pausado') return <Redirect href="/turno/pausado" />;
  if (turno.situacao === 'inativo') return <Redirect href="/plano" />;

  const gpsOk = !!turno.ultimoGpsEm && agora - turno.ultimoGpsEm < 30_000;
  const sensorOk = !!turno.ultimaLeituraSensorEm && agora - turno.ultimaLeituraSensorEm < 5_000;
  const iniciou = !!turno.iniciadoEm && agora - turno.iniciadoEm < 20_000;

  function finalizar() {
    Alert.alert('Finalizar o turno?', 'O monitoramento para e não há alerta nem detecção de queda até o próximo turno.', [
      { text: 'Continuar no turno', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: async () => {
          await finalizarTurno();
          router.replace('/plano');
        },
      },
    ]);
  }

  return (
    <Tela
      aurora={alerta.seguro}
      rodape={
        <View style={styles.acoes}>
          <View style={{ flex: 1 }}>
            <Botao titulo="Pausar" variante="contorno" tamanho="principal" onPress={() => void pausarTurno('manual')} />
          </View>
          <View style={{ flex: 1 }}>
            <Botao titulo="Finalizar" variante="claro" tamanho="principal" onPress={finalizar} />
          </View>
        </View>
      }>
      <Entrada ordem={0} style={styles.topo}>
        <BotaoVoltar dica="Volta para o plano. O turno continua ativo." onPress={() => voltarOu('/plano')} />
        <Botao
          titulo="SOS"
          variante="contorno"
          tamanho="compacto"
          larguraTotal={false}
          style={{ borderColor: alerta.emergencia }}
          dica="Pedir socorro agora, escolhendo o tipo"
          onPress={() => setSosAberto(true)}
        />
      </Entrada>

      <Entrada ordem={1} distancia={24} style={styles.centro}>
        <View style={styles.anelArea}>
          {/* Ondas saindo do anel: o turno está ligado e de olho. */}
          <Ondas cor={alerta.seguro} tamanho={220} quantidade={2} duracao={3400} ate={1.3} />
          <View style={styles.anel} accessible accessibilityLabel={`Turno ativo há ${duracao(agora - (turno.iniciadoEm ?? agora))}`}>
            <Icone nome="escudoOk" tamanho={40} cor={c.seguroTexto} />
            <Texto variante="alerta" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>
              Turno ativo
            </Texto>
            <Texto variante="numero">{duracao(agora - (turno.iniciadoEm ?? agora))}</Texto>
          </View>
        </View>
        <Texto variante="corpoMenor" cor="textoSecundario" centro style={{ maxWidth: 300 }}>
          Pode abrir seu app de entregas. A gente segue de olho em segundo plano.
        </Texto>
      </Entrada>

      {turnoSoComAppAberto ? (
        <Aviso
          tom="info"
          texto="No Expo Go, o turno só monitora com o app aberto. Para seguir com outro app na frente e a tela bloqueada, use o build de desenvolvimento."
        />
      ) : null}

      {!gpsOk && !iniciou ? (
        <Aviso tom="erro" texto="Sem sinal de GPS: sem alerta de ponto crítico até o sinal voltar." anunciar />
      ) : null}

      <Entrada ordem={2} style={styles.indicadores}>
        <Indicador titulo="GPS" ok={gpsOk || iniciou} texto={gpsOk ? 'Ativo' : iniciou ? 'Ligando' : 'Sem sinal'} />
        <Indicador titulo="Sensor" ok={sensorOk || iniciou} texto={sensorOk ? 'Detectando queda' : iniciou ? 'Ligando' : 'Sem leitura'} />
        <Indicador titulo="Pulseira" ok={!!prefs.pulseira} texto={prefs.pulseira ? 'Pareada' : 'Não pareada'} />
      </Entrada>

      <Entrada ordem={3} style={{ gap: 8 }}>
        <Texto variante="overline" cor="textoSecundario">
          Na barra de notificações
        </Texto>
        <View style={styles.notificacao}>
          <View style={styles.notifIcone}>
            <Icone nome="escudo" tamanho={20} cor={brand.asfalto} espessura={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="rotulo" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
              Garupa SP · turno ativo
            </Texto>
            <Texto variante="legenda" cor={tons.textoSecundarioClaro} style={{ fontSize: 14 }}>
              {turno.pontosProximos > 0 ? `${turno.pontosProximos} pontos críticos na sua área agora` : 'Monitorando em segundo plano'}
            </Texto>
          </View>
          <Texto variante="rotulo" cor={brand.tealProfundo} style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
            Pausar
          </Texto>
        </View>
      </Entrada>

      {config.demo ? (
        <View style={{ gap: 8 }}>
          <Texto variante="overline" cor="textoSecundario">
            Demonstração
          </Texto>
          <Botao titulo="Simular queda" variante="neutro" tamanho="padrao" onPress={simularQueda} />
          <Botao
            titulo="Diagnóstico do segundo plano"
            variante="link"
            tamanho="compacto"
            onPress={() => router.push('/diagnostico')}
          />
        </View>
      ) : null}

      <Modal visible={sosAberto} transparent animationType="slide" onRequestClose={() => setSosAberto(false)}>
        <View style={styles.fundoModal}>
          <View style={styles.folha}>
            <Texto variante="titulo" accessibilityRole="header">
              Precisa de ajuda?
            </Texto>
            <Texto variante="corpoMenor" cor="textoSecundario">
              Escolha o que aconteceu. Seus contatos recebem um SMS com a sua localização.
            </Texto>
            <SosManual
              aoMudarContagem={setSosContando}
              onEnviado={(id) => {
                setSosAberto(false);
                router.push(`/sos/${id}`);
              }}
            />
            {/* Na contagem, ficam só Desfazer e Enviar agora (o voltar do celular também cancela). */}
            {!sosContando ? <Botao titulo="Fechar" variante="fantasma" tamanho="padrao" onPress={() => setSosAberto(false)} /> : null}
          </View>
        </View>
      </Modal>
    </Tela>
  );
}

const criarEstilos = (c: Paleta, nome: NomeTema) =>
  StyleSheet.create({
    topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    centro: { alignItems: 'center', gap: 22, paddingTop: 34, paddingBottom: 6 },
    anelArea: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
    anel: {
      width: 220,
      height: 220,
      borderRadius: 110,
      borderWidth: 3,
      borderColor: alerta.seguro,
      backgroundColor: nome === 'claro' ? 'rgba(21,128,61,0.07)' : 'rgba(21,128,61,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      boxShadow: '0 0 40px rgba(21,128,61,0.28)',
    },
    indicadores: { flexDirection: 'row', gap: 8 },
    indicador: { flex: 1, backgroundColor: c.superficie, borderRadius: raio.lg, padding: 12, gap: 6, borderWidth: 1, borderColor: c.fio },
    bolinha: { width: 10, height: 10, borderRadius: 5 },
    notificacao: {
      backgroundColor: nome === 'claro' ? brand.branco : brand.neblina,
      borderWidth: 1,
      borderColor: nome === 'claro' ? c.divisor : 'transparent',
      borderRadius: raio.xl,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    notifIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: brand.teal, alignItems: 'center', justifyContent: 'center' },
    acoes: { flexDirection: 'row', gap: 10 },
    fundoModal: { flex: 1, backgroundColor: c.veu, justifyContent: 'flex-end' },
    folha: {
      backgroundColor: c.fundo,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 40,
      gap: 14,
    },
  });
