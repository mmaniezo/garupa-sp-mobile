/** O que o mapa precisa saber de cada ponto crítico. */
export type PontoNoMapa = {
  celulaId: string;
  centroLat: number;
  centroLon: number;
  viaReferencia: string;
  percentil: number;
  /** Explicação curta que aparece ao tocar no ponto ("Ponto crítico: Itaim Bibi..."). */
  descricao?: string;
};

/** Perigo que a própria pessoa relatou (buraco, óleo, acidente, semáforo apagado). */
export type RelatoNoMapa = { eventoId: string; rotulo: string; lat: number; lon: number; criadoEm: string };

export type PropsMapaPontos = {
  /** Na ordem do plano: o número no marcador é a posição na lista. */
  pontos: PontoNoMapa[];
  /** Perigos relatados nas últimas horas, marcados à parte dos pontos do modelo. */
  relatos?: RelatoNoMapa[];
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

/**
 * Qual mapa aparece. Sempre um mapa real, nunca desenhado:
 * - google: Google Maps nativo (Android; no Expo Go e no APK com a chave);
 * - apple: Apple Maps (iOS, sem chave);
 * - embed: Google Maps em HTML (prévia web), centrado no ponto escolhido;
 * - indisponivel: build Android sem a chave (o SDK do Google fecharia o app): a tela avisa
 *   e oferece abrir o ponto no app do Google Maps.
 */
export type TipoDeMapa = 'google' | 'apple' | 'embed' | 'indisponivel';
