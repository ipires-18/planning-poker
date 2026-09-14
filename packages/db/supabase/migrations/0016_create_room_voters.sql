-- ============================================================================
-- Quem vota, decidido na criação
--
-- Voto de quem não pontua é combinado de time, e combinado se faz antes de
-- começar — não no meio da primeira história, com a mesa esperando. A tela de
-- montar a sprint passa a perguntar, e a sala já nasce configurada.
--
-- Continua editável na sessão pelo `set_optional_voter`: time muda de ideia, e
-- a pessoa que conhecia o escopo pode chegar depois.
--
-- A assinatura antiga é derrubada em vez de conviver com a nova: duas com o
-- mesmo nome deixam o PostgREST ambíguo, e o cliente sempre chama por nome de
-- parâmetro.
-- ============================================================================

drop function if exists create_room(text, text, jsonb, text, jsonb, date, int, jsonb);

create or replace function create_room(
  p_session_name    text,
  p_host_name       text,
  p_stories         jsonb,
  p_deck_id         text default 'fibonacci',
  p_point_scale     jsonb default null,
  p_sprint_start    date default null,
  p_sprint_days     int default null,
  p_holidays        jsonb default null,
  p_optional_voters player_role[] default '{}',
  p_discussion_limit int default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c_max_open constant int := 5;

  v_open    int;
  v_room_id text;
  v_story   jsonb;
  v_index   int := 0;
  v_first   story_kind;
  v_role    player_role;
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

  -- Papel de quem já vota sempre não significa nada nessa lista, e aceitar em
  -- silêncio esconderia um erro de quem chama.
  foreach v_role in array coalesce(p_optional_voters, '{}') loop
    if not role_is_optional_voter(v_role) then
      raise exception 'Quem é dono de entrega vota sempre — não há o que configurar'
        using errcode = '22023';
    end if;
  end loop;

  v_room_id := generate_room_code();

  insert into rooms (id, session_name, owner_user_id, deck_id, optional_voters)
  values (
    v_room_id,
    trim(p_session_name),
    auth.uid(),
    p_deck_id,
    coalesce(p_optional_voters, '{}')
  );

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

  if p_discussion_limit is not null then
    update rooms
       set discussion_limit_seconds =
             case when p_discussion_limit = 0 then 0
                  else least(3600, greatest(30, p_discussion_limit)) end
     where id = v_room_id;
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

grant execute on function create_room(text, text, jsonb, text, jsonb, date, int, jsonb, player_role[], int)
  to authenticated;
