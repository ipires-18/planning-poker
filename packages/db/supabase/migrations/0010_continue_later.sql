-- ============================================================================
-- Continuar amanhã
--
-- "Encerrar" era uma coisa só, e na prática são duas: a sessão de hoje acabou,
-- e a planning acabou. A planning fica no começo da sprint: quando ela fecha, a
-- sprint é que começa. Com histórias na fila, o time quer a primeira —
-- fechar o notebook e voltar amanhã de onde parou.
--
--   ended  to_continue   significado
--   false  false         rolando
--   true   true          pausada: o histórico fica, alguém retoma depois
--   true   false         encerrada de vez
--
-- A pausa estica a validade para sete dias, senão as 24 horas matariam a sala
-- antes de o time voltar — inclusive num fim de semana, que é justamente
-- quando essa pausa mais acontece. Retomar zera o relógio em 24 horas outra
-- vez, como se fosse uma sessão nova.
-- ============================================================================

alter table rooms
  add column if not exists to_continue boolean not null default false;

-- ----------------------------------------------------------------------------
-- Sala pausada continua visível para quem chega pelo link
--
-- A policy anterior escondia tudo que estava `ended` de quem não fosse membro —
-- e pausada carrega essa flag. O resultado é que `join_room` aceitava a pessoa,
-- mas a tela dizia "sala não encontrada" antes de chegar lá, porque ela lê a
-- sala primeiro. Pausada não é encerrada: fica à vista.
-- ----------------------------------------------------------------------------
drop policy if exists rooms_select on rooms;
create policy rooms_select on rooms
  for select to authenticated
  using (
    expires_at > now()
    and (not ended or to_continue or is_room_member(id))
  );

-- ----------------------------------------------------------------------------
-- Sobrou história na fila?
-- ----------------------------------------------------------------------------
create or replace function has_pending_stories(p_room_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from stories s
      join rooms r on r.id = s.room_id
     where s.room_id = p_room_id
       and s.position >= r.current_story_index
  );
$$;

grant execute on function has_pending_stories(text) to authenticated;

-- ============================================================================
-- end_game — agora com a escolha
-- ============================================================================
drop function if exists end_game(text);

create or replace function end_game(
  p_room_id  text,
  p_continue boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Uma pausa cobre um fim de semana com folga sem virar depósito.
  c_pause_window constant interval := interval '7 days';
begin
  if not is_room_host(p_room_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  -- Pausar sem nada pendente não quer dizer nada: não há o que retomar.
  if p_continue and not has_pending_stories(p_room_id) then
    raise exception 'Não há histórias pendentes para continuar depois'
      using errcode = '23514';
  end if;

  update rooms
     set ended = true,
         to_continue = coalesce(p_continue, false),
         expires_at = case
           when p_continue then now() + c_pause_window
           else expires_at
         end
   where id = p_room_id;
end;
$$;

grant execute on function end_game(text, boolean) to authenticated;

-- ============================================================================
-- resume_game — o "start" do dia seguinte
-- ============================================================================
create or replace function resume_game(p_room_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead retomam a sessão' using errcode = '42501';
  end if;

  select * into v_room from rooms where id = p_room_id for update;
  if not found then
    raise exception 'Sala não encontrada' using errcode = 'P0002';
  end if;
  if v_room.expires_at <= now() then
    raise exception 'Esta sessão expirou' using errcode = 'P0002';
  end if;
  if not v_room.ended then
    raise exception 'Esta sessão já está rolando' using errcode = '23514';
  end if;
  if not v_room.to_continue then
    raise exception 'Esta sessão foi encerrada de vez' using errcode = '23514';
  end if;

  update rooms
     set ended = false,
         to_continue = false,
         -- Relógio zerado: a sessão de amanhã tem o mesmo dia que a de hoje teve.
         expires_at = now() + interval '24 hours',
         -- Sessão nova começa com as cartas na mesa, não com os votos de ontem.
         revealed = false,
         current_round = current_round + 1
   where id = p_room_id;

  update players set has_voted = false where room_id = p_room_id;

  -- O cronômetro da história corrente também recomeça: o tempo parado entre uma
  -- sessão e outra não é tempo de discussão, e entraria na média como se fosse.
  update stories
     set started_at = null
   where room_id = p_room_id
     and position = v_room.current_story_index
     and ended_at is null;
end;
$$;

grant execute on function resume_game(text) to authenticated;

-- ============================================================================
-- join_room — dá para entrar numa sala pausada; ela vai voltar
-- ============================================================================
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
  v_room      rooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada' using errcode = '42501';
  end if;

  select * into v_room from rooms where id = p_room_id;
  if not found then
    raise exception 'Sala não encontrada' using errcode = 'P0002';
  end if;
  if v_room.expires_at <= now() then
    raise exception 'Esta sessão expirou' using errcode = 'P0002';
  end if;
  if v_room.ended and not v_room.to_continue then
    raise exception 'Esta sessão já foi encerrada' using errcode = '23514';
  end if;

  insert into players (room_id, user_id, name, role)
  values (p_room_id, auth.uid(), trim(p_name), p_role)
  on conflict (room_id, user_id)
    do update set name = excluded.name, role = excluded.role
  returning id into v_player_id;

  return v_player_id;
end;
$$;

-- ============================================================================
-- A cota conta o que está pausado
--
-- Sprint pausada continua sendo trabalho seu em aberto, com histórico ocupando
-- espaço. Encerrar de vez é o que devolve a vaga.
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
     and (not ended or to_continue)
     and expires_at > now();
$$;
