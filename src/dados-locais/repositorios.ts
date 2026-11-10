import type { NovoRelato, NovoSos, OrigemSos, TipoSos } from '@/api/types';
import { comBanco } from '@/db';

/**
 * Acesso ao SQLite para cache, filas, turnos, mensagens e locais frequentes.
 * Todas as funções toleram a falta de banco (prévia web) e devolvem um valor neutro.
 */

const agoraIso = () => new Date().toISOString();

// ---------- Cache (RNF10: funciona sem internet com o último dado) ----------

export async function gravarCache(tabela: 'cache_plano' | 'cache_risco', chave: string, payload: unknown) {
  await comBanco(
    (db) =>
      db.runAsync(
        `INSERT INTO ${tabela} (chave, payload, atualizado_em) VALUES (?, ?, ?)
         ON CONFLICT(chave) DO UPDATE SET payload = excluded.payload, atualizado_em = excluded.atualizado_em`,
        chave,
        JSON.stringify(payload),
        agoraIso(),
      ),
    undefined,
  );
}

/** Lê o cache da chave; sem ela, o mais recente da tabela (melhor que nada sem internet). */
export async function lerCache<T>(
  tabela: 'cache_plano' | 'cache_risco',
  chave: string,
): Promise<{ payload: T; atualizadoEm: string; mesmaChave: boolean } | null> {
  return comBanco(async (db) => {
    const exata = await db.getFirstAsync<{ payload: string; atualizado_em: string }>(
      `SELECT payload, atualizado_em FROM ${tabela} WHERE chave = ?`,
      chave,
    );
    const linha =
      exata ??
      (await db.getFirstAsync<{ payload: string; atualizado_em: string }>(
        `SELECT payload, atualizado_em FROM ${tabela} ORDER BY atualizado_em DESC LIMIT 1`,
      ));
    if (!linha) return null;
    return { payload: JSON.parse(linha.payload) as T, atualizadoEm: linha.atualizado_em, mesmaChave: !!exata };
  }, null);
}

// ---------- Fila de SOS (RF21, RB11, RB13) ----------

export type SituacaoSos = 'ativo' | 'cancelado' | 'encerrado';

export type RegistroSos = {
  eventoId: string;
  payload: NovoSos | (Omit<NovoSos, 'lat' | 'lon'> & { lat: null; lon: null });
  criadoEm: string;
  enviado: boolean;
  enviadoEm: string | null;
  sosId: string | null;
  token: string | null;
  situacao: SituacaoSos;
  acaoPendente: 'cancelar' | 'encerrar' | null;
  tipo: TipoSos;
  origem: OrigemSos;
  tentativas: number;
};

type LinhaSos = {
  evento_id: string;
  payload: string;
  criado_em: string;
  estado: string;
  tentativas: number;
  enviado_em: string | null;
  sos_id: string | null;
  token: string | null;
  situacao: SituacaoSos;
  acao_pendente: 'cancelar' | 'encerrar' | null;
  tipo: TipoSos;
  origem: OrigemSos;
};

const paraRegistro = (l: LinhaSos): RegistroSos => ({
  eventoId: l.evento_id,
  payload: JSON.parse(l.payload),
  criadoEm: l.criado_em,
  enviado: l.estado === 'enviado',
  enviadoEm: l.enviado_em,
  sosId: l.sos_id,
  token: l.token,
  situacao: l.situacao,
  acaoPendente: l.acao_pendente,
  tipo: l.tipo,
  origem: l.origem,
  tentativas: l.tentativas,
});

export async function inserirSos(r: Pick<RegistroSos, 'eventoId' | 'payload' | 'tipo' | 'origem'>) {
  await comBanco(
    (db) =>
      db.runAsync(
        `INSERT OR IGNORE INTO fila_sos (evento_id, payload, criado_em, tipo, origem) VALUES (?, ?, ?, ?, ?)`,
        r.eventoId,
        JSON.stringify(r.payload),
        agoraIso(),
        r.tipo,
        r.origem,
      ),
    undefined,
  );
}

export async function lerSos(eventoId: string): Promise<RegistroSos | null> {
  return comBanco(async (db) => {
    const l = await db.getFirstAsync<LinhaSos>('SELECT * FROM fila_sos WHERE evento_id = ?', eventoId);
    return l ? paraRegistro(l) : null;
  }, null);
}

