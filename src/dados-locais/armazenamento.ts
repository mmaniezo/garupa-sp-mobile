import AsyncStorage from '@react-native-async-storage/async-storage';

import { apagarValorAntigo, lerValorAntigo } from '@/db';

/**
 * Persistência local de chave e valor, com AsyncStorage: sessão, preferências, estado do turno,
 * lista de distritos, estado do SMS do SOS, métricas do cadastro e avaliações dos alertas.
 * Telas e serviços passam por aqui; ninguém chama o AsyncStorage direto.
 *
 * O resto da persistência tem lugar próprio:
 * - SQLite (src/db, dados-locais/repositorios.ts): o que precisa de consulta, ordem e fila
 *   (fila do SOS e dos relatos, cache do plano, turnos, alertas e visitas);
 * - armazenamento seguro (dados-locais/seguro.ts): ficha médica, contatos e o token.
 */

const PREFIXO = '@garupa/';

/** Contas da API simulada: o "servidor" do protótipo sem API. Sair da conta não as apaga. */
export const CHAVE_CONTAS_MOCK = 'mock.contas';

/** Sem AsyncStorage (raro: armazenamento cheio ou indisponível), o app segue com a memória. */
const reserva = new Map<string, string>();

function converter<T>(bruto: string): T | null {
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return null;
  }
}

export async function lerValor<T>(chave: string): Promise<T | null> {
  let bruto: string | null;
  try {
    bruto = await AsyncStorage.getItem(PREFIXO + chave);
  } catch {
    bruto = reserva.get(chave) ?? null;
  }
  if (bruto !== null) return converter<T>(bruto);

  // Até a v0.5.1 isto ficava numa tabela do SQLite: na primeira leitura, passa para cá.
  const antigo = await lerValorAntigo<T>(chave);
  if (antigo !== null) {
    await gravarValor(chave, antigo);
    await apagarValorAntigo(chave);
  }
  return antigo;
}

export async function gravarValor(chave: string, valor: unknown): Promise<void> {
  const json = JSON.stringify(valor);
  try {
    await AsyncStorage.setItem(PREFIXO + chave, json);
    reserva.delete(chave);
  } catch {
    reserva.set(chave, json);
  }
}

export async function apagarValor(chave: string): Promise<void> {
  reserva.delete(chave);
  try {
    await AsyncStorage.removeItem(PREFIXO + chave);
  } catch {
    // nada guardado
  }
  await apagarValorAntigo(chave);
}

/** Sair ou excluir a conta: apaga tudo o que o app guardou aqui, menos as contas do mock. */
export async function apagarValoresDoApp(): Promise<void> {
  for (const chave of [...reserva.keys()]) if (chave !== CHAVE_CONTAS_MOCK) reserva.delete(chave);
  try {
    const chaves = (await AsyncStorage.getAllKeys()).filter(
      (c) => c.startsWith(PREFIXO) && c !== PREFIXO + CHAVE_CONTAS_MOCK,
    );
    if (chaves.length > 0) await AsyncStorage.multiRemove(chaves);
  } catch {
    // nada guardado
  }
}
