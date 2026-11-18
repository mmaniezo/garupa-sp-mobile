/** "18:47": hora e minuto no formato do Brasil. Aceita data, ISO ou milissegundos. */
export function horaCurta(quando: Date | string | number = new Date()): string {
  return new Date(quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
