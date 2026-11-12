/**
 * @jest-environment node
 */
import { criarApiHttp } from '../http';
import { criarApiMock } from '../mock/mock-api';
import type { Consentimentos } from '../types';

type RespostaNode = {
  statusCode?: number;
  on(evento: 'data', f: (c: Uint8Array) => void): void;
  on(evento: 'end', f: () => void): void;
};
type PedidoNode = { on(evento: 'error', f: (e: Error) => void): void; write(corpo: string): void; end(): void };
// O jest-expo troca o fetch global pelo do Expo (nativo, sem rede nos testes): aqui vai um fetch mínimo do Node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require('node:http') as {
  request(url: string, opcoes: { method: string; headers: Record<string, string> }, cb: (r: RespostaNode) => void): PedidoNode;
};
const fetchDoNode = (url: string | URL | Request, init?: RequestInit) =>
  new Promise<Response>((resolve, reject) => {
    const pedido = http.request(
      String(url),
      { method: init?.method ?? 'GET', headers: (init?.headers ?? {}) as Record<string, string> },
      (r) => {
        const partes: Uint8Array[] = [];
        r.on('data', (c) => partes.push(c));
        r.on('end', () => {
          const texto = new TextDecoder().decode(Uint8Array.from(partes.flatMap((p) => [...p])));
          resolve(new Response(r.statusCode === 204 ? null : texto, { status: r.statusCode ?? 0 }));
        });
      },
    );
    pedido.on('error', reject);
    if (typeof init?.body === 'string') pedido.write(init.body);
    pedido.end();
  });

const randomUUID = () => globalThis.crypto.randomUUID();

/**
 * Teste de integração com a API C# de verdade (garupa-sp-api), com o risco_celula.csv carregado.
 * Só roda com o endereço da API:
 *
 *   GARUPA_API_URL=http://127.0.0.1:5221 npx jest src/api/__tests__/api-real.test.ts
 *
 * Usa só dados fictícios e exclui o usuário no fim.
 */
const URL_API = process.env.GARUPA_API_URL;
const descrever = URL_API ? describe : describe.skip;

const todos: Consentimentos = {
  localizacaoEmUso: true,
  localizacaoEmSegundoPlano: true,
  fichaMedica: true,
  historicoDeLocais: false,
  perfilDeUso: true,
};

