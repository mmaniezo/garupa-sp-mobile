import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import type { Consentimentos } from '@/api/types';
import { Aviso, Botao, CabecalhoPasso, ItemMarcavel, Tela, Texto } from '@/components/ui';
import { atualizarPreferencias, usePreferencias } from '@/dados-locais/preferencias';
import { gravarValor, lerValor } from '@/db';
import { mensagemDeErro, useEdicao, voltarOu } from '@/lib/navegacao';
import {
  abrirAjusteDeBateria,
  abrirAjustesDoApp,
  lerStatusPermissoes,
  pedirLocalizacaoSempre,
  pedirMovimento,
  pedirNotificacoes,
  type StatusPermissoes,
} from '@/servicos/permissoes';
import { carregarPlano } from '@/servicos/plano';
import { atualizarSessao, useSessao } from '@/state/sessao';

/**
 * Tela 06 · Permissões e consentimentos (RF05, RF36, RB08).
 * Cada permissão tem o motivo em uma frase e pode ser revogada depois.
 * Cada tipo de dado tem consentimento próprio, enviado a PUT /consentimentos.
 */
export default function CadastroPermissoes() {
  const sessao = useSessao();
  const prefs = usePreferencias();
  const editar = useEdicao();
  const [status, setStatus] = useState<StatusPermissoes | null>(null);
  const [ficha, setFicha] = useState(prefs.consentimentos.fichaMedica || !editar);
  const [locais, setLocais] = useState(prefs.consentimentos.historicoDeLocais || !editar);
  const temPerfil = prefs.perfil.tiposDeUso.length > 0 || prefs.perfil.distritos.length > 0;
  const [perfil, setPerfil] = useState(editar ? prefs.consentimentos.perfilDeUso : temPerfil);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const atualizar = useCallback(() => {
    void lerStatusPermissoes().then(setStatus);
  }, []);

  useEffect(() => {
    atualizar();
    // Volta das configurações do sistema: lê de novo.
    const s = AppState.addEventListener('change', (e) => e === 'active' && atualizar());
    return () => s.remove();
  }, [atualizar]);

  async function pedirLocalizacao() {
    await pedirLocalizacaoSempre();
    atualizar();
  }

  const localizacaoNegada = status !== null && Platform.OS !== 'web' && !status.localizacaoSempre;

  async function concluir() {
    if (!sessao.usuarioId) return;
    setErro(null);
    setEnviando(true);
    try {
      // Pede o que falta, na ordem da tela.
      let s = await lerStatusPermissoes();
      if (!s.localizacaoSempre) await pedirLocalizacaoSempre();
      if (!s.notificacoes) await pedirNotificacoes();
      if (!s.movimento) await pedirMovimento();
      if (Platform.OS === 'android' && !prefs.bateriaOrientada) await abrirAjusteDeBateria();
      s = await lerStatusPermissoes();
      setStatus(s);

      const consentimentos: Consentimentos = {
        localizacaoEmUso: s.localizacaoEmUso,
        localizacaoEmSegundoPlano: s.localizacaoSempre,
        fichaMedica: ficha,
        historicoDeLocais: locais,
        perfilDeUso: perfil,
      };
      await api.salvarConsentimentos(sessao.usuarioId, consentimentos);
      await atualizarPreferencias({ consentimentos });

      if (editar) return voltarOu('/perfil');
      const metrica = await lerValor<Record<string, number>>('metrica_cadastro');
      await gravarValor('metrica_cadastro', { ...metrica, completoConcluido: Date.now() });
      await atualizarSessao({ passos: { permissoes: 'feito' } });
      void carregarPlano();
      router.replace('/plano');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela
      margem={24}
      gap={16}
      rodape={
        <>
          <Botao titulo={editar ? 'Salvar' : 'Permitir e entrar'} onPress={concluir} carregando={enviando} />
          <Texto variante="legenda" cor="textoSecundario" centro>
            Sem localização, o app mostra o plano, mas não avisa no trajeto.
          </Texto>
        </>
      }>
      <CabecalhoPasso
        rotulo={editar ? 'Permissões' : 'Antes do primeiro turno'}
        onVoltar={() => voltarOu(editar ? '/perfil' : '/cadastro/distritos')}
      />
      <View style={{ gap: 6 }}>
        <Texto variante="titulo" accessibilityRole="header">
          Para cuidar de você no turno
        </Texto>
        <Texto variante="corpoMenor" cor="textoSecundario">
          Cada permissão tem um motivo. Você pode revogar quando quiser.
        </Texto>
      </View>

      {erro ? <Aviso tom="erro" texto={erro} anunciar /> : null}

      <View style={styles.grupo}>
        <ItemMarcavel
          aparencia="cartao"
          caixaA="direita"
          titulo="Localização o tempo todo"
          descricao="Avisar de ponto crítico com outro app aberto e mandar sua posição no SOS."
          marcado={!!status?.localizacaoSempre}
          onPress={pedirLocalizacao}
        />
        {localizacaoNegada && status?.localizacaoEmUso ? (
          <View style={{ gap: 8 }}>
            <Aviso
              tom="info"
              texto='Para o alerta funcionar com outro app aberto, escolha "Permitir o tempo todo" nas configurações do Garupa SP.'
            />
            <Botao titulo="Abrir configurações" variante="contorno" tamanho="compacto" onPress={abrirAjustesDoApp} />
          </View>
        ) : null}
        <ItemMarcavel
          aparencia="cartao"
          caixaA="direita"
          titulo="Notificações"
          descricao="Alerta com som e vibração, e a contagem da queda."
          marcado={!!status?.notificacoes}
          onPress={async () => {
            await pedirNotificacoes();
            atualizar();
          }}
        />
        <ItemMarcavel
          aparencia="cartao"
          caixaA="direita"
          titulo="Movimento"
          descricao="O sensor do celular percebe uma queda."
          marcado={!!status?.movimento}
          onPress={async () => {
            await pedirMovimento();
            atualizar();
          }}
        />
        {Platform.OS === 'android' ? (
          <ItemMarcavel
            aparencia="cartao"
            caixaA="direita"
            titulo="Sem economia de bateria"
            descricao="O turno não é cortado no meio. Abre o ajuste do Android."
            marcado={prefs.bateriaOrientada}
            onPress={abrirAjusteDeBateria}
          />
        ) : null}
      </View>

      <View style={styles.grupo}>
        <Texto variante="overline" cor="textoSecundario" accessibilityRole="header">
          Seus dados, sua escolha
        </Texto>
        <ItemMarcavel
          titulo="Ficha médica no SOS"
          descricao="Só quem socorre vê, e só com o SOS ativo."
          marcado={ficha}
          onPress={() => setFicha((v) => !v)}
        />
        <ItemMarcavel
          titulo="Aprender meus locais frequentes"
          descricao="Só neste celular, sem trajetos. Nada vai para a internet."
          marcado={locais}
          onPress={() => setLocais((v) => !v)}
        />
        <ItemMarcavel
          titulo="Usar meu perfil de uso e distritos"
          descricao="Para escolher o que o plano do turno mostra."
          marcado={perfil}
          onPress={() => setPerfil((v) => !v)}
        />
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 10 },
});
