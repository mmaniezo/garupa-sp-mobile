# Garupa SP: etapas da parte de Mobile Development e IoT

Base: `responsabilidades_por_disciplina.md` v1.4 (seção 3), documento de requisitos v1.3 e o canvas de design "Garupa SP — Design System" (manual da marca e telas 01 a 21).

Entrega: **19/11/2026, 23h55**. Rubrica: telas e navegação · consumo de dados · banco de dados · acessibilidade · aderência ao problema · documentação.

## Situação

O código das 11 etapas está escrito e verificado com typecheck, lint, 47 testes automatizados e o fluxo completo na prévia web (cadastro → plano → mapa → turno → queda → SOS → testemunha → cancelamento, pulseira, relato, perfil). **O que só o celular prova ainda não foi testado**: segundo plano com a tela bloqueada, notificações, alarme, GPS real e o módulo nativo da tela de bloqueio.

| # | Etapa | Telas | Requisitos | Situação |
| --- | --- | --- | --- | --- |
| 1 | Base técnica e design system | 01 | RT01, RT02, RT04, RNF09 | Feita |
| 2 | Teste do segundo plano no Android | `/diagnostico` | RT03, RT20, RNF24 | Código feito; **falta rodar no aparelho** |
| 3 | Cadastro em camadas | 02 a 06 | RF01 a RF05, RF36, RB07, RB08, RB16 | Feita |
| 4 | Plano do turno, mapa e mensagens | 07 a 09 | RF07 a RF11, RF15, RB05, RB06, RB14, RNF10 | Feita |
| 5 | Turno ativo e alertas por localização | 10 a 13 | RF13, RF14, RB04, RB17, RB18, RT19, RNF01 | Feita; validar no aparelho |
| 6 | Detecção de queda e contagem | 14 e 15 | RF18, RF19, RB01 a RB03, RNF04 | Feita; calibrar limiares no aparelho |
| 7 | SOS, fila offline e testemunha | 16 a 18 | RF20 a RF24, RB10 a RB13, RNF03, RNF06 | Feita; tela de bloqueio a validar |
| 8 | Relatar perigo e SOS manual | 19 | RF25, RF26 | Feita |
| 9 | Pulseira (vestível simulado) | 20 | RF28, RF39 a RF41, RNF26 | Feita; integrar com o Wokwi |
| 10 | Conta, privacidade e locais frequentes | 21 | RF05, RF06, RF12, RB09, RNF16, RNF17 | Feita |
| 11 | Acessibilidade final, README, prints e vídeo | todas | RNF08, RNF09, RNF12, RN02 | README e Ficha (rascunho) feitos; **faltam prints, vídeo e teste com TalkBack** |

## Como os itens do documento viraram código

| Item do documento | Onde está |
| --- | --- |
| 1. Base técnica | Expo SDK 58, TypeScript, Expo Router, `eas.json` (perfil `development`), cliente tipado em `src/api` |
| 2. Telas e navegação | `src/app`: 21 telas do design, abas Plano, Mapa, Relatar e Perfil |
| 3. Detecção de queda | `src/domain/queda/detector.ts` (máquina de estados do contrato) + `src/servicos/queda.ts` |
| 4. Banco no app | `src/db` (migrações v1 e v2) + `src/dados-locais/repositorios.ts` |
| 5. Consumo da API | `src/api/http.ts` (API C#) e `src/api/mock` (mesmo contrato); todos os endpoints do app |
| 6. Acessibilidade | Botões de 48 a 96 dp, rótulos e papéis para leitor de tela, nenhum estado só por cor, fonte do sistema respeitada |
| 7. Segundo plano e notificações | `src/servicos/turno.ts`, `tarefas.ts`, `notificacoes.ts` (canais de baixa e alta prioridade, ações) |
| 8. Teste do primeiro dia | `/diagnostico`: mede leituras do sensor e do GPS com o app em segundo plano |

## Roteiro de teste no celular

### A. Teste do segundo plano (o maior risco do projeto)

1. Gere e instale o build de desenvolvimento (README, "Como rodar"), num Android de entrada se possível.
2. Faça o cadastro e permita: localização **o tempo todo**, notificações e "sem economia de bateria".
3. Plano → Iniciar turno → Combinado.
4. Abra um app de mapa ou de entregas e bloqueie a tela por **10 minutos**.
5. Volte, abra Perfil → Diagnóstico do segundo plano e anote: leituras do sensor em segundo plano e maior intervalo sem leitura.
6. Se não passar, siga o plano de saída: (1) módulo nativo que lê o sensor dentro do serviço em primeiro plano; (2) demo só no Android; (3) demo com o app na frente, dito no vídeo. Registre o resultado e o modelo do aparelho no README.

### B. Fluxo completo ("pronto quando" do documento)

1. Iniciar o turno e abrir outro app.
2. Receber um alerta de ponto crítico (com o mock, ande até um ponto de exemplo ou ajuste um ponto para perto de você em `src/api/mock/dados.ts`).
3. Simular a queda: Turno ativo → Simular queda, ou o evento de impacto da pulseira. Não teste uma queda de verdade.
4. Bloquear a tela e deixar a contagem acabar: o alarme toca e o SOS sai sozinho em 30 s.
5. Abrir o link de acompanhamento em outro aparelho (com a API real).
6. Com a tela bloqueada, tocar na notificação "SOS ativo": a tela da testemunha deve abrir sem pedir a senha.
7. Cancelar em vários pontos da contagem (inclusive pelo botão "Estou bem" da notificação).
8. Modo avião: simular a queda, deixar o SOS sair, voltar a conexão e ver o SOS chegar uma vez só.

### C. Calibração do detector

Limiares em `src/domain/queda/detector.ts` (`LIMIARES_PADRAO`). Rode os cenários de QA (guidão, bolso, mochila, buraco, freada, celular derrubado) e anote numa matriz de confusão (indicador de impacto da Ficha). Cada cenário novo vira um teste em `src/domain/queda/__tests__`.

## Pontos a combinar com as outras frentes

| Ponto | Com quem | Onde está no código |
| --- | --- | --- |
| Início da faixa horária 0 (hoje: meia-noite) | ML | `src/domain/contexto.ts` (`INICIO_PRIMEIRA_FAIXA`) |
| `distritoNome` em cada ponto de `/risco` e `/plano-do-turno` | API | `src/api/types.ts` (`CelulaCritica`) |
| Valores de `tipo` do relato (buraco, óleo, acidente, semáforo) | API | `src/api/types.ts` (`TipoRelato`) |
| Formato de cada item de `GET /eventos-vestivel/pendentes` | API e Physical | `src/api/types.ts` (`EventoVestivel`) |
| `dispositivoId` da pulseira no firmware (padrão do app: `pulseira-demo-01`) | Physical | tela Pulseira |
| SOS sem posição: hoje fica na fila até ter GPS; a API aceita SOS sem `lat`/`lon`? | API | `src/servicos/sos.ts` |
| Avaliação de mensagem (RF17, P2): o contrato não tem endpoint; o app guarda só a contagem no aparelho | API | `src/app/turno/alerta/[celulaId].tsx` |
| Trocar ou remover contato: o contrato só tem `POST /contatos` | API | `src/app/cadastro/basico.tsx` |
| "Já tenho conta": o contrato não tem login | Equipe e API | `src/app/boas-vindas.tsx` |
| Endereço público da API (`EXPO_PUBLIC_API_URL`) | OS | `.env.local` |
| Catálogo de mensagens com fonte oficial (hoje rascunhos com `[FONTE OFICIAL]`) | Equipe | `src/api/mock/dados.ts` e seed da API |
