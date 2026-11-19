import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useSessaoExpirada } from '@/api/token';
import { entrarNaConta, sairDaConta } from '@/servicos/conta';
import { cadastroConcluido, useSessaoDoAparelho, type Sessao } from '@/state/sessao';

/**
 * Autenticação do app (Context API): quem está na conta, se o cadastro mínimo está feito, se a
 * sessão com a API venceu, e as ações de entrar e sair. As telas leem tudo daqui.
 *
 * A sessão em si fica num store simples (state/sessao.ts), porque os serviços que rodam sem tela
 * (a tarefa do GPS em segundo plano, a fila do SOS) também precisam dela fora do React.
 */
export type Autenticacao = {
  sessao: Sessao;
  /** Cadastro mínimo e permissões resolvidas: libera as abas e o turno. */
  cadastrado: boolean;
  /** O token da API venceu (vale 1 hora): é preciso entrar de novo. */
  sessaoExpirada: boolean;
  /** Login com celular e senha. 'renovada' quando é a mesma conta deste celular. */
  entrar: (telefone: string, senha: string) => Promise<'renovada' | 'nova'>;
  /** Sai da conta neste celular (a conta continua na API). */
  sair: () => Promise<void>;
};

const ContextoAutenticacao = createContext<Autenticacao | null>(null);

export function AutenticacaoProvider({ children }: { children: ReactNode }) {
  const sessao = useSessaoDoAparelho();
  const sessaoExpirada = useSessaoExpirada();
  const valor = useMemo<Autenticacao>(
    () => ({
      sessao,
      cadastrado: cadastroConcluido(sessao),
      sessaoExpirada,
      entrar: entrarNaConta,
      sair: sairDaConta,
    }),
    [sessao, sessaoExpirada],
  );
  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao(): Autenticacao {
  const valor = useContext(ContextoAutenticacao);
  if (!valor) throw new Error('useAutenticacao precisa estar dentro do AutenticacaoProvider.');
  return valor;
}

/** Atalho para as telas que só precisam da sessão. */
export function useSessao(): Sessao {
  return useAutenticacao().sessao;
}
