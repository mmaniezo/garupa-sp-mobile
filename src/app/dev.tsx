import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, mock, origemApi } from '@/api';
import { Logo } from '@/components/brand/logo';
import {
  BannerAlerta,
  Botao,
  CabecalhoPasso,
  Campo,
  CartaoMensagem,
  CartaoOpcao,
  Chip,
  Etiqueta,
  ItemMarcavel,
  Tela,
  Texto,
} from '@/components/ui';
import { DISTRITOS } from '@/api/mock/dados';
import { config } from '@/config';
import { atualizarPreferencias, limparPreferencias } from '@/dados-locais/preferencias';
import { apagarDadosSeguros, gravarContatos, gravarFicha } from '@/dados-locais/seguro';
import { versaoDoEsquema } from '@/db';
import { horariosHabituais } from '@/domain/periodos';
import { carregarPlano, limparPlano } from '@/servicos/plano';
import { atualizarSessao, encerrarSessaoNoAparelho, useSessao } from '@/state/sessao';
import { brand, raio, tons } from '@/theme';

/**
 * Catálogo de desenvolvimento: todas as telas do design e os componentes-base.
 * Abre com um toque longo na logo das boas-vindas (só em desenvolvimento) ou pelo link garupasp://dev.
 */
const TELAS: [string, Href][] = [
  ['01 Boas-vindas', '/boas-vindas'],
  ['02 Cadastro 1/4 — básico', '/cadastro/basico'],
  ['03 Cadastro 2/4 — ficha médica', '/cadastro/ficha'],
  ['04 Cadastro 3/4 — uso e horários', '/cadastro/uso'],
  ['05 Cadastro 4/4 — distritos', '/cadastro/distritos'],
  ['06 Permissões e consentimentos', '/cadastro/permissoes'],
  ['07 Plano do turno', '/plano'],
  ['08 Mapa de pontos críticos', '/mapa'],
  ['09 Antes de sair', '/turno/antes-de-sair'],
  ['10 Turno ativo', '/turno/ativo'],
  ['12 Motivo do alerta', '/turno/alerta/mock-63-A'],
  ['13 Turno pausado', '/turno/pausado'],
  ['15 Queda — contagem', '/queda'],
  ['16 SOS enviado', '/sos/exemplo'],
  ['18 Testemunha', '/testemunha'],
  ['19 Relatar perigo', '/relatar'],
  ['20 Pulseira', '/pulseira'],
  ['21 Conta e privacidade', '/perfil'],
  ['Diagnóstico do segundo plano', '/diagnostico'],
];

