import { useMemo } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { obterPreferencias, usePreferencias } from '@/dados-locais/preferencias';
import { paletas, type NomeTema, type Paleta, type PreferenciaTema } from '@/theme';

/**
 * Tema do app: segue o claro/escuro do sistema do celular, a menos que a pessoa fixe um
 * no Perfil. Componentes pegam a paleta com useTema e montam os estilos com useEstilos.
 */
export function useTema(): { nome: NomeTema; c: Paleta } {
  const sistema = useColorScheme();
  const { tema } = usePreferencias();
  const nome: NomeTema = tema === 'sistema' ? (sistema === 'light' ? 'claro' : 'escuro') : tema;
  return { nome, c: paletas[nome] };
}

/**
 * Estilos que dependem do tema, criados uma vez por tema:
 *   const criarEstilos = (c: Paleta) => StyleSheet.create({ ... });
 *   const styles = useEstilos(criarEstilos);
 */
export function useEstilos<T>(fabrica: (c: Paleta, nome: NomeTema) => T): T {
  const { nome, c } = useTema();
  return useMemo(() => fabrica(c, nome), [fabrica, c, nome]);
}

/** Paleta fora de componentes (notificações, por exemplo), pela preferência e pelo sistema de agora. */
export function temaAtual(): NomeTema {
  const { tema } = obterPreferencias();
  if (tema !== 'sistema') return tema;
  return Appearance.getColorScheme() === 'light' ? 'claro' : 'escuro';
}

/**
 * Leva a escolha ao sistema também (alertas, teclado e telas nativas no mesmo tema).
 * Na web não há essa chave: lá vale o prefers-color-scheme do navegador.
 */
export function aplicarTemaNoSistema(tema: PreferenciaTema): void {
  if (Platform.OS === 'web') return;
  try {
    Appearance.setColorScheme(tema === 'sistema' ? 'unspecified' : tema === 'claro' ? 'light' : 'dark');
  } catch {
    // aparelho sem a API: segue o tema do app mesmo assim
  }
}
