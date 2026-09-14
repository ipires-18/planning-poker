-- ============================================================================
-- Capacidade do time
--
-- A sessão passa a saber quanto o time cabe: uma janela de sprint (início,
-- duração e feriados) e, para cada pessoa, quantos pontos ela assume e quantos
-- dias vai faltar. O cabeçalho compara isso com o que já foi comprometido.
--
-- Os dias úteis não são guardados: são derivados da janela no cliente. Guardar
-- um número calculado é convite para ele ficar desatualizado quando alguém
-- mexer nos feriados.
-- ============================================================================

alter table rooms
  add column if not exists sprint_start date not null default current_date,
  add column if not exists sprint_days int not null default 14
    check (sprint_days between 1 and 90),
  -- [{ "date": "2026-04-21", "name": "Tiradentes", "optional": false }]
  add column if not exists holidays jsonb not null default '[]'::jsonb;

alter table players
  add column if not exists capacity_points numeric(8, 1) not null default 0
    check (capacity_points >= 0),
  -- Férias, folga, alocação em outro time: dias em que a pessoa não estará.
  add column if not exists days_off int not null default 0
    check (days_off >= 0 and days_off <= 90);

-- ============================================================================
-- set_sprint_window — início, duração e feriados considerados
-- ============================================================================
create or replace function set_sprint_window(
  p_room_id  text,
  p_start    date,
  p_days     int,
  p_holidays jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead podem definir a janela da sprint'
      using errcode = '42501';
  end if;

  if p_days < 1 or p_days > 90 then
    raise exception 'A sprint precisa ter entre 1 e 90 dias' using errcode = '23514';
  end if;

  if jsonb_typeof(p_holidays) <> 'array' then
    raise exception 'Lista de feriados inválida' using errcode = '23514';
  end if;

  update rooms
     set sprint_start = p_start,
         sprint_days  = p_days,
         holidays     = p_holidays
   where id = p_room_id;
end;
$$;

-- ============================================================================
-- set_team_capacity — capacidade de várias pessoas de uma vez
--
-- p_entries: [{ "player_id": uuid, "capacity_points": 8, "days_off": 2 }]
--
-- Em lote porque o painel edita a tabela inteira: mandar uma chamada por pessoa
-- deixaria o time vendo os números mudarem um a um, em ordem imprevisível.
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
       -- O filtro por sala é o que impede mexer em quem está em outra mesa.
       and room_id = p_room_id;
  end loop;
end;
$$;

-- ============================================================================
-- create_room — aceita a janela da sprint já na criação
-- ============================================================================
drop function if exists create_room(text, text, jsonb, text, jsonb);

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

  -- Sem escala ou janela explícitas, as colunas usam seus próprios defaults.
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

-- ----------------------------------------------------------------------------
grant execute on function create_room(text, text, jsonb, text, jsonb, date, int, jsonb)
  to authenticated;
grant execute on function set_sprint_window(text, date, int, jsonb) to authenticated;
grant execute on function set_team_capacity(text, jsonb)            to authenticated;
