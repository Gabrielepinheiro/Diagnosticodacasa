// A matriz de prioridade: transforma as respostas no resultado.
// Não depende do navegador, para poder ser testada (tests/diagnostico.test.mjs).

import { ATRITOS, FALTAS, ESTADO, nomeAmbiente, artigoAmbiente } from './perguntas.js';

export const IMPACTO_ALTO = 6;

// Saúde da casa: 100 = o ambiente não pesa nada; cai até 0 quando o impacto chega a 12 pontos.
// Com o impacto alto (6), a saúde fica em 50.
export const IMPACTO_SAUDE_ZERO = 12;
export const FAIXAS_SAUDE = [
  { id: 'boa', min: 70, nome: 'em paz' },
  { id: 'media', min: 40, nome: 'pede atenção' },
  { id: 'baixa', min: 0, nome: 'pede cuidado' },
];
export const faixaSaude = (n) => FAIXAS_SAUDE.find((f) => n >= f.min);
const saudeAmbiente = (impacto) => Math.round(100 * (1 - Math.min(impacto, IMPACTO_SAUDE_ZERO) / IMPACTO_SAUDE_ZERO));

export const QUADRANTES = {
  1: { nome: 'Comece por aqui', direcao: 'Os móveis já estão aqui. Luz, tecidos, arte e objetos certos devolvem a sensação de lar com poucas compras.' },
  2: { nome: 'O coração do projeto', direcao: 'Este ambiente pede um layout pensado para a sua rotina antes de qualquer compra. Comprar sem esse plano é o caminho mais caro.' },
  3: { nome: 'Toques finais', direcao: 'Quando o essencial estiver resolvido, alguns detalhes completam este ambiente. Não há pressa.' },
  4: { nome: 'Pode esperar', direcao: 'Hoje ele não pesa na sua rotina. Guarde para uma segunda etapa e concentre a energia nos primeiros da lista.' },
};

const DIRECAO_2_CURTO_PRAZO = 'Este ambiente pede um layout pensado para a sua rotina antes de qualquer compra. Como você pretende ficar menos de 2 anos neste imóvel, a escolha vai para soluções que vão junto na mudança.';

export const ESTADOS = {
  paz: { nome: 'Em paz', frase: 'A sua casa já tem uma boa base. O que falta são toques que trazem ainda mais de você para ela.' },
  atencao: { nome: 'Pede atenção', frase: 'Há pontos específicos tirando a sua paz. Resolvendo esses ambientes, a casa inteira muda de sensação.' },
  cuidado: { nome: 'Pede cuidado', frase: 'Vários ambientes pesam na sua rotina ao mesmo tempo. Antes de comprar qualquer coisa, vale ter uma estratégia para a casa inteira.' },
};

const FREQ_TXT = { 3: 'todos os dias', 2: 'algumas vezes por semana', 1: 'raramente' };
const PAZ_TXT = { 1: 'um pouco', 2: 'bastante' };

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
      ? `Você usa este ambiente ${FREQ_TXT[a.freq]} e ele é o que mais tira a sua paz.`
      : `Você usa este ambiente ${FREQ_TXT[a.freq]} e ele tira ${PAZ_TXT[a.paz]} a sua paz.`);
  }
  if (!a.existe) partes.push('Ele ainda não existe na sua casa, mas faz falta.');
  if (a.atritos.length === 1) partes.push(`É aqui que mora um dos atritos da sua rotina: ${minuscula(a.atritos[0])}.`);
  if (a.atritos.length > 1) partes.push(`É aqui que moram atritos da sua rotina: ${juntar(a.atritos.map(minuscula))}.`);
  if (a.faltas.length) partes.push(`É o que falta na sua casa hoje: ${juntar(a.faltas.map(minuscula))}.`);
  if (a.prioridade) partes.push('É o ambiente que você gostaria de ver pronto primeiro.');
  if (a.evita) partes.push('É o ambiente que você evita mostrar quando recebe visitas.');
  if (!partes.length) partes.push(a.paz === 0 ? 'Você gosta dele como está, e ele pesa pouco na sua rotina.' : 'Hoje ele pesa pouco na sua rotina.');
  return partes.join(' ');
}

function listaNomes(ids) {
  const nomes = ids.map((id) => (id === 'keller' ? nomeAmbiente(id) : minuscula(nomeAmbiente(id)))); // Keller é substantivo alemão
  if (nomes.length <= 1) return nomes.join('');
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
}

