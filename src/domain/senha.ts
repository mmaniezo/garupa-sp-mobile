/**
 * Senha de acesso (login com telefone e senha): de 8 a 64 caracteres, com letra e número.
 * Devolve a mensagem para a pessoa ou null quando está boa. A mesma regra vale na API.
 */
export const SENHA_MIN = 8;
export const SENHA_MAX = 64;

export function problemaDaSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN) return `Use pelo menos ${SENHA_MIN} caracteres.`;
  if (senha.length > SENHA_MAX) return `Use até ${SENHA_MAX} caracteres.`;
  if (!/\p{L}/u.test(senha) || !/\d/.test(senha)) return 'Misture letras e números.';
  return null;
}