export async function sosMaisRecenteAtivo(): Promise<RegistroSos | null> {
  return comBanco(async (db) => {
    const l = await db.getFirstAsync<LinhaSos>(
      `SELECT * FROM fila_sos WHERE situacao = 'ativo' ORDER BY criado_em DESC LIMIT 1`,
    );
    return l ? paraRegistro(l) : null;
  }, null);
}

/** SOS que ainda precisam falar com a API: envio pendente ou cancelamento/encerramento pendente. */
export async function sosPendentes(): Promise<RegistroSos[]> {
  return comBanco(async (db) => {
    const linhas = await db.getAllAsync<LinhaSos>(
      `SELECT * FROM fila_sos
       WHERE (estado = 'pendente' AND situacao = 'ativo') OR acao_pendente IS NOT NULL
       ORDER BY criado_em`,
    );
    return linhas.map(paraRegistro);
  }, []);
}

export async function atualizarSos(
  eventoId: string,
  mudanca: Partial<Pick<RegistroSos, 'payload' | 'enviado' | 'sosId' | 'token' | 'situacao' | 'acaoPendente'>> & {
    tentativa?: boolean;
  },
) {
  const sets: string[] = [];
  const valores: (string | number | null)[] = [];
  const definir = (sql: string, valor?: string | number | null) => {
    sets.push(sql);
    if (valor !== undefined) valores.push(valor);
  };
  if (mudanca.payload) definir('payload = ?', JSON.stringify(mudanca.payload));
  if (mudanca.enviado) {
    definir(`estado = 'enviado'`);
    definir('enviado_em = ?', agoraIso());
  }
  if (mudanca.sosId !== undefined) definir('sos_id = ?', mudanca.sosId);
  if (mudanca.token !== undefined) definir('token = ?', mudanca.token);
  if (mudanca.situacao) definir('situacao = ?', mudanca.situacao);
  if (mudanca.acaoPendente !== undefined) definir('acao_pendente = ?', mudanca.acaoPendente);
  if (mudanca.tentativa) definir('tentativas = tentativas + 1');
  if (sets.length === 0) return;
  await comBanco(
    (db) => db.runAsync(`UPDATE fila_sos SET ${sets.join(', ')} WHERE evento_id = ?`, ...valores, eventoId),
    undefined,
  );
}

/** RNF16: a coordenada do SOS não fica para sempre no aparelho (proposta: 30 dias). */
export async function limparSosAntigos(dias = 30) {
  const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  await comBanco(
    (db) => db.runAsync(`DELETE FROM fila_sos WHERE situacao != 'ativo' AND acao_pendente IS NULL AND criado_em < ?`, limite),
    undefined,
  );
}

// ---------- Fila de relatos (RF26) ----------

export async function inserirRelato(relato: NovoRelato) {
  await comBanco(
    (db) =>
      db.runAsync(
        'INSERT OR IGNORE INTO fila_relatos (evento_id, payload, criado_em) VALUES (?, ?, ?)',
        relato.eventoId,
        JSON.stringify(relato),
        agoraIso(),
      ),
    undefined,
  );
}

export async function relatosPendentes(): Promise<NovoRelato[]> {
  return comBanco(async (db) => {
    const linhas = await db.getAllAsync<{ payload: string }>(
      'SELECT payload FROM fila_relatos WHERE enviado_em IS NULL ORDER BY criado_em',
    );
    return linhas.map((l) => JSON.parse(l.payload) as NovoRelato);
  }, []);
}

export async function marcarRelato(eventoId: string, resultado: 'enviado' | 'tentativa' | 'descartado') {
  await comBanco(
    (db) =>
      resultado === 'descartado'
        ? db.runAsync('DELETE FROM fila_relatos WHERE evento_id = ?', eventoId)
        : resultado === 'enviado'
          ? db.runAsync('UPDATE fila_relatos SET enviado_em = ? WHERE evento_id = ?', agoraIso(), eventoId)
          : db.runAsync('UPDATE fila_relatos SET tentativas = tentativas + 1 WHERE evento_id = ?', eventoId),
    undefined,
  );
}

// ---------- Turnos e alertas (RB04, RB18) ----------

export async function registrarTurno(id: string, iniciadoEm: number) {
  await comBanco(
    (db) =>
      db.runAsync(
        `INSERT OR IGNORE INTO turnos (id, iniciado_em, estado) VALUES (?, ?, 'ativo')`,
        id,
        new Date(iniciadoEm).toISOString(),
      ),
    undefined,
  );
}

