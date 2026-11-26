// O aplicativo do cliente: senha → perguntas → resultado.

import { CONFIG } from './config.js';
import * as P from './perguntas.js';
import { calcular, negrito, IMPACTO_ALTO, IMPACTO_BARRA_CHEIA, QUADRANTES } from './diagnostico.js';
import { verificarSenha, enviarDiagnostico, normalizarSenha, modoDemo } from './api.js';

const RASCUNHO = 'gp-diagnostico-rascunho';
const app = document.getElementById('app');
const barra = document.getElementById('progresso');

const h = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

function novoRascunho() {
  return {
    passo: 'senha',
    codigo: '',
    r: {
      nome: '', email: '', instagram: '', moradores: [], proposta: '',
      ambientes: [], porAmbiente: {},
      atritos: [], faltas: [],
      evita: [], prioridade: '',
      imovel: '', tempo: '', pintura: '', inicio: '',
      acompanha: '', referencias: [], travas: [],
      origem: '', indicacao: '', consentimento: false,
    },
    resultado: null,
  };
}

let st = carregar();
let enviando = false;

function carregar() {
  try {
    const s = JSON.parse(localStorage.getItem(RASCUNHO));
    if (s?.r && s.passo) {
      if (!Array.isArray(s.r.evita)) s.r.evita = s.r.evita ? [s.r.evita] : [];
      s.r = { ...novoRascunho().r, ...s.r }; // rascunhos de versões anteriores
      // Resultado salvo por uma versão anterior do app: refaz com as regras de agora.
      if (s.resultado) s.resultado = calcular(s.r);
      return s;
    }
  } catch { /* rascunho inválido */ }
  return novoRascunho();
}
function salvar() {
  try { localStorage.setItem(RASCUNHO, JSON.stringify(st)); } catch { /* navegador sem armazenamento */ }
}

// ---------- Passos ----------

function passos() {
  return ['senha', 'abertura', 'voce', 'casa', ...st.r.ambientes.map((id) => 'amb:' + id), 'atritos', 'faltas', 'sente', 'planos', 'decoracao', 'momento', 'resultado'];
}

const linkInstagram = () => (CONFIG.instagram ? `https://ig.me/m/${encodeURIComponent(CONFIG.instagram)}` : '');
const rot = (n, texto) => `<p class="rot">${n ? `<span class="n">${String(n).padStart(2, '0')}</span>` : ''}${texto}</p>`;
const ASSINATURA = '<p class="assin">Gabriele Pinheiro<small>Arquiteta brasileira &amp; interior designer</small></p>';

// Botões de escolha (um toque). `multi` usa aria-pressed como caixa de seleção.
function escolhas(grupo, opcoes, ativo, { multi = false, desativados = [] } = {}) {
  return `<div class="escolhas" role="group">${opcoes.map((o) => {
    const v = o.v ?? o.id;
    const on = multi ? ativo.includes(v) : ativo === v;
    const off = !on && desativados.includes(v);
    return `<button type="button" class="escolha${multi ? ' multi' : ''}" data-grupo="${grupo}" data-v="${h(v)}" aria-pressed="${on}"${off ? ' disabled' : ''}>
      <span>${h(o.t ?? o.nome)}${o.obs ? `<small>${h(o.obs)}</small>` : ''}</span></button>`;
  }).join('')}</div>`;
}

function seletorAmbiente(grupo, idx, valor, lista) {
  return `<label class="sub">Em qual ambiente?
    <select data-amb="${grupo}" data-i="${idx}">
      <option value="">Escolha</option>
      ${lista.map((id) => `<option value="${id}"${valor === id ? ' selected' : ''}>${h(P.nomeAmbiente(id))}</option>`).join('')}
    </select></label>`;
}

// Ambientes que se substituem quando um deles não foi assinalado (ex.: estar e jantar integradas).
const EQUIVALENTES = { estar: ['jantar'], jantar: ['estar'], lavanderia: ['servico'], servico: ['lavanderia'] };

