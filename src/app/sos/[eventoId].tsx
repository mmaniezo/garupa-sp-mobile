import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Aviso, Botao, Icone, Tela, Texto } from '@/components/ui';
import { lerSos, type RegistroSos } from '@/dados-locais/repositorios';
import { lerContatos } from '@/dados-locais/seguro';
import { reiniciarDetector } from '@/servicos/queda';
import { cancelarSos, encerrarSos, useSos } from '@/servicos/sos';
import { useSessao } from '@/state/sessao';
import { alerta, brand, raio, tons } from '@/theme';
import { api } from '@/api';

const ROTULO_TIPO = { queda: 'queda detectada', mal_estar: 'mal-estar', agressao_assalto: 'agressão ou assalto' } as const;

function Passo({ feito, texto }: { feito: boolean; texto: string }) {
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

/**
 * Tela 16 · SOS enviado (RF20, RF21, RF23, RF24).
 * Mostra o que já aconteceu, o que o contato vê no navegador (sem a ficha médica) e as ações:
 * "Estou bem" (cancelar), "Já fui atendido" (encerrar) e a tela para quem ajudar.
 */
export default function SosEnviado() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const atual = useSos();
  const sessao = useSessao();
  const [registro, setRegistro] = useState<RegistroSos | null>(null);
  const [contato, setContato] = useState<string | null>(null);
  const [agindo, setAgindo] = useState<'cancelar' | 'encerrar' | null>(null);

  const sos = atual?.eventoId === eventoId ? atual : registro;
  const link = sos?.token ? api.urlAcompanhamento(sos.token) : null;

  useEffect(() => {
    if (atual?.eventoId !== eventoId) void lerSos(eventoId).then(setRegistro);
    void lerContatos().then((c) => setContato(c[0]?.nome ?? null));
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
  const estadoLink = sos.situacao === 'ativo' ? 'ativo' : sos.situacao;

  const idDoSos = sos.eventoId;

  async function agir(acao: 'cancelar' | 'encerrar') {
    setAgindo(acao);
    await (acao === 'cancelar' ? cancelarSos(idDoSos) : encerrarSos(idDoSos));
    reiniciarDetector();
    setAgindo(null);
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
              Sem internet, o SOS fica guardado e sai quando a conexão voltar.
            </Texto>
          </>
        ) : (
          <Botao titulo="Voltar ao plano" onPress={() => router.replace('/plano')} />
        )
      }>
      <View
        style={[styles.cabecalho, { backgroundColor: ativo ? alerta.emergencia : brand.viseira }]}
        accessibilityRole="header"
        accessibilityLiveRegion="polite">
        <View style={styles.selo}>
          <Texto variante="rotulo" cor={ativo ? alerta.emergencia : brand.asfalto} style={styles.seloTexto}>
            SOS
          </Texto>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="alerta" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, lineHeight: 26 }}>
            {titulo}
          </Texto>
          <Texto variante="legenda">
            Às {hora} · {ROTULO_TIPO[sos.tipo]}
            {sos.origem === 'vestivel' ? ' pela pulseira' : ''}
          </Texto>
        </View>
      </View>

      {!ativo ? (
        <Aviso
          tom="sucesso"
          texto={
            !sos.enviado
              ? 'O SOS não chegou a sair do celular: nada foi enviado ao seu contato.'
              : sos.situacao === 'cancelado'
                ? 'O link do seu contato agora mostra "cancelado". Que bom que você está bem.'
                : 'O link do seu contato agora mostra "encerrado".'
          }
        />
      ) : null}

      <View style={{ gap: 12 }} accessibilityRole="list">
        <Passo feito={sos.payload.lat !== null} texto={sos.payload.lat !== null ? 'Posição e horário registrados' : 'Buscando a sua posição'} />
        <Passo
          feito={sos.enviado}
          texto={sos.enviado ? `${contato ?? 'Seu contato'} recebeu o link` : 'O aviso ao contato sai quando a internet voltar'}
        />
        <Passo feito={sos.enviado && ativo} texto="Acompanhamento ao vivo ativo" />
      </View>

      <View style={{ gap: 8 }}>
        <Texto variante="overline" cor="textoSecundario">
          O que {contato ?? 'seu contato'} vê no navegador
        </Texto>
        <View style={styles.navegador}>
          <View style={styles.barraUrl}>
            <Texto variante="legenda" cor={tons.textoSecundarioClaro} style={{ fontSize: 13 }} numberOfLines={1}>
              {link ? link.replace(/\/acompanhar\/.*/, '/acompanhar/•••••') : 'link de acompanhamento'}
            </Texto>
          </View>
          <View style={{ padding: 14, gap: 10 }}>
            <View style={styles.mapinha}>
              <View style={styles.pino} />
            </View>
            <Texto variante="rotulo" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: 17 }}>
              {sessao.nome?.split(' ')[0] ?? 'O motociclista'} pediu socorro às {hora}
            </Texto>
            <Texto variante="legenda" cor={tons.textoSecundarioClaro} style={{ fontSize: 14 }}>
              Estado: {estadoLink} · a ficha médica não aparece aqui
            </Texto>
          </View>
        </View>
        {link && ativo ? (
          <Botao
            titulo="Compartilhar o link"
            variante="link"
            tamanho="compacto"
            dica="Envia o link de acompanhamento para quem você escolher"
            onPress={() => void Share.share({ message: `Pedi socorro pelo Garupa SP. Acompanhe: ${link}` })}
          />
        ) : null}
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  cabecalho: { borderRadius: raio.cartao, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  selo: { width: 52, height: 52, borderRadius: 26, backgroundColor: brand.branco, alignItems: 'center', justifyContent: 'center' },
  seloTexto: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 17 },
  passo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  marca: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  marcaVazia: { borderWidth: 3, borderColor: brand.teal },
  navegador: { backgroundColor: brand.neblina, borderRadius: raio.xxl, overflow: 'hidden' },
  barraUrl: { minHeight: 30, backgroundColor: tons.divisorClaro, justifyContent: 'center', paddingHorizontal: 12 },
  mapinha: { height: 96, borderRadius: raio.md, backgroundColor: tons.cinzaMapaClaro, alignItems: 'center', justifyContent: 'center' },
  pino: { width: 20, height: 20, borderRadius: 10, backgroundColor: alerta.emergencia, borderWidth: 3, borderColor: brand.branco },
});
