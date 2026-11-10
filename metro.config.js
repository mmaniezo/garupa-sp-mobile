// Configuração do Metro. O app é para Android e iOS; isto só existe para a prévia no
// navegador (npm run web), em que o expo-sqlite roda em WebAssembly.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

// O SQLite na web usa SharedArrayBuffer, que exige isolamento entre origens.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
