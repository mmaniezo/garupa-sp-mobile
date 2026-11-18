import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/** Uma leitura do acelerômetro, em g, com a hora (ms) em que o sensor leu. */
export type LeituraAcelerometro = { x: number; y: number; z: number; em: number };

type ModuloNativo = {
  disponivel(): boolean;
  ligar(intervaloMs: number): boolean;
  desligar(): void;
  addListener(evento: 'onLeitura', ouvinte: (l: LeituraAcelerometro) => void): { remove(): void };
};

// Só no Android com o build do app; no Expo Go, na web e no iOS, o turno usa o expo-sensors.
const nativo = Platform.OS === 'android' ? requireOptionalNativeModule<ModuloNativo>('GarupaSensorQueda') : null;

/**
 * Liga o acelerômetro que segue com a tela bloqueada e entrega cada leitura. Devolve como parar
 * (ou null sem o módulo ou sem acelerômetro: aí quem chama usa o expo-sensors).
 */
export function ouvirAcelerometro(
  intervaloMs: number,
  aoLer: (l: LeituraAcelerometro) => void,
): { remove(): void } | null {
  if (!nativo) return null;
  try {
    if (!nativo.disponivel()) return null;
    const assinatura = nativo.addListener('onLeitura', aoLer);
    if (!nativo.ligar(intervaloMs)) {
      assinatura.remove();
      return null;
    }
    return {
      remove() {
        assinatura.remove();
        try {
          nativo.desligar();
        } catch {
          // já desligado
        }
      },
    };
  } catch {
    return null;
  }
}

export const sensorDeQuedaNativo = nativo !== null;
