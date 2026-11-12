/** O que o mapa precisa saber de cada ponto crítico. */
export type PontoNoMapa = {
  celulaId: string;
  centroLat: number;
  centroLon: number;
  viaReferencia: string;
  percentil: number;
};

export type PropsMapaPontos = {
  /** Na ordem do plano: o número no marcador é a posição na lista. */
  pontos: PontoNoMapa[];
  /** Ponto escolhido pela pessoa (toque ou vindo do plano): o mapa vai até ele. */
  focoId: string | null;
  /** Ponto em destaque na folha de baixo (o escolhido ou o primeiro). */
  destaqueId: string | null;
  posicao: { lat: number; lon: number } | null;
  onSelecionar: (celulaId: string) => void;
  largura: number;
  altura: number;
  /** Área coberta por cima do mapa: pílula e seletor no topo, legenda e folha embaixo. */
  folgaTopo: number;
  folgaBaixo: number;
};

/** Qual mapa aparece: Google (Android), Apple (iOS) ou o esquemático (web, ou build sem chave). */
export type TipoDeMapa = 'google' | 'apple' | 'esquematico';
