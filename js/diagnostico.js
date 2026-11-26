// A matriz de prioridade: transforma as respostas no resultado.
// Não depende do navegador, para poder ser testada (tests/diagnostico.test.mjs).

import { ATRITOS, FALTAS, ESTADO, nomeAmbiente, artigoAmbiente } from './perguntas.js';

export const IMPACTO_ALTO = 6;
// Para as barras do resultado: impacto médio a partir de 3 pontos; a barra enche aos 12.
export const IMPACTO_MEDIO = 3;
export const IMPACTO_BARRA_CHEIA = 12;
export const faixaImpacto = (n) => (n >= IMPACTO_ALTO ? 'alto' : n >= IMPACTO_MEDIO ? 'medio' : 'baixo');

export const QUADRANTES = {
  1: { nome: 'Comece por aqui', direcao: 'Os móveis principais já estão no lugar. Iluminação, tecidos, arte e objetos resolvem a maior parte do que incomoda, com poucas compras e sem obra.' },
  2: { nome: 'O coração do projeto', direcao: 'Este ambiente pede um layout pensado para a rotina antes de qualquer compra: medidas, circulação e a posição de cada móvel. Comprar sem esse plano costuma sair mais caro.' },
  3: { nome: 'Toques finais', direcao: 'Funciona bem hoje. Quando os primeiros da lista estiverem resolvidos, alguns detalhes completam o ambiente.' },
  4: { nome: 'Pode esperar', direcao: 'Hoje ele pesa pouco na rotina. Vale deixar para uma segunda etapa e concentrar as decisões nos primeiros da lista.' },
};

const DIRECAO_2_CURTO_PRAZO = 'Este ambiente pede um layout pensado para a rotina antes de qualquer compra. Como você pretende ficar menos de 2 anos neste imóvel, a prioridade são peças que funcionem também na próxima casa.';

export const ESTADOS = {
  paz: { nome: 'Boa base', frase: 'Nenhum ambiente tem impacto alto na rotina. A casa já funciona; o que falta são escolhas que tragam mais personalidade a cada ambiente.' },
  atencao: { nome: 'Pontos específicos', frase: 'Poucos ambientes concentram o que pesa na rotina. Resolver esses primeiro muda o funcionamento da casa como um todo.' },
  cuidado: { nome: 'Pede uma visão do conjunto', frase: 'Vários ambientes pesam na rotina ao mesmo tempo. Antes de comprar qualquer peça, vale definir como eles vão funcionar juntos.' },
};

const FREQ_TXT = { 3: 'todos os dias', 2: 'algumas vezes por semana', 1: 'raramente' };
const INCOMODO_TXT = { 1: 'um pouco', 2: 'bastante' };

const minuscula = (t) => t.charAt(0).toLowerCase() + t.slice(1);

function textoEscolha(lista, escolha) {
  if (escolha.texto) return escolha.texto.trim();
  return lista.find((o) => o.id === escolha.id)?.t ?? '';
}

function juntar(itens) {
  if (itens.length <= 1) return itens.join('');
  return itens.slice(0, -1).join('; ') + ' e ' + itens[itens.length - 1];
}

function montarPorque(a, tempo) {
  const partes = [];
  if (a.existe && a.paz > 0) {
    partes.push(a.paz === 3
      ? `Você usa este ambiente ${FREQ_TXT[a.freq]} e ele é o que mais te incomoda.`
      : `Você usa este ambiente ${FREQ_TXT[a.freq]} e ele te incomoda ${INCOMODO_TXT[a.paz]}.`);
  }
  if (a.atritos.length === 1) partes.push(`Está ligado a um atrito que você apontou: ${minuscula(a.atritos[0])}.`);
  if (a.atritos.length > 1) partes.push(`Está ligado a atritos que você apontou: ${juntar(a.atritos.map(minuscula))}.`);
  if (a.faltas.length) partes.push(`Você apontou que falta ${juntar(a.faltas.map(minuscula))}.`);
  if (a.prioridade) partes.push('É o ambiente que você gostaria de ver pronto primeiro.');
  if (a.evita) partes.push('É o ambiente que você evita mostrar quando recebe visitas.');
  if (!partes.length) partes.push(a.paz === 0 ? 'Você gosta dele como está, e ele pesa pouco na sua rotina.' : 'Hoje ele pesa pouco na sua rotina.');
  return partes.join(' ');
}

function listaNomes(ids) {
  const nomes = ids.map((id) => `**${id === 'keller' ? nomeAmbiente(id) : minuscula(nomeAmbiente(id))}**`); // Keller é substantivo alemão
  if (nomes.length <= 1) return nomes.join('');
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
}

const PROPOSTA_TXT = {
  sim: 'Em até 2 dias úteis, você recebe no e-mail cadastrado uma proposta personalizada, com um plano de execução para a casa.',
  nao: 'Se quiser seguir com um projeto depois, é só me escrever no direct.',
};