function montarCaminho(estadoId, ambientes, r) {
  const primeiro = ambientes[0];
  const doQuadrante = (...qs) => ambientes.filter((a) => qs.includes(a.quadrante)).map((a) => a.id);

  if (estadoId === 'cuidado') {
    const ids = doQuadrante(1, 2);
    return {
      linha: 'Premier',
      ambientes: ids,
      frase: 'O caminho que indico para começar é a Premier, uma call para montar a estratégia da casa inteira. Em até 2 dias úteis, envio a você os detalhes.',
      nota: '3 ou mais ambientes de impacto alto: Premier.',
    };
  }
  if (estadoId === 'paz') {
    const ids = ambientes.slice(0, 2).map((a) => a.id);
    return {
      linha: 'Collection ou Essence',
      ambientes: ids,
      frase: `O caminho que indico para começar é a Collection ou o Essence para ${listaNomes(ids)}, conforme o quanto de acompanhamento você quer. Em até 2 dias úteis, envio a você os detalhes.`,
      nota: 'Casa em paz: Collection ou Essence, conforme o acompanhamento desejado.',
    };
  }
  if (primeiro.quadrante === 1) {
    const ids = doQuadrante(1);
    return {
      linha: 'Essence',
      ambientes: ids,
      frase: `O caminho que indico para começar é o Essence para ${listaNomes(ids)}. Em até 2 dias úteis, envio a você os detalhes.`,
      nota: 'Primeiro da lista no quadrante 1: Essence.' + (r.pintura === 'sim' ? ' Quer mudar paredes: avaliar Personalité.' : ''),
    };
  }
  const ids = doQuadrante(1, 2);
  if (r.pintura === 'sim') {
    return {
      linha: 'Personalité',
      ambientes: ids,
      frase: `O caminho que indico para começar é o Personalité para ${listaNomes(ids)}, que inclui a pintura e o papel de parede que você quer. Em até 2 dias úteis, envio a você os detalhes.`,
      nota: 'Primeiro da lista no quadrante 2 e vontade de mudar paredes: Personalité.',
    };
  }
  if (r.pintura === 'nao') {
    return {
      linha: 'Maison',
      ambientes: ids,
      frase: `O caminho que indico para começar é o Maison para ${listaNomes(ids)}. Em até 2 dias úteis, envio a você os detalhes.`,
      nota: 'Primeiro da lista no quadrante 2, sem mudar paredes: Maison.',
    };
  }
  return {
    linha: 'Maison',
    ambientes: ids,
    frase: `O caminho que indico para começar é o Maison para ${listaNomes(ids)}. Se você tiver vontade de pintar ou colocar papel de parede, o caminho passa a ser o Personalité. Em até 2 dias úteis, envio a você os detalhes.`,
    nota: 'Primeiro da lista no quadrante 2: Maison. Se houver vontade de mudar paredes (pintura, papel de parede): Personalité. Confirmar no briefing.',
  };
}

const CONVITE = {
  1: 'Você já usa muito este ambiente e, com poucos ajustes, ele pode mudar a forma como você se sente em casa já nas próximas semanas.',
  2: 'É ali que está a maior transformação da sua casa. Quando ele estiver resolvido, a rotina inteira fica mais leve.',
  3: 'A sua casa já tem uma boa base. Começar por aqui é o jeito de trazer ainda mais de você para ela, com calma.',
  4: 'A sua casa já tem uma boa base. Começar por aqui é o jeito de trazer ainda mais de você para ela, com calma.',
};

function montarConvite(nome, primeiro) {
  const n = primeiro.id === 'keller' ? primeiro.nome : minuscula(primeiro.nome);
  const pelo = artigoAmbiente(primeiro.id) === 'a' ? 'pela' : 'pelo';
  const primeiroNome = (nome || '').trim().split(/\s+/)[0];
  return {
    abertura: `${primeiroNome ? primeiroNome + ', com' : 'Com'} base no seu diagnóstico, eu sugiro que você comece ${pelo} ${n}.`,
    texto: CONVITE[primeiro.quadrante],
    fecho: 'Uma casa não fica pronta de uma vez. Ela vai ficando sua, um ambiente de cada vez.',
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
  const atritos = r.atritos.filter((x) => x.amb);
  const faltas = r.faltas.filter((x) => x.amb);

  // Um ambiente citado nas perguntas 8 e 9 que não existe na casa entra na lista como "a criar".
  const citados = [...atritos, ...faltas].map((x) => x.amb).filter((id) => !marcados.has(id));
  const ids = [...r.ambientes, ...new Set(citados)];

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
    a.saude = saudeAmbiente(a.impacto);
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

  // Saúde geral: média ponderada pelo uso; quem não existe ainda pesa como "raramente".
  const peso = (a) => (a.existe ? a.freq : 1);
  const saude = Math.round(ambientes.reduce((s, a) => s + a.saude * peso(a), 0) / ambientes.reduce((s, a) => s + peso(a), 0));

  return {
    versao: 2,
    saude,
    estado: { id: estadoId, ...ESTADOS[estadoId], impactoAlto: altos },
    ambientes,
    convite: montarConvite(r.nome, ambientes[0]),
    caminho: montarCaminho(estadoId, ambientes, r),
  };
}

/** Texto do resultado, no formato do documento, para enviar por e-mail. */
export function textoResultado(nome, res) {
  const linhas = [
    'O DIAGNÓSTICO DA SUA CASA',
    `Preparado para ${nome}`,
    '',
    res.saude != null ? `SAÚDE DA CASA: ${res.saude}/100 · ${res.estado.nome}` : `ESTADO GERAL: ${res.estado.nome}`,
    res.estado.frase,
    '',
    ...[...res.ambientes].filter((a) => a.saude != null).sort((x, y) => x.saude - y.saude).map((a) => `   ${a.nome}: ${a.saude}/100 · ${faixaSaude(a.saude).nome}`),
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
  if (res.convite) linhas.push('POR ONDE EU COMEÇARIA', `${res.convite.abertura} ${res.convite.texto}`, res.convite.fecho, '');
  linhas.push('O SEU PRÓXIMO PASSO', res.caminho.frase, '', 'Gabriele Pinheiro · Design de interiores online');
  return linhas.join('\n');
}
