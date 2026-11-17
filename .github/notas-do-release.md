Protótipo do **Garupa SP** para Android: Global Solution 2026.2 (CitizenTech), Mobile Development e IoT.

## Como instalar

1. Em **Assets**, baixe o arquivo `.apk` no celular Android.
2. Abra o arquivo e permita a instalação de apps de fonte desconhecida, se o Android pedir. Ele instala por cima da versão anterior.
3. No primeiro uso, faça o cadastro (use dados fictícios), crie a sua senha e permita localização, notificações, movimento e **SMS**. O cadastro e o login precisam de internet.

## Novidades da 0.5.0

- **Chuva automática**: "Seco / Chovendo" agora vem sozinho da previsão do tempo (Open-Meteo, grátis), atualizada a cada 10 minutos. Garoa, chuva, pancadas e trovoada contam como chuva. A sua posição sai do celular arredondada em cerca de 5 km. Se preferir, toque em Seco ou Chovendo para escolher você; "Detectar sozinho" volta ao automático.
- **Plano sempre em dia**: o plano se atualiza sozinho quando muda a faixa horária, quando você salva distritos ou tipo de uso, quando entra de novo depois de a sessão vencer e quando a internet volta. Não precisa mais puxar a tela para atualizar.
- **Sua posição no mapa**: "Você" aparece assim que o mapa abre, mesmo sem turno ativo (com a localização permitida).
- **Sessão vencida**: o aviso "Sua sessão venceu" aparece assim que o token passa de 1 hora, e o plano guardado não diz mais "Sem internet" quando o motivo é a sessão.

## Da 0.4.1

- **Logo em movimento**: ao abrir o app, 1,5 s depois de o Plano aparecer, o motion da marca roda uma vez no lugar da logo parada. O capacete entra com a viseira aberta, a viseira desce com "Garupa" escrito nela, o nome sai para o lado e o "SP" aparece. Termina exatamente na logo de sempre.
- **Tema claro e escuro**: no tema claro, as letras saem brancas da viseira e escurecem no caminho.
- **Reduzir movimento**: com essa opção ativada no celular, a logo aparece parada, sem o motion.

## Da 0.4.0

- **Visual novo e movimento**: botões, cartões e opções respondem ao toque com uma mola leve e uma vibração curta, e as telas entram em cascata. Tudo dentro das cores e da marca do Garupa SP.
- **Barra de abas flutuante**: a marcação desliza entre Plano, Mapa, Relatar e Perfil.
- **Plano**: enquanto carrega, aparece o esboço da lista no lugar da tela vazia, e cada ponto crítico tem um selo com o nível de risco.
- **Queda**: a contagem de 30 s anda num arco contínuo.
- **Reduzir movimento**: quem ativou essa opção no celular vê as telas sem as animações.

## Da 0.3.1

- **Perfil mais limpo**: saiu a seção Demonstração do fim do Perfil. Os atalhos para o vídeo continuam no Turno ativo (Simular queda) e na Pulseira.
- **Aparência centralizada**: as opções de tema (Sistema, Claro e Escuro) dividem a largura toda, com o texto no centro.

## Da 0.3.0

- **API de produção**: o app agora fala com o servidor do Garupa SP. O cadastro, o login, o plano do turno, o SOS, os relatos e a pulseira ficam salvos na API, e dá para entrar na mesma conta em outro celular.
- **Quem já tinha o app**: a conta das versões anteriores ficava só no celular (API simulada) e não existe no servidor. Ao atualizar, o app volta ao início do cadastro.
- **Sessão de 1 hora**: por segurança, a API pede a senha de novo depois de 1 hora. O Plano e o Perfil avisam "Sua sessão venceu" com o botão "Entrar de novo", e nada do celular é apagado. O SMS de socorro sai mesmo com a sessão vencida, e o registro do SOS e os relatos que ficaram guardados são enviados quando você entra de novo.
- **Nome e celular**: em Perfil → Nome e celular dá para trocar o seu nome e o seu celular. O celular também é o login.
- **Mapa mais direto**: ao tocar num ponto, aparecem só a via, o risco de agora e o que fazer. O risco por horário fica em "Ver risco por horário".
- **Privacidade mais limpa**: em Perfil → Privacidade ficam só as caixas, sem as descrições.

## Da 0.2.6

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
- **API C# de produção** ([garupa-sp-api](https://github.com/caio-alex/garupa-sp-api)), com o risco calculado pelo modelo de ML com os dados do Infosiga (`risco_celula.csv`).

## Limitações conhecidas

- Ainda não há recuperação de senha.
- A sessão vence depois de 1 hora (limite da API) e é preciso entrar de novo com a senha.
- O link de acompanhamento do SOS abre os dados em texto (JSON): ainda não há uma página para o contato.
- O SMS automático usa o chip e o plano do celular (pode ter custo da operadora).
- APK de demonstração, assinado com a chave de depuração: não é a versão da loja.
- Para gravar o vídeo, use os atalhos de demonstração: Turno ativo → Simular queda, e Pulseira → Impacto, SOS e Cancelar.
