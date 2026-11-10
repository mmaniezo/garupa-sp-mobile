import type { FaixaHoraria, HorarioHabitual, TipoDia, TipoUso } from '@/api/types';

import { faixaHoraria } from './contexto';

/** Períodos do dia que a pessoa escolhe no cadastro ("Quando você costuma rodar?"). */
export type Periodo = 'madrugada' | 'manha' | 'almoco' | 'tarde' | 'jantar';

export const PERIODOS: { id: Periodo; rotulo: string; horas: [number, number] }[] = [
  { id: 'manha', rotulo: 'Manhã', horas: [6, 10] },
  { id: 'almoco', rotulo: 'Almoço', horas: [11, 14] },
  { id: 'tarde', rotulo: 'Tarde', horas: [15, 17] },
  { id: 'jantar', rotulo: 'Jantar', horas: [18, 22] },
  { id: 'madrugada', rotulo: 'Madrugada', horas: [23, 5] },
];

export const DIAS: { id: TipoDia; rotulo: string }[] = [
  { id: 'util', rotulo: 'Dias úteis' },
  { id: 'sabado', rotulo: 'Sábado' },
  { id: 'domingo', rotulo: 'Domingo' },
];

export const TIPOS_DE_USO: { id: TipoUso; titulo: string; descricao: string }[] = [
  { id: 'entregador_app', titulo: 'Entregador por app', descricao: 'Picos de almoço e jantar' },
  { id: 'trabalho_moto', titulo: 'Trabalho', descricao: 'Moto-táxi, motofrete' },
  { id: 'ida_volta', titulo: 'Ida e volta', descricao: 'Casa, trabalho, estudo' },
  { id: 'lazer', titulo: 'Lazer', descricao: 'Fins de semana' },
];

/** Faixas horárias que um período cobre (cada hora do período cai numa faixa de 4 h). */
export function faixasDoPeriodo(periodo: Periodo): FaixaHoraria[] {
  const [inicio, fim] = PERIODOS.find((p) => p.id === periodo)!.horas;
  const horas: number[] = [];
  for (let h = inicio; ; h = (h + 1) % 24) {
    horas.push(h);
    if (h === fim) break;
  }
  const faixas = horas.map((h) => faixaHoraria(new Date(2026, 0, 1, h)));
  return [...new Set(faixas)].sort((a, b) => a - b);
}

/** Converte a escolha de períodos e dias no formato do contrato (horariosHabituais[]). */
export function horariosHabituais(periodos: Periodo[], dias: TipoDia[]): HorarioHabitual[] {
  const pares = new Map<string, HorarioHabitual>();
  for (const tipoDia of dias) {
    for (const periodo of periodos) {
      for (const faixaHoraria of faixasDoPeriodo(periodo)) {
        pares.set(`${tipoDia}-${faixaHoraria}`, { faixaHoraria, tipoDia });
      }
    }
  }
  return [...pares.values()];
}

export function rotuloUso(uso: TipoUso): string {
  return TIPOS_DE_USO.find((t) => t.id === uso)?.titulo ?? uso;
}
