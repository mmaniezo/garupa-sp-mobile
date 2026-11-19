import { router } from 'expo-router';
import { View } from 'react-native';

import { Aviso, Botao } from '@/components/ui';
import { useAutenticacao } from '@/contexto/autenticacao';

/**
 * A sessão com a API venceu (o token vale 1 hora). O app segue funcionando com o que está no
 * celular; o que precisa do servidor (relato, registro do SOS, salvar dados) espera o novo login.
 */
export function AvisoSessaoExpirada() {
  const { sessaoExpirada: expirada } = useAutenticacao();
  if (!expirada) return null;
  return (
    <View style={{ gap: 8 }}>
      <Aviso tom="neutro" texto="Sua sessão venceu. Entre de novo para salvar no servidor. O que está neste celular continua aqui." anunciar />
      <Botao titulo="Entrar de novo" variante="contorno" tamanho="padrao" onPress={() => router.push('/entrar?renovar=1')} />
    </View>
  );
}
