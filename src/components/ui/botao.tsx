import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { altura, brand, cores, raio, texto, tons } from '@/theme';

import { Icone, type NomeIcone } from './icone';
import { Texto } from './texto';

export type VarianteBotao =
  | 'primario' // teal, texto Asfalto: ação principal
  | 'contorno' // borda branca, fundo transparente
  | 'neutro' // fundo Viseira
  | 'claro' // fundo branco, texto Asfalto
  | 'fantasma' // só texto
  | 'link' // texto teal, sem fundo
  | 'seguro' // verde: "Estou bem"
  | 'perigo' // vermelho: SOS
  | 'perigoTexto'; // ação destrutiva discreta (excluir, desparear)

export type TamanhoBotao = 'compacto' | 'padrao' | 'principal' | 'destaque' | 'emergencia';

const alturas: Record<TamanhoBotao, number> = {
  compacto: altura.minimoToque,
  padrao: altura.botao,
  principal: altura.botaoPrincipal,
  destaque: altura.botaoDestaque,
  emergencia: altura.botaoEmergencia,
};

const estilos: Record<VarianteBotao, { fundo: string; texto: string; borda?: string }> = {
  primario: { fundo: brand.teal, texto: brand.asfalto },
  contorno: { fundo: 'transparent', texto: brand.branco, borda: brand.branco },
  neutro: { fundo: brand.viseira, texto: brand.branco },
  claro: { fundo: brand.branco, texto: brand.asfalto },
  fantasma: { fundo: 'transparent', texto: brand.branco },
  link: { fundo: 'transparent', texto: brand.teal },
  seguro: { fundo: cores.seguro, texto: brand.branco },
  perigo: { fundo: cores.emergencia, texto: brand.branco },
  perigoTexto: { fundo: 'transparent', texto: tons.emergenciaTexto },
};

type Props = {
  titulo: string;
  onPress?: () => void;
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  icone?: NomeIcone;
  carregando?: boolean;
  desabilitado?: boolean;
  /** Explica ao leitor de tela o que acontece ao tocar, quando o título não basta. */
  dica?: string;
  larguraTotal?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Botão do manual: altura mínima 48, padrão 56, principal 60/64, emergência 72. */
export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  tamanho = 'principal',
  icone,
  carregando,
  desabilitado,
  dica,
  larguraTotal = true,
  style,
  testID,
}: Props) {
  const e = estilos[variante];
  const inativo = desabilitado || carregando;
  const grande = tamanho === 'principal' || tamanho === 'destaque' || tamanho === 'emergencia';
  const estiloTexto =
    tamanho === 'emergencia'
      ? { ...texto.botaoGrande, fontSize: 22 }
      : grande
        ? texto.botaoGrande
        : texto.botao;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          height: alturas[tamanho],
          backgroundColor: e.fundo,
          borderColor: e.borda ?? 'transparent',
          borderWidth: e.borda ? 2 : 0,
          alignSelf: larguraTotal ? 'stretch' : 'flex-start',
          paddingHorizontal: larguraTotal ? 20 : 16,
        },
        pressed && styles.pressionado,
        inativo && styles.inativo,
        style,
      ]}>
      {carregando ? (
        <ActivityIndicator color={e.texto} />
      ) : (
        <View style={styles.conteudo}>
          {icone ? <Icone nome={icone} tamanho={22} cor={e.texto} /> : null}
          <Texto style={[estiloTexto, { color: e.texto }]} numberOfLines={2} centro>
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: raio.pilula,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: altura.minimoToque,
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressionado: { opacity: 0.82 },
  inativo: { opacity: 0.45 },
});
