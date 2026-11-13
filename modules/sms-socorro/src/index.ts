import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type ModuloNativo = {
  podeEnviar(): boolean;
  enviar(numero: string, texto: string): boolean;
};

// Opcional: na web, no iOS e no Expo Go o módulo não existe; aí o app abre o SMS pronto para enviar.
const nativo = Platform.OS === 'android' ? requireOptionalNativeModule<ModuloNativo>('GarupaSmsSocorro') : null;

/** O aparelho manda SMS sozinho (módulo presente e permissão de SMS concedida)? */
export function podeEnviarSmsDireto(): boolean {
  try {
    return nativo?.podeEnviar() ?? false;
  } catch {
    return false;
  }
}

/** Manda o SMS direto, sem abrir o app de mensagens. Devolve se o sistema aceitou o envio. */
export function enviarSmsDireto(numero: string, texto: string): boolean {
  if (!nativo) return false;
  try {
    return nativo.enviar(numero, texto);
  } catch {
    return false;
  }
}

export const smsDiretoDisponivel = nativo !== null;
