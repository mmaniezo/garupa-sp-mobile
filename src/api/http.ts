import type { GarupaApi } from './contrato';
import { ErroApi, ErroDeRede } from './erros';
import type {
  CelulaCritica,
  DetalheCelula,
  Distrito,
  EventoVestivel,
  FaixaHoraria,
  Mensagem,
  PlanoDoTurno,
  ProblemDetails,
  TipoDia,
  TipoEventoVestivel,
  Usuario,
} from './types';

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Query = Record<string, string | number | boolean | undefined>;

// ---------- Formatos que a API C# devolve (Swagger v1) ----------

type PontoApi = {
  celulaId: string;
  centroLat: number;
  centroLon: number;
  score: number;
  percentil: number;
  viaReferencia: string;
  distritoId: number;
  versaoModelo?: string;
  motivo?: string;
};
/** Uma linha do risco_celula.csv: a célula num contexto (faixa, dia, chuva). */
type CelulaRiscoApi = PontoApi & { id: number; faixaHoraria: number; tipoDia: TipoDia; chuva: boolean };
type MensagemApi = { id: number; texto: string; fonte: string };
type PlanoApi = {
  pontosCriticos: PontoApi[];
  mensagens: MensagemApi[];
  faixaHoraria?: number;
  origemFaixa?: PlanoDoTurno['origemFaixa'];
};
type UsuarioApi = {
  usuarioId: number;
  nome: string;
  telefone: string;
  contatos: { contatoId: number; nome: string; telefone: string }[];
};
type EventoApi = { eventoId: number; tipo: TipoEventoVestivel; ocorridoEm: string };

/**
 * Os ids do app são texto; na API, usuário, contato, SOS e relato são números.
 * Um id que não é número (criado pelo mock, por exemplo) não existe na API: 404 sem chamar.
 */
function idDaApi(id: string): number {
  if (!/^\d+$/.test(id)) throw new ErroApi(404, { title: 'Não encontrado.', status: 404 });
  return Number(id);
}

