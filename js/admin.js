// Painel do escritório: senhas para o direct e diagnósticos recebidos.

import { CONFIG } from './config.js';
import * as P from './perguntas.js';
import { textoResultado, faixaSaude } from './diagnostico.js';
import * as api from './api.js';

const painel = document.getElementById('painel');
const abas = document.getElementById('abas');
const botaoSair = document.getElementById('sair');
const toast = document.getElementById('toast');

const h = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const data = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const linkApp = () => new URL('./', location.href).href;
const linkComSenha = (codigo) => `${linkApp()}?s=${encodeURIComponent(codigo)}`;

const STATUS = { novo: 'Novo', respondido: 'Respondido', arquivado: 'Arquivado' };

let aba = 'diagnosticos';
let filtro = 'novo';
let aberto = null; // id do diagnóstico aberto
let diagnosticos = [];
let senhas = [];
let ultimaSenha = null;

function avisar(t) {
  toast.textContent = t;
  toast.classList.add('on');
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => toast.classList.remove('on'), 2200);
}

async function copiar(texto, aviso = 'Copiado') {
  try { await navigator.clipboard.writeText(texto); avisar(aviso); }
  catch { window.prompt('Copie o texto:', texto); }
}

async function tentar(fn) {
  try { return await fn(); }
  catch (e) {
    if (e.status === 401) { await api.sair(); telaLogin('A sessão expirou. Entre de novo.'); return; }
    avisar(e.code === '23505' ? 'Essa senha já existe. Escolha outra.' : 'Não deu certo: ' + e.message);
    throw e;
  }
}

// ---------- Mensagens para o direct ----------

function mensagemDirect(s) {
  const ola = s.nome ? `Oi, ${s.nome.trim().split(/\s+/)[0]}!` : 'Oi!';
  return `${ola} Que bom que você quer olhar para a sua casa com calma.

A sua senha para o Diagnóstico da Casa é: ${s.codigo}

É só abrir ${s.tipo === 'individual' ? linkComSenha(s.codigo) : linkApp()} e digitar a senha. Leva cerca de 6 minutos e, no fim, você recebe os seus ambientes em ordem de prioridade e por onde começar.

Qualquer dúvida, é só me chamar aqui.
Gabriele`;
}

// ---------- Login ----------

function telaLogin(msg = '') {
  abas.hidden = true;
  botaoSair.hidden = true;
  painel.innerHTML = `
    <form class="login cartao" id="f-login">
      <p class="eyebrow">Painel do escritório</p>
      <h1>Diagnóstico da Casa</h1>
      ${api.modoDemo ? '<p class="aviso">Modo de teste: o Supabase ainda não está configurado. Entre com qualquer e-mail e senha. Os dados ficam só neste navegador.</p>' : ''}
      <label class="campo">E-mail<input type="email" name="email" autocomplete="username" required></label>
      <label class="campo">Senha<input type="password" name="senha" autocomplete="current-password" required></label>
      <p class="erro" role="alert">${h(msg)}</p>
      <button class="btn" type="submit">Entrar</button>
    </form>`;
}

painel.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  if (f.id === 'f-login') return login(f);
  if (f.id === 'f-individual') return novaIndividual(f);
  if (f.id === 'f-campanha') return novaCampanha(f);
});

async function login(f) {
  const erro = f.querySelector('.erro');
  const botao = f.querySelector('button');
  botao.disabled = true;
  erro.textContent = '';
  try {
    await api.entrar(f.email.value.trim(), f.senha.value);
    if (!(await api.souEquipe())) {
      await api.sair();
      erro.textContent = 'Este e-mail entrou, mas não está na tabela "equipe" do Supabase. Veja o passo 2 do GUIA.md.';
      return;
    }
    iniciar();
  } catch (e) {
    erro.textContent = e.status === 400 ? 'E-mail ou senha incorretos.' : 'Não consegui entrar: ' + e.message;
  } finally {
    botao.disabled = false;
  }
}

botaoSair.addEventListener('click', async () => { await api.sair(); telaLogin(); });

abas.addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-aba]');
  if (!b) return;
  aba = b.dataset.aba;
  aberto = null;
  desenhar();
});

// ---------- Desenho ----------

async function iniciar() {
  abas.hidden = false;
  botaoSair.hidden = false;
  painel.innerHTML = '<p class="vazio">Carregando…</p>';
  await recarregar();
}

