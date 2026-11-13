Protótipo do **Garupa SP** para Android: Global Solution 2026.2 (CitizenTech), Mobile Development e IoT.

## Como instalar

1. Em **Assets**, baixe o arquivo `.apk` no celular Android.
2. Abra o arquivo e permita a instalação de apps de fonte desconhecida, se o Android pedir. Ele instala por cima da versão anterior.
3. No primeiro uso, faça o cadastro (use dados fictícios) e permita localização, notificações, movimento e **SMS**.

## Novidades da 0.2.0

- **Tema claro e escuro**: segue o modo do celular; em Perfil → Aparência dá para fixar Claro ou Escuro.
- **SMS de socorro**: quando o SOS dispara, os contatos de emergência recebem um SMS com a localização no Google Maps, mesmo sem internet. Com a permissão de SMS, ele sai sozinho; sem ela, o app abre a mensagem pronta. "Estou bem" manda outro SMS avisando que foi cancelado.
- **Tela do SOS**: mostra se o SMS foi enviado, o mapa da posição e o botão "Abrir no Google Maps".
- **Mapa** no tema do app (claro ou escuro).

## O que o app faz

- Cadastro em camadas, plano do turno, mapa de pontos críticos, turno em segundo plano, alerta de ponto crítico, detecção de queda com contagem de 30 s, SOS, tela da testemunha, relato de perigo, pulseira simulada e conta e privacidade.
- **API simulada**: o app funciona sem servidor, com o mesmo contrato da [API C#](https://github.com/caio-alex/garupa-sp-api) e o risco calculado pelo [modelo de ML](https://github.com/Viniciuscont2/garupa-sp-ml) (`risco_celula.csv`). O cadastro some ao desinstalar o app.

## Limitações conhecidas

- Os pontos críticos do modelo atual aparecem em dias úteis sem chuva (no fim de semana e na chuva nenhum ponto chega ao percentil 95).
- Sem a chave do Google Maps (segredo `GOOGLE_MAPS_API_KEY` do repositório), o mapa aparece esquemático. O link do Google Maps no SMS funciona sem chave.
- O SMS automático usa o chip e o plano do celular (pode ter custo da operadora).
- APK de demonstração, assinado com a chave de depuração: não é a versão da loja.
- Para gravar o vídeo, use os atalhos de demonstração: Turno ativo → Simular queda, e Pulseira → Impacto, SOS e Cancelar.
