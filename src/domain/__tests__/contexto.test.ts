import { faixaHoraria, rotuloFaixa, tipoDia } from '../contexto';

// Datas no horário local do aparelho (new Date(ano, mês, dia, hora)).
describe('faixaHoraria', () => {
  it('divide o dia em seis faixas de 4 horas', () => {
    expect(faixaHoraria(new Date(2026, 10, 9, 0, 0))).toBe(0);
    expect(faixaHoraria(new Date(2026, 10, 9, 3, 59))).toBe(0);
    expect(faixaHoraria(new Date(2026, 10, 9, 4, 0))).toBe(1);
    expect(faixaHoraria(new Date(2026, 10, 9, 12, 30))).toBe(3);
    expect(faixaHoraria(new Date(2026, 10, 9, 19, 0))).toBe(4);
    expect(faixaHoraria(new Date(2026, 10, 9, 23, 59))).toBe(5);
  });

  it('rotula as faixas', () => {
    expect(rotuloFaixa(0)).toBe('00h–04h');
    expect(rotuloFaixa(5)).toBe('20h–00h');
  });
});

describe('tipoDia', () => {
  it('separa dia útil, sábado e domingo', () => {
    expect(tipoDia(new Date(2026, 10, 9))).toBe('util'); // segunda, 09/11/2026
    expect(tipoDia(new Date(2026, 10, 14))).toBe('sabado');
    expect(tipoDia(new Date(2026, 10, 15))).toBe('domingo');
  });
});
