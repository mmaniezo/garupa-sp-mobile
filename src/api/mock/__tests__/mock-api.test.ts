import { ErroApi, ErroDeRede } from '../../erros';
import type { Consentimentos } from '../../types';
import { DISTRITOS } from '../dados';
import { criarApiMock } from '../mock-api';

const contato = { nome: 'Ana (irmã)', telefone: '(11) 90000-0001' };
const todosConsentimentos: Consentimentos = {
  localizacaoEmUso: true,
  localizacaoEmSegundoPlano: true,
  fichaMedica: true,
  historicoDeLocais: true,
  perfilDeUso: true,
};
const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const distrito = (nome: string) => DISTRITOS.find((d) => d.nome === nome)!.distritoId;

const sosBase = {
  usuarioId: '',
  tipo: 'queda' as const,
  origem: 'celular' as const,
  ocorridoEm: '2026-11-10T21:42:00Z',
  lat: -23.567,
  lon: -46.693,
};

/** No jest o expo-crypto é simulado (o hash sairia sempre igual): os testes de login usam este. */
async function hashDeTeste(texto: string): Promise<string> {
  let h = 2166136261;
  for (const ch of texto) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0;
  return h.toString(16);
}

// Um telefone por conta: cada usuário de teste ganha um número.
let proximoTelefone = 1000;

async function novoUsuario(api = criarApiMock({ latenciaMs: 0 }), consentir = true) {
  const telefone = `(11) 9${proximoTelefone++}-0000`;
  const { usuarioId } = await api.criarUsuario({ nome: 'Léo', telefone, senha: 'garupa123', contato });
  if (consentir) await api.salvarConsentimentos(usuarioId, todosConsentimentos);
  return { api, usuarioId };
}

