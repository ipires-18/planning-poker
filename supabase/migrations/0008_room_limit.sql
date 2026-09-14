-- ============================================================================
-- Teto de sessões abertas por pessoa
--
-- Sem teto, um laço de script enche o banco de salas. O limite não é uma
-- muralha — com login anônimo dá para pedir um usuário novo a cada sala, e o
-- que segura isso é o rate limit de sign-in por IP do Supabase. O que ele faz é
-- transformar "abuso é um for" em "abuso precisa de muitos cadastros", e barrar
-- o laço acidental, que é o caso mais provável de todos.
--
-- Conta só o que está de pé: encerrar libera vaga na hora. E há uma janela de
-- sete dias porque nem todo mundo clica em "Encerrar" — muita gente só fecha a
-- aba. Sem ela, cinco sessões abandonadas travariam a pessoa por trinta dias,
-- que é a cara de um bug, não de uma proteção.
-- ============================================================================

create or replace function active_room_count(p_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from rooms
   where owner_user_id = p_user
     and not ended
     and expires_at > now()
     and created_at > now() - interval '7 days';
$$;

grant execute on function active_room_count(uuid) to authenticated;

/** Quantas sessões abertas quem está chamando tem. Para a tela avisar antes. */
create or replace function my_active_rooms()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select active_room_count(auth.uid());
$$;

grant execute on function my_active_rooms() to authenticated;

-- ============================================================================
-- create_room — recusa quando o teto foi atingido
-- ============================================================================
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
  -- Cinco sessões simultâneas cobre com folga qualquer uso real: um time roda
  -- uma por sprint.
  c_max_open constant int := 5;

  v_open    int;
  v_room_id text;
  v_story   jsonb;
  v_index   int := 0;
  v_first   story_kind;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada' using errcode = '42501';
  end if;

  v_open := active_room_count(auth.uid());
  if v_open >= c_max_open then
    raise exception
      'Você já tem % sessões abertas, que é o limite. Encerre uma delas para criar outra.',
      v_open
      using errcode = '53400';
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

-- Encerrar precisa ser barato de achar: é o que devolve a vaga.
create index if not exists rooms_owner_open_idx
  on rooms (owner_user_id, created_at)
  where not ended;
