import { Redirect } from 'expo-router';

import { cadastroConcluido, proximaTelaDoCadastro, useSessao } from '@/state/sessao';

/** Porta de entrada: manda para as boas-vindas, para o passo do cadastro em que parou ou para o plano. */
export default function Entrada() {
  const sessao = useSessao();
  if (!sessao.usuarioId) return <Redirect href="/boas-vindas" />;
  if (!cadastroConcluido(sessao)) return <Redirect href={proximaTelaDoCadastro(sessao)} />;
  return <Redirect href="/plano" />;
}
