import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';

import { api, mock } from '@/api';
import { MapaPosicao } from '@/components/mapa/mapa-pontos';
import { Aviso, Botao, Icone, Tela, Texto } from '@/components/ui';
import { lerSos, type RegistroSos } from '@/dados-locais/repositorios';
import { lerContatos } from '@/dados-locais/seguro';
import { linkGoogleMaps } from '@/domain/sms';
import { useEstilos } from '@/lib/tema';
import { reiniciarDetector } from '@/servicos/queda';
import { abrirSmsDoSos, carregarEstadoSms, useEstadosSms, type EstadoSms } from '@/servicos/sms';
import { cancelarSos, encerrarSos, useSos } from '@/servicos/sos';
import { useSessao } from '@/state/sessao';
import { alerta, brand, raio, type Paleta } from '@/theme';

const ROTULO_TIPO = { queda: 'queda detectada', mal_estar: 'mal-estar', agressao_assalto: 'agressão ou assalto' } as const;

function Passo({ feito, texto }: { feito: boolean; texto: string }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.passo} accessible accessibilityLabel={`${texto}: ${feito ? 'feito' : 'aguardando'}`}>
      {feito ? (
        <View style={[styles.marca, { backgroundColor: alerta.seguro }]}>
          <Icone nome="check" tamanho={16} cor={brand.branco} espessura={3} />
        </View>
      ) : (
        <View style={[styles.marca, styles.marcaVazia]} />
      )}
      <Texto variante="corpoMenor" style={{ flex: 1, fontSize: 17 }}>
        {texto}
      </Texto>
    </View>
  );
}

/** O que a tela diz sobre o SMS: só "recebeu" quando o app mandou de verdade. */
function textoDoSms(estado: EstadoSms | null | undefined, contato: string | null): { feito: boolean; texto: string } {
  const quem = contato ?? 'seu contato';
  switch (estado?.situacao) {
    case 'enviado':
      return { feito: true, texto: `SMS com a sua localização enviado para ${estado.nomes.join(', ') || quem}` };
    case 'aberto':
      return { feito: false, texto: `SMS aberto no app de mensagens: confira se foi enviado para ${quem}` };
    case 'sem_contato':
      return { feito: false, texto: 'Nenhum contato de emergência com telefone válido para o SMS' };
    case 'pendente':
      return { feito: false, texto: `Falta avisar ${quem} por SMS` };
    default:
      return { feito: false, texto: `Preparando o SMS para ${quem}` };
  }
}

/**
 * Tela 16 · SOS enviado (RF20, RF21, RF23, RF24).
 * Mostra o que já aconteceu, o SMS que o contato recebe (com a localização no Google Maps)
 * e as ações: "Estou bem" (cancelar), "Já fui atendido" (encerrar) e a tela para quem ajudar.
 */
