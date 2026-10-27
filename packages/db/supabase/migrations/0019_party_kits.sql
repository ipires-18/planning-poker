-- ============================================================================
-- Festa do time — fotos da galera na comemoração de consenso
--
-- Um "kit de festa" é uma pasta de fotos num bucket privado. Quem conduz a
-- sala liga o kit, e daí em diante o consenso daquela sala comemora com as
-- fotos do time em vez da explosão neutra.
--
-- O ponto delicado é quem vê as fotos. São rostos de gente real, e o app é
-- aberto: qualquer pessoa cria uma sala com login anônimo. Então:
--
-- 1. O bucket é privado. Uma foto só é legível por quem está sentado numa sala
--    com aquele kit ligado — a regra mora na policy de `storage.objects`, não
--    no cliente.
--
-- 2. Ligar um kit pede o código dele. Sem isso, a regra acima não protegeria
--    nada: bastaria criar uma sala qualquer e ligar o kit. O código fica só
--    como hash, e nenhuma role do cliente lê a tabela.
--
-- Os kits em si (nome, código, fotos) não estão aqui: são dados do time, não
-- schema, e o repositório é público. Eles entram direto no projeto.
-- ============================================================================

create table if not exists party_kits (
  -- É também o nome da pasta no bucket: `party/<id>/photos/...`.
  id            text primary key check (id ~ '^[a-z0-9-]{2,32}$'),
  name          text not null check (char_length(trim(name)) between 1 and 40),
  code_hash     text not null,
  created_at    timestamptz not null default now()
);

alter table party_kits enable row level security;
-- Sem policy e sem grant: só as funções abaixo tocam esta tabela.
revoke all on table party_kits from anon, authenticated;

alter table rooms
  add column if not exists party_kit text references party_kits (id) on delete set null;

-- ----------------------------------------------------------------------------
-- O bucket
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('party', 'party', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Quem pode ver as fotos de um kit: quem está numa sala viva com ele ligado.
create or replace function can_see_party_kit(p_kit text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from rooms r
      join players p on p.room_id = r.id
     where r.party_kit = p_kit
       and r.expires_at > now()
       and p.user_id = auth.uid()
  );
$$;

drop policy if exists party_read on storage.objects;

-- Só leitura. Upload e remoção ficam com quem administra o projeto.
create policy party_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'party'
    and can_see_party_kit((storage.foldername(name))[1])
  );

-- ----------------------------------------------------------------------------
-- set_party_kit — liga um kit pelo código, ou desliga
-- ----------------------------------------------------------------------------
-- Código nulo ou vazio desliga. Devolve o nome do kit ligado, para a interface
-- confirmar o que aconteceu sem ter que ler a tabela.
create or replace function set_party_kit(p_room_id text, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kit party_kits;
begin
  if not is_room_host(p_room_id) then
    raise exception 'Apenas PO ou Tech Lead ligam a festa do time'
      using errcode = '42501';
  end if;

  if p_code is null or trim(p_code) = '' then
    update rooms set party_kit = null where id = p_room_id;
    return null;
  end if;

  -- São poucos kits; comparar com cada hash é mais simples do que indexar
  -- código, e o custo do crypt é o que torna adivinhar caro.
  select k.* into v_kit
    from party_kits k
   where k.code_hash = extensions.crypt(trim(p_code), k.code_hash)
   limit 1;

  if v_kit.id is null then
    raise exception 'Código da festa não confere'
      using errcode = '28000';
  end if;

  update rooms set party_kit = v_kit.id where id = p_room_id;
  return v_kit.name;
end;
$$;

revoke all on function set_party_kit(text, text) from public, anon;
grant execute on function set_party_kit(text, text) to authenticated;

revoke all on function can_see_party_kit(text) from public, anon;
grant execute on function can_see_party_kit(text) to authenticated;
