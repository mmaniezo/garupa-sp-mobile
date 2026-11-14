/**
 * Token da conta (devolvido pelo login). O cliente HTTP manda em toda chamada como
 * `Authorization: Bearer`; o aparelho guarda no armazenamento seguro (dados-locais/seguro).
 */
let token: string | null = null;

export function definirToken(novo: string | null): void {
  token = novo;
}

export function tokenAtual(): string | null {
  return token;
}
