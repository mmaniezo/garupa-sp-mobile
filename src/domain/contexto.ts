import type { FaixaHoraria, TipoDia } from '@/api/types';

/**
 * Contexto de risco do momento: faixa horária, tipo de dia e chuva.
 *
 * Faixas: seis de 4 horas, 0 a 5 (contrato do risco_celula.csv). Aqui a faixa 0 começa à
 * meia-noite (hora ÷ 4). CONFIRMAR com a equipe de ML: se o modelo usar outro início
 * (por exemplo 02h, para 18h–22h caber numa faixa só), mudar só INICIO_PRIMEIRA_FAIXA.
 */
export const INICIO_PRIMEIRA_FAIXA = 0;

const doisDigitos = (h: number) => String(h).padStart(2, '0');

export function faixaHoraria(data: Date = new Date()): FaixaHoraria {
  const hora = (data.getHours() - INICIO_PRIMEIRA_FAIXA + 24) % 24;
  return Math.floor(hora / 4) as FaixaHoraria;
}

/** "18h–22h" */
export function rotuloFaixa(faixa: FaixaHoraria): string {
  const inicio = (INICIO_PRIMEIRA_FAIXA + faixa * 4) % 24;
  const fim = (inicio + 4) % 24;
  return `${doisDigitos(inicio)}h–${doisDigitos(fim)}h`;
}

export const FAIXAS: readonly FaixaHoraria[] = [0, 1, 2, 3, 4, 5];

export function tipoDia(data: Date = new Date()): TipoDia {
  const dia = data.getDay();
  if (dia === 0) return 'domingo';
  if (dia === 6) return 'sabado';
  return 'util';
}

export function rotuloTipoDia(tipo: TipoDia, curto = false): string {
  if (tipo === 'util') return curto ? 'Dia útil' : 'Dias úteis';
  if (tipo === 'sabado') return curto ? 'Sáb' : 'Sábado';
  return curto ? 'Dom' : 'Domingo';
}

/** Noite, para escolher mensagens do contexto "noite": das 18h às 6h. */
export function ehNoite(data: Date = new Date()): boolean {
  const h = data.getHours();
  return h >= 18 || h < 6;
}

/** Saudação do plano do turno ("Boa noite, Léo"). */
export function saudacao(data: Date = new Date()): string {
  const h = data.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}
