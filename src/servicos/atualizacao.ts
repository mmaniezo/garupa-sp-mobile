import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { assinarSessaoExpirada, conferirValidadeDoToken, sessaoExpirada } from '@/api/token';
import { assinarPreferencias } from '@/dados-locais/preferencias';
import { assinarSessao } from '@/state/sessao';

import { atualizarChuvaAutomatica } from './clima';
import { atualizarPlanoSeMudou, carregarPlano } from './plano';

/** De quanto em quanto tempo conferir a faixa horária e a chuva com o app aberto. */
const CONFERIR_MS = 30_000;

/**
 * Plano sempre em dia, sem puxar para atualizar. Ele se monta de novo quando:
 * - a faixa horária ou o tipo de dia mudam (conferido a cada 30 s e ao voltar para o app);
 * - os distritos, o tipo de uso, a chuva ou os consentimentos mudam (preferências);
 * - a conta muda, ou a pessoa entra de novo depois de a sessão vencer;
 * - a internet volta depois de um plano guardado ou de um erro.
 * Com o token vencido (1 hora), o aviso "Sua sessão venceu" aparece sem esperar uma chamada falhar.
 * A chuva vem da previsão do tempo (servicos/clima.ts), a cada 10 minutos.
 * Devolve a função que desliga tudo.
 */
export function iniciarAtualizacaoAutomatica(): () => void {
  const conferir = () => {
    conferirValidadeDoToken();
    atualizarPlanoSeMudou();
    void atualizarChuvaAutomatica();
  };

  let expiradaAntes = sessaoExpirada();
  const paradas = [
    assinarPreferencias(atualizarPlanoSeMudou),
    assinarSessao(atualizarPlanoSeMudou),
    assinarSessaoExpirada(() => {
      const expirada = sessaoExpirada();
      // Entrou de novo: o plano da tela era o guardado (ou deu erro); monta com a API agora.
      if (expiradaAntes && !expirada) void carregarPlano();
      expiradaAntes = expirada;
    }),
    NetInfo.addEventListener((estado) => {
      if (estado.isConnected) conferir();
    }),
  ];
  const aoMudarApp = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') conferir();
  });
  const relogio = setInterval(conferir, CONFERIR_MS);
  conferir();

  return () => {
    paradas.forEach((parar) => parar());
    aoMudarApp.remove();
    clearInterval(relogio);
  };
}
