import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { api, ehErroApi } from '@/api';
import { CampoCelular } from '@/components/cadastro/campo-celular';
import { Aviso, Botao, CabecalhoPasso, Campo, Tela, Texto } from '@/components/ui';
import { useSessao } from '@/contexto/autenticacao';
import { mascararTelefone, validarCelular } from '@/domain/telefone';
import { mensagemDeErro, voltarOu } from '@/lib/navegacao';
import { atualizarSessao } from '@/state/sessao';

type Erros = { nome?: string; telefone?: string };

/**
 * Nome e celular da conta, pelo Perfil (PUT /usuarios/{id}). O celular também é o login:
 * trocar aqui troca o número com que a pessoa entra. Um celular só pode ter uma conta (409).
 */
export default function MeusDados() {
  const sessao = useSessao();
  const [nome, setNome] = useState(sessao.nome ?? '');
  const [telefone, setTelefone] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [aviso, setAviso] = useState<{ tom: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // O celular não fica guardado no aparelho: vem da API.
  useEffect(() => {
    let ativo = true;
    const usuarioId = sessao.usuarioId;
    if (!usuarioId) return;
    api
      .obterUsuario(usuarioId)
      .then((u) => {
        if (!ativo) return;
        setNome(u.nome);
        setTelefone(mascararTelefone(u.telefone.replace(/^\+55/, '')));
      })
      .catch((e) => ativo && setAviso({ tom: 'erro', texto: mensagemDeErro(e, 'Não deu para carregar seus dados agora.') }))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [sessao.usuarioId]);

  async function salvar() {
    if (!sessao.usuarioId) return;
    setAviso(null);
    const novosErros: Erros = {};
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) novosErros.nome = 'Informe seu nome ou apelido.';
    else if (nomeLimpo.length > 60) novosErros.nome = 'Use até 60 caracteres.';
    const celular = validarCelular(telefone);
    if (!celular.valido) novosErros.telefone = celular.mensagem;
    setErros(novosErros);
    if (novosErros.nome || !celular.valido) return;

    setSalvando(true);
    try {
      await api.atualizarUsuario(sessao.usuarioId, { nome: nomeLimpo, telefone: celular.e164 });
      await atualizarSessao({ nome: nomeLimpo });
      setAviso({ tom: 'sucesso', texto: `Dados salvos. Para entrar na conta, use o celular ${celular.exibicao}.` });
    } catch (e) {
      if (ehErroApi(e, 409)) setErros({ telefone: 'Este celular já é de outra conta.' });
      else if (ehErroApi(e, 400)) setErros({ nome: e.erroDoCampo('nome'), telefone: e.erroDoCampo('telefone') });
      setAviso({ tom: 'erro', texto: mensagemDeErro(e, 'Não deu para salvar agora. Tente de novo.') });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Tela
      margem={24}
      rodape={<Botao titulo="Salvar" onPress={() => void salvar()} carregando={salvando} desabilitado={carregando} />}>
      <CabecalhoPasso rotulo="Nome e celular" onVoltar={() => voltarOu('/perfil')} />
      <View style={{ gap: 8 }}>
        <Texto variante="titulo" accessibilityRole="header">
          Seus dados
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          O nome aparece no SMS de socorro para os seus contatos.
        </Texto>
      </View>

      {aviso ? <Aviso tom={aviso.tom} texto={aviso.texto} anunciar /> : null}

      <Campo
        rotulo="Nome ou apelido"
        value={nome}
        onChangeText={(v) => {
          setErros((x) => ({ ...x, nome: undefined }));
          setNome(v);
        }}
        maxLength={60}
        autoComplete="name"
        erro={erros.nome}
      />
      <View style={{ gap: 6 }}>
        <CampoCelular
          rotulo="Seu celular"
          value={telefone}
          onChangeText={(v) => {
            setErros((x) => ({ ...x, telefone: undefined }));
            setTelefone(v);
          }}
          placeholder={carregando ? 'Carregando…' : '(11) 91234-5678'}
          erro={erros.telefone}
        />
        <Texto variante="legenda" cor="textoSecundario">
          É com este celular que você entra na conta.
        </Texto>
      </View>
    </Tela>
  );
}
