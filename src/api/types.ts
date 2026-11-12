/**
 * Tipos do contrato da API (/api/v1), conforme responsabilidades_por_disciplina.md v1.4,
 * conferidos com o Swagger da API C# (garupa-sp-api, docs/evidencias/swagger-v1.json).
 * JSON em camelCase, datas em ISO 8601 UTC, IDs de evento em GUID gerado no aparelho.
 *
 * Na API, os ids de usuário, contato, SOS, relato, mensagem e evento são números.
 * O app trata todos como texto; o cliente HTTP (http.ts) converte na ida e na volta.
 */

export type Iso8601 = string;
export type Guid = string;

// ---------- Contexto do risco ----------

/** Seis faixas de 4 horas, 0 a 5 (coluna faixa_horaria do risco_celula.csv). */
export type FaixaHoraria = 0 | 1 | 2 | 3 | 4 | 5;
export type TipoDia = 'util' | 'sabado' | 'domingo';

export type ConsultaRisco = {
  lat: number;
  lon: number;
  raioMetros: number;
  faixaHoraria: FaixaHoraria;
  tipoDia: TipoDia;
  chuva: boolean;
};

export type CelulaCritica = {
  celulaId: string;
  centroLat: number;
  centroLon: number;
  /** Probabilidade ou índice do modelo, 0 a 1. É o mesmo para todos os usuários (RB06). */
  score: number;
  /** Ranking entre todas as células, 0 a 100. */
  percentil: number;
  viaReferencia: string;
  /** Id IBGE do distrito (o mesmo de GET /distritos). */
  distritoId?: number;
  /** Não vem da API: o app completa a partir de GET /distritos. */
  distritoNome?: string;
  /** Versão do modelo de ML que gerou o score (ex.: v1-xgb-2025). */
  versaoModelo?: string;
  /** Frase curta da API sobre o histórico do ponto no contexto consultado. */
  motivo?: string;
};

export type RiscoNaFaixa = {
  faixaHoraria: FaixaHoraria;
  tipoDia: TipoDia;
  chuva: boolean;
  score: number;
  percentil: number;
};

export type DetalheCelula = Omit<CelulaCritica, 'score' | 'percentil' | 'motivo'> & {
  riscoPorFaixa: RiscoNaFaixa[];
};

// ---------- Plano do turno e mensagens ----------

export type ContextoMensagem = 'chuva' | 'noite' | 'domingo' | 'ponto_critico' | 'geral';
export type TipoUso = 'entregador_app' | 'trabalho_moto' | 'ida_volta' | 'lazer';

export type Mensagem = {
  id: string;
  /** Até 140 caracteres (RB05). */
  texto: string;
  /** Fonte oficial. Na API é o link (https) da página de onde o texto saiu. */
  fonte: string;
  contexto?: ContextoMensagem;
  tipoDeUso?: TipoUso | null;
};

export type ConsultaPlano = {
  usuarioId: string;
  faixaHoraria: FaixaHoraria;
  tipoDia: TipoDia;
  chuva: boolean;
};

export type PlanoDoTurno = {
  /** Pontos críticos dos distritos do usuário, ordenados por score. */
  pontosCriticos: CelulaCritica[];
  /** Até 2 mensagens de conscientização do contexto e do tipo de uso. */
  mensagens: Mensagem[];
  /** Faixa usada pela API (a da consulta, a habitual do perfil ou a de agora). */
  faixaHoraria?: FaixaHoraria;
  origemFaixa?: 'consulta' | 'perfil' | 'horario_atual';
};

export type ConsultaMensagens = {
  contexto: ContextoMensagem;
  tipoDeUso?: TipoUso;
};

// ---------- Usuário e cadastro em camadas ----------

export type Distrito = { distritoId: number; nome: string };

export type NovoContato = { nome: string; telefone: string };
export type ContatoCriado = { contatoId: string };

/** A API grava o usuário e o primeiro contato juntos, na mesma transação. */
export type NovoUsuario = { nome: string; telefone: string; contato: NovoContato };
export type UsuarioCriado = { usuarioId: string };

/** GET /usuarios/{id}: sem a ficha médica, que nunca volta pela API. */
export type Usuario = {
  usuarioId: string;
  nome: string;
  telefone: string;
  contatos: (NovoContato & { contatoId: string })[];
};

export type FichaMedica = {
  tipoSanguineo?: string | null;
  alergias?: string | null;
  condicoes?: string | null;
  medicamentos?: string | null;
};

export type HorarioHabitual = { faixaHoraria: FaixaHoraria; tipoDia: TipoDia };

export type PerfilUso = {
  tiposDeUso: TipoUso[];
  horariosHabituais: HorarioHabitual[];
  /** Até 5 ids de distrito. */
  distritosFrequentes: number[];
};

export type Consentimentos = {
  localizacaoEmUso: boolean;
  localizacaoEmSegundoPlano: boolean;
  fichaMedica: boolean;
  historicoDeLocais: boolean;
  perfilDeUso: boolean;
};

// ---------- SOS ----------

export type TipoSos = 'queda' | 'mal_estar' | 'agressao_assalto';
export type OrigemSos = 'celular' | 'vestivel';
export type EstadoSos = 'ativo' | 'cancelado' | 'encerrado';

export type NovoSos = {
  eventoId: Guid;
  usuarioId: string;
  tipo: TipoSos;
  origem: OrigemSos;
  ocorridoEm: Iso8601;
  lat: number;
  lon: number;
};

export type SosCriado = { sosId: string; tokenAcompanhamento: string };

// ---------- Relatos ----------

/** Os tipos do design (tela 19). A API aceita qualquer texto de até 40 caracteres. */
export type TipoRelato = 'buraco' | 'oleo_pista' | 'acidente' | 'semaforo_apagado';

export type NovoRelato = {
  eventoId: Guid;
  usuarioId: string;
  tipo: TipoRelato;
  lat: number;
  lon: number;
  descricao?: string;
};

export type RelatoCriado = { relatoId: string };

// ---------- Vestível ----------

export type TipoEventoVestivel = 'impacto' | 'sos' | 'cancelar';

/** GET /eventos-vestivel/pendentes: cada evento é entregue uma vez. */
export type EventoVestivel = {
  eventoId: string;
  dispositivoId?: string;
  tipo: TipoEventoVestivel;
  ocorridoEm: Iso8601;
};

/** POST /eventos-vestivel: o que a pulseira (ESP32) manda. O app usa só no demo. */
export type NovoEventoVestivel = { dispositivoId: string; tipo: TipoEventoVestivel; ocorridoEm: Iso8601 };

/** Os sete alertas que o app repete na pulseira (RF39). */
export type TipoAlertaVestivel =
  | 'turno_ativo'
  | 'ponto_critico'
  | 'mensagem'
  | 'contagem_queda'
  | 'sos_enviado'
  | 'cancelado'
  | 'turno_encerrado';

export type NovoAlertaVestivel = { tipo: TipoAlertaVestivel; ocorridoEm: Iso8601 };

// ---------- Saúde ----------

export type Saude = { versao: string; banco: string };

// ---------- Erros ----------

/** Formato de erro da API (RFC 7807). Nunca traz coordenadas, telefone ou ficha. */
export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
};
