#!/usr/bin/env node
/**
 * Gera os dados do mock a partir dos arquivos das outras disciplinas, para o app sem API
 * mostrar o mesmo risco que a API real:
 *
 *   node scripts/gerar-dados-mock.mjs <risco_celula.csv do garupa-sp-ml> <distritos.json do garupa-sp-api>
 *
 * - risco_celula.csv: saída do modelo (garupa-sp-ml/saida/risco_celula.csv).
 * - distritos.json: lista do IBGE usada pela API (garupa-sp-api/Garupa.Infrastructure/Resources/distritos.json).
 *
 * Escreve src/api/mock/distritos.json e src/api/mock/risco-modelo.json. Como a API, troca o
 * distrito_id do CSV (GeoSampa) pelo id IBGE, achando o distrito pelo nome.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [caminhoCsv, caminhoDistritos] = process.argv.slice(2);
if (!caminhoCsv || !caminhoDistritos) {
  console.error('Uso: node scripts/gerar-dados-mock.mjs <risco_celula.csv> <distritos.json>');
  process.exit(1);
}
const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'api', 'mock');

const semAcento = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// ---------- Distritos (IBGE) ----------
const distritos = JSON.parse(readFileSync(caminhoDistritos, 'utf8').replace(/^﻿/, ''))
  .map((d) => ({ distritoId: d.id, nome: d.nome }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
if (distritos.length !== 96) throw new Error(`Esperava 96 distritos, veio ${distritos.length}.`);
const porNome = new Map(distritos.map((d) => [semAcento(d.nome), d]));

// ---------- CSV do modelo ----------
function lerCsv(texto) {
  const linhas = [];
  let campo = '';
  let linha = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',' || c === ';') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo);
      if (linha.some((x) => x !== '')) linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  if (campo || linha.length) linhas.push([...linha, campo]);
  const [cabecalho, ...resto] = linhas;
  return resto.map((l) => Object.fromEntries(cabecalho.map((k, i) => [k.trim(), l[i]?.trim() ?? ''])));
}

const DIAS = ['util', 'sabado', 'domingo'];
const numero = (s) => Number(String(s).replace(',', '.'));
const indice = (faixa, dia, chuva) => faixa * 6 + DIAS.indexOf(dia) * 2 + chuva;

const celulas = new Map();
let versao = null;
for (const r of lerCsv(readFileSync(caminhoCsv, 'utf8').replace(/^﻿/, ''))) {
  const distrito = porNome.get(semAcento(r.distrito_nome));
  if (!distrito) throw new Error(`Distrito desconhecido no CSV: ${r.distrito_nome}`);
  const faixa = numero(r.faixa_horaria);
  const chuva = numero(r.chuva);
  if (!(faixa >= 0 && faixa <= 5) || !DIAS.includes(r.tipo_dia) || !(chuva === 0 || chuva === 1)) {
    throw new Error(`Contexto inválido na célula ${r.celula_id}.`);
  }
  let c = celulas.get(r.celula_id);
  if (!c) {
    c = {
      celulaId: r.celula_id,
      centroLat: numero(r.centro_lat),
      centroLon: numero(r.centro_lon),
      viaReferencia: r.via_referencia,
      distritoId: distrito.distritoId,
      // [score, percentil] por contexto; índice = faixa * 6 + dia * 2 + chuva
      risco: Array.from({ length: 36 }, () => null),
    };
    celulas.set(r.celula_id, c);
  }
  const i = indice(faixa, r.tipo_dia, chuva);
  if (c.risco[i]) throw new Error(`Contexto repetido na célula ${r.celula_id}.`);
  c.risco[i] = [numero(r.score), Math.round(numero(r.percentil))];
  versao ??= r.versao_modelo;
}
for (const c of celulas.values()) {
  if (c.risco.some((x) => !x)) throw new Error(`Célula ${c.celulaId} sem todos os 36 contextos.`);
}

writeFileSync(join(destino, 'distritos.json'), JSON.stringify(distritos, null, 1) + '\n');
writeFileSync(
  join(destino, 'risco-modelo.json'),
  JSON.stringify({ versaoModelo: versao, geradoDe: 'garupa-sp-ml/saida/risco_celula.csv', celulas: [...celulas.values()] }) + '\n',
);
console.log(`${distritos.length} distritos e ${celulas.size} células (${versao}) gravados em src/api/mock.`);