descrever('API real: o app fala com todos os endpoints que usa', () => {
  const api = criarApiHttp((URL_API ?? '').replace(/\/+$/, ''), 15_000);
  let usuarioId = '';
  const itaim = 355030835;

  beforeAll(() => {
    globalThis.fetch = fetchDoNode as typeof fetch;
  });

  afterAll(async () => {
    if (usuarioId) await api.excluirUsuario(usuarioId).catch(() => undefined);
  });

  it('saúde', async () => {
    expect(await api.saude()).toMatchObject({ banco: 'conectado' });
  });

  it('cadastro em camadas: usuário com contato, consentimentos, ficha e perfil', async () => {
    const criado = await api.criarUsuario({
      nome: 'Pessoa fictícia',
      telefone: '+5511900000000',
      contato: { nome: 'Contato fictício', telefone: '(11) 90000-0001' },
    });
    usuarioId = criado.usuarioId;
    expect(usuarioId).toMatch(/^\d+$/);

    const u = await api.obterUsuario(usuarioId);
    expect(u.contatos).toHaveLength(1);
    expect(u.contatos[0].contatoId).toMatch(/^\d+$/);
    const { contatoId } = await api.adicionarContato(usuarioId, { nome: 'Outro contato', telefone: '(11) 3456-7890' });
    expect(contatoId).toMatch(/^\d+$/);

    await expect(api.salvarFichaMedica(usuarioId, { tipoSanguineo: 'O+' })).rejects.toMatchObject({ status: 409 });
    await api.salvarConsentimentos(usuarioId, todos);
    await api.salvarFichaMedica(usuarioId, { tipoSanguineo: 'AB−', alergias: null, condicoes: null, medicamentos: null });
    await api.salvarPerfil(usuarioId, {
      tiposDeUso: ['entregador_app'],
      horariosHabituais: [{ faixaHoraria: 5, tipoDia: 'util' }],
      distritosFrequentes: [itaim],
    });
    const distritos = await api.listarDistritos();
    expect(distritos).toHaveLength(96);
  });

  it('plano e risco vêm do modelo de ML e batem com o mock', async () => {
    const consulta = { faixaHoraria: 5 as const, tipoDia: 'util' as const, chuva: false };
    const plano = await api.obterPlanoDoTurno({ usuarioId, ...consulta });
    expect(plano.pontosCriticos.length).toBeGreaterThan(0);
    expect(plano.pontosCriticos[0]).toMatchObject({ distritoId: itaim, distritoNome: 'Itaim Bibi', versaoModelo: 'v1-xgb-2025' });
    expect(plano.mensagens.length).toBeGreaterThan(0);

    // O mock (mesmos dados do ML) devolve os mesmos pontos, na mesma ordem.
    const mock = criarApiMock({ latenciaMs: 0 });
    const m = await mock.criarUsuario({ nome: 'Léo', telefone: '(11) 90000-0000', contato: { nome: 'Ana', telefone: '(11) 90000-0001' } });
    await mock.salvarConsentimentos(m.usuarioId, todos);
    await mock.salvarPerfil(m.usuarioId, { tiposDeUso: ['entregador_app'], horariosHabituais: [], distritosFrequentes: [itaim] });
    const planoMock = await mock.obterPlanoDoTurno({ usuarioId: m.usuarioId, ...consulta });
    const resumo = (l: typeof plano.pontosCriticos) => l.map((p) => [p.celulaId, p.score, p.percentil]);
    expect(resumo(planoMock.pontosCriticos)).toEqual(resumo(plano.pontosCriticos));
    expect(planoMock.mensagens).toEqual(plano.mensagens);

    const perto = await api.obterRisco({ lat: -23.58748, lon: -46.684975, raioMetros: 3000, ...consulta });
    expect(perto.map((p) => p.celulaId)).toContain('88a8100ec5fffff');
    const pertoMock = await mock.obterRisco({ lat: -23.58748, lon: -46.684975, raioMetros: 3000, ...consulta });
    expect(resumo(pertoMock)).toEqual(resumo(perto));

    const detalhe = await api.obterCelula('88a8100ec5fffff');
    expect(detalhe.riscoPorFaixa).toHaveLength(36);
    expect(detalhe.distritoNome).toBe('Itaim Bibi');
    const detalheMock = await mock.obterCelula('88a8100ec5fffff');
    const chave = (r: (typeof detalhe.riscoPorFaixa)[number]) => `${r.faixaHoraria}${r.tipoDia}${r.chuva}`;
    const porChave = new Map(detalheMock.riscoPorFaixa.map((r) => [chave(r), r]));
    for (const r of detalhe.riscoPorFaixa) expect(porChave.get(chave(r))).toEqual(r);

    const mensagens = await api.listarMensagens({ contexto: 'ponto_critico', tipoDeUso: 'entregador_app' });
    expect(mensagens).toEqual(await mock.listarMensagens({ contexto: 'ponto_critico', tipoDeUso: 'entregador_app' }));
  });

  it('SOS idempotente, cancelar repetido e encerrar o cancelado (409)', async () => {
    const sos = {
      eventoId: randomUUID(),
      usuarioId,
      tipo: 'queda' as const,
      origem: 'celular' as const,
      ocorridoEm: new Date(Date.now() - 5_000).toISOString(),
      lat: -23.5875,
      lon: -46.685,
    };
    const a = await api.enviarSos(sos);
    const b = await api.enviarSos(sos);
    expect(b).toEqual(a);
    expect(a.sosId).toMatch(/^\d+$/);
    await api.cancelarSos(a.sosId);
    await api.cancelarSos(a.sosId);
    await expect(api.encerrarSos(a.sosId)).rejects.toMatchObject({ status: 409 });
    const resposta = await fetch(api.urlAcompanhamento(a.tokenAcompanhamento));
    expect(await resposta.json()).toMatchObject({ estado: 'cancelado' });
  });

  it('relato idempotente e fora do município recusado', async () => {
    const relato = { eventoId: randomUUID(), usuarioId, tipo: 'buraco' as const, lat: -23.55, lon: -46.63 };
    const a = await api.enviarRelato(relato);
    expect(await api.enviarRelato(relato)).toEqual(a);
    await expect(api.enviarRelato({ ...relato, eventoId: randomUUID(), lat: -22.9, lon: -43.2 })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('pulseira: pareia, recebe o evento uma vez, manda alerta e despareia', async () => {
    const dispositivoId = `pulseira-teste-${Date.now()}`;
    await api.parearVestivel(usuarioId, dispositivoId);
    await api.enviarEventoVestivel({ dispositivoId, tipo: 'impacto', ocorridoEm: new Date(Date.now() - 1_000).toISOString() });
    const eventos = await api.listarEventosVestivelPendentes(usuarioId);
    expect(eventos.map((e) => e.tipo)).toEqual(['impacto']);
    expect(await api.listarEventosVestivelPendentes(usuarioId)).toEqual([]);
    await api.enviarAlertaVestivel(usuarioId, { tipo: 'ponto_critico', ocorridoEm: new Date(Date.now() - 1_000).toISOString() });
    await api.desparearVestivel(usuarioId);
  });

  it('excluir a conta apaga tudo', async () => {
    await api.excluirUsuario(usuarioId);
    await expect(api.obterUsuario(usuarioId)).rejects.toMatchObject({ status: 404 });
    usuarioId = '';
  });
});
