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
  NovoSos,
  PerfilUso,
  SosCriado,
  TipoDia,
  TipoEventoVestivel,
  TipoRelato,
  TipoUso,
} from '../types';
import { CELULAS, DIAS, DISTRITOS, MENSAGENS, riscoDaCelula, VERSAO_MODELO, type CelulaMock } from './dados';

/**
 * API simulada com o mesmo contrato e as mesmas regras da API C# (garupa-sp-api):
 * risco do modelo de ML, só percentil ≥ 95, consentimento antes da ficha e do perfil,
 * usuário criado junto com o primeiro contato, SOS e relato idempotentes pelo eventoId (GUID).
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

type SosMock = SosCriado & { estado: EstadoSos; usuarioId: string; dados: string };

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
const TIPOS_USO: TipoUso[] = ['entregador_app', 'trabalho_moto', 'ida_volta', 'lazer'];
const TIPOS_EVENTO: TipoEventoVestivel[] = ['impacto', 'sos', 'cancelar'];
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUID_VAZIO = '00000000-0000-0000-0000-000000000000';

/** Retângulo que envolve o município. A API real usa o polígono do município (RF26). */
const LIMITES_SP = { latMin: -24.01, latMax: -23.35, lonMin: -46.83, lonMax: -46.36 };

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

/** Regra de estado (consentimento que falta, SOS já encerrado...), como na API. */
function erro409(titulo: string): ErroApi {
  return new ErroApi(409, { title: titulo, status: 409 });
}

const guidValido = (id: string) => GUID.test(id) && id !== GUID_VAZIO;

/** A frase que a API manda com cada ponto (ConteudoService.Ponto). */
const motivoDaApi = (chuva: boolean) =>
  chuva
    ? 'Histórico de sinistros neste horário com chuva. Reduza a velocidade.'
    : 'Histórico de sinistros neste horário. Mantenha distância e atenção.';

