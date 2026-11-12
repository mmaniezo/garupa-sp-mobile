Protótipo do **Garupa SP** para Android: Global Solution 2026.2 (CitizenTech), Mobile Development e IoT.

## Como instalar

1. Em **Assets**, baixe o arquivo `.apk` no celular Android.
2. Abra o arquivo e permita a instalação de apps de fonte desconhecida, se o Android pedir.
3. No primeiro uso, faça o cadastro (use dados fictícios) e permita localização, notificações e movimento.

## O que vem nesta versão

- Cadastro em camadas, plano do turno, mapa de pontos críticos, turno em segundo plano, alerta de ponto crítico, detecção de queda com contagem de 30 s, SOS com link de acompanhamento, tela da testemunha, relato de perigo, pulseira simulada e conta e privacidade.
- **API simulada**: o app funciona sem servidor, com o mesmo contrato da [API C#](https://github.com/caio-alex/garupa-sp-api) e o risco calculado pelo [modelo de ML](https://github.com/Viniciuscont2/garupa-sp-ml) (`risco_celula.csv`). O cadastro some ao desinstalar o app.

## Limitações conhecidas

- Os pontos críticos do modelo atual aparecem em dias úteis sem chuva (no fim de semana e na chuva nenhum ponto chega ao percentil 95).
- Sem a chave do Google Maps neste build, o mapa aparece esquemático.
- APK de demonstração, assinado com a chave de depuração: não é a versão da loja.
- Para gravar o vídeo, use os atalhos de demonstração: Turno ativo → Simular queda, e Pulseira → Impacto, SOS e Cancelar.
