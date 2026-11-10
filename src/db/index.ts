import * as SQLite from 'expo-sqlite';

/**
 * Banco local (SQLite). Fica fora do React de propósito: as tarefas em segundo plano
 * (turno ativo, contagem da queda, fila de SOS) rodam sem tela e também precisam dele.
 *
 * Privacidade: o histórico de locais (visitas_celula) guarda só a contagem de visitas por
 * célula, nunca trajetos, e nada dele vai para a API (RB09, RF12).
 */

const NOME_BANCO = 'garupa.db';

/**
 * Cada item é uma versão do esquema. Para mudar o banco, ACRESCENTE um item no fim;
 * nunca edite um que já foi para um aparelho.
 */
const MIGRACOES: string[] = [
  // v1: base do app (etapa 1)
  `
  CREATE TABLE IF NOT EXISTS kv (
    chave TEXT PRIMARY KEY NOT NULL,
    valor TEXT NOT NULL
  );

  -- Cache para funcionar sem internet (RNF10): último plano e último risco consultados.
  CREATE TABLE IF NOT EXISTS cache_plano (
    chave TEXT PRIMARY KEY NOT NULL,      -- faixa|tipoDia|chuva
    payload TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cache_risco (
    chave TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );

  -- Fila offline de SOS (RF21): reenviada com o mesmo evento_id quando a conexão volta.
  CREATE TABLE IF NOT EXISTS fila_sos (
    evento_id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendente', -- pendente | enviado
    tentativas INTEGER NOT NULL DEFAULT 0,
    enviado_em TEXT,
    sos_id TEXT,
    token TEXT
  );

  -- Fila de relatos de perigo (RF26), também idempotente pelo evento_id.
  CREATE TABLE IF NOT EXISTS fila_relatos (
    evento_id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    tentativas INTEGER NOT NULL DEFAULT 0,
    enviado_em TEXT
  );

  -- Locais frequentes (P1, RF12): só contagem por célula, sem trajetos.
  CREATE TABLE IF NOT EXISTS visitas_celula (
    celula_id TEXT PRIMARY KEY NOT NULL,
    visitas INTEGER NOT NULL DEFAULT 0,
    ultima_visita TEXT NOT NULL
  );

  -- Turnos e alertas já dados (RB04: um aviso por ponto por turno, poucos por hora).
  CREATE TABLE IF NOT EXISTS turnos (
    id TEXT PRIMARY KEY NOT NULL,
    iniciado_em TEXT NOT NULL,
    finalizado_em TEXT,
    estado TEXT NOT NULL -- ativo | pausado | finalizado
  );
  CREATE TABLE IF NOT EXISTS alertas_turno (
    turno_id TEXT NOT NULL,
    celula_id TEXT NOT NULL,
    alertado_em TEXT NOT NULL,
    PRIMARY KEY (turno_id, celula_id)
  );

  -- Mensagens já mostradas (RB05: não repetir em sequência).
  CREATE TABLE IF NOT EXISTS mensagens_exibidas (
    mensagem_id TEXT NOT NULL,
    exibida_em TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_mensagens_exibidas_em ON mensagens_exibidas (exibida_em);
  `,

  // v2: estado do SOS no aparelho (RB11: ativo, cancelado, encerrado) e ação pendente sem internet.
  `
  ALTER TABLE fila_sos ADD COLUMN situacao TEXT NOT NULL DEFAULT 'ativo';
  ALTER TABLE fila_sos ADD COLUMN acao_pendente TEXT; -- cancelar | encerrar, quando o PATCH não saiu
  ALTER TABLE fila_sos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'queda';
  ALTER TABLE fila_sos ADD COLUMN origem TEXT NOT NULL DEFAULT 'celular';
  CREATE INDEX IF NOT EXISTS idx_fila_sos_situacao ON fila_sos (situacao);

  -- Mensagens dispensadas pela pessoa (não voltam no mesmo dia).
  CREATE TABLE IF NOT EXISTS mensagens_dispensadas (
    mensagem_id TEXT PRIMARY KEY NOT NULL,
    dispensada_em TEXT NOT NULL
  );
  `,
];

async function migrar(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;
  while (versao < MIGRACOES.length) {
    const sql = MIGRACOES[versao];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    versao += 1;
    await db.execAsync(`PRAGMA user_version = ${versao}`);
  }
}

let aberto: Promise<SQLite.SQLiteDatabase> | null = null;

/** Abre (uma vez) e migra o banco. Pode ser chamado de qualquer lugar, inclusive de tarefas em segundo plano. */
export function obterBanco(): Promise<SQLite.SQLiteDatabase> {
  if (!aberto) {
    aberto = SQLite.openDatabaseAsync(NOME_BANCO).then(async (db) => {
      await migrar(db);
      return db;
    });
    aberto.catch(() => {
      aberto = null; // deixa tentar de novo na próxima chamada
    });
  }
  return aberto;
}

export const versaoDoEsquema = MIGRACOES.length;

// ---------- Chave e valor (configurações e sessão) ----------

/**
 * Cópia em memória usada se o SQLite não abrir (por exemplo, na pré-visualização web).
 * No celular o SQLite é sempre o caminho.
 */
const reserva = new Map<string, string>();

export async function lerValor<T>(chave: string): Promise<T | null> {
  try {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM kv WHERE chave = ?', chave);
    return linha ? (JSON.parse(linha.valor) as T) : null;
  } catch {
    const v = reserva.get(chave);
    return v ? (JSON.parse(v) as T) : null;
  }
}

export async function gravarValor(chave: string, valor: unknown): Promise<void> {
  const json = JSON.stringify(valor);
  try {
    const db = await obterBanco();
    await db.runAsync(
      'INSERT INTO kv (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
      chave,
      json,
    );
  } catch {
    reserva.set(chave, json);
  }
}

export async function apagarValor(chave: string): Promise<void> {
  try {
    const db = await obterBanco();
    await db.runAsync('DELETE FROM kv WHERE chave = ?', chave);
  } catch {
    reserva.delete(chave);
  }
}

/** Roda uma consulta; se o banco não abrir (prévia web), devolve o valor de reserva. */
export async function comBanco<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>, reservaSemBanco: T): Promise<T> {
  try {
    return await fn(await obterBanco());
  } catch (e) {
    if (__DEV__) console.warn('[db]', (e as Error).message);
    return reservaSemBanco;
  }
}

/** Exclusão da conta (RF06): apaga tudo o que o app guardou no aparelho. */
export async function apagarTudoDoAparelho(): Promise<void> {
  reserva.clear();
  try {
    const db = await obterBanco();
    await db.execAsync(`
      DELETE FROM kv; DELETE FROM cache_plano; DELETE FROM cache_risco; DELETE FROM fila_sos;
      DELETE FROM fila_relatos; DELETE FROM visitas_celula; DELETE FROM turnos;
      DELETE FROM alertas_turno; DELETE FROM mensagens_exibidas; DELETE FROM mensagens_dispensadas;
    `);
  } catch {
    // Sem banco não há o que apagar.
  }
}
