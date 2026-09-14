-- ============================================================================
-- Privilégio explícito, em vez de herdado do painel
--
-- Até aqui o schema dependia de um ajuste do projeto no Supabase ("expose new
-- tables"), que concede privilégio às roles da Data API automaticamente. Isso
-- é frágil de dois jeitos: some se alguém desligar a opção, e não viaja com o
-- código — um projeto novo criado com a opção desmarcada sobe com o app
-- quebrado em tudo, com erro de permissão que não se explica lendo as
-- migrações.
--
-- Aqui o privilégio passa a estar escrito onde o resto das regras está.
--
-- Só SELECT, e só para `authenticated`: quem entra recebe um JWT anônimo com
-- essa role, e toda escrita passa por função `security definer` — não existe
-- nenhuma policy de INSERT, UPDATE ou DELETE em tabela nenhuma. Dar INSERT
-- aqui não abriria porta (sem policy, a escrita afeta zero linhas), mas
-- anunciaria uma permissão que o desenho não tem.
--
-- Privilégio não é controle de acesso neste schema: ele só permite a consulta
-- chegar até a policy. Quem decide o que volta é o RLS — o voto alheio
-- continua invisível antes da revelação, com ou sem este grant.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select on table rooms              to authenticated;
grant select on table players            to authenticated;
grant select on table stories            to authenticated;
grant select on table votes              to authenticated;
grant select on table story_participants to authenticated;

-- Nada para `anon`: antes de entrar numa sala a pessoa já trocou o papel por
-- `authenticated` no login anônimo, então `anon` nunca lê tabela do produto.
