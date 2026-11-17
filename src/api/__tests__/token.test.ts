import { assinarSessaoExpirada, conferirValidadeDoToken, definirToken, sessaoExpirada } from '../token';

function jwtDeTeste(conteudo: object): string {
  const b64url = (o: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(conteudo)}.assinatura`;
}

describe('validade da sessão', () => {
  afterEach(() => definirToken(null));

  it('marca a sessão como vencida quando passa da hora, sem esperar a API recusar', () => {
    const exp = Date.now() / 1000 + 3600;
    definirToken(jwtDeTeste({ sub: '7', exp }));
    conferirValidadeDoToken();
    expect(sessaoExpirada()).toBe(false);
    conferirValidadeDoToken(exp * 1000 + 1);
    expect(sessaoExpirada()).toBe(true);
  });

  it('entrar de novo (token novo) avisa quem acompanha a sessão', () => {
    definirToken(jwtDeTeste({ sub: '7', exp: Date.now() / 1000 - 1 }));
    expect(sessaoExpirada()).toBe(true);
    const visto: boolean[] = [];
    const parar = assinarSessaoExpirada(() => visto.push(sessaoExpirada()));
    definirToken(jwtDeTeste({ sub: '7', exp: Date.now() / 1000 + 3600 }));
    parar();
    expect(visto).toEqual([false]);
  });
});
