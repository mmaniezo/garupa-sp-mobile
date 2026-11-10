import type { CelulaCritica, FaixaHoraria, TipoDia } from '@/api/types';

import { rotuloFaixa } from './contexto';

/**
 * Textos do risco: motivo e ação em linguagem simples (RB04, RB14, RNF21).
 * Fala do ponto e do horário, nunca rotula o bairro nem a pessoa,
 * e não promete segurança: o mapa mostra histórico, não garantia (RN10).
 */

export const AVISO_HISTORICO = 'O mapa mostra o histórico de sinistros, não é garantia de nada.';

export function nivelDeRisco(percentil: number): 'Muito alto' | 'Alto' | 'Moderado' {
  if (percentil >= 99) return 'Muito alto';
  if (percentil >= 95) return 'Alto';
  return 'Moderado';
}

export function motivoDoPonto(faixa: FaixaHoraria, tipoDia: TipoDia, chuva: boolean): string {
  const dia = tipoDia === 'domingo' ? ' no domingo' : tipoDia === 'sabado' ? ' no sábado' : '';
  const comChuva = chuva ? ', com chuva' : '';
  return `Muitos sinistros graves com moto aqui, das ${rotuloFaixa(faixa)}${dia}${comChuva}.`;
}

export function acaoDoPonto(faixa: FaixaHoraria, chuva: boolean): string {
  if (chuva) return 'Reduza antes de chegar e dobre a distância do carro da frente.';
  if (faixa >= 4 || faixa === 0) return 'Reduza antes de chegar, farol aceso e atenção a quem cruza.';
  return 'Reduza antes de chegar e evite o corredor entre os carros.';
}

/** "Pinheiros · Via de exemplo A" para o subtítulo dos itens. */
export function localDoPonto(p: CelulaCritica): string {
  return p.distritoNome ? `${p.distritoNome}` : 'Perto de você';
}
