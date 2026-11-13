import * as SMS from 'expo-sms';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { enviarSmsDireto, podeEnviarSmsDireto, smsDiretoDisponivel } from 'sms-socorro';

import type { TipoSos } from '@/api/types';
import { obterPreferencias } from '@/dados-locais/preferencias';
import { lerContatos } from '@/dados-locais/seguro';
import { gravarValor, lerValor } from '@/db';
import { linkGoogleMaps, textoSmsCancelado, textoSmsSocorro } from '@/domain/sms';
import { validarTelefone } from '@/domain/telefone';
import { criarStore } from '@/lib/store';
import { obterSessao } from '@/state/sessao';

/**
 * Aviso aos contatos de emergência por SMS quando o SOS dispara, com a localização num link
 * do Google Maps. SMS não depende de internet: sai mesmo sem dados móveis.
 *
 * - Android com a permissão de SMS: o app manda sozinho (módulo nativo sms-socorro). É o caso
 *   que importa numa queda, quando a pessoa pode não conseguir tocar em nada.
 * - Sem a permissão, no iOS ou no Expo Go: o app abre o SMS pronto e a pessoa toca em enviar
 *   (o Expo sozinho não manda SMS automático). Com o app em segundo plano, fica um botão na tela do SOS.
 */

export type SituacaoSms = 'enviado' | 'aberto' | 'pendente' | 'sem_contato';
export type EstadoSms = { situacao: SituacaoSms; em: number; nomes: string[] };

type DadosSos = { tipo: TipoSos; ocorridoEm: string; lat: number | null; lon: number | null };

const chave = (eventoId: string) => `sms_sos_${eventoId}`;
const store = criarStore<Record<string, EstadoSms>>({});
export const useEstadosSms = store.useStore;

async function guardar(eventoId: string, estado: EstadoSms): Promise<EstadoSms> {
  store.definir({ ...store.obter(), [eventoId]: estado });
  await gravarValor(chave(eventoId), estado);
  return estado;
}

/** Estado do aviso por SMS de um SOS (o que está na memória ou guardado no aparelho). */
export async function carregarEstadoSms(eventoId: string): Promise<EstadoSms | null> {
  const memoria = store.obter()[eventoId];
  if (memoria) return memoria;
  const salvo = await lerValor<EstadoSms>(chave(eventoId));
  if (salvo) store.definir({ ...store.obter(), [eventoId]: salvo });
  return salvo;
}

async function destinatarios(): Promise<{ numeros: string[]; nomes: string[] }> {
  const contatos = await lerContatos();
  const validos = contatos
    .map((c) => ({ nome: c.nome, tel: validarTelefone(c.telefone) }))
    .filter((c): c is { nome: string; tel: { valido: true; e164: string; exibicao: string } } => c.tel.valido);
  return { numeros: validos.map((c) => c.tel.e164), nomes: validos.map((c) => c.nome) };
}

function mensagemDoSos(d: DadosSos): string {
  const hora = new Date(d.ocorridoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return textoSmsSocorro({
    nome: obterSessao().nome?.split(' ')[0] ?? null,
    tipo: d.tipo,
    hora,
    mapa: d.lat !== null && d.lon !== null ? linkGoogleMaps(d.lat, d.lon) : null,
  });
}

/** Abre o app de mensagens com os contatos e o texto prontos (a pessoa toca em enviar). */
export async function abrirSmsDoSos(eventoId: string, d: DadosSos): Promise<EstadoSms> {
  const { numeros, nomes } = await destinatarios();
  if (numeros.length === 0) return guardar(eventoId, { situacao: 'sem_contato', em: Date.now(), nomes });
  if (!(await SMS.isAvailableAsync().catch(() => false))) {
    return guardar(eventoId, { situacao: 'pendente', em: Date.now(), nomes });
  }
  const { result } = await SMS.sendSMSAsync(numeros, mensagemDoSos(d));
  // O Android não conta se a pessoa enviou ("unknown"): fica registrado que o SMS foi aberto.
  return guardar(eventoId, { situacao: result === 'sent' ? 'enviado' : 'aberto', em: Date.now(), nomes });
}

/** Chamado quando o SOS dispara: manda sozinho se puder; senão, abre o SMS (com o app na frente). */
export async function avisarContatosPorSms(eventoId: string, d: DadosSos): Promise<EstadoSms> {
  const { numeros, nomes } = await destinatarios();
  if (numeros.length === 0) return guardar(eventoId, { situacao: 'sem_contato', em: Date.now(), nomes });

  if (obterPreferencias().smsAutomatico && podeEnviarSmsDireto()) {
    const texto = mensagemDoSos(d);
    const enviados = numeros.filter((n) => enviarSmsDireto(n, texto));
    if (enviados.length > 0) return guardar(eventoId, { situacao: 'enviado', em: Date.now(), nomes });
  }
  if (AppState.currentState === 'active') return abrirSmsDoSos(eventoId, d);
  return guardar(eventoId, { situacao: 'pendente', em: Date.now(), nomes });
}

/** "Estou bem" depois do SMS automático: avisa os mesmos contatos, para ninguém sair correndo à toa. */
export async function avisarCancelamentoPorSms(eventoId: string, encerrado: boolean): Promise<void> {
  const estado = await carregarEstadoSms(eventoId);
  if (estado?.situacao !== 'enviado' || !podeEnviarSmsDireto()) return;
  const { numeros } = await destinatarios();
  const texto = textoSmsCancelado(obterSessao().nome?.split(' ')[0] ?? null, encerrado);
  for (const n of numeros) enviarSmsDireto(n, texto);
}

/** O aparelho pode mandar o SMS de socorro sozinho? (Android, com o módulo e a permissão.) */
export const smsAutomaticoSuportado = Platform.OS === 'android' && smsDiretoDisponivel;

export async function temPermissaoSms(): Promise<boolean> {
  if (!smsAutomaticoSuportado) return false;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS).catch(() => false);
}

/** Pede a permissão de SMS com a explicação do motivo. */
export async function pedirPermissaoSms(): Promise<boolean> {
  if (!smsAutomaticoSuportado) return false;
  try {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
      title: 'SMS de socorro',
      message:
        'Numa queda sem resposta, o Garupa SP manda um SMS aos seus contatos de emergência com a sua localização, mesmo sem internet.',
      buttonPositive: 'Permitir',
      buttonNegative: 'Agora não',
    });
    return r === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
