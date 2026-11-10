/**
 * Detector de queda: a mesma máquina de estados do contrato, no app e no vestível.
 *
 *   monitorando → impacto_candidato → verificando_imobilidade → contagem (30 s) → sos_enviado
 *   "cancelar" leva de volta a monitorando em qualquer ponto da contagem.
 *
 * Uma queda exige as três coisas juntas (RB02, RF18):
 *  1. impacto forte (pico do acelerômetro);
 *  2. queda brusca de velocidade (GPS): a moto andava e parou logo depois do impacto;
 *  3. imobilidade: o celular fica quase parado por alguns segundos.
 * Só GPS não serve (parada brusca no semáforo), só acelerômetro também não (buraco).
 *
 * Função pura: recebe o contexto e um evento e devolve o novo contexto e os efeitos.
 * Quem chama (o serviço do turno) executa os efeitos: alarme, notificação, envio do SOS.
 * Os limiares são "propostas" a calibrar com os cenários de teste de QA.
 */

export type EstadoQueda =
  | 'monitorando'
  | 'impacto_candidato'
  | 'verificando_imobilidade'
  | 'contagem'
  | 'sos_enviado';

export type OrigemQueda = 'celular' | 'vestivel';

export type LimiaresQueda = {
  /** Pico de aceleração (em g) que conta como impacto forte. */
  impactoG: number;
  /** Depois do impacto, tempo para a velocidade cair. */
  janelaVelocidadeMs: number;
  /** Velocidade antes do impacto: a moto estava andando. */
  velocidadeAntesMinKmh: number;
  /** Velocidade depois: a moto parou. */
  velocidadeDepoisMaxKmh: number;
  /** Diferença mínima entre antes e depois. */
  quedaVelocidadeMinKmh: number;
  /** Quanto tempo de imobilidade confirma a queda. */
  imobilidadeMs: number;
  /** Desvio-padrão máximo do módulo da aceleração (g) para considerar imóvel. */
  variacaoImovelG: number;
  /** Se voltar a andar acima disso, não houve queda (ou a pessoa seguiu viagem). */
  movimentoRetomadoKmh: number;
  /** Contagem antes do SOS automático (RB01). */
  contagemMs: number;
};

export const LIMIARES_PADRAO: LimiaresQueda = {
  impactoG: 3.5,
  janelaVelocidadeMs: 6_000,
  velocidadeAntesMinKmh: 15,
  velocidadeDepoisMaxKmh: 5,
  quedaVelocidadeMinKmh: 12,
  imobilidadeMs: 8_000,
  variacaoImovelG: 0.15,
  movimentoRetomadoKmh: 8,
  contagemMs: 30_000,
};

export type ContextoQueda = {
  estado: EstadoQueda;
  /** Desde quando está neste estado (ms). */
  desde: number;
  /** Velocidades recentes (últimos ~10 s), para saber a velocidade antes do impacto. */
  velocidades: { em: number; kmh: number }[];
  velocidadeAntesKmh: number | null;
  /** Módulos da aceleração coletados na verificação de imobilidade. */
  amostras: number[];
  velocidadeMaxNaVerificacao: number;
  fimContagemEm: number | null;
  origem: OrigemQueda | null;
};

export type EventoQueda =
  | { tipo: 'aceleracao'; em: number; x: number; y: number; z: number }
  | { tipo: 'velocidade'; em: number; kmh: number }
  /** Passagem do tempo (relógio do app ou cada atualização do GPS em segundo plano). */
  | { tipo: 'tempo'; em: number }
  /** A pulseira detectou o impacto: abre a contagem direto (RF28). */
  | { tipo: 'impacto_externo'; em: number; origem: OrigemQueda }
  /** "Estou bem": cancela em qualquer ponto antes do SOS. */
  | { tipo: 'cancelar'; em: number }
  /** Depois de resolvido o SOS, volta a monitorar. */
  | { tipo: 'reiniciar'; em: number };

export type EfeitoQueda = 'iniciar_contagem' | 'enviar_sos' | 'contagem_cancelada';

export type ResultadoQueda = { contexto: ContextoQueda; efeitos: EfeitoQueda[] };

const HISTORICO_VELOCIDADE_MS = 10_000;

export function contextoInicial(agora: number): ContextoQueda {
  return {
    estado: 'monitorando',
    desde: agora,
    velocidades: [],
    velocidadeAntesKmh: null,
    amostras: [],
    velocidadeMaxNaVerificacao: 0,
    fimContagemEm: null,
    origem: null,
  };
}

function para(ctx: ContextoQueda, estado: EstadoQueda, em: number, extra: Partial<ContextoQueda> = {}): ContextoQueda {
  return { ...ctx, estado, desde: em, ...extra };
}

function monitorar(ctx: ContextoQueda, em: number): ContextoQueda {
  return para(ctx, 'monitorando', em, {
    velocidadeAntesKmh: null,
    amostras: [],
    velocidadeMaxNaVerificacao: 0,
    fimContagemEm: null,
    origem: null,
  });
}

