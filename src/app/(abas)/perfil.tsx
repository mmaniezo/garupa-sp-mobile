import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import type { Consentimentos } from '@/api/types';
import { AvisoSessaoExpirada } from '@/components/sessao/aviso-sessao-expirada';
import { Aviso, Botao, Entrada, Icone, ItemMarcavel, Pressionavel, Segmentado, Tela, Texto } from '@/components/ui';
import { atualizarPreferencias, usePreferencias } from '@/dados-locais/preferencias';
import { apagarHistoricoDeLocais } from '@/dados-locais/repositorios';
import { fichaTemDados, lerContatos, lerFicha } from '@/dados-locais/seguro';
import { rotuloUso } from '@/domain/periodos';
import { mensagemDeErro } from '@/lib/navegacao';
import { useEstilos, useTema } from '@/lib/tema';
import { sairDaConta } from '@/servicos/conta';
import { carregarPlano } from '@/servicos/plano';
import { pedirPermissaoSms, smsAutomaticoSuportado, temPermissaoSms } from '@/servicos/sms';
import { finalizarTurno, useTurno } from '@/servicos/turno';
import { useSessao } from '@/state/sessao';
import { brand, brilho, raio, type Paleta, type PreferenciaTema } from '@/theme';

function Linha({ titulo, valor, href, corValor }: { titulo: string; valor: string; href: Href; corValor?: string }) {
  const styles = useEstilos(criarEstilos);
  const { c } = useTema();
  return (
    <Pressionavel
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: ${valor}`}
      escala={0.985}
      style={styles.linha}>
      <Texto variante="corpoMenor" style={{ flex: 1, fontFamily: 'BricolageGrotesque_600SemiBold', fontSize: 17 }}>
        {titulo}
      </Texto>
      <Texto variante="legenda" cor={corValor ?? c.textoSecundario}>
        {valor}
      </Texto>
      <Icone nome="chevronDireita" tamanho={18} cor={c.textoSecundario} />
    </Pressionavel>
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
  const [contatos, setContatos] = useState(0);
  const [temFicha, setTemFicha] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'sucesso' | 'erro' | 'neutro'; texto: string } | null>(null);
  const [permissaoSms, setPermissaoSms] = useState(false);
  const styles = useEstilos(criarEstilos);
  const { c } = useTema();

  useFocusEffect(
    useCallback(() => {
      void lerContatos().then((lista) => setContatos(lista.length));
      void lerFicha().then((f) => setTemFicha(fichaTemDados(f)));
      void temPermissaoSms().then(setPermissaoSms);
    }, []),
  );

  /** SMS automático: ligar pede a permissão de SMS; sem ela, o app abre o SMS pronto. */
  async function mudarSmsAutomatico() {
    if (prefs.smsAutomatico && permissaoSms) {
      await atualizarPreferencias({ smsAutomatico: false });
      return;
    }
    const ok = permissaoSms || (await pedirPermissaoSms());
    setPermissaoSms(ok);
    await atualizarPreferencias({ smsAutomatico: ok });
    if (!ok) setAviso({ tom: 'neutro', texto: 'Sem a permissão de SMS, o app abre a mensagem pronta e você toca em enviar.' });
  }

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
            await sairDaConta();
            router.replace('/boas-vindas');
          },
        },
      ],
    );
  }

  function sair() {
    Alert.alert(
      'Sair da conta?',
      sessao.temSenha
        ? 'Sua conta continua salva: para voltar, entre com o telefone e a senha. Saem deste celular a ficha médica, os contatos e o histórico de locais.'
        : 'Esta conta é de antes do login com senha: depois de sair, não dá para entrar nela de novo, só fazer um cadastro novo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await sairDaConta();
            router.replace('/boas-vindas');
          },
        },
      ],
    );
  }

  const usos = prefs.perfil.tiposDeUso.map(rotuloUso).join(' · ') || 'Perfil de uso não informado';
  const inicial = (sessao.nome ?? '?').trim().charAt(0).toUpperCase();

  return (
    <Tela dentroDeAbas gap={14}>
      <Entrada ordem={0} style={styles.cabecalho}>
        <View style={styles.avatarAnel} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.avatar}>
            <Texto variante="titulo" cor={brand.asfalto} style={{ fontSize: 24 }}>
              {inicial}
            </Texto>
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="alerta" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }} accessibilityRole="header">
            {sessao.nome}
          </Texto>
          <Texto variante="legenda" cor="textoSecundario">
            {usos}
          </Texto>
        </View>
      </Entrada>

      <AvisoSessaoExpirada />
      {aviso ? <Aviso tom={aviso.tom} texto={aviso.texto} anunciar /> : null}

      <Entrada ordem={1} style={styles.grupo}>
        <Linha titulo="Nome e celular" valor="Editar" href="/meus-dados" />
        <Linha titulo="Contatos de emergência" valor={String(contatos)} href="/contatos" />
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
          corValor={prefs.pulseira ? c.seguroTexto : undefined}
          href="/pulseira"
        />
        <Linha titulo="Permissões do celular" valor="Revisar" href="/cadastro/permissoes?editar=1" />
      </Entrada>

      <Texto variante="overline" cor="textoSecundario" accessibilityRole="header" style={{ marginTop: 6 }}>
        Socorro
      </Texto>
      <View style={[styles.grupo, { paddingHorizontal: 16, paddingVertical: 4 }]}>
        <ItemMarcavel
          caixaA="direita"
          titulo="SMS automático aos contatos"
          descricao={
            !smsAutomaticoSuportado
              ? 'Neste celular o SMS abre pronto e você toca em enviar.'
              : permissaoSms
                ? 'Numa queda sem resposta, o SMS com a sua localização sai sozinho, mesmo sem internet.'
                : 'Precisa da permissão de SMS do Android. Toque para permitir.'
          }
          marcado={smsAutomaticoSuportado && prefs.smsAutomatico && permissaoSms}
          onPress={() => void mudarSmsAutomatico()}
        />
      </View>

      <Texto variante="overline" cor="textoSecundario" accessibilityRole="header" style={{ marginTop: 6 }}>
        Aparência
      </Texto>
      <View style={{ gap: 6 }}>
        <Segmentado<PreferenciaTema>
          rotulo="Tema do app"
          preencher
          valor={prefs.tema}
          opcoes={[
            { valor: 'sistema', rotulo: 'Sistema' },
            { valor: 'claro', rotulo: 'Claro' },
            { valor: 'escuro', rotulo: 'Escuro' },
          ]}
          onChange={(tema) => void atualizarPreferencias({ tema })}
        />
        <Texto variante="legenda" cor="textoSecundario" centro>
          Em Sistema, o app segue o modo claro ou escuro do celular.
        </Texto>
      </View>

      <Texto variante="overline" cor="textoSecundario" accessibilityRole="header" style={{ marginTop: 6 }}>
        Privacidade
      </Texto>
      <View style={[styles.grupo, { paddingHorizontal: 16, paddingVertical: 4 }]}>
        <ItemMarcavel
          caixaA="direita"
          titulo="Localização em segundo plano"
          marcado={prefs.consentimentos.localizacaoEmSegundoPlano}
          onPress={() => void mudarConsentimento('localizacaoEmSegundoPlano')}
        />
        <ItemMarcavel
          caixaA="direita"
          titulo="Ficha médica no SOS"
          marcado={prefs.consentimentos.fichaMedica}
          onPress={() => void mudarConsentimento('fichaMedica')}
        />
        <ItemMarcavel
          caixaA="direita"
          titulo="Locais frequentes"
          marcado={prefs.consentimentos.historicoDeLocais}
          onPress={() => void mudarConsentimento('historicoDeLocais')}
        />
        <ItemMarcavel
          caixaA="direita"
          titulo="Perfil de uso e distritos"
          marcado={prefs.consentimentos.perfilDeUso}
          onPress={() => void mudarConsentimento('perfilDeUso')}
        />
      </View>

      <Botao titulo="Apagar histórico de locais" variante="contorno" tamanho="padrao" style={{ borderColor: c.borda }} onPress={apagarHistorico} />
      <Botao titulo="Sair da conta" variante="contorno" tamanho="padrao" style={{ borderColor: c.borda }} onPress={sair} />
      <Botao titulo="Excluir minha conta e todos os dados" variante="perigoTexto" tamanho="padrao" onPress={excluirConta} />
    </Tela>
  );
}

const criarEstilos = (c: Paleta) =>
  StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  // Anel fino em volta do avatar, com a luz do teal por baixo.
  avatarAnel: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: c.selecionadoFundo,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: brilho.teal,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: brand.teal, alignItems: 'center', justifyContent: 'center' },
  grupo: { backgroundColor: c.superficie, borderRadius: raio.xxl, overflow: 'hidden', borderWidth: 1, borderColor: c.fio },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.divisor,
  },
});
