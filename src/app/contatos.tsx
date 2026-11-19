import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, ehErroApi } from '@/api';
import { CampoCelular } from '@/components/cadastro/campo-celular';
import { Aviso, Botao, CabecalhoPasso, Campo, Icone, Tela, Texto } from '@/components/ui';
import { regras } from '@/config';
import { useSessao } from '@/contexto/autenticacao';
import { gravarContatos, lerContatos, type ContatoLocal } from '@/dados-locais/seguro';
import { validarCelular, validarTelefone } from '@/domain/telefone';
import { mensagemDeErro, voltarOu } from '@/lib/navegacao';
import { useEstilos, useTema } from '@/lib/tema';
import { brand, raio, type Paleta } from '@/theme';

/** contatoId null: contato novo. */
type Edicao = { contatoId: string | null; nome: string; telefone: string };
type Erros = { nome?: string; telefone?: string };

const exibir = (telefone: string) => {
  const t = validarTelefone(telefone);
  return t.valido ? t.exibicao : telefone;
};

/**
 * Contatos de emergência (RF01), pelo Perfil: editar, excluir e adicionar (até 3). Precisa
 * ficar ao menos um: o último não tem "Excluir" (a API também recusa, com 409). São eles que
 * recebem o SMS do socorro, por isso o número tem de ser celular, com o 9 depois do DDD.
 */