// Só entram ambientes que a pessoa assinalou. Se o ambiente sugerido pela opção não existe na
// casa, vale um equivalente; se nenhum existir, a pessoa escolhe entre os que assinalou.
function ambientesPossiveis(opcao) {
  const meus = st.r.ambientes;
  if (opcao.nenhum) return [];
  if (typeof opcao.amb === 'string') {
    if (meus.includes(opcao.amb)) return [opcao.amb];
    const eq = (EQUIVALENTES[opcao.amb] || []).filter((id) => meus.includes(id));
    return eq.length ? eq : meus;
  }
  if (Array.isArray(opcao.amb)) {
    const sugeridos = opcao.amb.filter((id) => meus.includes(id));
    return sugeridos.length ? sugeridos : meus;
  }
  return meus;
}
// Lista para escolher; null quando só há um ambiente possível (ele é aplicado direto).
function candidatos(opcao) {
  if (opcao.nenhum) return null;
  const l = ambientesPossiveis(opcao);
  return l.length === 1 ? null : l;
}
function ambienteFixo(opcao) {
  const l = ambientesPossiveis(opcao);
  return l.length === 1 ? l[0] : '';
}

function blocoEscolhaAmbiente(chave, lista) {
  const sel = st.r[chave];
  const ids = sel.map((x) => x.id);
  const cheio = sel.length >= P.MAX_ESCOLHAS;
  const desativados = cheio ? lista.map((o) => o.id) : [];
  let html = escolhas(chave, lista, ids, { multi: true, desativados });
  const detalhes = sel.map((x, i) => {
    const o = lista.find((y) => y.id === x.id);
    const c = candidatos(o);
    if (c === null) return '';
    return `<div class="detalhe"><p class="detalhe-titulo">${h(o.outra ? 'Outra' : o.t)}</p>
      ${o.outra ? `<label class="sub">Qual?<input type="text" data-texto="${chave}" data-i="${i}" value="${h(x.texto)}" maxlength="140"></label>` : ''}
      ${seletorAmbiente(chave, i, x.amb, c)}</div>`;
  }).join('');
  if (detalhes) html += `<div class="detalhes">${detalhes}</div>`;
  return html;
}

// Capa: a primeira impressão. Título, o que a pessoa recebe, um exemplo do resultado e a frase do Brand Book.
function capa(acao) {
  return `
  <section class="capa">
    <div class="capa-titulo">
      ${rot(0, 'Arquitetura de interiores online')}
      <h1 tabindex="-1"><span class="h-leve">Por qual</span> <em>ambiente</em> <span class="mao">começar?</span></h1>
    </div>
    <div class="capa-texto">
      <p class="lede">Em <b>cerca de 6 minutos</b>, você descobre <b>quais ambientes pesam mais</b> na sua rotina e <b>em que ordem resolver a casa</b>, com o motivo de cada posição.</p>
      <div class="capa-acao">${acao}</div>
    </div>
  </section>
  <section class="bordo sangra recebe">
    <div class="miolo">
      ${rot(0, 'O que você recebe')}
      <ol class="lista-num">
        <li><span class="n">01</span><div><b>O peso <em>de cada ambiente</em></b><p>Quanto cada um <strong>interfere na sua rotina</strong> hoje, em pontos.</p></div></li>
        <li><span class="n">02</span><div><b>A ordem <em>para começar</em></b><p>Os ambientes organizados por <strong>impacto e esforço</strong>, com o motivo de cada posição.</p></div></li>
        <li><span class="n">03</span><div><b>O próximo <em>passo</em></b><p>A direção para cada ambiente e <strong>o serviço que mais combina</strong> com o seu momento.</p></div></li>
      </ol>
    </div>
  </section>
  <section class="amostra" aria-label="Exemplo de resultado">
    ${rot(0, 'Exemplo de resultado')}
    <div class="amostra-folha">
      <p class="am-tit">Quanto cada ambiente <em>pesa hoje</em></p>
      <div class="am-linha"><span>Sala de jantar</span><i style="--w:92%" class="alto"></i><small>Impacto alto</small></div>
      <div class="am-linha"><span>Hall de entrada</span><i style="--w:70%" class="alto"></i><small>Impacto alto</small></div>
      <div class="am-linha"><span>Home office</span><i style="--w:42%" class="medio"></i><small>Impacto médio</small></div>
      <div class="am-linha"><span>Cozinha</span><i style="--w:18%"></i><small>Impacto baixo</small></div>
      <p class="am-fim"><span>Comece pela</span> <b>sala de jantar</b></p>
    </div>
  </section>
  <blockquote class="bordo sangra frase"><p>Um bom projeto <strong>não começa escolhendo móveis.</strong> Começa entendendo como eles vão funcionar <span class="mao">juntos.</span></p></blockquote>
  <section class="quem">
    ${rot(0, 'Quem conduz')}
    ${ASSINATURA}
  </section>`;
}

