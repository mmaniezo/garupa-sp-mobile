import type { Href } from 'expo-router';

import { apagarTudoDoAparelho, gravarValor, lerValor } from '@/db';
import { criarStore } from '@/lib/store';

/**
 * Sessão do motociclista neste aparelho: quem é e onde parou no cadastro em camadas.
 * Passos 2 a 4 são opcionais: "pulado" conta como resolvido e pode ser retomado no Perfil.
 */
export type SituacaoPasso = 'pendente' | 'feito' | 'pulado';

export type Sessao = {
  carregada: boolean;
  usuarioId: string | null;
  nome: string | null;
  /** Em qual API o cadastro existe ('mock' ou o endereço da API real). */
  apiDoCadastro?: string | null;
  passos: {
    basico: SituacaoPasso;
    ficha: SituacaoPasso;
    uso: SituacaoPasso;
    distritos: SituacaoPasso;
    permissoes: SituacaoPasso;
  };
};

const CHAVE = 'sessao';

const VAZIA: Sessao = {
  carregada: false,
  usuarioId: null,
  nome: null,
  passos: { basico: 'pendente', ficha: 'pendente', uso: 'pendente', distritos: 'pendente', permissoes: 'pendente' },
};

const store = criarStore<Sessao>(VAZIA);

export const useSessao = store.useStore;
export const obterSessao = store.obter;

export async function carregarSessao(): Promise<void> {
  const salva = await lerValor<Omit<Sessao, 'carregada'>>(CHAVE);
  store.definir({ ...VAZIA, ...salva, passos: { ...VAZIA.passos, ...salva?.passos }, carregada: true });
}

export async function atualizarSessao(mudanca: Partial<Omit<Sessao, 'carregada' | 'passos'>> & {
  passos?: Partial<Sessao['passos']>;
}): Promise<void> {
  const atual = store.obter();
  const proxima: Sessao = {
    ...atual,
    ...mudanca,
    passos: { ...atual.passos, ...mudanca.passos },
    carregada: true,
  };
  store.definir(proxima);
  const { carregada: _, ...paraGravar } = proxima;
  await gravarValor(CHAVE, paraGravar);
}

/** Sai do aparelho: apaga sessão, cache, filas e histórico local. */
export async function encerrarSessaoNoAparelho(): Promise<void> {
  await apagarTudoDoAparelho();
  store.definir({ ...VAZIA, carregada: true });
}

export function cadastroConcluido(s: Sessao): boolean {
  return s.usuarioId !== null && s.passos.basico === 'feito' && s.passos.permissoes !== 'pendente';
}

/** Próxima tela do cadastro, na ordem do design (telas 01 a 06). */
export function proximaTelaDoCadastro(s: Sessao): Href {
  if (!s.usuarioId || s.passos.basico !== 'feito') return '/cadastro/basico';
  if (s.passos.ficha === 'pendente') return '/cadastro/ficha';
  if (s.passos.uso === 'pendente') return '/cadastro/uso';
  if (s.passos.distritos === 'pendente') return '/cadastro/distritos';
  if (s.passos.permissoes === 'pendente') return '/cadastro/permissoes';
  return '/plano';
}
