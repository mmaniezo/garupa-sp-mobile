import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TipoDia, TipoUso } from '@/api/types';
import { Aviso, Botao, CabecalhoPasso, CartaoOpcao, Chip, Tela, Texto } from '@/components/ui';
import { atualizarPreferencias, usePreferencias } from '@/dados-locais/preferencias';
import { DIAS, horariosHabituais, PERIODOS, TIPOS_DE_USO, type Periodo } from '@/domain/periodos';
import { mensagemDeErro, useEdicao, voltarOu } from '@/lib/navegacao';
import { salvarPerfilNaApi } from '@/servicos/cadastro';
import { atualizarSessao, useSessao } from '@/state/sessao';

const alternar = <T,>(lista: T[], item: T) => (lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item]);

/**
 * Tela 04 · Cadastro 3/4, opcional (RF03): como usa a moto e quando costuma rodar.
 * Muda o que o plano destaca, não o cálculo do risco (RB06).
 */
export default function CadastroUso() {
  const sessao = useSessao();
  const prefs = usePreferencias();
  const editar = useEdicao();
  const [usos, setUsos] = useState<TipoUso[]>(prefs.perfil.tiposDeUso);
  const [periodos, setPeriodos] = useState<Periodo[]>(prefs.perfil.periodos);
  const [dias, setDias] = useState<TipoDia[]>(prefs.perfil.dias);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Horários e dias começam vazios: a pessoa marca o que quiser, sem sugestão pelo uso.
  const escolherUso = (uso: TipoUso) => setUsos((l) => alternar(l, uso));

  async function salvar() {
    if (!sessao.usuarioId) return;
    setErro(null);
    setEnviando(true);
    try {
      await salvarPerfilNaApi(sessao.usuarioId, {
        tiposDeUso: usos,
        horariosHabituais: horariosHabituais(periodos, dias),
        distritosFrequentes: prefs.perfil.distritos.map((d) => d.distritoId),
      });
      await atualizarPreferencias({ perfil: { ...prefs.perfil, tiposDeUso: usos, periodos, dias } });
      if (editar) return voltarOu('/perfil');
      await atualizarSessao({ passos: { uso: 'feito' } });
      router.push('/cadastro/distritos');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function pular() {
    await atualizarSessao({ passos: { uso: 'pulado' } });
    router.push('/cadastro/distritos');
  }

  return (
    <Tela
      margem={24}
      rodape={<Botao titulo={editar ? 'Salvar' : 'Continuar'} onPress={salvar} carregando={enviando} />}>
      <CabecalhoPasso
        rotulo={editar ? 'Perfil de uso' : 'Passo 3 de 4 · opcional'}
        onVoltar={() => voltarOu(editar ? '/perfil' : '/cadastro/ficha')}
        onPular={editar ? undefined : pular}
        passo={editar ? undefined : 3}
      />
      <Texto variante="titulo" accessibilityRole="header">
        Como você usa a moto no dia a dia?
      </Texto>
      {erro ? <Aviso tom="erro" texto={erro} anunciar /> : null}

      <View style={styles.grade}>
        {TIPOS_DE_USO.map((t) => (
          <CartaoOpcao
            key={t.id}
            titulo={t.titulo}
            descricao={t.descricao}
            selecionado={usos.includes(t.id)}
            onPress={() => escolherUso(t.id)}
          />
        ))}
      </View>

      <View style={styles.bloco}>
        <Texto variante="tituloSecao" accessibilityRole="header">
          Quando você costuma rodar?
        </Texto>
        <View style={styles.linha}>
          {PERIODOS.map((p) => (
            <Chip
              key={p.id}
              rotulo={p.rotulo}
              selecionado={periodos.includes(p.id)}
              onPress={() => setPeriodos((l) => alternar(l, p.id))}
            />
          ))}
        </View>
        <View style={styles.linha} accessibilityLabel="Dias">
          {DIAS.map((d) => (
            <Chip
              key={d.id}
              rotulo={d.rotulo}
              formato="bloco"
              selecionado={dias.includes(d.id)}
              onPress={() => setDias((l) => alternar(l, d.id))}
            />
          ))}
        </View>
        <Texto variante="legenda" cor="textoSecundario">
          Muda o que o plano destaca, não o cálculo do risco.
        </Texto>
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bloco: { gap: 10 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
