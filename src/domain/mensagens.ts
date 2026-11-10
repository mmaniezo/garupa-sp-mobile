import type { ContextoMensagem, FaixaHoraria, Mensagem, TipoDia } from '@/api/types';

/**
 * Mensagens de conscientização (RB05):
 * - não repetem em sequência (a última mostrada não volta logo depois);
 * - podem ser dispensadas (dispensada não volta no mesmo dia);
 * - só com a moto parada (quem chama verifica a velocidade).
 */
export function escolherMensagem(
  candidatas: Mensagem[],
  ultimasExibidas: string[],
  dispensadas: ReadonlySet<string>,
): Mensagem | null {
  const ultima = ultimasExibidas[0];
  const disponiveis = candidatas.filter((m) => !dispensadas.has(m.id));
  if (disponiveis.length === 0) return null;
  // "Idade": posição na lista das últimas (0 = a mais recente). Nunca mostrada = mais antiga de todas.
  const idade = (id: string) => {
    const i = ultimasExibidas.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  // Prefere a que não aparece há mais tempo; nunca repete a última se houver outra.
  const ordenadas = [...disponiveis].sort((a, b) => idade(b.id) - idade(a.id));
  return ordenadas.find((m) => m.id !== ultima) ?? null;
}

/** Contexto principal do momento para GET /mensagens. */
export function contextoDaMensagem(faixa: FaixaHoraria, tipoDia: TipoDia, chuva: boolean): ContextoMensagem {
  if (chuva) return 'chuva';
  if (tipoDia === 'domingo') return 'domingo';
  if (faixa >= 4 || faixa === 0) return 'noite';
  return 'geral';
}
