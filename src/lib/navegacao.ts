import { router, useLocalSearchParams, type Href } from 'expo-router';

import { ehErroApi, ehErroDeRede } from '@/api';

/** Volta se der; senão, vai para a tela indicada (link aberto direto, por exemplo). */
export function voltarOu(href: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(href);
}

/** As telas do cadastro também servem para editar pelo Perfil: `?editar=1`. */
export function useEdicao(): boolean {
  const { editar } = useLocalSearchParams<{ editar?: string }>();
  return editar === '1';
}

/** Mensagem curta para a pessoa, sem detalhe técnico e sem dado pessoal. */
export function mensagemDeErro(e: unknown, padrao = 'Não deu certo agora. Tente de novo.'): string {
  if (ehErroDeRede(e)) return 'Sem conexão com a internet. Tente de novo quando tiver sinal.';
  if (ehErroApi(e)) return e.problema?.title ?? padrao;
  return padrao;
}