const TELAS = {
  senha: {
    html: () => {
      const ig = linkInstagram();
      return capa(`
      <form id="f-senha" class="senha" novalidate>
        <label for="codigo">Senha</label>
        <input id="codigo" name="codigo" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${h(st.codigo)}" required>
        <p class="erro" id="erro-senha" role="alert"></p>
        <button class="btn" type="submit">Entrar</button>
      </form>
      <p class="sem-senha">Ainda não tem a senha? Envie <b>${h(CONFIG.palavraChave)}</b> no direct${CONFIG.instagram ? ` de ${ig ? `<a href="${ig}" target="_blank" rel="noopener">@${h(CONFIG.instagram)}</a>` : `@${h(CONFIG.instagram)}`}` : ' do Instagram'}.</p>
      ${modoDemo ? '<p class="aviso">Modo de teste: use a senha <b>DEMO</b>.</p>' : ''}`);
    },
    semContinuar: true,
  },
  abertura: {
    html: () => capa(`
      <button type="button" class="btn" data-acao="comecar">Começar o diagnóstico</button>
      <p class="nota">Gratuito. Você escolhe no início se quer receber também uma proposta.</p>`) + `
      <div class="fim-capa"><button type="button" class="btn" data-acao="comecar">Começar o diagnóstico</button></div>`,
    semContinuar: true,
    valido: () => true,
  },
  voce: {
    html: () => `
      ${rot(1, 'Você')}
      <h2 tabindex="-1">Primeiro, um pouco sobre você</h2>
      <label class="campo">Nome<input type="text" data-campo="nome" value="${h(st.r.nome)}" autocomplete="name" maxlength="120"></label>
      <label class="campo">E-mail <small>para receber o diagnóstico</small><input type="email" data-campo="email" value="${h(st.r.email)}" autocomplete="email" inputmode="email" maxlength="160"></label>
      <label class="campo">Seu @ no Instagram <small>opcional</small><input type="text" data-campo="instagram" value="${h(st.r.instagram)}" autocapitalize="none" spellcheck="false" maxlength="60" placeholder="@"></label>
      <fieldset><legend>Quem mora na casa com você?</legend>
      ${escolhas('moradores', P.MORADORES, st.r.moradores, { multi: true })}</fieldset>
      <fieldset><legend>Você quer receber também uma proposta personalizada?</legend>
        <p class="dica">Se quiser seguir com um projeto, envio ao seu e-mail uma proposta com um plano de execução para a casa. É opcional: o diagnóstico chega do mesmo jeito.</p>
        ${escolhas('proposta', P.PROPOSTA, st.r.proposta)}</fieldset>`,
    valido: () => st.r.nome.trim() && emailValido(st.r.email) && st.r.moradores.length && st.r.proposta,
  },
  casa: {
    html: () => `
      ${rot(2, 'A sua casa')}
      <h2 tabindex="-1">Quais destes ambientes existem na sua casa?</h2>
      <p class="dica">Marque todos. Em seguida, uma tela rápida para cada um.</p>
      ${escolhas('ambientes', P.AMBIENTES, st.r.ambientes, { multi: true })}`,
    valido: () => st.r.ambientes.length > 0,
  },
  amb: {
    html: (id) => {
      const a = st.r.porAmbiente[id] || {};
      const n = st.r.ambientes.indexOf(id) + 1;
      return `
      ${rot(2, `Ambiente ${n} de ${st.r.ambientes.length}`)}
      <h2 tabindex="-1">${h(P.nomeAmbiente(id))}</h2>
      <fieldset><legend>Quanto este ambiente te incomoda hoje?</legend>${escolhas('paz', P.PAZ, a.paz)}</fieldset>
      <fieldset><legend>Com que frequência você usa este ambiente?</legend>${escolhas('freq', P.FREQ, a.freq)}</fieldset>
      <fieldset><legend>Como ele está hoje?</legend>${escolhas('estado', P.ESTADO, a.estado)}</fieldset>`;
    },
    valido: (id) => { const a = st.r.porAmbiente[id]; return a && a.paz != null && a.freq != null && a.estado; },
  },
  atritos: {
    html: () => `
      ${rot(3, 'O que atrapalha a rotina')}
      <h2 tabindex="-1">O que mais atrapalha a sua rotina em casa hoje?</h2>
      <p class="dica">Até 3 opções. Cada uma conta pontos para o ambiente ligado a ela.</p>
      ${blocoEscolhaAmbiente('atritos', P.ATRITOS)}`,
    valido: () => listaCompleta('atritos', P.ATRITOS),
  },
  faltas: {
    html: () => `
      ${rot(4, 'O que falta na casa')}
      <h2 tabindex="-1">Falta algum espaço que faria diferença na sua rotina?</h2>
      <p class="dica">Até 3 opções.</p>
      ${blocoEscolhaAmbiente('faltas', P.FALTAS)}`,
    valido: () => st.r.faltas.length > 0 && listaCompleta('faltas', P.FALTAS),
  },
  sente: {
    html: () => {
      const meus = st.r.ambientes.map((id) => ({ id, t: P.nomeAmbiente(id) }));
      return `
      ${rot(5, 'Prioridades')}
      <h2 tabindex="-1">Duas perguntas rápidas</h2>
      <fieldset><legend>Quais ambientes você evita mostrar quando recebe visitas?</legend>
        <p class="dica">Pode marcar mais de um.</p>
        ${escolhas('evita', [...meus, { id: 'nenhum', t: 'Nenhum' }], st.r.evita, { multi: true })}</fieldset>
      <fieldset><legend>Se só um ambiente pudesse ficar pronto este mês, qual seria?</legend>
        ${escolhas('prioridade', meus, st.r.prioridade)}</fieldset>`;
    },
    valido: () => st.r.evita.length && st.r.prioridade,
  },
  planos: {
    html: () => `
      ${rot(6, 'O momento da casa')}
      <h2 tabindex="-1">Os seus planos para a casa</h2>
      <fieldset><legend>O imóvel é próprio ou alugado?</legend>${escolhas('imovel', P.IMOVEL, st.r.imovel)}</fieldset>
      <fieldset><legend>Por quanto tempo você pretende ficar neste imóvel?</legend>${escolhas('tempo', P.TEMPO, st.r.tempo)}</fieldset>
      <fieldset><legend>Você tem vontade de pintar paredes ou colocar papel de parede?</legend>${escolhas('pintura', P.PINTURA, st.r.pintura)}</fieldset>
      <fieldset><legend>Quando você gostaria de começar?</legend>${escolhas('inicio', P.INICIO, st.r.inicio)}</fieldset>`,
    valido: () => st.r.imovel && st.r.tempo && st.r.pintura && st.r.inicio,
  },
  decoracao: {
    html: () => `
      ${rot(7, 'Você e a decoração')}
      <h2 tabindex="-1">Como você costuma decidir</h2>
      <fieldset><legend>O quanto você acompanha perfis de decoração?</legend>${escolhas('acompanha', P.ACOMPANHA, st.r.acompanha)}</fieldset>
      <fieldset><legend>Você costuma salvar referências?</legend>
        <p class="dica">Pode marcar mais de uma.</p>${escolhas('referencias', P.REFERENCIAS, st.r.referencias, { multi: true })}</fieldset>
      <fieldset><legend>Quando você vai decorar ou comprar um móvel, o que mais te trava?</legend>
        <p class="dica">Pode marcar mais de uma.</p>${escolhas('travas', P.TRAVAS, st.r.travas, { multi: true })}</fieldset>`,
    valido: () => st.r.acompanha && st.r.referencias.length && st.r.travas.length,
  },
  momento: {
    html: () => `
      ${rot(8, 'Para fechar')}
      <h2 tabindex="-1">Última tela</h2>
      <fieldset><legend>Como você conheceu o escritório?</legend>${escolhas('origem', P.ORIGEM, st.r.origem)}
        ${st.r.origem === 'indicacao' ? `<label class="sub">Nome de quem indicou<input type="text" data-campo="indicacao" value="${h(st.r.indicacao)}" maxlength="120"></label>` : ''}</fieldset>
      <label class="consentimento"><input type="checkbox" data-campo="consentimento"${st.r.consentimento ? ' checked' : ''}>
        <span>Concordo que o escritório Gabriele Pinheiro guarde estas respostas para preparar o meu diagnóstico e entrar em contato comigo. Posso pedir a exclusão a qualquer momento.</span></label>
      <p class="erro" id="erro-envio" role="alert"></p>`,
    botao: 'Ver o meu diagnóstico',
    valido: () => st.r.origem && st.r.consentimento,
  },
  resultado: { html: () => htmlResultado(), semContinuar: true },
};

