import type { CelulaCritica, Mensagem } from '@/api/types';

import { contarPalavras, escolherAlerta, TITULO_BANNER_ALERTA } from '../alertas';
import { escolherMensagem } from '../mensagens';
import { faixasDoPeriodo, horariosHabituais } from '../periodos';

const ponto = (celulaId: string, lat: number, lon: number, percentil = 97): CelulaCritica => ({
  celulaId,
  centroLat: lat,
  centroLon: lon,
  score: 0.9,
  percentil,
  viaReferencia: 'Via de exemplo',
});

// ~0,0009° de latitude ≈ 100 m
const aqui = { lat: -23.56, lon: -46.69 };

describe('alerta por localização (F14, RB04)', () => {
  const pontos = [ponto('perto', -23.5609, -46.69), ponto('longe', -23.57, -46.69)];

  it('avisa ao entrar no raio de um ponto crítico', () => {
    expect(escolherAlerta(aqui, pontos, new Set(), [], 0)?.ponto.celulaId).toBe('perto');
  });

  it('voltar ao mesmo ponto no turno não gera segundo aviso', () => {
    expect(escolherAlerta(aqui, pontos, new Set(['perto']), [], 0)).toBeNull();
  });

  it('respeita o limite de 3 avisos por hora', () => {
    const agora = 2 * 60 * 60 * 1000;
    const recentes = [agora - 1000, agora - 2000, agora - 3000];
    expect(escolherAlerta(aqui, pontos, new Set(), recentes, agora)).toBeNull();
    const antigos = [agora - 61 * 60 * 1000, agora - 2000, agora - 3000];
    expect(escolherAlerta(aqui, pontos, new Set(), antigos, agora)).not.toBeNull();
  });

  it('ignora células abaixo do percentil de corte', () => {
    expect(escolherAlerta(aqui, [ponto('baixo', -23.5601, -46.69, 90)], new Set(), [], 0)).toBeNull();
  });

  it('o banner tem no máximo 6 palavras (RB17)', () => {
    expect(contarPalavras(TITULO_BANNER_ALERTA)).toBeLessThanOrEqual(6);
  });
});

describe('mensagens de conscientização (F15, RB05)', () => {
  const m = (id: string): Mensagem => ({ id, texto: id, fonte: 'fonte' });

  it('não repete a última mostrada', () => {
    expect(escolherMensagem([m('a'), m('b')], ['a'], new Set())?.id).toBe('b');
  });

  it('prefere a que não aparece há mais tempo', () => {
    expect(escolherMensagem([m('a'), m('b'), m('c')], ['a', 'b'], new Set())?.id).toBe('c');
    expect(escolherMensagem([m('a'), m('b'), m('c')], ['c', 'a', 'b'], new Set())?.id).toBe('b');
  });

  it('dispensada não volta e, sem outra, não mostra nada', () => {
    expect(escolherMensagem([m('a'), m('b')], [], new Set(['a']))?.id).toBe('b');
    expect(escolherMensagem([m('a')], ['a'], new Set())).toBeNull();
  });
});

describe('perfil de uso: períodos viram faixas do contrato (F13)', () => {
  it('jantar (18h–22h) cai nas faixas 4 e 5', () => {
    expect(faixasDoPeriodo('jantar')).toEqual([4, 5]);
  });

  it('madrugada atravessa a meia-noite', () => {
    expect(faixasDoPeriodo('madrugada')).toEqual([0, 1, 5]);
  });

  it('cruza períodos e dias sem repetir', () => {
    const h = horariosHabituais(['almoco', 'jantar'], ['util', 'sabado']);
    expect(h).toHaveLength(8);
    expect(new Set(h.map((x) => `${x.tipoDia}-${x.faixaHoraria}`)).size).toBe(8);
  });
});
