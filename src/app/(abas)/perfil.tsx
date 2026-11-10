import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { api, mock } from '@/api';
import type { Consentimentos } from '@/api/types';
import { Aviso, Botao, Icone, ItemMarcavel, Tela, Texto } from '@/components/ui';
import { atualizarPreferencias, limparPreferencias, usePreferencias } from '@/dados-locais/preferencias';
import { apagarHistoricoDeLocais, contarCelulasVisitadas, registrarVisita } from '@/dados-locais/repositorios';
import { apagarDadosSeguros, fichaTemDados, lerContatos, lerFicha } from '@/dados-locais/seguro';
import { celulaLocal } from '@/domain/geo';
import { rotuloUso } from '@/domain/periodos';
import { mensagemDeErro } from '@/lib/navegacao';
import { carregarPlano, limparPlano, usePlano } from '@/servicos/plano';
import { finalizarTurno, useTurno } from '@/servicos/turno';
import { encerrarSessaoNoAparelho, useSessao } from '@/state/sessao';
import { brand, raio, tons } from '@/theme';

function Linha({ titulo, valor, href, corValor }: { titulo: string; valor: string; href: Href; corValor?: string }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: ${valor}`}
      style={({ pressed }) => [styles.linha, pressed && { opacity: 0.85 }]}>
      <Texto variante="corpoMenor" style={{ flex: 1, fontFamily: 'BricolageGrotesque_600SemiBold', fontSize: 17 }}>
        {titulo}
      </Texto>
      <Texto variante="legenda" cor={corValor ?? tons.textoSecundario}>
        {valor}
      </Texto>
      <Icone nome="chevronDireita" tamanho={18} cor={tons.textoSecundario} />
    </Pressable>
  );
}

/**
 * Tela 21 · Conta e privacidade (RF05, RF06, RF12, RB08, RB09).
 * Editar dados, consentimentos por tipo (revogáveis), apagar o histórico de locais do aparelho
 * e excluir a conta (DELETE /usuarios/{id} e limpeza do aparelho).
 */
export default function Perfil() {
  const sessao = useSessao();
  const prefs = usePreferencias();
  const turno = useTurno();
  const plano = usePlano();
  const [contatos, setContatos] = useState(0);
  const [temFicha, setTemFicha] = useState(false);
  const [celulas, setCelulas] = useState(0);
  const [aviso, setAviso] = useState<{ tom: 'sucesso' | 'erro' | 'neutro'; texto: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      void lerContatos().then((c) => setContatos(c.length));
      void lerFicha().then((f) => setTemFicha(fichaTemDados(f)));
      void contarCelulasVisitadas().then(setCelulas);
    }, []),
  );

  async function mudarConsentimento(campo: keyof Consentimentos) {
    const consentimentos = { ...prefs.consentimentos, [campo]: !prefs.consentimentos[campo] };
    await atualizarPreferencias({ consentimentos });
    // Revogar o segundo plano impede o turno ativo (RF05).
    if (campo === 'localizacaoEmSegundoPlano' && !consentimentos[campo] && turno.situacao !== 'inativo') {
      await finalizarTurno();
    }
    try {
      if (sessao.usuarioId) await api.salvarConsentimentos(sessao.usuarioId, consentimentos);
      setAviso(null);
    } catch (e) {
      setAviso({ tom: 'neutro', texto: `Guardado no celular. ${mensagemDeErro(e)}` });
    }
    if (campo === 'historicoDeLocais' || campo === 'perfilDeUso') void carregarPlano();
  }

  function apagarHistorico() {
    Alert.alert('Apagar o histórico de locais?', 'Apaga a contagem de visitas guardada só neste celular.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await apagarHistoricoDeLocais();
          setCelulas(0);
          void carregarPlano();
          setAviso({ tom: 'sucesso', texto: 'Histórico de locais apagado deste celular.' });
        },
      },
    ]);
  }

  function excluirConta() {
    Alert.alert(
      'Excluir sua conta?',
      'Apaga cadastro, ficha, contatos, perfil e relatos na API e tudo o que está neste celular. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              if (sessao.usuarioId) await api.excluirUsuario(sessao.usuarioId);
            } catch (e) {
              setAviso({ tom: 'erro', texto: `A conta não foi excluída. ${mensagemDeErro(e)}` });
              return;
            }
            await finalizarTurno();
            await apagarDadosSeguros();
            await encerrarSessaoNoAparelho();
            await limparPreferencias();
            limparPlano();
            router.replace('/boas-vindas');
          },
        },
      ],
    );
  }

  async function simularHistorico() {
    for (const p of plano.dados?.pontos.slice(-2) ?? []) {
      for (let i = 0; i < 5; i++) await registrarVisita(celulaLocal({ lat: p.centroLat, lon: p.centroLon }));
    }
    setCelulas(await contarCelulasVisitadas());
    void carregarPlano();
    setAviso({ tom: 'sucesso', texto: 'Histórico simulado: os pontos visitados sobem no plano.' });
  }

  const usos = prefs.perfil.tiposDeUso.map(rotuloUso).join(' · ') || 'Perfil de uso não informado';
  const inicial = (sessao.nome ?? '?').trim().charAt(0).toUpperCase();

  return (
    <Tela dentroDeAbas gap={14}>
      <View style={styles.cabecalho}>
        <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Texto variante="titulo" cor={brand.asfalto} style={{ fontSize: 24 }}>
            {inicial}
          </Texto>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="alerta" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }} accessibilityRole="header">
            {sessao.nome}
          </Texto>
          <Texto variante="legenda" cor="textoSecundario">
            {usos}
          </Texto>
        </View>
      </View>

      {aviso ? <Aviso tom={aviso.tom} texto={aviso.texto} anunciar /> : null}

      <View style={styles.grupo}>
        <Linha titulo="Contatos de emergência" valor={String(contatos)} href="/cadastro/basico?editar=1" />
        <Linha titulo="Ficha médica" valor={temFicha ? 'Preenchida' : 'Não preenchida'} href="/cadastro/ficha?editar=1" />
        <Linha
          titulo="Perfil de uso"
          valor={
            prefs.perfil.tiposDeUso.length === 0
              ? 'Completar'
              : `${prefs.perfil.tiposDeUso.length} ${prefs.perfil.tiposDeUso.length === 1 ? 'uso' : 'usos'}`
          }
          href="/cadastro/uso?editar=1"
        />
        <Linha
          titulo="Distritos"
          valor={
            prefs.perfil.distritos.length === 0
              ? 'Escolher'
              : `${prefs.perfil.distritos.length} ${prefs.perfil.distritos.length === 1 ? 'distrito' : 'distritos'}`
          }
          href="/cadastro/distritos?editar=1"
        />
        <Linha
          titulo="Pulseira"
          valor={prefs.pulseira ? 'Pareada' : 'Não pareada'}
          corValor={prefs.pulseira ? tons.seguroClaro : undefined}
          href="/pulseira"
        />
        <Linha titulo="Permissões do celular" valor="Revisar" href="/cadastro/permissoes?editar=1" />
      </View>

      <Texto variante="overline" cor="textoSecundario" accessibilityRole="header" style={{ marginTop: 6 }}>
        Privacidade
      </Texto>
      <View style={[styles.grupo, { paddingHorizontal: 16, paddingVertical: 4 }]}>
        <ItemMarcavel
          caixaA="direita"
          titulo="Localização em segundo plano"
          descricao="Sem ela, não há turno ativo nem alerta no trajeto."
          marcado={prefs.consentimentos.localizacaoEmSegundoPlano}
          onPress={() => void mudarConsentimento('localizacaoEmSegundoPlano')}
        />
        <ItemMarcavel
          caixaA="direita"
          titulo="Ficha médica no SOS"
          descricao="Só quem socorre vê, com o SOS ativo."
          marcado={prefs.consentimentos.fichaMedica}
          onPress={() => void mudarConsentimento('fichaMedica')}
        />
        <ItemMarcavel
          caixaA="direita"
          titulo="Locais frequentes"
          descricao={`Fica só neste celular, sem trajetos. ${celulas} lugares guardados.`}
          marcado={prefs.consentimentos.historicoDeLocais}
          onPress={() => void mudarConsentimento('historicoDeLocais')}
        />
        <ItemMarcavel
          caixaA="direita"
          titulo="Perfil de uso e distritos"
          descricao="Para escolher o que o plano mostra."
          marcado={prefs.consentimentos.perfilDeUso}
          onPress={() => void mudarConsentimento('perfilDeUso')}
        />
      </View>

      <Botao titulo="Apagar histórico de locais" variante="contorno" tamanho="padrao" style={{ borderColor: tons.borda }} onPress={apagarHistorico} />
      <Botao titulo="Excluir minha conta e todos os dados" variante="perigoTexto" tamanho="padrao" onPress={excluirConta} />

      {__DEV__ || mock ? (
        <View style={{ gap: 6 }}>
          <Texto variante="overline" cor="textoSecundario">
            Demonstração
          </Texto>
          <Botao titulo="Simular histórico de locais" variante="link" tamanho="compacto" onPress={simularHistorico} />
          <Botao titulo="Diagnóstico do segundo plano" variante="link" tamanho="compacto" onPress={() => router.push('/diagnostico')} />
          {__DEV__ ? <Botao titulo="Catálogo de telas" variante="link" tamanho="compacto" onPress={() => router.push('/dev')} /> : null}
        </View>
      ) : null}
    </Tela>
  );
}

const styles = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: brand.teal, alignItems: 'center', justifyContent: 'center' },
  grupo: { backgroundColor: tons.superficie, borderRadius: raio.xxl, overflow: 'hidden' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.viseira,
  },
});
