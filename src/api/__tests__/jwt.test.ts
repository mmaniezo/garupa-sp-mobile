import { lerJwt, tokenVencido, usuarioDoToken } from '../jwt';

/** Token no formato da API (cabeçalho.conteúdo.assinatura, em base64url). A assinatura não importa aqui. */
function jwtDeTeste(conteudo: object): string {
  const b64url = (o: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(conteudo)}.assinatura`;
}

describe('token da API (JWT)', () => {
  const agora = Date.parse('2026-11-16T12:00:00Z');

  it('lê o usuário do campo sub, como a API manda', () => {
    const token = jwtDeTeste({ sub: '42', exp: agora / 1000 + 3600, iss: 'garupa-api', aud: 'garupa-app' });
    expect(lerJwt(token)).toMatchObject({ sub: '42', iss: 'garupa-api' });
    expect(usuarioDoToken(token)).toBe('42');
  });

  it('sub que não é número ou token mal formado: sem usuário', () => {
    expect(usuarioDoToken(jwtDeTeste({ sub: 'usr-1' }))).toBeNull();
    expect(usuarioDoToken('mock.123')).toBeNull();
    expect(usuarioDoToken('a.%%%.c')).toBeNull();
  });

  it('venceu quando o exp (em segundos) já passou; sem exp, não vence', () => {
    expect(tokenVencido(jwtDeTeste({ sub: '1', exp: agora / 1000 - 1 }), agora)).toBe(true);
    expect(tokenVencido(jwtDeTeste({ sub: '1', exp: agora / 1000 + 3600 }), agora)).toBe(false);
    expect(tokenVencido('mock.123', agora)).toBe(false);
  });

  it('decodifica acentos no conteúdo (UTF-8)', () => {
    expect(lerJwt(jwtDeTeste({ sub: '7', nome: 'Léo' }))).toMatchObject({ nome: 'Léo' });
  });
});
