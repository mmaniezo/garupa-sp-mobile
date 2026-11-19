# Roteiro do vídeo (até 3 minutos)

Gravação da tela do celular com o APK do release (ou o Expo Go), com narração curta. Use a conta de demonstração ou um cadastro com dados fictícios. Os tempos são um guia: o total precisa ficar em até 3:00.

| Tempo | O que mostrar | O que dizer (resumo) |
| --- | --- | --- |
| 0:00–0:15 | Boas-vindas | Motociclistas são o maior grupo de mortes no trânsito de São Paulo. O Garupa SP é a garupa que vai junto: avisa onde e quando o risco é maior e pede socorro se a pessoa cair. |
| 0:15–0:40 | Cadastro (passo 1) | Formulário com validação e máscara: o celular se formata sozinho, a senha mostra o que falta, o contato de emergência é obrigatório. Ficha médica, uso da moto e distritos são opcionais. |
| 0:40–1:05 | Plano do turno e Mapa | A logo em movimento ao abrir. Os poucos pontos críticos das áreas da pessoa, na faixa horária de agora; "Seco / Chovendo" vem sozinho da previsão do tempo. No mapa, o ponto, o risco agora e o que fazer. |
| 1:05–1:20 | Relatar | Um toque registra um perigo na via (buraco, óleo, acidente, semáforo); dá 5 s para desfazer. |
| 1:20–1:35 | Antes de sair → Turno ativo | Iniciar o turno: o app segue em segundo plano com GPS e sensor de queda; a pessoa pode abrir o app de entregas. |
| 1:35–2:15 | Pulseira → Impacto (IoT simulada) | A pulseira (ESP32 no Wokwi, aqui simulada) manda o impacto: abre a contagem de 30 s com alarme. Sem resposta (ou em "Preciso de ajuda agora"), o SOS sai: SMS ao contato com o mapa e registro na API. |
| 2:15–2:35 | Tela para quem ajudar | Quem socorre vê o que fazer, a ficha médica e o botão de ligar 192, mesmo com o celular bloqueado. |
| 2:35–2:50 | Perfil → Sair → Entrar | Login com celular e senha (contexto de autenticação); fechar e abrir o app mantém a sessão (AsyncStorage). Privacidade: consentimentos por tipo. |
| 2:50–3:00 | Encerramento | Equipe, disciplina e o link do repositório. |

## Atalhos para gravar

- **Turno ativo → Simular queda**: abre a contagem como se o sensor tivesse detectado a queda.
- **Pulseira → Impacto, SOS, Cancelar**: eventos da pulseira sem o Wokwi.
- **Queda → Preciso de ajuda agora**: manda o SOS sem esperar os 30 s.
- Antes de gravar, teste o turno e a queda uma vez no aparelho e deixe as permissões dadas (localização o tempo todo, notificações, movimento, SMS).
- Com o SMS automático ligado, os contatos recebem mesmo o SMS: use um contato de teste.
