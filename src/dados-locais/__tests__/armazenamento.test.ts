import AsyncStorage from '@react-native-async-storage/async-storage';

import { apagarValor, apagarValoresDoApp, CHAVE_CONTAS_MOCK, gravarValor, lerValor } from '../armazenamento';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// O SQLite mockAntigo (até a v0.5.1), de onde a sessão e as preferências são copiadas uma vez.
const mockAntigo = new Map<string, unknown>();
jest.mock('@/db', () => ({
  lerValorAntigo: jest.fn(async (chave: string) => mockAntigo.get(chave) ?? null),
  apagarValorAntigo: jest.fn(async (chave: string) => void mockAntigo.delete(chave)),
}));

describe('persistência local (AsyncStorage)', () => {
  beforeEach(async () => {
    mockAntigo.clear();
    await AsyncStorage.clear();
  });

  it('grava e lê de volta o mesmo valor', async () => {
    await gravarValor('preferencias', { chuva: true, tema: 'escuro' });
    expect(await lerValor('preferencias')).toEqual({ chuva: true, tema: 'escuro' });
    expect(await AsyncStorage.getItem('@garupa/preferencias')).toBe('{"chuva":true,"tema":"escuro"}');
  });

  it('copia do SQLite mockAntigo na primeira leitura e apaga de lá', async () => {
    mockAntigo.set('sessao', { usuarioId: '7', nome: 'Léo' });
    expect(await lerValor('sessao')).toEqual({ usuarioId: '7', nome: 'Léo' });
    expect(mockAntigo.has('sessao')).toBe(false);
    expect(await AsyncStorage.getItem('@garupa/sessao')).toBe('{"usuarioId":"7","nome":"Léo"}');
  });

  it('sem nada guardado, devolve null', async () => {
    expect(await lerValor('nada')).toBeNull();
  });

  it('apaga uma chave', async () => {
    await gravarValor('turno', { situacao: 'ativo' });
    await apagarValor('turno');
    expect(await lerValor('turno')).toBeNull();
  });

  it('sair da conta apaga os dados do app, mas não as contas da API simulada', async () => {
    await gravarValor('sessao', { usuarioId: '7' });
    await gravarValor(CHAVE_CONTAS_MOCK, [{ telefone: '+5511900000000' }]);
    await AsyncStorage.setItem('outra-biblioteca', 'fica');
    await apagarValoresDoApp();
    expect(await lerValor('sessao')).toBeNull();
    expect(await lerValor(CHAVE_CONTAS_MOCK)).toEqual([{ telefone: '+5511900000000' }]);
    expect(await AsyncStorage.getItem('outra-biblioteca')).toBe('fica');
  });
});
