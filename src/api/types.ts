/**
 * Tipos do contrato da API (/api/v1), conforme responsabilidades_por_disciplina.md v1.4.
 * JSON em camelCase, datas em ISO 8601 UTC, IDs de evento em GUID gerado no aparelho.
 *
 * Quando a API publicar o Swagger, conferir estes tipos com ele (ou gerar a partir dele).
 * Campos marcados com "a confirmar" não estão fechados no contrato.
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
  /** A confirmar no contrato: útil para mostrar "Pinheiros · ..." no plano. */
  distritoId?: number;
  distritoNome?: string;
};

export type RiscoNaFaixa = {
  faixaHoraria: FaixaHoraria;
  tipoDia: TipoDia;
  chuva: boolean;
  score: number;
  percentil: number;
};

export type DetalheCelula = Omit<CelulaCritica, 'score' | 'percentil'> & {
  riscoPorFaixa: RiscoNaFaixa[];
};

// ---------- Plano do turno e mensagens ----------

export type ContextoMensagem = 'chuva' | 'noite' | 'domingo' | 'ponto_critico' | 'geral';
export type TipoUso = 'entregador_app' | 'trabalho_moto' | 'ida_volta' | 'lazer';

export type Mensagem = {
  id: string;
  /** Até 140 caracteres (RB05). */
  texto: string;
  /** Fonte oficial (CET-SP, Detran-SP, Código de Trânsito, Infosiga). */
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
};

export type ConsultaMensagens = {
  contexto: ContextoMensagem;
  tipoDeUso?: TipoUso;
};

// ---------- Usuário e cadastro em camadas ----------

export type Distrito = { distritoId: number; nome: string };

export type NovoUsuario = { nome: string; telefone: string };
export type UsuarioCriado = { usuarioId: string };

export type FichaMedica = {
  tipoSanguineo?: string | null;
  alergias?: string | null;
  condicoes?: string | null;
  medicamentos?: string | null;
};

export type NovoContato = { nome: string; telefone: string };
export type ContatoCriado = { contatoId: string };

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

/** A confirmar com a API: o contrato não lista os tipos; estes são os do design (tela 19). */
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

/** A confirmar com a API: o contrato diz só "eventos ainda não consumidos". */
export type EventoVestivel = {
  eventoId: string;
  dispositivoId?: string;
  tipo: TipoEventoVestivel;
  ocorridoEm: Iso8601;
};

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
