/**
 * Telefone brasileiro (RF01): DDD de 11 a 99 e número de 8 ou 9 dígitos, com ou sem +55.
 */

export type TelefoneValidado = { valido: true; e164: string; exibicao: string } | { valido: false };

function soDigitos(valor: string): string {
  return valor.replace(/\D+/g, '');
}

export function validarTelefone(valor: string): TelefoneValidado {
  let d = soDigitos(valor);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return { valido: false };

  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return { valido: false };

  const numero = d.slice(2);
  const meio = numero.length - 4;
  return {
    valido: true,
    e164: `+55${d}`,
    exibicao: `(${d.slice(0, 2)}) ${numero.slice(0, meio)}-${numero.slice(meio)}`,
  };
}

/** Máscara enquanto a pessoa digita: (11) 90000-0000. */
export function mascararTelefone(valor: string): string {
  let d = soDigitos(valor);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const meio = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}