async function recarregar() {
  [diagnosticos, senhas] = await tentar(() => Promise.all([api.listarDiagnosticos(), api.listarSenhas()])) || [[], []];
  desenhar();
}

function desenhar() {
  const novos = diagnosticos.filter((d) => d.status === 'novo').length;
  abas.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aba === aba)));
  abas.querySelector('[data-aba=diagnosticos]').innerHTML = `Diagnósticos${novos ? ` <span class="cont">(${novos})</span>` : ''}`;
  if (aba === 'senhas') painel.innerHTML = htmlSenhas();
  else if (aba === 'publico') painel.innerHTML = htmlPublico();
  else if (aberto) painel.innerHTML = htmlDetalhe(diagnosticos.find((d) => d.id === aberto));
  else painel.innerHTML = htmlLista();
}

function htmlLista() {
  const lista = filtro === 'todos' ? diagnosticos : diagnosticos.filter((d) => d.status === filtro);
  const contar = (s) => diagnosticos.filter((d) => d.status === s).length;
  return `
    ${api.modoDemo ? '<p class="aviso">Modo de teste: os dados ficam só neste navegador.</p>' : ''}
    <div class="filtros" role="group" aria-label="Filtrar">
      ${['novo', 'respondido', 'arquivado', 'todos'].map((f) => `<button type="button" data-filtro="${f}" aria-pressed="${filtro === f}">${f === 'todos' ? `Todos (${diagnosticos.length})` : `${STATUS[f]} (${contar(f)})`}</button>`).join('')}
      <button type="button" data-acao="recarregar">Atualizar</button>
    </div>
    <div class="lista">
      ${lista.length ? lista.map((d) => `
        <button type="button" class="item" data-abrir="${h(d.id)}">
          <span><span class="nome">${h(d.nome)}</span>
            <span class="meta">${d.instagram ? '@' + h(d.instagram) + ' · ' : ''}${h(dataHora(d.criado_em))}</span><br>
            <span class="meta">${h(d.estado)} · Caminho: ${h(d.caminho)} · Nº 1: ${h(d.resultado?.ambientes?.[0]?.nome)}</span></span>
          <span class="dir"><span class="pilula ${d.status === 'novo' ? 'novo' : ''}">${h(STATUS[d.status])}</span>
            ${d.respostas?.inicio === 'mes' ? '<span class="pilula ok">Quer começar este mês</span>' : ''}</span>
        </button>`).join('') : '<p class="vazio">Nenhum diagnóstico aqui ainda.</p>'}
    </div>`;
}

function evitaTxt(evita) {
  const ids = (Array.isArray(evita) ? evita : [evita]).filter((id) => id && id !== 'nenhum');
  return ids.length ? ids.map(P.nomeAmbiente).join(', ') : 'Nenhum';
}

function lista(opcoes, ids) {
  return (ids || []).map((id) => rotulo(opcoes, id)).join(' · ') || '—';
}

function rotulo(lista, id) { return lista.find((o) => (o.v ?? o.id) === id)?.t ?? id; }

