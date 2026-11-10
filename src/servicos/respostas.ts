import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { estaBloqueado } from 'tela-bloqueio';

import { ACOES, type DadosNotificacao } from './notificacoes';
import { estouBem } from './queda';
import { finalizarTurno, obterTurno, pausarTurno, retomarTurno } from './turno';

/**
 * O que acontece ao tocar numa notificação ou num botão dela.
 * Botões (Pausar, Finalizar, Retomar, Estou bem) agem sem abrir o app.
 */
const tratadas = new Set<string>();

export async function tratarRespostaDeNotificacao(r: Notifications.NotificationResponse): Promise<void> {
  const chave = `${r.notification.request.identifier}|${r.actionIdentifier}|${r.notification.date}`;
  if (tratadas.has(chave)) return;
  tratadas.add(chave);

  const dados = r.notification.request.content.data as DadosNotificacao | undefined;
  switch (r.actionIdentifier) {
    case ACOES.pausar:
      return pausarTurno('manual');
    case ACOES.retomar:
      return retomarTurno();
    case ACOES.finalizar:
      return finalizarTurno();
    case ACOES.estouBem:
      return estouBem();
  }

  try {
    switch (dados?.tipo) {
      case 'ponto_critico':
        router.push(`/turno/alerta/${dados.celulaId}`);
        break;
      case 'queda':
        router.push('/queda');
        break;
      case 'sos':
        // Na tela de bloqueio quem toca é a testemunha; desbloqueado, é o dono.
        if (r.actionIdentifier === ACOES.comoAjudar || estaBloqueado()) router.push('/testemunha');
        else router.push(`/sos/${dados.eventoId}`);
        break;
      case 'turno':
      case 'pausa':
        router.push(obterTurno().situacao === 'pausado' ? '/turno/pausado' : '/turno/ativo');
        break;
      case 'mensagem':
        router.push('/plano');
        break;
    }
  } catch {
    // navegação ainda não montada: a tela inicial cuida do resto
  }
}
