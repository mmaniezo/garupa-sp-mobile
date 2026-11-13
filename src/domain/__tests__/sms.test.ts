import { linkGoogleMaps, semAcentos, textoSmsCancelado, textoSmsSocorro } from '../sms';

describe('SMS de socorro', () => {
  const mapa = linkGoogleMaps(-23.587481234, -46.684975678);

  it('leva a localização num link do Google Maps, com 5 casas decimais', () => {
    expect(mapa).toBe('https://www.google.com/maps/search/?api=1&query=-23.58748,-46.68498');
  });

  it('cabe num SMS só (160 caracteres, sem acento) com nome comum', () => {
    const texto = textoSmsSocorro({ nome: 'Léo', tipo: 'queda', hora: '18:42', mapa });
    expect(texto).toContain('Leo pediu socorro as 18:42 (queda de moto)');
    expect(texto).toContain(mapa);
    expect(texto).toMatch(/^[\x20-\x7e]+$/);
    expect(texto.length).toBeLessThanOrEqual(160);
  });

  it('sem posição, avisa assim mesmo', () => {
    const texto = textoSmsSocorro({ nome: null, tipo: 'mal_estar', hora: '07:05', mapa: null });
    expect(texto).toContain('Seu contato pediu socorro');
    expect(texto).toContain('Local ainda indisponivel');
  });

  it('cancelamento e encerramento têm texto próprio', () => {
    expect(textoSmsCancelado('Ana Júlia', false)).toBe('Garupa SP: Ana Julia esta bem. O SOS foi cancelado.');
    expect(textoSmsCancelado(null, true)).toContain('ja foi atendido');
  });

  it('tira os acentos do português', () => {
    expect(semAcentos('Ação, São João, Ítalo')).toBe('Acao, Sao Joao, Italo');
  });
});
