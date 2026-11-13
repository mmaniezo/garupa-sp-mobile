import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso, Botao, CabecalhoPasso, Tela, Texto } from '@/components/ui';
import { voltarOu } from '@/lib/navegacao';
import { useEstilos } from '@/lib/tema';
import { simularQueda } from '@/servicos/queda';
import { useTurno } from '@/servicos/turno';
import { raio, type Paleta } from '@/theme';

const DEZ_MIN = 10 * 60_000;

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.numero} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Texto variante="legenda" cor="textoSecundario" style={{ fontSize: 14 }}>
        {rotulo}
      </Texto>
      <Texto variante="alerta" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontVariant: ['tabular-nums'] }}>
        {valor}
      </Texto>
    </View>
  );
}

/**
 * Teste do segundo plano (spike do primeiro dia, RT20, RNF24).
 * Com outro app na frente e a tela bloqueada por 10 minutos, o acelerômetro precisa continuar
 * entregando leituras para a detecção de queda funcionar. Esta tela mede isso no aparelho.
 */
export default function Diagnostico() {
  const turno = useTurno();
  const styles = useEstilos(criarEstilos);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = turno.diagnostico;
  const bg = d.tempoEmSegundoPlanoMs + (d.segundoPlanoDesde ? agora - d.segundoPlanoDesde : 0);
  const minutos = (ms: number) => `${Math.floor(ms / 60_000)} min ${Math.floor((ms % 60_000) / 1000)} s`;

  const testou = bg >= DEZ_MIN;
  const sensorOk = d.leiturasSensorEmSegundoPlano > 0;
  const semBuracos = d.maiorIntervaloSensorMs < 5_000;
  const resultado = !testou
    ? null
    : sensorOk && semBuracos
      ? { tom: 'sucesso' as const, texto: 'Passou: o sensor entregou leituras em segundo plano, sem buracos longos.' }
      : {
          tom: 'erro' as const,
          texto:
            'Não passou: o sensor parou em segundo plano. Plano de saída: (1) módulo nativo que lê o sensor dentro do serviço em primeiro plano; (2) demo só no Android; (3) demo com o app na frente, dito no vídeo.',
        };

  return (
    <Tela gap={16}>
      <CabecalhoPasso rotulo="Diagnóstico do segundo plano" onVoltar={() => voltarOu('/perfil')} />
      <Texto variante="titulo" accessibilityRole="header">
        O sensor funciona com a tela bloqueada?
      </Texto>
      <View style={styles.passos}>
        {[
          'Inicie o turno (precisa de localização o tempo todo).',
          'Abra um app de mapa ou de entregas.',
          'Bloqueie a tela por pelo menos 10 minutos.',
          'Volte aqui e veja o resultado.',
        ].map((p, i) => (
          <Texto key={p} variante="corpoMenor">
            {i + 1}. {p}
          </Texto>
        ))}
      </View>

      {resultado ? <Aviso tom={resultado.tom} texto={resultado.texto} anunciar /> : null}

      <View style={styles.grade}>
        <Numero rotulo="Turno" valor={{ inativo: 'Desligado', ativo: 'Ativo', pausado: 'Pausado' }[turno.situacao]} />
        <Numero rotulo="Tempo em segundo plano" valor={minutos(bg)} />
        <Numero rotulo="Leituras do sensor" valor={String(d.leiturasSensor)} />
        <Numero rotulo="…em segundo plano" valor={String(d.leiturasSensorEmSegundoPlano)} />
        <Numero rotulo="Maior intervalo sem leitura" valor={`${(d.maiorIntervaloSensorMs / 1000).toFixed(1)} s`} />
        <Numero rotulo="Leituras do GPS (2º plano)" valor={`${d.leiturasGps} (${d.leiturasGpsEmSegundoPlano})`} />
      </View>

      <Texto variante="legenda" cor="textoSecundario">
        Os números zeram a cada turno. Registre o resultado e o modelo do aparelho no README (RNF24, RNF25).
      </Texto>

      {turno.situacao === 'inativo' ? (
        <Botao titulo="Iniciar turno" tamanho="padrao" onPress={() => router.push('/turno/antes-de-sair')} />
      ) : (
        <Botao titulo="Simular queda" variante="neutro" tamanho="padrao" onPress={simularQueda} />
      )}
    </Tela>
  );
}

const criarEstilos = (c: Paleta) =>
  StyleSheet.create({
    passos: { backgroundColor: c.superficie, borderRadius: raio.xl, padding: 16, gap: 6 },
    grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    numero: { width: '48%', flexGrow: 1, backgroundColor: c.superficie, borderRadius: raio.lg, padding: 12, gap: 4 },
  });
