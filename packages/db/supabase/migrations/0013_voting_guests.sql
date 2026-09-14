-- ============================================================================
-- Convidados da cerimônia
--
-- Até aqui só a QA podia estar na sala sem pontuar, e um booleano na sala
-- (`qa_votes`) dizia se ela tinha baralho. Com Designer e Produto entrando na
-- mesma condição, um booleano por papel viraria três colunas, três RPCs e três
-- ramos em cada função — e quatro na próxima vez.
--
-- Então a pergunta muda de "a QA vota?" para "quais convidados votam?", e a
-- resposta é uma lista.
--
--   papel       vota                  pontua
--   PO          não                   não
--   Tech Lead   sim                   sim
--   Front/Back  sim                   sim
--   QA          conforme a sala       não
--   Designer    conforme a sala       não
--   Produto     conforme a sala       não
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Quem é convidado: participa da cerimônia, não é dono de entrega.
-- ----------------------------------------------------------------------------
create or replace function role_is_guest(p_role player_role)
returns boolean
language sql
immutable
as $$
  select p_role in ('qa', 'designer', 'product');
$$;

alter table rooms
  add column if not exists voting_guests player_role[] not null default '{}';

-- O que já estava configurado vira lista de um item.
update rooms
   set voting_guests = case when qa_votes then array['qa']::player_role[] else '{}'::player_role[] end
 where voting_guests = '{}';

alter table rooms drop column if exists qa_votes;

-- A lista só aceita convidado: 'frontend' aqui dentro não significaria nada,
-- porque quem é dono de entrega vota sempre.
alter table rooms drop constraint if exists rooms_voting_guests_are_guests;
alter table rooms
  add constraint rooms_voting_guests_are_guests
  check (voting_guests <@ array['qa', 'designer', 'product']::player_role[]);

-- ----------------------------------------------------------------------------
-- Quem vota. Depende da sala, porque os convidados são configuráveis.
-- ----------------------------------------------------------------------------
create or replace function player_can_vote(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role = 'po' then false
    when role_is_guest(p.role) then p.role = any(r.voting_guests)
    else true
  end
  from players p
  join rooms r on r.id = p.room_id
  where p.id = p_player_id;
$$;

-- ----------------------------------------------------------------------------
-- set_guest_voting — o interruptor, agora por papel
-- ----------------------------------------------------------------------------
create or replace function set_guest_voting(
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

  if not role_is_guest(p_role) then
    raise exception 'Só convidado tem voto configurável'
      using errcode = '22023';
  end if;

  if p_enabled then
    update rooms
       set voting_guests = (
         select array(select distinct unnest(voting_guests || p_role))
       )
     where id = p_room_id;
  else
    update rooms
       set voting_guests = array_remove(voting_guests, p_role)
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

drop function if exists set_qa_voting(text, boolean);

-- Convidado não carrega story point, então capacidade ali não significa nada.
update players set capacity_points = 0 where not role_scores(role);

grant execute on function set_guest_voting(text, player_role, boolean) to authenticated;
grant execute on function role_is_guest(player_role) to authenticated;