export async function mudarEstadoTurno(id: string, estado: 'ativo' | 'pausado' | 'finalizado') {
  await comBanco(
    (db) =>
      db.runAsync(
        `UPDATE turnos SET estado = ?, finalizado_em = CASE WHEN ? = 'finalizado' THEN ? ELSE finalizado_em END WHERE id = ?`,
        estado,
        estado,
        agoraIso(),
        id,
      ),
    undefined,
  );
}

export async function alertasDoTurno(turnoId: string): Promise<{ celulaId: string; em: number }[]> {
  return comBanco(async (db) => {
    const linhas = await db.getAllAsync<{ celula_id: string; alertado_em: string }>(
      'SELECT celula_id, alertado_em FROM alertas_turno WHERE turno_id = ?',
      turnoId,
    );
    return linhas.map((l) => ({ celulaId: l.celula_id, em: Date.parse(l.alertado_em) }));
  }, []);
}

export async function registrarAlerta(turnoId: string, celulaId: string, em: number) {
  await comBanco(
    (db) =>
      db.runAsync(
        'INSERT OR IGNORE INTO alertas_turno (turno_id, celula_id, alertado_em) VALUES (?, ?, ?)',
        turnoId,
        celulaId,
        new Date(em).toISOString(),
      ),
    undefined,
  );
}

// ---------- Mensagens (RB05) ----------

export async function ultimasMensagensExibidas(limite = 10): Promise<string[]> {
  return comBanco(async (db) => {
    const linhas = await db.getAllAsync<{ mensagem_id: string }>(
      'SELECT mensagem_id FROM mensagens_exibidas ORDER BY exibida_em DESC LIMIT ?',
      limite,
    );
    return linhas.map((l) => l.mensagem_id);
  }, []);
}

export async function registrarMensagemExibida(mensagemId: string) {
  await comBanco(
    (db) => db.runAsync('INSERT INTO mensagens_exibidas (mensagem_id, exibida_em) VALUES (?, ?)', mensagemId, agoraIso()),
    undefined,
  );
}

export async function dispensarMensagem(mensagemId: string) {
  await comBanco(
    (db) =>
      db.runAsync(
        `INSERT INTO mensagens_dispensadas (mensagem_id, dispensada_em) VALUES (?, ?)
         ON CONFLICT(mensagem_id) DO UPDATE SET dispensada_em = excluded.dispensada_em`,
        mensagemId,
        agoraIso(),
      ),
    undefined,
  );
}

/** Dispensadas hoje (não voltam no mesmo dia). */
export async function mensagensDispensadasHoje(): Promise<Set<string>> {
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);
  return comBanco(async (db) => {
    const linhas = await db.getAllAsync<{ mensagem_id: string }>(
      'SELECT mensagem_id FROM mensagens_dispensadas WHERE dispensada_em >= ?',
      inicioDoDia.toISOString(),
    );
    return new Set(linhas.map((l) => l.mensagem_id));
  }, new Set<string>());
}

// ---------- Locais frequentes (P1, RF12, RB09): só no aparelho, sem trajetos ----------

export async function registrarVisita(celulaId: string) {
  await comBanco(
    (db) =>
      db.runAsync(
        `INSERT INTO visitas_celula (celula_id, visitas, ultima_visita) VALUES (?, 1, ?)
         ON CONFLICT(celula_id) DO UPDATE SET visitas = visitas + 1, ultima_visita = excluded.ultima_visita`,
        celulaId,
        agoraIso(),
      ),
    undefined,
  );
}

export async function lerVisitas(): Promise<Map<string, number>> {
  return comBanco(async (db) => {
    const linhas = await db.getAllAsync<{ celula_id: string; visitas: number }>(
      'SELECT celula_id, visitas FROM visitas_celula',
    );
    return new Map(linhas.map((l) => [l.celula_id, l.visitas]));
  }, new Map<string, number>());
}

export async function contarCelulasVisitadas(): Promise<number> {
  return comBanco(async (db) => {
    const l = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM visitas_celula');
    return l?.n ?? 0;
  }, 0);
}

export async function apagarHistoricoDeLocais() {
  await comBanco((db) => db.runAsync('DELETE FROM visitas_celula'), undefined);
}
