-- ============================================================================
-- Timebox da discussão
--
-- Planning que trava numa história só é o jeito mais comum de a cerimônia
-- passar de uma hora. O PO / Tech Lead define quanto tempo uma história pode
-- ficar em discussão; passando disso, a mesa inteira vê o aviso — não é o
-- facilitador que precisa reparar no relógio e interromper, o que é
-- socialmente caro e por isso quase nunca acontece.
--
-- O limite é da sala, e não da história: o combinado de ritmo vale para a
-- cerimônia toda.
--
-- Zero desliga o aviso. O padrão é 5 minutos, que é o timebox que a maior
-- parte dos times usa por item antes de partir para "anota a dúvida e segue".
-- ============================================================================

alter table rooms
  add column if not exists discussion_limit_seconds integer not null default 300;

-- O teto de uma hora existe para o campo não virar "desligado com outro nome":
-- quem quer desligar usa zero, que é explícito e aparece na interface.
alter table rooms
  drop constraint if exists rooms_discussion_limit_range;

alter table rooms
  add constraint rooms_discussion_limit_range
  check (discussion_limit_seconds = 0
         or discussion_limit_seconds between 30 and 3600);

-- ----------------------------------------------------------------------------
-- set_discussion_limit — o combinado de ritmo, na mão de quem conduz
-- ----------------------------------------------------------------------------
create or replace function set_discussion_limit(p_room_id text, p_seconds integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead definem o tempo de discussão'
      using errcode = '42501';
  end if;

  if p_seconds is null or p_seconds < 0 then
    raise exception 'Tempo de discussão inválido'
      using errcode = '22023';
  end if;

  -- Fora da faixa o valor é aparado em vez de recusado: a interface só oferece
  -- valores válidos, então chegar aqui fora da faixa é chamada direta à API, e
  -- aparar é mais útil do que estourar.
  update rooms
     set discussion_limit_seconds =
           case when p_seconds = 0 then 0
                else least(3600, greatest(30, p_seconds)) end
   where id = p_room_id;
end;
$$;

grant execute on function set_discussion_limit(text, integer) to authenticated;
