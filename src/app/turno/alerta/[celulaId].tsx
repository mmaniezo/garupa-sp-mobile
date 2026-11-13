import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api';
import type { CelulaCritica, Mensagem } from '@/api/types';
import { Botao, BotaoIcone, CartaoMensagem, Icone, Tela, Texto } from '@/components/ui';
import { regras } from '@/config';
import { usePreferencias } from '@/dados-locais/preferencias';
import {
  dispensarMensagem,
  mensagensDispensadasHoje,
  registrarMensagemExibida,
  ultimasMensagensExibidas,
} from '@/dados-locais/repositorios';
import { gravarValor, lerValor } from '@/db';
import { escolherMensagem } from '@/domain/mensagens';
import { acaoDoPonto, motivoDoPonto } from '@/domain/risco';
import { voltarOu } from '@/lib/navegacao';
import { useTema } from '@/lib/tema';
import { contextoAgora, usePlano } from '@/servicos/plano';
import { usePosicao } from '@/servicos/posicao';
import { alerta, brand, raio } from '@/theme';

/**
 * Tela 12 · Ao abrir o alerta, com a moto parada (RF14, RF15, RF17).
 * Mostra o motivo e a ação em linguagem simples. Com a moto andando, não mostra texto:
 * o aviso é o som e a vibração (RB17).
 */
export default function MotivoDoAlerta() {
  const { celulaId } = useLocalSearchParams<{ celulaId: string }>();
  const plano = usePlano();
  const prefs = usePreferencias();
  const posicao = usePosicao();
  const { c } = useTema();
  const [ponto, setPonto] = useState<CelulaCritica | null>(
    plano.dados?.pontos.find((p) => p.celulaId === celulaId) ?? null,
  );
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [avaliou, setAvaliou] = useState(false);
  const contexto = contextoAgora(prefs.chuva);
  // Decide uma vez, ao abrir: com a moto andando, a tela só pede para parar (RB17).
  const [emMovimento] = useState(
    () => (posicao?.kmh ?? 0) > regras.motoParadaKmh && Date.now() - (posicao?.em ?? 0) < 15_000,
  );

  useEffect(() => {
    if (ponto || !celulaId) return;
    api
      .obterCelula(celulaId)
      .then((d) => {
        const r = d.riscoPorFaixa.find(
          (x) => x.faixaHoraria === contexto.faixa && x.tipoDia === contexto.tipoDia && x.chuva === contexto.chuva,
        );
        setPonto({ ...d, score: r?.score ?? 0, percentil: r?.percentil ?? 0 });
      })
      .catch(() => undefined);
  }, [celulaId, ponto, contexto.faixa, contexto.tipoDia, contexto.chuva]);

  useEffect(() => {
    void (async () => {
      try {
        const lista = await api.listarMensagens({ contexto: 'ponto_critico', tipoDeUso: prefs.perfil.tiposDeUso[0] });
        const m = escolherMensagem(lista, await ultimasMensagensExibidas(), await mensagensDispensadasHoje());
        if (m) {
          setMensagem(m);
          void registrarMensagemExibida(m.id);
        }
      } catch {
        // sem mensagem, sem problema
      }
    })();
  }, [prefs.perfil.tiposDeUso]);

  async function avaliar(util: boolean) {
    // RF17 (P2): sem endpoint no contrato; guarda só a contagem, sem identificar a pessoa.
    if (!mensagem) return;
    const id = mensagem.id;
    const atual = (await lerValor<Record<string, { util: number; naoUtil: number }>>('avaliacoes')) ?? {};
    const a = atual[id] ?? { util: 0, naoUtil: 0 };
    await gravarValor('avaliacoes', { ...atual, [id]: util ? { ...a, util: a.util + 1 } : { ...a, naoUtil: a.naoUtil + 1 } });
    setAvaliou(true);
  }

  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (emMovimento) {
    return (
      <Tela rolagem={false} rodape={<Botao titulo="Voltar ao turno" onPress={() => voltarOu('/turno/ativo')} />}>
        <View style={styles.movimento}>
          <Icone nome="alerta" tamanho={64} cor={c.atencaoTexto} />
          <Texto variante="display" centro>
            Pare a moto para ler.
          </Texto>
          <Texto variante="corpo" cor="textoSecundario" centro>
            Em movimento, o aviso é só o bipe e a vibração.
          </Texto>
        </View>
      </Tela>
    );
  }

  return (
    <Tela gap={16} rodape={<Botao titulo="Voltar ao turno" onPress={() => voltarOu('/turno/ativo')} />}>
      <View style={styles.topo}>
        <BotaoIcone icone="voltar" rotulo="Voltar" onPress={() => voltarOu('/turno/ativo')} />
        <Texto variante="rotulo" cor="textoSecundario">
          Aberto pela notificação · moto parada
        </Texto>
      </View>

      <View style={styles.cartao} accessible accessibilityRole="summary">
        <View style={styles.linha}>
          <Icone nome="alerta" tamanho={26} cor={brand.asfalto} espessura={2.4} />
          <Texto variante="rotulo" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
            Ponto crítico · {hora}
          </Texto>
        </View>
        <Texto variante="alerta" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, lineHeight: 28 }}>
          {ponto?.viaReferencia ?? 'Ponto crítico'}
          {ponto?.distritoNome ? ` · ${ponto.distritoNome}` : ''}
        </Texto>
        <View style={{ gap: 2 }}>
          <Texto variante="rotulo" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: 14 }}>
            Por quê
          </Texto>
          <Texto variante="corpoMenor" cor={brand.asfalto} style={{ fontSize: 17 }}>
            {motivoDoPonto(contexto.faixa, contexto.tipoDia, contexto.chuva)}
          </Texto>
        </View>
        <View style={{ gap: 2 }}>
          <Texto variante="rotulo" cor={brand.asfalto} style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: 14 }}>
            O que fazer
          </Texto>
          <Texto variante="corpoMenor" cor={brand.asfalto} style={{ fontSize: 17 }}>
            {acaoDoPonto(contexto.faixa, contexto.chuva)}
          </Texto>
        </View>
      </View>

      {mensagem ? (
        <View style={{ gap: 10 }}>
          <CartaoMensagem
            titulo="Mensagem"
            texto={mensagem.texto}
            fonte={mensagem.fonte}
            onDispensar={() => {
              void dispensarMensagem(mensagem.id);
              setMensagem(null);
            }}
          />
          {avaliou ? (
            <Texto variante="legenda" cor="textoSecundario" accessibilityLiveRegion="polite">
              Obrigado. A avaliação fica guardada sem identificar você.
            </Texto>
          ) : (
            <View style={styles.avaliacao}>
              <Texto variante="rotulo" style={{ flex: 1 }}>
                Isso ajudou?
              </Texto>
              <Botao titulo="Útil" variante="claro" tamanho="compacto" larguraTotal={false} onPress={() => void avaliar(true)} />
              <Botao titulo="Não útil" variante="contorno" tamanho="compacto" larguraTotal={false} onPress={() => void avaliar(false)} />
            </View>
          )}
        </View>
      ) : null}

      <Texto variante="legenda" cor="textoSecundario">
        Com a moto andando, esta tela não abre: só o bipe, a vibração e o banner curto.
      </Texto>
    </Tela>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartao: { backgroundColor: alerta.atencao, borderRadius: raio.cartao, padding: 18, gap: 10 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avaliacao: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  movimento: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
});
