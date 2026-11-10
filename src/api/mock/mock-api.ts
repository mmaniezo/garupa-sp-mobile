import { regras } from '@/config';
import { validarTelefone } from '@/domain/telefone';

import type { GarupaApi } from '../contrato';
import { ErroApi, ErroDeRede } from '../erros';
import type {
  CelulaCritica,
  Consentimentos,
  ContextoMensagem,
  EstadoSos,
  EventoVestivel,
  FaixaHoraria,
  FichaMedica,
  Mensagem,
  NovoAlertaVestivel,
  PerfilUso,
  SosCriado,
  TipoDia,
  TipoEventoVestivel,
  TipoRelato,
} from '../types';
import { CELULAS, DISTRITOS, MENSAGENS, type CelulaMock } from './dados';

/**
 * API simulada com o mesmo contrato da API C# (responsabilidades_por_disciplina.md, seção 3,
 * item 5: "Se a API ainda não existir, um mock com o mesmo contrato").
 * Guarda tudo em memória: fechar o app zera o mock (o que é do aparelho fica no SQLite).
 */

type UsuarioMock = {
  nome: string;
  telefone: string;
  contatos: { contatoId: string; nome: string; telefone: string }[];
  ficha?: FichaMedica;
  perfil?: PerfilUso;
  consentimentos?: Consentimentos;
  dispositivoId?: string;
};

type SosMock = SosCriado & { estado: EstadoSos; usuarioId: string };

/** Controles extras do mock, para testes e para o demo sem API. */
export interface ControlesMock {
  /** Simula a pulseira mandando um evento (impacto, sos, cancelar). */
  simularEventoVestivel(usuarioId: string, tipo: TipoEventoVestivel): void;
  /** Liga o "modo avião" do mock: toda chamada falha com ErroDeRede. */
  definirSemConexao(semConexao: boolean): void;
  /** Contagens para os testes conferirem idempotência. */
  contagens(): { usuarios: number; sos: number; relatos: number; alertasVestivel: number };
  estadoDoSos(sosId: string): EstadoSos | undefined;
}

export type ApiMock = GarupaApi & ControlesMock;

const TIPOS_RELATO: TipoRelato[] = ['buraco', 'oleo_pista', 'acidente', 'semaforo_apagado'];

/** Retângulo que envolve o município. A API real usa o polígono do GeoSampa (RF26). */
const LIMITES_SP = { latMin: -24.01, latMax: -23.35, lonMin: -46.83, lonMax: -46.36 };

const FATOR_FAIXA: Record<FaixaHoraria, number> = { 0: 0.6, 1: 0.55, 2: 0.8, 3: 0.85, 4: 1, 5: 0.9 };

/** Risco de exemplo: base da célula modulada por faixa, dia e chuva. O mesmo para todos (RB06). */
export function riscoMock(c: CelulaMock, faixa: FaixaHoraria, dia: TipoDia, chuva: boolean) {
  let score = c.base * FATOR_FAIXA[faixa];
  if (chuva) score += 0.12;
  if (dia === 'domingo' && (faixa === 0 || faixa >= 4)) score += 0.05;
  if (dia === 'sabado' && faixa >= 4) score += 0.03;
  score = Math.min(1, Math.max(0, +score.toFixed(3)));
  const percentil = Math.min(100, Math.max(0, Math.round(70 + 30 * score)));
  return { score, percentil };
}

function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function erro400(campo: string, mensagem: string): ErroApi {
  return new ErroApi(400, {
    title: 'Dados inválidos',
    status: 400,
    errors: { [campo]: [mensagem] },
  });
}

function erro404(titulo: string): ErroApi {
  return new ErroApi(404, { title: titulo, status: 404 });
}

