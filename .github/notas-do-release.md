Protótipo do **Garupa SP** para Android: Global Solution 2026.2 (CitizenTech), Mobile Development e IoT.

## Como instalar

1. Em **Assets**, baixe o arquivo `.apk` no celular Android.
2. Abra o arquivo e permita a instalação de apps de fonte desconhecida, se o Android pedir. Ele instala por cima da versão anterior.
3. No primeiro uso, faça o cadastro (use dados fictícios), crie a sua senha e permita localização, notificações, movimento e **SMS**.

## Novidades da 0.2.6

- **Voltar no turno pausado**: a tela de turno pausado também tem o botão "Voltar" no topo. Ele leva ao plano e o turno continua pausado.

## Da 0.2.5

- **Enviar agora**: depois de escolher um perigo em "Viu um perigo?" ou um tipo de SOS em "Precisa de ajuda?", a contagem mostra "Desfazer" à esquerda e "Enviar agora" à direita. Quem tem pressa não precisa esperar os 5 s do relato nem os 10 s do SOS.
- **Voltar no turno ativo**: no topo da tela, no lugar da logo, um botão "Voltar" com seta leva ao plano. O turno continua ativo, e não é preciso usar o botão de voltar do celular.

## Da 0.2.4

- **Pontos críticos com os dados oficiais do Infosiga**: o plano do turno e o mapa usam o modelo novo do ML (sinistros graves e fatais com moto de 2019 a 2025, e a chuva do INMET). Agora há pontos críticos também no fim de semana e na chuva, e o nome das ruas aparece escrito para leitura ("Avenida dos Bandeirantes").
- **Contatos de emergência**: em Perfil → Contatos de emergência dá para editar, excluir e adicionar (até 3). Precisa ficar ao menos um contato.
- **O 9 depois do DDD**: o cadastro, os contatos e o login só aceitam celular com o 9. Se faltar, o app avisa e oferece o número corrigido num toque. Sem o 9, o SMS do socorro não chega. Telefone fixo não é aceito.

## Da 0.2.3

- **Login com telefone e senha**: o cadastro pede uma senha (8 caracteres ou mais, com letras e números). Em "Já tenho conta: entrar", você entra com o telefone e a senha. Os contatos de emergência voltam, e o app pede as permissões do celular de novo.
- **Sair da conta** em Perfil: apaga o que está neste celular, e a conta continua salva para entrar de novo.
- **Quem já tinha o app**: o cadastro antigo não tem senha. Para testar o login, vá em Perfil → Sair da conta e faça um cadastro novo.

## Da 0.2.2

- **Google Maps de verdade em todos os mapas**: a 0.2.1 ainda mostrava o mapa simulado (a chave não chegava ao app). Agora o build confere dentro do APK que o Google Maps entrou.
- **Aba Mapa**: cada ponto crítico fica no lugar exato, com o número do plano. Tocando, o balão do Google mostra a via, o distrito e o nível de risco.
- **Perigos relatados no mapa**: o que você relatou nas últimas 24 h aparece com o ícone de alerta, com a hora do relato.
- **Tela do SOS**: o Google Maps com o pino na posição registrada e a hora.
- **SMS automático**: se o SMS do SOS abriu no app de mensagens (sem a permissão de SMS), a tela do SOS oferece "Ativar o SMS automático para a próxima vez". Também dá para ativar em Perfil → Socorro.

## Da 0.2.1

- Google Maps na aba Mapa e no mapa da posição do SOS, no tema do app (claro ou escuro).

## Da 0.2.0

- **Tema claro e escuro**: segue o modo do celular; em Perfil → Aparência dá para fixar Claro ou Escuro.
- **SMS de socorro**: quando o SOS dispara, os contatos de emergência recebem um SMS com a localização no Google Maps, mesmo sem internet. Com a permissão de SMS, ele sai sozinho; sem ela, o app abre a mensagem pronta. "Estou bem" manda outro SMS avisando que foi cancelado.
- **Tela do SOS**: mostra se o SMS foi enviado, o mapa da posição e o botão "Abrir no Google Maps".
- **Mapa** no tema do app (claro ou escuro).

## O que o app faz

- Cadastro em camadas, plano do turno, mapa de pontos críticos, turno em segundo plano, alerta de ponto crítico, detecção de queda com contagem de 30 s, SOS, tela da testemunha, relato de perigo, pulseira simulada e conta e privacidade.
- **API simulada**: o app funciona sem servidor, com o mesmo contrato da [API C#](https://github.com/caio-alex/garupa-sp-api) e o risco calculado pelo modelo de ML com os dados do Infosiga (`risco_celula.csv`). O cadastro some ao desinstalar o app.

## Limitações conhecidas

- O login usa a API simulada: as contas ficam neste celular. Na API C# o login ainda vai ser implementado, e ainda não há recuperação de senha.
- O SMS automático usa o chip e o plano do celular (pode ter custo da operadora).
- APK de demonstração, assinado com a chave de depuração: não é a versão da loja.
- Para gravar o vídeo, use os atalhos de demonstração: Turno ativo → Simular queda, e Pulseira → Impacto, SOS e Cancelar.
