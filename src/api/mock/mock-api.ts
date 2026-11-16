import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';

import { regras } from '@/config';
import { problemaDaSenha } from '@/domain/senha';
import { validarTelefone } from '@/domain/telefone';

import type { GarupaApi } from '../contrato';
import { ErroApi, ErroDeRede } from '../erros';
import type {
  AlertaVestivelPendente,
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
 * A exceção são as contas (telefone, nome, hash da senha e contatos), que ficam no armazém
 * recebido: assim dá para sair e entrar de novo com telefone e senha, como na API.
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

type SosMock = SosCriado & {
  estado: EstadoSos;
  usuarioId: string;
  dados: string;
  horario: string;
  posicao: { lat: number; lon: number };
};

/** Como na API: o alerta da pulseira vale 30 s e é entregue uma vez. */
const VALIDADE_ALERTA_VESTIVEL_MS = 30_000;

/** Conta para o login. A senha nunca é guardada: só o hash SHA-256 de sal + senha. */
export type ContaMock = {
  usuarioId: string;
  telefone: string;
  nome: string;
  sal: string;
  senhaHash: string;
  contatos: { contatoId: string; nome: string; telefone: string }[];
};

/** Onde o mock guarda as contas (no app, o SQLite do aparelho; nos testes, a memória). */
export type ArmazemDeContas = {
  ler(): Promise<ContaMock[]>;
  gravar(contas: ContaMock[]): Promise<void>;
};

const hashPadrao = (texto: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, texto);

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

function erro401(): ErroApi {
  return new ErroApi(401, { title: 'Telefone ou senha incorretos.', status: 401 });
}

export function criarApiMock(
  opcoes: { latenciaMs?: number; contas?: ArmazemDeContas; hash?: (texto: string) => Promise<string> } = {},
): ApiMock {
  const latencia = opcoes.latenciaMs ?? 250;
  const hash = opcoes.hash ?? hashPadrao;
  let semConexao = false;
  let sequencia = 0;
  const novoId = (prefixo: string) => `${prefixo}-${++sequencia}-${Date.now().toString(36)}`;

  const usuarios = new Map<string, UsuarioMock>();
  const sosPorEvento = new Map<string, SosCriado>();
  const sos = new Map<string, SosMock>();
  const relatosPorEvento = new Map<string, string>();
  const eventosVestivel = new Map<string, EventoVestivel[]>();
  const alertasVestivel: (NovoAlertaVestivel & {
    alertaId: string;
    dispositivoId: string;
    recebidoEm: number;
    entregue: boolean;
  })[] = [];

  // Contas por telefone (E.164). Carregadas uma vez; toda chamada espera a leitura terminar.
  const contas = new Map<string, ContaMock>();
  const contasCarregadas = (opcoes.contas?.ler() ?? Promise.resolve([]))
    .then((lista) => lista.forEach((c) => contas.set(c.telefone, c)))
    .catch(() => undefined);
  const contaDoUsuario = (usuarioId: string) => [...contas.values()].find((c) => c.usuarioId === usuarioId);
  async function salvarContas() {
    await opcoes.contas?.gravar([...contas.values()]).catch(() => undefined);
  }
  const novoToken = () => `mock.${randomUUID()}`;
  /** A conta guardada acompanha os contatos (é o que volta no login). */
  async function guardarContatosDaConta(usuarioId: string, u: UsuarioMock) {
    const conta = contaDoUsuario(usuarioId);
    if (!conta) return;
    conta.contatos = u.contatos.map((c) => ({ ...c }));
    await salvarContas();
  }

  async function responder<T>(fn: () => T | Promise<T>): Promise<T> {
    await contasCarregadas;
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
      // Com conta guardada, volta com nome, telefone e contatos.
      const conta = contaDoUsuario(usuarioId);
      u = { nome: conta?.nome ?? '', telefone: conta?.telefone ?? '', contatos: conta?.contatos.map((c) => ({ ...c })) ?? [] };
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
      responder(async () => {
        const nome = dados.nome?.trim() ?? '';
        if (!nome) throw erro400('nome', 'Informe seu nome ou apelido.');
        if (nome.length > 60) throw erro400('nome', 'Use até 60 caracteres.');
        const tel = validarTelefone(dados.telefone ?? '');
        if (!tel.valido) throw erro400('telefone', 'Telefone fora do padrão brasileiro.');
        const problema = problemaDaSenha(dados.senha ?? '');
        if (problema) throw erro400('senha', problema);
        // Como na API: o usuário só nasce com um contato de emergência.
        const contato = validarContato(dados.contato);
        // Um telefone, uma conta: é ele que identifica a pessoa no login.
        if (contas.has(tel.e164)) throw erro409('Este telefone já tem conta. Entre com a sua senha.');
        const usuarioId = novoId('usr');
        const contatos = [{ contatoId: novoId('ctt'), ...contato }];
        usuarios.set(usuarioId, { nome, telefone: tel.e164, contatos: contatos.map((c) => ({ ...c })) });
        const sal = randomUUID();
        contas.set(tel.e164, { usuarioId, telefone: tel.e164, nome, sal, senhaHash: await hash(sal + dados.senha), contatos });
        await salvarContas();
        return { usuarioId, token: novoToken() };
      }),

    entrar: (credenciais) =>
      responder(async () => {
        const tel = validarTelefone(credenciais.telefone ?? '');
        const conta = tel.valido ? contas.get(tel.e164) : undefined;
        if (!conta || excluidos.has(conta.usuarioId)) throw erro401();
        if ((await hash(conta.sal + (credenciais.senha ?? ''))) !== conta.senhaHash) throw erro401();
        usuario(conta.usuarioId);
        return { usuarioId: conta.usuarioId, nome: conta.nome, token: novoToken() };
      }),

    obterUsuario: (usuarioId) =>
      responder(() => {
        const u = usuario(usuarioId);
        return { usuarioId, nome: u.nome, telefone: u.telefone, contatos: u.contatos.map((c) => ({ ...c })) };
      }),

    atualizarUsuario: (usuarioId, dados) =>
      responder(async () => {
        const u = usuario(usuarioId);
        const nome = dados.nome?.trim() ?? '';
        if (!nome) throw erro400('nome', 'Informe seu nome ou apelido.');
        if (nome.length > 60) throw erro400('nome', 'Use até 60 caracteres.');
        const tel = validarTelefone(dados.telefone ?? '');
        if (!tel.valido) throw erro400('telefone', 'Telefone fora do padrão brasileiro.');
        // O celular é o login: não pode ser o de outra conta.
        const dono = contas.get(tel.e164);
        if (dono && dono.usuarioId !== usuarioId) throw erro409('Este telefone já tem conta.');
        u.nome = nome;
        u.telefone = tel.e164;
        const conta = contaDoUsuario(usuarioId);
        if (conta) {
          contas.delete(conta.telefone);
          contas.set(tel.e164, { ...conta, nome, telefone: tel.e164 });
          await salvarContas();
        }
      }),

    salvarFichaMedica: (usuarioId, ficha) =>
      responder(() => {
        const u = usuario(usuarioId);
        if (!u.consentimentos?.fichaMedica) throw erro409('É necessário consentir com o armazenamento da ficha.');
        u.ficha = { ...ficha };
      }),

    adicionarContato: (usuarioId, contato) =>
      responder(async () => {
        const u = usuario(usuarioId);
        const valido = validarContato(contato);
        if (u.contatos.length >= regras.maxContatos) {
          throw erro400('contatos', `Até ${regras.maxContatos} contatos.`);
        }
        const contatoId = novoId('ctt');
        u.contatos.push({ contatoId, ...valido });
        await guardarContatosDaConta(usuarioId, u);
        return { contatoId };
      }),

    atualizarContato: (usuarioId, contatoId, contato) =>
      responder(async () => {
        const u = usuario(usuarioId);
        const atual = u.contatos.find((c) => c.contatoId === contatoId);
        if (!atual) throw erro404('Contato não encontrado.');
        Object.assign(atual, validarContato(contato));
        await guardarContatosDaConta(usuarioId, u);
      }),

    removerContato: (usuarioId, contatoId) =>
      responder(async () => {
        const u = usuario(usuarioId);
        const i = u.contatos.findIndex((c) => c.contatoId === contatoId);
        if (i < 0) throw erro404('Contato não encontrado.');
        // Como na API (Usuario.RemoverContato): o último contato não sai.
        if (u.contatos.length === 1) throw erro409('Mantenha ao menos um contato de emergência.');
        u.contatos.splice(i, 1);
        await guardarContatosDaConta(usuarioId, u);
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
      responder(async () => {
        usuario(usuarioId);
        usuarios.delete(usuarioId);
        excluidos.add(usuarioId);
        eventosVestivel.delete(usuarioId);
        const conta = contaDoUsuario(usuarioId);
        if (conta) {
          contas.delete(conta.telefone);
          await salvarContas();
        }
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
        sos.set(criado.sosId, {
          ...criado,
          estado: 'ativo',
          usuarioId: novo.usuarioId,
          dados,
          horario: novo.ocorridoEm,
          posicao: { lat: novo.lat, lon: novo.lon },
        });
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

    acompanharSos: (token) =>
      responder(() => {
        const s = [...sos.values()].find((x) => x.tokenAcompanhamento === token);
        if (!s) throw erro404('Acompanhamento não encontrado.');
        return { estado: s.estado, horario: s.horario, posicao: { ...s.posicao } };
      }),

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
        alertasVestivel.push({
          ...alerta,
          alertaId: novoId('alv'),
          dispositivoId: u.dispositivoId,
          recebidoEm: Date.now(),
          entregue: false,
        });
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

    listarAlertasVestivelPendentes: (dispositivoId) =>
      responder(() => {
        const dono = [...usuarios.values()].some((u) => u.dispositivoId === dispositivoId);
        if (!dono) throw erro404('Dispositivo não pareado');
        const agora = Date.now();
        const pendentes: AlertaVestivelPendente[] = [];
        for (const a of alertasVestivel) {
          if (a.dispositivoId !== dispositivoId || a.entregue || agora - a.recebidoEm > VALIDADE_ALERTA_VESTIVEL_MS) continue;
          a.entregue = true;
          pendentes.push({ alertaId: a.alertaId, tipo: a.tipo, ocorridoEm: a.ocorridoEm });
        }
        return pendentes;
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
