import { criarStore } from '@/lib/store';

import { tokenVencido } from './jwt';

/**
 * Token da conta (devolvido pelo cadastro e pelo login). O cliente HTTP manda em toda chamada
 * como `Authorization: Bearer`; o aparelho guarda no armazenamento seguro (dados-locais/seguro).
 *
 * Na API de produção o token vale 1 hora e não há renovação: quando ele vence, a API responde
 * 401 e a pessoa precisa entrar de novo com a senha. Os dados do aparelho continuam.
 */
let token: string | null = null;
const expirada = criarStore(false);

/** `true` quando o token venceu (ou a API recusou): o app pede para entrar de novo. */
export const useSessaoExpirada = expirada.useStore;
export const sessaoExpirada = expirada.obter;
export const assinarSessaoExpirada = expirada.assinar;

export function definirToken(novo: string | null): void {
  token = novo;
  expirada.definir(novo ? tokenVencido(novo) : false);
}

export function tokenAtual(): string | null {
  return token;
}

/** O token passou da validade (1 hora)? Marca a sessão como vencida antes de uma chamada falhar. */
export function conferirValidadeDoToken(agora = Date.now()): void {
  if (token && !expirada.obter() && tokenVencido(token, agora)) expirada.definir(true);
}

/** A API respondeu 401 a uma chamada feita com token: ele venceu ou não vale mais. */
export function marcarSessaoExpirada(): void {
  if (token) expirada.definir(true);
}