export default function CatalogoDev() {
  const sessao = useSessao();
  const [saude, setSaude] = useState<string | null>(null);
  const [chip, setChip] = useState(true);
  const [opcao, setOpcao] = useState(true);
  const [marcado, setMarcado] = useState(true);
  const [mensagemVisivel, setMensagemVisivel] = useState(true);

  /** Cadastro completo com dados fictícios, para ver o plano e o turno sem digitar tudo. */
  async function simularCadastro() {
    const contato = { nome: 'Ana (irmã)', telefone: '(11) 90000-0001' };
    const { usuarioId } = await api.criarUsuario({ nome: 'Léo Motoca', telefone: '(11) 90000-0000', contato });
    const { contatos } = await api.obterUsuario(usuarioId);
    await gravarContatos([{ ...contato, contatoId: contatos[0]?.contatoId ?? 'inicial' }]);
    // A API só guarda ficha e perfil depois dos consentimentos.
    const consentimentos = {
      localizacaoEmUso: true,
      localizacaoEmSegundoPlano: true,
      fichaMedica: true,
      historicoDeLocais: true,
      perfilDeUso: true,
    };
    await api.salvarConsentimentos(usuarioId, consentimentos);
    const ficha = { tipoSanguineo: 'O+', alergias: 'Dipirona (fictício)', condicoes: null, medicamentos: null };
    await api.salvarFichaMedica(usuarioId, ficha);
    await gravarFicha(ficha);
    // Distritos com pontos críticos no modelo de ML (risco_celula.csv).
    const distritos = ['Itaim Bibi', 'Pinheiros', 'Vila Mariana'].map((n) => DISTRITOS.find((d) => d.nome === n)!);
    const perfil = {
      tiposDeUso: ['entregador_app' as const, 'ida_volta' as const],
      periodos: ['almoco' as const, 'jantar' as const],
      dias: ['util' as const, 'sabado' as const],
      distritos,
    };
    await api.salvarPerfil(usuarioId, {
      tiposDeUso: perfil.tiposDeUso,
      horariosHabituais: horariosHabituais(perfil.periodos, perfil.dias),
      distritosFrequentes: distritos.map((d) => d.distritoId),
    });
    await atualizarPreferencias({ perfil, consentimentos });
    await atualizarSessao({
      usuarioId,
      nome: 'Léo Motoca',
      apiDoCadastro: origemApi,
      passos: { basico: 'feito', ficha: 'feito', uso: 'feito', distritos: 'feito', permissoes: 'feito' },
    });
    void carregarPlano();
  }

  async function testarSaude() {
    try {
      const s = await api.saude();
      setSaude(`OK · versão ${s.versao} · banco ${s.banco}`);
    } catch (e) {
      setSaude(`Falhou: ${(e as Error).message}`);
    }
  }

  return (
    <Tela>
      <CabecalhoPasso rotulo="Catálogo (dev)" onVoltar={router.canGoBack() ? () => router.back() : undefined} />

      <View style={styles.caixa}>
        <Texto variante="overline" cor="textoSecundario">
          Ambiente
        </Texto>
        <Texto variante="legenda">
          API: {mock ? 'mock (mesmo contrato)' : `http · ${config.urlApi}`}
        </Texto>
        <Texto variante="legenda">Banco local: esquema v{versaoDoEsquema}</Texto>
        <Texto variante="legenda">
          Sessão: {sessao.usuarioId ? `${sessao.nome} (${sessao.usuarioId})` : 'sem cadastro'}
        </Texto>
        {saude ? <Texto variante="legenda">Saúde: {saude}</Texto> : null}
        <View style={styles.linha}>
          <Botao titulo="GET /saude" tamanho="compacto" variante="neutro" larguraTotal={false} onPress={testarSaude} />
          <Botao
            titulo="Simular cadastro"
            tamanho="compacto"
            variante="neutro"
            larguraTotal={false}
            onPress={simularCadastro}
          />
          <Botao
            titulo="Zerar aparelho"
            tamanho="compacto"
            variante="perigoTexto"
            larguraTotal={false}
            onPress={async () => {
              await apagarDadosSeguros();
              await encerrarSessaoNoAparelho();
              await limparPreferencias();
              limparPlano();
            }}
          />
        </View>
      </View>

      <Texto variante="tituloSecao">Telas</Texto>
      <View style={styles.lista}>
        {TELAS.map(([nome, href]) => (
          <Botao key={nome} titulo={nome} variante="neutro" tamanho="compacto" onPress={() => router.push(href)} />
        ))}
      </View>

      <Texto variante="tituloSecao">Componentes</Texto>
      <View style={[styles.caixa, { alignItems: 'flex-start' }]}>
        <Logo variante="horizontal-branca" altura={40} />
        <View style={styles.claro}>
          <Logo variante="horizontal-preta" altura={40} />
        </View>
      </View>
      <Botao titulo="Iniciar turno" icone="play" tamanho="destaque" />
      <Botao titulo="Ver plano do turno" variante="contorno" tamanho="padrao" />
      <Botao titulo="Estou bem" variante="seguro" tamanho="emergencia" />
      <Botao titulo="Preciso de ajuda agora" variante="perigo" tamanho="padrao" />
      <View style={styles.linha}>
        <Chip rotulo="Almoço" selecionado={chip} onPress={() => setChip((v) => !v)} />
        <Chip rotulo="Jantar" selecionado={!chip} onPress={() => setChip((v) => !v)} />
        <Etiqueta texto="dados de exemplo" />
      </View>
      <View style={styles.linha}>
        <CartaoOpcao
          titulo="Entregador por app"
          descricao="Picos de almoço e jantar"
          selecionado={opcao}
          onPress={() => setOpcao((v) => !v)}
        />
        <CartaoOpcao titulo="Lazer" descricao="Fins de semana" selecionado={!opcao} onPress={() => setOpcao((v) => !v)} />
      </View>
      <ItemMarcavel
        titulo="Localização o tempo todo"
        descricao="Avisar de ponto crítico com outro app aberto."
        marcado={marcado}
        onPress={() => setMarcado((v) => !v)}
        aparencia="cartao"
        caixaA="direita"
      />
      <Campo rotulo="Nome ou apelido" placeholder="Como quer ser chamado" />
      <Campo rotulo="Seu telefone" value="(11) 9000" erro="Telefone fora do padrão brasileiro." />
      {mensagemVisivel ? (
        <CartaoMensagem
          texto="Na chuva, a frenagem fica mais longa. Dobre a distância do carro da frente."
          fonte="[FONTE OFICIAL]"
          onDispensar={() => setMensagemVisivel(false)}
        />
      ) : null}
      <BannerAlerta titulo="Ponto crítico à frente: reduza" linha="Garupa SP · 150 m" />
    </Tela>
  );
}

const styles = StyleSheet.create({
  caixa: { backgroundColor: tons.superficie, borderRadius: raio.xl, padding: 16, gap: 8 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  lista: { gap: 8 },
  claro: { backgroundColor: brand.neblina, borderRadius: raio.md, padding: 8 },
});
