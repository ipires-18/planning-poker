-- ============================================================================
-- O PO também pode votar — se a sala quiser
--
-- Até aqui o PO era o único caso com regra própria: nunca votava, ponto final.
-- Mas o que acontece na prática é que em time pequeno ele conhece o escopo e
-- opinar ajuda; em time grande a opinião dele ancora a mesa e atrapalha. Isso é
-- decisão de time, não de produto.
--
-- Com essa mudança some a exceção, e o modelo fica com um eixo só:
--
--   quem é dono de entrega (Tech Lead, Front, Back)  vota sempre     pontua
--   quem não é (PO, QA, Designer, Produto)           vota se a sala  nunca
--                                                     configurar      pontua
--
-- Por isso `role_is_guest` vira `role_is_optional_voter` e passa a ser
-- literalmente a negação de `role_scores`: quem não carrega story point é
-- exatamente quem tem voto configurável. Uma regra em vez de duas listas que
-- precisam ser mantidas em sincronia.
--
-- Todos começam em `false`. Voto de quem não pontua é exceção combinada, e
-- exceção não pode ser o padrão.
-- ============================================================================

alter table rooms rename column voting_guests to optional_voters;

create or replace function role_is_optional_voter(p_role player_role)
returns boolean
language sql
immutable
as $$
  select not role_scores(p_role);
$$;

drop function if exists role_is_guest(player_role);

alter table rooms drop constraint if exists rooms_voting_guests_are_guests;
alter table rooms drop constraint if exists rooms_optional_voters_never_score;
alter table rooms
  add constraint rooms_optional_voters_never_score
  check (optional_voters <@ array['po', 'qa', 'designer', 'product']::player_role[]);

-- ----------------------------------------------------------------------------
-- Quem vota. Sem exceção para o PO: ele entrou na mesma regra dos demais.
-- ----------------------------------------------------------------------------
create or replace function player_can_vote(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when role_is_optional_voter(p.role) then p.role = any(r.optional_voters)
    else true
  end
  from players p
  join rooms r on r.id = p.room_id
  where p.id = p_player_id;
$$;

-- ----------------------------------------------------------------------------
-- set_optional_voter — o interruptor, por papel
-- ----------------------------------------------------------------------------
create or replace function set_optional_voter(
  p_room_id text,
  p_role player_role,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead definem quem vota'
      using errcode = '42501';
  end if;

  if not role_is_optional_voter(p_role) then
    raise exception 'Quem é dono de entrega vota sempre — não há o que configurar'
      using errcode = '22023';
  end if;

  if p_enabled then
    update rooms
       set optional_voters = (
         select array(select distinct unnest(optional_voters || p_role))
       )
     where id = p_room_id;
  else
    update rooms
       set optional_voters = array_remove(optional_voters, p_role)
     where id = p_room_id;

    -- Desligar no meio da rodada deixaria um voto contando para a revelação e
    -- uma carta na mesa de quem não deveria mais ter baralho.
    delete from votes v
     using players p
     where v.player_id = p.id
       and p.room_id = p_room_id
       and p.role = p_role
       and v.round = (select current_round from rooms where id = p_room_id);

    update players set has_voted = false
     where room_id = p_room_id and role = p_role;
  end if;
end;
$$;

drop function if exists set_guest_voting(text, player_role, boolean);

grant execute on function set_optional_voter(text, player_role, boolean) to authenticated;
grant execute on function role_is_optional_voter(player_role) to authenticated;
