import { Linking, StyleSheet, View } from 'react-native';

import { fonteEhLink, rotuloDaFonte } from '@/domain/mensagens';
import { useEstilos } from '@/lib/tema';
import { raio, type Paleta } from '@/theme';

import { BotaoIcone } from './botao-icone';
import { Icone } from './icone';
import { Texto } from './texto';

type Props = {
  texto: string;
  fonte: string;
  titulo?: string;
  onDispensar?: () => void;
};

/**
 * Mensagem de conscientização (azul = informação). Só aparece com a moto parada (RB05),
 * pode ser dispensada e sempre mostra a fonte oficial.
 */
export function CartaoMensagem({ texto, fonte, titulo, onDispensar }: Props) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.cartao} accessibilityRole="summary">
      <View style={styles.topo}>
        <Icone nome="info" tamanho={22} cor={styles.cores.icone} />
        <View style={styles.corpo}>
          {titulo ? (
            <Texto variante="overline" cor="informacaoTexto">
              {titulo}
            </Texto>
          ) : null}
          <Texto variante="corpoMenor" style={styles.texto}>
            {texto}
          </Texto>
          {fonteEhLink(fonte) ? (
            <Texto
              variante="legenda"
              cor="informacaoTexto"
              style={[styles.fonte, styles.link]}
              accessibilityRole="link"
              accessibilityHint="Abre a página da fonte no navegador"
              onPress={() => void Linking.openURL(fonte.trim())}>
              Fonte: {rotuloDaFonte(fonte)}
            </Texto>
          ) : (
            <Texto variante="legenda" cor="informacaoTexto" style={styles.fonte}>
              Fonte: {fonte}
            </Texto>
          )}
        </View>
        {onDispensar ? (
          <BotaoIcone
            icone="fechar"
            rotulo="Dispensar mensagem"
            onPress={onDispensar}
            fundo={styles.cores.fundoFechar}
            cor={styles.cores.icone}
            tamanho={44}
          />
        ) : null}
      </View>
    </View>
  );
}

const criarEstilos = (c: Paleta) => ({
  cores: {
    icone: c.informacaoIcone,
    fundoFechar: c.barraStatus === 'light' ? 'rgba(255,255,255,0.1)' : 'rgba(17,20,23,0.08)',
  },
  ...StyleSheet.create({
    cartao: { backgroundColor: c.informacaoFundo, borderRadius: raio.xl, padding: 16 },
    topo: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    corpo: { flex: 1, gap: 4 },
    texto: { color: c.texto, fontSize: 17, lineHeight: 23 },
    fonte: { fontSize: 14 },
    link: { textDecorationLine: 'underline' },
  }),
});