function montarCaminho(estadoId, ambientes, r) {
  const c = escolherCaminho(estadoId, ambientes, r);
  const extra = PROPOSTA_TXT[r.proposta];
  return { ...c, frase: extra ? `${c.frase} ${extra}` : c.frase, proposta: r.proposta || '' };
}

function escolherCaminho(estadoId, ambientes, r) {
  const primeiro = ambientes[0];
  const doQuadrante = (...qs) => ambientes.filter((a) => qs.includes(a.quadrante)).map((a) => a.id);

  if (estadoId === 'cuidado') {
    const ids = doQuadrante(1, 2);
    return {
      linha: 'Premier',
      ambientes: ids,
      frase: 'Com base no seu diagnóstico, o serviço que mais te atenderia neste momento é a **Premier**, uma conversa de 1h30 para definir a estratégia da casa inteira: prioridades, ordem das compras e o que cada ambiente precisa.',
      nota: '3 ou mais ambientes de impacto alto: Premier.',
    };
  }
  if (estadoId === 'paz') {
    const ids = ambientes.slice(0, 2).map((a) => a.id);
    return {
      linha: 'Collection ou Essence',
      ambientes: ids,
      frase: `Com base no seu diagnóstico, o serviço que mais te atenderia neste momento é a **Collection** ou o **Essence** para ${listaNomes(ids)}, conforme o quanto de acompanhamento você quer.`,
      nota: 'Boa base (nenhum ambiente de impacto alto): Collection ou Essence, conforme o acompanhamento desejado.',
    };
  }
  if (primeiro.quadrante === 1) {
    const ids = doQuadrante(1);
    return {
      linha: 'Essence',
      ambientes: ids,
      frase: `Com base no seu diagnóstico, o serviço que mais te atenderia neste momento é o **Essence** para ${listaNomes(ids)}.`,
      nota: 'Primeiro da lista no quadrante 1: Essence.' + (r.pintura === 'sim' ? ' Quer mudar paredes: avaliar Personalité.' : ''),
    };
  }
  const ids = doQuadrante(1, 2);
  if (r.pintura === 'sim') {
    return {
      linha: 'Personalité',
      ambientes: ids,
      frase: `Com base no seu diagnóstico, o serviço que mais te atenderia neste momento é o **Personalité** para ${listaNomes(ids)}, que inclui a pintura e o papel de parede que você quer.`,
      nota: 'Primeiro da lista no quadrante 2 e vontade de mudar paredes: Personalité.',
    };
  }
  if (r.pintura === 'nao') {
    return {
      linha: 'Maison',
      ambientes: ids,
      frase: `Com base no seu diagnóstico, o serviço que mais te atenderia neste momento é o **Maison** para ${listaNomes(ids)}.`,
      nota: 'Primeiro da lista no quadrante 2, sem mudar paredes: Maison.',
    };
  }
  return {
    linha: 'Maison',
    ambientes: ids,
    frase: `Com base no seu diagnóstico, o serviço que mais te atenderia neste momento é o **Maison** para ${listaNomes(ids)}. Se você tiver vontade de pintar ou colocar papel de parede, o serviço passa a ser o **Personalité**.`,
    nota: 'Primeiro da lista no quadrante 2: Maison. Se houver vontade de mudar paredes (pintura, papel de parede): Personalité. Confirmar no briefing.',
  };
}

const CONVITE = {
  1: 'É um ambiente que você usa muito e que já tem a base de móveis. Por isso é o que mais rende: muda o uso de todos os dias com poucas decisões.',
  2: 'É o ambiente que mais pesa na sua rotina e o que pede mais decisões de uma vez: layout, medidas e compras. Começar por ele, com um plano, evita compras que depois não conversam entre si.',
  3: 'Nenhum ambiente pesa muito na sua rotina hoje. Começar por aqui é a forma de acrescentar personalidade à casa, sem pressa.',
  4: 'Nenhum ambiente pesa muito na sua rotina hoje. Começar por aqui é a forma de acrescentar personalidade à casa, sem pressa.',
};
// A filosofia de projeto do escritório (Brand Book, "Nossas três frases").
export const FILOSOFIA = 'Um bom projeto não começa escolhendo móveis. Começa entendendo como eles vão funcionar juntos.';

function montarConvite(nome, primeiro) {
  const n = primeiro.id === 'keller' ? primeiro.nome : minuscula(primeiro.nome);
  const pelo = artigoAmbiente(primeiro.id) === 'a' ? 'pela' : 'pelo';
  const primeiroNome = (nome || '').trim().split(/\s+/)[0];
  return {
    abertura: `${primeiroNome ? primeiroNome + ', pelo' : 'Pelo'} que você me contou, eu sugiro que você comece ${pelo} ${n}.`,
    texto: CONVITE[primeiro.quadrante],
    fecho: FILOSOFIA,
  };
}

