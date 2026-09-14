-- ============================================================================
-- Só http e https no link da história
--
-- O campo aceitava qualquer texto, e um "javascript:..." ali vira código que
-- roda na sessão de quem clicar. O React 19 barra esse esquema num href, mas a
-- proteção acaba na borda do app: o resumo final é copiado como texto e colado
-- no Jira ou no Slack, onde o link é renderizado por outra pessoa, sem React
-- nenhum no caminho. Então a regra fica no banco, que é por onde todo mundo
-- passa.
-- ============================================================================

-- Links já gravados fora do padrão perdem o valor; o título fica.
update stories
   set link = null
 where link is not null
   and link !~* '^https?://';

alter table stories drop constraint if exists stories_link_scheme;
alter table stories
  add constraint stories_link_scheme
  check (link is null or link ~* '^https?://[^[:space:]]+$');

-- ----------------------------------------------------------------------------
-- Valida e devolve o link, ou null. A mensagem sai daqui para que a tela mostre
-- algo legível em vez de um erro de constraint.
-- ----------------------------------------------------------------------------
create or replace function clean_story_link(p_link text)
returns text
language plpgsql
immutable
as $$
declare
  v_link text := nullif(trim(coalesce(p_link, '')), '');
begin
  if v_link is null then
    return null;
  end if;

  if v_link !~* '^https?://[^[:space:]]+$' then
    raise exception 'O link precisa começar com http:// ou https://'
      using errcode = '23514';
  end if;

  return v_link;
end;
$$;

grant execute on function clean_story_link(text) to authenticated;

-- ----------------------------------------------------------------------------
-- add_story e update_story passam o link pelo filtro
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
  values (p_room_id, v_position, trim(p_title), clean_story_link(p_link), p_kind)
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

create or replace function update_story(
  p_story_id uuid,
  p_title    text,
  p_link     text,
  p_kind     story_kind
)
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
    raise exception 'Apenas PO ou Tech Lead podem editar histórias' using errcode = '42501';
  end if;
  if char_length(trim(p_title)) = 0 then
    raise exception 'A história precisa de um título' using errcode = '23514';
  end if;

  update stories
     set title = trim(p_title),
         link  = clean_story_link(p_link),
         kind  = p_kind
   where id = p_story_id;

  update rooms
     set current_side = (case when p_kind = 'backend' then 'backend'
                              when p_kind = 'frontend' then 'frontend'
                              else current_side::text end)::voting_side
   where id = v_story.room_id
     and current_story_index = v_story.position;
end;
$$;

-- ----------------------------------------------------------------------------
-- create_room também, para a fila montada antes da sala existir
-- ----------------------------------------------------------------------------
create or replace function create_room(
  p_session_name  text,
  p_host_name     text,
  p_stories       jsonb,
  p_deck_id       text default 'fibonacci',
  p_point_scale   jsonb default null,
  p_sprint_start  date default null,
  p_sprint_days   int default null,
  p_holidays      jsonb default null
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

  if p_point_scale is not null and jsonb_array_length(p_point_scale) < 3 then
    raise exception 'O baralho precisa de pelo menos duas cartas' using errcode = '23514';
  end if;

  v_room_id := generate_room_code();

  insert into rooms (id, session_name, owner_user_id, deck_id)
  values (v_room_id, trim(p_session_name), auth.uid(), p_deck_id);

  if p_point_scale is not null then
    update rooms set point_scale = p_point_scale where id = v_room_id;
  end if;

  if p_sprint_start is not null then
    update rooms set sprint_start = p_sprint_start where id = v_room_id;
  end if;

  if p_sprint_days is not null then
    if p_sprint_days < 1 or p_sprint_days > 90 then
      raise exception 'A sprint precisa ter entre 1 e 90 dias' using errcode = '23514';
    end if;
    update rooms set sprint_days = p_sprint_days where id = v_room_id;
  end if;

  if p_holidays is not null then
    update rooms set holidays = p_holidays where id = v_room_id;
  end if;

  for v_story in select * from jsonb_array_elements(p_stories) loop
    insert into stories (room_id, position, title, link, kind)
    values (
      v_room_id,
      v_index,
      trim(v_story ->> 'title'),
      clean_story_link(v_story ->> 'link'),
      coalesce((v_story ->> 'kind')::story_kind, 'both')
    );
    if v_index = 0 then
      v_first := coalesce((v_story ->> 'kind')::story_kind, 'both');
    end if;
    v_index := v_index + 1;
  end loop;

  update rooms
     set current_side = (case when v_first = 'backend' then 'backend' else 'frontend' end)::voting_side
   where id = v_room_id;

  insert into players (room_id, user_id, name, role)
  values (v_room_id, auth.uid(), trim(p_host_name), 'po');

  return v_room_id;
end;
$$;
