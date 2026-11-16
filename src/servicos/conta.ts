import { api, origemApi } from '@/api';
import { definirToken } from '@/api/token';
import { atualizarPreferencias, limparPreferencias, obterPreferencias } from '@/dados-locais/preferencias';
import { apagarDadosSeguros, gravarContatos, gravarToken, lerToken } from '@/dados-locais/seguro';
import { validarTelefone } from '@/domain/telefone';
import { atualizarSessao, encerrarSessaoNoAparelho, obterSessao } from '@/state/sessao';

import { limparPlano } from './plano';
import { processarFilaRelatos } from './relatos';
import { processarFilaSos } from './sos';
import { finalizarTurno } from './turno';

/**
 * Login com telefone e senha. O telefone identifica a conta e a senha confirma; a API devolve
 * um token, que vai em toda chamada (Authorization: Bearer) e fica no armazenamento seguro.
 */

/** Na abertura: o token salvo volta para o cliente da API (vencido, o app pede para entrar de novo). */
export async function carregarToken(): Promise<void> {
  definirToken(await lerToken().catch(() => null));
}

/** Depois do cadastro ou do login: guarda o token e marca que a conta tem senha. */
export async function guardarToken(token: string | undefined): Promise<void> {
  if (!token) return;
  definirToken(token);
  await gravarToken(token);
}

/**
 * Entra na conta. Os contatos de emergência voltam da API (são eles que recebem o SMS do SOS);
 * a ficha médica nunca volta pela API e o perfil de uso fica para o Perfil: os dois passos
 * contam como pulados. As permissões são pedidas de novo, porque valem por aparelho.
 *
 * Se é a mesma conta que já está neste celular (a sessão venceu), só troca o token: o cadastro
 * segue de onde estava e o que ficou na fila (SOS, relatos) sai agora. Devolve 'renovada'.
 */
export async function entrarNaConta(telefone: string, senha: string): Promise<'renovada' | 'nova'> {
  const t = validarTelefone(telefone);
  const login = await api.entrar({ telefone: t.valido ? t.e164 : telefone, senha });

  const atual = obterSessao().usuarioId;
  if (atual === login.usuarioId) {
    await guardarToken(login.token);
    void processarFilaSos().then(processarFilaRelatos);
    return 'renovada';
  }
  // Outra conta: o que era da anterior sai deste celular antes.
  if (atual) await sairDaConta();
  await guardarToken(login.token);

  const usuario = await api.obterUsuario(login.usuarioId).catch(() => null);
  if (usuario) {
    await gravarContatos(
      usuario.contatos.map((c) => {
        const tc = validarTelefone(c.telefone);
        return { contatoId: c.contatoId, nome: c.nome, telefone: tc.valido ? tc.exibicao : c.telefone };
      }),
    );
  }

  await atualizarSessao({
    usuarioId: login.usuarioId,
    nome: login.nome || usuario?.nome || null,
    apiDoCadastro: origemApi,
    temSenha: true,
    passos: { basico: 'feito', ficha: 'pulado', uso: 'pulado', distritos: 'pulado', permissoes: 'pendente' },
  });
  return 'nova';
}

/**
 * Sai da conta neste celular: encerra o turno e apaga o que o app guardou aqui (ficha,
 * contatos, token, preferências, histórico; o tema do app fica). A conta continua na API,
 * para entrar de novo. Excluir a conta também passa por aqui, depois do DELETE na API.
 */
export async function sairDaConta(): Promise<void> {
  const { tema } = obterPreferencias();
  await finalizarTurno();
  await apagarDadosSeguros();
  definirToken(null);
  await encerrarSessaoNoAparelho();
  await limparPreferencias();
  if (tema !== 'sistema') await atualizarPreferencias({ tema });
  limparPlano();
}