/** O que a API compara para saber se um reenvio é o mesmo SOS. */
const dadosDoSos = (s: NovoSos) => JSON.stringify([s.usuarioId, s.tipo, s.origem, s.ocorridoEm, s.lat, s.lon]);

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
    const { score, percentil } = riscoDaCelula(c, faixa, dia, chuva);
    return {
      celulaId: c.celulaId,
      centroLat: c.centroLat,
      centroLon: c.centroLon,
      score,
      percentil,
      viaReferencia: c.viaReferencia,
      distritoId: c.distritoId,
      distritoNome: c.distritoNome,
      versaoModelo: VERSAO_MODELO,
      motivo: motivoDaApi(chuva),
    };
  }

  /** Como a API: só o contexto pedido, só percentil ≥ 95, maior score primeiro (empate pelo id). */
  function pontosDoContexto(celulas: CelulaMock[], faixa: FaixaHoraria, dia: TipoDia, chuva: boolean) {
    return celulas
      .map((cel) => paraCelulaCritica(cel, faixa, dia, chuva))
      .filter((cel) => cel.percentil >= regras.percentilCorte)
      .sort((a, b) => b.score - a.score || a.celulaId.localeCompare(b.celulaId));
  }

  function validarContato(contato: { nome?: string; telefone?: string } | undefined) {
    const nome = contato?.nome?.trim();
    if (!nome) throw erro400('nome', 'Informe o nome do contato.');
    const tel = validarTelefone(contato?.telefone ?? '');
    if (!tel.valido) throw erro400('telefone', 'Telefone fora do padrão brasileiro.');
    return { nome, telefone: tel.e164 };
  }

  const api: ApiMock = {
    obterRisco: (c) =>
      responder(() => {
        if (!(c.raioMetros >= 1 && c.raioMetros <= 50_000)) throw erro400('raioMetros', 'Raio inválido.');
        const perto = CELULAS.filter((cel) => distanciaMetros(c.lat, c.lon, cel.centroLat, cel.centroLon) <= c.raioMetros);
        return pontosDoContexto(perto, c.faixaHoraria, c.tipoDia, c.chuva);
      }),

    obterCelula: (celulaId) =>
      responder(() => {
        const c = CELULAS.find((cel) => cel.celulaId === celulaId);
        if (!c) throw erro404('Célula não encontrada');
        const faixas: FaixaHoraria[] = [0, 1, 2, 3, 4, 5];
        return {
          celulaId: c.celulaId,
          centroLat: c.centroLat,
          centroLon: c.centroLon,
          viaReferencia: c.viaReferencia,
          distritoId: c.distritoId,
          distritoNome: c.distritoNome,
          versaoModelo: VERSAO_MODELO,
          riscoPorFaixa: faixas.flatMap((faixaHoraria) =>
            DIAS.flatMap((tipoDia) =>
              [false, true].map((chuva) => ({ faixaHoraria, tipoDia, chuva, ...riscoDaCelula(c, faixaHoraria, tipoDia, chuva) })),
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
        // Como na API: o usuário só nasce com um contato de emergência.
        const contato = validarContato(dados.contato);
        const usuarioId = novoId('usr');
        usuarios.set(usuarioId, { nome, telefone: tel.e164, contatos: [{ contatoId: novoId('ctt'), ...contato }] });
        return { usuarioId };
      }),

    obterUsuario: (usuarioId) =>
      responder(() => {
        const u = usuario(usuarioId);
        return { usuarioId, nome: u.nome, telefone: u.telefone, contatos: u.contatos.map((c) => ({ ...c })) };
      }),

    salvarFichaMedica: (usuarioId, ficha) =>
      responder(() => {
        const u = usuario(usuarioId);
        if (!u.consentimentos?.fichaMedica) throw erro409('É necessário consentir com o armazenamento da ficha.');
        u.ficha = { ...ficha };
      }),

    adicionarContato: (usuarioId, contato) =>
      responder(() => {
        const u = usuario(usuarioId);
        const valido = validarContato(contato);
        if (u.contatos.length >= regras.maxContatos) {
          throw erro400('contatos', `Até ${regras.maxContatos} contatos.`);
        }
        const contatoId = novoId('ctt');
        u.contatos.push({ contatoId, ...valido });
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
        if ((perfil.tiposDeUso ?? []).some((t) => !TIPOS_USO.includes(t)) || (perfil.horariosHabituais ?? []).length > 18) {
          throw erro400('perfil', 'Perfil inválido.');
        }
        if (!u.consentimentos?.perfilDeUso) throw erro409('É necessário consentir com o perfil de uso.');
        u.perfil = { ...perfil, distritosFrequentes: [...new Set(distritos)] };
      }),

    salvarConsentimentos: (usuarioId, c) =>
      responder(() => {
        const u = usuario(usuarioId);
        if (c.localizacaoEmSegundoPlano && !c.localizacaoEmUso) {
          throw erro400('localizacaoEmSegundoPlano', 'Localização em segundo plano exige localização em uso.');
        }
        u.consentimentos = { ...c };
        // Revogar apaga o dado na hora, como na API.
        if (!c.fichaMedica) u.ficha = undefined;
        if (!c.perfilDeUso) u.perfil = undefined;
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
        // Sem distritos, a lista vem vazia e o app usa GET /risco num raio da posição atual (RB07).
        const pontosCriticos = pontosDoContexto(
          CELULAS.filter((cel) => distritos.includes(cel.distritoId)),
          c.faixaHoraria,
          c.tipoDia,
          c.chuva,
        );

        // Mesma escolha da API: um contexto do momento, depois as do tipo de uso, depois pelo id.
        const usos = u.perfil?.tiposDeUso ?? [];
        const noite = c.faixaHoraria === 0 || c.faixaHoraria === 5;
        const contexto: ContextoMensagem = c.chuva ? 'chuva' : noite ? 'noite' : c.tipoDia === 'domingo' ? 'domingo' : 'geral';
        const mensagens: Mensagem[] = MENSAGENS.filter(
          (m) => (m.contexto === contexto || m.contexto === 'geral') && (m.tipoDeUso === null || usos.includes(m.tipoDeUso)),
        )
          .sort(
            (a, b) =>
              Number(b.contexto === contexto) - Number(a.contexto === contexto) ||
              Number(b.tipoDeUso !== null) - Number(a.tipoDeUso !== null) ||
              Number(a.id) - Number(b.id),
          )
          .slice(0, 2)
          .map(({ id, texto, fonte }) => ({ id, texto, fonte }));
        return { pontosCriticos, mensagens, faixaHoraria: c.faixaHoraria, origemFaixa: 'consulta' as const };
      }),

    listarMensagens: (c) =>
      responder(() =>
        MENSAGENS.filter(
          (m) => m.contexto === c.contexto && (!c.tipoDeUso || m.tipoDeUso === null || m.tipoDeUso === c.tipoDeUso),
        ).map(({ id, texto, fonte }) => ({ id, texto, fonte })),
      ),

    enviarSos: (novo) =>
      responder(() => {
        usuario(novo.usuarioId);
        if (!guidValido(novo.eventoId)) throw erro400('eventoId', 'Evento inválido.');
        if (typeof novo.lat !== 'number' || typeof novo.lon !== 'number') throw erro400('lat', 'Posição inválida.');
        if (Date.parse(novo.ocorridoEm) > Date.now()) throw erro400('ocorridoEm', 'Horário inválido.');
        const dados = dadosDoSos(novo);
        const existente = sosPorEvento.get(novo.eventoId);
        if (existente) {
          // Mesmo evento e mesmos dados: o mesmo SOS (RB13). Outros dados: 409, como na API.
          if (sos.get(existente.sosId)?.dados !== dados) throw erro409('Evento já utilizado com outros dados.');
          return { ...existente };
        }
        const criado: SosCriado = { sosId: novoId('sos'), tokenAcompanhamento: novoId('tok') };
        sosPorEvento.set(novo.eventoId, criado);
        sos.set(criado.sosId, { ...criado, estado: 'ativo', usuarioId: novo.usuarioId, dados });
        return { ...criado };
      }),

    // Repetir a mesma transição é sucesso; trocar um estado final pelo outro é 409.
    cancelarSos: (sosId) =>
      responder(() => {
        const s = sos.get(sosId);
        if (!s) throw erro404('SOS não encontrado');
        if (s.estado === 'encerrado') throw erro409('SOS já encerrado.');
        s.estado = 'cancelado';
      }),

    encerrarSos: (sosId) =>
      responder(() => {
        const s = sos.get(sosId);
        if (!s) throw erro404('SOS não encontrado');
        if (s.estado === 'cancelado') throw erro409('SOS já cancelado.');
        s.estado = 'encerrado';
      }),

    urlAcompanhamento: (token) => `https://api.exemplo.invalid/api/v1/acompanhar/${encodeURIComponent(token)}`,

    enviarRelato: (relato) =>
      responder(() => {
        usuario(relato.usuarioId);
        if (!guidValido(relato.eventoId)) throw erro400('eventoId', 'Relato inválido.');
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
        const id = dispositivoId?.trim();
        if (!id) throw erro400('dispositivoId', 'Informe o código da pulseira.');
        const u = usuario(usuarioId);
        if ([...usuarios.entries()].some(([outro, x]) => outro !== usuarioId && x.dispositivoId === id)) {
          throw erro409('Dispositivo já pareado.');
        }
        if (u.dispositivoId !== id) eventosVestivel.set(usuarioId, []); // trocar de pulseira descarta pendências
        u.dispositivoId = id;
      }),

    desparearVestivel: (usuarioId) =>
      responder(() => {
        usuario(usuarioId).dispositivoId = undefined;
        eventosVestivel.set(usuarioId, []);
      }),

    enviarAlertaVestivel: (usuarioId, alerta) =>
      responder(() => {
        const u = usuario(usuarioId);
        if (!u.dispositivoId) throw erro404('Nenhuma pulseira pareada');
        alertasVestivel.push({ ...alerta, dispositivoId: u.dispositivoId, recebidoEm: Date.now() });
      }),

    enviarEventoVestivel: (evento) =>
      responder(() => {
        if (!TIPOS_EVENTO.includes(evento.tipo)) throw erro400('tipo', 'Evento inválido.');
        const dono = [...usuarios.entries()].find(([, u]) => u.dispositivoId === evento.dispositivoId);
        if (!dono) throw erro404('Dispositivo não pareado');
        const lista = eventosVestivel.get(dono[0]) ?? [];
        lista.push({ eventoId: novoId('evv'), tipo: evento.tipo, ocorridoEm: evento.ocorridoEm });
        eventosVestivel.set(dono[0], lista);
      }),

    saude: () => responder(() => ({ versao: 'mock', banco: 'memoria' })),

    // ----- Controles do mock -----

    simularEventoVestivel(usuarioId, tipo) {
      const u = usuarios.get(usuarioId);
      if (!u?.dispositivoId) return; // não pareado: a API real responde 404 e não gera evento
      const lista = eventosVestivel.get(usuarioId) ?? [];
      lista.push({ eventoId: novoId('evv'), tipo, ocorridoEm: new Date().toISOString() });
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
