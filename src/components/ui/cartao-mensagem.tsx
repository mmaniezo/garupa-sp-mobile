import { Linking, StyleSheet, View } from 'react-native';

import { fonteEhLink, rotuloDaFonte } from '@/domain/mensagens';
import { brand, raio, tons } from '@/theme';

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
  return (
    <View style={styles.cartao} accessibilityRole="summary">
      <View style={styles.topo}>
        <Icone nome="info" tamanho={22} cor={tons.informacaoIcone} />
        <View style={styles.corpo}>
          {titulo ? (
            <Texto variante="overline" cor={tons.informacaoTexto}>
              {titulo}
            </Texto>
          ) : null}
          <Texto variante="corpoMenor" style={styles.texto}>
            {texto}
          </Texto>
          {fonteEhLink(fonte) ? (
            <Texto
              variante="legenda"
              cor={tons.informacaoTexto}
              style={[styles.fonte, styles.link]}
              accessibilityRole="link"
              accessibilityHint="Abre a página da fonte no navegador"
              onPress={() => void Linking.openURL(fonte.trim())}>
              Fonte: {rotuloDaFonte(fonte)}
            </Texto>
          ) : (
            <Texto variante="legenda" cor={tons.informacaoTexto} style={styles.fonte}>
              Fonte: {fonte}
            </Texto>
          )}
        </View>
        {onDispensar ? (
          <BotaoIcone
            icone="fechar"
            rotulo="Dispensar mensagem"
            onPress={onDispensar}
            fundo="rgba(255,255,255,0.1)"
            tamanho={44}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: { backgroundColor: tons.informacaoFundo, borderRadius: raio.xl, padding: 16 },
  topo: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  corpo: { flex: 1, gap: 4 },
  texto: { color: brand.branco, fontSize: 17, lineHeight: 23 },
  fonte: { fontSize: 14 },
  link: { textDecorationLine: 'underline' },
});
