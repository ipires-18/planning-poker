-- ============================================================================
-- Fora a carta de 0
--
-- Zero não é estimativa. Se a história foi feita, ela vale alguma coisa — e uma
-- história de 0 ponto ainda consome dia de alguém sem aparecer na capacidade do
-- time, o que faz o planejamento mentir. Os casos que caíam no zero já tinham
-- carta própria: "Ag. Definição" para o que não dá para dimensionar ainda, e
-- "?" para quem não sabe opinar.
-- ============================================================================

alter table rooms
  alter column point_scale set default
    '[{"label":"½","value":0.5},{"label":"1","value":1},
      {"label":"2","value":2},{"label":"3","value":3},{"label":"5","value":5},
      {"label":"8","value":8},{"label":"13","value":13},{"label":"21","value":21},
      {"label":"34","value":34},{"label":"55","value":55},{"label":"89","value":89},
      {"label":"?","value":null},{"label":"☕","value":null},
      {"label":"Ag. Definição","value":null}]'::jsonb;

-- Salas que já existem perdem a carta do baralho.
update rooms
   set point_scale = (
     select coalesce(jsonb_agg(card order by ordinality), '[]'::jsonb)
       from jsonb_array_elements(point_scale) with ordinality as t(card, ordinality)
      where card -> 'value' is null
         or (card ->> 'value')::numeric <> 0
   )
 where exists (
   select 1 from jsonb_array_elements(point_scale) as card
    where card -> 'value' is not null and (card ->> 'value')::numeric = 0
 );

-- Votos de 0 que já tinham sido dados viram "?": a pessoa opinou, mas a carta
-- não existe mais para ser exibida na mesa.
update votes set value = '?' where value = '0';

-- ============================================================================
-- commit_story — uma história não pode valer 0
--
-- Só alcançável por chamada direta à API, já que a carta saiu de todos os
-- baralhos. Continua valendo 0 para uma pessoa dentro da divisão: é assim que
-- se registra quem não pegou nada daquela história.
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
    if p_points <= 0 then
      raise exception 'Uma história vale mais que zero — use "Ag. Definição" se ainda não dá para dimensionar'
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
