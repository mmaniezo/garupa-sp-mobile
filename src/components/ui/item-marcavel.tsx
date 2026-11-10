import { Pressable, StyleSheet, View } from 'react-native';

import { brand, raio, tons } from '@/theme';

import { Icone } from './icone';
import { Texto } from './texto';

type Props = {
  titulo: string;
  descricao?: string;
  marcado: boolean;
  onPress: () => void;
  /** 'cartao' = linha com fundo Superfície (permissões); 'simples' = só a linha (consentimentos, checklist). */
  aparencia?: 'cartao' | 'simples';
  /** Caixa à direita (permissões, privacidade) ou à esquerda (checklist, distritos). */
  caixaA?: 'direita' | 'esquerda';
};

/** Linha com caixa de seleção grande (28 dp), fácil de acertar com luva. */
export function ItemMarcavel({
  titulo,
  descricao,
  marcado,
  onPress,
  aparencia = 'simples',
  caixaA = 'esquerda',
}: Props) {
  const caixa = (
    <View style={[styles.caixa, marcado ? styles.caixaMarcada : styles.caixaVazia]}>
      {marcado ? <Icone nome="check" tamanho={18} cor={brand.asfalto} espessura={3} /> : null}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={descricao ? `${titulo}. ${descricao}` : titulo}
      accessibilityState={{ checked: marcado }}
      style={({ pressed }) => [
        styles.linha,
        aparencia === 'cartao' && styles.cartao,
        pressed && { opacity: 0.85 },
      ]}>
      {caixaA === 'esquerda' ? caixa : null}
      <View style={styles.textos}>
        <Texto
          variante="corpoMenor"
          style={aparencia === 'cartao' ? styles.tituloForte : undefined}>
          {titulo}
        </Texto>
        {descricao ? (
          <Texto variante="legenda" cor="textoSecundario">
            {descricao}
          </Texto>
        ) : null}
      </View>
      {caixaA === 'direita' ? caixa : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  cartao: {
    backgroundColor: tons.superficie,
    borderRadius: raio.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textos: { flex: 1, gap: 2 },
  tituloForte: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 17, lineHeight: 22 },
  caixa: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaVazia: { borderWidth: 2, borderColor: tons.neutroBarra },
  caixaMarcada: { backgroundColor: brand.teal },
});