function listaCompleta(chave, lista) {
  return st.r[chave].every((x) => {
    const o = lista.find((y) => y.id === x.id);
    if (o.nenhum) return true;
    if (o.outra && !x.texto?.trim()) return false;
    return st.r.ambientes.includes(x.amb);
  });
}

const artigo = (id) => P.artigoAmbiente(id);
const nomeMin = (a) => (a.id === 'keller' ? a.nome : a.nome.charAt(0).toLowerCase() + a.nome.slice(1));

function htmlMatriz(res) {
  const pos = new Map(res.ambientes.map((a, i) => [a.id, i + 1]));
  const celula = (q) => {
    const lista = res.ambientes.filter((a) => a.quadrante === q);
    const alto = q <= 2 ? ' alto' : '';
    return `<div class="mx-q${alto}${lista.length ? '' : ' mx-vazio'}">
      <p class="mx-t">${h(QUADRANTES[q].nome)}</p>
      ${lista.length
        ? `<ol>${lista.map((a) => `<li><span class="n">${pos.get(a.id)}</span><a href="#r-${h(a.id)}">${h(a.nome)}</a></li>`).join('')}</ol>`
        : '<p class="sem">Nenhum ambiente</p>'}
    </div>`;
  };
  return `<div class="matriz" role="group" aria-label="Matriz de impacto na rotina e esforço para resolver">
    <span></span><span class="mx-x">Esforço leve</span><span class="mx-x">Esforço maior</span>
    <span class="mx-y">Impacto alto</span>${celula(1)}${celula(2)}
    <span class="mx-y">Impacto baixo</span>${celula(3)}${celula(4)}
  </div>`;
}

