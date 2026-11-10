import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { FichaMedica } from '@/api/types';
import { apagarValor, gravarValor, lerValor } from '@/db';

/**
 * Dados sensíveis no aparelho: ficha médica (saúde) e contatos de emergência (telefone).
 * Ficam no armazenamento seguro do sistema (Keystore no Android, Keychain no iOS),
 * criptografados, e não no SQLite. Na prévia web, que não tem esse armazenamento,
 * caem no banco comum só para a tela funcionar.
 */

export type ContatoLocal = { contatoId: string | null; nome: string; telefone: string };

const CHAVE_FICHA = 'garupa.ficha';
const CHAVE_CONTATOS = 'garupa.contatos';
const web = Platform.OS === 'web';

async function ler<T>(chave: string): Promise<T | null> {
  if (web) return lerValor<T>(chave);
  const bruto = await SecureStore.getItemAsync(chave);
  return bruto ? (JSON.parse(bruto) as T) : null;
}

async function gravar(chave: string, valor: unknown): Promise<void> {
  if (web) return gravarValor(chave, valor);
  await SecureStore.setItemAsync(chave, JSON.stringify(valor));
}

async function apagar(chave: string): Promise<void> {
  if (web) return apagarValor(chave);
  await SecureStore.deleteItemAsync(chave);
}

export const lerFicha = () => ler<FichaMedica>(CHAVE_FICHA);
export const gravarFicha = (ficha: FichaMedica) => gravar(CHAVE_FICHA, ficha);

export async function lerContatos(): Promise<ContatoLocal[]> {
  return (await ler<ContatoLocal[]>(CHAVE_CONTATOS)) ?? [];
}
export const gravarContatos = (contatos: ContatoLocal[]) => gravar(CHAVE_CONTATOS, contatos);

export function fichaTemDados(f: FichaMedica | null): boolean {
  return !!f && [f.tipoSanguineo, f.alergias, f.condicoes, f.medicamentos].some((v) => !!v?.trim());
}

export async function apagarDadosSeguros(): Promise<void> {
  await Promise.all([apagar(CHAVE_FICHA), apagar(CHAVE_CONTATOS)]);
}
