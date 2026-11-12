/**
 * Configuração do app. Variáveis EXPO_PUBLIC_* vêm do .env (veja .env.example).
 *
 * Os números abaixo são as "propostas" do documento de requisitos (v1.3):
 * pontos de partida para ajustar depois de medir, num lugar só.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ModoApi = 'mock' | 'http';

/**
 * No celular, "localhost" é o próprio celular. Em desenvolvimento, troca pelo IP do computador
 * que roda o Metro (o mesmo que roda a API), para EXPO_PUBLIC_API_URL=http://localhost:5221 funcionar.
 */
function urlDaApi(): string {
  const url = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const ipDoMetro = Constants.expoConfig?.hostUri?.split(':')[0];
  if (Platform.OS === 'web' || !__DEV__ || !ipDoMetro || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ipDoMetro)) return url;
  return url.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i, `$1${ipDoMetro}`);
}

export const config = {
  /** 'mock' usa a API simulada (mesmo contrato); 'http' fala com a API C# de verdade. */
  modoApi: (process.env.EXPO_PUBLIC_API_MODE === 'http' ? 'http' : 'mock') as ModoApi,
  /** Endereço da API sem o /api/v1 (ex.: http://192.168.0.10:5221). */
  urlApi: urlDaApi(),
  /** Tempo máximo de uma requisição comum. */
  timeoutMs: 10_000,
} as const;

export const regras = {
  /** RF07/RB04: só células com percentil igual ou acima do corte entram no plano e nos alertas. */
  percentilCorte: 95,
  /** RF14: aviso ao entrar no raio do ponto crítico. */
  raioAlertaMetros: 150,
  /** RB04: no máximo um aviso por ponto por turno e poucos por hora. */
  maxAlertasPorHora: 3,
  /** RB07: sem distritos declarados, o plano usa um raio da posição atual. */
  raioSemDistritosKm: 3,
  /** RF04: até 5 distritos. */
  maxDistritos: 5,
  /** RF01: até 3 contatos de emergência. */
  maxContatos: 3,
  /** RB01: contagem da queda. */
  contagemQuedaSegundos: 30,
  /** RF29 (P2): contagem quando celular e vestível detectam a queda juntos. */
  contagemQuedaFusaoSegundos: 15,
  /** RB18: turno pausa depois deste tempo parado, com aviso antes. */
  pausaInatividadeMinutos: 30,
  avisoAntesDaPausaMinutos: 5,
  /** RB05: moto parada = abaixo de 5 km/h por pelo menos 10 s. */
  motoParadaKmh: 5,
  motoParadaSegundos: 10,
  /** RF28 e RF40: consulta à API do vestível no demo. */
  intervaloVestivelMs: 2_000,
  /** RB17: banner de alerta com até 6 palavras. */
  maxPalavrasBanner: 6,
  /** RB05: mensagem de conscientização com até 140 caracteres. */
  maxCaracteresMensagem: 140,
} as const;
