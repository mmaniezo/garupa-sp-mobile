// Ponto de entrada. As tarefas em segundo plano (GPS do turno) são definidas antes de tudo,
// porque o sistema pode abrir o app só para entregar posições, sem tela.
import './src/servicos/tarefas';
import 'expo-router/entry';
