import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, ehErroApi } from '@/api';
import { Aviso, Botao, CabecalhoPasso, Campo, Icone, Tela, Texto } from '@/components/ui';
import { regras } from '@/config';
import { gravarContatos, lerContatos, type ContatoLocal } from '@/dados-locais/seguro';
import { gravarValor, lerValor } from '@/db';
import { mascararTelefone, validarTelefone } from '@/domain/telefone';
import { mensagemDeErro, useEdicao, voltarOu } from '@/lib/navegacao';
import { atualizarSessao, useSessao } from '@/state/sessao';
import { brand, raio, tons } from '@/theme';

type ContatoForm = { contatoId: string | null; nome: string; telefone: string };
type Erros = Record<string, string | undefined>;

/**
 * Tela 02 · Cadastro 1/4, obrigatório (RF01): nome ou apelido, telefone e um contato.
 * Até 3 contatos. Pelo Perfil (?editar=1), serve para adicionar contatos.
 */
export default function CadastroBasico() {
  const sessao = useSessao();
  const editar = useEdicao();
  const [nome, setNome] = useState(sessao.nome ?? '');
  const [telefone, setTelefone] = useState('');
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
      if (salvos.length) setContatos(editar && salvos.length < regras.maxContatos ? [...salvos, { contatoId: null, nome: '', telefone: '' }] : salvos);
    });
  }, [editar]);

  /** Ao corrigir um campo, o erro dele some. */
  const limparErro = (chave: string) => setErros((e) => (e[chave] ? { ...e, [chave]: undefined } : e));

  function mudarContato(i: number, campo: 'nome' | 'telefone', valor: string) {
    limparErro(`contato-${i}-${campo}`);
    setContatos((lista) => lista.map((c, j) => (j === i ? { ...c, [campo]: campo === 'telefone' ? mascararTelefone(valor) : valor } : c)));
  }

  function validar(): boolean {
    const e: Erros = {};
    if (!jaTemUsuario) {
      if (!nome.trim()) e.nome = 'Informe seu nome ou apelido.';
      if (!validarTelefone(telefone).valido) e.telefone = 'Telefone com DDD, como (11) 90000-0000.';
    }
    const preenchidos = contatos.filter((c) => c.contatoId || c.nome.trim() || c.telefone.trim());
    if (preenchidos.length === 0) e['contato-0-nome'] = 'Informe ao menos um contato de emergência.';
    contatos.forEach((c, i) => {
      if (c.contatoId || (!c.nome.trim() && !c.telefone.trim() && i > 0)) return;
      if (!c.nome.trim()) e[`contato-${i}-nome`] = 'Informe o nome do contato.';
      if (!validarTelefone(c.telefone).valido) e[`contato-${i}-telefone`] = 'Telefone com DDD, como (11) 90000-0001.';
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
      if (!usuarioId) {
        const t = validarTelefone(telefone);
        const criado = await api.criarUsuario({ nome: nome.trim(), telefone: t.valido ? t.e164 : telefone });
        usuarioId = criado.usuarioId;
        // Guarda já: se o contato falhar, tentar de novo não cria outro usuário.
        await atualizarSessao({ usuarioId, nome: nome.trim() });
      }

      const salvos: ContatoLocal[] = [];
      for (const [i, c] of contatos.entries()) {
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

      if (editar) {
        voltarOu('/perfil');
        return;
      }
      const metrica = await lerValor<{ inicio: number }>('metrica_cadastro');
      await gravarValor('metrica_cadastro', { ...metrica, minimoConcluido: Date.now() });
      await atualizarSessao({ passos: { basico: 'feito' } });
      router.push('/cadastro/ficha');
    } catch (e) {
      if (ehErroApi(e, 400)) {
        setErros((atual) => ({ ...atual, nome: e.erroDoCampo('nome') ?? atual.nome, telefone: e.erroDoCampo('telefone') ?? atual.telefone }));
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
          <Botao titulo={editar ? 'Salvar contatos' : 'Continuar'} onPress={continuar} carregando={enviando} />
          {!editar ? (
            <Texto variante="legenda" cor="textoSecundario" centro>
              Ficha médica (tipo sanguíneo, alergias) você preenche depois, se quiser.
            </Texto>
          ) : null}
        </>
      }>
      <CabecalhoPasso
        rotulo={editar ? 'Contatos de emergência' : 'Passo 1 de 4 · obrigatório'}
        onVoltar={() => voltarOu(editar ? '/perfil' : '/boas-vindas')}
        passo={editar ? undefined : 1}
      />
      <View style={styles.titulo}>
        <Texto variante="titulo" accessibilityRole="header">
          {editar ? 'Quem a gente avisa?' : 'Quem é você?'}
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          {editar
            ? `Até ${regras.maxContatos} contatos. Eles recebem o link de acompanhamento do SOS.`
            : 'Seus dados e alguém para a gente avisar se você precisar de socorro. O resto é opcional.'}
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
          <Campo
            rotulo="Seu telefone"
            value={telefone}
            onChangeText={(v) => {
              limparErro('telefone');
              setTelefone(mascararTelefone(v));
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="(11) 90000-0000"
            erro={erros.telefone}
          />
        </>
      ) : !editar ? (
        <Aviso tom="neutro" texto={`Cadastro de ${sessao.nome ?? 'você'} criado. Falta confirmar o contato de emergência.`} />
      ) : null}

      {contatos.map((c, i) => (
        <View key={i} style={styles.contato}>
          <View style={styles.contatoTopo}>
            <Icone nome="coracao" tamanho={20} cor={brand.teal} />
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
              <Campo
                rotulo="Telefone"
                aparencia="interno"
                value={c.telefone}
                onChangeText={(v) => mudarContato(i, 'telefone', v)}
                keyboardType="phone-pad"
                placeholder="(11) 90000-0001"
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

const styles = StyleSheet.create({
  titulo: { gap: 8 },
  contato: {
    backgroundColor: tons.superficie,
    borderWidth: 2,
    borderColor: brand.teal,
    borderRadius: raio.xxl,
    padding: 16,
    gap: 12,
  },
  contatoTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