function htmlResultado() {
  const res = st.resultado;
  if (!res) return '';
  const primeiroNome = st.r.nome.trim().split(/\s+/)[0];
  const ig = linkInstagram();
  const total = res.ambientes.length;
  const altos = res.estado.impactoAlto;
  const primeiro = res.ambientes[0];
  const ordemCasa = [...res.ambientes].sort((x, y) => st.r.ambientes.indexOf(x.id) - st.r.ambientes.indexOf(y.id));
  const resumoAltos = altos === 0 ? 'nenhum tem impacto alto na rotina'
    : altos === 1 ? '<b>1 tem impacto alto</b> na rotina'
    : `<b>${altos} têm impacto alto</b> na rotina`;
  const pts = (n) => `${n} ${n === 1 ? 'ponto' : 'pontos'}`;
  return `
    ${rot(0, `Diagnóstico da casa · ${h(primeiroNome)}`)}
    <h1 tabindex="-1">Por onde <span class="mao">começar</span></h1>
    <p class="res-resumo">Dos <b>${total} ${total === 1 ? 'ambiente' : 'ambientes'}</b> que você assinalou, ${resumoAltos}. O primeiro da lista é ${artigo(primeiro.id)} <b>${h(nomeMin(primeiro))}</b>.</p>

    <section class="estado">
      ${rot(0, 'Leitura geral')}
      <p class="estado-nome">${h(res.estado.nome)}</p>
      <p>${h(res.estado.frase)}</p>
    </section>

    <section class="sec" aria-labelledby="t-pesos">
      ${rot(1, 'Impacto na rotina')}
      <h2 id="t-pesos">Quanto cada ambiente pesa hoje</h2>
      <p class="dica">Pontos de impacto de cada ambiente. A partir de ${IMPACTO_ALTO}, o impacto é alto. Toque num ambiente para ver o porquê.</p>
      <div class="pesos">
        ${ordemCasa.map((a) => `<a class="peso ${a.faixa}" href="#r-${h(a.id)}">
            <span class="peso-nome">${h(a.nome)}</span>
            <span class="peso-barra" role="img" aria-label="${pts(a.impacto)}"><span style="width:${Math.max(3, Math.min(100, Math.round(a.impacto / IMPACTO_BARRA_CHEIA * 100)))}%"></span></span>
            <small><span>${a.impactoAlto ? 'impacto alto' : a.faixa === 'medio' ? 'impacto médio' : 'impacto baixo'}</span><span class="n">${a.impacto}</span></small>
          </a>`).join('')}
      </div>
    </section>

    <section class="sec" aria-labelledby="t-matriz">
      ${rot(2, 'A matriz')}
      <h2 id="t-matriz">Impacto na rotina × esforço para resolver</h2>
      <p class="dica">O impacto define a urgência. O esforço mostra o tamanho do trabalho: leve quando os móveis principais já estão no lugar, maior quando faltam móveis ou o ambiente não funciona para a rotina.</p>
      ${htmlMatriz(res)}
    </section>

    <section class="sec" aria-labelledby="t-ordem">
      ${rot(3, 'A ordem')}
      <h2 id="t-ordem">Ambiente por ambiente</h2>
      <ol class="ranking">
        ${res.ambientes.map((a, i) => `
          <li class="q${a.quadrante}" id="r-${h(a.id)}">
            <span class="rk-n">${i + 1}</span>
            <div>
              <div class="rk-cab"><span class="rk-nome">${h(a.nome)}</span><span class="selo">${h(a.quadranteNome)}</span></div>
              <p><b>Por quê.</b> ${h(a.porque)}</p>
              <p><b>Direção.</b> ${h(a.direcao)}</p>
              <p class="rk-pontos">${pts(a.impacto)} de impacto · esforço ${a.esforcoLeve ? 'leve' : 'maior'}</p>
            </div>
          </li>`).join('')}
      </ol>
    </section>

    <section class="convite">
      <p class="convite-abre">${h(res.convite.abertura)}</p>
      <p>${h(res.convite.texto)}</p>
      <div class="passo">
        ${rot(0, 'O próximo passo')}
        <p>${negrito(h(res.caminho.frase))}</p>
      </div>
      <p class="citacao">${h(res.convite.fecho)}</p>
      ${ASSINATURA}
    </section>

    <div class="acoes nao-imprimir">
      ${ig ? `<a class="btn" href="${ig}" target="_blank" rel="noopener">Conversar no direct</a>` : ''}
      <button class="btn sec-btn" type="button" id="imprimir">Salvar em PDF</button>
    </div>

    <details class="metodo">
      <summary>Como este diagnóstico é calculado</summary>
      <div class="metodo-corpo">
        <p>Cada ambiente recebe duas avaliações, a partir das suas respostas.</p>
        <p><b>Impacto na rotina</b>, em pontos:</p>
        <ul>
          <li>o quanto o ambiente incomoda (0 a 3) multiplicado pela frequência de uso (1 a 3);</li>
          <li>2 pontos para cada atrito ou falta da casa ligado a ele;</li>
          <li>1 ponto se você evita mostrá-lo a visitas;</li>
          <li>2 pontos se é o ambiente que você gostaria de ver pronto primeiro.</li>
        </ul>
        <p>A partir de ${IMPACTO_ALTO} pontos, o impacto é alto.</p>
        <p><b>Esforço para resolver</b>: leve quando os móveis principais já estão no lugar ou quando você gosta do ambiente como está; maior quando ele está vazio, tem móveis provisórios ou não funciona para a rotina.</p>
        <p>A ordem segue a matriz: primeiro os ambientes de impacto alto e esforço leve, depois os de impacto alto e esforço maior, e então os demais. No mesmo quadrante, vem antes o de maior impacto.</p>
        <p class="nota">O diagnóstico organiza as prioridades. Medidas, estilo e escolhas de cada ambiente são definidos no projeto.</p>
      </div>
    </details>`;
}

