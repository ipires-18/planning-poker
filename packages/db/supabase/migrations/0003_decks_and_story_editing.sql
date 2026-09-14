-- ============================================================================
-- Baralhos de pontuação + gestão das histórias pelo PO
--
-- Duas mudanças de fundo:
--
-- 1. A escala deixa de ser uma lista de valores e passa a ser uma lista de
--    cartas { label, value }. É o que permite um baralho de camisetas — "M" na
--    carta, 3 na conta — sem quebrar a divisão de pontos entre as pessoas.
--
-- 2. Histórias passam a ser editáveis, reordenáveis e removíveis, inclusive com
--    a sessão em andamento. Isso exige mexer em `position`, que é chave única,
--    então a restrição vira adiável (deferrable) para renumerar dentro de uma
--    transação sem colidir no meio do caminho.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- rooms: qual baralho está em uso
-- ----------------------------------------------------------------------------
alter table rooms
  add column if not exists deck_id text not null default 'fibonacci'
    check (deck_id in ('fibonacci', 'fibonacci_mod', 'linear', 'powers', 'tshirt', 'custom'));

alter table rooms
  alter column point_scale set default
    '[{"label":"0","value":0},{"label":"½","value":0.5},{"label":"1","value":1},
      {"label":"2","value":2},{"label":"3","value":3},{"label":"5","value":5},
      {"label":"8","value":8},{"label":"13","value":13},{"label":"21","value":21},
      {"label":"34","value":34},{"label":"55","value":55},{"label":"89","value":89},
      {"label":"?","value":null},{"label":"☕","value":null},
      {"label":"Ag. Definição","value":null}]'::jsonb;

