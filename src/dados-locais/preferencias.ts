import type { Consentimentos, Distrito, TipoDia, TipoUso } from '@/api/types';
import { gravarValor, lerValor } from '@/dados-locais/armazenamento';
import type { Periodo } from '@/domain/periodos';
import { criarStore } from '@/lib/store';
import type { PreferenciaTema } from '@/theme/colors';

/**
 * Preferências guardadas no aparelho (SQLite, chave e valor):
 * perfil de uso, consentimentos, chuva (automática ou à mão), pulseira pareada.
 * Ficam num store para as telas reagirem quando mudam.
 */

export type PerfilLocal = {
  tiposDeUso: TipoUso[];
  periodos: Periodo[];
  dias: TipoDia[];
  distritos: Distrito[];
};

export type Preferencias = {
  carregadas: boolean;
  perfil: PerfilLocal;
  consentimentos: Consentimentos;
  /** RF10: está chovendo agora? Sozinho pela previsão do tempo, ou escolhido à mão. */
  chuva: boolean;
  /** A chuva vem da previsão do tempo (padrão). Tocar em Seco ou Chovendo desliga. */
  chuvaAutomatica: boolean;
  pulseira: { dispositivoId: string } | null;
  /** A pessoa já foi levada ao ajuste de economia de bateria (Android). */
  bateriaOrientada: boolean;
  /** Aparência: igual ao sistema do celular (padrão), ou sempre clara ou escura. */
  tema: PreferenciaTema;
  /** SMS de socorro automático aos contatos (Android, com a permissão de SMS). */
  smsAutomatico: boolean;
};

export const PERFIL_VAZIO: PerfilLocal = { tiposDeUso: [], periodos: [], dias: [], distritos: [] };

/** Começa tudo desligado: cada consentimento é pedido na tela de permissões (RB08). */
export const CONSENTIMENTOS_VAZIOS: Consentimentos = {
  localizacaoEmUso: false,
  localizacaoEmSegundoPlano: false,
  fichaMedica: false,
  historicoDeLocais: false,
  perfilDeUso: false,
};

const CHAVE = 'preferencias';

const INICIAIS: Omit<Preferencias, 'carregadas'> = {
  perfil: PERFIL_VAZIO,
  consentimentos: CONSENTIMENTOS_VAZIOS,
  chuva: false,
  chuvaAutomatica: true,
  pulseira: null,
  bateriaOrientada: false,
  tema: 'sistema',
  smsAutomatico: true,
};

const store = criarStore<Preferencias>({ carregadas: false, ...INICIAIS });

export const usePreferencias = store.useStore;
export const obterPreferencias = store.obter;
export const assinarPreferencias = store.assinar;

export async function carregarPreferencias(): Promise<Preferencias> {
  const salvas = await lerValor<Omit<Preferencias, 'carregadas'>>(CHAVE);
  const atual = store.obter();
  const proximas: Preferencias = {
    ...atual,
    ...salvas,
    perfil: { ...PERFIL_VAZIO, ...salvas?.perfil },
    consentimentos: { ...CONSENTIMENTOS_VAZIOS, ...salvas?.consentimentos },
    carregadas: true,
  };
  store.definir(proximas);
  return proximas;
}

export async function atualizarPreferencias(mudanca: Partial<Omit<Preferencias, 'carregadas'>>): Promise<void> {
  const proximas = { ...store.obter(), ...mudanca, carregadas: true };
  store.definir(proximas);
  const { carregadas: _, ...paraGravar } = proximas;
  await gravarValor(CHAVE, paraGravar);
}

/** Apaga os dados da pessoa; a aparência escolhida é do aparelho e fica. */
export async function limparPreferencias(): Promise<void> {
  const { tema } = store.obter();
  store.definir({ carregadas: true, ...INICIAIS, tema });
  if (tema !== 'sistema') await gravarValor(CHAVE, { ...INICIAIS, tema });
}
