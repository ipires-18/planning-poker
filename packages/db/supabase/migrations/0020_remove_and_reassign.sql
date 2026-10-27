-- ============================================================================
-- Tirar alguém da sala, e passar uma história de uma pessoa para outra
--
-- As duas coisas que o PO / Tech Lead pedia no meio da cerimônia e só dava
-- para fazer no banco:
--
-- 1. Alguém entra duas vezes (outro aparelho, aba anônima) ou sai e deixa a
--    cadeira ocupada. A cadeira fantasma conta no "3 de 5 votaram" e a rodada
--    nunca fecha sozinha.
--
-- 2. A história foi dividida para um dev, e o time remaneja: quem pega é
--    outra pessoa. Até aqui a única saída era zerar um e dar ao outro com
--    `adjust_participant_points`, que mexe no total da história no meio do
--    caminho.
--
-- As duas ficam com quem conduz (`is_room_host`), como o resto do que mexe
-- no placar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- reassign_story — os pontos de uma pessoa numa história passam para outra
-- ----------------------------------------------------------------------------
-- O total da história não muda: é a mesma estimativa com outro dono. Se quem
-- recebe já tinha parte nessa história, as partes se somam.
create or replace function reassign_story(
  p_story_id uuid,
  p_side     voting_side,
  p_from     uuid,
  p_to       uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room text;
  v_from story_participants%rowtype;
  v_to   players%rowtype;
begin
  select room_id into v_room from stories where id = p_story_id;
  if v_room is null then
    raise exception 'História não encontrada' using errcode = 'P0002';
  end if;

  if not is_room_host(v_room) then
    raise exception 'Apenas PO ou Tech Lead trocam quem pega a história'
      using errcode = '42501';
  end if;

  if p_from = p_to then
    return;
  end if;

  select * into v_to from players where id = p_to and room_id = v_room;
  if v_to.id is null or not role_scores(v_to.role) then
    raise exception 'Essa pessoa não recebe pontuação nesta sala'
      using errcode = '22023';
  end if;

  -- `for update` porque duas trocas simultâneas da mesma linha somariam os
  -- pontos duas vezes em quem recebe.
  select * into v_from
    from story_participants
   where story_id = p_story_id and player_id = p_from and side = p_side
   for update;

  if v_from.id is null or (v_from.points = 0 and not v_from.pending) then
    raise exception 'Essa pessoa não tem parte nesta história'
      using errcode = 'P0002';
  end if;

  insert into story_participants (room_id, story_id, player_id, side, points, pending)
  values (v_room, p_story_id, p_to, p_side, v_from.points, v_from.pending)
  on conflict (story_id, player_id, side)
    do update set points  = story_participants.points + excluded.points,
                  pending = story_participants.pending or excluded.pending;

  -- Quem passou adiante fica com a linha zerada, igual a quem ficou com zero
  -- no fechamento — e não sem linha, que é como o resto do schema lê "não
  -- estava na divisão".
  update story_participants
     set points = 0, pending = false
   where id = v_from.id;

  update players set accumulated_points = accumulated_points - v_from.points
   where id = p_from;
  update players set accumulated_points = accumulated_points + v_from.points
   where id = p_to;
end;
$$;

-- ----------------------------------------------------------------------------
-- remove_player — tira uma pessoa da sala
-- ----------------------------------------------------------------------------
-- Só sai quem não tem pontos: apagar alguém com história no nome faria o placar
-- deixar de fechar com o total das histórias. A interface pede para passar as
-- histórias adiante antes (reassign_story), e aqui a regra é garantida.
--
-- Não impede a pessoa de voltar pelo link. É para cadeira fantasma e entrada
-- duplicada, não para barrar alguém.
create or replace function remove_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player players%rowtype;
  v_owner  uuid;
begin
  select * into v_player from players where id = p_player_id;
  if v_player.id is null then
    raise exception 'Essa pessoa já não está na sala' using errcode = 'P0002';
  end if;

  if not is_room_host(v_player.room_id) then
    raise exception 'Apenas PO ou Tech Lead tiram alguém da sala'
      using errcode = '42501';
  end if;

  if v_player.user_id = auth.uid() then
    raise exception 'Você não pode se tirar da sala' using errcode = '22023';
  end if;

  select owner_user_id into v_owner from rooms where id = v_player.room_id;
  if v_player.user_id = v_owner then
    raise exception 'Quem criou a sala não pode ser tirado dela' using errcode = '22023';
  end if;

  if v_player.accumulated_points <> 0 or exists (
    select 1 from story_participants
     where player_id = p_player_id and (points <> 0 or pending)
  ) then
    raise exception '% ainda tem histórias — passe para outra pessoa antes de tirar da sala',
      v_player.name
      using errcode = '55000';
  end if;

  -- Votos e linhas zeradas de participação vão junto, pelo `on delete cascade`.
  delete from players where id = p_player_id;
end;
$$;

revoke all on function reassign_story(uuid, voting_side, uuid, uuid) from public, anon;
grant execute on function reassign_story(uuid, voting_side, uuid, uuid) to authenticated;

revoke all on function remove_player(uuid) from public, anon;
grant execute on function remove_player(uuid) to authenticated;