function htmlDetalhe(d) {
  if (!d) return '<p class="vazio">Diagnóstico não encontrado.</p>';
  const r = d.respostas;
  const res = d.resultado;
  const escolhaTxt = (lista, x) => `${x.texto || rotulo(lista, x.id)}${x.amb ? ` → ${P.nomeAmbiente(x.amb)}` : ''}`;
  return `
    <button type="button" class="voltar" data-acao="voltar">← Todos os diagnósticos</button>
    <div class="cartao">
      <div class="det-cab">
        <div><p class="eyebrow">Recebido em ${h(dataHora(d.criado_em))} · senha ${h(d.codigo)}</p>
          <h1>${h(d.nome)}</h1>
          <p><a href="mailto:${h(d.email)}">${h(d.email)}</a>${d.instagram ? ` · <a href="https://instagram.com/${encodeURIComponent(d.instagram)}" target="_blank" rel="noopener">@${h(d.instagram)}</a>` : ''}</p></div>
        <label class="sub">Status
          <select data-status="${h(d.id)}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${d.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <div class="det-acoes">
        <button type="button" class="btn" data-acao="email">Enviar por e-mail</button>
        <button type="button" class="btn sec-btn" data-acao="copiar-texto">Copiar resultado</button>
        <button type="button" class="btn sec-btn" data-acao="copiar-notion">Copiar para o Notion</button>
      </div>
    </div>
    <div class="grade2">
      <section class="cartao">
        <p class="eyebrow">Estado geral</p>
        <h2>${h(res.estado.nome)}</h2>
        <p>${h(res.estado.frase)}</p>
        <p class="pontos">${h(res.estado.impactoAlto)} ambiente(s) com impacto alto${res.saude != null ? ` · Saúde da casa ${h(res.saude)}/100` : ''}</p>
      </section>
      <section class="cartao">
        <p class="eyebrow">Caminho indicado</p>
        <h2>${h(res.caminho.linha)}</h2>
        <p>${h(res.caminho.ambientes.map(P.nomeAmbiente).join(', ') || 'Casa inteira')}</p>
        <p class="nota-interna"><b>Para o escritório:</b> ${h(res.caminho.nota)}</p>
      </section>
    </div>
    <section class="cartao">
      <p class="eyebrow">Ambientes em ordem</p>
      <ol class="ranking">
        ${res.ambientes.map((a) => `
          <li class="q${h(a.quadrante)}">
            <div class="rk-cab"><span class="rk-nome">${h(a.nome)}${a.existe ? '' : ' <small>(não existe hoje)</small>'}</span><span class="selo">${h(a.quadrante)} · ${h(a.quadranteNome)}</span></div>
            <p><b>Por quê:</b> ${h(a.porque)}</p>
            <p class="pontos">${a.saude != null ? `Saúde ${h(a.saude)} · ` : ""}Impacto ${h(a.impacto)} = paz × uso ${h(a.pontos.pazFrequencia)} + atritos ${h(a.pontos.atritos)} + faltas ${h(a.pontos.faltas)} + evita ${h(a.pontos.evita)} + prioridade ${h(a.pontos.prioridade)}
              · Esforço ${a.esforcoLeve ? 'leve' : 'maior'}${a.existe ? ` (${h(rotulo(P.ESTADO, a.estado))})` : ''}</p>
          </li>`).join('')}
      </ol>
    </section>
    <section class="cartao">
      <p class="eyebrow">Respostas</p>
      <dl class="resp">
        <dt>Quem mora</dt><dd>${h(r.moradores.map((m) => rotulo(P.MORADORES, m)).join(', '))}</dd>
        ${r.ambientes.map((id) => {
          const a = r.porAmbiente[id];
          return `<dt>${h(P.nomeAmbiente(id))}</dt><dd>Paz: ${h(rotulo(P.PAZ, a.paz))} · Uso: ${h(rotulo(P.FREQ, a.freq))} · ${h(rotulo(P.ESTADO, a.estado))}</dd>`;
        }).join('')}
        <dt>Atritos da rotina (P8)</dt><dd>${h(r.atritos.map((x) => escolhaTxt(P.ATRITOS, x)).join(' · ') || 'Nenhum')}</dd>
        <dt>O que falta (P9)</dt><dd>${h(r.faltas.map((x) => escolhaTxt(P.FALTAS, x)).join(' · '))}</dd>
        <dt>Evita mostrar (P10)</dt><dd>${h(evitaTxt(r.evita))}</dd>
        <dt>Pronto este mês (P11)</dt><dd>${h(P.nomeAmbiente(r.prioridade))}</dd>
        <dt>Imóvel</dt><dd>${h(rotulo(P.IMOVEL, r.imovel))}</dd>
        <dt>Tempo no imóvel</dt><dd>${h(rotulo(P.TEMPO, r.tempo))}</dd>
        <dt>Mudar paredes</dt><dd>${h(rotulo(P.PINTURA, r.pintura))}</dd>
        <dt>Quando começar</dt><dd>${h(rotulo(P.INICIO, r.inicio))}</dd>
        <dt>Acompanha decoração</dt><dd>${h(rotulo(P.ACOMPANHA, r.acompanha))}</dd>
        <dt>Referências</dt><dd>${h(lista(P.REFERENCIAS, r.referencias))}</dd>
        <dt>O que trava</dt><dd>${h(lista(P.TRAVAS, r.travas))}</dd>
        <dt>Como conheceu</dt><dd>${h(rotulo(P.ORIGEM, r.origem))}${r.indicacao ? ` · indicação de ${h(r.indicacao)}` : ''}</dd>
      </dl>
    </section>`;
}

// Público: soma as respostas de todos os diagnósticos.
function contagem(opcoes, valores) {
  const n = {};
  valores.forEach((v) => [].concat(v ?? []).forEach((id) => { n[id] = (n[id] || 0) + 1; }));
  return opcoes.map((o) => ({ t: o.t, n: n[o.v ?? o.id] || 0 })).sort((a, b) => b.n - a.n);
}

