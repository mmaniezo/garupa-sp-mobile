import { LETRAS, SP_TRANSFORM } from '../logo-abertura-desenho';
import {
  anguloViseira,
  camera,
  DURACAO_ABERTURA,
  estalo,
  opacidadeGeral,
  opacidadeLetra,
  opacidadeReflexo,
  posicaoLetra,
  saidaLetra,
  sp,
} from '../logo-abertura-tempo';
import { LOGO_HORIZONTAL_BRANCA_XML } from '../logo-xml';

const fim = DURACAO_ABERTURA;

describe('motion da logo', () => {
  it('começa invisível, com a viseira aberta e as letras na viseira', () => {
    expect(opacidadeGeral(0)).toBe(0);
    expect(anguloViseira(0)).toBe(-30);
    for (let i = 0; i < LETRAS.length; i++) {
      expect(opacidadeLetra(0, i)).toBe(0);
      expect(posicaoLetra(saidaLetra(0, i))).toEqual({ x: -412, y: -439, escala: 1 });
    }
    expect(sp(0).opacidade).toBeCloseTo(0, 6);
    expect(opacidadeReflexo(0)).toBe(0);
  });

  it('na fase do capacete, ele fica maior e centralizado na caixa da logo', () => {
    const c = camera(1.2);
    expect(c.escala).toBeCloseTo(0.66 / 0.5238, 4);
    // Centro do capacete (≈ 618, 586 nas coordenadas da logo) perto do centro da caixa (1327, 586).
    expect(c.x + c.escala * 618).toBeCloseTo(1327, -2);
    expect(c.y + c.escala * 586).toBeCloseTo(586, -2);
  });

  it('a viseira fecha com um estalo e volta ao lugar', () => {
    expect(anguloViseira(1.6)).toBeCloseTo(0, 6);
    expect(estalo(1.66)).toBeCloseTo(7, 6);
    expect(estalo(1.9)).toBeCloseTo(0, 6);
  });

  it('termina exatamente na logo horizontal parada', () => {
    expect(opacidadeGeral(fim)).toBe(1);
    const c = camera(fim);
    expect(c.escala).toBeCloseTo(1, 6);
    expect(c.x).toBeCloseTo(0, 6);
    expect(c.y).toBeCloseTo(0, 6);
    expect(anguloViseira(fim)).toBeCloseTo(0, 6);
    expect(estalo(fim)).toBeCloseTo(0, 6);
    expect(opacidadeReflexo(fim)).toBe(1);
    expect(sp(fim)).toEqual({ opacidade: 1, escala: 1 });

    // O nome da logo parada: translate(1357 300) scale(1.3) translate(-839 -771).
    expect(LOGO_HORIZONTAL_BRANCA_XML).toContain('transform="translate(1357 300) scale(1.3) translate(-839 -771)"');
    const nome = { x: 1357 - 1.3 * 839, y: 300 - 1.3 * 771 };
    for (let i = 0; i < LETRAS.length; i++) {
      expect(opacidadeLetra(fim, i)).toBe(1);
      const p = posicaoLetra(saidaLetra(fim, i));
      expect(p.x).toBeCloseTo(nome.x, 6);
      expect(p.y).toBeCloseTo(nome.y, 6);
      expect(p.escala).toBeCloseTo(1.3, 6);
    }

    // O "SP" usa a mesma transformação da logo parada.
    expect(LOGO_HORIZONTAL_BRANCA_XML).toContain(SP_TRANSFORM.replace('2417.41 779.38', '2417.4 779.4'));
  });

  it('as letras surgem em ordem e saem de trás para a frente', () => {
    expect(opacidadeLetra(0.9, 0)).toBeGreaterThan(opacidadeLetra(0.9, 1));
    expect(saidaLetra(1.85, 5)).toBeGreaterThan(saidaLetra(1.85, 0));
  });
});
