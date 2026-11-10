import { ErroApi, ErroDeRede } from '../../erros';
import { DISTRITOS } from '../dados';
import { criarApiMock } from '../mock-api';

const sosBase = {
  usuarioId: '',
  tipo: 'queda' as const,
  origem: 'celular' as const,
  ocorridoEm: '2026-11-14T21:42:00Z',
  lat: -23.567,
  lon: -46.693,
};

async function novoUsuario(api = criarApiMock({ latenciaMs: 0 })) {
  const { usuarioId } = await api.criarUsuario({ nome: 'Léo', telefone: '(11) 90000-0000' });
  return { api, usuarioId };
}

describe('API mock: mesmo contrato da API C#', () => {
  it('lista os 96 distritos de São Paulo', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    const distritos = await api.listarDistritos();
    expect(distritos).toHaveLength(96);
    expect(new Set(distritos.map((d) => d.nome)).size).toBe(96);
    expect(DISTRITOS[0]).toEqual({ distritoId: 1, nome: 'Água Rasa' });
  });

  it('recusa telefone fora do padrão com 400 e o campo do erro (RF01)', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    await expect(api.criarUsuario({ nome: 'Léo', telefone: '123' })).rejects.toMatchObject({ status: 400 });
    try {
      await api.criarUsuario({ nome: 'Léo', telefone: '123' });
    } catch (e) {
      expect((e as ErroApi).erroDoCampo('telefone')).toBeTruthy();
    }
  });

  it('recusa o sexto distrito (RF04)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const perfil = { tiposDeUso: [], horariosHabituais: [] };
    await expect(
      api.salvarPerfil(usuarioId, { ...perfil, distritosFrequentes: [1, 2, 3, 4, 5, 6] }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(api.salvarPerfil(usuarioId, { ...perfil, distritosFrequentes: [999] })).rejects.toMatchObject({
      status: 400,
    });
    await expect(api.salvarPerfil(usuarioId, { ...perfil, distritosFrequentes: [1, 2, 3, 4, 5] })).resolves.toBeUndefined();
  });

  it('SOS é idempotente pelo eventoId (RB13, F08)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const sos = { ...sosBase, usuarioId, eventoId: '11111111-1111-4111-8111-111111111111' };
    const primeiro = await api.enviarSos(sos);
    const segundo = await api.enviarSos(sos);
    expect(segundo).toEqual(primeiro);
    expect(api.contagens().sos).toBe(1);
  });

  it('cancelar e encerrar repetidos devolvem sucesso; SOS inexistente dá 404 (RF24)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const { sosId } = await api.enviarSos({ ...sosBase, usuarioId, eventoId: 'a' });
    await api.cancelarSos(sosId);
    await api.cancelarSos(sosId);
    await api.encerrarSos(sosId); // já cancelado: continua cancelado
    expect(api.estadoDoSos(sosId)).toBe('cancelado');
    await expect(api.cancelarSos('nao-existe')).rejects.toMatchObject({ status: 404 });
  });

  it('relato fora do município é recusado e o mesmo eventoId não duplica (RF26)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const relato = { eventoId: 'r1', usuarioId, tipo: 'buraco' as const, lat: -23.55, lon: -46.63 };
    const a = await api.enviarRelato(relato);
    const b = await api.enviarRelato(relato);
    expect(b).toEqual(a);
    expect(api.contagens().relatos).toBe(1);
    await expect(api.enviarRelato({ ...relato, eventoId: 'r2', lat: -22.9, lon: -43.2 })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('plano do turno: só percentil ≥ 95, dos distritos do usuário, por score (RF07)', async () => {
    const { api, usuarioId } = await novoUsuario();
    const pinheiros = DISTRITOS.find((d) => d.nome === 'Pinheiros')!.distritoId;
    await api.salvarPerfil(usuarioId, { tiposDeUso: ['entregador_app'], horariosHabituais: [], distritosFrequentes: [pinheiros] });
    const plano = await api.obterPlanoDoTurno({ usuarioId, faixaHoraria: 4, tipoDia: 'sabado', chuva: true });
    expect(plano.pontosCriticos.length).toBeGreaterThan(0);
    for (const p of plano.pontosCriticos) {
      expect(p.percentil).toBeGreaterThanOrEqual(95);
      expect(p.distritoId).toBe(pinheiros);
    }
    const scores = plano.pontosCriticos.map((p) => p.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
    expect(plano.mensagens.length).toBeLessThanOrEqual(2);
  });

  it('personalização muda a mensagem, não o score (RB06)', async () => {
    const api = criarApiMock({ latenciaMs: 0 });
    const a = await novoUsuario(api);
    const b = await novoUsuario(api);
    const distrito = DISTRITOS.find((d) => d.nome === 'Pinheiros')!.distritoId;
    await api.salvarPerfil(a.usuarioId, { tiposDeUso: ['entregador_app'], horariosHabituais: [], distritosFrequentes: [distrito] });
    await api.salvarPerfil(b.usuarioId, { tiposDeUso: ['lazer'], horariosHabituais: [], distritosFrequentes: [distrito] });
    const consulta = { faixaHoraria: 4 as const, tipoDia: 'domingo' as const, chuva: true };
    const pa = await api.obterPlanoDoTurno({ usuarioId: a.usuarioId, ...consulta });
    const pb = await api.obterPlanoDoTurno({ usuarioId: b.usuarioId, ...consulta });
    expect(pa.pontosCriticos).toEqual(pb.pontosCriticos);
    expect(pa.mensagens.map((m) => m.id)).not.toEqual(pb.mensagens.map((m) => m.id));
  });

  it('pulseira: evento só chega se pareada e é entregue uma vez (RF28)', async () => {
    const { api, usuarioId } = await novoUsuario();
    api.simularEventoVestivel(usuarioId, 'impacto');
    expect(await api.listarEventosVestivelPendentes(usuarioId)).toEqual([]);
    await api.parearVestivel(usuarioId, 'pulseira-demo-01');
    api.simularEventoVestivel(usuarioId, 'impacto');
    const eventos = await api.listarEventosVestivelPendentes(usuarioId);
    expect(eventos.map((e) => e.tipo)).toEqual(['impacto']);
    expect(await api.listarEventosVestivelPendentes(usuarioId)).toEqual([]);
  });

  it('sem conexão, falha com ErroDeRede (base da fila offline)', async () => {
    const { api, usuarioId } = await novoUsuario();
    api.definirSemConexao(true);
    await expect(api.enviarSos({ ...sosBase, usuarioId, eventoId: 'x' })).rejects.toBeInstanceOf(ErroDeRede);
  });

  it('excluir a conta apaga o usuário; de novo dá 404 (F16)', async () => {
    const { api, usuarioId } = await novoUsuario();
    await api.excluirUsuario(usuarioId);
    await expect(api.excluirUsuario(usuarioId)).rejects.toMatchObject({ status: 404 });
  });
});
