/**
 * @jest-environment node
 */
import { ErroApi } from '../erros';
import { criarApiHttp } from '../http';
import { definirToken } from '../token';

/**
 * Cliente HTTP contra respostas no formato do Swagger da API C# (garupa-sp-api):
 * ids numéricos, distrito só pelo id, detalhe da célula como lista de contextos.
 */
type Chamada = { metodo: string; url: string; corpo?: unknown };

function apiFalsa(respostas: Record<string, unknown>) {
  const chamadas: Chamada[] = [];
  globalThis.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const metodo = init?.method ?? 'GET';
    chamadas.push({ metodo, url: u, corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
    const caminho = u.replace('http://api.teste/api/v1', '').split('?')[0];
    const chave = `${metodo} ${caminho}`;
    if (!(chave in respostas)) return new Response(JSON.stringify({ title: 'Não encontrado.', status: 404 }), { status: 404 });
    const corpo = respostas[chave];
    if (corpo === 204) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(corpo), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { api: criarApiHttp('http://api.teste', 5_000), chamadas };
}

const DISTRITOS = [
  { distritoId: 355030835, nome: 'Itaim Bibi' },
  { distritoId: 355030862, nome: 'Pinheiros' },
];
const ponto = {
  celulaId: '88a8100ec5fffff',
  centroLat: -23.58748,
  centroLon: -46.684975,
  score: 0.9561,
  percentil: 100,
  viaReferencia: 'Marginal Pinheiros / Av. Santo Amaro',
  distritoId: 355030835,
  versaoModelo: 'v1-xgb-2025',
  motivo: 'Histórico de sinistros neste horário. Mantenha distância e atenção.',
};

describe('cliente HTTP da API C#', () => {
  it('login: POST /auth/login e, com o token, Authorization em toda chamada', async () => {
    const { api, chamadas } = apiFalsa({ 'POST /auth/login': { usuarioId: 7, nome: 'Léo', token: 'jwt.abc' } });
    const cabecalhos: Record<string, string>[] = [];
    const fetchBase = globalThis.fetch;
    globalThis.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
      cabecalhos.push({ ...(init?.headers as Record<string, string>) });
      return fetchBase(url, init);
    }) as typeof fetch;

    const login = await api.entrar({ telefone: '+5511900000000', senha: 'garupa123' });
    expect(login).toEqual({ usuarioId: '7', nome: 'Léo', token: 'jwt.abc' });
    expect(chamadas[0]).toMatchObject({ metodo: 'POST', corpo: { telefone: '+5511900000000', senha: 'garupa123' } });
    expect(cabecalhos[0].Authorization).toBeUndefined();

    definirToken(login.token);
    await api.obterUsuario('7').catch(() => undefined);
    expect(cabecalhos[1].Authorization).toBe('Bearer jwt.abc');
    definirToken(null);
  });

  it('editar e excluir contato: PUT e DELETE com os ids numéricos da API', async () => {
    const { api, chamadas } = apiFalsa({
      'PUT /usuarios/7/contatos/3': 204,
      'DELETE /usuarios/7/contatos/3': 204,
    });
    await api.atualizarContato('7', '3', { nome: 'Bia', telefone: '+5511977776666' });
    await api.removerContato('7', '3');
    expect(chamadas.map((c) => `${c.metodo} ${c.url.replace('http://api.teste/api/v1', '')}`)).toEqual([
      'PUT /usuarios/7/contatos/3',
      'DELETE /usuarios/7/contatos/3',
    ]);
    expect(chamadas[0].corpo).toEqual({ nome: 'Bia', telefone: '+5511977776666' });
  });

  it('login errado: 401 vira ErroApi com a mensagem da API', async () => {
    globalThis.fetch = jest.fn(
      async () => new Response(JSON.stringify({ title: 'Telefone ou senha incorretos.', status: 401 }), { status: 401 }),
    ) as typeof fetch;
    const api = criarApiHttp('http://api.teste', 5_000);
    await expect(api.entrar({ telefone: '+5511900000000', senha: 'x' })).rejects.toMatchObject({
      status: 401,
      problema: { title: 'Telefone ou senha incorretos.' },
    });
  });

  it('converte os ids numéricos da API em texto e manda número no corpo', async () => {
    const { api, chamadas } = apiFalsa({
      'POST /usuarios': { usuarioId: 7 },
      'POST /sos': { sosId: 12, tokenAcompanhamento: 'tok' },
      'POST /relatos': { relatoId: 3 },
      'GET /eventos-vestivel/pendentes': [{ eventoId: 5, tipo: 'impacto', ocorridoEm: '2026-11-10T10:00:00Z' }],
    });
    const { usuarioId } = await api.criarUsuario({
      nome: 'Léo',
      telefone: '+5511900000000',
      senha: 'garupa123',
      contato: { nome: 'Ana', telefone: '+5511900000001' },
    });
    expect(usuarioId).toBe('7');
    expect(chamadas[0].corpo).toMatchObject({ contato: { nome: 'Ana' } });

    const sos = await api.enviarSos({
      eventoId: '6f1c2b9e-1111-4111-8111-111111111111',
      usuarioId,
      tipo: 'queda',
      origem: 'celular',
      ocorridoEm: '2026-11-10T10:00:00Z',
      lat: -23.5,
      lon: -46.6,
    });
    expect(sos).toEqual({ sosId: '12', tokenAcompanhamento: 'tok' });
    expect(chamadas[1].corpo).toMatchObject({ usuarioId: 7 });

    const relato = await api.enviarRelato({
      eventoId: '6f1c2b9e-2222-4222-8222-222222222222',
      usuarioId,
      tipo: 'buraco',
      lat: -23.5,
      lon: -46.6,
    });
    expect(relato).toEqual({ relatoId: '3' });
    expect(chamadas[2].corpo).toMatchObject({ usuarioId: 7 });

    const eventos = await api.listarEventosVestivelPendentes(usuarioId);
    expect(eventos[0].eventoId).toBe('5');
    expect(chamadas[3].url).toContain('usuarioId=7');
  });

  it('id que não é número (do mock) dá 404 sem chamar a API', async () => {
    const { api, chamadas } = apiFalsa({});
    await expect(api.obterUsuario('usr-1-abc')).rejects.toBeInstanceOf(ErroApi);
    await expect(api.cancelarSos('sos-1')).rejects.toMatchObject({ status: 404 });
    expect(chamadas).toHaveLength(0);
  });

  it('manda a ficha com texto vazio no lugar de null e o sinal ASCII no tipo sanguíneo', async () => {
    const { api, chamadas } = apiFalsa({ 'PUT /usuarios/7/ficha-medica': 204 });
    await api.salvarFichaMedica('7', { tipoSanguineo: 'AB−', alergias: null, condicoes: 'Asma (fictício)', medicamentos: null });
    expect(chamadas[0].corpo).toEqual({ tipoSanguineo: 'AB-', alergias: '', condicoes: 'Asma (fictício)', medicamentos: '' });
  });

  it('completa o nome do distrito pela lista de GET /distritos (buscada uma vez)', async () => {
    const { api, chamadas } = apiFalsa({
      'GET /distritos': DISTRITOS,
      'GET /risco': [ponto],
      'GET /plano-do-turno': { pontosCriticos: [ponto], mensagens: [{ id: 5, texto: 'Atenção', fonte: 'https://www.gov.br/dnit' }], faixaHoraria: 5, origemFaixa: 'consulta' },
    });
    const risco = await api.obterRisco({ lat: -23.58, lon: -46.68, raioMetros: 3000, faixaHoraria: 5, tipoDia: 'util', chuva: false });
    expect(risco[0]).toMatchObject({ distritoNome: 'Itaim Bibi', motivo: ponto.motivo });
    const plano = await api.obterPlanoDoTurno({ usuarioId: '7', faixaHoraria: 5, tipoDia: 'util', chuva: false });
    expect(plano.pontosCriticos[0].distritoNome).toBe('Itaim Bibi');
    expect(plano.mensagens[0]).toEqual({ id: '5', texto: 'Atenção', fonte: 'https://www.gov.br/dnit' });
    expect(plano.origemFaixa).toBe('consulta');
    expect(chamadas.filter((c) => c.url.endsWith('/distritos'))).toHaveLength(1);
  });

  it('junta as linhas de /risco/celulas/{id} no detalhe com o risco por faixa', async () => {
    const linha = (faixaHoraria: number, chuva: boolean, score: number) => ({
      ...ponto,
      id: faixaHoraria * 2 + Number(chuva),
      faixaHoraria,
      tipoDia: 'util',
      chuva,
      score,
      percentil: Math.round(score * 100),
    });
    const { api } = apiFalsa({
      'GET /distritos': DISTRITOS,
      'GET /risco/celulas/88a8100ec5fffff': [linha(0, false, 0.95), linha(0, true, 0.62), linha(5, false, 0.96)],
    });
    const detalhe = await api.obterCelula('88a8100ec5fffff');
    expect(detalhe).toMatchObject({ celulaId: '88a8100ec5fffff', distritoNome: 'Itaim Bibi', versaoModelo: 'v1-xgb-2025' });
    expect(detalhe.riscoPorFaixa).toEqual([
      { faixaHoraria: 0, tipoDia: 'util', chuva: false, score: 0.95, percentil: 95 },
      { faixaHoraria: 0, tipoDia: 'util', chuva: true, score: 0.62, percentil: 62 },
      { faixaHoraria: 5, tipoDia: 'util', chuva: false, score: 0.96, percentil: 96 },
    ]);
  });
});
