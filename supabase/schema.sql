-- Diagnóstico da Casa · GP.
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode rodar de novo sem perder dados.
--
-- Segurança:
--   * Quem faz o diagnóstico (sem login) não lê nenhuma tabela. Só chama duas funções:
--     verificar_senha e enviar_diagnostico.
--   * Só os e-mails da tabela "equipe" veem senhas e diagnósticos no painel.

create extension if not exists pgcrypto;

-- Quem pode entrar no painel ---------------------------------------------------
create table if not exists public.equipe (
  email text primary key
);

-- Senhas enviadas no direct ----------------------------------------------------
create table if not exists public.senhas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo = upper(codigo) and length(codigo) between 3 and 20),
  tipo text not null default 'individual' check (tipo in ('individual', 'campanha')),
  nome text,
  instagram text,
  nota text,
  usos_max int check (usos_max is null or usos_max > 0), -- vazio = sem limite
  usos int not null default 0,
  valida_ate timestamptz,                               -- vazio = sem data
  ativa boolean not null default true,
  criada_em timestamptz not null default now()
);

-- Diagnósticos recebidos -------------------------------------------------------
create table if not exists public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  senha_id uuid references public.senhas (id) on delete set null,
  codigo text,
  nome text,
  email text,
  instagram text,
  respostas jsonb not null,
  resultado jsonb not null,
  estado text,
  caminho text,
  status text not null default 'novo' check (status in ('novo', 'respondido', 'arquivado')),
  criado_em timestamptz not null default now()
);
create index if not exists diagnosticos_criado_em on public.diagnosticos (criado_em desc);

-- Regras de acesso -------------------------------------------------------------
alter table public.equipe enable row level security;
alter table public.senhas enable row level security;
alter table public.diagnosticos enable row level security;

revoke all on public.equipe, public.senhas, public.diagnosticos from anon;

create or replace function public.e_equipe()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.equipe
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "equipe vê a equipe" on public.equipe;
create policy "equipe vê a equipe" on public.equipe
  for select to authenticated using (public.e_equipe());

drop policy if exists "equipe cuida das senhas" on public.senhas;
create policy "equipe cuida das senhas" on public.senhas
  for all to authenticated using (public.e_equipe()) with check (public.e_equipe());

drop policy if exists "equipe cuida dos diagnosticos" on public.diagnosticos;
create policy "equipe cuida dos diagnosticos" on public.diagnosticos
  for all to authenticated using (public.e_equipe()) with check (public.e_equipe());

-- Funções públicas (usadas pelo aplicativo do cliente) -------------------------
create or replace function public.situacao_senha(s public.senhas)
returns text
language sql stable
as $$
  select case
    when s.id is null or not s.ativa then 'invalida'
    when s.valida_ate is not null and s.valida_ate < now() then 'expirada'
    when s.usos_max is not null and s.usos >= s.usos_max then 'usada'
    else 'ok'
  end;
$$;

create or replace function public.verificar_senha(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  s public.senhas;
  situacao text;
begin
  select * into s from public.senhas where codigo = upper(btrim(p_codigo));
  situacao := public.situacao_senha(s);
  if situacao <> 'ok' then
    return jsonb_build_object('ok', false, 'motivo', situacao);
  end if;
  return jsonb_build_object('ok', true, 'nome', s.nome, 'tipo', s.tipo);
end;
$$;

create or replace function public.enviar_diagnostico(p_codigo text, p_respostas jsonb, p_resultado jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  s public.senhas;
  situacao text;
  novo_id uuid;
begin
  if p_respostas is null or p_resultado is null
     or jsonb_typeof(p_respostas) <> 'object' or jsonb_typeof(p_resultado) <> 'object'
     or octet_length(p_respostas::text) > 60000 or octet_length(p_resultado::text) > 60000 then
    return jsonb_build_object('ok', false, 'motivo', 'dados');
  end if;
  if coalesce(p_respostas ->> 'consentimento', 'false') <> 'true' then
    return jsonb_build_object('ok', false, 'motivo', 'consentimento');
  end if;

  select * into s from public.senhas where codigo = upper(btrim(p_codigo)) for update;
  situacao := public.situacao_senha(s);
  if situacao <> 'ok' then
    return jsonb_build_object('ok', false, 'motivo', situacao);
  end if;

  insert into public.diagnosticos (senha_id, codigo, nome, email, instagram, respostas, resultado, estado, caminho)
  values (
    s.id, s.codigo,
    left(p_respostas ->> 'nome', 200),
    left(p_respostas ->> 'email', 200),
    left(p_respostas ->> 'instagram', 100),
    p_respostas, p_resultado,
    left(p_resultado #>> '{estado,nome}', 40),
    left(p_resultado #>> '{caminho,linha}', 60)
  )
  returning id into novo_id;

  update public.senhas set usos = usos + 1 where id = s.id;
  return jsonb_build_object('ok', true, 'id', novo_id);
end;
$$;

revoke all on function public.verificar_senha(text) from public;
revoke all on function public.enviar_diagnostico(text, jsonb, jsonb) from public;
revoke all on function public.e_equipe() from public;
grant execute on function public.verificar_senha(text) to anon, authenticated;
grant execute on function public.enviar_diagnostico(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.e_equipe() to authenticated;

-- Depois de rodar, cadastre o seu e-mail (o mesmo do login do painel):
-- insert into public.equipe (email) values ('seu-email@exemplo.com') on conflict do nothing;