function blocoPublico(titulo, opcoes, valores, nota = '') {
  const total = valores.filter((v) => v != null && v !== '' && !(Array.isArray(v) && !v.length)).length;
  const linhas = contagem(opcoes, valores).filter((l) => l.n);
  return `<section class="cartao">
    <p class="eyebrow">${h(titulo)}</p>
    ${nota ? `<p class="dica">${h(nota)}</p>` : ''}
    ${linhas.length ? `<div class="barras">${linhas.map((l) => {
      const pct = Math.round((l.n / total) * 100);
      return `<div class="barra-linha"><span class="barra-t">${h(l.t)}</span><span class="barra-n">${pct}% · ${l.n}</span>
        <span class="barra"><span style="width:${pct}%"></span></span></div>`;
    }).join('')}</div>` : '<p class="vazio">Ainda sem respostas.</p>'}
  </section>`;
}

function htmlPublico() {
  const rs = diagnosticos.map((d) => d.respostas || {});
  const res = diagnosticos.map((d) => d.resultado || {});
  if (!rs.length) return '<p class="vazio">Quando chegarem os primeiros diagnósticos, o resumo do seu público aparece aqui.</p>';
  const saudes = res.map((x) => x.saude).filter((n) => typeof n === 'number');
  const media = saudes.length ? Math.round(saudes.reduce((a, b) => a + b, 0) / saudes.length) : null;
  const primeiros = res.map((x) => x.ambientes?.[0]?.id);
  return `
    <div class="grade2">
      <section class="cartao"><p class="eyebrow">Diagnósticos</p><p class="codigo-grande">${diagnosticos.length}</p></section>
      <section class="cartao"><p class="eyebrow">Saúde média das casas</p><p class="codigo-grande">${media ?? '—'}${media != null ? '<small>/100</small>' : ''}</p></section>
    </div>
    <p class="dica">Porcentagem sobre quem respondeu cada pergunta. Nas perguntas de várias opções, a soma passa de 100%.</p>
    <div class="grade2">
      ${blocoPublico('O que mais trava na hora de decorar', P.TRAVAS, rs.map((r) => r.travas), 'Bom ponto de partida para conteúdo e para a sua comunicação.')}
      ${blocoPublico('Acompanha perfis de decoração', P.ACOMPANHA, rs.map((r) => r.acompanha))}
      ${blocoPublico('Onde salva referências', P.REFERENCIAS, rs.map((r) => r.referencias))}
      ${blocoPublico('Ambiente nº 1 do diagnóstico', P.AMBIENTES.map((a) => ({ id: a.id, t: a.nome })), primeiros)}
      ${blocoPublico('Caminho indicado', ['Premier', 'Essence', 'Maison', 'Personalité', 'Collection ou Essence'].map((t) => ({ id: t, t })), res.map((x) => x.caminho?.linha))}
      ${blocoPublico('Quando quer começar', P.INICIO, rs.map((r) => r.inicio))}
      ${blocoPublico('Imóvel', P.IMOVEL, rs.map((r) => r.imovel))}
      ${blocoPublico('Mudar paredes', P.PINTURA, rs.map((r) => r.pintura))}
      ${blocoPublico('Quem mora na casa', P.MORADORES, rs.map((r) => r.moradores))}
      ${blocoPublico('Tempo no imóvel', P.TEMPO, rs.map((r) => r.tempo))}
      ${blocoPublico('Como conheceu o escritório', P.ORIGEM, rs.map((r) => r.origem))}
    </div>`;
}

