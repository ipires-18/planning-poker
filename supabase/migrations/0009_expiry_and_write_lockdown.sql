-- ============================================================================
-- Salas de 24 horas + fim da escrita direta nas tabelas
--
-- Duas mudanças que se encontram no mesmo lugar.
--
-- 1. A sala passa a viver 24 horas em vez de 30 dias. Uma cerimônia dura duas;
--    guardar o resto do mês é armazenar dado de gente por nada. O resumo final
--    já sai da sala pelo botão de copiar.
--
-- 2. As policies de escrita saem. Todas.
--
--    `players_update` permitia à pessoa atualizar a própria linha — e `role`
--    está nessa linha. Qualquer participante podia rodar
--
--      update players set role = 'tech_lead' where id = <o meu>
--
--    virar host, chamar reveal_round e ler o voto de todo mundo antes da hora.
--    Isso derrubava justamente a garantia que o projeto inteiro existe para
--    sustentar. Na mesma brecha dava para se auto-atribuir pontos, e o host
--    podia esticar expires_at para sempre por `update rooms`.
--
--    A correção não é remendar coluna por coluna: é fechar a porta. Nenhuma
--    escrita do cliente passa por aqui — tudo vai por função `security definer`,
--    que é onde as regras moram. Sem policy de escrita, a tabela só aceita o
--    que vier por elas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Escrita direta: fechada
-- ----------------------------------------------------------------------------
drop policy if exists rooms_insert   on rooms;
drop policy if exists rooms_update   on rooms;
drop policy if exists rooms_delete   on rooms;

drop policy if exists players_insert on players;
drop policy if exists players_update on players;
drop policy if exists players_delete on players;

drop policy if exists stories_write  on stories;
drop policy if exists stories_update on stories;
drop policy if exists stories_delete on stories;

drop policy if exists votes_delete   on votes;

drop policy if exists participants_write on story_participants;

-- As de leitura ficam: é por elas que o app monta a mesa, e é nelas que mora o
-- segredo do voto.
--   rooms_select · players_select · stories_select · votes_select
--   participants_select

-- ----------------------------------------------------------------------------
-- 2. Vinte e quatro horas
-- ----------------------------------------------------------------------------
alter table rooms
  alter column expires_at set default now() + interval '24 hours';

-- Salas que já existem encolhem para a nova regra.
update rooms
   set expires_at = least(expires_at, created_at + interval '24 hours');

-- Expirada deixa de ser legível na hora, e não quando o cron passar. Sem isto,
-- "expira em 24 horas" dependeria de quando a faxina roda.
drop policy if exists rooms_select on rooms;
create policy rooms_select on rooms
  for select to authenticated
  using (expires_at > now() and (not ended or is_room_member(id)));

-- ----------------------------------------------------------------------------
-- join_room: a função ignora RLS, então checa a validade por conta própria
-- ----------------------------------------------------------------------------
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
  if v_room.ended then
    raise exception 'Esta sessão já foi encerrada' using errcode = '23514';
  end if;

  -- Reconectar de outro dispositivo, ou depois de limpar o cache, cai aqui e
  -- atualiza a cadeira existente em vez de criar uma duplicada.
  insert into players (room_id, user_id, name, role)
  values (p_room_id, auth.uid(), trim(p_name), p_role)
  on conflict (room_id, user_id)
    do update set name = excluded.name, role = excluded.role
  returning id into v_player_id;

  return v_player_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. A cota fica mais simples
--
-- A janela de sete dias existia porque a sala vivia trinta dias e uma sessão
-- abandonada travaria a vaga por um mês. Com validade de 24 horas, `expires_at`
-- já faz esse trabalho: a vaga se solta sozinha no dia seguinte.
-- ----------------------------------------------------------------------------
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
     and expires_at > now();
$$;
