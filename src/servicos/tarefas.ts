import type * as Location from 'expo-location';
import { requireOptionalNativeModule } from 'expo-modules-core';

import { processarLocalizacoes, pulso, TAREFA_LOCALIZACAO } from './turno';

/**
 * Tarefas em segundo plano. Este arquivo é importado pelo ponto de entrada do app (index.js)
 * antes de tudo, porque o sistema pode abrir o app só para entregar posições do GPS,
 * sem tela, e a tarefa precisa estar definida nesse momento.
 *
 * No Expo Go do Android não existe o módulo de tarefas: importar o expo-task-manager ali
 * derrubaria o app na abertura. Por isso ele só é carregado quando o módulo nativo existe
 * (build de desenvolvimento); no Expo Go o turno roda com o app aberto.
 */
if (requireOptionalNativeModule('ExpoTaskManager')) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TAREFA_LOCALIZACAO, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    try {
      await processarLocalizacoes(data.locations);
      await pulso(Date.now());
    } catch (e) {
      if (__DEV__) console.warn('[tarefa-localizacao]', (e as Error).message);
    }
  });
}