function htmlSenhas() {
  const nova = ultimaSenha ? `
    <div class="cartao">
      <p class="eyebrow">Senha criada</p>
      <p class="codigo-grande">${h(ultimaSenha.codigo)}</p>
      <div class="mensagem">${h(mensagemDirect(ultimaSenha))}</div>
      <button type="button" class="btn" data-copiar-msg="${h(ultimaSenha.id)}">Copiar mensagem para o direct</button>
    </div>` : '';
  return `
    ${api.modoDemo ? '<p class="aviso">Modo de teste: as senhas ficam só neste navegador e funcionam só aqui.</p>' : ''}
    ${nova}
    <div class="grade2">
      <form class="cartao" id="f-individual">
        <p class="eyebrow">Para uma pessoa</p>
        <h2>Senha individual</h2>
        <p class="dica">Vale uma vez. Use quando você responde o direct à mão.</p>
        <div class="linha-form">
          <label>Nome<input type="text" name="nome" maxlength="120" placeholder="Opcional"></label>
          <label>@ no Instagram<input type="text" name="instagram" maxlength="60" placeholder="Opcional" autocapitalize="none"></label>
          <label>Validade (dias)<input type="number" name="dias" min="1" max="365" value="${CONFIG.validadeDias}"></label>
        </div>
        <button class="btn" type="submit">Gerar senha</button>
      </form>
      <form class="cartao" id="f-campanha">
        <p class="eyebrow">Para a resposta automática</p>
        <h2>Senha da campanha</h2>
        <p class="dica">Uma palavra que todos recebem, por exemplo CASA. Vale para muitas pessoas, até a data que você escolher.</p>
        <div class="linha-form">
          <label>Senha<input type="text" name="codigo" required maxlength="20" placeholder="CASA" autocapitalize="characters"></label>
          <label>Válida até<input type="date" name="ate"></label>
          <label>Limite de usos<input type="number" name="limite" min="1" placeholder="Sem limite"></label>
        </div>
        <button class="btn" type="submit">Criar senha</button>
      </form>
    </div>
    <h2 class="sec">Todas as senhas</h2>
    <div class="tabela"><table>
      <thead><tr><th>Senha</th><th>Tipo</th><th>Para</th><th>Usos</th><th>Validade</th><th></th></tr></thead>
      <tbody>
        ${senhas.map((s) => `
          <tr class="${s.ativa ? '' : 'inativa'}">
            <td><b>${h(s.codigo)}</b></td>
            <td>${s.tipo === 'individual' ? 'Individual' : 'Campanha'}</td>
            <td>${h([s.nome, s.instagram && '@' + s.instagram, s.nota].filter(Boolean).join(' · '))}</td>
            <td>${h(s.usos)}${s.usos_max != null ? ' / ' + h(s.usos_max) : ''}</td>
            <td>${s.valida_ate ? h(data(s.valida_ate)) : 'Sem data'}</td>
            <td><button type="button" class="mini" data-copiar-msg="${h(s.id)}">Copiar mensagem</button>
              <button type="button" class="mini" data-ativar="${h(s.id)}">${s.ativa ? 'Desativar' : 'Reativar'}</button></td>
          </tr>`).join('') || '<tr><td colspan="6">Nenhuma senha ainda.</td></tr>'}
      </tbody>
    </table></div>`;
}

// ---------- Ações ----------

function markdownNotion(d) {
  const r = d.respostas;
  const res = d.resultado;
  const linhas = [
    `## Diagnóstico da Casa · ${d.nome}`,
    `Recebido em ${dataHora(d.criado_em)} · ${d.email}${d.instagram ? ' · @' + d.instagram : ''}`,
    '',
    `**Estado geral:** ${res.estado.nome} (${res.estado.impactoAlto} ambiente(s) de impacto alto)`,
    `**Caminho indicado:** ${res.caminho.linha} para ${res.caminho.ambientes.map(P.nomeAmbiente).join(', ') || 'a casa inteira'}`,
    `> ${res.caminho.nota}`,
    '',
    '| # | Ambiente | Quadrante | Impacto | Esforço |',
    '|---|---|---|---|---|',
    ...res.ambientes.map((a, i) => `| ${i + 1} | ${a.nome}${a.existe ? '' : ' (não existe hoje)'} | ${a.quadrante} · ${a.quadranteNome} | ${a.impacto} | ${a.esforcoLeve ? 'leve' : 'maior'} |`),
    '',
    '**Atritos da rotina (P8)**',
    ...(r.atritos.length ? r.atritos.map((x) => `- ${x.texto || rotulo(P.ATRITOS, x.id)} → ${P.nomeAmbiente(x.amb)}`) : ['- Nenhum']),
    '',
    '**O que falta (P9)**',
    ...r.faltas.map((x) => `- ${x.texto || rotulo(P.FALTAS, x.id)}${x.amb ? ' → ' + P.nomeAmbiente(x.amb) : ''}`),
    '',
    `**Evita mostrar:** ${evitaTxt(r.evita)} · **Pronto este mês:** ${P.nomeAmbiente(r.prioridade)}`,
    `**Tempo no imóvel:** ${rotulo(P.TEMPO, r.tempo)} · **Quem mora:** ${r.moradores.map((m) => rotulo(P.MORADORES, m)).join(', ')}`,
    `**Como conheceu:** ${rotulo(P.ORIGEM, r.origem)}${r.indicacao ? ' (' + r.indicacao + ')' : ''}`,
    `**Imóvel:** ${rotulo(P.IMOVEL, r.imovel)} · **Mudar paredes:** ${rotulo(P.PINTURA, r.pintura)} · **Quando começar:** ${rotulo(P.INICIO, r.inicio)}`,
    '',
    `**Acompanha decoração:** ${rotulo(P.ACOMPANHA, r.acompanha)}`,
    `**Referências:** ${lista(P.REFERENCIAS, r.referencias)}`,
    `**O que trava:** ${lista(P.TRAVAS, r.travas)}`,
  ];
  return linhas.join('\n');
}

