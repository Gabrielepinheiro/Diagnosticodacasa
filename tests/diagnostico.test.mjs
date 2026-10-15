// Testes da matriz de prioridade. Rodar com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcular, textoResultado } from '../js/diagnostico.js';

const base = (extra = {}) => ({
  nome: 'Ana', email: 'ana@exemplo.de', instagram: '', moradores: ['parceiro'],
  ambientes: [], porAmbiente: {}, atritos: [], faltas: [{ id: 'nada', amb: '' }],
  evita: 'nenhum', prioridade: '', tempo: '2a5', origem: 'instagram', indicacao: '', consentimento: true,
  ...extra,
});

test('pontos de impacto somam como no documento', () => {
  const res = calcular(base({
    ambientes: ['estar'],
    porAmbiente: { estar: { paz: 2, freq: 3, estado: 'moveis' } },
    atritos: [{ id: 'descansar_juntos', amb: 'estar' }],
    evita: 'estar', prioridade: 'estar',
  }));
  const a = res.ambientes[0];
  assert.deepEqual(a.pontos, { pazFrequencia: 6, atritos: 2, faltas: 0, evita: 1, prioridade: 2 });
  assert.equal(a.impacto, 11);
  assert.equal(a.quadrante, 1);
  assert.equal(res.estado.id, 'atencao');
  assert.equal(res.caminho.linha, 'Essence');
});

test('quadrantes pelo impacto (6+) e pelo esforço (P7)', () => {
  const res = calcular(base({
    ambientes: ['estar', 'cozinha', 'casal', 'banheiro'],
    porAmbiente: {
      estar: { paz: 2, freq: 3, estado: 'moveis' },        // 6, leve  → 1
      cozinha: { paz: 3, freq: 3, estado: 'nao_funciona' }, // 9, maior → 2
      casal: { paz: 1, freq: 3, estado: 'moveis' },         // 3, leve  → 3
      banheiro: { paz: 1, freq: 1, estado: 'provisorio' },  // 1, maior → 4
    },
    prioridade: 'banheiro', // +2 → 3, continua baixo
  }));
  assert.deepEqual(res.ambientes.map((a) => [a.id, a.quadrante]), [['estar', 1], ['cozinha', 2], ['casal', 3], ['banheiro', 4]]);
  assert.equal(res.estado.id, 'atencao');
});

test('desempate: P11 primeiro, depois a frequência', () => {
  const res = calcular(base({
    ambientes: ['hall', 'estar', 'jantar'],
    porAmbiente: {
      hall: { paz: 3, freq: 2, estado: 'moveis' },   // 6
      estar: { paz: 2, freq: 3, estado: 'moveis' },  // 6
      jantar: { paz: 2, freq: 2, estado: 'moveis' }, // 4 + P11 2 = 6
    },
    prioridade: 'jantar',
  }));
  assert.deepEqual(res.ambientes.map((a) => a.id), ['jantar', 'estar', 'hall']);
});

test('3 ou mais ambientes de impacto alto: Pede cuidado e Premier', () => {
  const amb = ['estar', 'cozinha', 'casal'];
  const res = calcular(base({
    ambientes: amb,
    porAmbiente: Object.fromEntries(amb.map((id) => [id, { paz: 2, freq: 3, estado: 'vazio' }])),
    prioridade: 'estar',
  }));
  assert.equal(res.estado.id, 'cuidado');
  assert.equal(res.caminho.linha, 'Premier');
});

test('casa em paz: Collection ou Essence', () => {
  const res = calcular(base({ ambientes: ['estar'], porAmbiente: { estar: { paz: 0, freq: 3, estado: 'moveis' } }, prioridade: 'estar' }));
  assert.equal(res.estado.id, 'paz');
  assert.equal(res.caminho.linha, 'Collection ou Essence');
  assert.match(res.ambientes[0].porque, /pronto primeiro/);
});

test('primeiro no quadrante 2: Maison para os quadrantes 1 e 2, com aviso de Personalité', () => {
  const res = calcular(base({
    ambientes: ['estar', 'cozinha'],
    porAmbiente: { estar: { paz: 2, freq: 3, estado: 'moveis' }, cozinha: { paz: 3, freq: 3, estado: 'vazio' } },
  }));
  // estar (Q1) vem antes, então o caminho é Essence; trocamos para testar o Q2 sozinho
  const res2 = calcular(base({ ambientes: ['cozinha'], porAmbiente: { cozinha: { paz: 3, freq: 3, estado: 'vazio' } } }));
  assert.equal(res.caminho.linha, 'Essence');
  assert.equal(res2.caminho.linha, 'Maison');
  assert.match(res2.caminho.frase, /Personalité/);
});

test('menos de 2 anos muda a direção do quadrante 2', () => {
  const r = { ambientes: ['cozinha'], porAmbiente: { cozinha: { paz: 3, freq: 3, estado: 'vazio' } } };
  assert.match(calcular(base({ ...r, tempo: 'menos2' })).ambientes[0].direcao, /vão junto na mudança/);
  assert.doesNotMatch(calcular(base({ ...r, tempo: 'mais5' })).ambientes[0].direcao, /mudança/);
});

test('ambiente que falta (P9) e não existe entra na lista como esforço maior', () => {
  const res = calcular(base({
    ambientes: ['estar'],
    porAmbiente: { estar: { paz: 0, freq: 3, estado: 'moveis' } },
    atritos: [{ id: 'trabalho', amb: 'office' }],
    faltas: [{ id: 'trabalhar', amb: 'office' }],
    prioridade: 'estar',
  }));
  const office = res.ambientes.find((a) => a.id === 'office');
  assert.equal(office.existe, false);
  assert.equal(office.impacto, 4);
  assert.equal(office.esforcoLeve, false);
  assert.match(office.porque, /ainda não existe/);
});

test('"Outra" usa o texto da pessoa no por quê', () => {
  const res = calcular(base({
    ambientes: ['varanda'], porAmbiente: { varanda: { paz: 1, freq: 1, estado: 'vazio' } },
    atritos: [{ id: 'outra', amb: 'varanda', texto: 'Não tem sombra à tarde' }], prioridade: 'varanda',
  }));
  assert.match(res.ambientes[0].porque, /não tem sombra à tarde/);
});

test('texto do resultado segue o formato do documento', () => {
  const res = calcular(base({ ambientes: ['estar'], porAmbiente: { estar: { paz: 2, freq: 3, estado: 'moveis' } }, prioridade: 'estar' }));
  const t = textoResultado('Ana Souza', res);
  assert.match(t, /^O DIAGNÓSTICO DA SUA CASA\nPreparado para Ana Souza/);
  assert.match(t, /1\. Sala de estar {2}· {2}Comece por aqui/);
  assert.match(t, /O SEU PRÓXIMO PASSO/);
});
