import { useEffect, useState, type ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useTema } from '@/lib/tema';
import { brand } from '@/theme';

import { Logo } from './logo';
import { CORPO, LETRAS, REFLEXO, SILHUETA, SP, SP_TRANSFORM, VISEIRA } from './logo-abertura-desenho';
import {
  anguloViseira,
  camera,
  DOBRADICA,
  DURACAO_ABERTURA,
  estalo,
  opacidadeGeral,
  opacidadeLetra,
  opacidadeReflexo,
  ORIGEM_SP,
  posicaoLetra,
  saidaLetra,
  sp,
} from './logo-abertura-tempo';
import { LOGO_HORIZONTAL_RATIO } from './logo-xml';

/** Caixa da logo horizontal, nas coordenadas do desenho. */
const CAIXA = { x: -20, y: -10, largura: 2694, altura: 1193 } as const;
/** Folga acima e abaixo: enquanto está sozinho, o capacete fica maior que na logo final. */
const FOLGA = 170;
const VIEWBOX = `${CAIXA.x} ${CAIXA.y - FOLGA} ${CAIXA.largura} ${CAIXA.altura + 2 * FOLGA}`;
const DESLOCA_CAPACETE = 'translate(-412 -439)';

/** O motion roda uma vez por abertura do app (até o fim), não a cada volta para a tela. */
let jaAbriu = false;

type Props = {
  /** Altura da logo horizontal parada; a largura sai da proporção. */
  altura: number;
  /** Espera antes de começar, em ms. */
  atraso?: number;
  /** Roda mesmo que já tenha rodado nesta abertura (catálogo de desenvolvimento). */
  sempre?: boolean;
};

/**
 * Logo horizontal com o motion da marca: o capacete entra, a viseira desce com "Garupa" nela,
 * o nome sai para o lado e o "SP" aparece. Termina exatamente na logo parada, que fica no lugar.
 * Roda uma vez por abertura do app; com "reduzir movimento" no celular, mostra só a logo parada.
 */
export function LogoAbertura({ altura, atraso = 1500, sempre = false }: Props) {
  const reduzido = useReducedMotion();
  const [animar] = useState(() => (sempre || !jaAbriu) && !reduzido);
  const [terminou, setTerminou] = useState(!animar);
  const t = useSharedValue(0);
  const largura = altura * LOGO_HORIZONTAL_RATIO;

  useEffect(() => {
    if (!animar) return;
    // Só marca que rodou quando chega ao fim: se a tela sair antes, na volta ele roda de novo.
    const concluir = () => {
      if (!sempre) jaAbriu = true;
      setTerminou(true);
    };
    t.set(
      withDelay(
        atraso,
        withTiming(DURACAO_ABERTURA, { duration: DURACAO_ABERTURA * 1000, easing: Easing.linear }, (completo) => {
          if (completo) scheduleOnRN(concluir);
        }),
      ),
    );
    return () => cancelAnimation(t);
  }, [animar, atraso, sempre, t]);

  return (
    <View
      role="img"
      aria-label="Garupa SP"
      {...(Platform.OS !== 'web' ? { accessible: true } : null)}
      style={{ width: largura, height: altura }}>
      {/* A logo parada fica pronta por baixo e aparece no mesmo quadro em que o motion sai. */}
      <View style={{ opacity: terminou ? 1 : 0 }}>
        <Logo variante="horizontal" altura={altura} decorativa />
      </View>
      {terminou ? null : <Palco t={t} largura={largura} altura={altura} />}
    </View>
  );
}

type PalcoProps = { t: SharedValue<number>; largura: number; altura: number };

