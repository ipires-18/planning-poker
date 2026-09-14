-- ============================================================================
-- Operações de escrita
--
-- Tudo que muda mais de uma tabela vive aqui, como uma função. O app antigo
-- fazia get() no cliente, calculava, e devolvia update() — duas pessoas agindo
-- ao mesmo tempo sobrescreviam uma à outra. Aqui cada operação é uma única
-- transação, e a autorização é checada dentro dela.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Código de sala legível: sem 0/O e 1/I, que as pessoas leem errado em voz alta.
-- ----------------------------------------------------------------------------
create or replace function generate_room_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where id = code);
  end loop;
  return code;
end;
$$;

-- ----------------------------------------------------------------------------
-- create_room — cria sala, fila de histórias e a cadeira do anfitrião de uma vez
-- ----------------------------------------------------------------------------
create or replace function create_room(
  p_session_name text,
  p_host_name    text,
  p_stories      jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id text;
  v_story   jsonb;
  v_index   int := 0;
  v_first   story_kind;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada' using errcode = '42501';
  end if;

  if jsonb_array_length(p_stories) = 0 then
    raise exception 'Adicione pelo menos uma história' using errcode = '23514';
  end if;

  v_room_id := generate_room_code();

  insert into rooms (id, session_name, owner_user_id)
  values (v_room_id, trim(p_session_name), auth.uid());

  for v_story in select * from jsonb_array_elements(p_stories) loop
    insert into stories (room_id, position, title, link, kind)
    values (
      v_room_id,
      v_index,
      trim(v_story ->> 'title'),
      nullif(trim(coalesce(v_story ->> 'link', '')), ''),
      coalesce((v_story ->> 'kind')::story_kind, 'both')
    );
    if v_index = 0 then
      v_first := coalesce((v_story ->> 'kind')::story_kind, 'both');
    end if;
    v_index := v_index + 1;
  end loop;

  -- Uma história "somente back" começa votando o back, não o front.
  update rooms
     set current_side = (case when v_first = 'backend' then 'backend' else 'frontend' end)::voting_side
   where id = v_room_id;

  insert into players (room_id, user_id, name, role)
  values (v_room_id, auth.uid(), trim(p_host_name), 'po');

  return v_room_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- join_room — entra na sala, ou retoma a cadeira se já estava nela
-- ----------------------------------------------------------------------------
create or replace function join_room(
  p_room_id text,
  p_name    text,
  p_role    player_role
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_ended     boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada' using errcode = '42501';
  end if;

  select ended into v_ended from rooms where id = p_room_id;
  if not found then
    raise exception 'Sala não encontrada' using errcode = 'P0002';
  end if;
  if v_ended then
    raise exception 'Esta sessão já foi encerrada' using errcode = '23514';
  end if;

  -- Reconectar de outro dispositivo, ou depois de limpar o cache, cai aqui e
  -- atualiza a cadeira existente em vez de criar uma duplicada.
  insert into players (room_id, user_id, name, role)
  values (p_room_id, auth.uid(), trim(p_name), p_role)
  on conflict (room_id, user_id)
    do update set name = excluded.name, role = excluded.role
  returning id into v_player_id;

  return v_player_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- cast_vote — registra o voto e acende a luz "já votou" na cadeira
--
-- As duas coisas precisam andar juntas numa transação: o valor fica protegido
-- pela RLS de `votes`, e a cadeira fica pública em `players.has_voted`, que é o
-- que a mesa usa para virar a carta de costas.
-- ----------------------------------------------------------------------------
create or replace function cast_vote(
  p_room_id  text,
  p_story_id uuid,
  p_side     voting_side,
  p_round    int,
  p_value    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_revealed  boolean;
begin
  select id into v_player_id
    from players
   where room_id = p_room_id and user_id = auth.uid();

  if v_player_id is null then
    raise exception 'Você não está nesta sala' using errcode = '42501';
  end if;

  select revealed into v_revealed from rooms where id = p_room_id;
  if v_revealed then
    raise exception 'As cartas já foram reveladas' using errcode = '23514';
  end if;

  insert into votes (room_id, story_id, player_id, side, round, value)
  values (p_room_id, p_story_id, v_player_id, p_side, p_round, p_value)
  on conflict (story_id, player_id, side, round)
    do update set value = excluded.value;

  update players set has_voted = true where id = v_player_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- reveal_round / reset_round
-- ----------------------------------------------------------------------------
create or replace function reveal_round(p_room_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead podem revelar' using errcode = '42501';
  end if;

  if not exists (
    select 1 from votes v
     where v.room_id = p_room_id
       and v.round = (select current_round from rooms where id = p_room_id)
  ) then
    raise exception 'Ninguém votou ainda' using errcode = '23514';
  end if;

  update rooms set revealed = true where id = p_room_id;
end;
$$;

create or replace function reset_round(p_room_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead podem resetar' using errcode = '42501';
  end if;

  -- Rodada nova: os votos antigos ficam no histórico, mas ninguém mais os lê.
  update rooms
     set revealed = false,
         current_round = current_round + 1
   where id = p_room_id;

  update players set has_voted = false where room_id = p_room_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- commit_story — o grande. Grava pontos, distribui, avança e abre nova rodada.
--
-- p_allocations: [{ "player_id": uuid, "points": numeric, "pending": bool }]
-- ----------------------------------------------------------------------------
create or replace function commit_story(
  p_room_id     text,
  p_points      numeric,      -- null = "Ag. Definição"
  p_allocations jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room      rooms%rowtype;
  v_story     stories%rowtype;
  v_alloc     jsonb;
  v_sum       numeric := 0;
  v_pending   boolean := p_points is null;
  v_next_kind story_kind;
  v_finishes  boolean;
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead podem confirmar a pontuação'
      using errcode = '42501';
  end if;

  select * into v_room from rooms where id = p_room_id for update;
  if not found then
    raise exception 'Sala não encontrada' using errcode = 'P0002';
  end if;

  select * into v_story
    from stories
   where room_id = p_room_id and position = v_room.current_story_index;
  if not found then
    raise exception 'História não encontrada' using errcode = 'P0002';
  end if;

  -- A soma da divisão precisa fechar exatamente com o total da história.
  -- O cliente já trava o botão, mas quem garante é esta checagem.
  if not v_pending then
    if p_points < 0 then
      raise exception 'Uma história não pode valer pontos negativos'
        using errcode = '23514';
    end if;

    if exists (
      select 1 from jsonb_array_elements(p_allocations)
       where (value ->> 'points')::numeric < 0
    ) then
      raise exception 'Ninguém pode receber pontos negativos' using errcode = '23514';
    end if;

    select coalesce(sum((value ->> 'points')::numeric), 0)
      into v_sum
      from jsonb_array_elements(p_allocations);

    if v_sum <> p_points then
      raise exception 'A divisão soma % mas a história vale %', v_sum, p_points
        using errcode = '23514';
    end if;
  end if;

  -- 1. pontos da história, no lado que está sendo votado
  if v_room.current_side = 'frontend' then
    update stories
       set frontend_points  = p_points,
           frontend_pending = v_pending
     where id = v_story.id;
  else
    update stories
       set backend_points  = p_points,
           backend_pending = v_pending
     where id = v_story.id;
  end if;

  -- 2. divisão entre as pessoas + acúmulo individual
  for v_alloc in select * from jsonb_array_elements(p_allocations) loop
    insert into story_participants (room_id, story_id, player_id, side, points, pending)
    values (
      p_room_id,
      v_story.id,
      (v_alloc ->> 'player_id')::uuid,
      v_room.current_side,
      coalesce((v_alloc ->> 'points')::numeric, 0),
      coalesce((v_alloc ->> 'pending')::boolean, false)
    )
    on conflict (story_id, player_id, side)
      do update set points = excluded.points, pending = excluded.pending;

    update players
       set accumulated_points = accumulated_points
                              + coalesce((v_alloc ->> 'points')::numeric, 0)
     where id = (v_alloc ->> 'player_id')::uuid
       and room_id = p_room_id;
  end loop;

  -- 3. para onde vamos agora
  --    Uma história "both" vota front e depois back antes de avançar.
  v_finishes := not (v_story.kind = 'both' and v_room.current_side = 'frontend');

  if v_finishes then
    update stories set ended_at = coalesce(ended_at, now()) where id = v_story.id;

    select kind into v_next_kind
      from stories
     where room_id = p_room_id and position = v_room.current_story_index + 1;

    update rooms
       set current_story_index = current_story_index + 1,
           current_side = (case when v_next_kind = 'backend' then 'backend'
                               else 'frontend' end)::voting_side,
           revealed = false,
           current_round = current_round + 1
     where id = p_room_id;
  else
    update rooms
       set current_side = 'backend',
           revealed = false,
           current_round = current_round + 1
     where id = p_room_id;
  end if;

  -- Rodada nova, cartas de costas outra vez.
  update players set has_voted = false where room_id = p_room_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- add_story — acrescenta ao fim da fila, inclusive com a sprint já encerrada
-- ----------------------------------------------------------------------------
create or replace function add_story(
  p_room_id text,
  p_title   text,
  p_link    text,
  p_kind    story_kind
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_position int;
  v_id       uuid;
  v_room     rooms%rowtype;
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead podem adicionar histórias'
      using errcode = '42501';
  end if;

  select * into v_room from rooms where id = p_room_id for update;

  select coalesce(max(position) + 1, 0) into v_position
    from stories where room_id = p_room_id;

  insert into stories (room_id, position, title, link, kind)
  values (p_room_id, v_position, trim(p_title), nullif(trim(coalesce(p_link, '')), ''), p_kind)
  returning id into v_id;

  -- Se a sprint estava terminada, esta história a retoma exatamente aqui.
  if v_room.current_story_index >= v_position then
    update rooms
       set current_story_index = v_position,
           current_side = (case when p_kind = 'backend' then 'backend' else 'frontend' end)::voting_side,
           revealed = false,
           ended = false,
           current_round = current_round + 1
     where id = p_room_id;

    update players set has_voted = false where room_id = p_room_id;
  end if;

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- set_story_kind — trocar o tipo da história em andamento
-- ----------------------------------------------------------------------------
create or replace function set_story_kind(p_story_id uuid, p_kind story_kind)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_story stories%rowtype;
begin
  select * into v_story from stories where id = p_story_id;
  if not found then
    raise exception 'História não encontrada' using errcode = 'P0002';
  end if;
  if not is_room_host(v_story.room_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  update stories set kind = p_kind where id = p_story_id;

  -- Se a história corrente virou "somente back", o lado em votação acompanha.
  update rooms
     set current_side = (case when p_kind = 'backend' then 'backend'
                              when p_kind = 'frontend' then 'frontend'
                              else current_side::text end)::voting_side
   where id = v_story.room_id
     and current_story_index = v_story.position;
end;
$$;

-- ----------------------------------------------------------------------------
-- start_story_timer
-- ----------------------------------------------------------------------------
create or replace function start_story_timer(p_story_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id text;
begin
  select room_id into v_room_id from stories where id = p_story_id;
  if not is_room_host(v_room_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  update stories set started_at = now()
   where id = p_story_id and started_at is null;
end;
$$;

-- ----------------------------------------------------------------------------
-- adjust_participant_points — correção manual no resumo final
-- ----------------------------------------------------------------------------
create or replace function adjust_participant_points(
  p_story_id  uuid,
  p_player_id uuid,
  p_side      voting_side,
  p_points    numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_story stories%rowtype;
  v_old   numeric;
  v_delta numeric;
begin
  select * into v_story from stories where id = p_story_id;
  if not is_room_host(v_story.room_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if p_points < 0 then
    raise exception 'Pontos não podem ser negativos' using errcode = '23514';
  end if;

  select points into v_old
    from story_participants
   where story_id = p_story_id and player_id = p_player_id and side = p_side;

  v_delta := p_points - coalesce(v_old, 0);

  update story_participants
     set points = p_points, pending = false
   where story_id = p_story_id and player_id = p_player_id and side = p_side;

  -- O total da história e o acumulado da pessoa andam juntos com o mesmo delta,
  -- senão o resumo passa a não fechar com a soma das partes.
  update players
     set accumulated_points = accumulated_points + v_delta
   where id = p_player_id;

  if p_side = 'frontend' then
    update stories
       set frontend_points = coalesce(frontend_points, 0) + v_delta,
           frontend_pending = false
     where id = p_story_id;
  else
    update stories
       set backend_points = coalesce(backend_points, 0) + v_delta,
           backend_pending = false
     where id = p_story_id;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- end_game / reopen_game
-- ----------------------------------------------------------------------------
create or replace function end_game(p_room_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_room_host(p_room_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  update rooms set ended = true where id = p_room_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Limpeza — salas expiradas somem sozinhas (agende via pg_cron no painel)
-- ----------------------------------------------------------------------------
create or replace function purge_expired_rooms()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from rooms where expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- Permissões: o cliente só chama o que está listado aqui.
-- ----------------------------------------------------------------------------
revoke all on function purge_expired_rooms() from public, anon, authenticated;

grant execute on function create_room(text, text, jsonb)                    to authenticated;
grant execute on function join_room(text, text, player_role)                to authenticated;
grant execute on function cast_vote(text, uuid, voting_side, int, text)     to authenticated;
grant execute on function reveal_round(text)                                to authenticated;
grant execute on function reset_round(text)                                 to authenticated;
grant execute on function commit_story(text, numeric, jsonb)                to authenticated;
grant execute on function add_story(text, text, text, story_kind)           to authenticated;
grant execute on function set_story_kind(uuid, story_kind)                  to authenticated;
grant execute on function start_story_timer(uuid)                           to authenticated;
grant execute on function adjust_participant_points(uuid, uuid, voting_side, numeric) to authenticated;
grant execute on function end_game(text)                                    to authenticated;