/**
 * @param {object} r respostas (ver app.js, novoRascunho)
 * @returns resultado com estado geral, ambientes em ordem e caminho
 */
export function calcular(r) {
  const marcados = new Set(r.ambientes);
  // P10 aceita vários ambientes (antes era um só).
  const evita = Array.isArray(r.evita) ? r.evita : r.evita ? [r.evita] : [];
  // Só contam os ambientes que a pessoa assinalou.
  const atritos = r.atritos.filter((x) => marcados.has(x.amb));
  const faltas = r.faltas.filter((x) => marcados.has(x.amb));

  const ids = [...r.ambientes];

  const ambientes = ids.map((id) => {
    const existe = marcados.has(id);
    const resp = existe ? r.porAmbiente[id] : null;
    const paz = resp?.paz ?? 0;
    const freq = resp?.freq ?? 0;
    const estado = resp?.estado ?? 'vazio';
    const a = {
      id,
      nome: nomeAmbiente(id),
      existe,
      paz,
      freq,
      estado,
      atritos: atritos.filter((x) => x.amb === id).map((x) => textoEscolha(ATRITOS, x)),
      faltas: faltas.filter((x) => x.amb === id).map((x) => textoEscolha(FALTAS, x)),
      evita: evita.includes(id),
      prioridade: r.prioridade === id,
    };
    a.pontos = {
      pazFrequencia: paz * freq,
      atritos: a.atritos.length * 2,
      faltas: a.faltas.length * 2,
      evita: a.evita ? 1 : 0,
      prioridade: a.prioridade ? 2 : 0,
    };
    a.impacto = Object.values(a.pontos).reduce((s, n) => s + n, 0);
    a.impactoAlto = a.impacto >= IMPACTO_ALTO;
    a.esforcoLeve = existe && !!ESTADO.find((e) => e.id === estado)?.leve;
    a.quadrante = a.impactoAlto ? (a.esforcoLeve ? 1 : 2) : (a.esforcoLeve ? 3 : 4);
    a.quadranteNome = QUADRANTES[a.quadrante].nome;
    a.direcao = a.quadrante === 2 && r.tempo === 'menos2' ? DIRECAO_2_CURTO_PRAZO : QUADRANTES[a.quadrante].direcao;
    a.porque = montarPorque(a, r.tempo);
    a.faixa = faixaImpacto(a.impacto);
    return a;
  });

  // Ordem: quadrante; dentro dele, maior impacto; desempate pela P11 e depois pela frequência.
  ambientes.sort((x, y) =>
    x.quadrante - y.quadrante ||
    y.impacto - x.impacto ||
    Number(y.prioridade) - Number(x.prioridade) ||
    y.freq - x.freq ||
    ids.indexOf(x.id) - ids.indexOf(y.id));

  const altos = ambientes.filter((a) => a.impactoAlto).length;
  const estadoId = altos === 0 ? 'paz' : altos <= 2 ? 'atencao' : 'cuidado';

  return {
    versao: 3,
    estado: { id: estadoId, ...ESTADOS[estadoId], impactoAlto: altos },
    ambientes,
    convite: montarConvite(r.nome, ambientes[0]),
    caminho: montarCaminho(estadoId, ambientes, r),
  };
}

/** **texto** → <b>texto</b>. Recebe texto já escapado para HTML. */
export const negrito = (t) => t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
/** Tira as marcas de negrito, para e-mail e texto simples. */
export const semMarcas = (t) => String(t ?? '').replace(/\*\*/g, '');

/** Texto do resultado, no formato do documento, para enviar por e-mail. */
export function textoResultado(nome, res) {
  const linhas = [
    'O DIAGNÓSTICO DA SUA CASA',
    `Preparado para ${nome}`,
    '',
    `LEITURA GERAL: ${res.estado.nome}`,
    res.estado.frase,
    '',
    'IMPACTO DE CADA AMBIENTE NA ROTINA (a partir de 6 pontos, o impacto é alto)',
    ...res.ambientes.map((a) => `   ${a.nome}: ${a.impacto} ${a.impacto === 1 ? 'ponto' : 'pontos'}`),
    '',
    'POR ONDE COMEÇAR',
    '',
  ];
  res.ambientes.forEach((a, i) => {
    linhas.push(`${i + 1}. ${a.nome}  ·  ${a.quadranteNome}`);
    linhas.push(`   Por quê: ${a.porque}`);
    linhas.push(`   Direção: ${a.direcao}`);
    linhas.push('');
  });
  if (res.convite) linhas.push('POR ONDE EU COMEÇARIA', `${res.convite.abertura} ${res.convite.texto}`, '');
  linhas.push('O SEU PRÓXIMO PASSO', semMarcas(res.caminho.frase), '', 'Gabriele Pinheiro · Interior designer');
  return linhas.join('\n');
}