describe('API mock: mesmo contrato e mesmas regras da API C#', () => {
  it('lista os 96 distritos com o id do IBGE', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    const distritos = await api.listarDistritos();
    expect(distritos).toHaveLength(96);
    expect(new Set(distritos.map((d) => d.nome)).size).toBe(96);
    expect(distritos[0]).toEqual({ distritoId: 355030801, nome: 'Água Rasa' });
  });

  it('cria o usuário junto com o primeiro contato; sem contato é 400 (RF01)', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    await expect(api.criarUsuario({ nome: 'Léo', telefone: '(11) 90000-0000' } as never)).rejects.toMatchObject({
      status: 400,
    });
    const { usuarioId } = await api.criarUsuario({ nome: 'Léo', telefone: '(11) 90000-0000', senha: 'garupa123', contato });
    const u = await api.obterUsuario(usuarioId);
    expect(u.contatos).toHaveLength(1);
    expect(u.contatos[0]).toMatchObject({ nome: 'Ana (irmã)' });
  });

  it('login: telefone e senha conferem; errado é 401 sem dizer qual dos dois', async () => {
    const api = criarApiMock({ latenciaMs: 0, hash: hashDeTeste });
    const criado = await api.criarUsuario({ nome: 'Léo', telefone: '(11) 90000-0000', senha: 'garupa123', contato });
    expect(criado.token).toBeTruthy();

    const login = await api.entrar({ telefone: '+5511900000000', senha: 'garupa123' });
    expect(login).toMatchObject({ usuarioId: criado.usuarioId, nome: 'Léo' });
    expect(login.token).toBeTruthy();

    await expect(api.entrar({ telefone: '(11) 90000-0000', senha: 'garupa124' })).rejects.toMatchObject({
      status: 401,
      problema: { title: 'Telefone ou senha incorretos.' },
    });
    await expect(api.entrar({ telefone: '(11) 98888-7777', senha: 'garupa123' })).rejects.toMatchObject({ status: 401 });
  });

  it('um telefone, uma conta (409); senha fraca é 400 no campo senha', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    await api.criarUsuario({ nome: 'Léo', telefone: '(11) 90000-0000', senha: 'garupa123', contato });
    await expect(
      api.criarUsuario({ nome: 'Outro', telefone: '+55 11 90000-0000', senha: 'outra1234', contato }),
    ).rejects.toMatchObject({ status: 409 });
    try {
      await api.criarUsuario({ nome: 'Bia', telefone: '(11) 97777-6666', senha: 'curta1', contato });
      throw new Error('deveria recusar');
    } catch (e) {
      expect((e as ErroApi).status).toBe(400);
      expect((e as ErroApi).erroDoCampo('senha')).toMatch(/8 caracteres/);
    }
  });

  it('a conta sobrevive ao app reabrir (sem a senha em texto) e some ao excluir', async () => {
    let guardadas: unknown[] = [];
    const armazem = {
      ler: async () => guardadas as never,
      gravar: async (c: unknown[]) => {
        guardadas = JSON.parse(JSON.stringify(c));
      },
    };
    const antes = criarApiMock({ latenciaMs: 0, contas: armazem, hash: hashDeTeste });
    const { usuarioId } = await antes.criarUsuario({ nome: 'Léo', telefone: '(11) 90000-0000', senha: 'garupa123', contato });
    await antes.adicionarContato(usuarioId, { nome: 'Bia', telefone: '(11) 90000-0002' });
    expect(JSON.stringify(guardadas)).not.toContain('garupa123');

    // "Reabrir o app": outro mock, mesmo armazém.
    const depois = criarApiMock({ latenciaMs: 0, contas: armazem, hash: hashDeTeste });
    const login = await depois.entrar({ telefone: '(11) 90000-0000', senha: 'garupa123' });
    expect(login.usuarioId).toBe(usuarioId);
    const u = await depois.obterUsuario(usuarioId);
    expect(u.contatos.map((c) => c.nome)).toEqual(['Ana (irmã)', 'Bia']);

    await depois.excluirUsuario(usuarioId);
    expect(guardadas).toHaveLength(0);
    await expect(depois.entrar({ telefone: '(11) 90000-0000', senha: 'garupa123' })).rejects.toMatchObject({ status: 401 });
  });

  it('recusa telefone fora do padrão com 400 e o campo do erro (RF01)', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    const errado = { nome: 'Léo', telefone: '123', senha: 'garupa123', contato };
    await expect(api.criarUsuario(errado)).rejects.toMatchObject({ status: 400 });
    try {
      await api.criarUsuario(errado);
    } catch (e) {
      expect((e as ErroApi).erroDoCampo('telefone')).toBeTruthy();
    }
  });

  it('ficha e perfil só com o consentimento de cada um (409 sem ele)', async () => {
    const { api, usuarioId } = await novoUsuario(undefined, false);
    const perfil = { tiposDeUso: ['lazer' as const], horariosHabituais: [], distritosFrequentes: [] };
    await expect(api.salvarFichaMedica(usuarioId, { tipoSanguineo: 'O+' })).rejects.toMatchObject({ status: 409 });
    await expect(api.salvarPerfil(usuarioId, perfil)).rejects.toMatchObject({ status: 409 });
    await api.salvarConsentimentos(usuarioId, todosConsentimentos);
    await expect(api.salvarFichaMedica(usuarioId, { tipoSanguineo: 'O+' })).resolves.toBeUndefined();
    await expect(api.salvarPerfil(usuarioId, perfil)).resolves.toBeUndefined();
  });

  it('segundo plano sem localização em uso é 400', async () => {
    const { api, usuarioId } = await novoUsuario(undefined, false);
    await expect(
      api.salvarConsentimentos(usuarioId, { ...todosConsentimentos, localizacaoEmUso: false }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('recusa o sexto distrito e distrito inexistente (RF04)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const perfil = { tiposDeUso: ['entregador_app' as const], horariosHabituais: [] };
    const seis = DISTRITOS.slice(0, 6).map((d) => d.distritoId);
    await expect(api.salvarPerfil(usuarioId, { ...perfil, distritosFrequentes: seis })).rejects.toMatchObject({ status: 400 });
    await expect(api.salvarPerfil(usuarioId, { ...perfil, distritosFrequentes: [999] })).rejects.toMatchObject({
      status: 400,
    });
    await expect(api.salvarPerfil(usuarioId, { ...perfil, distritosFrequentes: seis.slice(0, 5) })).resolves.toBeUndefined();
  });

  it('SOS é idempotente pelo eventoId; o mesmo evento com outros dados é 409 (RB13)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const sos = { ...sosBase, usuarioId, eventoId: guid(1) };
    const primeiro = await api.enviarSos(sos);
    const segundo = await api.enviarSos(sos);
    expect(segundo).toEqual(primeiro);
    expect(api.contagens().sos).toBe(1);
    await expect(api.enviarSos({ ...sos, tipo: 'mal_estar' })).rejects.toMatchObject({ status: 409 });
    await expect(api.enviarSos({ ...sos, eventoId: 'nao-e-guid' })).rejects.toMatchObject({ status: 400 });
  });

  it('cancelar repetido é sucesso; encerrar o cancelado é 409; inexistente é 404 (RF24)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const { sosId } = await api.enviarSos({ ...sosBase, usuarioId, eventoId: guid(2) });
    await api.cancelarSos(sosId);
    await api.cancelarSos(sosId);
    await expect(api.encerrarSos(sosId)).rejects.toMatchObject({ status: 409 });
    expect(api.estadoDoSos(sosId)).toBe('cancelado');
    await expect(api.cancelarSos('nao-existe')).rejects.toMatchObject({ status: 404 });
  });

  it('relato fora do município é recusado e o mesmo eventoId não duplica (RF26)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const relato = { eventoId: guid(3), usuarioId, tipo: 'buraco' as const, lat: -23.55, lon: -46.63 };
    const a = await api.enviarRelato(relato);
    const b = await api.enviarRelato(relato);
    expect(b).toEqual(a);
    expect(api.contagens().relatos).toBe(1);
    await expect(api.enviarRelato({ ...relato, eventoId: guid(4), lat: -22.9, lon: -43.2 })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('plano do turno usa o risco do modelo de ML: só percentil ≥ 95, dos distritos, por score (RF07)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const itaim = distrito('Itaim Bibi');
    await api.salvarPerfil(usuarioId, { tiposDeUso: ['entregador_app'], horariosHabituais: [], distritosFrequentes: [itaim] });
    const plano = await api.obterPlanoDoTurno({ usuarioId, faixaHoraria: 5, tipoDia: 'util', chuva: false });
    expect(plano.pontosCriticos.length).toBeGreaterThan(0);
    for (const p of plano.pontosCriticos) {
      expect(p.percentil).toBeGreaterThanOrEqual(95);
      expect(p.distritoId).toBe(itaim);
      expect(p.versaoModelo).toBe('v2-xgb-poisson-2024');
    }
    const scores = plano.pontosCriticos.map((p) => p.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
    // No risco_celula.csv (Infosiga), a célula de maior score no Itaim às 20h-24h de dia útil
    // seco é a da SP 015 (Marginal Pinheiros), com o nome escrito para leitura.
    expect(plano.pontosCriticos[0]).toMatchObject({
      celulaId: '88a8100529fffff',
      viaReferencia: 'SP 015 - Pinheiros',
      score: 0.321978,
      percentil: 99,
    });
    expect(plano.mensagens.length).toBeLessThanOrEqual(2);
  });

  it('fim de semana e chuva também têm pontos críticos (percentil dentro de cada contexto)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const itaim = distrito('Itaim Bibi');
    await api.salvarPerfil(usuarioId, { tiposDeUso: ['entregador_app'], horariosHabituais: [], distritosFrequentes: [itaim] });
    for (const contexto of [
      { faixaHoraria: 4 as const, tipoDia: 'sabado' as const, chuva: false },
      { faixaHoraria: 2 as const, tipoDia: 'domingo' as const, chuva: true },
    ]) {
      const plano = await api.obterPlanoDoTurno({ usuarioId, ...contexto });
      expect(plano.pontosCriticos.length).toBeGreaterThan(0);
    }
  });

  it('detalhe da célula traz os 36 contextos do modelo (RF09)', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    const detalhe = await api.obterCelula('88a8100529fffff');
    expect(detalhe.riscoPorFaixa).toHaveLength(36);
    expect(detalhe.distritoNome).toBe('Itaim Bibi');
    await expect(api.obterCelula('nao-existe')).rejects.toMatchObject({ status: 404 });
  });

  it('personalização muda a mensagem, não o score (RB06)', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    const a = await novoUsuario(api);
    const b = await novoUsuario(api);
    const itaim = distrito('Itaim Bibi');
    await api.salvarPerfil(a.usuarioId, { tiposDeUso: ['entregador_app'], horariosHabituais: [], distritosFrequentes: [itaim] });
    await api.salvarPerfil(b.usuarioId, { tiposDeUso: ['lazer'], horariosHabituais: [], distritosFrequentes: [itaim] });
    const seco = { faixaHoraria: 5 as const, tipoDia: 'util' as const, chuva: false };
    const pa = await api.obterPlanoDoTurno({ usuarioId: a.usuarioId, ...seco });
    const pb = await api.obterPlanoDoTurno({ usuarioId: b.usuarioId, ...seco });
    expect(pa.pontosCriticos.length).toBeGreaterThan(0);
    expect(pa.pontosCriticos).toEqual(pb.pontosCriticos);
    const chuva = { ...seco, chuva: true };
    const ma = await api.obterPlanoDoTurno({ usuarioId: a.usuarioId, ...chuva });
    const mb = await api.obterPlanoDoTurno({ usuarioId: b.usuarioId, ...chuva });
    expect(ma.mensagens.map((m) => m.id)).not.toEqual(mb.mensagens.map((m) => m.id));
  });

  it('pulseira: evento só chega se pareada e é entregue uma vez (RF28)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const evento = { dispositivoId: 'pulseira-demo-01', tipo: 'impacto' as const, ocorridoEm: new Date().toISOString() };
    await expect(api.enviarEventoVestivel(evento)).rejects.toMatchObject({ status: 404 });
    await api.parearVestivel(usuarioId, 'pulseira-demo-01');
    await api.enviarEventoVestivel(evento);
    const eventos = await api.listarEventosVestivelPendentes(usuarioId);
    expect(eventos.map((e) => e.tipo)).toEqual(['impacto']);
    expect(await api.listarEventosVestivelPendentes(usuarioId)).toEqual([]);
  });

  it('sem conexão, falha com ErroDeRede (base da fila offline)', async () => {
    const { api, usuarioId } = await novoUsuario();
    api.definirSemConexao(true);
    await expect(api.enviarSos({ ...sosBase, usuarioId, eventoId: guid(5) })).rejects.toBeInstanceOf(ErroDeRede);
  });

  it('excluir a conta apaga o usuário; de novo dá 404 (F16)', async () => {
    const { api, usuarioId } = await novoUsuario();
    await api.excluirUsuario(usuarioId);
    await expect(api.excluirUsuario(usuarioId)).rejects.toMatchObject({ status: 404 });
  });
});
