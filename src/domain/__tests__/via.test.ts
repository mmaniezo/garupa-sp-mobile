import { nomeDaVia } from '../via';

describe('nome da via (Infosiga em maiúsculas)', () => {
  it('fica em maiúsculas e minúsculas, com "de", "da", "dos" em minúsculas', () => {
    expect(nomeDaVia('AVENIDA DOS BANDEIRANTES')).toBe('Avenida dos Bandeirantes');
    expect(nomeDaVia('RUA DOUTOR CARLOS NORBERTO DE SOUZA ARANHA')).toBe('Rua Doutor Carlos Norberto de Souza Aranha');
    expect(nomeDaVia('ESTRADA DAS LAGRIMAS')).toBe('Estrada das Lagrimas');
  });

  it('mantém rodovia, número e numeral romano; espaço duplo vira hífen', () => {
    expect(nomeDaVia('SP 270')).toBe('SP 270');
    expect(nomeDaVia('AVENIDA PIO XII')).toBe('Avenida Pio XII');
    expect(nomeDaVia('ACESSO RADIAL LESTE  CENTRO')).toBe('Acesso Radial Leste - Centro');
    expect(nomeDaVia('ACESSO AV JACU PESSEGO  MAUA')).toBe('Acesso Av. Jacu Pessego - Maua');
    expect(nomeDaVia('RUA CIVIL')).toBe('Rua Civil');
  });

  it('não mexe no que já vem escrito normalmente', () => {
    expect(nomeDaVia('Marginal Pinheiros / Av. Santo Amaro')).toBe('Marginal Pinheiros / Av. Santo Amaro');
    expect(nomeDaVia('Sem registro de via (distrito Mandaqui)')).toBe('Sem registro de via (distrito Mandaqui)');
  });
});