export function criarApiMock(opcoes: { latenciaMs?: number } = {}): ApiMock {
  const latencia = opcoes.latenciaMs ?? 250;
  let semConexao = false;
  let sequencia = 0;
  const novoId = (prefixo: string) => `${prefixo}-${++sequencia}-${Date.now().toString(36)}`;

  const usuarios = new Map<string, UsuarioMock>();
  const sosPorEvento = new Map<string, SosCriado>();
  const sos = new Map<string, SosMock>();
  const relatosPorEvento = new Map<string, string>();
  const eventosVestivel = new Map<string, EventoVestivel[]>();
  const alertasVestivel: (NovoAlertaVestivel & { dispositivoId: string; recebidoEm: number })[] = [];

  async function responder<T>(fn: () => T): Promise<T> {
    if (latencia > 0) await new Promise((r) => setTimeout(r, latencia));
    if (semConexao) throw new ErroDeRede('sem_conexao');
    return fn();
  }

  const excluidos = new Set<string>();

  /**
   * O mock vive na memória e zera quando o app reabre, mas o cadastro fica no aparelho.
   * Para o demo não quebrar, um id criado por ele antes ("usr-…") volta a existir, vazio.
   * Excluído continua excluído (404), como na API.
   */
  function usuario(usuarioId: string): UsuarioMock {
    let u = usuarios.get(usuarioId);
    if (!u && usuarioId.startsWith('usr-') && !excluidos.has(usuarioId)) {
      u = { nome: '', telefone: '', contatos: [] };
      usuarios.set(usuarioId, u);
    }
    if (!u) throw erro404('Usuário não encontrado');
    return u;
  }

  function paraCelulaCritica(c: CelulaMock, faixa: FaixaHoraria, dia: TipoDia, chuva: boolean): CelulaCritica {
    const { score, percentil } = riscoMock(c, faixa, dia, chuva);
    return {
      celulaId: c.celulaId,
      centroLat: c.centroLat,
      centroLon: c.centroLon,
      score,
      percentil,
      viaReferencia: c.viaReferencia,
      distritoId: c.distritoId,
      distritoNome: c.distritoNome,
    };
  }

  function contextosDoMomento(faixa: FaixaHoraria, dia: TipoDia, chuva: boolean): ContextoMensagem[] {
    const lista: ContextoMensagem[] = [];
    if (chuva) lista.push('chuva');
    if (faixa >= 4 || faixa === 0) lista.push('noite');
    if (dia === 'domingo') lista.push('domingo');
    lista.push('geral');
    return lista;
  }

  const api: ApiMock = {
    obterRisco: (c) =>
      responder(() =>
        CELULAS.filter((cel) => distanciaMetros(c.lat, c.lon, cel.centroLat, cel.centroLon) <= c.raioMetros)
          .map((cel) => paraCelulaCritica(cel, c.faixaHoraria, c.tipoDia, c.chuva))
          .filter((cel) => cel.percentil >= regras.percentilCorte)
          .sort((a, b) => b.score - a.score),
      ),

    obterCelula: (celulaId) =>
      responder(() => {
        const c = CELULAS.find((cel) => cel.celulaId === celulaId);
        if (!c) throw erro404('Célula não encontrada');
        const dias: TipoDia[] = ['util', 'sabado', 'domingo'];
        const faixas: FaixaHoraria[] = [0, 1, 2, 3, 4, 5];
        return {
          celulaId: c.celulaId,
          centroLat: c.centroLat,
          centroLon: c.centroLon,
          viaReferencia: c.viaReferencia,
          distritoId: c.distritoId,
          distritoNome: c.distritoNome,
          riscoPorFaixa: dias.flatMap((tipoDia) =>
            faixas.flatMap((faixaHoraria) =>
              [false, true].map((chuva) => ({ faixaHoraria, tipoDia, chuva, ...riscoMock(c, faixaHoraria, tipoDia, chuva) })),
            ),
          ),
        };
      }),

    criarUsuario: (dados) =>
      responder(() => {
        const nome = dados.nome?.trim() ?? '';
        if (!nome) throw erro400('nome', 'Informe seu nome ou apelido.');
        if (nome.length > 60) throw erro400('nome', 'Use até 60 caracteres.');
        const tel = validarTelefone(dados.telefone ?? '');
        if (!tel.valido) throw erro400('telefone', 'Telefone fora do padrão brasileiro.');
        const usuarioId = novoId('usr');
        usuarios.set(usuarioId, { nome, telefone: tel.e164, contatos: [] });
        return { usuarioId };
      }),

    salvarFichaMedica: (usuarioId, ficha) =>
      responder(() => {
        usuario(usuarioId).ficha = { ...ficha };
      }),

    adicionarContato: (usuarioId, contato) =>
      responder(() => {
        const u = usuario(usuarioId);
        if (!contato.nome?.trim()) throw erro400('nome', 'Informe o nome do contato.');
        const tel = validarTelefone(contato.telefone ?? '');
        if (!tel.valido) throw erro400('telefone', 'Telefone fora do padrão brasileiro.');
        if (u.contatos.length >= regras.maxContatos) {
          throw erro400('contatos', `Até ${regras.maxContatos} contatos.`);
        }
        const contatoId = novoId('ctt');
        u.contatos.push({ contatoId, nome: contato.nome.trim(), telefone: tel.e164 });
        return { contatoId };
      }),

    salvarPerfil: (usuarioId, perfil) =>
      responder(() => {
        const u = usuario(usuarioId);
        const distritos = perfil.distritosFrequentes ?? [];
        if (distritos.length > regras.maxDistritos) {
          throw erro400('distritosFrequentes', `Escolha até ${regras.maxDistritos} distritos.`);
        }
        if (distritos.some((id) => !DISTRITOS.some((d) => d.distritoId === id))) {
          throw erro400('distritosFrequentes', 'Distrito inexistente.');
        }
        u.perfil = { ...perfil, distritosFrequentes: [...new Set(distritos)] };
      }),

    salvarConsentimentos: (usuarioId, c) =>
      responder(() => {
        usuario(usuarioId).consentimentos = { ...c };
      }),

    excluirUsuario: (usuarioId) =>
      responder(() => {
        usuario(usuarioId);
        usuarios.delete(usuarioId);
        excluidos.add(usuarioId);
        eventosVestivel.delete(usuarioId);
      }),

    listarDistritos: () => responder(() => DISTRITOS.map((d) => ({ ...d }))),

    obterPlanoDoTurno: (c) =>
      responder(() => {
        const u = usuario(c.usuarioId);
        const distritos = u.perfil?.distritosFrequentes ?? [];
        // Sem distritos, o app usa GET /risco num raio da posição atual (RB07).
        const pontosCriticos = CELULAS.filter((cel) => distritos.includes(cel.distritoId))
          .map((cel) => paraCelulaCritica(cel, c.faixaHoraria, c.tipoDia, c.chuva))
          .filter((cel) => cel.percentil >= regras.percentilCorte)
          .sort((a, b) => b.score - a.score);

        const usos = u.perfil?.tiposDeUso ?? [];
        const contextos = contextosDoMomento(c.faixaHoraria, c.tipoDia, c.chuva);
        const candidatas = MENSAGENS.filter(
          (m) => contextos.includes(m.contexto) && (m.tipoDeUso === null || usos.includes(m.tipoDeUso)),
        ).sort((a, b) => {
          // Primeiro as do perfil, depois as do contexto mais específico.
          const perfil = Number(b.tipoDeUso !== null) - Number(a.tipoDeUso !== null);
          return perfil || contextos.indexOf(a.contexto) - contextos.indexOf(b.contexto);
        });
        const mensagens: Mensagem[] = candidatas.slice(0, 2).map(({ id, texto, fonte, contexto, tipoDeUso }) => ({
          id,
          texto,
          fonte,
          contexto,
          tipoDeUso,
        }));
        return { pontosCriticos, mensagens };
      }),

    listarMensagens: (c) =>
      responder(() =>
        MENSAGENS.filter(
          (m) => m.contexto === c.contexto && (!c.tipoDeUso || m.tipoDeUso === null || m.tipoDeUso === c.tipoDeUso),
        ).map((m) => ({ ...m })),
      ),

    enviarSos: (novo) =>
      responder(() => {
        usuario(novo.usuarioId);
        const existente = sosPorEvento.get(novo.eventoId);
        if (existente) return { ...existente }; // idempotente pelo eventoId (RB13)
        const criado: SosCriado = { sosId: novoId('sos'), tokenAcompanhamento: novoId('tok') };
        sosPorEvento.set(novo.eventoId, criado);
        sos.set(criado.sosId, { ...criado, estado: 'ativo', usuarioId: novo.usuarioId });
        return { ...criado };
      }),

    cancelarSos: (sosId) =>
      responder(() => {
        const s = sos.get(sosId);
        if (!s) throw erro404('SOS não encontrado');
        if (s.estado === 'ativo') s.estado = 'cancelado';
      }),

    encerrarSos: (sosId) =>
      responder(() => {
        const s = sos.get(sosId);
        if (!s) throw erro404('SOS não encontrado');
        if (s.estado === 'ativo') s.estado = 'encerrado';
      }),

    urlAcompanhamento: (token) => `https://api.exemplo.invalid/api/v1/acompanhar/${encodeURIComponent(token)}`,

    enviarRelato: (relato) =>
      responder(() => {
        usuario(relato.usuarioId);
        const existente = relatosPorEvento.get(relato.eventoId);
        if (existente) return { relatoId: existente };
        if (!TIPOS_RELATO.includes(relato.tipo)) throw erro400('tipo', 'Tipo de relato inválido.');
        const dentro =
          relato.lat >= LIMITES_SP.latMin &&
          relato.lat <= LIMITES_SP.latMax &&
          relato.lon >= LIMITES_SP.lonMin &&
          relato.lon <= LIMITES_SP.lonMax;
        if (!dentro) throw erro400('local', 'O local está fora do município de São Paulo.');
        const relatoId = novoId('rel');
        relatosPorEvento.set(relato.eventoId, relatoId);
        return { relatoId };
      }),

    listarEventosVestivelPendentes: (usuarioId) =>
      responder(() => {
        const pendentes = eventosVestivel.get(usuarioId) ?? [];
        eventosVestivel.set(usuarioId, []);
        return pendentes;
      }),

    parearVestivel: (usuarioId, dispositivoId) =>
      responder(() => {
        if (!dispositivoId?.trim()) throw erro400('dispositivoId', 'Informe o código da pulseira.');
        usuario(usuarioId).dispositivoId = dispositivoId.trim();
      }),

    desparearVestivel: (usuarioId) =>
      responder(() => {
        usuario(usuarioId).dispositivoId = undefined;
      }),

    enviarAlertaVestivel: (usuarioId, alerta) =>
      responder(() => {
        const u = usuario(usuarioId);
        if (!u.dispositivoId) throw erro404('Nenhuma pulseira pareada');
        alertasVestivel.push({ ...alerta, dispositivoId: u.dispositivoId, recebidoEm: Date.now() });
      }),

    saude: () => responder(() => ({ versao: 'mock', banco: 'memoria' })),

    // ----- Controles do mock -----

    simularEventoVestivel(usuarioId, tipo) {
      const u = usuarios.get(usuarioId);
      if (!u?.dispositivoId) return; // não pareado: a API real responde 404 e não gera evento
      const lista = eventosVestivel.get(usuarioId) ?? [];
      lista.push({ eventoId: novoId('evv'), dispositivoId: u.dispositivoId, tipo, ocorridoEm: new Date().toISOString() });
      eventosVestivel.set(usuarioId, lista);
    },

    definirSemConexao(valor) {
      semConexao = valor;
    },

    contagens: () => ({
      usuarios: usuarios.size,
      sos: sos.size,
      relatos: relatosPorEvento.size,
      alertasVestivel: alertasVestivel.length,
    }),

    estadoDoSos: (sosId) => sos.get(sosId)?.estado,
  };

  return api;
}
