import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ehErroApi } from '@/api';
import { Aviso, Botao, CabecalhoPasso, Campo, CampoSenha, Tela, Texto } from '@/components/ui';
import { mascararTelefone, validarTelefone } from '@/domain/telefone';
import { mensagemDeErro, voltarOu } from '@/lib/navegacao';
import { entrarNaConta } from '@/servicos/conta';
import { obterSessao, proximaTelaDoCadastro } from '@/state/sessao';

/**
 * Entrar na conta com telefone e senha (POST /auth/login). Depois do login, os contatos de
 * emergência voltam da API e o app pede as permissões deste celular.
 */
export default function Entrar() {
  const params = useLocalSearchParams<{ telefone?: string }>();
  const [telefone, setTelefone] = useState(() => mascararTelefone(params.telefone ?? ''));
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<{ telefone?: string; senha?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErroGeral(null);
    const e: typeof erros = {};
    if (!validarTelefone(telefone).valido) e.telefone = 'Telefone com DDD, como (11) 90000-0000.';
    if (!senha) e.senha = 'Digite a sua senha.';
    setErros(e);
    if (e.telefone || e.senha) return;

    setEnviando(true);
    try {
      await entrarNaConta(telefone, senha);
      router.replace(proximaTelaDoCadastro(obterSessao()));
    } catch (erro) {
      if (ehErroApi(erro, 401)) setErroGeral('Telefone ou senha incorretos. Confira e tente de novo.');
      else if (ehErroApi(erro, 404)) setErroGeral('O login ainda não está disponível nesta API.');
      else setErroGeral(mensagemDeErro(erro, 'Não deu para entrar agora. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  function esqueci() {
    Alert.alert(
      'Esqueceu a senha?',
      'A troca de senha por código SMS chega junto com a API. Por enquanto, se não lembrar, faça um cadastro novo com outro telefone.',
    );
  }

  return (
    <Tela
      margem={24}
      rodape={
        <>
          <Botao titulo="Entrar" onPress={() => void entrar()} carregando={enviando} />
          <Botao titulo="Não tenho conta: criar cadastro" variante="fantasma" tamanho="padrao" onPress={() => router.replace('/cadastro/basico')} />
        </>
      }>
      <CabecalhoPasso rotulo="Entrar" onVoltar={() => voltarOu('/boas-vindas')} />
      <View style={styles.titulo}>
        <Texto variante="titulo" accessibilityRole="header">
          Bem-vindo de volta
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          Entre com o telefone e a senha do seu cadastro.
        </Texto>
      </View>

      {erroGeral ? <Aviso tom="erro" texto={erroGeral} anunciar /> : null}

      <Campo
        rotulo="Seu telefone"
        value={telefone}
        onChangeText={(v) => {
          setErros((x) => ({ ...x, telefone: undefined }));
          setTelefone(mascararTelefone(v));
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="(11) 90000-0000"
        returnKeyType="next"
        erro={erros.telefone}
      />
      <CampoSenha
        rotulo="Senha"
        value={senha}
        onChangeText={(v) => {
          setErros((x) => ({ ...x, senha: undefined }));
          setSenha(v);
        }}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void entrar()}
        erro={erros.senha}
      />
      <Botao titulo="Esqueci a senha" variante="link" tamanho="compacto" onPress={esqueci} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { gap: 8 },
});
