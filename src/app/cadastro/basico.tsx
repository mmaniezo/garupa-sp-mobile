import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, ehErroApi, origemApi } from '@/api';
import { CampoCelular } from '@/components/cadastro/campo-celular';
import { Aviso, Botao, CabecalhoPasso, Campo, CampoSenha, Icone, Tela, Texto } from '@/components/ui';
import { regras } from '@/config';
import { gravarContatos, lerContatos, type ContatoLocal } from '@/dados-locais/seguro';
import { gravarValor, lerValor } from '@/db';
import { problemaDaSenha } from '@/domain/senha';
import { validarCelular, validarTelefone } from '@/domain/telefone';
import { mensagemDeErro, voltarOu } from '@/lib/navegacao';
import { useEstilos, useTema } from '@/lib/tema';
import { guardarToken } from '@/servicos/conta';
import { atualizarSessao, useSessao } from '@/state/sessao';
import { brand, raio, type Paleta } from '@/theme';

type ContatoForm = { contatoId: string | null; nome: string; telefone: string };
type Erros = Record<string, string | undefined>;

/**
 * Tela 02 · Cadastro 1/4, obrigatório (RF01): nome ou apelido, celular, senha e um contato.
 * O celular e a senha são o login (para entrar de novo ou em outro celular). Até 3 contatos,
 * sempre celular com o 9 (é para eles que vai o SMS do socorro). Editar e excluir contato
 * depois do cadastro fica na tela Contatos de emergência (Perfil).
 */
