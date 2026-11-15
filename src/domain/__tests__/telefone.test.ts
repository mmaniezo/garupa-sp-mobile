import { mascararTelefone, validarCelular, validarTelefone } from '../telefone';

describe('validarTelefone (RF01)', () => {
  it.each([
    ['(11) 90000-0000', '+5511900000000', '(11) 90000-0000'],
    ['11 3000-0000', '+551130000000', '(11) 3000-0000'],
    ['+55 21 98888-7777', '+5521988887777', '(21) 98888-7777'],
    ['5599912345678', '+5599912345678', '(99) 91234-5678'],
  ])('aceita %s', (entrada, e164, exibicao) => {
    expect(validarTelefone(entrada)).toEqual({ valido: true, e164, exibicao });
  });

  it.each([
    ['', 'vazio'],
    ['(10) 90000-0000', 'DDD abaixo de 11'],
    ['(01) 90000-0000', 'DDD começando com 0'],
    ['(11) 900-000', 'número curto'],
    ['(11) 900000-00000', 'número longo'],
    ['abc', 'sem dígitos'],
  ])('recusa %s (%s)', (entrada) => {
    expect(validarTelefone(entrada).valido).toBe(false);
  });
});

describe('mascararTelefone', () => {
  it('formata enquanto digita', () => {
    expect(mascararTelefone('1')).toBe('(1');
    expect(mascararTelefone('11')).toBe('(11');
    expect(mascararTelefone('119')).toBe('(11) 9');
    expect(mascararTelefone('1130000000')).toBe('(11) 3000-0000');
    expect(mascararTelefone('11900000000')).toBe('(11) 90000-0000');
  });

  it('tira o +55 e corta o excesso', () => {
    expect(mascararTelefone('+55 11 90000-0000')).toBe('(11) 90000-0000');
    expect(mascararTelefone('119000000001234')).toBe('(11) 90000-0000');
  });
});

describe('validarCelular: o 9 depois do DDD (SMS do socorro)', () => {
  it('aceita celular com 9 dígitos começando com 9, com ou sem +55', () => {
    expect(validarCelular('(11) 98888-7777')).toEqual({ valido: true, e164: '+5511988887777', exibicao: '(11) 98888-7777' });
    expect(validarCelular('+55 21 99999-0000')).toMatchObject({ valido: true, e164: '+5521999990000' });
  });

  it('celular sem o 9 da frente: avisa e sugere o número com o 9', () => {
    expect(validarCelular('(11) 8888-7777')).toMatchObject({ valido: false, motivo: 'falta9', sugestao: '(11) 98888-7777' });
    expect(validarCelular('+55 21 9999-0000')).toMatchObject({ motivo: 'falta9', sugestao: '(21) 99999-0000' });
    expect(validarCelular('1170001234')).toMatchObject({ motivo: 'falta9', sugestao: '(11) 97000-1234' });
  });

  it('telefone fixo não recebe SMS', () => {
    expect(validarCelular('(11) 3000-0000')).toMatchObject({ valido: false, motivo: 'fixo' });
    expect(validarCelular('(11) 2345-6789')).toMatchObject({ motivo: 'fixo' });
  });

  it('formato errado ou 11 dígitos sem o 9', () => {
    expect(validarCelular('(11) 900-000')).toMatchObject({ valido: false, motivo: 'formato' });
    expect(validarCelular('(11) 88888-7777')).toMatchObject({ valido: false, motivo: 'formato' });
    expect(validarCelular('')).toMatchObject({ valido: false, motivo: 'formato' });
  });
});