// ---------- Desenho ----------

// Se algo salvo no celular não combinar com esta versão, recomeça em vez de deixar a tela em branco.
function render() {
  try {
    desenharTela();
  } catch (e) {
    console.error(e);
    const codigo = st.codigo;
    st = novoRascunho();
    st.codigo = codigo;
    salvar();
    desenharTela();
  }
}

function desenharTela() {
  const lista = passos();
  if (st.passo === 'resultado' && !st.resultado) st.passo = 'momento';
  if (!lista.includes(st.passo)) st.passo = 'casa';
  const [tipo, arg] = st.passo.split(':');
  const tela = TELAS[tipo];
  const i = lista.indexOf(st.passo);
  const mostraVoltar = i > 1 && tipo !== 'resultado';

  document.body.dataset.tela = tipo;
  barra.style.width = tipo === 'senha' ? '0%' : `${Math.round((i / (lista.length - 1)) * 100)}%`;

  app.innerHTML = `
    ${tela.html(arg)}
    ${tela.semContinuar ? '' : `
      <div class="nav">
        ${mostraVoltar ? '<button type="button" class="voltar" id="voltar">Voltar</button>' : '<span></span>'}
        <button type="button" class="btn" id="continuar">${tela.botao || 'Continuar'}</button>
      </div>`}`;
  atualizarContinuar();
}

