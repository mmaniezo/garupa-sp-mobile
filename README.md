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
| **Tecnologias** | App: Expo (React Native, TypeScript), SQLite, localização e sensores em segundo plano, notificações. Modelo de risco: Python (Infosiga, INMET). API: C#/.NET. Pulseira opcional: ESP32 no Wokwi. |
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

Pré-requisitos: Node 20 ou mais novo, conta no Expo e um Android (alvo principal do protótipo).

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

Verificações (typecheck, lint e os 47 testes):

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

### API real ou simulada

O app fala com a API pelo contrato de `/api/v1` (`src/api/contrato.ts`). Enquanto a API C# não estiver publicada, ele usa um mock com o mesmo contrato (padrão). No `.env.local`:

```
EXPO_PUBLIC_API_MODE=http
EXPO_PUBLIC_API_URL=https://endereco-da-api
```

### Demonstração

Com o mock ligado (ou em desenvolvimento) aparecem atalhos para gravar o vídeo:

- **Turno ativo → Simular queda**: abre a contagem como se o sensor tivesse detectado a queda.
- **Pulseira → Impacto, SOS, Cancelar**: simula os eventos da pulseira sem o Wokwi. Com a pulseira real, use o mesmo `dispositivoId` do firmware.
- **Pulseira → tocar numa luz**: manda aquele alerta para a pulseira acender.
- **Perfil → Simular histórico de locais**: os pontos "visitados" sobem no plano (P1).
- **Catálogo (dev)**: toque longo na logo das boas-vindas. Tem "Simular cadastro" com dados fictícios.

## Como funciona por dentro

- **Turno em segundo plano** (`src/servicos/turno.ts`): serviço em primeiro plano do `expo-location` (GPS a cada 1 s) e acelerômetro a 20 Hz. Cada leitura do GPS também é o relógio do turno com a tela bloqueada: vence a contagem da queda, consulta a pulseira a cada 2 s e reenvia a fila.
- **Detector de queda** (`src/domain/queda/detector.ts`): função pura com a máquina de estados do contrato. Os cenários de QA (queda, buraco, semáforo, celular derrubado, mochila, pessoa que levanta) são testes automatizados.
- **SOS** (`src/servicos/sos.ts`): gravado primeiro no SQLite com `eventoId` gerado no aparelho; sem internet, fica na fila e sai quando a conexão volta, sem duplicar.
- **Tela de bloqueio** (`modules/tela-bloqueio`): módulo nativo Android pequeno, escrito para este app, que deixa a tela da testemunha abrir por cima do bloqueio **só enquanto há SOS ativo**. Ainda não foi compilado num aparelho; se o build falhar por causa dele, apague a pasta `modules/tela-bloqueio` e o app segue sem esse recurso.
- **Banco** (`src/db`): SQLite com migrações versionadas (v2): cache do plano e do risco, fila de SOS e de relatos, turnos, alertas do turno, mensagens exibidas e dispensadas, visitas por célula.

## Estrutura

```
index.js                 ponto de entrada (define a tarefa do GPS antes de tudo)
modules/tela-bloqueio/   módulo nativo Android (testemunha pela tela de bloqueio)
src/
├── app/                 rotas (Expo Router): uma tela por arquivo
├── api/                 contrato tipado, cliente HTTP e mock com o mesmo contrato
├── components/          componentes do manual da marca, logos, barra de abas
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
