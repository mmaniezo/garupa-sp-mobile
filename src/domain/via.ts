/**
 * Nome da via para mostrar: o Infosiga manda em maiúsculas e sem acento ("AVENIDA DOS
 * BANDEIRANTES"). Fica "Avenida dos Bandeirantes"; rodovia e numeral romano continuam como são
 * ("SP 270", "Pio XII"), e o espaço duplo, onde a fonte tirou um hífen, volta a ser hífen.
 * O que já vem com maiúsculas e minúsculas não muda. O acento a fonte não tem, e não dá para
 * adivinhar.
 */
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o']);
const ROMANO = /^(?=[IVX]+$)X{0,3}(IX|IV|V?I{0,3})$/;
const SIGLA_UF = /^(SP|BR|MG|RJ|PR)$/;

export function nomeDaVia(via: string): string {
  const limpo = via.trim().replace(/ {2,}/g, ' - ').replace(/\s+/g, ' ');
  if (!limpo || limpo !== limpo.toUpperCase()) return limpo;
  return limpo
    .split(' ')
    .map((palavra, i) => {
      if (/\d/.test(palavra) || SIGLA_UF.test(palavra) || ROMANO.test(palavra) || palavra === '-') return palavra;
      const p = palavra.toLowerCase();
      if (i > 0 && MINUSCULAS.has(p)) return p;
      if (p === 'av') return 'Av.';
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}
