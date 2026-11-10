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

import { brand, margemTela } from '@/theme';

type Props = {
  children: ReactNode;
  /** Ações fixas no pé da tela (botão principal). */
  rodape?: ReactNode;
  rolagem?: boolean;
  fundo?: string;
  barraClara?: boolean;
  margem?: number;
  /** Tela dentro das abas: a barra de navegação já cuida da área segura de baixo. */
  dentroDeAbas?: boolean;
  gap?: number;
  style?: ViewStyle;
  /** Puxar para atualizar (só com rolagem). */
  aoAtualizar?: () => void;
  atualizando?: boolean;
};

/** Estrutura padrão das telas: fundo Asfalto, área segura, conteúdo e ações no pé. */
export function Tela({
  children,
  rodape,
  rolagem = true,
  fundo = brand.asfalto,
  barraClara = true,
  margem = margemTela,
  dentroDeAbas = false,
  gap = 18,
  style,
  aoAtualizar,
  atualizando = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const conteudo = [styles.conteudo, { paddingHorizontal: margem, gap }, style];
  const baixo = dentroDeAbas ? 12 : Math.max(insets.bottom, 16) + 12;

  return (
    <KeyboardAvoidingView
      style={[styles.raiz, { backgroundColor: fundo, paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style={barraClara ? 'light' : 'dark'} />
      {rolagem ? (
        <ScrollView
          contentContainerStyle={[conteudo, { paddingBottom: rodape ? 16 : baixo }]}
          keyboardShouldPersistTaps="handled"
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
