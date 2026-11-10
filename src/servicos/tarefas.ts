import type * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { processarLocalizacoes, pulso, TAREFA_LOCALIZACAO } from './turno';

/**
 * Tarefas em segundo plano. Este arquivo é importado pelo ponto de entrada do app (index.js)
 * antes de tudo, porque o sistema pode abrir o app só para entregar posições do GPS,
 * sem tela, e a tarefa precisa estar definida nesse momento.
 */
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TAREFA_LOCALIZACAO, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  try {
    await processarLocalizacoes(data.locations);
    await pulso(Date.now());
  } catch (e) {
    if (__DEV__) console.warn('[tarefa-localizacao]', (e as Error).message);
  }
});
