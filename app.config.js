/**
 * Configuração dinâmica: estende o app.json com a chave do Google Maps, lida do ambiente
 * (o app.json não lê variáveis). Local: GOOGLE_MAPS_API_KEY no .env.local. EAS Build:
 * variável de ambiente do projeto no EAS (npx eas-cli@latest env:create).
 *
 * No Expo Go a chave não é necessária. Num build sem chave, as telas avisam que o mapa do
 * Google não está ativado e oferecem abrir o ponto no app do Google Maps (sem a chave, o SDK
 * do Google fecharia o app).
 */
module.exports = ({ config }) => {
  const chave = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['react-native-maps', chave ? { androidGoogleMapsApiKey: chave } : {}]],
    extra: { ...config.extra, mapaGoogle: !!chave },
  };
};