function atualizarContinuar() {
  const b = document.getElementById('continuar');
  if (!b) return;
  const [tipo, arg] = st.passo.split(':');
  b.disabled = enviando || !TELAS[tipo].valido(arg);
}

function irPara(passo) {
  st.passo = passo;
  salvar();
  render();
  // Animação de entrada só na troca de tela (não a cada toque numa opção).
  app.classList.remove('entra'); void app.offsetWidth; app.classList.add('entra');
  clearTimeout(irPara.t); irPara.t = setTimeout(() => app.classList.remove('entra'), 600);
  window.scrollTo({ top: 0 });
  app.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
}

function avancar() {
  const lista = passos();
  irPara(lista[lista.indexOf(st.passo) + 1]);
}

// ---------- Interação ----------

function alternar(lista, v) {
  const i = lista.indexOf(v);
  if (i >= 0) lista.splice(i, 1); else lista.push(v);
}

function escolher(grupo, v) {
  const r = st.r;
  const [tipo, ambId] = st.passo.split(':');
  if (tipo === 'amb') {
    const a = (r.porAmbiente[ambId] ||= {});
    a[grupo] = grupo === 'estado' ? v : Number(v);
  } else if (['moradores', 'travas'].includes(grupo)) {
    alternar(r[grupo], v);
  } else if (grupo === 'referencias') {
    // "Não costumo salvar" não combina com os outros.
    if (v === 'nao') r.referencias = r.referencias.includes('nao') ? [] : ['nao'];
    else { r.referencias = r.referencias.filter((id) => id !== 'nao'); alternar(r.referencias, v); }
  } else if (grupo === 'ambientes') {
    alternar(r.ambientes, v);
    const ordem = P.AMBIENTES.map((a) => a.id);
    r.ambientes.sort((x, y) => ordem.indexOf(x) - ordem.indexOf(y));
    // Respostas que apontavam para um ambiente desmarcado precisam ser escolhidas de novo.
    r.evita = r.evita.filter((id) => id === 'nenhum' || r.ambientes.includes(id));
    // Atritos e faltas que apontavam para um ambiente desmarcado são refeitos com os ambientes de agora.
    [['atritos', P.ATRITOS], ['faltas', P.FALTAS]].forEach(([chave, lista]) => r[chave].forEach((x) => {
      const o = lista.find((y) => y.id === x.id);
      if (!o.nenhum && !r.ambientes.includes(x.amb)) x.amb = ambienteFixo(o);
    }));
    if (!r.ambientes.includes(r.prioridade)) r.prioridade = '';
  } else if (grupo === 'evita') {
    // "Nenhum" não combina com os outros.
    if (v === 'nenhum') r.evita = r.evita.includes('nenhum') ? [] : ['nenhum'];
    else { r.evita = r.evita.filter((id) => id !== 'nenhum'); alternar(r.evita, v); }
  } else if (grupo === 'atritos' || grupo === 'faltas') {
    const lista = grupo === 'atritos' ? P.ATRITOS : P.FALTAS;
    const opcao = lista.find((o) => o.id === v);
    const sel = r[grupo];
    const i = sel.findIndex((x) => x.id === v);
    if (i >= 0) sel.splice(i, 1);
    else if (opcao.nenhum) sel.splice(0, sel.length, { id: v, amb: '' });
    else {
      const j = sel.findIndex((x) => lista.find((o) => o.id === x.id).nenhum);
      if (j >= 0) sel.splice(j, 1);
      if (sel.length < P.MAX_ESCOLHAS) sel.push({ id: v, amb: ambienteFixo(opcao), texto: '' });
    }
  } else {
    r[grupo] = v;
    if (grupo === 'origem' && v !== 'indicacao') r.indicacao = '';
  }
  salvar();
  const y = window.scrollY;
  render();
  window.scrollTo({ top: y });
  app.querySelector(`[data-grupo="${grupo}"][data-v="${CSS.escape(v)}"]`)?.focus({ preventScroll: true });
}