-- Salas criadas antes desta migração guardam a escala no formato antigo (uma
-- lista solta de valores). Converte para o formato de cartas.
update rooms
   set point_scale = (
     select jsonb_agg(
       case
         when jsonb_typeof(item) = 'number'
           then jsonb_build_object('label', (item::numeric)::text, 'value', item)
         else jsonb_build_object('label', item #>> '{}', 'value', null)
       end
       order by ordinality
     )
     from jsonb_array_elements(point_scale) with ordinality as t(item, ordinality)
   )
 where jsonb_typeof(point_scale -> 0) <> 'object';

-- ----------------------------------------------------------------------------
-- stories: posição adiável, para permitir renumerar
-- ----------------------------------------------------------------------------
alter table stories drop constraint if exists stories_room_id_position_key;
alter table stories
  add constraint stories_room_id_position_key
  unique (room_id, position) deferrable initially deferred;

-- ============================================================================
-- create_room — agora recebe o baralho escolhido
-- ============================================================================
drop function if exists create_room(text, text, jsonb);

create or replace function create_room(
  p_session_name text,
  p_host_name    text,
  p_stories      jsonb,
  p_deck_id      text default 'fibonacci',
  p_point_scale  jsonb default null
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

  -- Sem escala explícita, a coluna usa seu próprio default (Fibonacci).
  insert into rooms (id, session_name, owner_user_id, deck_id)
  values (v_room_id, trim(p_session_name), auth.uid(), p_deck_id);

  if p_point_scale is not null then
    update rooms set point_scale = p_point_scale where id = v_room_id;
  end if;

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

  update rooms
     set current_side = (case when v_first = 'backend' then 'backend' else 'frontend' end)::voting_side
   where id = v_room_id;

  insert into players (room_id, user_id, name, role)
  values (v_room_id, auth.uid(), trim(p_host_name), 'po');

  return v_room_id;
end;
$$;

-- ============================================================================
-- update_story — editar título, link e tipo
-- ============================================================================
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
         link  = nullif(trim(coalesce(p_link, '')), ''),
         kind  = p_kind
   where id = p_story_id;

  -- Se é a história em votação e o tipo mudou, o lado acompanha.
  update rooms
     set current_side = (case when p_kind = 'backend' then 'backend'
                              when p_kind = 'frontend' then 'frontend'
                              else current_side::text end)::voting_side
   where id = v_story.room_id
     and current_story_index = v_story.position;
end;
$$;

-- ============================================================================
-- delete_story — remove e desfaz o que ela já tinha pontuado
-- ============================================================================
create or replace function delete_story(p_story_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_story    stories%rowtype;
  v_room     rooms%rowtype;
  v_was_current boolean;
  v_next_kind story_kind;
begin
  select * into v_story from stories where id = p_story_id;
  if not found then
    raise exception 'História não encontrada' using errcode = 'P0002';
  end if;
  if not is_room_host(v_story.room_id) then
    raise exception 'Apenas PO ou Tech Lead podem excluir histórias' using errcode = '42501';
  end if;

  select * into v_room from rooms where id = v_story.room_id for update;

  if (select count(*) from stories where room_id = v_story.room_id) <= 1 then
    raise exception 'A sprint precisa de pelo menos uma história' using errcode = '23514';
  end if;

  v_was_current := v_room.current_story_index = v_story.position;

  -- Se a história já tinha sido pontuada, os pontos voltam de quem os recebeu.
  -- Sem isto o placar do time continuaria contando uma história que não existe.
  update players p
     set accumulated_points = p.accumulated_points - sp.total
    from (
      select player_id, sum(points) as total
        from story_participants
       where story_id = p_story_id
       group by player_id
    ) sp
   where p.id = sp.player_id;

  delete from stories where id = p_story_id;

  -- Fecha o buraco deixado na numeração.
  update stories
     set position = position - 1
   where room_id = v_story.room_id
     and position > v_story.position;

  if v_story.position < v_room.current_story_index then
    -- Saiu uma história já encerrada: o ponteiro anda um para trás junto.
    update rooms
       set current_story_index = current_story_index - 1
     where id = v_room.id;
  elsif v_was_current then
    -- A história em votação sumiu: a seguinte assume o lugar e a rodada
    -- recomeça, senão os votos da anterior ficariam pendurados.
    select kind into v_next_kind
      from stories
     where room_id = v_story.room_id and position = v_room.current_story_index;

    update rooms
       set current_side = (case when v_next_kind = 'backend' then 'backend'
                                else 'frontend' end)::voting_side,
           revealed = false,
           current_round = current_round + 1
     where id = v_room.id;

    update players set has_voted = false where room_id = v_story.room_id;
  end if;
end;
$$;

-- ============================================================================
-- reorder_stories — nova ordem para as histórias que ainda não foram pontuadas
--
-- As já encerradas ficam onde estão: mexer nelas reescreveria o histórico da
-- sessão. p_story_ids traz a ordem desejada da fila pendente, da atual em diante.
-- ============================================================================
create or replace function reorder_stories(
  p_room_id   text,
  p_story_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room      rooms%rowtype;
  v_pending   uuid[];
  v_id        uuid;
  v_index     int;
  v_old_head  uuid;
  v_new_head  uuid;
  v_next_kind story_kind;
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead podem reordenar' using errcode = '42501';
  end if;

  select * into v_room from rooms where id = p_room_id for update;
  if not found then
    raise exception 'Sala não encontrada' using errcode = 'P0002';
  end if;

  select array_agg(id order by position) into v_pending
    from stories
   where room_id = p_room_id and position >= v_room.current_story_index;

  -- A lista recebida precisa ser exatamente a fila pendente, sem sobra nem
  -- falta — é o que impede reordenar histórias já encerradas por engano.
  if v_pending is null
     or array_length(v_pending, 1) <> array_length(p_story_ids, 1)
     or exists (select unnest(v_pending) except select unnest(p_story_ids))
     or exists (select unnest(p_story_ids) except select unnest(v_pending)) then
    raise exception 'A ordem enviada não corresponde à fila pendente'
      using errcode = '23514';
  end if;

  v_old_head := v_pending[1];
  v_new_head := p_story_ids[1];

  v_index := v_room.current_story_index;
  foreach v_id in array p_story_ids loop
    update stories set position = v_index where id = v_id;
    v_index := v_index + 1;
  end loop;

  -- Trocou a história em votação: rodada nova, cartas de costas.
  if v_old_head is distinct from v_new_head then
    select kind into v_next_kind from stories where id = v_new_head;

    update rooms
       set current_side = (case when v_next_kind = 'backend' then 'backend'
                                else 'frontend' end)::voting_side,
           revealed = false,
           current_round = current_round + 1
     where id = p_room_id;

    update players set has_voted = false where room_id = p_room_id;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
grant execute on function create_room(text, text, jsonb, text, jsonb) to authenticated;
grant execute on function update_story(uuid, text, text, story_kind)   to authenticated;
grant execute on function delete_story(uuid)                           to authenticated;
grant execute on function reorder_stories(text, uuid[])                to authenticated;

-- ============================================================================
-- cast_vote — agora recusa carta que não existe no baralho da sala
--
-- A interface só mostra as cartas certas, mas a API aceitava qualquer texto:
-- um voto "13" numa sala de camisetas entrava e depois não valia nada na conta.
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