const mensagem = (m: MensagemApi): Mensagem => ({ id: String(m.id), texto: m.texto, fonte: m.fonte });

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

  // A API devolve só o id do distrito; o nome vem de GET /distritos, buscado uma vez.
  let nomesDistritos: Promise<Map<number, string>> | null = null;
  async function comNomeDoDistrito<P extends { distritoId?: number }>(itens: P[]): Promise<(P & { distritoNome?: string })[]> {
    nomesDistritos ??= chamar<Distrito[]>('GET', '/distritos').then((l) => new Map(l.map((d) => [d.distritoId, d.nome])));
    let nomes: Map<number, string> | undefined;
    try {
      nomes = await nomesDistritos;
    } catch {
      nomesDistritos = null; // tenta de novo na próxima; o ponto aparece sem o nome do distrito
    }
    return itens.map((p) => ({ ...p, distritoNome: p.distritoId !== undefined ? nomes?.get(p.distritoId) : undefined }));
  }

  return {
    obterRisco: async (c) => {
      const pontos = await chamar<PontoApi[]>('GET', '/risco', { query: c });
      return comNomeDoDistrito<CelulaCritica>(pontos);
    },
    obterCelula: async (celulaId) => {
      // A API devolve uma linha por contexto (6 faixas × 3 tipos de dia × chuva sim/não).
      const linhas = await chamar<CelulaRiscoApi[]>('GET', `/risco/celulas/${id(celulaId)}`);
      const primeira = linhas[0];
      if (!primeira) throw new ErroApi(404, { title: 'Célula não encontrada.', status: 404 });
      const [celula] = await comNomeDoDistrito([primeira]);
      const detalhe: DetalheCelula = {
        celulaId: celula.celulaId,
        centroLat: celula.centroLat,
        centroLon: celula.centroLon,
        viaReferencia: celula.viaReferencia,
        distritoId: celula.distritoId,
        distritoNome: celula.distritoNome,
        versaoModelo: celula.versaoModelo,
        riscoPorFaixa: linhas.map((l) => ({
          faixaHoraria: l.faixaHoraria as FaixaHoraria,
          tipoDia: l.tipoDia,
          chuva: l.chuva,
          score: l.score,
          percentil: l.percentil,
        })),
      };
      return detalhe;
    },

    criarUsuario: async (dados) => {
      const r = await chamar<{ usuarioId: number }>('POST', '/usuarios', { corpo: dados });
      return { usuarioId: String(r.usuarioId) };
    },
    obterUsuario: async (u) => {
      const r = await chamar<UsuarioApi>('GET', `/usuarios/${idDaApi(u)}`);
      const usuario: Usuario = {
        usuarioId: String(r.usuarioId),
        nome: r.nome,
        telefone: r.telefone,
        contatos: r.contatos.map((c) => ({ contatoId: String(c.contatoId), nome: c.nome, telefone: c.telefone })),
      };
      return usuario;
    },
    salvarFichaMedica: async (u, ficha) =>
      chamar('PUT', `/usuarios/${idDaApi(u)}/ficha-medica`, {
        // A API quer texto em todos os campos ("" quando vazio; null dá 400) e o sinal ASCII ("A-").
        corpo: {
          tipoSanguineo: (ficha.tipoSanguineo ?? '').replace('−', '-'),
          alergias: ficha.alergias ?? '',
          condicoes: ficha.condicoes ?? '',
          medicamentos: ficha.medicamentos ?? '',
        },
      }),
    adicionarContato: async (u, contato) => {
      const r = await chamar<{ contatoId: number }>('POST', `/usuarios/${idDaApi(u)}/contatos`, { corpo: contato });
      return { contatoId: String(r.contatoId) };
    },
    salvarPerfil: async (u, perfil) => chamar('PUT', `/usuarios/${idDaApi(u)}/perfil`, { corpo: perfil }),
    salvarConsentimentos: async (u, c) => chamar('PUT', `/usuarios/${idDaApi(u)}/consentimentos`, { corpo: c }),
    excluirUsuario: async (u) => chamar('DELETE', `/usuarios/${idDaApi(u)}`),
    listarDistritos: async () => chamar('GET', '/distritos'),

    obterPlanoDoTurno: async (c) => {
      const r = await chamar<PlanoApi>('GET', '/plano-do-turno', { query: { ...c, usuarioId: idDaApi(c.usuarioId) } });
      return {
        pontosCriticos: await comNomeDoDistrito<CelulaCritica>(r.pontosCriticos),
        mensagens: r.mensagens.map(mensagem),
        faixaHoraria: r.faixaHoraria as FaixaHoraria | undefined,
        origemFaixa: r.origemFaixa,
      };
    },
    listarMensagens: async (c) => (await chamar<MensagemApi[]>('GET', '/mensagens', { query: c })).map(mensagem),

    enviarSos: async (sos) => {
      const r = await chamar<{ sosId: number; tokenAcompanhamento: string }>('POST', '/sos', {
        corpo: { ...sos, usuarioId: idDaApi(sos.usuarioId) },
      });
      return { sosId: String(r.sosId), tokenAcompanhamento: r.tokenAcompanhamento };
    },
    cancelarSos: async (sosId) => chamar('PATCH', `/sos/${idDaApi(sosId)}/cancelar`),
    encerrarSos: async (sosId) => chamar('PATCH', `/sos/${idDaApi(sosId)}/encerrar`),
    urlAcompanhamento: (token) => `${base}/acompanhar/${id(token)}`,

    enviarRelato: async (relato) => {
      const r = await chamar<{ relatoId: number }>('POST', '/relatos', {
        // A descrição é opcional no app, mas a API exige o campo (aceita vazio).
        corpo: { ...relato, usuarioId: idDaApi(relato.usuarioId), descricao: relato.descricao ?? '' },
      });
      return { relatoId: String(r.relatoId) };
    },

    listarEventosVestivelPendentes: async (u) => {
      const r = await chamar<EventoApi[]>('GET', '/eventos-vestivel/pendentes', { query: { usuarioId: idDaApi(u) } });
      return r.map((e): EventoVestivel => ({ eventoId: String(e.eventoId), tipo: e.tipo, ocorridoEm: e.ocorridoEm }));
    },
    parearVestivel: async (u, dispositivoId) => chamar('POST', `/usuarios/${idDaApi(u)}/vestivel`, { corpo: { dispositivoId } }),
    desparearVestivel: async (u) => chamar('DELETE', `/usuarios/${idDaApi(u)}/vestivel`),
    enviarAlertaVestivel: async (u, alerta) => chamar('POST', `/usuarios/${idDaApi(u)}/alertas-vestivel`, { corpo: alerta }),
    enviarEventoVestivel: async (evento) => chamar('POST', '/eventos-vestivel', { corpo: evento }),

    saude: async () => chamar('GET', '/saude'),
  };
}