app.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.grupo) return escolher(b.dataset.grupo, b.dataset.v);
  if (b.dataset.acao === 'comecar') return avancar();
  if (b.id === 'voltar') {
    const lista = passos();
    return irPara(lista[Math.max(1, lista.indexOf(st.passo) - 1)]);
  }
  if (b.id === 'continuar') return st.passo === 'momento' ? concluir() : avancar();
  if (b.id === 'imprimir') return window.print();
});

app.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset.campo) {
    st.r[el.dataset.campo] = el.type === 'checkbox' ? el.checked : el.value;
  } else if (el.dataset.texto) {
    st.r[el.dataset.texto][Number(el.dataset.i)].texto = el.value;
  } else if (el.dataset.amb) {
    st.r[el.dataset.amb][Number(el.dataset.i)].amb = el.value;
  } else if (el.id === 'codigo') {
    st.codigo = el.value;
    return;
  } else return;
  salvar();
  atualizarContinuar();
});
const MOTIVOS = {
  invalida: 'Não encontrei essa senha. Confira as letras e tente de novo.',
  usada: 'Essa senha já foi usada. Se quiser refazer o diagnóstico, me chama no direct.',
  expirada: 'Essa senha expirou. Me chama no direct que eu envio uma nova.',
  consentimento: 'Para enviar, marque a caixa de consentimento.',
  dados: 'Algo nas respostas não ficou certo. Recarregue a página e tente de novo.',
};

app.addEventListener('submit', async (ev) => {
  if (ev.target.id !== 'f-senha') return;
  ev.preventDefault();
  const erro = document.getElementById('erro-senha');
  const botao = ev.target.querySelector('button');
  const codigo = normalizarSenha(document.getElementById('codigo').value);
  if (!codigo) { erro.textContent = 'Digite a senha.'; return; }
  botao.disabled = true;
  erro.textContent = '';
  try {
    const v = await verificarSenha(codigo);
    if (!v.ok) { erro.textContent = MOTIVOS[v.motivo] || MOTIVOS.invalida; return; }
    if (st.codigo && normalizarSenha(st.codigo) !== codigo && st.passo !== 'senha') st = novoRascunho();
    st.codigo = codigo;
    if (v.nome && !st.r.nome) st.r.nome = v.nome;
    avancar();
  } catch {
    erro.textContent = 'Não consegui conferir a senha agora. Verifique a internet e tente de novo.';
  } finally {
    botao.disabled = false;
  }
});

async function concluir() {
  const erro = document.getElementById('erro-envio');
  enviando = true;
  atualizarContinuar();
  erro.textContent = '';
  const respostas = { ...st.r, nome: st.r.nome.trim(), email: st.r.email.trim(), instagram: st.r.instagram.trim().replace(/^@/, '') };
  const resultado = calcular(respostas);
  try {
    const v = await enviarDiagnostico(st.codigo, respostas, resultado);
    if (!v.ok) { erro.textContent = MOTIVOS[v.motivo] || MOTIVOS.dados; return; }
    st.resultado = resultado;
    irPara('resultado');
  } catch {
    erro.textContent = 'Não consegui enviar agora. Verifique a internet e toque de novo em "Ver o meu diagnóstico". As suas respostas estão guardadas.';
  } finally {
    enviando = false;
    atualizarContinuar();
  }
}

// ---------- Início ----------

const daUrl = new URLSearchParams(location.search).get('s');
if (daUrl && (st.passo === 'senha' || st.passo === 'resultado' && normalizarSenha(daUrl) !== st.codigo)) {
  if (st.passo === 'resultado') st = novoRascunho();
  st.codigo = normalizarSenha(daUrl);
}
render();
// Link com o código embutido (ex.: o link do perfil, ?s=PERFIL): entra direto, sem digitar a senha.
if (daUrl && st.passo === 'senha') document.getElementById('f-senha')?.requestSubmit();
