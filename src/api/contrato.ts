import type {
  CelulaCritica,
  Consentimentos,
  ConsultaMensagens,
  ConsultaPlano,
  ConsultaRisco,
  ContatoCriado,
  DetalheCelula,
  Distrito,
  EventoVestivel,
  FichaMedica,
  Mensagem,
  NovoAlertaVestivel,
  NovoContato,
  NovoEventoVestivel,
  NovoRelato,
  NovoSos,
  NovoUsuario,
  PerfilUso,
  PlanoDoTurno,
  RelatoCriado,
  Saude,
  SosCriado,
  Usuario,
  UsuarioCriado,
} from './types';

/**
 * Tudo o que o app consome da API, um método por endpoint do contrato.
 * Existem duas implementações com a mesma interface: HTTP (API C#) e mock.
 */
export interface GarupaApi {
  /** GET /risco */
  obterRisco(consulta: ConsultaRisco): Promise<CelulaCritica[]>;
  /** GET /risco/celulas/{id} */
  obterCelula(celulaId: string): Promise<DetalheCelula>;

  /** POST /usuarios (com o primeiro contato de emergência) */
  criarUsuario(dados: NovoUsuario): Promise<UsuarioCriado>;
  /** GET /usuarios/{id}: nome, telefone e contatos (sem a ficha). */
  obterUsuario(usuarioId: string): Promise<Usuario>;
  /** PUT /usuarios/{id}/ficha-medica (409 sem o consentimento fichaMedica) */
  salvarFichaMedica(usuarioId: string, ficha: FichaMedica): Promise<void>;
  /** POST /usuarios/{id}/contatos */
  adicionarContato(usuarioId: string, contato: NovoContato): Promise<ContatoCriado>;
  /** PUT /usuarios/{id}/perfil (409 sem o consentimento perfilDeUso) */
  salvarPerfil(usuarioId: string, perfil: PerfilUso): Promise<void>;
  /** PUT /usuarios/{id}/consentimentos */
  salvarConsentimentos(usuarioId: string, consentimentos: Consentimentos): Promise<void>;
  /** DELETE /usuarios/{id}: apaga cadastro, ficha, contatos, perfil e relatos. */
  excluirUsuario(usuarioId: string): Promise<void>;
  /** GET /distritos */
  listarDistritos(): Promise<Distrito[]>;

  /** GET /plano-do-turno */
  obterPlanoDoTurno(consulta: ConsultaPlano): Promise<PlanoDoTurno>;
  /** GET /mensagens */
  listarMensagens(consulta: ConsultaMensagens): Promise<Mensagem[]>;

  /** POST /sos (idempotente pelo eventoId) */
  enviarSos(sos: NovoSos): Promise<SosCriado>;
  /** PATCH /sos/{id}/cancelar ("estou bem"; repetir também devolve 204) */
  cancelarSos(sosId: string): Promise<void>;
  /** PATCH /sos/{id}/encerrar (já fui atendido; repetir também devolve 204) */
  encerrarSos(sosId: string): Promise<void>;
  /** Link que o contato abre no navegador: GET /acompanhar/{token}. */
  urlAcompanhamento(token: string): string;

  /** POST /relatos (idempotente pelo eventoId; 400 fora do município de SP) */
  enviarRelato(relato: NovoRelato): Promise<RelatoCriado>;

  /** GET /eventos-vestivel/pendentes */
  listarEventosVestivelPendentes(usuarioId: string): Promise<EventoVestivel[]>;
  /** POST /usuarios/{id}/vestivel (pareamento simulado) */
  parearVestivel(usuarioId: string, dispositivoId: string): Promise<void>;
  /** DELETE /usuarios/{id}/vestivel */
  desparearVestivel(usuarioId: string): Promise<void>;
  /** POST /usuarios/{id}/alertas-vestivel (202; fica pendente para a pulseira) */
  enviarAlertaVestivel(usuarioId: string, alerta: NovoAlertaVestivel): Promise<void>;
  /** POST /eventos-vestivel (202): o que a pulseira manda. No app, só para simular no demo. */
  enviarEventoVestivel(evento: NovoEventoVestivel): Promise<void>;

  /** GET /saude */
  saude(): Promise<Saude>;
}
