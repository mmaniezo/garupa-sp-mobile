import type { ProblemDetails } from './types';

/** A API respondeu com erro (4xx ou 5xx). */
export class ErroApi extends Error {
  readonly status: number;
  readonly problema?: ProblemDetails;

  constructor(status: number, problema?: ProblemDetails) {
    super(problema?.title ?? `Erro ${status} da API`);
    this.name = 'ErroApi';
    this.status = status;
    this.problema = problema;
  }

  /** Primeira mensagem de validação de um campo, para mostrar embaixo do campo. */
  erroDoCampo(campo: string): string | undefined {
    const erros = this.problema?.errors;
    if (!erros) return undefined;
    const chave = Object.keys(erros).find((k) => k.toLowerCase() === campo.toLowerCase());
    return chave ? erros[chave]?.[0] : undefined;
  }
}

/** Não foi possível falar com a API (sem internet, tempo esgotado). O que é fila tenta de novo depois. */
export class ErroDeRede extends Error {
  constructor(motivo: 'sem_conexao' | 'tempo_esgotado') {
    super(motivo === 'tempo_esgotado' ? 'A API demorou para responder.' : 'Sem conexão com a API.');
    this.name = 'ErroDeRede';
  }
}

export function ehErroDeRede(e: unknown): e is ErroDeRede {
  return e instanceof ErroDeRede;
}

export function ehErroApi(e: unknown, status?: number): e is ErroApi {
  return e instanceof ErroApi && (status === undefined || e.status === status);
}
