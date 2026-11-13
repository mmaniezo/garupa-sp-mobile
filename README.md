# Garupa SP · app do motociclista

Global Solution 2026.2 · CitizenTech · **Mobile Development e IoT**.

A garupa é quem vai junto, de olho em você. App para o motociclista de São Paulo, em especial o entregador por aplicativo: cadastro rápido, plano do turno com os pontos e horários de maior risco nas áreas em que ele roda, alerta no trajeto com o app em segundo plano, detecção de queda, SOS com link de acompanhamento e tela para quem socorre.

> Prints das telas e link do vídeo (até 3 min): **a preencher** depois do teste no aparelho. Andamento e roteiro de testes: [docs/ETAPAS_MOBILE.md](docs/ETAPAS_MOBILE.md).

## Ficha da CitizenTech (rascunho, conferir com a equipe)

| Pergunta | Resposta |
| --- | --- |
| **Cidadão** | Motociclistas da capital paulista, com foco no entregador por aplicativo: quem passa mais horas nas vias de maior risco, nem sempre escolhe a rota e trabalha sob pressão de prazo. |
| **Problema** | Motociclistas são o maior grupo de mortes no trânsito da capital (475 de 1.034 em 2025, Infosiga) e batem recorde em 2026; 67,3% dos sinistros graves ou fatais de jan–ago de 2026 envolvem moto. O risco tem hora e lugar. |
| **Como funciona** | Cadastro em camadas (nome, telefone e um contato; ficha médica, uso da moto e distritos opcionais). Antes do turno, o plano mostra os poucos pontos críticos das áreas da pessoa, no horário e com a chuva informada. Com o turno ativo, o app fica em segundo plano: avisa ao chegar perto de um ponto crítico (bipe, vibração e banner curto), detecta a queda (impacto + queda de velocidade + imobilidade), abre uma contagem de 30 s e, sem resposta, registra o SOS com a posição. O contato recebe um link de acompanhamento; quem socorre vê a ficha médica pela tela de bloqueio e liga ao 192. |
| **Tecnologias** | App: Expo (React Native, TypeScript), SQLite, Google Maps, localização e sensores em segundo plano, notificações. Modelo de risco: Python com XGBoost (Infosiga, INMET), [garupa-sp-ml](https://github.com/Viniciuscont2/garupa-sp-ml). API: C#/.NET com PostgreSQL, [garupa-sp-api](https://github.com/caio-alex/garupa-sp-api). Pulseira opcional: ESP32 no Wokwi. |
| **Ecossistema** | Motociclistas e entregadores; contatos de emergência; SAMU 192 (discagem confirmada pela pessoa); dados abertos (Infosiga, INMET, GeoSampa). Futuro: CET-SP, plataformas de entrega e seguradoras. |
| **Medição de impacto** | Lift do modelo contra o mapa histórico; erros do detector em cenários de teste (matriz de confusão); tempo entre a queda e o link disponível ao contato; tempo do cadastro mínimo (meta: até 2 min). |

O app informa e avisa mais rápido; não promete salvar vidas. O mapa mostra histórico, não garantia.

## O que o app faz (por tela do design)

| Tela | Rota | Requisitos |
| --- | --- | --- |
| 01 Boas-vindas | `/boas-vindas` | — |
| 02 a 05 Cadastro em camadas | `/cadastro/basico`, `ficha`, `uso`, `distritos` | RF01 a RF04, RB07, RB16 |
| 06 Permissões e consentimentos | `/cadastro/permissoes` | RF05, RF36, RB08 |
| 07 Plano do turno | `/plano` | RF07, RF10, RF11, RF15, RB06, RNF10 |
| 08 Mapa de pontos críticos | `/mapa` | RF08, RF09 (comparação de faixas) |
| 09 Antes de sair | `/turno/antes-de-sair` | RN08, RF15 |
| 10 Turno ativo | `/turno/ativo` | RF13, RB18 |
| 11 Alerta no trajeto | notificação | RF14, RB04, RB17 |
| 12 Motivo do alerta | `/turno/alerta/[celulaId]` | RF14, RF15, RF17 |
| 13 Turno pausado | `/turno/pausado` | RB18 |
| 14 e 15 Queda | notificação e `/queda` | RF18, RF19, RB01 a RB03 |
| 16 SOS enviado | `/sos/[eventoId]` | RF20, RF21, RF23, RF24, RB11, RB13 |
| 17 e 18 Testemunha | `/testemunha` | RF22, RB10, RB12 |
| 19 Relatar perigo e SOS manual | `/relatar` | RF25, RF26 |
| 20 Pulseira | `/pulseira` | RF28, RF39 a RF41 |
| 21 Conta e privacidade | `/perfil` | RF05, RF06, RF12, RB09 |
| Diagnóstico do segundo plano | `/diagnostico` | RT20, RNF24 (o teste do primeiro dia) |

## Como rodar

**Só quer instalar?** Baixe o APK de Android na página [Releases](https://github.com/mmaniezo/garupa-sp-mobile/releases). Ele vem com a API simulada e funciona sem servidor. Cada tag `v*` enviada ao GitHub gera um APK novo pelo workflow `.github/workflows/release-android.yml`:

```bash
git tag v0.1.1
```

```bash
git push origin v0.1.1
```

Para desenvolver, os pré-requisitos são Node 22 (o Expo SDK 58 pede 22.13 ou mais novo), conta no Expo e um Android (alvo principal do protótipo).

```bash
npm install
```

```bash
cp .env.example .env.local
```

O segundo plano, as notificações e o módulo da tela de bloqueio **não funcionam no Expo Go**. Gere o build de desenvolvimento uma vez (e de novo quando entrar uma biblioteca nativa):

```bash
npx eas-cli@latest build --profile development --platform android
```

Com o APK instalado no celular:

```bash
npm run dev
```

Prévia rápida no celular pelo **Expo Go** (app da loja, atualizado para o SDK 58), com o celular e o computador no mesmo Wi-Fi. Escaneie o QR code que aparece no terminal:

```bash
npm run go
```

No Expo Go o app abre inteiro, mas o turno só monitora com o app aberto (o Expo Go do Android não roda tarefas em segundo plano) e os sons próprios das notificações não tocam. Se o celular não conectar, rode `npx expo start --go --tunnel`.

Prévia rápida das telas no navegador (sem sensores, GPS nem segundo plano):

```bash
npm run web
```

Verificações (typecheck, lint e os 56 testes; os 7 de integração com a API real só rodam com `GARUPA_API_URL`):

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

### API real, modelo de ML e API simulada

O app fala com a API C# ([garupa-sp-api](https://github.com/caio-alex/garupa-sp-api)) pelo contrato de `/api/v1` (`src/api/contrato.ts`). O risco vem do modelo de ML ([garupa-sp-ml](https://github.com/Viniciuscont2/garupa-sp-ml)): a API importa o `saida/risco_celula.csv` e responde com os pontos de percentil ≥ 95.

Sem servidor, o app usa a **API simulada** (padrão): o mesmo contrato, as mesmas regras e os mesmos dados do modelo (`src/api/mock/risco-modelo.json`, gerado do CSV). Quando o modelo mudar:

```bash
node scripts/gerar-dados-mock.mjs ../garupa-sp-ml/saida/risco_celula.csv "../garupa-sp-api/Garupa.Infrastructure/Resources/distritos.json"
```

Para usar a API real no celular:

1. No repositório da API, siga o README dela (PostgreSQL, `preparar-banco`) e carregue o risco: `dotnet run --project 'Garupa API' -- carregar-risco <caminho>/risco_celula.csv`.
2. Suba a API ouvindo na rede (não só no `localhost`), e libere a porta no firewall do Windows se ele perguntar:

```bash
dotnet run --project 'Garupa API' --urls http://0.0.0.0:5221
```

3. No `.env.local` do app (celular e computador no mesmo Wi-Fi). Com o app em desenvolvimento, `localhost` vira o IP do computador sozinho:

```
EXPO_PUBLIC_API_MODE=http
EXPO_PUBLIC_API_URL=http://localhost:5221
```

4. Reinicie o Metro (`npm run go` ou `npm run dev`). Um cadastro feito no mock não existe na API: ao trocar de API, o app volta ao início do cadastro.

Para conferir o app contra a API rodando (cria e apaga um usuário fictício):

```bash
GARUPA_API_URL=http://127.0.0.1:5221 npx jest src/api/__tests__/api-real.test.ts
```

A prévia web usa só a API simulada: a API não libera CORS. HTTP sem TLS funciona no Expo Go e no build de desenvolvimento; para um APK de demonstração, publique a API com HTTPS.

### Google Maps

O mapa de pontos críticos (tela 08) e o mapa da posição no SOS usam o Google Maps no Android e o Apple Maps no iOS (`react-native-maps`), com o mapa base no tema do app (claro ou escuro). O SMS de socorro leva um link do Google Maps (Maps URLs, que não precisa de chave).

**No Expo Go não precisa de chave.** No APK, o Google exige uma chave do *Maps SDK for Android*:

1. No [Google Cloud](https://console.cloud.google.com/), crie um projeto, ative o **Maps SDK for Android** e crie uma chave de API (o Google pede uma conta de faturamento; o mapa no app é gratuito).
2. Restrinja a chave a apps Android: pacote `br.com.garupasp.app` e SHA-1 do certificado que assina o APK. O APK dos Releases é assinado com a chave de depuração padrão: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. Num build do EAS, o SHA-1 aparece em expo.dev → Credentials.
3. Informe a chave:
   - Releases do GitHub: em Settings → Secrets and variables → Actions, crie o segredo `GOOGLE_MAPS_API_KEY`. O próximo release já sai com o Google Maps.
   - local: `GOOGLE_MAPS_API_KEY=...` no `.env.local` (o `app.config.js` lê);
   - EAS Build: `npx eas-cli@latest env:create --name GOOGLE_MAPS_API_KEY --value <chave> --environment development`.

Sem a chave, o APK mostra o mapa esquemático no lugar do Google Maps (sem ela, o SDK do Google fecharia o app).

### Tema claro e escuro

O app segue o modo claro ou escuro do celular. Em Perfil → Aparência dá para fixar Claro ou Escuro. As cores dos dois temas vêm do manual da marca (`src/theme/colors.ts`): no claro, fundo Neblina, cartões brancos, logo preta e teal profundo nos textos. A contagem da queda e a tela da testemunha mantêm as cores fixas de emergência nos dois temas.

### SMS de socorro

Quando o SOS dispara (queda sem resposta, pulseira ou SOS manual), o app avisa os contatos de emergência por SMS com a localização no Google Maps. SMS não depende de internet.

- **Android com a permissão de SMS** (pedida nas permissões do cadastro ou em Perfil → Socorro): o SMS sai sozinho, pelo módulo nativo `modules/sms-socorro`. Se a pessoa cancelar ("Estou bem"), sai outro SMS avisando.
- **Sem a permissão, no iOS ou no Expo Go**: o app abre o SMS pronto e a pessoa toca em enviar. A tela do SOS mostra o estado real ("SMS enviado" ou "Falta avisar") e um botão para enviar.

O SMS leva só nome, o que aconteceu, a hora e o mapa: nunca ficha médica nem telefone.

### Demonstração

Com o mock ligado (ou em desenvolvimento) aparecem atalhos para gravar o vídeo:

- **Turno ativo → Simular queda**: abre a contagem como se o sensor tivesse detectado a queda.
- **Pulseira → Impacto, SOS, Cancelar**: simula os eventos da pulseira sem o Wokwi. Com a pulseira real, use o mesmo `dispositivoId` do firmware.
- **Pulseira → tocar numa luz**: manda aquele alerta para a pulseira acender.
- **Perfil → Simular histórico de locais**: os pontos "visitados" sobem no plano (P1).
- **Catálogo (dev)**: toque longo na logo das boas-vindas. Tem "Simular cadastro" com dados fictícios.

## Como funciona por dentro

- **Turno em segundo plano** (`src/servicos/turno.ts`): serviço em primeiro plano do `expo-location` (GPS a cada 1 s) e acelerômetro a 20 Hz. Cada leitura do GPS também é o relógio do turno com a tela bloqueada: vence a contagem da queda, consulta a pulseira a cada 2 s e reenvia a fila.
- **Mapa** (`src/components/mapa`): cada ponto crítico é a célula do modelo (cerca de 500 m), desenhada como círculo âmbar com o número do ponto no plano; tocar mostra o motivo e o gráfico de risco por horário (`GET /risco/celulas/{id}`). Mapa base escuro no tom Asfalto do manual. Na web e no build sem chave, mapa esquemático.
- **Cliente da API** (`src/api/http.ts`): converte o formato da API para o do app (ids numéricos ↔ texto, nome do distrito por `GET /distritos`, ficha sem `null`). Regras da API que o app segue: o usuário nasce com o primeiro contato, ficha e perfil só depois do consentimento, perfil só com ao menos um tipo de uso (`src/servicos/cadastro.ts`).
- **Detector de queda** (`src/domain/queda/detector.ts`): função pura com a máquina de estados do contrato. Os cenários de QA (queda, buraco, semáforo, celular derrubado, mochila, pessoa que levanta) são testes automatizados.
- **SOS** (`src/servicos/sos.ts`): gravado primeiro no SQLite com `eventoId` gerado no aparelho; sem internet, fica na fila e sai quando a conexão volta, sem duplicar. O SMS aos contatos (`src/servicos/sms.ts`) sai na hora, sem esperar a API.
- **Tema** (`src/lib/tema.ts`): `useTema()` dá a paleta do tema atual (sistema ou a escolha do Perfil) e `useEstilos()` monta os estilos de cada tema uma vez.
- **Tela de bloqueio** (`modules/tela-bloqueio`): módulo nativo Android pequeno, escrito para este app, que deixa a tela da testemunha abrir por cima do bloqueio **só enquanto há SOS ativo**. Compila no APK e carrega no emulador; falta ver a tela de bloqueio num aparelho.
- **Banco** (`src/db`): SQLite com migrações versionadas (v2): cache do plano e do risco, fila de SOS e de relatos, turnos, alertas do turno, mensagens exibidas e dispensadas, visitas por célula.

## Estrutura

```
index.js                 ponto de entrada (define a tarefa do GPS antes de tudo)
app.config.js            chave do Google Maps a partir do ambiente
modules/tela-bloqueio/   módulo nativo Android (testemunha pela tela de bloqueio)
scripts/                 gera os dados do mock a partir do CSV do modelo e dos distritos da API
src/
├── app/                 rotas (Expo Router): uma tela por arquivo
├── api/                 contrato tipado, cliente HTTP da API C# e mock com os dados do modelo
├── components/          componentes do manual da marca, logos, barra de abas, mapa
├── dados-locais/        preferências, dados sensíveis (armazenamento seguro) e repositórios SQLite
├── db/                  SQLite: migrações e chave-valor
├── domain/              regras puras e testadas: queda, alertas, mensagens, períodos, telefone, risco
├── servicos/            turno, queda, SOS, plano, pulseira, notificações, permissões, filas
├── state/               sessão do motociclista no aparelho
├── theme/               cores, tipografia e medidas do manual da marca
└── config.ts            endereço da API e os limites propostos no documento de requisitos
```

## Privacidade

- Usuários, contatos e fichas do demo são fictícios.
- Ficha médica e contatos ficam no armazenamento seguro do sistema (criptografado), não no SQLite.
- Nenhum log, notificação ou mensagem de erro leva coordenada, telefone ou ficha.
- O histórico de locais frequentes fica só no aparelho, como contagem de visitas por célula, sem trajetos, e nunca vai para a API.
- Cada tipo de dado tem consentimento próprio e revogável; excluir a conta apaga os dados na API e no aparelho.
- O app não pede permissão de microfone nem de armazenamento.
- O Google Maps recebe só a área que aparece na tela, para desenhar o mapa. A sua posição é desenhada pelo próprio app (sem a camada de localização do Google).
