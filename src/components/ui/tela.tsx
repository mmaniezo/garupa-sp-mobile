import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTema } from '@/lib/tema';
import { brand, margemTela } from '@/theme';

import { Aurora } from './aurora';

type Props = {
  children: ReactNode;
  /** Ações fixas no pé da tela (botão principal). */
  rodape?: ReactNode;
  rolagem?: boolean;
  /** Sem informar, o fundo do tema (Asfalto no escuro, Neblina no claro). */
  fundo?: string;
  /** Ícones claros na barra de status. Sem informar, o do tema. */
  barraClara?: boolean;
  margem?: number;
  /** Tela dentro das abas: a barra de navegação já cuida da área segura de baixo. */
  dentroDeAbas?: boolean;
  gap?: number;
  style?: ViewStyle;
  /**
   * Luz ambiente no topo. Padrão: o teal da marca nas telas com o fundo do tema; telas de cor
   * cheia (queda, testemunha) não têm. Uma cor troca a luz (verde no turno ativo); false desliga.
   */
  aurora?: string | false;
  /** Puxar para atualizar (só com rolagem). */
  aoAtualizar?: () => void;
  atualizando?: boolean;
};

/** Estrutura padrão das telas: fundo Asfalto, área segura, conteúdo e ações no pé. */
export function Tela({
  children,
  rodape,
  rolagem = true,
  fundo,
  barraClara,
  margem = margemTela,
  dentroDeAbas = false,
  gap = 18,
  style,
  aurora,
  aoAtualizar,
  atualizando = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { c } = useTema();
  const fundoFinal = fundo ?? c.fundo;
  const barraFinal = barraClara ?? c.barraStatus === 'light';
  const conteudo = [styles.conteudo, { paddingHorizontal: margem, gap }, style];
  const baixo = dentroDeAbas ? 12 : Math.max(insets.bottom, 16) + 12;

  return (
    // O teclado empurra a tela para cima no Android e no iOS. No Android com a tela de
    // ponta a ponta (padrão do SDK), o sistema não redimensiona mais a janela sozinho;
    // o KeyboardAvoidingView mede só a parte coberta pelo teclado, então não dobra o espaço.
    <KeyboardAvoidingView
      style={[styles.raiz, { backgroundColor: fundoFinal, paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <StatusBar style={barraFinal ? 'light' : 'dark'} />
      {aurora === false || (fundo && !aurora) ? null : <Aurora cor={aurora || undefined} />}
      {rolagem ? (
        <ScrollView
          contentContainerStyle={[conteudo, { paddingBottom: rodape ? 16 : baixo }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            aoAtualizar ? (
              <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor={brand.teal} colors={[brand.teal]} />
            ) : undefined
          }>
          {children}
        </ScrollView>
      ) : (
        <View style={[conteudo, styles.fixo, { paddingBottom: rodape ? 16 : baixo }]}>{children}</View>
      )}
      {rodape ? (
        <View style={[styles.rodape, { paddingHorizontal: margem, paddingBottom: baixo }]}>{rodape}</View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { flexGrow: 1, paddingTop: 8 },
  fixo: { flex: 1 },
  rodape: { gap: 10, paddingTop: 8 },
});