export default function Contatos() {
  const { usuarioId } = useSessao();
  const styles = useEstilos(criarEstilos);
  const { c } = useTema();
  const [contatos, setContatos] = useState<ContatoLocal[]>([]);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erros, setErros] = useState<Erros>({});
  const [confirmarExclusao, setConfirmarExclusao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  // A lista da API vale (ids certos para editar e excluir); sem conexão, fica a do aparelho.
  useEffect(() => {
    let ativo = true;
    void (async () => {
      const locais = await lerContatos();
      if (ativo) setContatos(locais);
      if (!usuarioId) return;
      try {
        const u = await api.obterUsuario(usuarioId);
        if (!ativo || u.contatos.length === 0) return;
        const daApi = u.contatos.map((x) => ({ contatoId: x.contatoId, nome: x.nome, telefone: exibir(x.telefone) }));
        setContatos(daApi);
        await gravarContatos(daApi);
      } catch {
        // sem conexão: segue com a lista do aparelho
      }
    })();
    return () => {
      ativo = false;
    };
  }, [usuarioId]);

  function abrirEdicao(contato?: ContatoLocal) {
    setAviso(null);
    setErros({});
    setConfirmarExclusao(null);
    setEdicao(contato ? { contatoId: contato.contatoId, nome: contato.nome, telefone: contato.telefone } : { contatoId: null, nome: '', telefone: '' });
  }

  async function guardar(lista: ContatoLocal[], texto: string) {
    setContatos(lista);
    await gravarContatos(lista);
    setAviso({ tom: 'sucesso', texto });
  }

  async function salvar() {
    if (!edicao || !usuarioId) return;
    const novosErros: Erros = {};
    if (!edicao.nome.trim()) novosErros.nome = 'Informe o nome do contato.';
    const celular = validarCelular(edicao.telefone);
    if (!celular.valido) novosErros.telefone = celular.mensagem;
    setErros(novosErros);
    if (novosErros.nome || !celular.valido) return;

    setSalvando(true);
    try {
      const dados = { nome: edicao.nome.trim(), telefone: celular.e164 };
      const salvo = { nome: dados.nome, telefone: celular.exibicao };
      if (edicao.contatoId) {
        const contatoId = edicao.contatoId;
        await api.atualizarContato(usuarioId, contatoId, dados);
        await guardar(
          contatos.map((x) => (x.contatoId === contatoId ? { contatoId, ...salvo } : x)),
          'Contato atualizado.',
        );
      } else {
        const { contatoId } = await api.adicionarContato(usuarioId, dados);
        await guardar([...contatos, { contatoId, ...salvo }], 'Contato adicionado.');
      }
      setEdicao(null);
    } catch (e) {
      if (ehErroApi(e, 400)) setErros({ nome: e.erroDoCampo('nome'), telefone: e.erroDoCampo('telefone') });
      setAviso({ tom: 'erro', texto: mensagemDeErro(e, 'Não deu para salvar o contato. Tente de novo.') });
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(contatoId: string) {
    if (!usuarioId) return;
    setSalvando(true);
    try {
      await api.removerContato(usuarioId, contatoId);
      setConfirmarExclusao(null);
      await guardar(
        contatos.filter((x) => x.contatoId !== contatoId),
        'Contato excluído.',
      );
    } catch (e) {
      setAviso({
        tom: 'erro',
        texto: ehErroApi(e, 409) ? 'Precisa ficar ao menos um contato de emergência.' : mensagemDeErro(e, 'Não deu para excluir agora. Tente de novo.'),
      });
    } finally {
      setSalvando(false);
    }
  }

  function formulario() {
    if (!edicao) return null;
    return (
      <View key={edicao.contatoId ?? 'novo'} style={styles.cartao}>
        <Texto variante="rotulo" style={styles.nome}>
          {edicao.contatoId ? 'Editar contato' : 'Novo contato'}
        </Texto>
        <Campo
          rotulo="Nome"
          aparencia="interno"
          value={edicao.nome}
          onChangeText={(v) => {
            setErros((x) => ({ ...x, nome: undefined }));
            setEdicao((x) => (x ? { ...x, nome: v } : x));
          }}
          placeholder="Ex.: Ana (irmã)"
          maxLength={60}
          erro={erros.nome}
        />
        <CampoCelular
          rotulo="Celular"
          aparencia="interno"
          value={edicao.telefone}
          onChangeText={(v) => {
            setErros((x) => ({ ...x, telefone: undefined }));
            setEdicao((x) => (x ? { ...x, telefone: v } : x));
          }}
          placeholder="(11) 91234-5678"
          erro={erros.telefone}
        />
        <View style={styles.acoes}>
          <Botao titulo="Salvar" tamanho="compacto" larguraTotal={false} carregando={salvando} onPress={() => void salvar()} />
          <Botao
            titulo="Cancelar"
            variante="fantasma"
            tamanho="compacto"
            larguraTotal={false}
            onPress={() => {
              setEdicao(null);
              setErros({});
            }}
          />
        </View>
      </View>
    );
  }

  const podeExcluir = contatos.length > 1;

  return (
    <Tela margem={24}>
      <CabecalhoPasso rotulo="Contatos de emergência" onVoltar={() => voltarOu('/perfil')} />
      <View style={styles.titulo}>
        <Texto variante="titulo" accessibilityRole="header">
          Quem a gente avisa?
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          {`Até ${regras.maxContatos} contatos. Eles recebem o SMS com a sua localização e o link de acompanhamento do SOS.`}
        </Texto>
      </View>

      {aviso ? <Aviso tom={aviso.tom} texto={aviso.texto} anunciar /> : null}

      {contatos.map((contato, i) =>
        edicao && edicao.contatoId === contato.contatoId ? (
          formulario()
        ) : (
          <View key={contato.contatoId ?? i} style={styles.cartao}>
            <View style={styles.topo}>
              <Icone nome="coracao" tamanho={20} cor={c.link} />
              <View style={{ flex: 1 }}>
                <Texto variante="rotulo" style={styles.nome}>
                  {contato.nome}
                </Texto>
                <Texto variante="corpoMenor" cor="textoSecundario">
                  {contato.telefone}
                </Texto>
              </View>
            </View>
            {!validarCelular(contato.telefone).valido ? (
              <Texto variante="legenda" cor="emergenciaTexto">
                Este número não parece um celular com o 9 depois do DDD: o SMS do socorro pode não chegar. Toque em Editar.
              </Texto>
            ) : null}
            {confirmarExclusao === contato.contatoId ? (
              <View style={{ gap: 8 }}>
                <Texto variante="corpoMenor">{`Excluir ${contato.nome}? Deixa de receber o aviso do SOS.`}</Texto>
                <View style={styles.acoes}>
                  <Botao
                    titulo="Excluir"
                    variante="perigo"
                    tamanho="compacto"
                    larguraTotal={false}
                    carregando={salvando}
                    onPress={() => contato.contatoId && void excluir(contato.contatoId)}
                  />
                  <Botao titulo="Cancelar" variante="fantasma" tamanho="compacto" larguraTotal={false} onPress={() => setConfirmarExclusao(null)} />
                </View>
              </View>
            ) : (
              <View style={styles.acoes}>
                <Botao titulo="Editar" variante="link" tamanho="compacto" larguraTotal={false} onPress={() => abrirEdicao(contato)} />
                {podeExcluir ? (
                  <Botao
                    titulo="Excluir"
                    variante="perigoTexto"
                    tamanho="compacto"
                    larguraTotal={false}
                    onPress={() => {
                      setAviso(null);
                      setEdicao(null);
                      setConfirmarExclusao(contato.contatoId);
                    }}
                  />
                ) : null}
              </View>
            )}
          </View>
        ),
      )}

      {edicao && edicao.contatoId === null ? formulario() : null}

      {!edicao && contatos.length < regras.maxContatos ? (
        <Botao titulo="Adicionar contato" variante="contorno" tamanho="padrao" icone="coracao" style={{ borderColor: c.borda }} onPress={() => abrirEdicao()} />
      ) : null}

      {contatos.length === 1 ? (
        <Texto variante="legenda" cor="textoSecundario">
          Precisa ter ao menos um contato. Para trocar, toque em Editar; para excluir este, adicione outro antes.
        </Texto>
      ) : null}
    </Tela>
  );
}

const criarEstilos = (c: Paleta) =>
  StyleSheet.create({
    titulo: { gap: 8 },
    cartao: {
      backgroundColor: c.superficie,
      borderWidth: 2,
      borderColor: brand.teal,
      borderRadius: raio.xxl,
      padding: 16,
      gap: 12,
    },
    topo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    nome: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 16 },
    acoes: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  });
