import { config } from '@/config';

import type { GarupaApi } from './contrato';
import { criarApiHttp } from './http';
import { criarApiMock, type ApiMock } from './mock/mock-api';

function criar(): GarupaApi {
  if (config.modoApi === 'http') {
    if (!config.urlApi) {
      console.warn('[api] EXPO_PUBLIC_API_MODE=http sem EXPO_PUBLIC_API_URL; usando o mock.');
      return criarApiMock();
    }
    return criarApiHttp(config.urlApi, config.timeoutMs);
  }
  return criarApiMock();
}

/** Cliente único da API usado pelo app inteiro (HTTP ou mock, conforme o .env). */
export const api: GarupaApi = criar();

/** Controles do mock (simular pulseira, ficar sem conexão). `null` quando a API é a real. */
export const mock: ApiMock | null = 'simularEventoVestivel' in api ? (api as ApiMock) : null;

/** Qual API está em uso: 'mock' ou o endereço da API real. Um cadastro só existe na API em que foi feito. */
export const origemApi: string = mock ? 'mock' : config.urlApi;

export type { GarupaApi } from './contrato';
export * from './erros';
export * from './types';
