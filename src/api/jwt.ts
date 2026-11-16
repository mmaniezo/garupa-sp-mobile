/**
 * Leitura do token da API (JWT). O app só lê o conteúdo: quem confere a assinatura é a API.
 * O login devolve só o token e a validade; o id do usuário vem dentro dele, no campo `sub`.
 */

type ConteudoJwt = { sub?: string; exp?: number };

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64url para texto, sem depender de atob nem de TextDecoder (que variam entre motores JS). */
function base64UrlParaTexto(b64url: string): string {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of b64url.replace(/-/g, '+').replace(/_/g, '/')) {
    if (ch === '=') break;
    const valor = ALFABETO.indexOf(ch);
    if (valor < 0) throw new Error('Base64 inválido.');
    buffer = ((buffer << 6) | valor) & 0xffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return decodeURIComponent(bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join(''));
}

export function lerJwt(token: string): ConteudoJwt | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const conteudo = JSON.parse(base64UrlParaTexto(partes[1])) as unknown;
    return conteudo && typeof conteudo === 'object' ? (conteudo as ConteudoJwt) : null;
  } catch {
    return null;
  }
}

/** Id do usuário dono do token (o `sub`), como texto. */
export function usuarioDoToken(token: string): string | null {
  const sub = lerJwt(token)?.sub;
  return sub !== undefined && /^\d+$/.test(String(sub)) ? String(sub) : null;
}

/** O token já venceu? Sem validade legível (o token do mock, por exemplo), conta como válido. */
export function tokenVencido(token: string, agora = Date.now()): boolean {
  const exp = lerJwt(token)?.exp;
  return typeof exp === 'number' && exp * 1000 <= agora;
}
