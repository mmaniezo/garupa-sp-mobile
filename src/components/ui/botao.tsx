import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { usePulso, type Toque } from '@/lib/movimento';
import { useEstilos } from '@/lib/tema';
import { alerta, altura, brand, brilho, raio, texto, type Paleta } from '@/theme';

import { Icone, type NomeIcone } from './icone';
import { Pressionavel } from './pressionavel';
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
  | 'perigoTexto' // ação destrutiva discreta (excluir, desparear)
  // Cores fixas, para superfícies que não mudam com o tema (tela vermelha da queda, testemunha):
  | 'contornoClaro' // borda e texto brancos sobre vermelho ou verde
  | 'branco' // fundo branco, texto Asfalto
  | 'linkProfundo'; // texto teal profundo sobre fundo branco fixo

export type TamanhoBotao = 'compacto' | 'padrao' | 'principal' | 'destaque' | 'emergencia';

const alturas: Record<TamanhoBotao, number> = {
  compacto: altura.minimoToque,
  padrao: altura.botao,
  principal: altura.botaoPrincipal,
  destaque: altura.botaoDestaque,
  emergencia: altura.botaoEmergencia,
};

/** Cores por variante no tema. "claro" é o botão invertido: branco no escuro, Asfalto no claro. */
function estilosDoTema(c: Paleta): Record<VarianteBotao, { fundo: string; texto: string; borda?: string; brilho?: string }> {
  return {
    primario: { fundo: brand.teal, texto: brand.asfalto, brilho: brilho.teal },
    contorno: { fundo: 'transparent', texto: c.texto, borda: c.texto },
    neutro: { fundo: c.superficieElevada, texto: c.texto },
    claro: { fundo: c.texto, texto: c.textoInverso },
    fantasma: { fundo: 'transparent', texto: c.texto },
    link: { fundo: 'transparent', texto: c.link },
    seguro: { fundo: alerta.seguro, texto: brand.branco, brilho: brilho.seguro },
    perigo: { fundo: alerta.emergencia, texto: brand.branco, brilho: brilho.emergencia },
    perigoTexto: { fundo: 'transparent', texto: c.emergenciaTexto },
    contornoClaro: { fundo: 'transparent', texto: brand.branco, borda: brand.branco },
    branco: { fundo: brand.branco, texto: brand.asfalto },
    linkProfundo: { fundo: 'transparent', texto: brand.tealProfundo },
  };
}

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
  /** A ação mais importante da tela: um halo da cor do botão respira devagar em volta dele. */
  vivo?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Halo que respira em volta do botão principal da tela. */
function Halo({ cor }: { cor: string }) {
  const pulso = usePulso(2200);
  const animado = useAnimatedStyle(() => ({
    opacity: 0.32 * (1 - pulso.get()),
    transform: [{ scaleX: 1 + 0.045 * pulso.get() }, { scaleY: 1 + 0.26 * pulso.get() }],
  }));
  return <Animated.View style={[styles.halo, { backgroundColor: cor }, animado]} />;
}

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
  vivo,
  style,
  testID,
}: Props) {
  const e = useEstilos(estilosDoTema)[variante];
  const inativo = desabilitado || carregando;
  const grande = tamanho === 'principal' || tamanho === 'destaque' || tamanho === 'emergencia';
  const estiloTexto =
    tamanho === 'emergencia'
      ? { ...texto.botaoGrande, fontSize: 22 }
      : grande
        ? texto.botaoGrande
        : texto.botao;
  const toque: Toque = variante === 'perigo' || variante === 'seguro' ? 'medio' : 'leve';
  const comBrilho = !!e.brilho && grande && !inativo;

  return (
    <Pressionavel
      testID={testID}
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      hitSlop={4}
      toque={toque}
      opacidade={inativo ? 0.45 : 1}
      escala={larguraTotal ? 0.97 : 0.94}
      style={[
        styles.base,
        {
          height: alturas[tamanho],
          backgroundColor: e.fundo,
          borderColor: e.borda ?? 'transparent',
          borderWidth: e.borda ? 2 : 0,
          alignSelf: larguraTotal ? 'stretch' : 'flex-start',
          paddingHorizontal: larguraTotal ? 20 : 16,
        },
        comBrilho && { boxShadow: e.brilho },
        style,
      ]}>
      {vivo && !inativo ? <Halo cor={e.fundo} /> : null}
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
    </Pressionavel>
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
  halo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: raio.pilula, pointerEvents: 'none' },
});
