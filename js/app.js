// O aplicativo do cliente: senha → perguntas → resultado.

import { CONFIG } from './config.js';
import * as P from './perguntas.js';
import { calcular, faixaSaude } from './diagnostico.js';
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
      nome: '', email: '', instagram: '', moradores: [],
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

function seletorAmbiente(grupo, idx, valor, candidatos) {
  const meus = st.r.ambientes;
  const lista = candidatos ?? [...meus, ...P.AMBIENTES.map((a) => a.id).filter((id) => !meus.includes(id))];
  return `<label class="sub">Em qual ambiente?
    <select data-amb="${grupo}" data-i="${idx}">
      <option value="">Escolha</option>
      ${lista.map((id) => `<option value="${id}"${valor === id ? ' selected' : ''}>${h(P.nomeAmbiente(id))}${meus.includes(id) ? '' : ' (não tenho)'}</option>`).join('')}
    </select></label>`;
}

// Candidatos de uma opção cujo ambiente a pessoa precisa escolher; null = vale o ambiente fixo.
function candidatos(opcao) {
  if (opcao.nenhum) return null;
  if (typeof opcao.amb === 'string') return null;
  if (Array.isArray(opcao.amb)) {
    const meus = opcao.amb.filter((id) => st.r.ambientes.includes(id));
    if (meus.length === 1) return null;
    return meus.length ? meus : opcao.amb;
  }
  return undefined; // qualquer ambiente
}
function ambienteFixo(opcao) {
  if (typeof opcao.amb === 'string') return opcao.amb;
  if (Array.isArray(opcao.amb)) {
    const meus = opcao.amb.filter((id) => st.r.ambientes.includes(id));
    if (meus.length === 1) return meus[0];
  }
  return '';
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

const TELAS = {
  senha: {
    html: () => `
      <p class="eyebrow">Gabriele Pinheiro · Design de interiores online</p>
      <h1 tabindex="-1">Diagnóstico da Casa</h1>
      <p class="lede">Para começar, digite a senha que você recebeu no direct do Instagram.</p>
      <form id="f-senha" class="senha" novalidate>
        <label for="codigo">Senha</label>
        <input id="codigo" name="codigo" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${h(st.codigo)}" required>
        <p class="erro" id="erro-senha" role="alert"></p>
        <button class="btn" type="submit">Entrar</button>
      </form>
      <p class="ajuda">Ainda não tem a senha? Envie <b>${h(CONFIG.palavraChave)}</b> no direct ${CONFIG.instagram
        ? `de <a href="https://instagram.com/${encodeURIComponent(CONFIG.instagram)}" target="_blank" rel="noopener">@${h(CONFIG.instagram)}</a>`
        : 'do meu Instagram'} e eu envio a sua.</p>
      ${modoDemo ? '<p class="aviso">Modo de teste: use a senha <b>DEMO</b>.</p>' : ''}`,
    semContinuar: true,
  },
  abertura: {
    html: () => `
      <p class="eyebrow">Diagnóstico da Casa</p>
      <h1 tabindex="-1">Toda casa tem um ambiente que tira a nossa paz.</h1>
      <p class="lede">Às vezes sabemos qual é; às vezes só sentimos que algo não está bem.</p>
      <p>Em cerca de 6 minutos, você me conta como se sente na sua casa hoje. No fim, recebe os seus ambientes em ordem de prioridade e uma direção de por onde começar.</p>
      <p class="assinatura">Gabriele Pinheiro</p>`,
    botao: 'Começar',
    valido: () => true,
  },
  voce: {
    html: () => `
      <p class="eyebrow">1 · Você</p>
      <h2 tabindex="-1">Primeiro, um pouco sobre você</h2>
      <label class="campo">Seu nome<input type="text" data-campo="nome" value="${h(st.r.nome)}" autocomplete="name" maxlength="120"></label>
      <label class="campo">E-mail <small>para receber o diagnóstico</small><input type="email" data-campo="email" value="${h(st.r.email)}" autocomplete="email" inputmode="email" maxlength="160"></label>
      <label class="campo">Seu @ no Instagram <small>opcional</small><input type="text" data-campo="instagram" value="${h(st.r.instagram)}" autocapitalize="none" spellcheck="false" maxlength="60" placeholder="@"></label>
      <fieldset><legend>Quem mora na casa com você?</legend>
      ${escolhas('moradores', P.MORADORES, st.r.moradores, { multi: true })}</fieldset>`,
    valido: () => st.r.nome.trim() && emailValido(st.r.email) && st.r.moradores.length,
  },
  casa: {
    html: () => `
      <p class="eyebrow">2 · A sua casa</p>
      <h2 tabindex="-1">Quais destes ambientes existem na sua casa?</h2>
      <p class="dica">Marque todos que existem. Em seguida, uma tela rápida para cada um.</p>
      ${escolhas('ambientes', P.AMBIENTES, st.r.ambientes, { multi: true })}`,
    valido: () => st.r.ambientes.length > 0,
  },
  amb: {
    html: (id) => {
      const a = st.r.porAmbiente[id] || {};
      const n = st.r.ambientes.indexOf(id) + 1;
      return `
      <p class="eyebrow">Ambiente ${n} de ${st.r.ambientes.length}</p>
      <h2 tabindex="-1">${h(P.nomeAmbiente(id))}</h2>
      <fieldset><legend>Quanto este ambiente tira a sua paz hoje?</legend>${escolhas('paz', P.PAZ, a.paz)}</fieldset>
      <fieldset><legend>Com que frequência você usa este ambiente?</legend>${escolhas('freq', P.FREQ, a.freq)}</fieldset>
      <fieldset><legend>Como ele está hoje?</legend>${escolhas('estado', P.ESTADO, a.estado)}</fieldset>`;
    },
    valido: (id) => { const a = st.r.porAmbiente[id]; return a && a.paz != null && a.freq != null && a.estado; },
  },
  atritos: {
    html: () => `
      <p class="eyebrow">3 · O que atrapalha a sua rotina</p>
      <h2 tabindex="-1">Se você fosse listar até 3 coisas que atrapalham a sua rotina hoje, quais seriam?</h2>
      <p class="dica">Até 3 opções.</p>
      ${blocoEscolhaAmbiente('atritos', P.ATRITOS)}`,
    valido: () => listaCompleta('atritos', P.ATRITOS),
  },
  faltas: {
    html: () => `
      <p class="eyebrow">4 · O que falta na sua casa</p>
      <h2 tabindex="-1">Existe alguma coisa que a sua casa precisa ter, não tem, e isso te atrapalha?</h2>
      <p class="dica">Até 3 opções.</p>
      ${blocoEscolhaAmbiente('faltas', P.FALTAS)}`,
    valido: () => st.r.faltas.length > 0 && listaCompleta('faltas', P.FALTAS),
  },
  sente: {
    html: () => {
      const meus = st.r.ambientes.map((id) => ({ id, t: P.nomeAmbiente(id) }));
      return `
      <p class="eyebrow">5 · Como você se sente</p>
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
      <p class="eyebrow">6 · Os seus planos</p>
      <h2 tabindex="-1">O momento da casa</h2>
      <fieldset><legend>O imóvel é próprio ou alugado?</legend>${escolhas('imovel', P.IMOVEL, st.r.imovel)}</fieldset>
      <fieldset><legend>Por quanto tempo você pretende ficar neste imóvel?</legend>${escolhas('tempo', P.TEMPO, st.r.tempo)}</fieldset>
      <fieldset><legend>Você tem vontade de pintar paredes ou colocar papel de parede?</legend>${escolhas('pintura', P.PINTURA, st.r.pintura)}</fieldset>
      <fieldset><legend>Quando você gostaria de começar?</legend>${escolhas('inicio', P.INICIO, st.r.inicio)}</fieldset>`,
    valido: () => st.r.imovel && st.r.tempo && st.r.pintura && st.r.inicio,
  },
  decoracao: {
    html: () => `
      <p class="eyebrow">7 · Você e a decoração</p>
      <h2 tabindex="-1">Agora, um pouco sobre você e a decoração</h2>
      <fieldset><legend>O quanto você acompanha perfis de decoração?</legend>${escolhas('acompanha', P.ACOMPANHA, st.r.acompanha)}</fieldset>
      <fieldset><legend>Você costuma salvar referências?</legend>
        <p class="dica">Pode marcar mais de uma.</p>${escolhas('referencias', P.REFERENCIAS, st.r.referencias, { multi: true })}</fieldset>
      <fieldset><legend>Quando você vai decorar ou comprar um móvel, o que mais te trava?</legend>
        <p class="dica">Pode marcar mais de uma.</p>${escolhas('travas', P.TRAVAS, st.r.travas, { multi: true })}</fieldset>`,
    valido: () => st.r.acompanha && st.r.referencias.length && st.r.travas.length,
  },
  momento: {
    html: () => `
      <p class="eyebrow">8 · Para fechar</p>
      <h2 tabindex="-1">Última tela</h2>
      <fieldset><legend>Como você conheceu o escritório?</legend>${escolhas('origem', P.ORIGEM, st.r.origem)}
        ${st.r.origem === 'indicacao' ? `<label class="sub">Nome de quem indicou<input type="text" data-campo="indicacao" value="${h(st.r.indicacao)}" maxlength="120"></label>` : ''}</fieldset>
      <label class="consentimento"><input type="checkbox" data-campo="consentimento"${st.r.consentimento ? ' checked' : ''}>
        <span>Concordo que o escritório GP. guarde estas respostas para preparar o meu diagnóstico e entrar em contato comigo. Posso pedir a exclusão a qualquer momento.</span></label>
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
    return !!x.amb;
  });
}

function htmlResultado() {
  const res = st.resultado;
  if (!res) return '';
  const primeiroNome = st.r.nome.trim().split(/\s+/)[0];
  const ig = linkInstagram();
  const ordemCasa = [...res.ambientes].sort((x, y) => st.r.ambientes.indexOf(x.id) - st.r.ambientes.indexOf(y.id) || (x.existe ? 0 : 1) - (y.existe ? 0 : 1));
  const geral = faixaSaude(res.saude);
  return `
    <p class="eyebrow">O diagnóstico da sua casa</p>
    <h1 tabindex="-1">Preparado para ${h(primeiroNome)}</h1>
    <section class="saude" aria-labelledby="t-saude">
      <div class="saude-cab">
        <h2 id="t-saude">Saúde da casa</h2>
        <p class="saude-nota ${geral.id}"><b>${res.saude}</b>/100</p>
      </div>
      <p class="dica">Toque num ambiente para ver o porquê.</p>
      <div class="saude-grade">
        ${ordemCasa.map((a) => {
          const f = faixaSaude(a.saude);
          return `<a class="comodo ${f.id}" href="#r-${h(a.id)}">
            <span class="comodo-nome">${h(a.nome)}</span>
            <span class="comodo-barra" role="img" aria-label="Saúde ${a.saude} de 100"><span style="width:${Math.max(a.saude, 4)}%"></span></span>
            <small>${a.existe ? f.nome : 'ainda não existe'}</small></a>`;
        }).join('')}
      </div>
    </section>
    <section class="estado estado-${res.estado.id}">
      <p class="eyebrow">Estado geral</p>
      <p class="estado-nome">${h(res.estado.nome)}</p>
      <p>${h(res.estado.frase)}</p>
    </section>
    <h2 class="sec">Por onde começar</h2>
    <ol class="ranking">
      ${res.ambientes.map((a) => `
        <li class="q${a.quadrante}" id="r-${h(a.id)}">
          <div class="rk-cab"><span class="rk-nome">${h(a.nome)}</span><span class="selo">${a.quadrante} · ${h(a.quadranteNome)}</span></div>
          <p><b>Por quê:</b> ${h(a.porque)}</p>
          <p><b>Direção:</b> ${h(a.direcao)}</p>
        </li>`).join('')}
    </ol>
    <section class="convite">
      <p class="convite-abre">${h(res.convite.abertura)}</p>
      <p>${h(res.convite.texto)}</p>
      <p>${h(res.convite.fecho)}</p>
      <p class="eyebrow passo-titulo">O seu próximo passo</p>
      <p>${h(res.caminho.frase)}</p>
      <p class="assinatura">Gabriele Pinheiro</p>
      <p class="rodape">Design de interiores online</p>
    </section>
    <div class="acoes nao-imprimir">
      ${ig ? `<a class="btn" href="${ig}" target="_blank" rel="noopener">Falar comigo no direct</a>` : ''}
      <button class="btn sec-btn" type="button" id="imprimir">Salvar em PDF</button>
    </div>`;
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
