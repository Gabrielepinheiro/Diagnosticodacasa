// Onde os dados ficam: Supabase (REST, sem biblioteca) ou, em modo de teste, o próprio navegador.

import { CONFIG } from './config.js';

export const modoDemo = !CONFIG.supabaseUrl || !CONFIG.supabaseKey;

const SESSAO = 'gp-diagnostico-sessao';
const DEMO_DB = 'gp-diagnostico-demo';

/** Senhas não diferenciam maiúsculas, espaços nem acentos: "diagnóstico" = "DIAGNOSTICO". */
export function normalizarSenha(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toUpperCase();
}

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I/L
export function gerarSenha(tamanho = 6) {
  const n = crypto.getRandomValues(new Uint32Array(tamanho));
  return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join('');
}

// ---------- Supabase ----------

function cabecalhos(token) {
  const h = { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  else if (CONFIG.supabaseKey.startsWith('eyJ')) h.Authorization = 'Bearer ' + CONFIG.supabaseKey; // chave anon antiga
  return h;
}

async function pedir(caminho, { metodo = 'GET', corpo, token, prefer } = {}) {
  const h = cabecalhos(token);
  if (prefer) h.Prefer = prefer;
  const res = await fetch(CONFIG.supabaseUrl.replace(/\/$/, '') + caminho, {
    method: metodo,
    headers: h,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const txt = await res.text();
  let dados = null;
  try { dados = txt ? JSON.parse(txt) : null; } catch { dados = { message: txt }; }
  if (!res.ok) {
    const e = new Error(dados?.message || dados?.msg || dados?.error_description || `Erro ${res.status}`);
    e.status = res.status;
    e.code = dados?.code;
    throw e;
  }
  return dados;
}

// ---------- Modo de teste ----------

function demoLer() {
  try {
    const d = JSON.parse(localStorage.getItem(DEMO_DB));
    if (d?.senhas) return d;
  } catch { /* começa do zero */ }
  return {
    senhas: [{
      id: 'demo', codigo: 'DEMO', tipo: 'campanha', nome: null, instagram: null, nota: 'Senha de teste',
      usos_max: null, usos: 0, valida_ate: null, ativa: true, criada_em: new Date().toISOString(),
    }],
    diagnosticos: [],
  };
}
function demoGravar(d) { localStorage.setItem(DEMO_DB, JSON.stringify(d)); }

function avaliar(s) {
  if (!s || !s.ativa) return { ok: false, motivo: 'invalida' };
  if (s.valida_ate && new Date(s.valida_ate) < new Date()) return { ok: false, motivo: 'expirada' };
  if (s.usos_max != null && s.usos >= s.usos_max) return { ok: false, motivo: 'usada' };
  return { ok: true, nome: s.nome, tipo: s.tipo };
}

// ---------- Cliente ----------

export async function verificarSenha(codigo) {
  const c = normalizarSenha(codigo);
  if (modoDemo) return avaliar(demoLer().senhas.find((s) => s.codigo === c));
  return pedir('/rest/v1/rpc/verificar_senha', { metodo: 'POST', corpo: { p_codigo: c } });
}

export async function enviarDiagnostico(codigo, respostas, resultado) {
  const c = normalizarSenha(codigo);
  if (modoDemo) {
    const d = demoLer();
    const s = d.senhas.find((x) => x.codigo === c);
    const v = avaliar(s);
    if (!v.ok) return v;
    const id = crypto.randomUUID();
    d.diagnosticos.unshift({
      id, senha_id: s.id, codigo: c, nome: respostas.nome, email: respostas.email, instagram: respostas.instagram,
      respostas, resultado, estado: resultado.estado.nome, caminho: resultado.caminho.linha,
      status: 'novo', criado_em: new Date().toISOString(),
    });
    s.usos += 1;
    demoGravar(d);
    return { ok: true, id };
  }
  return pedir('/rest/v1/rpc/enviar_diagnostico', {
    metodo: 'POST',
    corpo: { p_codigo: c, p_respostas: respostas, p_resultado: resultado },
  });
}

// ---------- Escritório ----------

export function sessaoAtual() {
  try { return JSON.parse(localStorage.getItem(SESSAO)); } catch { return null; }
}

function guardarSessao(d) {
  const s = {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    email: d.user?.email,
  };
  localStorage.setItem(SESSAO, JSON.stringify(s));
  return s;
}

export async function entrar(email, senha) {
  if (modoDemo) return guardarSessao({ access_token: 'demo', refresh_token: 'demo', expires_in: 86400 * 365, user: { email } });
  const d = await pedir('/auth/v1/token?grant_type=password', { metodo: 'POST', corpo: { email, password: senha } });
  return guardarSessao(d);
}

export async function sair() {
  const s = sessaoAtual();
  localStorage.removeItem(SESSAO);
  if (!modoDemo && s) await pedir('/auth/v1/logout', { metodo: 'POST', token: s.access_token }).catch(() => {});
}

async function token() {
  let s = sessaoAtual();
  if (!s) throw Object.assign(new Error('Sessão encerrada'), { status: 401 });
  if (modoDemo) return s.access_token;
  if (s.expires_at * 1000 - Date.now() < 60_000) {
    try {
      const d = await pedir('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', corpo: { refresh_token: s.refresh_token } });
      s = guardarSessao(d);
    } catch (e) {
      localStorage.removeItem(SESSAO);
      throw Object.assign(e, { status: 401 });
    }
  }
  return s.access_token;
}

export async function souEquipe() {
  if (modoDemo) return true;
  return pedir('/rest/v1/rpc/e_equipe', { metodo: 'POST', corpo: {}, token: await token() });
}

export async function listarDiagnosticos() {
  if (modoDemo) return demoLer().diagnosticos;
  return pedir('/rest/v1/diagnosticos?select=*&order=criado_em.desc', { token: await token() });
}

export async function atualizarDiagnostico(id, campos) {
  if (modoDemo) {
    const d = demoLer();
    Object.assign(d.diagnosticos.find((x) => x.id === id), campos);
    demoGravar(d);
    return;
  }
  await pedir(`/rest/v1/diagnosticos?id=eq.${encodeURIComponent(id)}`, { metodo: 'PATCH', corpo: campos, token: await token() });
}

export async function listarSenhas() {
  if (modoDemo) return demoLer().senhas;
  return pedir('/rest/v1/senhas?select=*&order=criada_em.desc', { token: await token() });
}

export async function criarSenha(dados) {
  const nova = { ...dados, codigo: normalizarSenha(dados.codigo) };
  if (modoDemo) {
    const d = demoLer();
    if (d.senhas.some((s) => s.codigo === nova.codigo)) throw Object.assign(new Error('Essa senha já existe'), { code: '23505' });
    const s = { id: crypto.randomUUID(), usos: 0, ativa: true, criada_em: new Date().toISOString(), ...nova };
    d.senhas.unshift(s);
    demoGravar(d);
    return s;
  }
  const [s] = await pedir('/rest/v1/senhas', { metodo: 'POST', corpo: nova, token: await token(), prefer: 'return=representation' });
  return s;
}

export async function atualizarSenha(id, campos) {
  if (modoDemo) {
    const d = demoLer();
    Object.assign(d.senhas.find((x) => x.id === id), campos);
    demoGravar(d);
    return;
  }
  await pedir(`/rest/v1/senhas?id=eq.${encodeURIComponent(id)}`, { metodo: 'PATCH', corpo: campos, token: await token() });
}