export default function SosEnviado() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const atual = useSos();
  const sessao = useSessao();
  const estadosSms = useEstadosSms();
  const styles = useEstilos(criarEstilos);
  const [registro, setRegistro] = useState<RegistroSos | null>(null);
  const [contato, setContato] = useState<string | null>(null);
  const [agindo, setAgindo] = useState<'cancelar' | 'encerrar' | 'sms' | null>(null);

  const sos = atual?.eventoId === eventoId ? atual : registro;
  // No mock o link de acompanhamento não abre; com a API real, ele vai junto do mapa.
  const link = sos?.token && !mock ? api.urlAcompanhamento(sos.token) : null;
  const estadoSms = estadosSms[eventoId];

  useEffect(() => {
    if (atual?.eventoId !== eventoId) void lerSos(eventoId).then(setRegistro);
    void lerContatos().then((c) => setContato(c[0]?.nome ?? null));
    void carregarEstadoSms(eventoId);
  }, [eventoId, atual?.eventoId]);

  if (!sos) {
    return (
      <Tela rodape={<Botao titulo="Voltar ao plano" onPress={() => router.replace('/plano')} />}>
        <Aviso tom="neutro" texto="Nenhum SOS com esse código neste aparelho." />
      </Tela>
    );
  }

  const ativo = sos.situacao === 'ativo';
  const hora = new Date(sos.payload.ocorridoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const titulo = !ativo
    ? sos.situacao === 'cancelado'
      ? 'SOS cancelado'
      : 'SOS encerrado'
    : sos.enviado
      ? 'SOS enviado'
      : 'SOS guardado';
  const { lat, lon } = sos.payload;
  const mapa = lat !== null && lon !== null ? linkGoogleMaps(lat, lon) : null;
  const sms = textoDoSms(estadoSms, contato);
  const podeMandarSms = ativo && estadoSms?.situacao !== 'enviado' && estadoSms?.situacao !== 'sem_contato';

  const idDoSos = sos.eventoId;
  const dadosDoSos = { tipo: sos.tipo, ocorridoEm: sos.payload.ocorridoEm, lat, lon };

  async function agir(acao: 'cancelar' | 'encerrar') {
    setAgindo(acao);
    await (acao === 'cancelar' ? cancelarSos(idDoSos) : encerrarSos(idDoSos));
    reiniciarDetector();
    setAgindo(null);
  }

  async function mandarSms() {
    setAgindo('sms');
    await abrirSmsDoSos(idDoSos, dadosDoSos).catch(() => undefined);
    setAgindo(null);
  }

  function compartilhar() {
    const partes = [`Pedi socorro pelo Garupa SP às ${hora}.`];
    if (mapa) partes.push(`Onde estou: ${mapa}`);
    if (link) partes.push(`Acompanhe: ${link}`);
    void Share.share({ message: partes.join(' ') });
  }

  return (
    <Tela
      gap={16}
      rodape={
        ativo ? (
          <>
            <Botao
              titulo="Estou bem, cancelar SOS"
              variante="seguro"
              carregando={agindo === 'cancelar'}
              onPress={() => void agir('cancelar')}
            />
            <Botao
              titulo="Já fui atendido, encerrar SOS"
              variante="neutro"
              tamanho="padrao"
              carregando={agindo === 'encerrar'}
              onPress={() => void agir('encerrar')}
            />
            <Botao
              titulo="Mostrar tela para quem ajudar"
              variante="contorno"
              tamanho="padrao"
              onPress={() => router.push('/testemunha')}
            />
            <Texto variante="legenda" cor="textoSecundario" centro style={{ fontSize: 14 }}>
              O SMS sai mesmo sem internet. O registro na API sai quando a conexão voltar.
            </Texto>
          </>
        ) : (
          <Botao titulo="Voltar ao plano" onPress={() => router.replace('/plano')} />
        )
      }>
      <View
        style={[styles.cabecalho, { backgroundColor: ativo ? alerta.emergencia : styles.cores.cabecalhoInativo }]}
        accessibilityRole="header"
        accessibilityLiveRegion="polite">
        <View style={styles.selo}>
          <Texto variante="rotulo" cor={ativo ? alerta.emergencia : brand.asfalto} style={styles.seloTexto}>
            SOS
          </Texto>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto
            variante="alerta"
            cor={ativo ? brand.branco : 'texto'}
            style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, lineHeight: 26 }}>
            {titulo}
          </Texto>
          <Texto variante="legenda" cor={ativo ? brand.branco : 'texto'}>
            Às {hora} · {ROTULO_TIPO[sos.tipo]}
            {sos.origem === 'vestivel' ? ' pela pulseira' : ''}
          </Texto>
        </View>
      </View>

      {!ativo ? (
        <Aviso
          tom="sucesso"
          texto={
            sos.situacao === 'cancelado'
              ? 'Que bom que você está bem. Quem recebeu o SMS automático recebe outro avisando que foi cancelado.'
              : 'SOS encerrado. Quem recebeu o SMS automático recebe outro avisando que você já foi atendido.'
          }
        />
      ) : null}

      <View style={{ gap: 12 }} accessibilityRole="list">
        <Passo feito={lat !== null} texto={lat !== null ? 'Posição e horário registrados' : 'Buscando a sua posição'} />
        <Passo feito={sms.feito} texto={sms.texto} />
        <Passo
          feito={sos.enviado}
          texto={sos.enviado ? 'SOS registrado na API' : 'O registro na API sai quando a internet voltar'}
        />
      </View>

      {podeMandarSms ? (
        <Botao
          titulo={`Enviar SMS para ${contato ?? 'meu contato'}`}
          variante="perigo"
          tamanho="padrao"
          icone="telefone"
          carregando={agindo === 'sms'}
          dica="Abre o app de mensagens com a sua localização pronta para enviar"
          onPress={() => void mandarSms()}
        />
      ) : null}

      <View style={{ gap: 8 }}>
        <Texto variante="overline" cor="textoSecundario">
          O que {contato ?? 'seu contato'} recebe
        </Texto>
        <View style={styles.balao}>
          <Texto variante="legenda" style={{ fontSize: 15 }}>
            SOS Garupa SP: {sessao.nome?.split(' ')[0] ?? 'você'} pediu socorro às {hora} ({ROTULO_TIPO[sos.tipo]}).
            {mapa ? ' Toque no link para ver no Google Maps.' : ' A localização entra quando o GPS responder.'}
          </Texto>
        </View>
        {lat !== null && lon !== null ? (
          <MapaPosicao lat={lat} lon={lon} altura={140} rotulo="Mapa com a posição registrada no SOS" />
        ) : null}
        {mapa ? (
          <Botao
            titulo="Abrir no Google Maps"
            variante="contorno"
            tamanho="padrao"
            icone="mapa"
            dica="Mostra no Google Maps a posição enviada aos seus contatos"
            onPress={() => void Linking.openURL(mapa)}
          />
        ) : null}
        {ativo ? (
          <Botao
            titulo="Compartilhar localização"
            variante="link"
            tamanho="compacto"
            dica="Envia a sua localização para quem você escolher"
            onPress={compartilhar}
          />
        ) : null}
      </View>
    </Tela>
  );
}

const criarEstilos = (c: Paleta) => ({
  cores: { cabecalhoInativo: c.superficieElevada },
  ...StyleSheet.create({
    cabecalho: { borderRadius: raio.cartao, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
    selo: { width: 52, height: 52, borderRadius: 26, backgroundColor: brand.branco, alignItems: 'center', justifyContent: 'center' },
    seloTexto: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 17 },
    passo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
    marca: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    marcaVazia: { borderWidth: 3, borderColor: brand.teal },
    balao: { backgroundColor: c.superficie, borderRadius: raio.xl, borderTopLeftRadius: 6, padding: 14 },
  }),
});
