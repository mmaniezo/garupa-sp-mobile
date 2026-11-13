import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { mock } from '@/api';
import { Logo } from '@/components/brand/logo';
import { ItemPonto } from '@/components/plano/item-ponto';
import { Aviso, Botao, CartaoMensagem, Etiqueta, Segmentado, Tela, Texto } from '@/components/ui';
import { atualizarPreferencias, usePreferencias } from '@/dados-locais/preferencias';
import { dispensarMensagem, registrarMensagemExibida } from '@/dados-locais/repositorios';
import { rotuloFaixa, rotuloTipoDia, saudacao } from '@/domain/contexto';
import { AVISO_HISTORICO, localDoPonto } from '@/domain/risco';
import { useTema } from '@/lib/tema';
import { carregarPlano, contextoAgora, esconderMensagem, usePlano, type ContextoPlano, type PontoDoPlano } from '@/servicos/plano';
import { useTurno } from '@/servicos/turno';
import { useSessao } from '@/state/sessao';

function linhaDoPonto(p: PontoDoPlano, c: ContextoPlano): string {
  const porque = c.chuva ? 'sinistros graves com chuva' : `sinistros graves das ${rotuloFaixa(c.faixa)}`;
  return `${localDoPonto(p)} · ${porque}`;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Tela 07 · Plano do turno (RF07, RF10, RF11, RF15).
 * Pontos críticos dos distritos da pessoa, na faixa horária, no tipo de dia e com a chuva
 * informada; uma mensagem de conscientização do contexto e do perfil; botão Iniciar turno.
 */
export default function PlanoDoTurno() {
  const sessao = useSessao();
  const prefs = usePreferencias();
  const plano = usePlano();
  const turno = useTurno();
  // "paleta" (e não "c") porque "c" já é o contexto do plano no efeito de foco abaixo.
  const { c: paleta } = useTema();
  const dados = plano.dados;
  const contexto = dados?.contexto ?? contextoAgora(prefs.chuva);
  const mensagem = dados?.mensagens[0];

  // Recarrega ao voltar para a tela se a faixa horária ou a chuva mudaram.
  useFocusEffect(
    useCallback(() => {
      const agora = contextoAgora(prefs.chuva);
      const c = plano.dados?.contexto;
      if (!plano.carregando && (!c || c.faixa !== agora.faixa || c.tipoDia !== agora.tipoDia || c.chuva !== agora.chuva)) {
        void carregarPlano(agora);
      }
    }, [prefs.chuva, plano.dados?.contexto, plano.carregando]),
  );

  useEffect(() => {
    if (mensagem) void registrarMensagemExibida(mensagem.id);
  }, [mensagem]);

  async function mudarChuva(chuva: boolean) {
    await atualizarPreferencias({ chuva });
    void carregarPlano(contextoAgora(chuva));
  }

  const primeiroNome = sessao.nome?.split(' ')[0];
  const botaoTurno =
    turno.situacao === 'ativo'
      ? { titulo: 'Ver turno ativo', ir: () => router.push('/turno/ativo') }
      : turno.situacao === 'pausado'
        ? { titulo: 'Ver turno pausado', ir: () => router.push('/turno/pausado') }
        : { titulo: 'Iniciar turno', ir: () => router.push('/turno/antes-de-sair') };

  return (
    <Tela
      dentroDeAbas
      gap={16}
      aoAtualizar={() => void carregarPlano(contextoAgora(prefs.chuva))}
      atualizando={plano.carregando && !!dados}
      rodape={<Botao titulo={botaoTurno.titulo} icone="play" tamanho="destaque" onPress={botaoTurno.ir} />}>
      <View style={styles.topo}>
        <Logo variante="horizontal" altura={40} />
        {/* O risco do mock é o do modelo de ML; o que é simulado é o servidor (e o cadastro some ao fechar). */}
        {mock ? <Etiqueta texto="API simulada" /> : null}
      </View>

      <View style={{ gap: 4 }}>
        <Texto variante="corpoMenor" cor="textoSecundario">
          {saudacao()}
          {primeiroNome ? `, ${primeiroNome}` : ''}
        </Texto>
        <Texto variante="titulo" accessibilityRole="header">
          Seu plano do turno
        </Texto>
      </View>

      <View style={styles.contexto}>
        <Etiqueta
          aparencia="cheia"
          fundo={paleta.superficieElevada}
          cor={paleta.texto}
          texto={`${rotuloTipoDia(contexto.tipoDia, true)} · ${rotuloFaixa(contexto.faixa)}`}
        />
        <Segmentado
          rotulo="Está chovendo?"
          valor={prefs.chuva ? 'chuva' : 'seco'}
          opcoes={[
            { valor: 'seco', rotulo: 'Seco' },
            { valor: 'chuva', rotulo: 'Chovendo' },
          ]}
          onChange={(v) => void mudarChuva(v === 'chuva')}
        />
      </View>

      {dados?.origem === 'cache' ? (
        <Aviso tom="neutro" texto={`Sem internet: este é o plano guardado às ${hora(dados.atualizadoEm)}.`} />
      ) : null}
      {plano.erro ? <Aviso tom="erro" texto={plano.erro} anunciar /> : null}

      {mensagem ? (
        <CartaoMensagem
          texto={mensagem.texto}
          fonte={mensagem.fonte}
          onDispensar={() => {
            void dispensarMensagem(mensagem.id);
            esconderMensagem(mensagem.id);
          }}
        />
      ) : null}

      {dados?.semDistritos ? (
        <View style={{ gap: 8 }}>
          <Aviso
            tom="info"
            texto={
              dados.semLocalizacao
                ? 'Escolha os distritos em que você roda para ver o plano, ou permita a localização para ver os pontos perto de você.'
                : 'Sem distritos escolhidos: mostrando pontos num raio de 3 km de você.'
            }
          />
          <Botao
            titulo="Escolher distritos"
            variante="contorno"
            tamanho="compacto"
            onPress={() => router.push('/cadastro/distritos?editar=1')}
          />
        </View>
      ) : null}

      <View style={styles.cabecalhoLista}>
        <Texto variante="tituloSecao" accessibilityRole="header">
          Pontos críticos agora
        </Texto>
        <Botao titulo="Ver no mapa" variante="link" tamanho="compacto" larguraTotal={false} onPress={() => router.navigate('/mapa')} />
      </View>

      {plano.carregando && !dados ? (
        <Texto variante="legenda" cor="textoSecundario">
          Montando o seu plano…
        </Texto>
      ) : dados && dados.pontos.length === 0 && !dados.semLocalizacao ? (
        <Aviso tom="neutro" texto="Nenhum ponto crítico nesta faixa horária nas suas áreas. Mesmo assim, atenção no trajeto." />
      ) : (
        <View style={{ gap: 8 }}>
          {dados?.pontos.slice(0, 8).map((p, i) => (
            <ItemPonto
              key={p.celulaId}
              ponto={p}
              posicao={i + 1}
              destaque={i < 2}
              linha={linhaDoPonto(p, contexto)}
              onPress={() => router.navigate({ pathname: '/mapa', params: { celula: p.celulaId } })}
            />
          ))}
        </View>
      )}

      <Texto variante="legenda" cor="textoSecundario">
        {AVISO_HISTORICO} Base: Infosiga e INMET.
      </Texto>
    </Tela>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contexto: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  cabecalhoLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
