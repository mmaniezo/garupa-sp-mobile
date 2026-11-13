import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/logo';
import { Aviso, Botao, BotaoIcone, Etiqueta, ItemMarcavel, Tela, Texto } from '@/components/ui';
import { rotuloDaFonte } from '@/domain/mensagens';
import { voltarOu } from '@/lib/navegacao';
import { useEstilos, useTema } from '@/lib/tema';
import { carregarPlano, usePlano } from '@/servicos/plano';
import { iniciarTurno } from '@/servicos/turno';
import { useSessao } from '@/state/sessao';
import { raio, type Paleta } from '@/theme';

const CHECKLIST = ['Capacete afivelado e viseira limpa', 'Celular firme no suporte', 'Farol aceso e capa de chuva'];

/**
 * Tela 09 · Antes de sair (RN08, RF15): a mensagem do turno com a moto parada,
 * um checklist opcional e o início do turno. Sem as permissões essenciais, diz o que falta (RF36).
 */
export default function AntesDeSair() {
  const sessao = useSessao();
  const plano = usePlano();
  const { c } = useTema();
  const styles = useEstilos(criarEstilos);
  const [marcados, setMarcados] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [faltas, setFaltas] = useState<string[]>([]);
  const [iniciando, setIniciando] = useState(false);
  const mensagem = plano.dados?.mensagens[0];
  const primeiroNome = sessao.nome?.split(' ')[0];

  // A mensagem do turno vem do plano; se a tela abriu direto, carrega (os alertas também usam os pontos).
  useEffect(() => {
    if (!plano.dados && !plano.carregando) void carregarPlano();
  }, [plano.dados, plano.carregando]);

  async function iniciar() {
    setIniciando(true);
    setFaltas([]);
    const r = await iniciarTurno();
    setIniciando(false);
    if (r.ok) router.replace('/turno/ativo');
    else setFaltas(r.faltas);
  }

  return (
    <Tela
      rodape={
        <>
          <Botao titulo="Combinado, iniciar turno" tamanho="destaque" onPress={iniciar} carregando={iniciando} />
          <Texto variante="legenda" cor="textoSecundario" centro>
            Com a moto andando, a gente só fala por som e vibração.
          </Texto>
        </>
      }>
      <View style={styles.topo}>
        <BotaoIcone icone="voltar" rotulo="Voltar" onPress={() => voltarOu('/plano')} />
        <Etiqueta texto="Antes de sair" aparencia="cheia" fundo={c.selecionadoFundo} cor={c.tealTexto} />
      </View>

      <View style={{ gap: 10 }}>
        <Logo variante="capacete" largura={84} decorativa />
        <Texto variante="hero" accessibilityRole="header">
          Pilote com cuidado{primeiroNome ? `, ${primeiroNome}` : ''}.
        </Texto>
        <Texto variante="corpo" cor="textoSecundario">
          A entrega espera. Você chegar inteiro é o que importa.
        </Texto>
      </View>

      {mensagem ? (
        <View style={styles.mensagem}>
          <Texto variante="overline" cor="informacaoTexto">
            Para o turno de hoje
          </Texto>
          <Texto variante="alerta" style={{ fontSize: 19, lineHeight: 25 }}>
            {mensagem.texto}
          </Texto>
          <Texto variante="legenda" cor="informacaoTexto" style={{ fontSize: 14 }}>
            Fonte: {rotuloDaFonte(mensagem.fonte)}
          </Texto>
        </View>
      ) : null}

      {faltas.length ? (
        <View style={{ gap: 8 }}>
          <Aviso tom="erro" titulo="O turno ainda não pode começar" texto={faltas.join('\n')} anunciar />
          <Botao
            titulo="Revisar permissões"
            variante="contorno"
            tamanho="padrao"
            onPress={() => router.push('/cadastro/permissoes?editar=1')}
          />
        </View>
      ) : null}

      <View style={{ gap: 4 }} accessibilityRole="list">
        <Texto variante="rotulo" cor="textoSecundario" style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
          Checklist rápido (opcional)
        </Texto>
        {CHECKLIST.map((item, i) => (
          <ItemMarcavel
            key={item}
            titulo={item}
            marcado={marcados[i]}
            onPress={() => setMarcados((m) => m.map((v, j) => (j === i ? !v : v)))}
          />
        ))}
      </View>
    </Tela>
  );
}

const criarEstilos = (c: Paleta) =>
  StyleSheet.create({
    topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    mensagem: { backgroundColor: c.informacaoFundo, borderRadius: raio.xxl, padding: 16, gap: 8, borderColor: c.fundo },
  });
