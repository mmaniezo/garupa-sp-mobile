import type { GarupaApi } from './contrato';
import { ErroApi, ErroDeRede } from './erros';
import type { ProblemDetails } from './types';

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Query = Record<string, string | number | boolean | undefined>;

/**
 * Cliente HTTP da API C#. Nunca registra corpo de requisição nem de resposta:
 * eles podem ter coordenadas, telefone ou ficha médica (RNF15).
 */
export function criarApiHttp(urlBase: string, timeoutMs: number): GarupaApi {
  const base = `${urlBase}/api/v1`;

  async function chamar<T>(metodo: Metodo, caminho: string, opcoes: { query?: Query; corpo?: unknown } = {}) {
    // Query montada à mão: o URL do React Native não implementa searchParams por completo.
    const qs = Object.entries(opcoes.query ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    const url = base + caminho + (qs ? `?${qs}` : '');

    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), timeoutMs);
    let resposta: Response;
    try {
      resposta = await fetch(url, {
        method: metodo,
        headers: {
          Accept: 'application/json',
          ...(opcoes.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
        signal: controle.signal,
      });
    } catch {
      throw new ErroDeRede(controle.signal.aborted ? 'tempo_esgotado' : 'sem_conexao');
    } finally {
      clearTimeout(timer);
    }

    if (!resposta.ok) {
      let problema: ProblemDetails | undefined;
      try {
        problema = (await resposta.json()) as ProblemDetails;
      } catch {
        problema = undefined;
      }
      throw new ErroApi(resposta.status, problema);
    }
    if (resposta.status === 202 || resposta.status === 204) return undefined as T;
    const texto = await resposta.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  }

  const id = encodeURIComponent;

  return {
    obterRisco: (c) => chamar('GET', '/risco', { query: c }),
    obterCelula: (celulaId) => chamar('GET', `/risco/celulas/${id(celulaId)}`),

    criarUsuario: (dados) => chamar('POST', '/usuarios', { corpo: dados }),
    salvarFichaMedica: (u, ficha) => chamar('PUT', `/usuarios/${id(u)}/ficha-medica`, { corpo: ficha }),
    adicionarContato: (u, contato) => chamar('POST', `/usuarios/${id(u)}/contatos`, { corpo: contato }),
    salvarPerfil: (u, perfil) => chamar('PUT', `/usuarios/${id(u)}/perfil`, { corpo: perfil }),
    salvarConsentimentos: (u, c) => chamar('PUT', `/usuarios/${id(u)}/consentimentos`, { corpo: c }),
    excluirUsuario: (u) => chamar('DELETE', `/usuarios/${id(u)}`),
    listarDistritos: () => chamar('GET', '/distritos'),

    obterPlanoDoTurno: (c) => chamar('GET', '/plano-do-turno', { query: c }),
    listarMensagens: (c) => chamar('GET', '/mensagens', { query: c }),

    enviarSos: (sos) => chamar('POST', '/sos', { corpo: sos }),
    cancelarSos: (sosId) => chamar('PATCH', `/sos/${id(sosId)}/cancelar`),
    encerrarSos: (sosId) => chamar('PATCH', `/sos/${id(sosId)}/encerrar`),
    urlAcompanhamento: (token) => `${base}/acompanhar/${id(token)}`,

    enviarRelato: (relato) => chamar('POST', '/relatos', { corpo: relato }),

    listarEventosVestivelPendentes: (u) => chamar('GET', '/eventos-vestivel/pendentes', { query: { usuarioId: u } }),
    parearVestivel: (u, dispositivoId) => chamar('POST', `/usuarios/${id(u)}/vestivel`, { corpo: { dispositivoId } }),
    desparearVestivel: (u) => chamar('DELETE', `/usuarios/${id(u)}/vestivel`),
    enviarAlertaVestivel: (u, alerta) => chamar('POST', `/usuarios/${id(u)}/alertas-vestivel`, { corpo: alerta }),

    saude: () => chamar('GET', '/saude'),
  };
}