function abrirContagem(ctx: ContextoQueda, em: number, origem: OrigemQueda, l: LimiaresQueda): ResultadoQueda {
  return {
    contexto: para(ctx, 'contagem', em, { fimContagemEm: em + l.contagemMs, origem, amostras: [] }),
    efeitos: ['iniciar_contagem'],
  };
}

function desvioPadrao(valores: number[]): number {
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  return Math.sqrt(valores.reduce((s, v) => s + (v - media) ** 2, 0) / valores.length);
}

/** Maior velocidade nos segundos antes do impacto. */
function velocidadeAntes(ctx: ContextoQueda, em: number): number {
  return ctx.velocidades
    .filter((v) => v.em >= em - 5_000 && v.em <= em)
    .reduce((max, v) => Math.max(max, v.kmh), 0);
}

/** Verifica prazos que vencem com o tempo (janela, imobilidade, contagem). */
function verificarPrazos(ctx: ContextoQueda, em: number, l: LimiaresQueda): ResultadoQueda {
  if (ctx.estado === 'impacto_candidato' && em - ctx.desde > l.janelaVelocidadeMs) {
    return { contexto: monitorar(ctx, em), efeitos: [] }; // buraco forte sem a moto parar
  }

  if (ctx.estado === 'verificando_imobilidade' && em - ctx.desde >= l.imobilidadeMs) {
    const voltouAAndar = ctx.velocidadeMaxNaVerificacao > l.movimentoRetomadoKmh;
    const imovel =
      ctx.amostras.length >= 5 ? desvioPadrao(ctx.amostras) <= l.variacaoImovelG : true; // sem amostras, vale o GPS
    if (!voltouAAndar && imovel) return abrirContagem(ctx, em, 'celular', l);
    return { contexto: monitorar(ctx, em), efeitos: [] };
  }

  if (ctx.estado === 'contagem' && ctx.fimContagemEm !== null && em >= ctx.fimContagemEm) {
    return { contexto: para(ctx, 'sos_enviado', em, { fimContagemEm: null }), efeitos: ['enviar_sos'] };
  }

  return { contexto: ctx, efeitos: [] };
}

export function processarEvento(
  ctx: ContextoQueda,
  evento: EventoQueda,
  l: LimiaresQueda = LIMIARES_PADRAO,
): ResultadoQueda {
  const { em } = evento;

  switch (evento.tipo) {
    case 'cancelar':
      if (ctx.estado === 'sos_enviado') return { contexto: ctx, efeitos: [] }; // depois do envio, quem cancela é o SOS
      if (ctx.estado === 'contagem') return { contexto: monitorar(ctx, em), efeitos: ['contagem_cancelada'] };
      return { contexto: monitorar(ctx, em), efeitos: [] };

    case 'reiniciar':
      return { contexto: monitorar(ctx, em), efeitos: [] };

    case 'impacto_externo':
      if (ctx.estado === 'contagem' || ctx.estado === 'sos_enviado') return { contexto: ctx, efeitos: [] }; // não duplica
      return abrirContagem(ctx, em, evento.origem, l);

    case 'velocidade': {
      const velocidades = [...ctx.velocidades.filter((v) => v.em >= em - HISTORICO_VELOCIDADE_MS), { em, kmh: evento.kmh }];
      let proximo: ContextoQueda = { ...ctx, velocidades };

      if (proximo.estado === 'impacto_candidato') {
        const antes = proximo.velocidadeAntesKmh ?? 0;
        const parou =
          antes >= l.velocidadeAntesMinKmh &&
          evento.kmh <= l.velocidadeDepoisMaxKmh &&
          antes - evento.kmh >= l.quedaVelocidadeMinKmh;
        if (parou) {
          proximo = para(proximo, 'verificando_imobilidade', em, { amostras: [], velocidadeMaxNaVerificacao: evento.kmh });
        }
      } else if (proximo.estado === 'verificando_imobilidade') {
        proximo = { ...proximo, velocidadeMaxNaVerificacao: Math.max(proximo.velocidadeMaxNaVerificacao, evento.kmh) };
        if (evento.kmh > l.movimentoRetomadoKmh) return { contexto: monitorar(proximo, em), efeitos: [] };
      }
      return verificarPrazos(proximo, em, l);
    }

    case 'aceleracao': {
      const modulo = Math.sqrt(evento.x ** 2 + evento.y ** 2 + evento.z ** 2);
      let proximo = ctx;
      if (ctx.estado === 'monitorando' && modulo >= l.impactoG) {
        proximo = para(ctx, 'impacto_candidato', em, { velocidadeAntesKmh: velocidadeAntes(ctx, em) });
      } else if (ctx.estado === 'verificando_imobilidade') {
        proximo = { ...ctx, amostras: [...ctx.amostras, modulo] };
      }
      return verificarPrazos(proximo, em, l);
    }

    case 'tempo':
      return verificarPrazos(ctx, em, l);
  }
}

/** Segundos que faltam na contagem (para a tela e a notificação). */
export function segundosRestantes(ctx: ContextoQueda, agora: number): number {
  if (ctx.estado !== 'contagem' || ctx.fimContagemEm === null) return 0;
  return Math.max(0, Math.ceil((ctx.fimContagemEm - agora) / 1000));
}
