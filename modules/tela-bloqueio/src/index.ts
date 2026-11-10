import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type ModuloNativo = {
  definirSobreBloqueioAsync(ativo: boolean): Promise<boolean>;
  estaBloqueado(): boolean;
};

// Opcional: na web, no iOS e no Expo Go o módulo não existe e tudo vira "não faz nada".
const nativo = Platform.OS === 'android' ? requireOptionalNativeModule<ModuloNativo>('GarupaTelaBloqueio') : null;

/** Liga (com SOS ativo) ou desliga a exibição do app por cima da tela de bloqueio. */
export async function definirSobreBloqueio(ativo: boolean): Promise<boolean> {
  if (!nativo) return false;
  try {
    return await nativo.definirSobreBloqueioAsync(ativo);
  } catch {
    return false;
  }
}

/** O aparelho está bloqueado agora? (false quando não dá para saber) */
export function estaBloqueado(): boolean {
  try {
    return nativo?.estaBloqueado() ?? false;
  } catch {
    return false;
  }
}

export const telaBloqueioDisponivel = nativo !== null;
