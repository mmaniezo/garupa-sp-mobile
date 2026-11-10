import {
  contextoInicial,
  processarEvento,
  segundosRestantes,
  type ContextoQueda,
  type EfeitoQueda,
  type EventoQueda,
} from '../detector';

/**
 * Cenários do detector como suíte de teste (seção 7, item 4, e test cases de F04 e F05).
 * Acelerômetro a 20 Hz e GPS a 1 Hz, como no turno ativo.
 */

type Linha = { ate: number; kmh: number; g: number; ruido?: number };

/** Gera os eventos de um trajeto: em cada trecho, velocidade e aceleração constantes. */
function trajeto(trechos: Linha[], picos: { em: number; g: number }[] = []): EventoQueda[] {
  const eventos: EventoQueda[] = [];
  let inicio = 0;
  let semente = 1;
  const aleatorio = () => {
    semente = (semente * 16807) % 2147483647;
    return semente / 2147483647 - 0.5;
  };
  for (const t of trechos) {
    for (let ms = inicio; ms < t.ate; ms += 50) {
      const pico = picos.find((p) => p.em === ms);
      const ruido = (t.ruido ?? 0.03) * aleatorio() * 2;
      eventos.push({ tipo: 'aceleracao', em: ms, x: 0, y: 0, z: pico ? pico.g : t.g + ruido });
      if (ms % 1000 === 0) eventos.push({ tipo: 'velocidade', em: ms, kmh: t.kmh });
    }
    inicio = t.ate;
  }
  return eventos;
}

function rodar(eventos: EventoQueda[], ctx: ContextoQueda = contextoInicial(0)) {
  const efeitos: EfeitoQueda[] = [];
  for (const e of eventos) {
    const r = processarEvento(ctx, e);
    ctx = r.contexto;
    efeitos.push(...r.efeitos);
  }
  return { ctx, efeitos };
}

describe('detector de queda (F04)', () => {
  it('queda a 40 km/h seguida de imobilidade abre a contagem', () => {
    const { ctx, efeitos } = rodar(
      trajeto(
        [
          { ate: 10_000, kmh: 40, g: 1, ruido: 0.3 },
          { ate: 25_000, kmh: 0, g: 1, ruido: 0.02 },
        ],
        [{ em: 10_000, g: 6 }],
      ),
    );
    expect(efeitos).toEqual(['iniciar_contagem']);
    expect(ctx.estado).toBe('contagem');
    expect(ctx.origem).toBe('celular');
  });

  it('buraco forte sem queda de velocidade não abre', () => {
    const { ctx, efeitos } = rodar(trajeto([{ ate: 30_000, kmh: 40, g: 1, ruido: 0.3 }], [{ em: 10_000, g: 5 }]));
    expect(efeitos).toEqual([]);
    expect(ctx.estado).toBe('monitorando');
  });

  it('parada brusca no semáforo, sem impacto, não abre', () => {
    const { efeitos } = rodar(
      trajeto([
        { ate: 10_000, kmh: 40, g: 1, ruido: 0.3 },
        { ate: 12_000, kmh: 15, g: 1.6 },
        { ate: 30_000, kmh: 0, g: 1 },
      ]),
    );
    expect(efeitos).toEqual([]);
  });

  it('celular derrubado parado em casa não abre', () => {
    const { efeitos } = rodar(trajeto([{ ate: 30_000, kmh: 0, g: 1 }], [{ em: 5_000, g: 7 }]));
    expect(efeitos).toEqual([]);
  });

  it('celular na mochila em freada forte não abre', () => {
    const { efeitos } = rodar(
      trajeto([
        { ate: 10_000, kmh: 45, g: 1, ruido: 0.4 },
        { ate: 13_000, kmh: 10, g: 1.9 },
        { ate: 30_000, kmh: 0, g: 1 },
      ]),
    );
    expect(efeitos).toEqual([]);
  });

  it('impacto com parada, mas a pessoa se mexe (levantou), não abre', () => {
    const { ctx, efeitos } = rodar(
      trajeto(
        [
          { ate: 10_000, kmh: 40, g: 1, ruido: 0.3 },
          { ate: 30_000, kmh: 0, g: 1, ruido: 0.8 },
        ],
        [{ em: 10_000, g: 6 }],
      ),
    );
    expect(efeitos).toEqual([]);
    expect(ctx.estado).toBe('monitorando');
  });
});

describe('contagem e cancelamento (F05, RB01, RNF04)', () => {
  function emContagem() {
    return rodar(
      trajeto(
        [
          { ate: 10_000, kmh: 40, g: 1 },
          { ate: 25_000, kmh: 0, g: 1, ruido: 0.02 },
        ],
        [{ em: 10_000, g: 6 }],
      ),
    ).ctx;
  }

  it('sem resposta, envia o SOS ao fim dos 30 s', () => {
    const ctx = emContagem();
    const inicio = ctx.desde;
    expect(segundosRestantes(ctx, inicio)).toBe(30);
    const quase = processarEvento(ctx, { tipo: 'tempo', em: inicio + 29_999 });
    expect(quase.efeitos).toEqual([]);
    const fim = processarEvento(quase.contexto, { tipo: 'tempo', em: inicio + 30_000 });
    expect(fim.efeitos).toEqual(['enviar_sos']);
    expect(fim.contexto.estado).toBe('sos_enviado');
  });

  it('toque aos 29 s cancela e volta a monitorar', () => {
    const ctx = emContagem();
    const r = processarEvento(ctx, { tipo: 'cancelar', em: ctx.desde + 29_000 });
    expect(r.efeitos).toEqual(['contagem_cancelada']);
    expect(r.contexto.estado).toBe('monitorando');
    expect(processarEvento(r.contexto, { tipo: 'tempo', em: ctx.desde + 31_000 }).efeitos).toEqual([]);
  });

  it('cancelar depois do SOS enviado não apaga o evento (quem cancela é o SOS)', () => {
    const ctx = emContagem();
    const enviado = processarEvento(ctx, { tipo: 'tempo', em: ctx.desde + 30_000 }).contexto;
    const r = processarEvento(enviado, { tipo: 'cancelar', em: ctx.desde + 31_000 });
    expect(r.contexto.estado).toBe('sos_enviado');
    expect(r.efeitos).toEqual([]);
  });

  it('impacto da pulseira abre a contagem direto e não duplica (RF28)', () => {
    const r = processarEvento(contextoInicial(0), { tipo: 'impacto_externo', em: 1_000, origem: 'vestivel' });
    expect(r.efeitos).toEqual(['iniciar_contagem']);
    expect(r.contexto.origem).toBe('vestivel');
    const de_novo = processarEvento(r.contexto, { tipo: 'impacto_externo', em: 2_000, origem: 'vestivel' });
    expect(de_novo.efeitos).toEqual([]);
    expect(de_novo.contexto.fimContagemEm).toBe(31_000);
  });
});
