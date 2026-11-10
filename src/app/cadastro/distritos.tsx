import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import type { Distrito } from '@/api/types';
import { Aviso, Botao, CabecalhoPasso, Campo, ItemMarcavel, Tela, Texto } from '@/components/ui';
import { regras } from '@/config';
import { atualizarPreferencias, usePreferencias } from '@/dados-locais/preferencias';
import { gravarValor, lerValor } from '@/db';
import { horariosHabituais } from '@/domain/periodos';
import { mensagemDeErro, useEdicao, voltarOu } from '@/lib/navegacao';
import { atualizarSessao, useSessao } from '@/state/sessao';
import { brand, raio, tons } from '@/theme';

const semAcento = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Tela 05 · Cadastro 4/4, opcional (RF04): até 5 distritos em que costuma rodar.
 * Só o distrito, nunca o endereço. A lista vem de GET /distritos (guardada para usar sem internet).
 */
export default function CadastroDistritos() {
  const sessao = useSessao();
  const prefs = usePreferencias();
  const editar = useEdicao();
  const [todos, setTodos] = useState<Distrito[] | null>(null);
  const [escolhidos, setEscolhidos] = useState<Distrito[]>(prefs.perfil.distritos);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api
      .listarDistritos()
      .then((lista) => {
        setTodos(lista);
        void gravarValor('distritos', lista);
      })
      .catch(async (e) => {
        const cache = await lerValor<Distrito[]>('distritos');
        if (cache) setTodos(cache);
        else setErro(mensagemDeErro(e));
      });
  }, []);

  const filtrados = useMemo(() => {
    if (!todos) return [];
    const termo = semAcento(busca.trim());
    const lista = termo ? todos.filter((d) => semAcento(d.nome).includes(termo)) : todos;
    return lista.slice(0, termo ? 40 : 96);
  }, [todos, busca]);

  const cheio = escolhidos.length >= regras.maxDistritos;
  const marcado = (d: Distrito) => escolhidos.some((e) => e.distritoId === d.distritoId);

  function alternar(d: Distrito) {
    if (marcado(d)) setEscolhidos((l) => l.filter((e) => e.distritoId !== d.distritoId));
    else if (!cheio) setEscolhidos((l) => [...l, d]);
  }

  async function salvar() {
    if (!sessao.usuarioId) return;
    setErro(null);
    setEnviando(true);
    try {
      await api.salvarPerfil(sessao.usuarioId, {
        tiposDeUso: prefs.perfil.tiposDeUso,
        horariosHabituais: horariosHabituais(prefs.perfil.periodos, prefs.perfil.dias),
        distritosFrequentes: escolhidos.map((d) => d.distritoId),
      });
      await atualizarPreferencias({ perfil: { ...prefs.perfil, distritos: escolhidos } });
      if (editar) return voltarOu('/perfil');
      await atualizarSessao({ passos: { distritos: escolhidos.length ? 'feito' : 'pulado' } });
      router.push('/cadastro/permissoes');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function pular() {
    await atualizarSessao({ passos: { distritos: 'pulado' } });
    router.push('/cadastro/permissoes');
  }

  return (
    <Tela
      margem={24}
      gap={16}
      rodape={<Botao titulo={editar ? 'Salvar distritos' : 'Concluir cadastro'} onPress={salvar} carregando={enviando} />}>
      <CabecalhoPasso
        rotulo={editar ? 'Distritos' : 'Passo 4 de 4 · opcional'}
        onVoltar={() => voltarOu(editar ? '/perfil' : '/cadastro/uso')}
        onPular={editar ? undefined : pular}
        passo={editar ? undefined : 4}
      />
      <View style={{ gap: 6 }}>
        <Texto variante="titulo" accessibilityRole="header">
          Onde você costuma rodar?
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          Até {regras.maxDistritos} distritos. Só o distrito, nunca o seu endereço.
        </Texto>
      </View>

      {erro ? <Aviso tom="erro" texto={erro} anunciar /> : null}

      <Campo
        rotulo="Buscar distrito"
        value={busca}
        onChangeText={setBusca}
        placeholder="Ex.: Pinheiros"
        autoCorrect={false}
        returnKeyType="search"
      />

      <View style={styles.contagem}>
        <Texto variante="rotulo" style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>
          Escolhidos
        </Texto>
        <Texto variante="rotulo" cor={brand.teal} style={{ fontFamily: 'BricolageGrotesque_700Bold' }} accessibilityLiveRegion="polite">
          {escolhidos.length} de {regras.maxDistritos}
        </Texto>
      </View>
      {escolhidos.length ? (
        <View style={styles.escolhidos}>
          {escolhidos.map((d) => (
            <Botao
              key={d.distritoId}
              titulo={`${d.nome} ×`}
              tamanho="compacto"
              larguraTotal={false}
              dica={`Remove ${d.nome}`}
              onPress={() => alternar(d)}
            />
          ))}
        </View>
      ) : null}

      {todos === null && !erro ? <ActivityIndicator color={brand.teal} /> : null}
      {todos ? (
        <View style={styles.lista}>
          {filtrados.length === 0 ? (
            <Texto variante="legenda" cor="textoSecundario" style={{ padding: 16 }}>
              Nenhum distrito com esse nome.
            </Texto>
          ) : (
            filtrados.map((d, i) => (
              <View key={d.distritoId} style={[styles.item, i > 0 && styles.divisor, cheio && !marcado(d) && { opacity: 0.45 }]}>
                <ItemMarcavel titulo={d.nome} marcado={marcado(d)} onPress={() => alternar(d)} />
              </View>
            ))
          )}
        </View>
      ) : null}
      {cheio ? (
        <Texto variante="legenda" cor="textoSecundario">
          Com {regras.maxDistritos} escolhidos, para trocar é só tirar um antes.
        </Texto>
      ) : null}
    </Tela>
  );
}

const styles = StyleSheet.create({
  contagem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  escolhidos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lista: { backgroundColor: tons.superficie, borderRadius: raio.xl, overflow: 'hidden' },
  item: { paddingHorizontal: 16, minHeight: 52, justifyContent: 'center' },
  divisor: { borderTopWidth: 1, borderTopColor: brand.viseira },
});