function Palco({ t, largura, altura }: PalcoProps) {
  const { nome: tema } = useTema();
  const k = altura / CAIXA.altura; // pixels por unidade do desenho
  const alturaDesenho = (CAIXA.altura + 2 * FOLGA) * k;
  const camada: ViewStyle = { position: 'absolute', left: 0, top: 0, width: largura, height: alturaDesenho };
  // Ponto do desenho → pixel dentro do palco, para servir de pivô das transformações.
  const pivo = (x: number, y: number) => `${(x - CAIXA.x) * k}px ${(y - CAIXA.y + FOLGA) * k}px`;
  const origem = pivo(0, 0);
  const corNome = tema === 'claro' ? brand.asfalto : '#FFFFFF';

  const geral = useAnimatedStyle(() => ({ opacity: opacidadeGeral(t.get()) }));
  const palco = useAnimatedStyle(() => {
    const c = camera(t.get());
    return { transform: [{ translateX: c.x * k }, { translateY: c.y * k }, { scale: c.escala }] };
  });
  const capacete = useAnimatedStyle(() => ({ transform: [{ translateY: estalo(t.get()) * k }] }));
  const viseira = useAnimatedStyle(() => ({ transform: [{ rotate: `${anguloViseira(t.get())}deg` }] }));
  const reflexo = useAnimatedStyle(() => ({ opacity: opacidadeReflexo(t.get()) }));
  const siglaSp = useAnimatedStyle(() => {
    const s = sp(t.get());
    return { opacity: s.opacidade, transform: [{ scale: s.escala }] };
  });

  const desenho = (filhos: ReactNode) => (
    <Svg width={largura} height={alturaDesenho} viewBox={VIEWBOX} style={camada}>
      {filhos}
    </Svg>
  );

  return (
    <View aria-hidden style={[camada, { top: -FOLGA * k, pointerEvents: 'none' }]}>
      <Animated.View style={[camada, geral]}>
        <Animated.View style={[camada, { transformOrigin: origem }, palco]}>
          <Animated.View style={[camada, capacete]}>
            {desenho(
              <G transform={DESLOCA_CAPACETE}>
                <Path d={SILHUETA} fill="#07090B" />
                <Path d={CORPO} fill={brand.teal} fillRule="evenodd" />
              </G>,
            )}
            <Animated.View style={[camada, { transformOrigin: pivo(DOBRADICA.x, DOBRADICA.y) }, viseira]}>
              {desenho(
                <G transform={DESLOCA_CAPACETE}>
                  <Path d={VISEIRA} fill="#2A3237" />
                </G>,
              )}
              <Animated.View style={[camada, reflexo]}>
                {desenho(
                  <G transform={DESLOCA_CAPACETE}>
                    <Path d={REFLEXO} fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={28} strokeLinecap="round" />
                  </G>,
                )}
              </Animated.View>
              {LETRAS.map((d, i) => (
                <Letra key={i} i={i} t={t} k={k} camada={camada} origem={origem} cor={corNome}>
                  {(cor) => desenho(<Path d={d} fill={cor} fillRule="evenodd" />)}
                </Letra>
              ))}
            </Animated.View>
            <Animated.View style={[camada, { transformOrigin: pivo(ORIGEM_SP.x, ORIGEM_SP.y) }, siglaSp]}>
              {desenho(<Path d={SP} transform={SP_TRANSFORM} fill={corNome} fillRule="evenodd" />)}
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

type LetraProps = {
  i: number;
  t: SharedValue<number>;
  k: number;
  camada: ViewStyle;
  origem: string;
  /** Cor da letra no nome. Na viseira ela é sempre branca. */
  cor: string;
  children: (cor: string) => ReactNode;
};

/** Uma letra de "Garupa": surge branca na viseira e sai para o nome (no tema claro, escurece no caminho). */
function Letra({ i, t, k, camada, origem, cor, children }: LetraProps) {
  const movimento = useAnimatedStyle(() => {
    const p = posicaoLetra(saidaLetra(t.get(), i));
    return {
      opacity: opacidadeLetra(t.get(), i),
      transform: [{ translateX: p.x * k }, { translateY: p.y * k }, { scale: p.escala }],
    };
  });
  const tinta = useAnimatedStyle(() => ({ opacity: saidaLetra(t.get(), i) }));
  const mudaDeCor = cor !== '#FFFFFF';

  return (
    <Animated.View style={[camada, { transformOrigin: origem }, movimento]}>
      {children('#FFFFFF')}
      {mudaDeCor ? <Animated.View style={[camada, tinta]}>{children(cor)}</Animated.View> : null}
    </Animated.View>
  );
}
