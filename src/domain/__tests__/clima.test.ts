import { CENTRO_SP, chovendoAgora, pontoAproximado, urlDoTempoAtual } from '../clima';

describe('chuva pela previsão do tempo', () => {
  it('chove quando há precipitação nos últimos 15 minutos', () => {
    expect(chovendoAgora({ precipitation: 0.2, rain: 0.2, showers: 0, weather_code: 61 })).toBe(true);
    expect(chovendoAgora({ precipitation: 0, rain: 0, showers: 0.1, weather_code: 3 })).toBe(true);
  });

  it('garoa e trovoada contam como chuva, mesmo sem milímetros medidos', () => {
    expect(chovendoAgora({ precipitation: 0, weather_code: 51 })).toBe(true);
    expect(chovendoAgora({ precipitation: 0, weather_code: 95 })).toBe(true);
  });

  it('nublado ou céu limpo é seco', () => {
    expect(chovendoAgora({ precipitation: 0, rain: 0, showers: 0, weather_code: 3 })).toBe(false);
    expect(chovendoAgora({ precipitation: null, weather_code: 0 })).toBe(false);
    expect(chovendoAgora({})).toBe(false);
  });

  it('a posição sai arredondada em cerca de 5 km', () => {
    expect(pontoAproximado({ lat: -23.5617, lon: -46.6559 })).toEqual({ lat: -23.55, lon: -46.65 });
    expect(pontoAproximado({ lat: -23.5874, lon: -46.6789 })).toEqual({ lat: -23.6, lon: -46.7 });
  });

  it('a consulta pede só o tempo atual, com a posição aproximada', () => {
    const url = urlDoTempoAtual({ lat: -23.5617, lon: -46.6559 });
    expect(url).toContain('latitude=-23.55&longitude=-46.65');
    expect(url).toContain('current=precipitation,rain,showers,weather_code');
    expect(url).not.toContain('5617');
    expect(urlDoTempoAtual(CENTRO_SP)).toContain('latitude=-23.55&longitude=-46.65');
  });
});