painel.addEventListener('click', async (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  const d = aberto && diagnosticos.find((x) => x.id === aberto);
  if (b.dataset.filtro) { filtro = b.dataset.filtro; return desenhar(); }
  if (b.dataset.abrir) { aberto = b.dataset.abrir; desenhar(); return window.scrollTo({ top: 0 }); }
  if (b.dataset.copiarMsg) return copiar(mensagemDirect(senhas.find((s) => s.id === b.dataset.copiarMsg)), 'Mensagem copiada. Cole no direct.');
  if (b.dataset.ativar) {
    const s = senhas.find((x) => x.id === b.dataset.ativar);
    await tentar(() => api.atualizarSenha(s.id, { ativa: !s.ativa }));
    s.ativa = !s.ativa;
    return desenhar();
  }
  switch (b.dataset.acao) {
    case 'recarregar': return recarregar();
    case 'voltar': aberto = null; return desenhar();
    case 'copiar-texto': return copiar(textoResultado(d.nome, d.resultado), 'Resultado copiado');
    case 'copiar-notion': return copiar(markdownNotion(d), 'Copiado. Cole na Página do Cliente.');
    case 'email': {
      const assunto = 'O diagnóstico da sua casa';
      const corpo = `Oi, ${d.nome.split(/\s+/)[0]}!\n\nAqui está o diagnóstico da sua casa.\n\n${textoResultado(d.nome, d.resultado)}`;
      location.href = `mailto:${encodeURIComponent(d.email)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
      if (d.status === 'novo') await mudarStatus(d, 'respondido');
      return;
    }
  }
});

painel.addEventListener('change', async (ev) => {
  const id = ev.target.dataset.status;
  if (!id) return;
  await mudarStatus(diagnosticos.find((x) => x.id === id), ev.target.value);
});

async function mudarStatus(d, status) {
  await tentar(() => api.atualizarDiagnostico(d.id, { status }));
  d.status = status;
  desenhar();
  avisar(`Marcado como ${STATUS[status].toLowerCase()}`);
}

async function novaIndividual(f) {
  const dias = Math.max(1, Number(f.dias.value) || CONFIG.validadeDias);
  const dados = {
    tipo: 'individual',
    nome: f.nome.value.trim() || null,
    instagram: f.instagram.value.trim().replace(/^@/, '') || null,
    usos_max: 1,
    valida_ate: new Date(Date.now() + dias * 86400_000).toISOString(),
  };
  // Em caso raro de senha repetida, tenta de novo com outra.
  for (let i = 0; i < 3; i++) {
    try {
      ultimaSenha = await api.criarSenha({ ...dados, codigo: api.gerarSenha() });
      break;
    } catch (e) {
      if (e.code !== '23505' || i === 2) return tentar(() => Promise.reject(e)).catch(() => {});
    }
  }
  senhas.unshift(ultimaSenha);
  desenhar();
  window.scrollTo({ top: 0 });
}

async function novaCampanha(f) {
  const codigo = api.normalizarSenha(f.codigo.value);
  if (codigo.length < 3) return avisar('Use pelo menos 3 letras.');
  const ate = f.ate.value ? new Date(f.ate.value + 'T23:59:59').toISOString() : null;
  const s = await tentar(() => api.criarSenha({
    tipo: 'campanha', codigo, usos_max: f.limite.value ? Number(f.limite.value) : null, valida_ate: ate, nota: 'Resposta automática',
  })).catch(() => null);
  if (!s) return;
  ultimaSenha = s;
  senhas.unshift(s);
  desenhar();
  window.scrollTo({ top: 0 });
}

// ---------- Início ----------

if (api.sessaoAtual()) iniciar(); else telaLogin();
