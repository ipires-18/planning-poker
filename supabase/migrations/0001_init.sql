-- ============================================================================
-- Planning Poker — schema inicial
--
-- Princípio central: o voto de uma pessoa é invisível para as demais até que a
-- rodada seja revelada, e isso é garantido por RLS no banco — não pela UI.
-- No app antigo bastava abrir o DevTools para ler todos os votos antes da
-- revelação. Aqui o Postgres simplesmente não devolve a linha.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tipos
-- ----------------------------------------------------------------------------
create type player_role as enum ('po', 'tech_lead', 'frontend', 'backend', 'qa');
create type story_kind as enum ('frontend', 'backend', 'both');
create type voting_side as enum ('frontend', 'backend');

-- ----------------------------------------------------------------------------
-- rooms
-- ----------------------------------------------------------------------------
create table rooms (
  id                  text primary key
                        check (id ~ '^[A-Z0-9]{6}$'),
  session_name        text not null check (char_length(trim(session_name)) between 1 and 80),
  point_scale         jsonb not null default
                        '[0,1,2,3,5,8,13,21,34,55,89,"?","☕","Ag. Definição"]'::jsonb,
  owner_user_id       uuid not null references auth.users (id) on delete cascade,
  current_story_index int not null default 0 check (current_story_index >= 0),
  current_side        voting_side not null default 'frontend',
  revealed            boolean not null default false,
  current_round       int not null default 1 check (current_round >= 1),
  ended               boolean not null default false,
  created_at          timestamptz not null default now(),
  -- Salas anônimas são efêmeras: um cron limpa o que passar daqui.
  expires_at          timestamptz not null default now() + interval '30 days'
);

create index rooms_owner_idx on rooms (owner_user_id);
create index rooms_expires_idx on rooms (expires_at);

