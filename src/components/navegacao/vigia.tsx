import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useQueda } from '@/servicos/queda';
import { tratarRespostaDeNotificacao } from '@/servicos/respostas';
import { useSos } from '@/servicos/sos';

/**
 * Leva a pessoa para a tela certa quando algo acontece com o app aberto:
 * contagem da queda → tela cheia (15); SOS enviado → tela do SOS (16).
 * Também trata o toque numa notificação que abriu o app do zero.
 */
export function Vigia() {
  const queda = useQueda();
  const sos = useSos();
  const caminho = usePathname();
  const caminhoRef = useRef(caminho);
  useEffect(() => {
    caminhoRef.current = caminho;
  }, [caminho]);

  const emContagem = queda.ctx.estado === 'contagem';
  const sosAtivoId = sos?.situacao === 'ativo' ? sos.eventoId : null;

  useEffect(() => {
    const abrirContagem = () => {
      if (emContagem && AppState.currentState === 'active' && caminhoRef.current !== '/queda') router.push('/queda');
    };
    abrirContagem();
    const s = AppState.addEventListener('change', (e) => e === 'active' && abrirContagem());
    return () => s.remove();
  }, [emContagem]);

  useEffect(() => {
    if (sosAtivoId && caminhoRef.current === '/queda') router.replace(`/sos/${sosAtivoId}`);
  }, [sosAtivoId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const ultima = Notifications.getLastNotificationResponse();
    if (ultima) void tratarRespostaDeNotificacao(ultima);
  }, []);

  return null;
}
