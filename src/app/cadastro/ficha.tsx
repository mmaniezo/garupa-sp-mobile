import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { FichaMedica } from '@/api/types';
import { Aviso, Botao, CabecalhoPasso, Campo, Chip, Tela, Texto } from '@/components/ui';
import { gravarFicha, lerFicha } from '@/dados-locais/seguro';
import { mensagemDeErro, useEdicao, voltarOu } from '@/lib/navegacao';
import { salvarFichaNaApi } from '@/servicos/cadastro';
import { atualizarSessao, useSessao } from '@/state/sessao';

const TIPOS_SANGUINEOS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

/**
 * Tela 03 · Cadastro 2/4, opcional (RF02): ficha médica.
 * Só aparece para quem socorre, com SOS ativo; o contato não vê (RB10).
 * Guardada criptografada no aparelho e enviada à API (que também criptografa).
 */
export default function CadastroFicha() {
  const sessao = useSessao();
  const editar = useEdicao();
  const [ficha, setFicha] = useState<FichaMedica>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void lerFicha().then((f) => f && setFicha(f));
  }, []);

  const mudar = (campo: keyof FichaMedica, valor: string | null) => setFicha((f) => ({ ...f, [campo]: valor }));

  async function salvar() {
    if (!sessao.usuarioId) return;
    setErro(null);
    setEnviando(true);
    const limpa: FichaMedica = {
      tipoSanguineo: ficha.tipoSanguineo ?? null,
      alergias: ficha.alergias?.trim() || null,
      condicoes: ficha.condicoes?.trim() || null,
      medicamentos: ficha.medicamentos?.trim() || null,
    };
    try {
      await salvarFichaNaApi(sessao.usuarioId, limpa);
      await gravarFicha(limpa);
      if (editar) return voltarOu('/perfil');
      await atualizarSessao({ passos: { ficha: 'feito' } });
      router.push('/cadastro/uso');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function pular() {
    await atualizarSessao({ passos: { ficha: 'pulado' } });
    router.push('/cadastro/uso');
  }

  return (
    <Tela
      margem={24}
      rodape={
        <>
          <Botao titulo={editar ? 'Salvar ficha' : 'Salvar e continuar'} onPress={salvar} carregando={enviando} />
          {!editar ? (
            <Texto variante="legenda" cor="textoSecundario" centro>
              Pular não atrapalha o SOS. Dá para preencher depois no Perfil.
            </Texto>
          ) : null}
        </>
      }>
      <CabecalhoPasso
        rotulo={editar ? 'Ficha médica' : 'Passo 2 de 4 · opcional'}
        onVoltar={() => voltarOu(editar ? '/perfil' : '/cadastro/basico')}
        onPular={editar ? undefined : pular}
        passo={editar ? undefined : 2}
      />
      <View style={styles.titulo}>
        <Texto variante="titulo" accessibilityRole="header">
          Ficha médica
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          Só aparece para quem for te socorrer, com o SOS ativo. Seu contato não vê.
        </Texto>
      </View>

      {erro ? <Aviso tom="erro" texto={erro} anunciar /> : null}

      <View style={styles.bloco}>
        <Texto variante="rotulo">Tipo sanguíneo</Texto>
        <View style={styles.grade} accessibilityRole="radiogroup" accessibilityLabel="Tipo sanguíneo">
          {TIPOS_SANGUINEOS.map((t) => (
            <View key={t} style={styles.celula}>
              <Chip
                rotulo={t}
                escolha="unica"
                formato="bloco"
                selecionado={ficha.tipoSanguineo === t}
                onPress={() => mudar('tipoSanguineo', ficha.tipoSanguineo === t ? null : t)}
              />
            </View>
          ))}
        </View>
      </View>
      <Campo
        rotulo="Alergias"
        value={ficha.alergias ?? ''}
        onChangeText={(v) => mudar('alergias', v)}
        placeholder="Ex.: algum remédio"
        maxLength={140}
      />
      <Campo
        rotulo="Condições de saúde"
        value={ficha.condicoes ?? ''}
        onChangeText={(v) => mudar('condicoes', v)}
        placeholder="Opcional"
        maxLength={140}
      />
      <Campo
        rotulo="Medicamentos de uso contínuo"
        value={ficha.medicamentos ?? ''}
        onChangeText={(v) => mudar('medicamentos', v)}
        placeholder="Opcional"
        maxLength={140}
      />
      <Texto variante="legenda" cor="textoSecundario">
        Ao salvar, você autoriza guardar a ficha criptografada. Dá para revogar no Perfil. Use dados fictícios no protótipo.
      </Texto>
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { gap: 8 },
  bloco: { gap: 8 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celula: { width: '22%', flexGrow: 1 },
});
