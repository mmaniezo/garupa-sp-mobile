import { api } from '@/api';
import type { Consentimentos, FichaMedica, PerfilUso } from '@/api/types';
import { atualizarPreferencias, obterPreferencias } from '@/dados-locais/preferencias';

/**
 * Regras da API para as camadas opcionais do cadastro (RF02 a RF05):
 * - a ficha e o perfil só são aceitos com o consentimento de cada um (sem ele, 409);
 * - o perfil precisa de pelo menos um tipo de uso (sem nenhum, 400).
 *
 * Salvar a ficha ou o perfil na tela que explica o uso é o consentimento para guardá-los:
 * ele é registrado antes do envio e aparece marcado no Perfil, onde dá para revogar.
 */
export async function garantirConsentimento(usuarioId: string, chave: 'fichaMedica' | 'perfilDeUso'): Promise<void> {
  const consentimentos: Consentimentos = { ...obterPreferencias().consentimentos, [chave]: true };
  await api.salvarConsentimentos(usuarioId, consentimentos);
  await atualizarPreferencias({ consentimentos });
}

export async function salvarFichaNaApi(usuarioId: string, ficha: FichaMedica): Promise<void> {
  await garantirConsentimento(usuarioId, 'fichaMedica');
  await api.salvarFichaMedica(usuarioId, ficha);
}

/**
 * Envia o perfil. Sem nenhum tipo de uso a API recusa o perfil inteiro; aí ele fica só no
 * aparelho e o plano filtra os distritos aqui mesmo (servicos/plano.ts). Devolve se foi à API.
 */
export async function salvarPerfilNaApi(usuarioId: string, perfil: PerfilUso): Promise<boolean> {
  if (perfil.tiposDeUso.length === 0) return false;
  await garantirConsentimento(usuarioId, 'perfilDeUso');
  await api.salvarPerfil(usuarioId, perfil);
  return true;
}
