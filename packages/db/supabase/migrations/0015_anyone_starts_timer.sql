-- ============================================================================
-- O cronômetro é de quem está na mesa
--
-- Começar a contar o tempo não é decisão de quem conduz: quem percebe que a
-- discussão engrenou costuma ser quem está discutindo. Exigir o host para isso
-- fazia o cronômetro ficar parado justamente nas histórias longas — alguém
-- precisava lembrar de pedir, e ninguém pede.
--
-- Continua sendo escrita controlada: só membro da sala, só uma vez por história
-- (o `started_at is null` já garantia isso), e sempre com a hora do servidor,
-- para o relógio ser o mesmo para todo mundo.
-- ============================================================================

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

  if not is_room_member(v_room_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  update stories set started_at = now()
   where id = p_story_id and started_at is null;
end;
$$;
