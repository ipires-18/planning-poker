-- ============================================================================
-- QA na cerimônia
--
-- Até aqui "quem vota" e "quem recebe pontos" eram a mesma coisa: todo mundo
-- menos o PO. A QA quebra isso — ela participa para conhecer as histórias e
-- levantar pontos, mas não é dona de entrega, então não recebe pontuação. E se
-- ela vota ou não é decisão do PO / Tech Lead, sessão a sessão.
--
--   papel       vota                  pontua
--   PO          não                   não
--   Tech Lead   sim                   sim
--   Front/Back  sim                   sim
--   QA          conforme a sala       não
-- ============================================================================

alter table rooms
  add column if not exists qa_votes boolean not null default false;

-- ----------------------------------------------------------------------------
-- Quem pontua. Imutável: é uma propriedade do papel, não da sala.
-- ----------------------------------------------------------------------------
create or replace function role_scores(p_role player_role)
returns boolean
language sql
immutable
as $$
  select p_role in ('tech_lead', 'frontend', 'backend');
$$;

-- ----------------------------------------------------------------------------
-- Quem vota. Depende da sala, porque a QA é configurável.
-- ----------------------------------------------------------------------------
create or replace function player_can_vote(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role = 'po' then false
    when p.role = 'qa' then r.qa_votes
    else true
  end
  from players p
  join rooms r on r.id = p.room_id
  where p.id = p_player_id;
$$;

-- ----------------------------------------------------------------------------
-- set_qa_voting — o interruptor que o PO / Tech Lead controla
-- ----------------------------------------------------------------------------
create or replace function set_qa_voting(p_room_id text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead definem se a QA vota'
      using errcode = '42501';
  end if;

  update rooms set qa_votes = p_enabled where id = p_room_id;

  -- Desligar no meio da rodada deixaria um voto de QA contando para a revelação
  -- e uma carta na mesa de quem não deveria mais ter baralho.
  if not p_enabled then
    delete from votes v
     using players p
     where v.player_id = p.id
       and p.room_id = p_room_id
       and p.role = 'qa'
       and v.round = (select current_round from rooms where id = p_room_id);

    update players set has_voted = false
     where room_id = p_room_id and role = 'qa';
  end if;
end;
$$;

-- ============================================================================
-- cast_vote — recusa quem não vota nesta sala
-- ============================================================================
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
  v_room      rooms%rowtype;
begin
  select id into v_player_id
    from players
   where room_id = p_room_id and user_id = auth.uid();

  if v_player_id is null then
    raise exception 'Você não está nesta sala' using errcode = '42501';
  end if;

  if not player_can_vote(v_player_id) then
    raise exception 'Seu papel não vota nesta sessão' using errcode = '42501';
  end if;

  select * into v_room from rooms where id = p_room_id;
  if v_room.revealed then
    raise exception 'As cartas já foram reveladas' using errcode = '23514';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(v_room.point_scale) as card
     where card ->> 'label' = p_value
  ) then
    raise exception 'A carta "%" não existe no baralho desta sala', p_value
      using errcode = '23514';
  end if;

  insert into votes (room_id, story_id, player_id, side, round, value)
  values (p_room_id, p_story_id, v_player_id, p_side, p_round, p_value)
  on conflict (story_id, player_id, side, round)
    do update set value = excluded.value;

  update players set has_voted = true where id = v_player_id;
end;
$$;

-- ============================================================================
-- commit_story — recusa distribuir pontos para quem não pontua
-- ============================================================================
create or replace function commit_story(
  p_room_id     text,
  p_points      numeric,
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
  v_bad       text;
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

  -- Ninguém de fora da sala, e ninguém cujo papel não é dono de entrega.
  select p.name into v_bad
    from jsonb_array_elements(p_allocations) as alloc
    join players p on p.id = (alloc.value ->> 'player_id')::uuid
   where p.room_id <> p_room_id or not role_scores(p.role)
   limit 1;

  if v_bad is not null then
    raise exception '% não recebe pontuação nesta sessão', v_bad
      using errcode = '23514';
  end if;

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

  update players set has_voted = false where room_id = p_room_id;
end;
$$;

-- ============================================================================
-- set_team_capacity — capacidade só para quem pontua
-- ============================================================================
create or replace function set_team_capacity(
  p_room_id text,
  p_entries jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry jsonb;
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead podem definir a capacidade'
      using errcode = '42501';
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    if (v_entry ->> 'capacity_points')::numeric < 0 then
      raise exception 'Capacidade não pode ser negativa' using errcode = '23514';
    end if;

    update players
       set capacity_points = coalesce((v_entry ->> 'capacity_points')::numeric, 0),
           days_off        = coalesce((v_entry ->> 'days_off')::int, 0)
     where id = (v_entry ->> 'player_id')::uuid
       and room_id = p_room_id
       -- Quem não pontua não tem capacidade para preencher.
       and role_scores(role);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Quem já tinha capacidade num papel que não pontua perde o número: ele não
-- significa mais nada e só distorceria o total do time.
-- ----------------------------------------------------------------------------
update players set capacity_points = 0 where not role_scores(role);

grant execute on function set_qa_voting(text, boolean) to authenticated;
grant execute on function player_can_vote(uuid)        to authenticated;
grant execute on function role_scores(player_role)     to authenticated;
