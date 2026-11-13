import type { TipoSos } from '@/api/types';

/**
 * Textos do SMS de socorro. Sem acentos de propósito: com acento o SMS vira UCS-2 e cabe
 * só 70 caracteres por parte; sem, cabe 160 e o aviso chega numa mensagem só.
 * Nunca leva ficha médica nem telefone (RNF15): só nome, o que houve, a hora e o mapa.
 */

const RESUMO: Record<TipoSos, string> = {
  queda: 'queda de moto',
  mal_estar: 'mal-estar',
  agressao_assalto: 'agressao ou assalto',
};

const ACENTOS: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', é: 'e', ê: 'e', è: 'e', í: 'i', î: 'i', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ü: 'u', ç: 'c', Á: 'A', À: 'A', Â: 'A', Ã: 'A', É: 'E', Ê: 'E', Í: 'I', Ó: 'O', Ô: 'O', Õ: 'O', Ú: 'U',
  Ç: 'C',
};

export function semAcentos(texto: string): string {
  return texto.replace(/[^\x20-\x7e]/g, (ch) => ACENTOS[ch] ?? '');
}

/** Link do Google Maps (Maps URLs: abre o app ou o site, não precisa de chave). */
export function linkGoogleMaps(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lon.toFixed(5)}`;
}

export function textoSmsSocorro(d: { nome: string | null; tipo: TipoSos; hora: string; mapa: string | null }): string {
  const quem = d.nome ? semAcentos(d.nome) : 'Seu contato';
  const onde = d.mapa ? ` Mapa: ${d.mapa}` : ' Local ainda indisponivel.';
  return `SOS Garupa SP: ${quem} pediu socorro as ${d.hora} (${RESUMO[d.tipo]}).${onde} Ligue para ${d.nome ? 'ele(a)' : 'a pessoa'} ou 192.`;
}

export function textoSmsCancelado(nome: string | null, encerrado: boolean): string {
  const quem = nome ? semAcentos(nome) : 'Seu contato';
  return encerrado
    ? `Garupa SP: ${quem} ja foi atendido(a). O SOS foi encerrado.`
    : `Garupa SP: ${quem} esta bem. O SOS foi cancelado.`;
}