-- ----------------------------------------------------------------------------
-- players
-- ----------------------------------------------------------------------------
create table players (
  id                 uuid primary key default gen_random_uuid(),
  room_id            text not null references rooms (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null check (char_length(trim(name)) between 1 and 40),
  role               player_role not null,
  accumulated_points numeric(8, 1) not null default 0,
  -- Saber QUE alguém votou é público; saber O QUE votou não é. Sem esta coluna
  -- o contador "3 de 5 votaram" seria impossível, porque a RLS esconde as
  -- linhas de `votes` das outras pessoas até a revelação.
  has_voted          boolean not null default false,
  joined_at          timestamptz not null default now(),
  -- Uma pessoa (um JWT) ocupa no máximo uma cadeira por sala. Isso é o que
  -- torna o "entrar duas vezes" impossível, e não um check no cliente.
  unique (room_id, user_id)
);

create index players_room_idx on players (room_id);

-- ----------------------------------------------------------------------------
-- stories
-- ----------------------------------------------------------------------------
create table stories (
  id              uuid primary key default gen_random_uuid(),
  room_id         text not null references rooms (id) on delete cascade,
  position        int not null check (position >= 0),
  title           text not null check (char_length(trim(title)) between 1 and 200),
  link            text,
  kind            story_kind not null default 'both',
  -- numeric quando pontuada; null quando ainda não; o caso "Ag. Definição"
  -- vira a flag abaixo, em vez de poluir a coluna numérica com texto.
  frontend_points numeric(8, 1),
  backend_points  numeric(8, 1),
  frontend_pending boolean not null default false,
  backend_pending  boolean not null default false,
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz not null default now(),
  unique (room_id, position)
);

create index stories_room_idx on stories (room_id, position);

-- ----------------------------------------------------------------------------
-- votes — uma linha por jogador, por história, por lado, por rodada
-- ----------------------------------------------------------------------------
create table votes (
  id         uuid primary key default gen_random_uuid(),
  room_id    text not null references rooms (id) on delete cascade,
  story_id   uuid not null references stories (id) on delete cascade,
  player_id  uuid not null references players (id) on delete cascade,
  side       voting_side not null,
  round      int not null,
  -- texto porque a escala mistura números, "?", "☕" e "Ag. Definição"
  value      text not null,
  created_at timestamptz not null default now(),
  unique (story_id, player_id, side, round)
);

create index votes_room_round_idx on votes (room_id, round);

-- ----------------------------------------------------------------------------
-- story_participants — divisão dos pontos da história entre as pessoas
-- ----------------------------------------------------------------------------
create table story_participants (
  id        uuid primary key default gen_random_uuid(),
  -- Desnormalizado de propósito: o Realtime só filtra por coluna da própria
  -- tabela, e sem isto cada cliente seria acordado pelas salas dos outros.
  room_id   text not null references rooms (id) on delete cascade,
  story_id  uuid not null references stories (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  side      voting_side not null,
  points    numeric(8, 1) not null default 0,
  -- marcado quando a história ficou como "Ag. Definição" e essa pessoa é a
  -- responsável por destravá-la
  pending   boolean not null default false,
  unique (story_id, player_id, side)
);

create index story_participants_story_idx on story_participants (story_id);
create index story_participants_room_idx on story_participants (room_id);

-- ============================================================================
-- Helpers — SECURITY DEFINER para que as policies não recursem em players
-- ============================================================================

create or replace function is_room_member(p_room_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from players
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

create or replace function is_room_host(p_room_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- "Host" é quem criou a sala ou quem entrou como PO / Tech Lead.
  select exists (
    select 1 from rooms
    where id = p_room_id and owner_user_id = auth.uid()
  ) or exists (
    select 1 from players
    where room_id = p_room_id
      and user_id = auth.uid()
      and role in ('po', 'tech_lead')
  );
$$;

create or replace function room_is_revealed(p_room_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select revealed from rooms where id = p_room_id), false);
$$;

-- ============================================================================
-- RLS
-- ============================================================================

alter table rooms              enable row level security;
alter table players            enable row level security;
alter table stories            enable row level security;
alter table votes              enable row level security;
alter table story_participants enable row level security;

-- --- rooms -------------------------------------------------------------------
-- Qualquer pessoa autenticada pode ler uma sala pelo código: é o que permite a
-- tela de entrada dizer "sala não encontrada" antes de você ser membro.
-- A sala não guarda nada sensível — só nome, escala e em que história está.
create policy rooms_select on rooms
  for select to authenticated
  using (not ended or is_room_member(id));

create policy rooms_insert on rooms
  for insert to authenticated
  with check (owner_user_id = auth.uid());

create policy rooms_update on rooms
  for update to authenticated
  using (is_room_host(id))
  with check (is_room_host(id));

create policy rooms_delete on rooms
  for delete to authenticated
  using (owner_user_id = auth.uid());

-- --- players -----------------------------------------------------------------
create policy players_select on players
  for select to authenticated
  using (is_room_member(room_id) or user_id = auth.uid());

-- Você só cria a SUA cadeira, e só em sala aberta.
create policy players_insert on players
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from rooms r where r.id = room_id and not r.ended)
  );

-- Você edita seu próprio nome; o host edita pontos de qualquer um.
create policy players_update on players
  for update to authenticated
  using (user_id = auth.uid() or is_room_host(room_id))
  with check (user_id = auth.uid() or is_room_host(room_id));

create policy players_delete on players
  for delete to authenticated
  using (user_id = auth.uid() or is_room_host(room_id));

-- --- stories -----------------------------------------------------------------
create policy stories_select on stories
  for select to authenticated
  using (is_room_member(room_id));

create policy stories_write on stories
  for insert to authenticated
  with check (is_room_host(room_id));

create policy stories_update on stories
  for update to authenticated
  using (is_room_host(room_id))
  with check (is_room_host(room_id));

create policy stories_delete on stories
  for delete to authenticated
  using (is_room_host(room_id));

-- --- votes -------------------------------------------------------------------
-- O coração da coisa: você enxerga o seu voto sempre, e o dos outros apenas
-- depois que a sala foi revelada.
create policy votes_select on votes
  for select to authenticated
  using (
    is_room_member(room_id)
    and (
      room_is_revealed(room_id)
      or player_id in (select id from players where user_id = auth.uid())
    )
  );

-- Não há policy de INSERT nem de UPDATE aqui, de propósito: votar acontece
-- apenas pela função cast_vote(), que grava o voto e marca players.has_voted na
-- mesma transação. Fechar a porta direta é o que impede os dois saírem de
-- sincronia — e trocar de carta antes da revelação continua funcionando, porque
-- a função faz upsert.

create policy votes_delete on votes
  for delete to authenticated
  using (is_room_host(room_id));

-- --- story_participants ------------------------------------------------------
create policy participants_select on story_participants
  for select to authenticated
  using (is_room_member(room_id));

create policy participants_write on story_participants
  for all to authenticated
  using (is_room_host(room_id))
  with check (is_room_host(room_id));

-- ============================================================================
-- Realtime
-- ============================================================================
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table stories;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table story_participants;

-- Sem isso, os eventos de UPDATE/DELETE chegam só com a chave primária e o
-- cliente não consegue reconciliar o estado.
alter table rooms              replica identity full;
alter table players            replica identity full;
alter table stories            replica identity full;
alter table votes              replica identity full;
alter table story_participants replica identity full;
