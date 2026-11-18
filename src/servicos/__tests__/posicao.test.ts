import * as Location from 'expo-location';

import { obterPosicao, registrarPosicao } from '../posicao';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4, Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const L = Location as jest.Mocked<typeof Location>;
const leitura = (lat: number, msAtras: number) =>
  ({ coords: { latitude: lat, longitude: -46.6, speed: null, accuracy: 10 }, timestamp: Date.now() - msAtras }) as never;

describe('posição para o SOS e o relato', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    L.getForegroundPermissionsAsync.mockResolvedValue({ granted: true } as never);
    registrarPosicao({ lat: -23.5, lon: -46.6, kmh: null, precisao: null, em: 0 }); // memória velha
  });

  it('não devolve a última posição do sistema se ela for mais velha que o pedido', async () => {
    L.getLastKnownPositionAsync.mockResolvedValue(leitura(-23.1, 9 * 60_000));
    L.getCurrentPositionAsync.mockResolvedValue(null as never);
    expect(await obterPosicao(2 * 60_000, 50)).toBeNull();
  });

  it('com a última posição velha, tenta uma leitura nova', async () => {
    L.getLastKnownPositionAsync.mockResolvedValue(leitura(-23.1, 9 * 60_000));
    L.getCurrentPositionAsync.mockResolvedValue(leitura(-23.7, 0));
    expect(await obterPosicao(2 * 60_000, 1_000)).toEqual({ lat: -23.7, lon: -46.6 });
  });

  it('usa a última posição do sistema quando ela é recente', async () => {
    L.getLastKnownPositionAsync.mockResolvedValue(leitura(-23.2, 30_000));
    expect(await obterPosicao(2 * 60_000, 1_000)).toEqual({ lat: -23.2, lon: -46.6 });
    expect(L.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('sem permissão, não devolve a posição velha da memória', async () => {
    L.getForegroundPermissionsAsync.mockResolvedValue({ granted: false } as never);
    expect(await obterPosicao(60_000, 50)).toBeNull();
  });
});