export default function CadastroBasico() {
  const sessao = useSessao();
  const corLink = useTema().c.link;
  const styles = useEstilos(criarEstilos);
  const [nome, setNome] = useState(sessao.nome ?? '');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [telefoneTemConta, setTelefoneTemConta] = useState(false);
  const [contatos, setContatos] = useState<ContatoForm[]>([{ contatoId: null, nome: '', telefone: '' }]);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const jaTemUsuario = !!sessao.usuarioId;

  useEffect(() => {
    // RNF08: mede o tempo do cadastro mínimo (indicador de apoio da Ficha).
    void lerValor('metrica_cadastro').then((m) => {
      if (!m) void gravarValor('metrica_cadastro', { inicio: Date.now() });
    });
    void lerContatos().then((salvos) => {
      if (salvos.length) setContatos(salvos);
    });
  }, []);

  /** Ao corrigir um campo, o erro dele some. */
  const limparErro = (chave: string) => setErros((e) => (e[chave] ? { ...e, [chave]: undefined } : e));

  function mudarContato(i: number, campo: 'nome' | 'telefone', valor: string) {
    limparErro(`contato-${i}-${campo}`);
    setContatos((lista) => lista.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));
  }

  function validar(): boolean {
    const e: Erros = {};
    if (!jaTemUsuario) {
      if (!nome.trim()) e.nome = 'Informe seu nome ou apelido.';
      const celular = validarCelular(telefone);
      if (!celular.valido) e.telefone = celular.mensagem;
      const problema = problemaDaSenha(senha);
      if (problema) e.senha = problema;
    }
    const preenchidos = contatos.filter((c) => c.contatoId || c.nome.trim() || c.telefone.trim());
    if (preenchidos.length === 0) e['contato-0-nome'] = 'Informe ao menos um contato de emergência.';
    contatos.forEach((c, i) => {
      if (c.contatoId || (!c.nome.trim() && !c.telefone.trim() && i > 0)) return;
      if (!c.nome.trim()) e[`contato-${i}-nome`] = 'Informe o nome do contato.';
      const celular = validarCelular(c.telefone);
      if (!celular.valido) e[`contato-${i}-telefone`] = celular.mensagem;
    });
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function continuar() {
    setErroGeral(null);
    if (!validar()) return;
    setEnviando(true);
    try {
      let usuarioId = sessao.usuarioId;
      let lista = contatos;
      if (!usuarioId) {
        // A API cria o usuário junto com o primeiro contato, na mesma transação.
        const i0 = lista.findIndex((c) => !c.contatoId && (c.nome.trim() || c.telefone.trim()));
        const primeiro = lista[i0];
        const t = validarTelefone(telefone);
        const tc = validarTelefone(primeiro.telefone);
        const criado = await api.criarUsuario({
          nome: nome.trim(),
          telefone: t.valido ? t.e164 : telefone,
          senha,
          contato: { nome: primeiro.nome.trim(), telefone: tc.valido ? tc.e164 : primeiro.telefone },
        });
        usuarioId = criado.usuarioId;
        await guardarToken(criado.token);
        // Guarda já: se outro contato falhar, tentar de novo não cria outro usuário.
        await atualizarSessao({ usuarioId, nome: nome.trim(), apiDoCadastro: origemApi, temSenha: true });
        // O id do contato não volta no POST; vem na consulta do cadastro.
        const contatoId = await api
          .obterUsuario(usuarioId)
          .then((u) => u.contatos[0]?.contatoId ?? null)
          .catch(() => null);
        const salvo = {
          contatoId: contatoId ?? 'inicial',
          nome: primeiro.nome.trim(),
          telefone: tc.valido ? tc.exibicao : primeiro.telefone,
        };
        lista = lista.map((x, j) => (j === i0 ? salvo : x));
        await gravarContatos(lista.filter((x) => x.contatoId) as ContatoLocal[]);
        setContatos(lista);
      }

      const salvos: ContatoLocal[] = [];
      for (const [i, c] of lista.entries()) {
        if (c.contatoId) {
          salvos.push(c);
          continue;
        }
        if (!c.nome.trim() && !c.telefone.trim()) continue;
        const t = validarTelefone(c.telefone);
        try {
          const { contatoId } = await api.adicionarContato(usuarioId, { nome: c.nome.trim(), telefone: t.valido ? t.e164 : c.telefone });
          const novo = { contatoId, nome: c.nome.trim(), telefone: t.valido ? t.exibicao : c.telefone };
          salvos.push(novo);
          setContatos((lista) => lista.map((x, j) => (j === i ? novo : x)));
        } catch (e) {
          if (ehErroApi(e, 400)) {
            setErros({ [`contato-${i}-telefone`]: e.erroDoCampo('telefone'), [`contato-${i}-nome`]: e.erroDoCampo('nome') });
          }
          throw e;
        }
      }
      await gravarContatos(salvos);

      const metrica = await lerValor<{ inicio: number }>('metrica_cadastro');
      await gravarValor('metrica_cadastro', { ...metrica, minimoConcluido: Date.now() });
      await atualizarSessao({ passos: { basico: 'feito' } });
      router.push('/cadastro/ficha');
    } catch (e) {
      if (ehErroApi(e, 409)) {
        // Telefone já cadastrado: é a mesma pessoa voltando; o caminho é entrar com a senha.
        setTelefoneTemConta(true);
        setErros((atual) => ({ ...atual, telefone: 'Este telefone já tem conta.' }));
        return;
      }
      if (ehErroApi(e, 400)) {
        setErros((atual) => ({
          ...atual,
          nome: e.erroDoCampo('nome') ?? atual.nome,
          telefone: e.erroDoCampo('telefone') ?? atual.telefone,
          senha: e.erroDoCampo('senha') ?? atual.senha,
        }));
      }
      setErroGeral(mensagemDeErro(e, 'Confira os dados e tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  const podeAdicionar = contatos.length < regras.maxContatos && contatos.every((c) => c.contatoId || c.nome.trim());

  return (
    <Tela
      margem={24}
      rodape={
        <>
          <Botao titulo="Continuar" onPress={continuar} carregando={enviando} />
          <Texto variante="legenda" cor="textoSecundario" centro>
            Ficha médica (tipo sanguíneo, alergias) você preenche depois, se quiser.
          </Texto>
        </>
      }>
      <CabecalhoPasso rotulo="Passo 1 de 4 · obrigatório" onVoltar={() => voltarOu('/boas-vindas')} passo={1} />
      <View style={styles.titulo}>
        <Texto variante="titulo" accessibilityRole="header">
          Quem é você?
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          Seus dados e alguém para a gente avisar se você precisar de socorro. O resto é opcional.
        </Texto>
      </View>

      {erroGeral ? <Aviso tom="erro" texto={erroGeral} anunciar /> : null}

      {!jaTemUsuario ? (
        <>
          <Campo
            rotulo="Seu nome ou apelido"
            value={nome}
            onChangeText={(v) => {
              limparErro('nome');
              setNome(v);
            }}
            autoComplete="name"
            textContentType="nickname"
            maxLength={60}
            returnKeyType="next"
            erro={erros.nome}
          />
          <CampoCelular
            rotulo="Seu celular"
            value={telefone}
            onChangeText={(v) => {
              limparErro('telefone');
              setTelefoneTemConta(false);
              setTelefone(v);
            }}
            placeholder="(11) 91234-5678"
            erro={erros.telefone}
          />
          {telefoneTemConta ? (
            <Botao
              titulo="Entrar com este telefone"
              variante="link"
              tamanho="compacto"
              onPress={() => router.replace({ pathname: '/entrar', params: { telefone } })}
            />
          ) : null}
          <CampoSenha
            rotulo="Crie uma senha"
            value={senha}
            onChangeText={(v) => {
              limparErro('senha');
              setSenha(v);
            }}
            autoComplete="new-password"
            textContentType="newPassword"
            dica="Pelo menos 8 caracteres, com letras e números. Com o telefone, é o seu login."
            erro={erros.senha}
          />
        </>
      ) : (
        <Aviso tom="neutro" texto={`Cadastro de ${sessao.nome ?? 'você'} criado. Falta confirmar o contato de emergência.`} />
      )}

      {contatos.map((c, i) => (
        <View key={i} style={styles.contato}>
          <View style={styles.contatoTopo}>
            <Icone nome="coracao" tamanho={20} cor={corLink} />
            <Texto variante="rotulo" style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: 16 }}>
              {i === 0 ? 'Contato de emergência' : `Contato ${i + 1} (opcional)`}
            </Texto>
          </View>
          {c.contatoId ? (
            <Texto variante="corpoMenor">
              {c.nome} · {c.telefone}
            </Texto>
          ) : (
            <>
              <Campo
                rotulo="Nome"
                aparencia="interno"
                value={c.nome}
                onChangeText={(v) => mudarContato(i, 'nome', v)}
                placeholder="Ex.: Ana (irmã)"
                maxLength={60}
                erro={erros[`contato-${i}-nome`]}
              />
              <CampoCelular
                rotulo="Celular"
                aparencia="interno"
                value={c.telefone}
                onChangeText={(v) => mudarContato(i, 'telefone', v)}
                placeholder="(11) 91234-5678"
                autoComplete="off"
                erro={erros[`contato-${i}-telefone`]}
              />
            </>
          )}
        </View>
      ))}

      {podeAdicionar ? (
        <Botao
          titulo="Adicionar outro contato"
          variante="link"
          tamanho="compacto"
          icone="coracao"
          onPress={() => setContatos((l) => [...l, { contatoId: null, nome: '', telefone: '' }])}
        />
      ) : null}
    </Tela>
  );
}

const criarEstilos = (c: Paleta) =>
  StyleSheet.create({
    titulo: { gap: 8 },
    contato: {
      backgroundColor: c.superficie,
      borderWidth: 2,
      borderColor: brand.teal,
      borderRadius: raio.xxl,
      padding: 16,
      gap: 12,
    },
    contatoTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  });
