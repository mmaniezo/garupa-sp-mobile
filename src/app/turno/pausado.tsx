import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Botao, Icone, Tela, Texto } from '@/components/ui';
import { usePreferencias } from '@/dados-locais/preferencias';
import { regras } from '@/config';
import { finalizarTurno, retomarTurno, useTurno } from '@/servicos/turno';
import { brand, raio, tons } from '@/theme';

/**
 * Tela 13 · Turno pausado (RB18): 30 minutos parado pausa o turno, com aviso 5 minutos antes,
 * e o monitoramento volta sozinho quando a moto andar. A pausa manual espera "Retomar".
 */
export default function TurnoPausado() {
  const turno = useTurno();
  const prefs = usePreferencias();

  if (turno.situacao === 'ativo') return <Redirect href="/turno/ativo" />;
  if (turno.situacao === 'inativo') return <Redirect href="/plano" />;

  const automatica = turno.motivoPausa === 'inatividade';

  return (
    <Tela
      rodape={
        <>
          <Botao titulo="Retomar agora" onPress={async () => {
            await retomarTurno();
            router.replace('/turno/ativo');
          }} />
          <Botao
            titulo="Finalizar turno"
            variante="contorno"
            tamanho="padrao"
            onPress={async () => {
              await finalizarTurno();
              router.replace('/plano');
            }}
          />
        </>
      }>
      {automatica ? (
        <View style={{ gap: 8 }}>
          <Texto variante="overline" cor="textoSecundario">
            Antes, na barra de notificações
          </Texto>
          <View style={styles.notificacao}>
            <View style={styles.notifIcone}>
              <Icone nome="relogio" tamanho={20} cor={brand.asfalto} espessura={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Texto variante="rotulo" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
                Parado há {regras.pausaInatividadeMinutos - regras.avisoAntesDaPausaMinutos} min
              </Texto>
              <Texto variante="legenda" cor={tons.textoSecundarioClaro} style={{ fontSize: 14 }}>
                Em {regras.avisoAntesDaPausaMinutos} min o turno pausa. Volta quando você andar.
              </Texto>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.centro}>
        <View style={styles.anel} accessible accessibilityLabel="Turno pausado">
          <Icone nome="pausa" tamanho={40} cor={tons.textoSecundario} />
          <Texto variante="alerta" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 26 }}>
            Turno pausado
          </Texto>
          <Texto variante="legenda" cor="textoSecundario">
            {automatica ? `${regras.pausaInatividadeMinutos} min sem movimento` : 'Pausado por você'}
          </Texto>
        </View>
        <Texto variante="corpoMenor" cor="textoSecundario" centro style={{ maxWidth: 310 }}>
          {automatica
            ? 'Esperando pedido? Tudo certo. O monitoramento volta sozinho quando a moto andar.'
            : 'Sem alerta e sem detecção de queda até você retomar.'}
        </Texto>
      </View>

      {prefs.pulseira ? (
        <View style={styles.pulseira}>
          <View style={styles.led} />
          <Texto variante="legenda" cor="textoSecundario" style={{ flex: 1 }}>
            Pulseira: verde, duas piscadas e apaga (turno encerrado ou pausado).
          </Texto>
        </View>
      ) : null}
    </Tela>
  );
}

const styles = StyleSheet.create({
  notificacao: {
    backgroundColor: brand.neblina,
    borderRadius: raio.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  notifIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: brand.teal, alignItems: 'center', justifyContent: 'center' },
  centro: { alignItems: 'center', gap: 14, paddingTop: 18 },
  anel: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: tons.neutroBarra,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pulseira: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: tons.superficie, borderRadius: raio.xl, padding: 16 },
  led: { width: 14, height: 14, borderRadius: 7, backgroundColor: tons.seguroClaro },
});
