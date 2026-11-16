import { Redirect } from 'expo-router';

import { sessaoExpirada } from '@/api/token';
import { cadastroConcluido, proximaTelaDoCadastro, useSessao } from '@/state/sessao';

/**
 * Porta de entrada: manda para as boas-vindas, para o passo do cadastro em que parou ou para o
 * plano. Com a sessão vencida (o token da API vale 1 hora), pede a senha de novo antes.
 */
export default function Entrada() {
  const sessao = useSessao();
  if (!sessao.usuarioId) return <Redirect href="/boas-vindas" />;
  if (!cadastroConcluido(sessao)) return <Redirect href={proximaTelaDoCadastro(sessao)} />;
  if (sessaoExpirada()) return <Redirect href="/entrar?renovar=1" />;
  return <Redirect href="/plano" />;
}
